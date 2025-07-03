// renderer.js - Priven TOTP Authenticator
// Organized and cleaned for maintainability

// =========================
// Imports
// =========================
const Vault = require('../models/Vault');
const TOTPAccount = require('../models/TOTPAccount');
const { generateTOTP } = require('../services/totpService');
const path = require('path');

// =========================
// UI Element References
// =========================
const setupContainer = document.getElementById('setup-container');
const unlockContainer = document.getElementById('unlock-container');
const mainContainer = document.getElementById('main-container');
const setupPassword = document.getElementById('setup-password');
const setupConfirm = document.getElementById('setup-confirm');
const setupBtn = document.getElementById('setup-btn');
const setupError = document.getElementById('setup-error');
const setupStrength = document.getElementById('setup-strength');
const unlockPassword = document.getElementById('unlock-password');
const unlockBtn = document.getElementById('unlock-btn');
const unlockError = document.getElementById('unlock-error');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const mainList = document.getElementById('accounts-list');
const addBtn = document.getElementById('add-btn');
const exportBtn = document.getElementById('export-btn');
const accountForm = document.getElementById('account-form');
const formLabel = document.getElementById('form-label');
const formIssuer = document.getElementById('form-issuer');
const formSecret = document.getElementById('form-secret');
const formSave = document.getElementById('form-save');
const formCancel = document.getElementById('form-cancel');
const formError = document.getElementById('form-error');
const importModal = document.getElementById('import-modal');
const importPasswordInput = document.getElementById('import-password');
const importSubmit = document.getElementById('import-submit');
const importCancel = document.getElementById('import-cancel');
const importError = document.getElementById('import-error');

// =========================
// State
// =========================
let vault = null;
let masterPassword = '';
let editIndex = null;
let timer = null;
let importFilePath = null;
let autoLockTimer = null;
const AUTO_LOCK_SECONDS = 45;

// =========================
// Utility Functions
// =========================
/**
 * Show only the specified container, hide others.
 */
function show(container) {
  setupContainer.classList.add('hidden');
  unlockContainer.classList.add('hidden');
  mainContainer.classList.add('hidden');
  container.classList.remove('hidden');
}

/**
 * Simple password strength check.
 */
function passwordStrength(pw) {
  if (pw.length < 6) return 'Too short';
  if (/^(.)\1+$/.test(pw)) return 'Too weak';
  return 'OK';
}

/**
 * Check if vault file exists.
 */
async function checkVaultExists() {
  return await Vault.exists();
}

/**
 * Clear the add/edit form.
 */
function clearForm() {
  formLabel.value = '';
  formIssuer.value = '';
  formSecret.value = '';
  formError.textContent = '';
  editIndex = null;
}

/**
 * Get the icon for a given issuer.
 */
function getIssuerIcon(issuer) {
  if (!issuer) return '../assets/default.png';
  const name = issuer.toLowerCase();
  if (name.includes('google')) return '../assets/google.png';
  if (name.includes('microsoft') || name.includes('outlook') || name.includes('office')) return '../assets/microsoft.png';
  if (name.includes('facebook')) return '../assets/facebook.png';
  if (name.includes('twitter')) return '../assets/twitter.png';
  if (name.includes('github')) return '../assets/github.png';
  if (name.includes('amazon') || name.includes('aws')) return '../assets/amazon.png';
  if (name.includes('dropbox')) return '../assets/dropbox.png';
  if (name.includes('slack')) return '../assets/slack.png';
  if (name.includes('apple') || name.includes('icloud')) return '../assets/apple.png';
  if (name.includes('linkedin')) return '../assets/linkedin.png';
  if (name.includes('discord')) return '../assets/discord.png';
  if (name.includes('instagram')) return '../assets/instagram.png';
  if (name.includes('paypal')) return '../assets/paypal.png';
  if (name.includes('reddit')) return '../assets/reddit.png';
  if (name.includes('steam')) return '../assets/steam.png';
  if (name.includes('yahoo')) return '../assets/yahoo.png';
  if (name.includes('zoom')) return '../assets/zoom.png';
  return '../assets/default.png';
}

/**
 * Render all TOTP account cards.
 */
