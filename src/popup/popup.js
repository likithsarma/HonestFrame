const toggle = document.getElementById('enabled');
const shuffle = document.getElementById('shuffle');
const status = document.getElementById('status');

function say(text) {
  status.textContent = text;
  if (text) setTimeout(() => { if (status.textContent === text) status.textContent = ''; }, 2500);
}

(async () => {
  const { enabled } = await chrome.storage.local.get('enabled');
  toggle.checked = enabled !== false;
})();

toggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ enabled: toggle.checked });
  say(toggle.checked ? 'Thumbnails will be replaced.' : 'Original thumbnails restored.');
});

shuffle.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
  await chrome.storage.local.set({ shuffleAt: Date.now() }); // content scripts watch this
  say('Picking new frames…');
});
