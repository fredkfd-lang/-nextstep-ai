# BerOpp Autofill Assistant (Prototype)

This Chrome extension helps copy profile information into matching fields on Ausbildung and job application websites.

## Current features

- Import a BerOpp profile JSON file.
- Fill matching text fields on the current page.
- Supports German and English field labels.
- Highlights fields that were filled.
- Never submits a form automatically.
- Keeps the imported profile in `chrome.storage.local`.

## Install locally in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this `extension` folder from the repository.
5. Open the extension popup and import the JSON file exported from BerOpp.
6. Open an application page, then select **Fill form on this page**.

## Important privacy note

This is an early prototype. The imported profile is currently stored in Chrome local extension storage without additional encryption. Do not use it on a shared or public computer, and remove the stored profile when finished.

The extension does not upload the profile to a server and does not submit applications automatically. However, field matching may not work on every website and should always be checked manually before sending an application.

## Planned improvements

- Safer encrypted profile storage.
- Explicit permission controls for websites.
- Better matching for select boxes and custom form components.
- Clearer unmatched-field reporting.
- Stronger privacy and GDPR review before public release.
