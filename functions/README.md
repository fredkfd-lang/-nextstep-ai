# Linkora secure gift-group backend

This folder contains Firebase callable Cloud Functions for verified members and secret gift draws.

## Data separation
- Linkora stores group data in the `linkoraGiftGroups` collection, with `members` and `privateAssignments` subcollections.
- The Firebase project is currently configured as `beropp`, as requested. This keeps Linkora's Firestore group data in its own collection, separate from BerOpp's application collections.
- **Firebase Authentication users are project-wide**, so accounts created for Linkora use the same Firebase Auth user pool as BerOpp. A named Firebase web app does not isolate user accounts.
- Never deploy the repository's restrictive `firestore.rules` to the BerOpp project without first reviewing and merging them with BerOpp's existing production rules. The root `firebase.json` is intentionally configured to deploy **Cloud Functions only**.

## What it provides
- `createGiftGroup`: creates a group and a private invitation code for a signed-in user whose email or phone is verified.
- `joinGiftGroup`: joins a group using its invitation code after verification.
- `drawGiftRecipients`: organizer-only draw; each member is assigned someone else, and the draw can only run once.
- `revealGiftRecipient`: a member can request only their own recipient.

## Required before it is live
1. Confirm that using the shared `beropp` Firebase Authentication user pool is acceptable for Linkora and BerOpp.
2. In Firebase Console, enable Email/Password and Phone providers under Authentication. Configure authorized domains for the Linkora website.
3. Enable Cloud Firestore if it is not already enabled. Cloud Functions deployment may require the Firebase project to use the Blaze billing plan.
4. From the repository root, install Firebase CLI if needed, sign in with an account that has permission to deploy to `beropp`, then run:
   `npm install --prefix functions`
   `firebase deploy --only functions`
5. Test account verification, group creation/joining, one-time draw, and each member's private reveal with test accounts before using real group members.

The website client configuration is in `firebase-linkora.js`. Firebase web configuration values are intended for client use; never put service-account private keys or other server secrets in the website or commit them to GitHub. The backend is committed but has not been deployed or production-tested yet.
