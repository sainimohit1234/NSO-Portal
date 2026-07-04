const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

// 1. Add import
if (!content.includes('import DocumentManagerModal')) {
  content = content.replace(
    /import \{[\s\S]*?\} from '@mui\/material';/,
    match => match + "\nimport DocumentManagerModal from '../components/DocumentManagerModal';"
  );
}

// 2. Modify columns in TableHead
const oldColsRegex = /<TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>LEGAL DOCUMENTS<\/TableCell>[\s\S]*?<TableCell sx={{ fontWeight: 800, width: 220, textAlign: 'center' }}>MISCELLANEOUS DOCUMENTS<\/TableCell>/;
content = content.replace(oldColsRegex, `<TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>Upload Documents</TableCell>`);

// 3. Modify columns in TableRow
const oldRowColsRegex = /\{\/\* LEGAL DOCUMENTS \*\/\}\n\s*<TableCell align="center">[\s\S]*?\{\/\* MISCELLANEOUS DOCUMENTS \*\/\}\n\s*<TableCell align="center">[\s\S]*?<\/TableCell>/;

const newRowCol = `                      {/* UPLOAD DOCUMENTS */}
                      <TableCell align="center">
                        <Button 
                          variant="contained" 
                          size="small"
                          startIcon={<CloudUploadIcon />}
                          onClick={() => setUploadStore(store)}
                          sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap', textTransform: 'none' }}
                        >
                          Upload Documents
                        </Button>
                      </TableCell>`;
content = content.replace(oldRowColsRegex, newRowCol);

// 4. Modify logic that depends on flat fields (loiUrl) in the Status Select
// Find: hasLoi = !!store.loiUrl;
// Change to check both flat field and the new documents array
content = content.replace(
  /const hasLoi = !!store\.loiUrl;/,
  `const hasLoi = !!store.loiUrl || (store.documents && store.documents.some(d => d.type === 'Letter of Intent (LOI)' && d.url));`
);

// 5. Replace the old inline Dialog with DocumentManagerModal
const oldDialogRegex = /\{\/\* Upload Documents Dialog \*\/\}\n\s*<Dialog[\s\S]*?<\/Dialog>/;
const newDialog = `      {/* Upload Documents Modal */}
      <DocumentManagerModal 
         open={!!uploadStore} 
         store={uploadStore}
         canModify={canModify}
         onClose={() => setUploadStore(null)}
         setSnackbar={setSnackbar}
         onSave={(payload) => {
            setStores(prev => prev.map(s => s.id === uploadStore.id ? { ...s, ...payload } : s));
         }}
      />`;
content = content.replace(oldDialogRegex, newDialog);

fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
console.log('Done replacement.');
