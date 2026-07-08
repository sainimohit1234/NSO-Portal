const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

if (!content.includes('<DocumentManagerModal')) {
    const modalJSX = `      {/* Upload Documents Modal */}
      {uploadModalConfig && (
        <DocumentManagerModal 
          open={!!uploadModalConfig} 
          store={uploadModalConfig.store}
          activeCategory={uploadModalConfig.category}
          canModify={canModify}
          onClose={() => setUploadModalConfig(null)}
          setSnackbar={setSnackbar}
          onSave={(payload) => {
              setStores(prev => prev.map(s => s.id === uploadModalConfig.store.id ? { ...s, ...payload } : s));
          }}
        />
      )}

      {/* Snackbar Alerts */}`;
    
    content = content.replace('{/* Snackbar Alerts */}', modalJSX);
    fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
    console.log('Added DocumentManagerModal rendering logic.');
} else {
    console.log('DocumentManagerModal already rendered.');
}
