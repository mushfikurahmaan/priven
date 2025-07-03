// models/Vault.js
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../services/encryptionService');
const os = require('os');

const VAULT_FILE = path.join(__dirname, '..', 'vault.dat');

// Helper to get backup path in user's local app data (Windows only)
function getBackupPath() {
  const home = os.homedir();
  const backupDir = path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'PrivenBackup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return path.join(backupDir, 'vault_backup.dat');
}

class Vault {
  constructor(accounts = []) {
    this.accounts = accounts; // Array of TOTPAccount objects
  }

  static async exists() {
    return fs.existsSync(VAULT_FILE);
  }

  static async load(password) {
    if (!fs.existsSync(VAULT_FILE)) throw new Error('Vault file not found');
    const raw = fs.readFileSync(VAULT_FILE, 'utf8');
    const encrypted = JSON.parse(raw);
    const data = await decrypt(encrypted, password);
    return new Vault(data.accounts || []);
  }

  static async importVault(importPath, password) {
    const raw = fs.readFileSync(importPath, 'utf8');
    const encrypted = JSON.parse(raw);
    // Try to decrypt to verify password
    await decrypt(encrypted, password);
    fs.copyFileSync(importPath, VAULT_FILE);
  }

  static async createNew(password) {
    const vault = new Vault([]);
    await vault.save(password);
    return vault;
  }

  async save(password) {
    const encrypted = await encrypt({ accounts: this.accounts }, password);
    fs.writeFileSync(VAULT_FILE, JSON.stringify(encrypted), 'utf8');
    // Automatic local backup (overwrite previous)
    const backupPath = getBackupPath();
    fs.writeFileSync(backupPath, JSON.stringify(encrypted), 'utf8');
  }

  addAccount(account) {
    this.accounts.push(account);
  }

  updateAccount(index, updatedAccount) {
    this.accounts[index] = updatedAccount;
  }

  deleteAccount(index) {
    this.accounts.splice(index, 1);
  }
}

module.exports = Vault; 