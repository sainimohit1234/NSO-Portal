const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'UpcomingStores.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Select and MenuItem to imports if not there
if (!content.includes('Select, MenuItem')) {
  content = content.replace(/import \{.*Button, MenuItem, Tooltip.*\}/, `import { Box, Typography, Card, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, MenuItem, Select, Tooltip, IconButton, FormControl, InputLabel, InputAdornment }`);
}

// 2. Add hasUpcomingEditor check
if (!content.includes('const hasUpcomingEditor')) {
  content = content.replace(
    /const isUser = user\?\.role === 'USER';/,
    `const isUser = user?.role === 'USER';\n  const hasUpcomingEditor = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.permissions?.includes('EDITOR');`
  );
}

// 3. Add handleStatusChange
if (!content.includes('const handleStatusChange')) {
  content = content.replace(
    /const handleRefresh = \(\) => \{/,
    `const handleStatusChange = async (storeId, newStatus) => {\n    try {\n      await axios.put(\`/api/stores/\${storeId}\`, { \n        status: newStatus, \n        isLocked: false, \n        isLockedAutoApplied: false \n      });\n      fetchStores();\n    } catch (err) {\n      console.error('Failed to update status', err);\n    }\n  };\n\n  const handleRefresh = () => {`
  );
}

// 4. Update isStoreEditable
content = content.replace(
  /const isStoreEditable = true;/,
  `const isStoreEditable = store.status !== 'Ready for Construction';`
);

// 5. Update Status column rendering
const statusRenderSearch = `                          <Chip 
                            icon={`;

const newStatusRender = `                          {store.status === 'Ready for Construction' ? (
                            <Select
                              value="Ready for Construction"
                              size="small"
                              disabled={!hasUpcomingEditor}
                              onChange={(e) => {
                                if (e.target.value === 'Under Construction') {
                                  handleStatusChange(store.id, 'Under Construction');
                                }
                              }}
                              onClick={(e) => e.stopPropagation()} // Prevent row click
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                height: 30,
                                borderRadius: '6px',
                                minWidth: 190,
                                bgcolor: '#f1f5f9',
                                '& .MuiSelect-select': { py: 0.5 }
                              }}
                            >
                              <MenuItem value="Ready for Construction" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Ready for Construction</MenuItem>
                              <MenuItem value="Under Construction" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Under Construction</MenuItem>
                            </Select>
                          ) : (
                            <Chip 
                              icon={`;

if (content.includes(statusRenderSearch) && !content.includes("store.status === 'Ready for Construction' ? (")) {
  content = content.replace(statusRenderSearch, newStatusRender);
  
  // Close the ternary after the chip
  content = content.replace(
    /width: 190,\n                            justifyContent: 'center'\n                          \}\} \n                        \/>/,
    `width: 190,\n                            justifyContent: 'center'\n                          }} \n                        />\n                          )}`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated UpcomingStores.jsx');