function renderAccounts() {
  mainList.innerHTML = '';
  if (!vault.accounts.length) {
    mainList.innerHTML = '<div class="text-gray-400 text-center">No accounts yet.</div>';
    return;
  }
  vault.accounts.forEach((acc, idx) => {
    const code = generateTOTP(acc.secret);
    const icon = getIssuerIcon(acc.issuer);
    // Format addedDate as dd-mm-yyyy
    let addedDate = acc.addedDate ? (() => { const d = new Date(acc.addedDate); return d.toLocaleDateString('en-GB'); })() : 'Added Date';
    // Calculate seconds left for countdown
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    const secondsLeft = 30 - (seconds % 30);
    const item = document.createElement('div');
    item.className = 'totp-card flex items-center justify-between bg-[#5c77ff] rounded-xl px-4 py-3 mb-3 cursor-pointer select-none relative';
    item.style.userSelect = 'none';
    item.innerHTML = `
      <div class='flex items-center gap-3'>
        <img src="${icon}" alt="${acc.issuer || 'Issuer'}" class="w-8 h-8 rounded-full bg-white p-1" />
        <div class='flex flex-col'>
          <span class='text-black font-semibold leading-tight text-base'>${acc.label}</span>
          <span class='text-xs text-black opacity-70'>${addedDate}</span>
        </div>
      </div>
      <div class='flex flex-col items-end'>
        <span class='font-mono text-2xl tracking-widest text-black select-all totp-code' data-code='${code}'>${code}</span>
        <span class='text-xs text-black opacity-80 countdown-timer'>${secondsLeft}s</span>
      </div>
    `;
    // Click to copy
    item.addEventListener('click', (e) => {
      navigator.clipboard.writeText(code);
      // Pressing animation
      item.classList.add('scale-95', 'shadow-inner');
      item.classList.add('ring-2', 'ring-green-400');
      setTimeout(() => {
        item.classList.remove('scale-95', 'shadow-inner');
        item.classList.remove('ring-2', 'ring-green-400');
      }, 180);
    });
    // Right-click for context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Remove any existing menu
      const oldMenu = document.getElementById('context-menu');
      if (oldMenu) oldMenu.remove();
      // Create menu
      const menu = document.createElement('div');
      menu.id = 'context-menu';
      menu.className = 'absolute z-50 bg-white border border-gray-300 rounded shadow text-black text-sm';
      menu.style.top = `${e.offsetY}px`;
      menu.style.left = `${e.offsetX}px`;
      menu.innerHTML = `
        <div class='context-edit px-4 py-2 hover:bg-gray-100 cursor-pointer'>Edit</div>
        <div class='context-delete px-4 py-2 hover:bg-gray-100 cursor-pointer'>Delete</div>
      `;
      item.appendChild(menu);
      // Edit
      menu.querySelector('.context-edit').onclick = (ev) => {
        ev.stopPropagation();
        menu.remove();
        editIndex = idx;
        const acc = vault.accounts[editIndex];
        formLabel.value = acc.label;
        formIssuer.value = acc.issuer;
        formSecret.value = acc.secret;
        accountForm.classList.remove('hidden');
        addBtn.classList.add('hidden');
        formLabel.focus();
        stopTimer();
      };
      // Delete
      menu.querySelector('.context-delete').onclick = (ev) => {
        ev.stopPropagation();
        menu.remove();
        if (confirm('Delete this account?')) {
          vault.deleteAccount(idx);
          vault.save(masterPassword);
          renderAccounts();
          clearForm();
          accountForm.classList.add('hidden');
          addBtn.classList.remove('hidden');
          startTimer();
        }
      };
      // Remove menu on click elsewhere (but not when clicking the card or menu)
      setTimeout(() => {
        document.addEventListener('mousedown', function handler(ev) {
          if (!menu.contains(ev.target)) {
            menu.remove();
            document.removeEventListener('mousedown', handler);
          }
        });
      }, 0);
    });
    mainList.appendChild(item);
  });
}

/**
 * Update countdown timers for all TOTP cards.
 */
function updateCountdown() {
  const now = Date.now();
  const seconds = Math.floor(now / 1000);
  const secondsLeft = 30 - (seconds % 30);
  document.querySelectorAll('.countdown-timer').forEach(el => {
    el.textContent = `${secondsLeft}s`;
  });
}

