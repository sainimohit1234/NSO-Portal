const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/DocumentManagerModal.jsx', 'utf8');
const match = content.match(/const DOCUMENT_CONFIG = (\[[\s\S]*?\]);\n\nexport default/);
if (match) {
    const configCode = match[1];
    let DOCUMENT_CONFIG;
    eval(`DOCUMENT_CONFIG = ${configCode}`);
    
    let req = [];
    DOCUMENT_CONFIG.forEach(cat => {
      if (cat.subcategories) {
        cat.subcategories.forEach(sub => {
          req = [...req, ...sub.docs.map(d => ({ ...d, category: cat.name }))];
        });
      } else if (cat.docs) {
        req = [...req, ...cat.docs.map(d => ({ ...d, category: cat.name }))];
      }
    });
    
    const reqTypes = req;
    const legalReqTypes = reqTypes.filter(rt => rt.category === 'Legal Documents');
    console.log("Total docs in DOCUMENT_CONFIG: ", reqTypes.length);
    console.log("Total docs in Legal Documents: ", legalReqTypes.length);
} else {
    console.log("Could not find config array.");
}
