# BerOpp Mobile MVP

Expo/React Native mobile foundation for BerOpp.

## Firebase setup

1. Create or open the BerOpp Firebase project.
2. Enable **Authentication → Email/Password**.
3. Create a **Cloud Firestore** database.
4. Enable **Storage**.
5. Add a Web App in Firebase Project Settings and copy its configuration.
6. Copy `mobile/.env.example` to `mobile/.env` and fill the six `EXPO_PUBLIC_FIREBASE_*` values.
7. Deploy `firestore.rules` and `storage.rules` from the Firebase project.

The repository intentionally does **not** contain Firebase secrets/config values. They must come from the owner's Firebase project.

## Main flows

- Candidate: register/login → profile → CV PDF upload → search jobs → save → apply → track application status.
- Employer: register/login → employer profile → publish Job/Ausbildung → view own postings → view applications → update status.
- Jobs are stored in `jobs`.
- Employer applications are stored in top-level `applications`.
- Candidate copies are stored under `users/{uid}/applications`.
- Candidate saved jobs are stored under `users/{uid}/savedJobs`.
- CV files are stored under `users/{uid}/cv/`.

## Local run

```bash
cd mobile
npm install
npx expo start
```

Firebase must be configured before real authentication, Firestore, and Storage can work.

## Important

The existing BerOpp website on `main` is not replaced by this mobile branch.