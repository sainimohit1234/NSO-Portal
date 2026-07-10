import { useState, useMemo } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Typography, Box, Select, MenuItem, TextField,
  IconButton, Paper, Chip, Checkbox, ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import Papa from 'papaparse';
import { getCurrentStatus } from '../utils/status';

export default function DashboardStoreDetailsModal({ open, onClose, title, dataset }) {
  // Filters state
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterStates, setFilterStates] = useState([]);
  const [filterModule, setFilterModule] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchName, setSearchName] = useState('');

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

      // Module filter
      if (filterModule !== 'All') {
        const mod = store.cafeModule || store.cafeModel;
        if (mod !== filterModule) {
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

      // Search Name
      if (searchName && store.cafeName) {
        if (!store.cafeName.toLowerCase().includes(searchName.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [dataset, filterBrand, filterStates, filterModule, filterStatus, searchName]);

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

  const handleDownloadExcel = () => {
    const csvData = filteredData.map(store => ({
      'Brand': store.brand || '',
      'Cafe Name': store.cafeName || '',
      'Cafe Code': store.cafeCode || '',
      'Cafe Module': store.cafeModule || store.cafeModel || '',
      'City': store.city || '',
      'State': store.state || '',
      'Store Status': getCurrentStatus(store) || store.status || '',
      'Swiggy BTC RID': store.blueTokaiSwiggyRID || '',
      'Swiggy SAB RID': store.suchaliSwiggyRID || '',
      'GT Swiggy RID': store.gotTeaSwiggyRID || '',
      'Zomato BTC RID': store.blueTokaiZomatoRID || '',
      'Zomato SAB RID': store.suchaliZomatoRID || '',
      'GT Zomato RID': store.gotTeaZomatoRID || ''
    }));

    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setFilterBrand('All');
    setFilterStates([]);
    setFilterModule('All');
    setFilterStatus('All');
    setSearchName('');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          minHeight: '80vh',
          maxHeight: '90vh'
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
          <Typography variant="body2" color="text.secondary">
            Showing {filteredData.length} {filteredData.length === 1 ? 'store' : 'stores'} out of {dataset?.length || 0} total in this category.
          </Typography>
        </Box>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />} 
            onClick={handleDownloadExcel}
            sx={{ mr: 2, borderRadius: 2, fontWeight: 700 }}
          >
            Download Excel
          </Button>
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
              sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
            >
              <MenuItem value="All">All Brands</MenuItem>
              {uniqueBrands.map(b => (
                <MenuItem key={b} value={b}>{b}</MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ minWidth: 150, maxWidth: 250 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>State</Typography>
            <Select
              size="small"
              multiple
              displayEmpty
              value={filterStates}
              onChange={(e) => setFilterStates(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              fullWidth
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

          <Box sx={{ minWidth: 150 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Module</Typography>
            <Select
              size="small"
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              fullWidth
              sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
            >
              <MenuItem value="All">All Modules</MenuItem>
              {uniqueModules.map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ minWidth: 180 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Store Status</Typography>
            <Select
              size="small"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              fullWidth
              sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              {uniqueStatuses.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ minWidth: 200, flexGrow: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Search Cafe Name</Typography>
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
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Brand</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Cafe Name</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Cafe Code</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>City</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>State</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Swiggy BTC RID</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Swiggy SAB RID</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>GT Swiggy RID</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Zomato BTC RID</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>Zomato SAB RID</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper' }}>GT Zomato RID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No stores match the selected filters.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((store) => {
                  const statusStr = getCurrentStatus(store) || store.status || 'Unknown';
                  const isLive = ['active', 'live'].includes(statusStr.toLowerCase());
                  
                  return (
                    <TableRow key={store.id} hover>
                      <TableCell>{store.brand || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{store.cafeName || '—'}</TableCell>
                      <TableCell>{store.cafeCode || '—'}</TableCell>
                      <TableCell>{store.city || '—'}</TableCell>
                      <TableCell>{store.state || '—'}</TableCell>
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
                      <TableCell>{store.blueTokaiSwiggyRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.suchaliSwiggyRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.gotTeaSwiggyRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.blueTokaiZomatoRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                      <TableCell>{store.suchaliZomatoRID || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
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
    </Dialog>
  );
}
