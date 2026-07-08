const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

const tableHeadReplacement = `            <TableHead>
              {/* 
                WARNING: The sequence and placement of the columns below are STRICTLY LOCKED. 
                Do NOT reorder, edit, or remove the first 13 columns (from S.No. up to MISCELLANEOUS DOCUMENTS).
                Any new column added in the future MUST be inserted AFTER "MISCELLANEOUS DOCUMENTS" and BEFORE "Status".
              */}
              <TableRow>
                <TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, fontWeight: 800, width: 50, bgcolor: '#f8fafc', color: '#1e293b' }}>S.No.</TableCell>`;
content = content.replace(
    "<TableHead>\n              <TableRow>\n                <TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, fontWeight: 800, width: 50, bgcolor: '#f8fafc', color: '#1e293b' }}>S.No.</TableCell>", 
    tableHeadReplacement
);

const tableBodyReplacement = `              ) : (
                filteredStores.map((store, index) => {
                  const hasLoi = !!store.loiUrl;
                  const isLocked = store.isLocked === true || store.isLocked === 'true';
                  const rowEditable = canModify && !isLocked;

                  return (
                    <TableRow key={store.id} hover sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                       {/* 
                         WARNING: The sequence of TableCells below is STRICTLY LOCKED and MUST match the TableHead above. 
                         Do NOT reorder, edit, or remove the first 13 columns (from S.No. up to MISCELLANEOUS DOCUMENTS).
                         Any new column must be inserted AFTER "MISCELLANEOUS DOCUMENTS".
                       */}
                       {/* Serial No. */}`;
content = content.replace(
    `              ) : (
                filteredStores.map((store, index) => {
                  const hasLoi = !!store.loiUrl;
                  const isLocked = store.isLocked === true || store.isLocked === 'true';
                  const rowEditable = canModify && !isLocked;

                  return (
                    <TableRow key={store.id} hover sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                       {/* Serial No. */}`,
    tableBodyReplacement
);

fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
console.log("Added lock comments.");
