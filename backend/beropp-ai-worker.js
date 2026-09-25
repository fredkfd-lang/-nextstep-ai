const allowedOrigins = new Set([
  "https://beropp.de",
  "https://www.beropp.de",
  "https://fredkfd-lang.github.io"
]);

function corsHeadersFor(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://beropp.de";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    profile: { type: "string" },
    suggestions: { type: "array", items: { type: "string" } },
    application: { type: "string" },
    answer: { type: "string" },
    action: { type: "string", enum: ["cv", "matches", "ausbildung", "applications", "ai"] }
  },
  required: ["title", "profile", "suggestions", "application", "answer", "action"]
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response("", { headers: corsHeadersFor(request) });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/ausbildung" || url.pathname === "/jobdetails")) {
      const target = url.pathname === "/ausbildung"
        ? "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs?" + url.searchParams.toString()
        : "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails/" + encodeURIComponent(url.searchParams.get("refnr") || "");
      if (url.pathname === "/jobdetails" && !url.searchParams.get("refnr")) {
        return json({ error: "refnr is required" }, 400, request);
      }
      const upstream = await fetch(target, {
        headers: { "X-API-Key": "jobboerse-jobsuche", "Accept": "application/json" }
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...corsHeadersFor(request),
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "beropp-ai", liveAusbildungProxy: true }), {
        status: 200,
        headers: { ...corsHeadersFor(request), "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, request);
    }
    if (!env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not configured on the server." }, 500, request);
    }

    try {
      const body = await request.json();
      const prompt = String(body.prompt || "").slice(0, 6000);
      const mode = body.mode === "chat" ? "chat" : "cv";
      const profile = body.profile || {};
      const cv = body.cv || {};
      const photo = typeof body.photo === "string" && body.photo.startsWith("data:image/")
        ? body.photo.slice(0, 2_500_000)
        : "";

      const profileText = [
        "Name: " + (profile.name || ""),
        "Location: " + (profile.location || ""),
        "German: " + (profile.german || ""),
        "Goal: " + (profile.goal || ""),
        "Skills: " + (profile.skills || ""),
        "Certificates: " + (profile.certs || ""),
        "Education: " + (profile.education || ""),
        "Experience: " + (profile.experience || ""),
        "Languages: " + (profile.languages || "")
      ].join("\n");

      const cvText = [
        "Title: " + (cv.title || ""),
        "About: " + (cv.about || ""),
        "Education: " + (cv.education || ""),
        "Experience: " + (cv.experience || ""),
        "Skills: " + (cv.skills || ""),
        "Certificates: " + (cv.certs || ""),
        "Languages: " + (cv.languages || "")
      ].join("\n");

      const content = [
        {
          type: "input_text",
          text:
            "MODE: " + mode + "\n\nUser request:\n" + prompt +
            "\n\nPROFILE:\n" + profileText +
            "\n\nCV:\n" + cvText +
            "\n\nCreate professional German career/CV help. Preserve facts exactly: never invent employers, dates, certificates, qualifications, language levels or experience. If something is missing, suggest adding it instead of making it up. Return concise, useful text for an Ausbildung/job application in Germany."
        }
      ];

      if (photo) {
        content.push({
          type: "input_image",
          image_url: photo,
          detail: "low"
        });
      }

      const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + env.OPENAI_API_KEY
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-5.6-luna",
          store: false,
          instructions:
            "You are BerOpp AI Career & CV Assistant. Help users prepare truthful German CV and application material. Do not invent facts. Keep language professional and understandable. Output only the requested JSON object.",
          input: [{ role: "user", content }],
          text: {
            format: {
              type: "json_schema",
              name: "beropp_career_result",
              strict: true,
              schema
            }
          }
        })
      });

      const raw = await openaiResponse.json();
      if (!openaiResponse.ok) {
        return json({ error: raw?.error?.message || "OpenAI request failed." }, openaiResponse.status, request);
      }

      const outputText = raw.output_text || "";
      let result;
      try {
        result = JSON.parse(outputText);
      } catch {
        return json({ error: "The AI returned an unexpected response format." }, 502, request);
      }

      return json(result, 200, request);
    } catch (error) {
      return json({ error: "Server error: " + (error?.message || "Unknown error") }, 500, request);
    }
  }
};

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeadersFor(request || new Request("https://beropp.de")),
      "Content-Type": "application/json"
    }
  });
}
