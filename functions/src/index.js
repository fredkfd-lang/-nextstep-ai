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
  if (request.auth.token?.email_verified !== true) {
    throw new HttpsError("failed-precondition", "Verify your email first.");
  }
  return request.auth.uid;
}

function textValue(value, label, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new HttpsError("invalid-argument", label + " is required.");
  }
  return value.trim();
}

function optionalText(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function makeCode() {
  return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

function noSelfDraw(members) {
  // A cryptographically random shuffle is retried until it forms a derangement.
  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffled = [...members];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.every((member, i) => member.uid !== members[i].uid)) return shuffled;
  }
  throw new HttpsError("internal", "Could not create a valid draw. Please try again.");
}

async function requireMember(groupRef, uid) {
  const member = await groupRef.collection("members").doc(uid).get();
  if (!member.exists) throw new HttpsError("permission-denied", "You are not a member of this group.");
  return member;
}

function getGroupRef(request) {
  const groupId = textValue(request.data?.groupId, "Group ID", 150);
  return db.collection("beroppCommunityGroups").doc(groupId);
}

exports.createGiftGroup = onCall(async (request) => {
  const uid = verifiedUid(request);
  const name = textValue(request.data?.name, "Group name");
  const displayName = textValue(request.data?.displayName, "Display name");
  const description = optionalText(request.data?.description);
  const budget = optionalText(request.data?.budget, 50);
  const exchangeDate = optionalText(request.data?.exchangeDate, 10);
  if (exchangeDate && !/^\d{4}-\d{2}-\d{2}$/.test(exchangeDate)) {
    throw new HttpsError("invalid-argument", "Exchange date must use YYYY-MM-DD.");
  }

  const groupRef = db.collection("beroppCommunityGroups").doc();
  // Reserve the six-character invite code in a separate document so concurrent
  // group creation cannot silently issue the same code.
  for (let attempt = 0; attempt < 8; attempt++) {
    const inviteCode = makeCode();
    const inviteRef = db.collection("beroppCommunityInvites").doc(inviteCode);
    const created = await db.runTransaction(async (tx) => {
      const existing = await tx.get(inviteRef);
      if (existing.exists) return false;
      tx.create(inviteRef, { groupId: groupRef.id, createdAt: FieldValue.serverTimestamp() });
      tx.create(groupRef, {
        name, description, budget, exchangeDate, ownerUid: uid, inviteCode,
        createdAt: FieldValue.serverTimestamp(), drawCreatedAt: null
      });
      tx.create(groupRef.collection("members").doc(uid), {
        uid, displayName, joinedAt: FieldValue.serverTimestamp()
      });
      return true;
    });
    if (created) return { groupId: groupRef.id, inviteCode };
  }
  throw new HttpsError("resource-exhausted", "Could not create a unique invitation code. Please try again.");
});

