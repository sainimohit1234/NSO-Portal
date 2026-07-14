import { useState, useMemo } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Typography, Box, Select, MenuItem, TextField,
  IconButton, Paper, Chip, Checkbox, ListItemText, Menu, FormGroup, FormControlLabel,
  Collapse
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import Papa from 'papaparse';
import { getCurrentStatus } from '../utils/status';

function CollapsibleGroupRow({ group, title }) {
  const [open, setOpen] = useState(false);
  
  const moduleEntries = Object.entries(group.moduleCounts);

  const moduleColors = [
    { bg: '#dbeafe', color: '#1d4ed8' },
    { bg: '#dcfce7', color: '#166534' },
    { bg: '#fef9c3', color: '#854d0e' },
    { bg: '#ede9fe', color: '#5b21b6' },
    { bg: '#fee2e2', color: '#991b1b' },
    { bg: '#e0f2fe', color: '#0369a1' },
    { bg: '#fce7f3', color: '#9d174d' },
  ];

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>
          {group.name}
        </TableCell>
        <TableCell sx={{ fontWeight: 700 }}>{group.cafes.length}</TableCell>
        <TableCell colSpan={2}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {moduleEntries.map(([mod, count], idx) => {
              const palette = moduleColors[idx % moduleColors.length];
              return (
                <Chip
                  key={mod}
                  label={`${mod}  ·  ${count}`}
                  size="small"
                  sx={{
                    bgcolor: palette.bg,
                    color: palette.color,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 24,
                    border: `1px solid ${palette.color}33`,
                  }}
                />
              );
            })}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, my: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small" aria-label="cafes">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Brand</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cafe Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cafe Code</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Swiggy RID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Zomato RID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.cafes.map((store) => {
                    const statusStr = getCurrentStatus(store) || store.status || 'Unknown';
                    const isLive = ['active', 'live'].includes(statusStr.toLowerCase());
                    return (
                      <TableRow key={store.id}>
                        <TableCell>{store.brand || '—'}</TableCell>
                        <TableCell>{store.cafeName || '—'}</TableCell>
                        <TableCell>{store.cafeCode || '—'}</TableCell>
                        <TableCell>{store.address || '—'}</TableCell>
                        <TableCell>{store.cafeModule || store.cafeModel || '—'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={statusStr} 
                            size="small" 
                            sx={{ 
                              fontWeight: 700, 
                              bgcolor: isLive ? '#dcfce7' : 'primary.light', 
                              color: isLive ? '#166534' : 'primary.dark' 
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          {store.blueTokaiSwiggyRID || store.suchaliSwiggyRID || store.gotTeaSwiggyRID || '—'}
                        </TableCell>
                        <TableCell>
                          {store.blueTokaiZomatoRID || store.suchaliZomatoRID || store.gotTeaZomatoRID || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function DashboardStoreDetailsModal({ open, onClose, title, dataset }) {
  // Filters state
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterStates, setFilterStates] = useState([]);
  const [filterCities, setFilterCities] = useState([]);
  const [filterModule, setFilterModule] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchName, setSearchName] = useState('');
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Export states
  const [anchorEl, setAnchorEl] = useState(null);
  const [customExportOpen, setCustomExportOpen] = useState(false);
  
  const ALL_COLUMNS = useMemo(() => [
    'Brand', 'Cafe Name', 'Cafe Code', 'Cafe Module', 'Address', 'City', 'State', 
    'Store Status', 'Swiggy BTC RID', 'Swiggy SAB RID', 'GT Swiggy RID', 
    'Zomato BTC RID', 'Zomato SAB RID', 'GT Zomato RID'
  ], []);
  const [selectedColumns, setSelectedColumns] = useState(ALL_COLUMNS);

  // Apply filters
  const filteredData = useMemo(() => {
    if (!dataset) return [];
    
    return dataset.filter(store => {
      // Brand filter
      if (filterBrand !== 'All' && store.brand !== filterBrand) {
        return false;
      }

      // States multi-select filter
      if (filterStates.length > 0) {
        if (!store.state || !filterStates.includes(store.state.trim())) {
          return false;
        }
      }

      // Cities multi-select filter
      if (filterCities.length > 0) {
        if (!store.city || !filterCities.includes(store.city.trim())) {
          return false;
        }
      }

      // Module multi-select filter
      if (filterModule.length > 0) {
        const mod = store.cafeModule || store.cafeModel;
        if (!mod || !filterModule.includes(mod)) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== 'All') {
        const status = getCurrentStatus(store) || store.status;
        if (status !== filterStatus) {
          return false;
        }
      }

      // Search Name or Code
      if (searchName) {
        const query = searchName.toLowerCase();
        const matchName = store.cafeName?.toLowerCase().includes(query);
        const matchCode = store.cafeCode?.toLowerCase().includes(query);
        if (!matchName && !matchCode) {
          return false;
        }
      }

      return true;
    });
  }, [dataset, filterBrand, filterStates, filterCities, filterModule, filterStatus, searchName]);

  // Derived filter options based on the specific dataset
  const uniqueBrands = useMemo(() => {
    if (!dataset) return [];
    const brands = new Set(dataset.map(s => s.brand).filter(Boolean));
    return Array.from(brands).sort();
  }, [dataset]);

  const uniqueStates = useMemo(() => {
    if (!dataset) return [];
    const states = new Set(dataset.map(s => s.state?.trim()).filter(Boolean));
    return Array.from(states).sort();
  }, [dataset]);

  const uniqueCities = useMemo(() => {
    if (!dataset) return [];
    const cities = new Set(dataset.map(s => s.city?.trim()).filter(Boolean));
    return Array.from(cities).sort();
  }, [dataset]);

  const uniqueModules = useMemo(() => {
    if (!dataset) return [];
    const modules = new Set(dataset.map(s => s.cafeModule || s.cafeModel).filter(Boolean));
    return Array.from(modules).sort();
  }, [dataset]);

  const uniqueStatuses = useMemo(() => {
    if (!dataset) return [];
    const statuses = new Set(dataset.map(s => getCurrentStatus(s) || s.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [dataset]);

  const handleDownloadExcel = (columnsToExport = ALL_COLUMNS) => {
    const csvData = filteredData.map(store => {
      const fullData = {
        'Brand': store.brand || '',
        'Cafe Name': store.cafeName || '',
        'Cafe Code': store.cafeCode || '',
        'Cafe Module': store.cafeModule || store.cafeModel || '',
        'Address': store.address || '',
        'City': store.city || '',
        'State': store.state || '',
        'Store Status': getCurrentStatus(store) || store.status || '',
        'Swiggy BTC RID': store.blueTokaiSwiggyRID || '',
        'Swiggy SAB RID': store.suchaliSwiggyRID || '',
        'GT Swiggy RID': store.gotTeaSwiggyRID || '',
        'Zomato BTC RID': store.blueTokaiZomatoRID || '',
        'Zomato SAB RID': store.suchaliZomatoRID || '',
        'GT Zomato RID': store.gotTeaZomatoRID || ''
      };

      const filteredRow = {};
      columnsToExport.forEach(col => {
        filteredRow[col] = fullData[col];
      });
      return filteredRow;
    });

    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_Export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAnchorEl(null);
    setCustomExportOpen(false);
  };

  const clearFilters = () => {
    setFilterBrand('All');
    setFilterStates([]);
    setFilterCities([]);
    setFilterModule([]);
    setFilterStatus('All');
    setSearchName('');
  };

  const isSummaryView = title === 'Cities Covered' || title === 'States Covered';

  const groupedData = useMemo(() => {
    if (!isSummaryView) return [];
    
    const groups = {};
    filteredData.forEach(store => {
      const key = title === 'Cities Covered' ? (store.city || 'Unknown') : (store.state || 'Unknown');
      if (!groups[key]) {
        groups[key] = {
          name: key,
          cafes: [],
          moduleCounts: {}
        };
      }
      groups[key].cafes.push(store);
      
      const mod = store.cafeModule || store.cafeModel || 'Unknown';
      groups[key].moduleCounts[mod] = (groups[key].moduleCounts[mod] || 0) + 1;
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData, isSummaryView, title]);

  const totalUniqueGroups = useMemo(() => {
    if (!dataset || !isSummaryView) return 0;
    const keys = new Set(dataset.map(s => {
      const val = title === 'Cities Covered' ? s.city : s.state;
      return val ? val.trim() : 'Unknown';
    }));
    return keys.size;
  }, [dataset, isSummaryView, title]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      style={{ zIndex: 9999 }}
      PaperProps={{
        sx: { 
          borderRadius: 3,
          minHeight: '88vh',
          maxHeight: '95vh',
          borderTop: '4px solid transparent',
          backgroundImage: 'linear-gradient(white, white), linear-gradient(90deg, #0ea5e9, #6366f1, #a855f7)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 800,
              background: title.toLowerCase().includes('state') ? 'linear-gradient(45deg, #0ea5e9 30%, #a855f7 90%)' : 'inherit',
              WebkitBackgroundClip: title.toLowerCase().includes('state') ? 'text' : 'border-box',
              WebkitTextFillColor: title.toLowerCase().includes('state') ? 'transparent' : 'inherit',
            }}
          >
            {title}
          </Typography>
          {isSummaryView ? (
            <Typography variant="body2" color="text.secondary">
              Showing {groupedData.length} {title === 'Cities Covered' ? (groupedData.length === 1 ? 'city' : 'cities') : (groupedData.length === 1 ? 'state' : 'states')} out of {totalUniqueGroups} total in this category.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Showing {filteredData.length} {filteredData.length === 1 ? 'store' : 'stores'} out of {dataset?.length || 0} total in this category.
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ 
              mr: 2, 
              borderRadius: 2, 
              fontWeight: 700,
              background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
              '&:hover': { background: 'linear-gradient(90deg, #0284c7, #4f46e5)' },
              boxShadow: '0 2px 8px rgba(14,165,233,0.4)',
            }}
          >
            Download Excel
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            style={{ zIndex: 10000 }}
          >
            <MenuItem onClick={() => handleDownloadExcel(ALL_COLUMNS)}>Entire Data</MenuItem>
            <MenuItem onClick={() => {
              setAnchorEl(null);
              setCustomExportOpen(true);
            }}>
              Custom Export
            </MenuItem>
          </Menu>
          <IconButton onClick={onClose} size="small" sx={{ bgcolor: 'action.hover' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Filters Section */}
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          
          <Box sx={{ minWidth: 150 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Brand</Typography>
            <Select
              size="small"
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              fullWidth
              MenuProps={{ style: { zIndex: 10000 } }}
              sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
            >
              <MenuItem value="All">All Brands</MenuItem>
              {uniqueBrands.map(b => (
                <MenuItem key={b} value={b}>{b}</MenuItem>
              ))}
            </Select>
          </Box>

          {title !== 'Cities Covered' && (
            <Box sx={{ minWidth: 150, maxWidth: 250 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>State</Typography>
              <Select
                size="small"
                multiple
                displayEmpty
                value={filterStates}
                onChange={(e) => setFilterStates(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                fullWidth
                MenuProps={{ style: { zIndex: 10000 } }}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return 'All States';
                  }
                  return selected.join(', ');
                }}
                sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
              >
                {uniqueStates.map(st => (
                  <MenuItem key={st} value={st}>
                    <Checkbox checked={filterStates.indexOf(st) > -1} />
                    <ListItemText primary={st} />
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          {title !== 'States Covered' && (
            <Box sx={{ minWidth: 150, maxWidth: 250 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>City</Typography>
              <Select
                size="small"
                multiple
                displayEmpty
                value={filterCities}
                onChange={(e) => setFilterCities(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                fullWidth
                MenuProps={{ style: { zIndex: 10000 } }}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return 'All Cities';
                  }
                  return selected.join(', ');
                }}
                sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
              >
                {uniqueCities.map(ct => (
                  <MenuItem key={ct} value={ct}>
                    <Checkbox checked={filterCities.indexOf(ct) > -1} />
                    <ListItemText primary={ct} />
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          <Box sx={{ minWidth: 150, maxWidth: 250 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Module</Typography>
            <Select
              size="small"
              multiple
              displayEmpty
              value={filterModule}
              onChange={(e) => setFilterModule(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              fullWidth
              MenuProps={{ style: { zIndex: 10000 } }}
              renderValue={(selected) => {
                if (selected.length === 0) return 'All Modules';
                return selected.join(', ');
              }}
              sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
            >
              {uniqueModules.map(m => (
                <MenuItem key={m} value={m}>
                  <Checkbox checked={filterModule.indexOf(m) > -1} />
                  <ListItemText primary={m} />
                </MenuItem>
              ))}
            </Select>
          </Box>

          {title !== 'Closed Store Count' && title !== 'Live Store Count' && (
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Store Status</Typography>
              <Select
                size="small"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                fullWidth
                MenuProps={{ style: { zIndex: 10000 } }}
                sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                {uniqueStatuses.map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </Box>
          )}

          <Box sx={{ minWidth: 200, flexGrow: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Search Bar</Typography>
            <TextField
              size="small"
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              fullWidth
              sx={{ bgcolor: 'background.paper', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
            <Button size="small" onClick={clearFilters} sx={{ fontWeight: 700, minWidth: 100 }}>
              Clear Filters
            </Button>
          </Box>
        </Box>

        {/* Table Section */}
        <TableContainer component={Paper} elevation={0} sx={{ flexGrow: 1, borderRadius: 0 }}>
          <Table stickyHeader size="small">
            <TableHead>
              {isSummaryView ? (
                <TableRow>
                  <TableCell />
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>{title === 'Cities Covered' ? 'City Name' : 'State Name'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Total Cafe Count</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Module Count</TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Brand</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Cafe Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff', whiteSpace: 'nowrap' }}>Cafe Code</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Swiggy BTC RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Swiggy SAB RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Zomato BTC RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>Zomato SAB RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>GT Swiggy RID</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}>GT Zomato RID</TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSummaryView ? 5 : 14} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No stores match the selected filters.</Typography>
                  </TableCell>
                </TableRow>
              ) : isSummaryView ? (
                groupedData.map(group => (
                  <CollapsibleGroupRow key={group.name} group={group} title={title} />
                ))
              ) : (
                filteredData.map((store) => {
                  const statusStr = getCurrentStatus(store) || store.status || 'Unknown';
                  const isLive = ['active', 'live'].includes(statusStr.toLowerCase());
                  const isSelected = selectedRowId === store.id;
                  
                  return (
                    <TableRow 
                      key={store.id} 
                      hover
                      onClick={() => setSelectedRowId(isSelected ? null : store.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'inherit',
                        outline: isSelected ? '2px solid rgba(14, 165, 233, 0.4)' : 'none',
                        outlineOffset: '-2px',
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(14, 165, 233, 0.18)' : undefined,
                        }
                      }}
                    >
                      <TableCell>{store.brand || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{store.cafeName || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{store.cafeCode || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 220, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.address || '—'}</TableCell>
                      <TableCell>{store.city || '—'}</TableCell>
                      <TableCell>{store.state || '—'}</TableCell>
                      <TableCell>{store.cafeModule || store.cafeModel || '—'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={statusStr} 
                          size="small" 
                          sx={{ 
                            fontWeight: 700,
                            minWidth: 120,
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            height: 24,
                            bgcolor: isLive
                              ? '#dcfce7'
                              : statusStr.toLowerCase() === 'closed'
                              ? '#fee2e2'
                              : statusStr.toLowerCase().includes('upcoming')
                              ? '#1e3a5f'
                              : 'primary.light', 
                            color: isLive
                              ? '#166534'
                              : statusStr.toLowerCase() === 'closed'
                              ? '#991b1b'
                              : statusStr.toLowerCase().includes('upcoming')
                              ? '#ffffff'
                              : 'primary.dark'
                          }} 
                        />
                      </TableCell>
                      <TableCell>{store.blueTokaiSwiggyRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.suchaliSwiggyRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.blueTokaiZomatoRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.suchaliZomatoRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.gotTeaSwiggyRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.gotTeaZomatoRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, fontWeight: 700, px: 4 }}>
          Close
        </Button>
      </DialogActions>

      {/* Custom Export Modal */}
      <Dialog 
        open={customExportOpen} 
        onClose={() => setCustomExportOpen(false)}
        maxWidth="xs"
        fullWidth
        style={{ zIndex: 10001 }}
        sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          Select Columns to Export
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <FormGroup>
            {ALL_COLUMNS.map(col => (
              <FormControlLabel 
                key={col} 
                control={
                  <Checkbox 
                    checked={selectedColumns.includes(col)} 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns(prev => [...prev, col]);
                      } else {
                        setSelectedColumns(prev => prev.filter(c => c !== col));
                      }
                    }} 
                  />
                } 
                label={col} 
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
          <Button onClick={() => setCustomExportOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDownloadExcel(selectedColumns)} 
            variant="contained" 
            disabled={selectedColumns.length === 0}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
