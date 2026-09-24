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


## Cloud build setup (no local computer required)

The repository includes a GitHub Actions workflow at `.github/workflows/beropp-mobile-build.yml`.

Before running it:
1. Create/sign in to an Expo account.
2. Install/connect the EAS project once and confirm the Android/iOS identifiers.
3. Create an Expo access token.
4. Add the token to GitHub as repository secret `EXPO_TOKEN`.
5. Run **Actions → Build BerOpp mobile → Run workflow** and choose Android, iOS, or all.

The workflow can build the app in the cloud. It does not replace the required real-device tests or the Google Play / Apple Developer store accounts.

## Release order

1. Cloud Android build.
2. Install the resulting Android build on a real Android phone and test login, jobs, saved jobs, applications and employer flows.
3. Cloud iOS build after Apple signing is configured.
4. Test the iOS build on a real iPhone/TestFlight.
5. Finalize app icon/splash, privacy-policy public URL and store metadata.
6. Complete Google Play Console and Apple App Store Connect declarations.
7. Only then submit the production releases.

Firebase Storage/Blaze remains optional until BerOpp needs cloud CV storage. Without Storage, the rest of the Auth/Firestore job and application flow can still be tested.
