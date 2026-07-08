const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'Layout.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the cyan hardcoded colors with primary color from theme
content = content.replace(/rgba\(111, 205, 220, 0\.14\)/g, 'rgba(10, 49, 77, 0.08)');
content = content.replace(/rgba\(63, 174, 191, 0\.18\)/g, 'rgba(10, 49, 77, 0.15)');
content = content.replace(/rgba\(111, 205, 220, 0\.17\)/g, 'rgba(10, 49, 77, 0.12)');
content = content.replace(/rgba\(111, 205, 220, 0\.12\)/g, 'rgba(10, 49, 77, 0.08)');
content = content.replace(/color: isActive \? 'text\.primary' : 'text\.secondary'/g, "color: isActive ? 'primary.main' : 'text.secondary'");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated Layout.jsx colors');
