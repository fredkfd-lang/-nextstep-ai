const corsHeaders = {
  "Access-Control-Allow-Origin": "https://fredkfd-lang.github.io",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    profile: { type: "string" },
    suggestions: { type: "array", items: { type: "string" } },
    application: { type: "string" }
  },
  required: ["title", "profile", "suggestions", "application"]
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response("", { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }
    if (!env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not configured on the server." }, 500);
    }

    try {
      const body = await request.json();
      const prompt = String(body.prompt || "").slice(0, 6000);
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
            "User request:\n" + prompt +
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
        return json({ error: raw?.error?.message || "OpenAI request failed." }, openaiResponse.status);
      }

      const outputText = raw.output_text || "";
      let result;
      try {
        result = JSON.parse(outputText);
      } catch {
        return json({ error: "The AI returned an unexpected response format." }, 502);
      }

      return json(result, 200);
    } catch (error) {
      return json({ error: "Server error: " + (error?.message || "Unknown error") }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
