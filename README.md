# BerOpp Community

BerOpp is focused on **groups, group chat, meetups/events, and Secret Gift Draw**.

## Current repository contents

- `index.html`: mobile-friendly BerOpp community interface.
- `firebase-beropp.js`: Firebase Authentication and callable-function client.
- `functions/src/index.js`: server-side group, chat, meetup and private gift-draw functions.
- `firestore.rules`: restrictive direct-client Firestore rules. Cloud Functions use the Firebase Admin SDK and are not governed by these client rules.

## Implemented in source

- Email/password registration and email verification.
- Secure group creation with a six-character invitation code.
- Verified members can join by invitation code.
- Member-only group chat: send and list the latest 50 messages.
- Member-only meetup creation and listing.
- Organizer-only Secret Gift Draw with at least three verified members.
- Server-side assignment prevents self-draw; each member can reveal only their own recipient.
- BerOpp group data uses the separate `beroppCommunityGroups` and `beroppCommunityInvites` collections.

## Important limitations

**GitHub source code is not the same as a deployed service.** These changes have not been deployed to Firebase or verified on `beropp.de`. The shared group/chat/meetup/draw actions will not work until Cloud Functions are deployed and tested.

The basic local group/connection preview still uses browser storage and does not synchronize between devices. Automatic WhatsApp/Facebook group import is not available; members must share an invitation code or link themselves. Admin member management, message moderation/reporting, wishlists, gift status tracking, and event editing/cancellation are not implemented in this update.

## Safe verification

From the repository root:

```sh
npm install --prefix functions
npm run check --prefix functions
```

To test locally, use the Firebase Emulator Suite with test accounts and non-sensitive test data. Do not deploy Firestore rules blindly: review them against the existing BerOpp production rules first. Deploying Cloud Functions may require a Firebase billing-plan change, so this repository update does not deploy anything or change billing.

## Firebase project notes

The Firebase project is `beropp`. Firebase Authentication users are project-wide, so this named web app does not create a separate user pool. Firebase web configuration is public client configuration; never commit service-account private keys or other server secrets.
