# Priven - Offline TOTP Authenticator

Priven is a minimal, offline TOTP (Time-based One-Time Password) authenticator desktop app built with Electron and Tailwind CSS. It securely stores your TOTP secrets in an encrypted local vault file (`vault.dat`).

## Features
- Offline-only: No internet required or used
- Strong encryption (AES-256-GCM, PBKDF2)
- Auto-lock after inactivity
- Import/export encrypted vault
- Automatic local backup of your vault file
- Minimal, modern UI

## Setup
1. Clone this repository
2. Run `npm install` to install dependencies
3. Start the app with `npm start`

## Usage
- On first launch, set a master password to create your vault
- Add TOTP accounts (label, issuer, secret)
- Export your vault for backup (see Backups section below)
- Import a vault to restore or migrate (from backup or another device)
- The app auto-locks after 45 seconds of inactivity

## Backups

Priven automatically creates a backup of your encrypted vault every time you save changes (add, edit, or delete an account). This backup is stored locally on your computer:

- **Windows:** The backup file is located at `%LOCALAPPDATA%/PrivenBackup/vault_backup.dat` (typically `C:/Users/<YourName>/AppData/Local/PrivenBackup/vault_backup.dat`).

**How automatic backup works:**
- Every time you save your vault (e.g., add, edit, or delete an account), Priven writes an up-to-date encrypted backup to the backup location above. This overwrites the previous backup.
- The backup is encrypted with your master password, just like the main vault file.

**Restoring from backup:**
- On the unlock or import screen, you can choose "Let app find backup" to automatically locate and restore from the backup file.
- Alternatively, you can manually select the backup file (`vault_backup.dat`) for import.
- You must know your master password to decrypt and restore the backup.

**Manual export:**
- You can also export your vault as an encrypted `.dat` file or as a readable `.json` file from the app menu for additional backup options.

**Note:** If you lose your master password, neither the main vault nor the backup can be recovered.

## Security Notes
- All secrets are encrypted with your master password
- The app never connects to the internet
- The vault file (`vault.dat`) is excluded from version control
- If you lose your master password, your vault cannot be recovered

## Development
- Styles are built with Tailwind CSS (`renderer/output.css`)
- To rebuild styles: `npm run build:css`

## License
MIT 