# BerOpp Mobile

BerOpp mobile is the Expo/React Native app for jobs, Ausbildung, applications and employer tools.

## Current functionality

- Firebase Email/Password authentication
- Persistent mobile authentication
- Candidate profile
- Job/Ausbildung search and filtering
- Saved jobs
- Candidate applications and status tracking
- Employer profile
- Employer job/Ausbildung publishing
- Employer application management
- International opportunities section foundation
- CV PDF picker and Firebase Storage upload code
- Hardened Firestore and Storage security rules

## Firebase

The mobile client is configured for the BerOpp Firebase project.

Configured/required services:
1. Authentication → Email/Password
2. Firestore Database → Standard edition
3. Storage → only required when cloud CV upload is enabled; this project currently requires Blaze billing for Storage

The repository contains the current Firestore and Storage rules.

## Run locally

From the repository root:

```bash
cd mobile
npm install
npx expo start
```

Use Expo Go on a development phone for the local test.

## Production build

Install EAS CLI and sign in to Expo:

```bash
npm install -g eas-cli
eas login
```

Then from `mobile/`:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

The first EAS build may ask to connect this project to an Expo account/project and configure signing credentials.

## Store preparation

See:
- `STORE_CHECKLIST.md` for the remaining Android/iOS release tasks.
- `PRIVACY_POLICY.md` for the privacy-policy draft that still needs the final legal/contact details and a public URL.

## Important

The existing BerOpp website is separate from this mobile branch and is not modified by the mobile work.

A real Android/iPhone test is still required before calling the app production-ready. The assistant cannot honestly mark that physical-device test as completed without actually running the build on a device.
