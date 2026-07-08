const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/DocumentManagerModal.jsx', 'utf8');

content = content.replace(
    "export default function DocumentManagerModal({ open, store, onClose, onSave, setSnackbar, canModify }) {",
    "export default function DocumentManagerModal({ open, store, onClose, onSave, setSnackbar, canModify, activeCategory }) {"
);

// We need to filter DOCUMENT_CONFIG where it maps through the categories for the left panel.
content = content.replace(
    "{DOCUMENT_CONFIG.map(cat => (",
    "{DOCUMENT_CONFIG.filter(cat => activeCategory ? cat.name === activeCategory : true).map(cat => ("
);

// In getRequiredTypes, we also need to respect activeCategory for computing summary? 
// No, getRequiredTypes calculates global progress. Global progress might still apply, or we should calculate overall document status globally regardless of activeCategory, which is what they want.

fs.writeFileSync('frontend/src/components/DocumentManagerModal.jsx', content);
console.log("Updated DocumentManagerModal.jsx");
