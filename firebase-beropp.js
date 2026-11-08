// BerOpp Firebase client bridge.
// Firebase Web App configuration is public client configuration, not a server secret.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyBKJ7KGeMg7ATm6rSJmhfBPgp9c3cOTMaI",
  authDomain: "beropp.firebaseapp.com",
  projectId: "beropp",
  storageBucket: "beropp.firebasestorage.app",
  messagingSenderId: "175693628880",
  appId: "1:175693628880:web:a6e377b0deb5a73b66a5d5",
  measurementId: "G-H654XFZKV6"
};
const configured = true;
const status = (message, error = false) => {
  const el = document.getElementById("cloudStatus");
  if (el) {
    el.textContent = message;
    el.classList.toggle("error", error);
  }
};
let auth, functions, activeCloudGroupId = (() => {
  try { return sessionStorage.getItem("beroppActiveGroupId") || null; }
  catch (_) { return null; }
})();

if (configured) {
  const app = getApps().find(existing => existing.name === "beropp-community")
    || initializeApp(firebaseConfig, "beropp-community");
  auth = getAuth(app);
  functions = getFunctions(app, "europe-west1");
  onAuthStateChanged(auth, user => {
    const el = document.getElementById("cloudUser");
    if (el) el.textContent = user
      ? (user.email || user.uid) + (user.emailVerified ? " · verified" : " · email not verified")
      : "Signed out";
    const verify = document.getElementById("cloudVerifyEmail");
    if (verify) verify.hidden = !user || user.emailVerified;
    if (user && activeCloudGroupId) {
      const groupEl = document.getElementById("cloudGroupId");
      if (groupEl) groupEl.textContent = activeCloudGroupId;
    }
  });
} else {
  status("Firebase is not configured. Add the Firebase Web App configuration before using shared groups.", true);
}

const callable = name => {
  if (!configured || !functions) throw new Error("Firebase configuration is missing.");
  return httpsCallable(functions, name);
};
const field = id => document.getElementById(id)?.value?.trim() || "";
const groupId = () => {
  const displayed = document.getElementById("cloudGroupId")?.textContent?.trim() || "";
  return activeCloudGroupId || (displayed && displayed !== "—" ? displayed : "");
};
const setActiveGroup = id => {
  activeCloudGroupId = id || null;
  try {
    if (activeCloudGroupId) sessionStorage.setItem("beroppActiveGroupId", activeCloudGroupId);
    else sessionStorage.removeItem("beroppActiveGroupId");
  } catch (_) {}
  const el = document.getElementById("cloudGroupId");
  if (el) el.textContent = activeCloudGroupId || "—";
};

async function run(label, fn) {
  try {
    status(label + "…");
    const result = await fn();
    if (typeof result === "string") status(result);
    return result;
  } catch (error) {
    status(error?.message || "Request failed.", true);
    throw error;
  }
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function renderMessages(messages) {
  const target = document.getElementById("cloudChatMessages");
  if (!target) return;
  target.innerHTML = messages.length ? messages.map(item =>
    '<div class="item"><b>' + escapeHtml(item.displayName) + '</b><p>'
    + escapeHtml(item.message) + '</p><span class="small muted">'
    + escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString() : "")
    + '</span></div>'
  ).join("") : '<div class="empty">No messages yet. Start the group conversation.</div>';
}
function renderMeetups(meetups) {
  const target = document.getElementById("cloudMeetupList");
  if (!target) return;
  target.innerHTML = meetups.length ? meetups.map(item =>
    '<div class="item"><h3>📅 ' + escapeHtml(item.title) + '</h3><p><b>'
    + escapeHtml(item.date) + '</b></p><p>' + escapeHtml(item.details || "")
    + '</p></div>'
  ).join("") : '<div class="empty">No meetups planned yet.</div>';
}

