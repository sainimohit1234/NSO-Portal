const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'ExpansionPipeline.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Under Development with Under Construction
content = content.replace(/Under Development/g, 'Under Construction');
content = content.replace(/UNDER_DEVELOPMENT/g, 'UNDER_CONSTRUCTION');
content = content.replace(/UNDER DEVELOPMENT/g, 'UNDER CONSTRUCTION');

// Remove manual selection of Ready for Construction
content = content.replace(
  /\{\(\(hasLoi && \(currentStatus === 'In Pipeline' \|\| currentStatus === 'Agreement Signed'\)\) \|\|\s*currentStatus === 'Ready for Construction'\) && \(\s*<MenuItem value="Ready for Construction">Ready for Construction<\/MenuItem>\s*\)\}/g,
  `{currentStatus === 'Ready for Construction' && (
                                 <MenuItem value="Ready for Construction">Ready for Construction</MenuItem>
                               )}`
);

// We should also remove the old confirmation dialog logic call for Ready for Construction.
content = content.replace(
`  const handleDropdownStatusChange = (store, newStatus) => {
    if (newStatus === 'Ready for Construction') {
      handleStatusChangeToReady(store);
      return;
    }`,
`  const handleDropdownStatusChange = (store, newStatus) => {`
);

// Auto-update logic in handleSaveRow
const handleSaveRowStr = `  const handleSaveRow = async (store) => {`;
if (content.includes(handleSaveRowStr)) {
  const newLogic = `  const handleSaveRow = async (store) => {
    if (!canModify) return;
    if (!store.cafeName.trim()) {
      setSnackbar({ open: true, message: 'Café Name is required.', severity: 'warning' });
      return;
    }

    // Auto Status Logic
    let autoStatus = store.status;
    const hasCode = !!(store.cafeCode && store.cafeCode.trim());
    const hasLoi = store.documents?.some(d => d.type === 'Letter of Intent (LOI)' && d.url) || !!store.loiUrl;

    if (['In Pipeline', 'Agreement Signed'].includes(autoStatus)) {
      if (hasCode && hasLoi) {
        autoStatus = 'Ready for Construction';
      } else if (!hasCode && hasLoi) {
        autoStatus = 'Agreement Signed';
      } else {
        autoStatus = 'In Pipeline';
      }
    }
    const finalStore = { ...store, status: autoStatus };
`;
  content = content.replace(handleSaveRowStr, newLogic);
  
  content = content.replace(/try \{\s*setLoading\(true\);\s*const payload = \{ \.\.\.store \};/, 
  `try {
      setLoading(true);
      const payload = { ...finalStore };`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modified ExpansionPipeline.jsx successfully');
