const $ = (id) => document.getElementById(id);
const status = (message) => {
  $('status').textContent = message;
};

async function getProfile() {
  const result = await chrome.storage.local.get('beroppProfile');
  return result.beroppProfile || null;
}

function isValidProfile(profile) {
  return profile && typeof profile === 'object' && !Array.isArray(profile);
}

$('import').addEventListener('click', async () => {
  const file = $('profileFile').files[0];
  if (!file) {
    status('Choose your exported profile JSON first.');
    return;
  }

  try {
    const profile = JSON.parse(await file.text());
    if (!isValidProfile(profile)) {
      status('❌ The JSON file does not contain a valid profile object.');
      return;
    }

    await chrome.storage.local.set({ beroppProfile: profile });
    const fieldCount = Object.values(profile).filter(
      (value) => value !== null && value !== undefined && String(value).trim() !== ''
    ).length;
    status(`✅ Profile imported. ${fieldCount} fields available.`);
  } catch (error) {
    status('❌ Invalid JSON profile file.');
  }
});

$('fill').addEventListener('click', async () => {
  const profile = await getProfile();
  if (!profile) {
    status('Import a profile first.');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    status('No active page found.');
    return;
  }

  try {
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'BEROPP_FILL',
      profile
    });
    status(`Filled: ${result?.filled || 0} · Not matched: ${result?.unmatched || 0}`);
  } catch (error) {
    status('This page does not allow autofill. Try a normal website tab.');
  }
});

$('clear').addEventListener('click', async () => {
  await chrome.storage.local.remove('beroppProfile');
  status('Extension profile deleted.');
});

(async () => {
  const profile = await getProfile();
  if (profile) {
    status('Profile ready. Click Fill form when you are on an application page.');
  }
})();