window.BerOppCloud = {
  configured,
  user: () => auth?.currentUser || null,
  registerEmail: () => run("Creating account", async () => {
    const credential = await createUserWithEmailAndPassword(auth, field("cloudEmail"), field("cloudPassword"));
    await sendEmailVerification(credential.user);
    return "Account created. Check your email and verify it before creating or joining a group.";
  }),
  signInEmail: () => run("Signing in", async () => {
    const credential = await signInWithEmailAndPassword(auth, field("cloudEmail"), field("cloudPassword"));
    return credential.user.emailVerified
      ? "Signed in with verified email."
      : "Signed in, but verify your email before using group features.";
  }),
  sendVerification: () => run("Sending verification email", async () => {
    if (!auth?.currentUser) throw new Error("Sign in first.");
    await sendEmailVerification(auth.currentUser);
    return "Verification email sent. Check your inbox and spam folder.";
  }),
  signOut: () => run("Signing out", async () => {
    await signOut(auth);
    setActiveGroup(null);
    return "Signed out.";
  }),
  createGroup: () => run("Creating secure group", async () => {
    const user = auth?.currentUser;
    if (!user?.emailVerified) throw new Error("Sign in with a verified email first.");
    const result = await callable("createGiftGroup")({
      name: field("cloudGroupName"),
      description: field("cloudGroupDescription"),
      displayName: field("cloudDisplayName"),
      budget: field("cloudGroupBudget"),
      exchangeDate: field("cloudExchangeDate")
    });
    setActiveGroup(result.data.groupId);
    document.getElementById("cloudInviteCode").textContent = result.data.inviteCode;
    document.getElementById("cloudGroupId").textContent = result.data.groupId;
    return "Secure group created. Share the six-character invitation code privately.";
  }),
  joinGroup: () => run("Joining group", async () => {
    const user = auth?.currentUser;
    if (!user?.emailVerified) throw new Error("Sign in with a verified email first.");
    const result = await callable("joinGiftGroup")({
      inviteCode: field("cloudJoinCode").toUpperCase(),
      displayName: field("cloudDisplayName")
    });
    setActiveGroup(result.data.groupId);
    document.getElementById("cloudGroupId").textContent = result.data.groupId;
    document.getElementById("cloudInviteCode").textContent = "Joined: " + result.data.groupName;
    return "Joined the secure group. You can now use its chat and meetups.";
  }),
  draw: () => run("Running secret gift draw", async () => {
    if (!groupId()) throw new Error("Create or join a secure group first.");
    const result = await callable("drawGiftRecipients")({ groupId: groupId() });
    return "Secure draw created for " + result.data.memberCount + " members. At least three verified members are required.";
  }),
  reveal: () => run("Loading your recipient", async () => {
    if (!groupId()) throw new Error("Create or join a secure group first.");
    const result = await callable("revealGiftRecipient")({ groupId: groupId() });
    document.getElementById("cloudRecipient").textContent = result.data.recipientName;
    return "Your recipient is shown below. Keep it private.";
  }),
  loadMessages: () => run("Loading group chat", async () => {
    if (!groupId()) throw new Error("Create or join a secure group first.");
    const result = await callable("listGroupMessages")({ groupId: groupId() });
    renderMessages(result.data.messages || []);
    return "Group chat updated.";
  }),
  sendMessage: () => run("Sending message", async () => {
    if (!groupId()) throw new Error("Create or join a secure group first.");
    const message = field("cloudMessage");
    if (!message) throw new Error("Write a message first.");
    await callable("sendGroupMessage")({ groupId: groupId(), message });
    document.getElementById("cloudMessage").value = "";
    const result = await callable("listGroupMessages")({ groupId: groupId() });
    renderMessages(result.data.messages || []);
    return "Message sent to the group.";
  }),
  loadMeetups: () => run("Loading meetups", async () => {
    if (!groupId()) throw new Error("Create or join a secure group first.");
    const result = await callable("listGroupMeetups")({ groupId: groupId() });
    renderMeetups(result.data.meetups || []);
    return "Meetups updated.";
  }),
  createMeetup: () => run("Saving meetup", async () => {
    if (!groupId()) throw new Error("Create or join a secure group first.");
    await callable("createGroupMeetup")({
      groupId: groupId(),
      title: field("cloudMeetupTitle"),
      date: field("cloudMeetupDate"),
      details: field("cloudMeetupDetails")
    });
    const result = await callable("listGroupMeetups")({ groupId: groupId() });
    renderMeetups(result.data.meetups || []);
    document.getElementById("cloudMeetupForm")?.reset();
    return "Meetup saved for the group.";
  })
};

function bind(id, method) {
  const element = document.getElementById(id);
  if (!element) return;
  element.addEventListener("click", async event => {
    event.preventDefault();
    try { await window.BerOppCloud[method](); } catch (_) {}
  });
}
bind("cloudRegisterEmail", "registerEmail");
bind("cloudSignInEmail", "signInEmail");
bind("cloudVerifyEmail", "sendVerification");
bind("cloudSignOut", "signOut");
bind("cloudCreateGroup", "createGroup");
bind("cloudJoinGroup", "joinGroup");
bind("cloudRunDraw", "draw");
bind("cloudRevealRecipient", "reveal");
bind("cloudLoadMessages", "loadMessages");
bind("cloudSendMessage", "sendMessage");
bind("cloudLoadMeetups", "loadMeetups");
bind("cloudCreateMeetup", "createMeetup");

const copyInviteButton = document.getElementById("cloudCopyInviteCode");
if (copyInviteButton) copyInviteButton.addEventListener("click", async () => {
  const code = document.getElementById("cloudInviteCode")?.textContent?.trim() || "";
  if (!code || code === "—" || code.startsWith("Joined:")) {
    status("Create a group first to get an invitation code.", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(code);
    status("Invitation code copied. Share it privately with group members.");
  } catch (_) {
    status("Could not copy automatically. Select and copy the invitation code manually.", true);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const note = document.getElementById("cloudConfigNote");
  if (note && configured) {
    note.textContent = "Firebase client configuration loaded. Deploy and test the Cloud Functions before treating shared group chat, meetups or gift draws as live.";
  }
});
