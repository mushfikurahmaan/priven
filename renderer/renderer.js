// renderer.js - Priven TOTP Authenticator
// Organized and cleaned for maintainability

// =========================
// Imports
// =========================
const Vault = require('../models/Vault');
const TOTPAccount = require('../models/TOTPAccount');
const { generateTOTP } = require('../services/totpService');
const path = require('path');
const os = require('os');
const { remote } = require('electron');

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
const menuBtn = document.getElementById('menu-btn');
const menuDropdown = document.getElementById('menu-dropdown');
const menuExportData = document.getElementById('menu-export-data');
const menuReset = document.getElementById('menu-reset');
const resetModal = document.getElementById('reset-modal');
const resetPassword = document.getElementById('reset-password');
const resetConfirm = document.getElementById('reset-confirm');
const resetStrength = document.getElementById('reset-strength');
const resetError = document.getElementById('reset-error');
const resetSave = document.getElementById('reset-save');
const resetCancel = document.getElementById('reset-cancel');
const resetOld = document.getElementById('reset-old');
const menuImport = document.getElementById('menu-import');
const exportModal = document.getElementById('export-modal');
const exportDat = document.getElementById('export-dat');
const exportJson = document.getElementById('export-json');
const exportCancel = document.getElementById('export-cancel');
const importFindBtn = document.getElementById('import-find-btn');
const importManualBtn = document.getElementById('import-manual-btn');
const welcomeContainer = document.getElementById('welcome-container');
const welcomeCreateBtn = document.getElementById('welcome-create-btn');
const welcomeImportLocalBtn = document.getElementById('welcome-import-local-btn');
const welcomeImportGoogleBtn = document.getElementById('welcome-import-google-btn');

// =========================
// State
// =========================
let vault = null;
let masterPassword = '';
let editIndex = null;
let timer = null;
let importFilePath = null;
let autoLockTimer = null;
const AUTO_LOCK_SECONDS = 120;
let lockoutInterval = null;

// =========================
// Custom Modal Logic
// =========================
const customModal = document.getElementById('custom-modal');
const customModalTitle = document.getElementById('custom-modal-title');
const customModalMessage = document.getElementById('custom-modal-message');
const customModalInput = document.getElementById('custom-modal-input');
const customModalOk = document.getElementById('custom-modal-ok');
const customModalCancel = document.getElementById('custom-modal-cancel');

function showCustomModal({ title = '', message = '', input = false, defaultValue = '', okText = 'OK', cancelText = 'Cancel', showCancel = false }) {
  return new Promise((resolve) => {
    customModalTitle.textContent = title;
    customModalMessage.textContent = message;
    customModalInput.value = defaultValue;
    customModalInput.classList.toggle('hidden', !input);
    customModalOk.textContent = okText;
    customModalCancel.textContent = cancelText;
    customModalCancel.classList.toggle('hidden', !showCancel);
    customModal.classList.remove('hidden');
    customModalInput.type = input ? 'text' : 'hidden';
    if (input) {
      setTimeout(() => customModalInput.focus(), 100);
    }
    function cleanup() {
      customModal.classList.add('hidden');
      customModalOk.onclick = null;
      customModalCancel.onclick = null;
      document.onkeydown = null;
    }
    customModalOk.onclick = () => {
      cleanup();
      resolve(input ? customModalInput.value : true);
    };
    customModalCancel.onclick = () => {
      cleanup();
      resolve(input ? null : false);
    };
    document.onkeydown = (e) => {
      if (e.key === 'Enter') {
        customModalOk.click();
      } else if (e.key === 'Escape' && showCancel) {
        customModalCancel.click();
      }
    };
  });
}

