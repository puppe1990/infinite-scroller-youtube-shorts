const STORAGE_KEY = 'autoplayEnabled';
const toggleEl = document.getElementById('autoplayToggle');
const statusEl = document.getElementById('status');

const updateUI = (enabled) => {
  toggleEl.checked = enabled;
  statusEl.textContent = enabled ? 'Ativo' : 'Desativado';
  statusEl.classList.toggle('disabled', !enabled);
};

chrome.storage.sync.get({ [STORAGE_KEY]: true }, (data) => {
  updateUI(Boolean(data[STORAGE_KEY]));
});

toggleEl.addEventListener('change', (event) => {
  const enabled = event.target.checked;
  chrome.storage.sync.set({ [STORAGE_KEY]: enabled }, () => {
    updateUI(enabled);
  });
});
