# Priven - Offline TOTP Authenticator

Priven is a minimal, offline TOTP (Time-based One-Time Password) authenticator desktop app built with Electron and Tailwind CSS. It securely stores your TOTP secrets in an encrypted local vault file (`vault.dat`).

## Features
- Offline-only: No internet required or used
- Strong encryption (AES-256-GCM, PBKDF2)
- Auto-lock after inactivity
- Import/export encrypted vault
- Minimal, modern UI

## Setup
1. Clone this repository
2. Run `npm install` to install dependencies
3. Start the app with `npm start`

## Usage
- On first launch, set a master password to create your vault
- Add TOTP accounts (label, issuer, secret)
- Export your vault for backup
- Import a vault to restore or migrate
- The app auto-locks after 45 seconds of inactivity

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