/**
 * Start the countdown timer and update TOTP codes.
 */
function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    const secondsLeft = 30 - (seconds % 30);
    updateCountdown();
    // Re-render accounts when timer hits 30 (i.e., secondsLeft === 30)
    if (secondsLeft === 30) renderAccounts();
  }, 1000);
}

function stopTimer() {
  if (timer) clearInterval(timer);
}

// =========================
// Password Eye Toggle Logic
// =========================
function setupEyeToggle(inputId, btnId, svgId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  const svg = document.getElementById(svgId);
  let visible = false;
  btn.addEventListener('click', () => {
    visible = !visible;
    input.type = visible ? 'text' : 'password';
    svg.innerHTML = visible
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.042-3.292M6.873 6.876A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.956 9.956 0 01-1.357 2.572M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
  });
}

setupEyeToggle('unlock-password', 'toggle-unlock-password', 'unlock-eye');
setupEyeToggle('setup-password', 'toggle-setup-password', 'setup-eye');
setupEyeToggle('setup-confirm', 'toggle-setup-confirm', 'setup-confirm-eye');

// =========================
// Event Listeners
// =========================
// Password Setup
setupPassword.addEventListener('input', () => {
  setupStrength.textContent = passwordStrength(setupPassword.value);
});

setupBtn.addEventListener('click', async () => {
  setupError.textContent = '';
  if (setupPassword.value !== setupConfirm.value) {
    setupError.textContent = 'Passwords do not match.';
    return;
  }
  if (passwordStrength(setupPassword.value) === 'Too short' || passwordStrength(setupPassword.value) === 'Too weak') {
    setupError.textContent = 'Password is too weak.';
    return;
  }
  try {
    masterPassword = setupPassword.value;
    vault = await Vault.createNew(masterPassword);
    show(mainContainer);
    renderAccounts();
    startTimer();
    clearForm();
  } catch (e) {
    setupError.textContent = 'Failed to create vault: ' + (e.message || 'Unknown error.');
  }
});

// Password Unlock
unlockBtn.addEventListener('click', async () => {
  unlockError.textContent = '';
  try {
    masterPassword = unlockPassword.value;
    vault = await Vault.load(masterPassword);
    show(mainContainer);
    renderAccounts();
    startTimer();
    clearForm();
  } catch (e) {
    if (e.message && e.message.includes('not found')) {
      unlockError.textContent = 'Vault file not found. Please set up a new vault.';
    } else if (e.message && e.message.includes('Unexpected token')) {
      unlockError.textContent = 'Vault file is corrupted or not valid.';
    } else {
      unlockError.textContent = 'Incorrect password or vault corrupted.';
    }
  }
});

// Import Vault
importBtn.addEventListener('click', () => {
  if (!confirm('Warning: Importing a vault will erase all your existing encrypted TOTP data and replace it with the imported vault. Do you want to continue?')) {
    return;
  }
  importFile.value = '';
  importFile.click();
});

importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.endsWith('.dat')) {
    alert('Only .dat files are allowed.');
    importFile.value = '';
    return;
  }
  importFilePath = file.path || (file.webkitRelativePath ? file.webkitRelativePath : '');
  importPasswordInput.value = '';
  importError.textContent = '';
  importModal.classList.remove('hidden');
  importPasswordInput.focus();
});

importSubmit.addEventListener('click', async () => {
  const password = importPasswordInput.value;
  if (!password) {
    importError.textContent = 'Please enter the master password.';
    return;
  }
  try {
    await Vault.importVault(importFilePath, password);
    importModal.classList.add('hidden');
    alert('Vault imported. Please unlock with the imported password.');
    window.location.reload();
  } catch (err) {
    importError.textContent = 'Failed to import vault: ' + err.message;
  }
});

importCancel.addEventListener('click', () => {
  importModal.classList.add('hidden');
});

// Export Vault
exportBtn.addEventListener('click', async () => {
  const remote = window.require('@electron/remote');
  const { dialog } = remote;
  const fs = require('fs');
  const path = require('path');
  const vaultPath = path.join(__dirname, '..', 'vault.dat');
  const result = await dialog.showSaveDialog({
    title: 'Export Vault',
    defaultPath: 'vault.dat',
    filters: [{ name: 'Vault Data', extensions: ['dat'] }]
  });
  if (!result.canceled && result.filePath) {
    fs.copyFile(vaultPath, result.filePath, (err) => {
      if (err) {
        alert('Failed to export vault: ' + err.message);
      } else {
        alert('Vault exported successfully!');
      }
    });
  }
});

