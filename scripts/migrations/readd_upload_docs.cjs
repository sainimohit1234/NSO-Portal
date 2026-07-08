const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

// 1. Add headers
const headerTarget = "<TableCell sx={{ fontWeight: 800, width: 150 }}>Café Model</TableCell>";
const headersToAdd = `
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>LEGAL DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>FINANCIAL DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>PROJECT DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 220, textAlign: 'center' }}>MISCELLANEOUS DOCUMENTS</TableCell>`;
if (content.includes(headerTarget) && !content.includes("LEGAL DOCUMENTS")) {
    content = content.replace(headerTarget, headerTarget + headersToAdd);
}

// 2. Add cells
const cellTarget = `                        </Select>
                      </TableCell>`;
const cellsToAdd = `
                      {/* LEGAL DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label={store.loiUrl && store.agreementUrl ? "Documents Uploaded" : "Awaiting Documents"} 
                          onClick={() => setUploadStore({ store, category: 'Legal Documents' })}
                          sx={{ 
                            bgcolor: store.loiUrl && store.agreementUrl ? 'success.light' : 'warning.light', 
                            color: store.loiUrl && store.agreementUrl ? 'success.dark' : 'warning.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: store.loiUrl && store.agreementUrl ? 'success.main' : 'warning.main', color: '#fff' }
                          }} 
                        />
                      </TableCell>
                      {/* FINANCIAL DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label={store.budgetUrl ? "Documents Uploaded" : "Awaiting Documents"} 
                          onClick={() => setUploadStore({ store, category: 'Financial Documents' })}
                          sx={{ 
                            bgcolor: store.budgetUrl ? 'success.light' : 'warning.light', 
                            color: store.budgetUrl ? 'success.dark' : 'warning.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: store.budgetUrl ? 'success.main' : 'warning.main', color: '#fff' }
                          }} 
                        />
                      </TableCell>
                      {/* PROJECT DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label="Awaiting Documents" 
                          onClick={() => setUploadStore({ store, category: 'Project Documents' })}
                          sx={{ 
                            bgcolor: 'warning.light', 
                            color: 'warning.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'warning.main', color: '#fff' }
                          }} 
                        />
                      </TableCell>
                      {/* MISCELLANEOUS DOCUMENTS */}
                      <TableCell align="center">
                        <Chip 
                          label="Optional" 
                          onClick={() => setUploadStore({ store, category: 'Miscellaneous Documents' })}
                          sx={{ 
                            bgcolor: 'info.light', 
                            color: 'info.dark', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'info.main', color: '#fff' }
                          }} 
                        />
                      </TableCell>`;
if (content.includes(cellTarget) && !content.includes("{/* LEGAL DOCUMENTS */}")) {
    content = content.replace(cellTarget, cellTarget + cellsToAdd);
}

// 3. Add Modal and state variable change
// We need to make sure setUploadStore is handling an object now {store, category}
// But wait, uploadStore is used directly as the store object in other places.
// We should use setUploadModalConfig({ store, category }) instead to not break existing uploadStore logic.

// Let's add setUploadModalConfig to ExpansionPipeline
const stateVarsTarget = "const [uploadStore, setUploadStore] = useState(null);";
if (content.includes(stateVarsTarget) && !content.includes("uploadModalConfig")) {
    content = content.replace(stateVarsTarget, "const [uploadStore, setUploadStore] = useState(null);\n  const [uploadModalConfig, setUploadModalConfig] = useState(null);");
}

// Replace setUploadStore calls in the chips we just added
content = content.replace(/setUploadStore\(\{ store, category: '(.*?)' \}\)/g, "setUploadModalConfig({ store, category: '$1' })");

// 4. Add the modal itself
const modalCode = `
      {uploadModalConfig && (
        <DocumentManagerModal 
          open={!!uploadModalConfig} 
          onClose={() => setUploadModalConfig(null)} 
          store={uploadModalConfig.store} 
          activeCategory={uploadModalConfig.category}
          onStoreUpdated={(updatedStore) => {
            setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
            setUploadModalConfig({ store: updatedStore, category: uploadModalConfig.category });
          }} 
        />
      )}
`;
const endOfFile = "      </Snackbar>\n    </Box>\n  );\n}";
if (content.includes(endOfFile)) {
    content = content.replace("      </Snackbar>\n", "      </Snackbar>\n" + modalCode);
}

// 5. Add the import
if (!content.includes("DocumentManagerModal")) {
    content = content.replace(
        "import axios from '../utils/api';",
        "import axios from '../utils/api';\nimport DocumentManagerModal from '../components/DocumentManagerModal';"
    );
}

fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
console.log("Re-added upload functionality successfully.");
