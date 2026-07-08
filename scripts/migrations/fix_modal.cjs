const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

if (!content.includes("import DocumentManagerModal")) {
    content = content.replace(
        "import axios from '../utils/api';",
        "import axios from '../utils/api';\nimport DocumentManagerModal from '../components/DocumentManagerModal';"
    );
}

const startString = "{/* Upload Documents Dialog */}";
const endString = "</Dialog>";

const startIndex = content.indexOf(startString);
if (startIndex !== -1) {
    const dialogEndIndex = content.indexOf(endString, startIndex);
    if (dialogEndIndex !== -1) {
        const replaceString = `      {/* Upload Documents Dialog */}
      <DocumentManagerModal 
        open={!!uploadStore} 
        onClose={() => setUploadStore(null)} 
        store={uploadStore} 
        onStoreUpdated={(updatedStore) => {
          setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
          setUploadStore(updatedStore);
        }} 
      />`;
        content = content.substring(0, startIndex) + replaceString + content.substring(dialogEndIndex + endString.length);
        fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
        console.log("Success");
    } else {
        console.log("Could not find </Dialog>");
    }
} else {
    console.log("Could not find startString");
}