window.alert = function(message) {
  return showCustomModal({ title: 'Alert', message });
};
window.confirm = function(message) {
  return showCustomModal({ title: 'Confirm', message, showCancel: true });
};
window.prompt = function(message, defaultValue = '') {
  return showCustomModal({ title: 'Prompt', message, input: true, defaultValue, showCancel: true });
};

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
  welcomeContainer.classList.add('hidden');
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
  if (!issuer) return '../assets/default-auth.png';
  const name = issuer.toLowerCase();
  // Popular services
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
  // More popular and underrated services
  if (name.includes('notion')) return '../assets/notion.png';
  if (name.includes('tiktok')) return '../assets/tiktok.png';
  if (name.includes('protonmail')) return '../assets/protonmail.png';
  if (name.includes('bitwarden')) return '../assets/bitwarden.png';
  if (name.includes('1password')) return '../assets/1password.png';
  if (name.includes('lastpass')) return '../assets/lastpass.png';
  if (name.includes('mega')) return '../assets/mega.png';
  if (name.includes('coinbase')) return '../assets/coinbase.png';
  if (name.includes('binance')) return '../assets/binance.png';
  if (name.includes('okta')) return '../assets/okta.png';
  if (name.includes('authy')) return '../assets/authy.png';
  if (name.includes('duo')) return '../assets/duo.png';
  if (name.includes('mailchimp')) return '../assets/mailchimp.png';
  if (name.includes('heroku')) return '../assets/heroku.png';
  if (name.includes('digitalocean')) return '../assets/digitalocean.png';
  if (name.includes('gitlab')) return '../assets/gitlab.png';
  if (name.includes('atlassian') || name.includes('jira') || name.includes('confluence')) return '../assets/atlassian.png';
  if (name.includes('adobe')) return '../assets/adobe.png';
  if (name.includes('airbnb')) return '../assets/airbnb.png';
  if (name.includes('uber')) return '../assets/uber.png';
  if (name.includes('lyft')) return '../assets/lyft.png';
  if (name.includes('snapchat')) return '../assets/snapchat.png';
  if (name.includes('pinterest')) return '../assets/pinterest.png';
  if (name.includes('twitch')) return '../assets/twitch.png';
  if (name.includes('yandex')) return '../assets/yandex.png';
  if (name.includes('vk')) return '../assets/vk.png';
  if (name.includes('booking')) return '../assets/booking.png';
  if (name.includes('stripe')) return '../assets/stripe.png';
  if (name.includes('shopify')) return '../assets/shopify.png';
  if (name.includes('ebay')) return '../assets/ebay.png';
  if (name.includes('netflix')) return '../assets/netflix.png';
  if (name.includes('hulu')) return '../assets/hulu.png';
  if (name.includes('crunchyroll')) return '../assets/crunchyroll.png';
  if (name.includes('soundcloud')) return '../assets/soundcloud.png';
  if (name.includes('spotify')) return '../assets/spotify.png';
  if (name.includes('telegram')) return '../assets/telegram.png';
  if (name.includes('whatsapp')) return '../assets/whatsapp.png';
  if (name.includes('signal')) return '../assets/signal.png';
  if (name.includes('kick')) return '../assets/kick.png';
  if (name.includes('rumble')) return '../assets/rumble.png';
  if (name.includes('mastodon')) return '../assets/mastodon.png';
  if (name.includes('bluesky')) return '../assets/bluesky.png';
  if (name.includes('threads')) return '../assets/threads.png';
  if (name.includes('bilibili')) return '../assets/bilibili.png';
  if (name.includes('wechat')) return '../assets/wechat.png';
  if (name.includes('line')) return '../assets/line.png';
  if (name.includes('viber')) return '../assets/viber.png';
  if (name.includes('wechat')) return '../assets/wechat.png';
  if (name.includes('weibo')) return '../assets/weibo.png';
  if (name.includes('tencent')) return '../assets/tencent.png';
  // Add more services below as needed, just follow the pattern above
  return '../assets/default-auth.png';
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
    item.className = 'totp-card glass-card flex items-center justify-between rounded-xl px-4 py-3 mb-1 cursor-pointer select-none relative';
    item.style.userSelect = 'none';
    item.innerHTML = `
      <div class='flex items-center gap-3'>
        <img src="${icon}" alt="${acc.issuer || 'Issuer'}" class="w-8 h-8 rounded-full bg-white p-1" />
        <div class='flex flex-col'>
          <span class='text-white font-semibold leading-tight text-base'>${acc.label}</span>
          <span class='text-gray-200 text-xs'>${addedDate}</span>
        </div>
      </div>
      <div class='flex flex-col items-end'>
        <span class='font-mono text-2xl tracking-widest text-white select-all totp-code' data-code='${code}'>${code}</span>
        <span class='text-xs text-gray-300 countdown-timer'>${secondsLeft}s</span>
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
      menu.className = 'absolute z-[100] bg-[#23272e] border border-gray-700 rounded-lg shadow-lg text-white text-sm';
      // Position menu at mouse click, relative to viewport
      const rect = item.getBoundingClientRect();
      menu.style.top = `${rect.top + e.offsetY}px`;
      menu.style.left = `${rect.left + e.offsetX}px`;
      menu.innerHTML = `
        <div class='context-edit px-4 py-2 hover:bg-gray-800 cursor-pointer rounded-t-lg'>Edit</div>
        <div class='context-delete px-4 py-2 hover:bg-gray-800 cursor-pointer rounded-b-lg'>Delete</div>
      `;
      document.body.appendChild(menu);
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
      menu.querySelector('.context-delete').onclick = async (ev) => {
        ev.stopPropagation();
        menu.remove();
        if (await showDestructiveConfirm('Delete this account?')) {
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

// =========================
// Rate limiting for unlock attempts
let failedUnlockAttempts = 0;
let unlockLockoutUntil = 0;
const MAX_UNLOCK_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 seconds

// Password Unlock
unlockBtn.addEventListener('click', async () => {
  unlockError.textContent = '';
  const now = Date.now();
  if (unlockLockoutUntil > now) {
    if (!lockoutInterval) {
      lockoutInterval = setInterval(() => {
        const nowInner = Date.now();
        if (unlockLockoutUntil > nowInner) {
          const secondsLeft = Math.ceil((unlockLockoutUntil - nowInner) / 1000);
          unlockError.textContent = `Too many failed attempts. Try again in ${secondsLeft} seconds.`;
        } else {
          unlockError.textContent = '';
          clearInterval(lockoutInterval);
          lockoutInterval = null;
        }
      }, 1000);
    }
    const secondsLeft = Math.ceil((unlockLockoutUntil - now) / 1000);
    unlockError.textContent = `Too many failed attempts. Try again in ${secondsLeft} seconds.`;
    return;
  }
  try {
    masterPassword = unlockPassword.value;
    vault = await Vault.load(masterPassword);
    show(mainContainer);
    renderAccounts();
    startTimer();
    clearForm();
    failedUnlockAttempts = 0; // Reset on success
    if (lockoutInterval) {
      clearInterval(lockoutInterval);
      lockoutInterval = null;
    }
  } catch (e) {
    failedUnlockAttempts++;
    if (failedUnlockAttempts >= MAX_UNLOCK_ATTEMPTS) {
      unlockLockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      if (!lockoutInterval) {
        lockoutInterval = setInterval(() => {
          const nowInner = Date.now();
          if (unlockLockoutUntil > nowInner) {
            const secondsLeft = Math.ceil((unlockLockoutUntil - nowInner) / 1000);
            unlockError.textContent = `Too many failed attempts. Try again in ${secondsLeft} seconds.`;
          } else {
            unlockError.textContent = '';
            clearInterval(lockoutInterval);
            lockoutInterval = null;
          }
        }, 1000);
      }
      unlockError.textContent = `Too many failed attempts. Locked for ${LOCKOUT_DURATION_MS / 1000} seconds.`;
    } else {
      if (e.message && e.message.includes('not found')) {
        unlockError.textContent = 'Vault file not found. Please set up a new vault.';
      } else if (e.message && e.message.includes('Unexpected token')) {
        unlockError.textContent = 'Vault file is corrupted or not valid.';
      } else {
        unlockError.textContent = 'Incorrect password or vault corrupted.';
      }
    }
  }
});

// Helper to get backup path in user's local app data (Windows only)
function getBackupPath() {
  const home = os.homedir();
  const backupDir = path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'PrivenBackup');
  return path.join(backupDir, 'vault_backup.dat');
}

// Import Vault (open modal)
importBtn.addEventListener('click', async () => {
  if (!(await window.confirm("Importing a vault will replace any existing data (if any). Continue?"))) {
    return;
  }
  importPasswordInput.value = '';
  importError.textContent = '';
  importModal.classList.remove('hidden');
  importFile.value = '';
});

menuImport.addEventListener('click', async () => {
  importPasswordInput.value = '';
  importError.textContent = '';
  importModal.classList.remove('hidden');
  importFile.value = '';
});

// Let app find backup
importFindBtn.addEventListener('click', async () => {
  importError.textContent = '';
  const password = importPasswordInput.value;
  if (!password) {
    importError.textContent = 'Please enter the master password.';
    return;
  }
  const fs = require('fs');
  const backupPath = getBackupPath();
  if (!fs.existsSync(backupPath)) {
    importError.textContent = "No automatic backup found. Please select your backup file manually.";
    return;
  }
  try {
    const raw = fs.readFileSync(backupPath, 'utf8');
    let encrypted;
    try {
      encrypted = JSON.parse(raw);
    } catch (err) {
      importError.textContent = 'The backup file is not a valid vault file (invalid JSON).';
      return;
    }
    if (!encrypted || typeof encrypted !== 'object' || !encrypted.salt || !encrypted.iv || !encrypted.tag || !encrypted.data) {
      importError.textContent = 'The backup file is not a valid encrypted vault.';
      return;
    }
    let data;
    try {
      const { decrypt } = require('../services/encryptionService');
      data = await decrypt(encrypted, password);
    } catch (err) {
      importError.textContent = 'Failed to decrypt vault: ' + err.message;
      return;
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.accounts)) {
      importError.textContent = 'The vault file is missing required data or is corrupted.';
      return;
    }
    for (const acc of data.accounts) {
      if (!acc.label || !acc.secret) {
        importError.textContent = 'The vault contains invalid account data.';
        return;
      }
    }
    const Vault = require('../models/Vault');
    await Vault.importVault(backupPath, password);
    importModal.classList.add('hidden');
    await showSuccess('Vault imported successfully! Please unlock with the imported password.');
    window.location.reload();
  } catch (err) {
    importError.textContent = 'Failed to import vault: ' + err.message;
  }
});

// Manual file select
importManualBtn.addEventListener('click', () => {
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
  // Now, let user enter password and click 'Let app find backup' again, but with importFilePath set
  // Or, for better UX, trigger import immediately:
  importModal.classList.add('hidden');
  // Reuse the import logic
  try {
    const password = await window.prompt('Enter the master password for the selected vault file:');
    if (!password) return;
    const fs = require('fs');
    const raw = fs.readFileSync(importFilePath, 'utf8');
    let encrypted;
    try {
      encrypted = JSON.parse(raw);
    } catch (err) {
      alert('The selected file is not a valid vault file (invalid JSON).');
      return;
    }
    if (!encrypted || typeof encrypted !== 'object' || !encrypted.salt || !encrypted.iv || !encrypted.tag || !encrypted.data) {
      alert('The selected file is not a valid encrypted vault.');
      return;
    }
    let data;
    try {
      const { decrypt } = require('../services/encryptionService');
      data = await decrypt(encrypted, password);
    } catch (err) {
      alert('Failed to decrypt vault: ' + err.message);
      return;
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.accounts)) {
      alert('The vault file is missing required data or is corrupted.');
      return;
    }
    for (const acc of data.accounts) {
      if (!acc.label || !acc.secret) {
        alert('The vault contains invalid account data.');
        return;
      }
    }
    const Vault = require('../models/Vault');
    await Vault.importVault(importFilePath, password);
    await showSuccess('Vault imported successfully! Please unlock with the imported password.');
    window.location.reload();
  } catch (err) {
    alert('Failed to import vault: ' + err.message);
  }
});

importCancel.addEventListener('click', () => {
  importModal.classList.add('hidden');
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
  // Prevent duplicate secrets (except when editing the same account)
  const isDuplicate = vault.accounts.some((acc, idx) => acc.secret.replace(/\s+/g, '').toUpperCase() === secret && (editIndex === null || idx !== editIndex));
  if (isDuplicate) {
    formError.textContent = 'This secret already exists.';
    return;
  }
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
    show(welcomeContainer);
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

// Hamburger menu logic
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
  if (!menuDropdown.classList.contains('hidden')) {
    menuDropdown.classList.add('hidden');
  }
});
menuDropdown.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent closing when clicking inside
});

// Show export modal
menuExportData.addEventListener('click', () => {
  menuDropdown.classList.add('hidden');
  exportModal.classList.remove('hidden');
});
// Hide export modal
exportCancel.addEventListener('click', () => {
  exportModal.classList.add('hidden');
});
// Export as .dat
exportDat.addEventListener('click', async () => {
  exportModal.classList.add('hidden');
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
// Export as JSON
exportJson.addEventListener('click', async () => {
  exportModal.classList.add('hidden');
  try {
    const remote = window.require('@electron/remote');
    const { dialog } = remote;
    const fs = require('fs');
    if (!vault || !vault.accounts) {
      alert('No vault data to export.');
      return;
    }
    // Remove 'tags' property from each account for export
    const exportAccounts = vault.accounts.map(acc => ({
      label: acc.label,
      secret: acc.secret,
      issuer: acc.issuer,
      addedDate: acc.addedDate
    }));
    const jsonData = JSON.stringify(exportAccounts, null, 2);
    const result = await dialog.showSaveDialog({
      title: 'Export Accounts as JSON',
      defaultPath: 'accounts.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (!result.canceled && result.filePath) {
      fs.writeFile(result.filePath, jsonData, 'utf8', (err) => {
        if (err) {
          alert('Failed to export JSON: ' + err.message);
        } else {
          alert('Accounts exported as JSON successfully!');
        }
      });
    }
  } catch (err) {
    alert('Failed to export JSON: ' + err.message);
  }
});

// Show reset modal on menu-reset click
menuReset.addEventListener('click', () => {
  menuDropdown.classList.add('hidden');
  resetOld.value = '';
  resetPassword.value = '';
  resetConfirm.value = '';
  resetStrength.textContent = '';
  resetError.textContent = '';
  resetModal.classList.remove('hidden');
  resetOld.focus();
});

// Hide reset modal on cancel
resetCancel.addEventListener('click', () => {
  resetModal.classList.add('hidden');
});

// Password strength check
resetPassword.addEventListener('input', () => {
  const pw = resetPassword.value;
  resetStrength.textContent = passwordStrength(pw);
});

// Save new master password
resetSave.addEventListener('click', async () => {
  const oldPw = resetOld.value;
  const pw = resetPassword.value;
  const confirm = resetConfirm.value;
  resetError.textContent = '';
  if (!oldPw || !pw || !confirm) {
    resetError.textContent = 'Please fill in all fields.';
    return;
  }
  // Validate old password
  try {
    // Try to load the vault with the old password
    await Vault.load(oldPw);
  } catch (err) {
    resetError.textContent = 'Current password is incorrect.';
    return;
  }
  if (pw !== confirm) {
    resetError.textContent = 'Passwords do not match.';
    return;
  }
  if (passwordStrength(pw) !== 'OK') {
    resetError.textContent = 'Password is too weak.';
    return;
  }
  try {
    await vault.save(pw); // Re-encrypt vault with new password
    masterPassword = pw;
    resetModal.classList.add('hidden');
    alert('Master password has been reset!');
  } catch (err) {
    resetError.textContent = 'Failed to reset password: ' + err.message;
  }
});

// Welcome screen button logic
welcomeCreateBtn.addEventListener('click', () => {
  show(setupContainer);
});
welcomeImportLocalBtn.addEventListener('click', () => {
  importPasswordInput.value = '';
  importError.textContent = '';
  importModal.classList.remove('hidden');
  importFile.value = '';
});
welcomeImportGoogleBtn.addEventListener('click', () => {
  window.alert('Import from Google Drive is coming soon!');
});

// Helper for success popups
function showSuccess(message) {
  return showCustomModal({ title: 'Success', message, okText: 'OK' });
}

// Helper for destructive confirmation popups
function showDestructiveConfirm(message) {
  return showCustomModal({ title: 'Are you sure?', message, okText: 'Delete', cancelText: 'Cancel', showCancel: true });
}

// Custom window controls for frameless window
window.addEventListener('DOMContentLoaded', () => {
  const remote = window.require('@electron/remote');
  const win = remote.getCurrentWindow();
  const minBtn = document.getElementById('min-btn');
  const closeBtn = document.getElementById('close-btn');
  if (minBtn) minBtn.onclick = () => win.minimize();
  if (closeBtn) closeBtn.onclick = () => win.close();
}); 