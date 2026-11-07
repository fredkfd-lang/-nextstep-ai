# BerOpp Community Firebase Functions

This folder contains callable Cloud Functions for BerOpp groups, group chat, meetups and Secret Gift Draw.

## Data separation

- BerOpp group data uses `beroppCommunityGroups` and `beroppCommunityInvites`, separate from other application collections.
- Group subcollections include `members`, `privateAssignments`, `messages`, and `meetups`.
- The Firebase project is `beropp`. Firebase Authentication users are project-wide; this named Firebase web app does not isolate accounts.
- Cloud Functions use the Admin SDK. The repository's Firestore rules deny direct client access to community data. Do not deploy those rules to the existing BerOpp project without reviewing and merging them with the production rules.
- The root `firebase.json` is configured to deploy Cloud Functions only.

## Callable functions

- `createGiftGroup`: verified-email user creates a group with a six-character invitation code and optional budget/date.
- `joinGiftGroup`: verified-email user joins with a valid invitation code.
- `drawGiftRecipients`: organizer-only, one-time server-side draw; requires at least three members and prevents self-assignment.
- `revealGiftRecipient`: each member can retrieve only their own recipient.
- `sendGroupMessage` / `listGroupMessages`: verified group members can send messages and read the latest 50 messages.
- `createGroupMeetup` / `listGroupMeetups`: verified group members can create and view meetups.

## Verification status

The source code is committed to this GitHub branch only. It has **not** been deployed to Firebase and has **not** been tested end-to-end on `beropp.de`. The local preview for ordinary groups and external platform links still uses browser storage.

## Before any deployment

1. Confirm the shared Firebase Authentication user pool is acceptable.
2. Confirm Email/Password sign-in and email verification are enabled in Firebase Authentication.
3. Verify Firestore is enabled and the intended project is `beropp`.
4. Use Firebase Emulator Suite and test accounts to verify group membership, message privacy, meetup access, the three-member minimum, no self-assignment and private recipient reveal.
5. Review production Firestore rules before changing them. Do not deploy the rules file blindly.
6. Cloud Functions deployment may require a billing-plan change. Do not change billing or deploy without explicit approval.

## Local checks

```sh
npm install --prefix functions
npm run check --prefix functions
```
