const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'ExpansionPipeline.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Under Development with Under Construction
content = content.replace(/Under Development/g, 'Under Construction');
content = content.replace(/UNDER_DEVELOPMENT/g, 'UNDER_CONSTRUCTION');
content = content.replace(/UNDER DEVELOPMENT/g, 'UNDER CONSTRUCTION');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced successfully');
