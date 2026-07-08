const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'Settings.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Insert into PERM_MODULES
if (!content.includes("{ key: 'all_upcoming_stores', label: 'All Upcoming Stores' }")) {
  content = content.replace(
    /\{\s*key:\s*'expansion_pipeline',\s*label:\s*'Expansion Pipeline'\s*\}/,
    `{ key: 'expansion_pipeline', label: 'Expansion Pipeline' },\n  { key: 'all_upcoming_stores', label: 'All Upcoming Stores' }`
  );
}

// Insert into MODULE_SUB_PERMS
if (!content.includes("all_upcoming_stores: [")) {
  content = content.replace(
    /expansion_pipeline:\s*\[[\s\S]*?\]/,
    `$&,\n  all_upcoming_stores: [\n    { key: 'VIEWER', label: 'Viewer' },\n    { key: 'EDITOR', label: 'Editor' }\n  ]`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modified Settings.jsx to include All Upcoming Stores in Modules Access');
