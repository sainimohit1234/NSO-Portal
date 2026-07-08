const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

content = content.replace(
    `<TableCell sx={{ position: 'sticky', left: 50, zIndex: 2, bgcolor: 'background.paper' }}>`,
    `<TableCell sx={{ position: 'sticky', left: 50, zIndex: 2, bgcolor: '#f8fafc' }}>`
);

content = content.replace(
    `<TableCell sx={{ position: 'sticky', left: 210, zIndex: 2, bgcolor: 'background.paper', borderRight: '1.5px solid', borderColor: 'divider' }}>`,
    `<TableCell sx={{ position: 'sticky', left: 210, zIndex: 2, bgcolor: '#f8fafc', borderRight: '1.5px solid', borderColor: 'divider' }}>`
);

content = content.replace(
    `<TableCell sx={{ position: 'sticky', left: 450, zIndex: 2, bgcolor: 'background.paper', borderRight: '1.5px solid', borderColor: 'divider' }}>`,
    `<TableCell sx={{ position: 'sticky', left: 450, zIndex: 2, bgcolor: '#f8fafc', borderRight: '1.5px solid', borderColor: 'divider' }}>`
);

fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
console.log("Updated background colors.");
