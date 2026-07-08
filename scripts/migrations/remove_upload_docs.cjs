const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

// 1. Remove the headers
const headers = `                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>LEGAL DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>FINANCIAL DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'center' }}>PROJECT DOCUMENTS</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 220, textAlign: 'center' }}>MISCELLANEOUS DOCUMENTS</TableCell>`;
content = content.replace(headers, "");

// 2. Remove the cells
const cellsStart = "{/* LEGAL DOCUMENTS */}";
const cellsEndIndex = content.indexOf("{/* Status */}");
const cellsStartIndex = content.indexOf(cellsStart);

if (cellsStartIndex !== -1 && cellsEndIndex !== -1) {
    content = content.substring(0, cellsStartIndex) + content.substring(cellsEndIndex);
} else {
    console.log("Could not find cell boundary.");
}

// 3. Remove the modal
const modalStart = "{/* Upload Documents Dialog */}";
const modalEnd = "/>";
const modalStartIndex = content.indexOf(modalStart);
if (modalStartIndex !== -1) {
    const modalEndIndex = content.indexOf(modalEnd, modalStartIndex);
    if (modalEndIndex !== -1) {
        content = content.substring(0, modalStartIndex) + content.substring(modalEndIndex + modalEnd.length);
    }
}

// 4. Remove the import
content = content.replace("import DocumentManagerModal from '../components/DocumentManagerModal';", "");

fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
console.log("Removed upload functionality successfully.");
