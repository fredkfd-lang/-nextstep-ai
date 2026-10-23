// Linkora Firebase client bridge.
// Replace the placeholder config with the Web app config from Firebase Console.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
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
const status = (message, error=false) => {
  const el = document.getElementById("cloudStatus");
  if (el) { el.textContent = message; el.classList.toggle("error", error); }
};
let auth, functions, phoneConfirmation=null, recaptcha=null, activeCloudGroupId=null;
if (configured) {
  const app = getApps().find(existing => existing.name === "linkora") || initializeApp(firebaseConfig, "linkora");
  auth = getAuth(app);
  functions = getFunctions(app, "europe-west1");
  onAuthStateChanged(auth, user => {
    const el = document.getElementById("cloudUser");
    if (el) el.textContent = user ? (user.email || user.phoneNumber || user.uid) + (user.emailVerified || user.phoneNumber ? " · verified" : " · email not verified") : "Signed out";
    const verify = document.getElementById("cloudVerifyEmail");
    if (verify) verify.hidden = !user || user.emailVerified || !!user.phoneNumber;
  });
} else {
  status("Firebase is not configured yet. Add your Firebase Web App config to firebase-linkora.js before using real accounts.", true);
}
const callable = name => {
  if (!configured || !functions) throw new Error("Firebase configuration is missing. Add the Web App config first.");
  return httpsCallable(functions, name);
};
const field = id => document.getElementById(id)?.value?.trim() || "";
async function run(label, fn) {
  try { status(label + "…"); const result = await fn(); status(typeof result === "string" ? result : label + " complete."); return result; }
  catch (e) { status(e?.message || "Request failed.", true); throw e; }
}
window.LinkoraCloud = {
  configured,
  user: () => auth?.currentUser || null,
  registerEmail: () => run("Creating account", async () => {
    const credential = await createUserWithEmailAndPassword(auth, field("cloudEmail"), field("cloudPassword"));
    await sendEmailVerification(credential.user);
    return "Account created. Check your email and click the verification link before using Group Space.";
  }),
  signInEmail: () => run("Signing in", async () => {
    const credential = await signInWithEmailAndPassword(auth, field("cloudEmail"), field("cloudPassword"));
    return credential.user.emailVerified ? "Signed in with verified email." : "Signed in, but verify your email before creating or joining groups.";
  }),
  sendVerification: () => run("Sending verification email", async () => { if (!auth?.currentUser) throw new Error("Sign in first."); await sendEmailVerification(auth.currentUser); return "Verification email sent. Check your inbox and spam folder."; }),
  signOut: () => run("Signing out", async () => { await signOut(auth); activeCloudGroupId=null; return "Signed out."; }),
  sendPhoneCode: () => run("Sending phone code", async () => {
    if (!configured) throw new Error("Firebase configuration is missing.");
    if (!recaptcha) recaptcha = new RecaptchaVerifier(auth, "phoneRecaptcha", { size: "normal" });
    await recaptcha.render();
    phoneConfirmation = await signInWithPhoneNumber(auth, field("cloudPhone"), recaptcha);
    return "SMS code sent. Enter it below.";
  }),
  verifyPhoneCode: () => run("Verifying phone", async () => {
    if (!phoneConfirmation) throw new Error("Request an SMS code first.");
    await phoneConfirmation.confirm(field("cloudPhoneCode"));
    return "Phone number verified and signed in.";
  }),
  createGroup: () => run("Creating secure group", async () => {
    const user = auth?.currentUser;
    if (!user || (!user.emailVerified && !user.phoneNumber)) throw new Error("Sign in and verify your email or phone first.");
    const result = await callable("createGiftGroup")({ name: field("cloudGroupName"), description: field("cloudGroupDescription"), displayName: field("cloudDisplayName") });
    activeCloudGroupId=result.data.groupId;
    document.getElementById("cloudInviteCode").textContent = result.data.inviteCode;
    document.getElementById("cloudGroupId").textContent = result.data.groupId;
    return "Secure group created. Copy the invitation code and share it privately.";
  }),
  joinGroup: () => run("Joining group", async () => {
    const user = auth?.currentUser;
    if (!user || (!user.emailVerified && !user.phoneNumber)) throw new Error("Sign in and verify your email or phone first.");
    const result = await callable("joinGiftGroup")({ inviteCode: field("cloudJoinCode"), displayName: field("cloudDisplayName") });
    activeCloudGroupId=result.data.groupId;
    document.getElementById("cloudGroupId").textContent = result.data.groupId;
    document.getElementById("cloudInviteCode").textContent = "Joined: " + result.data.groupName;
    return "Joined the secure group.";
  }),
  draw: () => run("Running secret draw", async () => {
    const groupId = field("cloudGroupId") || activeCloudGroupId;
    if (!groupId) throw new Error("Create or join a secure group first.");
    const result = await callable("drawGiftRecipients")({ groupId });
    return "Secret draw created for " + result.data.memberCount + " members. Each member must sign in and reveal only their own recipient.";
  }),
  reveal: () => run("Loading your recipient", async () => {
    const groupId = field("cloudGroupId") || activeCloudGroupId;
    if (!groupId) throw new Error("Create or join a secure group first.");
    const result = await callable("revealGiftRecipient")({ groupId });
    document.getElementById("cloudRecipient").textContent = result.data.recipientName;
    return "Your recipient is shown below. Keep it private.";
  })
};
function bind(id, method) { const el=document.getElementById(id); if(el) el.addEventListener("click", async e=>{e.preventDefault(); try{await window.LinkoraCloud[method]();}catch(_){}}); }
bind("cloudRegisterEmail","registerEmail");
bind("cloudSignInEmail","signInEmail");
bind("cloudSendVerification","sendVerification");
bind("cloudSignOut","signOut");
bind("cloudSendPhoneCode","sendPhoneCode");
bind("cloudVerifyPhoneCode","verifyPhoneCode");
bind("cloudCreateGroup","createGroup");
bind("cloudJoinGroup","joinGroup");
bind("cloudRunDraw","draw");
bind("cloudRevealRecipient","reveal");
window.addEventListener("DOMContentLoaded", () => {
  const note=document.getElementById("cloudConfigNote");
  if(note && configured) note.textContent="Firebase client configuration loaded. Deploy Cloud Functions and Firestore rules before using this feature.";
});
