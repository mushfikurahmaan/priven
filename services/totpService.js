// services/totpService.js
const crypto = require('crypto');

// Helper: Base32 decode (RFC 4648, no padding)
function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let value = 0;
  let bitsCount = 0;
  let output = [];
  str = str.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  for (let i = 0; i < str.length; i++) {
    value = (value << 5) | alphabet.indexOf(str[i]);
    bitsCount += 5;
    if (bitsCount >= 8) {
      output.push((value >>> (bitsCount - 8)) & 0xff);
      bitsCount -= 8;
    }
  }
  return Buffer.from(output);
}

// Generate TOTP code (RFC 6238)
function generateTOTP(secret, time = Date.now()) {
  const key = base32Decode(secret);
  const timestep = 30;
  const T = Math.floor(time / 1000 / timestep);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0); // high 4 bytes (always 0 for JS numbers)
  buffer.writeUInt32BE(T, 4); // low 4 bytes
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1e6).toString().padStart(6, '0');
  return code;
}

module.exports = {
  generateTOTP,
  base32Decode,
}; 