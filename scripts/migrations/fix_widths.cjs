const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExpansionPipeline.jsx', 'utf8');

// TableHead
content = content.replace(
    `<TableCell sx={{ position: 'sticky', left: 50, zIndex: 4, fontWeight: 800, width: 200, bgcolor: '#f8fafc', color: '#1e293b' }}>Brand</TableCell>`,
    `<TableCell sx={{ position: 'sticky', left: 50, zIndex: 4, fontWeight: 800, width: 160, bgcolor: '#f8fafc', color: '#1e293b' }}>Brand</TableCell>`
);
content = content.replace(
    `<TableCell sx={{ position: 'sticky', left: 250, zIndex: 4, fontWeight: 800, width: 300, borderRight: '1.5px solid', borderColor: 'divider', bgcolor: '#f8fafc', color: '#1e293b' }}>Café Name</TableCell>`,
    `<TableCell sx={{ position: 'sticky', left: 210, zIndex: 4, fontWeight: 800, width: 240, borderRight: '1.5px solid', borderColor: 'divider', bgcolor: '#f8fafc', color: '#1e293b' }}>Café Name</TableCell>`
);
content = content.replace(
    `<TableCell sx={{ position: 'sticky', left: 550, zIndex: 4, fontWeight: 800, width: 150, borderRight: '1.5px solid', borderColor: 'divider', bgcolor: '#f8fafc', color: '#1e293b' }}>Café Code</TableCell>`,
    `<TableCell sx={{ position: 'sticky', left: 450, zIndex: 4, fontWeight: 800, width: 110, borderRight: '1.5px solid', borderColor: 'divider', bgcolor: '#f8fafc', color: '#1e293b' }}>Café Code</TableCell>`
);

// TableBody
content = content.replace(
    `<TableCell sx={{ position: 'sticky', left: 250, zIndex: 2, bgcolor: 'background.paper', borderRight: '1.5px solid', borderColor: 'divider' }}>`,
    `<TableCell sx={{ position: 'sticky', left: 210, zIndex: 2, bgcolor: 'background.paper', borderRight: '1.5px solid', borderColor: 'divider' }}>`
);

content = content.replace(
    `                      {/* Café Code */}\n                      <TableCell>`,
    `                      {/* Café Code */}\n                      <TableCell sx={{ position: 'sticky', left: 450, zIndex: 2, bgcolor: 'background.paper', borderRight: '1.5px solid', borderColor: 'divider' }}>`
);

fs.writeFileSync('frontend/src/pages/ExpansionPipeline.jsx', content);
console.log("Updated widths successfully.");
