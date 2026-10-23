const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { randomBytes, randomInt } = require("node:crypto");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });
const db = getFirestore();

function verifiedUid(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const token = request.auth.token || {};
  if (token.email_verified !== true && !token.phone_number) {
    throw new HttpsError("failed-precondition", "Verify your email or phone first.");
  }
  return request.auth.uid;
}
function textValue(value, label, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new HttpsError("invalid-argument", label + " is required.");
  }
  return value.trim();
}
function makeCode() { return randomBytes(24).toString("base64url"); }
function noSelfDraw(members) {
  const shuffled = [...members];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (shuffled.some((m, i) => m.uid === members[i].uid)) {
    throw new HttpsError("internal", "Could not create a valid draw.");
  }
  return shuffled;
}

exports.createGiftGroup = onCall(async (request) => {
  const uid = verifiedUid(request);
  const name = textValue(request.data?.name, "Group name");
  const description = typeof request.data?.description === "string" ? request.data.description.trim().slice(0, 500) : "";
  const code = makeCode();
  const ref = db.collection("giftGroups").doc();
  await ref.set({ name, description, ownerUid: uid, inviteCode: code, createdAt: FieldValue.serverTimestamp(), drawCreatedAt: null });
  await ref.collection("members").doc(uid).set({ uid, displayName: textValue(request.data?.displayName || "Organizer", "Display name"), joinedAt: FieldValue.serverTimestamp() });
  return { groupId: ref.id, inviteCode: code };
});

exports.joinGiftGroup = onCall(async (request) => {
  const uid = verifiedUid(request);
  const code = textValue(request.data?.inviteCode, "Invitation code", 200);
  const displayName = textValue(request.data?.displayName, "Display name");
  const found = await db.collection("giftGroups").where("inviteCode", "==", code).limit(1).get();
  if (found.empty) throw new HttpsError("not-found", "Invitation is invalid or expired.");
  const group = found.docs[0];
  if (group.get("drawCreatedAt")) throw new HttpsError("failed-precondition", "This group has already drawn names.");
  await group.ref.collection("members").doc(uid).set({ uid, displayName, joinedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { groupId: group.id, groupName: group.get("name") };
});

exports.drawGiftRecipients = onCall(async (request) => {
  const uid = verifiedUid(request);
  const groupId = textValue(request.data?.groupId, "Group ID", 150);
  const groupRef = db.collection("giftGroups").doc(groupId);
  return db.runTransaction(async (tx) => {
    const group = await tx.get(groupRef);
    if (!group.exists) throw new HttpsError("not-found", "Group not found.");
    if (group.get("ownerUid") !== uid) throw new HttpsError("permission-denied", "Only the organizer can start the draw.");
    if (group.get("drawCreatedAt")) throw new HttpsError("failed-precondition", "The draw already exists.");
    const snap = await tx.get(groupRef.collection("members"));
    const members = snap.docs.map(d => ({ uid: d.id, displayName: d.get("displayName") }));
    if (members.length < 2) throw new HttpsError("failed-precondition", "At least two verified members are required.");
    const shuffled = noSelfDraw(members);
    members.forEach((member, i) => tx.set(groupRef.collection("privateAssignments").doc(member.uid), {
      recipientUid: shuffled[i].uid, recipientName: shuffled[i].displayName, createdAt: FieldValue.serverTimestamp()
    }));
    tx.update(groupRef, { drawCreatedAt: FieldValue.serverTimestamp() });
    return { success: true, memberCount: members.length };
  });
});

exports.revealGiftRecipient = onCall(async (request) => {
  const uid = verifiedUid(request);
  const groupId = textValue(request.data?.groupId, "Group ID", 150);
  const groupRef = db.collection("giftGroups").doc(groupId);
  const [group, member, assignment] = await Promise.all([
    groupRef.get(), groupRef.collection("members").doc(uid).get(), groupRef.collection("privateAssignments").doc(uid).get()
  ]);
  if (!group.exists || !member.exists) throw new HttpsError("permission-denied", "You are not a member of this group.");
  if (!assignment.exists) throw new HttpsError("failed-precondition", "The draw has not been completed.");
  return { recipientName: assignment.get("recipientName") };
});
