# Linkora secure gift-group backend

This folder contains Firebase callable Cloud Functions for verified members and secret gift draws.

## What it provides
- `createGiftGroup`: creates a group and a private invitation code for a signed-in user whose email or phone is verified.
- `joinGiftGroup`: joins a group using its invitation code after verification.
- `drawGiftRecipients`: organizer-only draw; each member is assigned someone else, and the draw can only run once.
- `revealGiftRecipient`: a member can request only their own recipient.
- Firestore rules deny direct browser access to group records and recipient assignments.

## Required before it is live
1. Create or select a Firebase project specifically for Linkora.
2. Enable Firebase Authentication Email/Password and Phone providers.
3. Configure email verification in the client app; phone users must complete Firebase phone sign-in verification.
4. Enable Cloud Firestore and select a supported region.
5. Install Firebase CLI, sign in, select the Linkora project, then run `npm install --prefix functions` and `firebase deploy --only functions,firestore:rules`.
6. Connect the Linkora web interface to Firebase Auth and these callable functions. The current local demo UI is not yet connected to this backend.

Do not put service-account credentials in the website or commit them to GitHub. Configure allowed domains and billing/quotas in Firebase before inviting real users. The invitation code should be treated as private and revocable in a production release.