exports.joinGiftGroup = onCall(async (request) => {
  const uid = verifiedUid(request);
  const code = textValue(request.data?.inviteCode, "Invitation code", 6).toUpperCase();
  if (!/^[A-F0-9]{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Enter the six-character invitation code.");
  }
  const displayName = textValue(request.data?.displayName, "Display name");
  const inviteRef = db.collection("beroppCommunityInvites").doc(code);
  const invite = await inviteRef.get();
  if (!invite.exists) throw new HttpsError("not-found", "Invitation is invalid or expired.");
  const groupRef = db.collection("beroppCommunityGroups").doc(invite.get("groupId"));

  return db.runTransaction(async (tx) => {
    const [currentInvite, group] = await Promise.all([tx.get(inviteRef), tx.get(groupRef)]);
    if (!currentInvite.exists || !group.exists) {
      throw new HttpsError("not-found", "Invitation is invalid or expired.");
    }
    if (group.get("drawCreatedAt")) {
      throw new HttpsError("failed-precondition", "This group has already drawn names.");
    }
    const memberRef = groupRef.collection("members").doc(uid);
    tx.set(memberRef, { uid, displayName, joinedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { groupId: groupRef.id, groupName: group.get("name") };
  });
});

exports.drawGiftRecipients = onCall(async (request) => {
  const uid = verifiedUid(request);
  const groupRef = getGroupRef(request);
  return db.runTransaction(async (tx) => {
    const group = await tx.get(groupRef);
    if (!group.exists) throw new HttpsError("not-found", "Group not found.");
    if (group.get("ownerUid") !== uid) {
      throw new HttpsError("permission-denied", "Only the organizer can start the draw.");
    }
    if (group.get("drawCreatedAt")) {
      throw new HttpsError("failed-precondition", "The draw already exists.");
    }
    const snap = await tx.get(groupRef.collection("members"));
    const members = snap.docs.map((doc) => ({ uid: doc.id, displayName: doc.get("displayName") }));
    if (members.length < 3) {
      throw new HttpsError("failed-precondition", "At least three verified members are required.");
    }
    const shuffled = noSelfDraw(members);
    members.forEach((member, i) => {
      tx.create(groupRef.collection("privateAssignments").doc(member.uid), {
        recipientUid: shuffled[i].uid,
        recipientName: shuffled[i].displayName,
        createdAt: FieldValue.serverTimestamp()
      });
    });
    tx.update(groupRef, { drawCreatedAt: FieldValue.serverTimestamp() });
    return { success: true, memberCount: members.length };
  });
});

exports.revealGiftRecipient = onCall(async (request) => {
  const uid = verifiedUid(request);
  const groupRef = getGroupRef(request);
  const [group, member, assignment] = await Promise.all([
    groupRef.get(),
    groupRef.collection("members").doc(uid).get(),
    groupRef.collection("privateAssignments").doc(uid).get()
  ]);
  if (!group.exists || !member.exists) {
    throw new HttpsError("permission-denied", "You are not a member of this group.");
  }
  if (!assignment.exists) throw new HttpsError("failed-precondition", "The draw has not been completed.");
  return { recipientName: assignment.get("recipientName") };
});

exports.sendGroupMessage = onCall(async (request) => {
  const uid = verifiedUid(request);
  const groupRef = getGroupRef(request);
  const message = textValue(request.data?.message, "Message", 1000);
  const member = await requireMember(groupRef, uid);
  const ref = await groupRef.collection("messages").add({
    uid,
    displayName: member.get("displayName") || "Group member",
    message,
    createdAt: FieldValue.serverTimestamp()
  });
  return { messageId: ref.id };
});

exports.listGroupMessages = onCall(async (request) => {
  const uid = verifiedUid(request);
  const groupRef = getGroupRef(request);
  await requireMember(groupRef, uid);
  const snap = await groupRef.collection("messages").orderBy("createdAt", "desc").limit(50).get();
  return {
    messages: snap.docs.reverse().map((doc) => ({
      id: doc.id,
      uid: doc.get("uid"),
      displayName: doc.get("displayName"),
      message: doc.get("message"),
      createdAt: doc.get("createdAt")?.toDate?.().toISOString() || null
    }))
  };
});

exports.createGroupMeetup = onCall(async (request) => {
  const uid = verifiedUid(request);
  const groupRef = getGroupRef(request);
  const title = textValue(request.data?.title, "Meetup title", 120);
  const date = textValue(request.data?.date, "Meetup date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError("invalid-argument", "Meetup date must use YYYY-MM-DD.");
  }
  const details = optionalText(request.data?.details);
  await requireMember(groupRef, uid);
  const ref = await groupRef.collection("meetups").add({
    title, date, details, createdBy: uid, createdAt: FieldValue.serverTimestamp()
  });
  return { meetupId: ref.id };
});

exports.listGroupMeetups = onCall(async (request) => {
  const uid = verifiedUid(request);
  const groupRef = getGroupRef(request);
  await requireMember(groupRef, uid);
  const snap = await groupRef.collection("meetups").orderBy("date", "asc").limit(50).get();
  return {
    meetups: snap.docs.map((doc) => ({
      id: doc.id,
      title: doc.get("title"),
      date: doc.get("date"),
      details: doc.get("details"),
      createdBy: doc.get("createdBy")
    }))
  };
});
