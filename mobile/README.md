# BerOpp Mobile

BerOpp mobile is the Expo/React Native app foundation for jobs, Ausbildung, applications and employer tools.

## Current functionality

- Firebase Email/Password authentication
- Persistent mobile authentication
- Candidate profile
- Job/Ausbildung search and filtering
- Save jobs
- Apply to jobs
- Candidate application tracking
- Employer profile
- Employer job/Ausbildung publishing
- Employer application list and status updates
- CV PDF picker and Firebase Storage upload code (Storage requires Firebase Blaze billing)

## Firebase

The mobile client is connected to the BerOpp Firebase project.

Required Firebase services:
1. Authentication → Email/Password enabled
2. Firestore Database → Standard edition
3. Storage → optional for CV uploads; Firebase currently requires Blaze for this project

Firestore and Storage security rules are kept in the repository root.

## Run locally

From the repository root:

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on a development phone.

## Production build

Install EAS CLI and sign in to Expo:

```npm
npm install -g eas-cli
eas login
```

Then from `mobile/`:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Before store submission, the app still needs a real device test, production icons/splash assets, privacy-policy URL and store metadata, plus Apple/Google developer account configuration. Those cannot be safely marked complete until the builds have been tested.

## Important

The existing BerOpp website is separate from this mobile branch and is not modified by the mobile work.
