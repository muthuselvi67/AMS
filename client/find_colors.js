const fs = require('fs');
const content = fs.readFileSync('client/src/assets/logo.svg', 'utf8');
const matches = content.match(/fill=\"(#[a-fA-F0-9]+)\"/g);
const unique = [...new Set(matches)];
console.log(unique);
