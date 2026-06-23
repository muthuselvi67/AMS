const fs = require('fs');

let content = fs.readFileSync('client/src/assets/logo.svg', 'utf8');

// The main text is currently black-ish, let's make it white.
content = content.replace(/fill=\"#(050505|060606|040404|030303|070707|0E0E0E)\"/g, 'fill="#FFFFFF"');

// The white LL icon shapes are paths at lines 4 and 5. They should stay white.
// Let's protect them by temporarily renaming them.
content = content.replace('fill="#F6F4F4"', 'fill="LL_COLOR_1"');
content = content.replace('fill="#F7F5F5"', 'fill="LL_COLOR_2"');

// The holes in the letters are filled with various near-white colors.
// Since the dark sidebar is #0A0A0A, let's fill these hole shapes with #0A0A0A.
content = content.replace(/fill=\"#(F3F3F3|F1F1F1|EDEDED|FAEFFE|D3D9E1|E3D8D6|DEDEE3|CCCFE2|C1BCE5|D8D8D8|C8BFC2|C4C5E3|B9B5B3|CAC9CA|7258B3|D2CFCF|EFD9E6|BCB7B4|ADA6AE|D0CDCB|AEA8AB)\"/g, 'fill="#0A0A0A"');

// Restore the LL colors
content = content.replace('fill="LL_COLOR_1"', 'fill="#FFFFFF"');
content = content.replace('fill="LL_COLOR_2"', 'fill="#FFFFFF"');

fs.writeFileSync('client/src/assets/logo-dark.svg', content);
console.log("Updated logo-dark.svg successfully.");
