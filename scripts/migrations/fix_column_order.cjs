const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

const docStart = content.indexOf('{/* LEGAL DOCUMENTS */}');
const miscEndStr = '{/* MISCELLANEOUS DOCUMENTS */}\\n                      <TableCell align="center">\\n                        <Chip \\n                          label="Optional" \\n                          onClick={() => setUploadModalConfig({ store, category: \'Miscellaneous Documents\' })}\\n                          sx={{ \\n                            bgcolor: \'info.light\', \\n                            color: \'info.dark\', \\n                            fontWeight: 700,\\n                            cursor: \'pointer\',\\n                            \'&:hover\': { bgcolor: \'info.main\', color: \'#fff\' }\\n                          }} \\n                        />\\n                      </TableCell>';
// Let's use a simpler way to find the end of the document columns block.
const cafeNameStart = content.indexOf('{/* Café Name */}');
const documentsBlock = content.substring(docStart, cafeNameStart);

// Remove documents block from its current location
content = content.replace(documentsBlock, '');

// Find where to insert it. It needs to go after Café Model.
const cafeModelStr = '{/* Café Model */}';
const cafeModelStart = content.indexOf(cafeModelStr);
const statusStr = '{/* Status */}';
const statusStart = content.indexOf(statusStr, cafeModelStart);

// Insert documentsBlock before Status
content = content.substring(0, statusStart) + documentsBlock + content.substring(statusStart);

fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
console.log("Fixed column order successfully.");