// Add Account
addBtn.addEventListener('click', () => {
  clearForm();
  accountForm.classList.remove('hidden');
  addBtn.classList.add('hidden');
  formLabel.focus();
  stopTimer();
});

// Edit/Delete Account (context menu)
mainList.addEventListener('click', (e) => {
  if (e.target.closest('.edit-btn')) {
    const idx = parseInt(e.target.closest('.edit-btn').dataset.edit);
    editIndex = idx;
    const acc = vault.accounts[editIndex];
    formLabel.value = acc.label;
    formIssuer.value = acc.issuer;
    formSecret.value = acc.secret;
    accountForm.classList.remove('hidden');
    addBtn.classList.add('hidden');
    formLabel.focus();
    stopTimer();
  } else if (e.target.closest('.delete-btn')) {
    const idx = parseInt(e.target.closest('.delete-btn').dataset.delete);
    if (confirm('Delete this account?')) {
      vault.deleteAccount(idx);
      vault.save(masterPassword);
      renderAccounts();
      clearForm();
      accountForm.classList.add('hidden');
      addBtn.classList.remove('hidden');
      startTimer();
    }
  }
});

// Save Account
formSave.addEventListener('click', async () => {
  formError.textContent = '';
  const label = formLabel.value.trim();
  const issuer = formIssuer.value.trim();
  const secret = formSecret.value.replace(/\s+/g, '').toUpperCase();
  if (!label || !secret) {
    formError.textContent = 'Label and secret are required.';
    return;
  }
  if (!/^[A-Z2-7]+=*$/i.test(secret)) {
    formError.textContent = 'Secret must be base32.';
    return;
  }
  // Duplicate check commented out for now
  // const isDuplicate = vault.accounts.some((acc, idx) => acc.secret.replace(/\s+/g, '').toUpperCase() === secret && (editIndex === null || idx !== editIndex));
  // if (isDuplicate) {
  //   formError.textContent = 'This secret already exists.';
  //   return;
  // }
  let acc;
  if (editIndex !== null) {
    // Preserve addedDate if editing
    acc = new TOTPAccount({ label, issuer, secret, addedDate: vault.accounts[editIndex].addedDate });
    vault.updateAccount(editIndex, acc);
  } else {
    acc = new TOTPAccount({ label, issuer, secret });
    vault.addAccount(acc);
  }
  await vault.save(masterPassword);
  renderAccounts();
  clearForm();
  accountForm.classList.add('hidden');
  addBtn.classList.remove('hidden');
  startTimer();
});

// Cancel Add/Edit
formCancel.addEventListener('click', () => {
  clearForm();
  accountForm.classList.add('hidden');
  addBtn.classList.remove('hidden');
  startTimer();
});

// =========================
// Initialization
// =========================
(async function init() {
  if (await checkVaultExists()) {
    show(unlockContainer);
  } else {
    show(setupContainer);
  }
})();

// Keyboard Shortcuts
accountForm.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    formSave.click();
  }
});

unlockPassword.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    unlockBtn.click();
  }
});

// Enter key triggers Set Password on setup screen
setupPassword.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    setupBtn.click();
  }
});
setupConfirm.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    setupBtn.click();
  }
});

// --- Auto-lock after inactivity ---
function resetAutoLockTimer() {
  if (autoLockTimer) clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(() => {
    if (mainContainer && !mainContainer.classList.contains('hidden')) {
      masterPassword = '';
      vault = null;
      unlockPassword.value = '';
      show(unlockContainer);
      stopTimer();
      alert('App locked due to inactivity. Please re-enter your password.');
    }
  }, AUTO_LOCK_SECONDS * 1000);
}
['mousemove','keydown','mousedown','touchstart'].forEach(evt => {
  window.addEventListener(evt, resetAutoLockTimer, true);
});
// Reset timer on unlock or setup
setupBtn.addEventListener('click', resetAutoLockTimer);
unlockBtn.addEventListener('click', resetAutoLockTimer); 