const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'UpcomingStores.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Calculate counts inside the component
if (!content.includes('const pipelineCount =')) {
  content = content.replace(
    /  const uniqueCities = Array\.from/,
    `  const pipelineCount = stores.filter(s => s.status === 'In Pipeline' || s.status === 'IN_PIPELINE' || s.status === 'Pipeline').length;
  const rfcCount = stores.filter(s => s.status === 'Ready for Construction').length;
  const ucCount = stores.filter(s => s.status === 'Under Construction').length;

  const handleTileClick = (status) => {
    setFilters({ ...filters, workflowStatus: status });
  };

  const uniqueCities = Array.from`
  );
}

// 2. Add Tiles above filters
const tilesJSX = `      {/* Status Summary Tiles */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
        {[
          { label: 'In Pipeline', count: pipelineCount, status: 'In Pipeline' },
          { label: 'Ready for Construction', count: rfcCount, status: 'Ready for Construction' },
          { label: 'Under Construction', count: ucCount, status: 'Under Construction' }
        ].map(tile => (
          <Card 
            key={tile.label} 
            onClick={() => handleTileClick(tile.status)}
            sx={{ 
              flex: 1, 
              cursor: 'pointer', 
              border: '2px solid #0A314D', 
              bgcolor: filters.workflowStatus === tile.status ? 'rgba(10, 49, 77, 0.1)' : '#ffffff',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'rgba(10, 49, 77, 0.15)' }
            }}
          >
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h6" sx={{ color: '#000000', fontWeight: 'bold', fontStyle: 'italic', mb: 1 }}>
                {tile.label}
              </Typography>
              <Typography variant="h4" sx={{ color: '#000000', fontWeight: 'bold', fontStyle: 'italic' }}>
                {tile.count}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filters Card */}`;
content = content.replace(/      \{\/\* Filters Card \*\/\}/, tilesJSX);

// 3. Update Grid to single row (md: 2)
content = content.replace(/md: 2\.4/g, 'md: 2');
content = content.replace(/md: 2\.6/g, 'md: 2');
content = content.replace(/<Grid size=\{\{ xs: 12, md: 1 \}\}>/g, '<Grid size={{ xs: 12, sm: 6, md: 2 }}>');

// 4. Update Table headers and borders
const newTableHead = `<TableContainer component={Paper} elevation={0} sx={{ border: '2px solid #0A314D', borderRadius: '8px' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(10, 49, 77, 0.05)', '& th': { borderBottom: '2px solid #0A314D', color: '#000000', fontWeight: 'bold', fontStyle: 'italic' } }}>`;
content = content.replace(
  /<TableContainer component=\{Paper\} elevation=\{0\}>\n\s*<Table>\n\s*<TableHead>/,
  newTableHead
);

// Add missing status options in filter dropdown just in case
if (!content.includes('value="In Pipeline"')) {
  content = content.replace(
    /<MenuItem value="PENDING_APPROVAL">Sent to NSO Team for Approval<\/MenuItem>/,
    `<MenuItem value="In Pipeline">In Pipeline</MenuItem>
                <MenuItem value="Ready for Construction">Ready for Construction</MenuItem>
                <MenuItem value="Under Construction">Under Construction</MenuItem>
                <MenuItem value="PENDING_APPROVAL">Sent to NSO Team for Approval</MenuItem>`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated UpcomingStores.jsx');
