# Linkora mobile app — WhatsApp Share intake

This folder contains the first React Native / Expo app scaffold for receiving a WhatsApp group invite URL through the iOS Share menu.

## What it does

- Registers a native share-intent extension using `expo-share-intent`.
- Accepts shared text/URLs, looks for a `https://chat.whatsapp.com/...` invite link, and fills the Linkora form.
- Asks the user to enter the group name and confirm they are allowed to share the invite link.
- Saves the name and invite URL on this device only using AsyncStorage.

It does **not** read WhatsApp's private group list, import group members, verify group ownership, or sync groups to a server.

## Build

Use a compatible Node.js LTS version and install dependencies from this directory:

```bash
cd mobile
npm install
npx expo install --check
```

The native share extension is not available in Expo Go. Create a native development build or EAS build.

For iOS cloud builds, install/configure EAS CLI, sign in to Expo, and run:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform ios --profile preview
```

The `extra.eas.projectId` in `app.json` is a placeholder and must be replaced with the project ID produced by EAS configuration before building. An Apple Developer account and valid iOS signing credentials are needed for device distribution. A Windows PC can initiate an EAS cloud build, but cannot run Apple's local Xcode tools.

## Test the share flow

1. Install the resulting build on an iPhone.
2. In WhatsApp, open the group's info and use **Invite via link** then **Share link**.
3. Choose **Linkora** from the iOS share sheet.
4. Confirm the invite link arrives, enter the group name, check the permission box, and save.

If Linkora does not appear in the share sheet after installation, confirm the app was built with the share-intent plugin and installed again after the native extension was added.

## Privacy

Invite links can let other people join a group. Only submit a link you have permission to share. This prototype keeps saved links in local app storage; do not treat it as a secure multi-user service.
