// models/TOTPAccount.js
// TOTPAccount class definition will be implemented here. 

class TOTPAccount {
  constructor({ label, secret, issuer, tags, addedDate }) {
    this.label = label;
    this.secret = secret; // base32 encoded
    this.issuer = issuer;
    this.tags = tags;
    this.addedDate = addedDate || new Date().toISOString();
  }
}

module.exports = TOTPAccount; 