const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'UpcomingStores.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add missing imports
if (!content.includes('Dialog, DialogTitle')) {
  content = content.replace(
    /Button, MenuItem, Tooltip, Select/,
    `Button, MenuItem, Tooltip, Select, Dialog, DialogTitle, DialogContent, DialogActions, Alert`
  );
}

// 2. Add state and handlers inside the component
if (!content.includes('const [ucDialogOpen, setUcDialogOpen]')) {
  const stateAndHandlers = `  const [ucDialogOpen, setUcDialogOpen] = useState(false);
  const [ucDialogStore, setUcDialogStore] = useState(null);
  const [ucStartDate, setUcStartDate] = useState('');
  const [ucHandoverDate, setUcHandoverDate] = useState('');
  const [ucDryLaunchDate, setUcDryLaunchDate] = useState('');
  const [ucLaunchDate, setUcLaunchDate] = useState('');
  const [ucLaunchMonth, setUcLaunchMonth] = useState('');
  const [ucDialogError, setUcDialogError] = useState('');

  const handleUcHandoverChange = (e) => {
    const val = e.target.value;
    setUcHandoverDate(val);
    if (val) {
      const d = new Date(val);
      d.setDate(d.getDate() + 3);
      setUcDryLaunchDate(d.toISOString().split('T')[0]);
    }
  };

  const handleUcLaunchChange = (e) => {
    const val = e.target.value;
    setUcLaunchDate(val);
    if (val) {
      const d = new Date(val);
      const monthStr = d.toLocaleString('en-US', { month: 'short' });
      const yearStr = d.getFullYear();
      setUcLaunchMonth(\`\${monthStr} \${yearStr}\`);
    } else {
      setUcLaunchMonth('');
    }
  };

  const handleConfirmUc = async () => {
    if (!ucHandoverDate || !ucLaunchDate) {
      setUcDialogError('Project Handover Date and Launch Date are mandatory.');
      return;
    }
    setUcDialogError('');
    
    try {
      const payload = {
        status: 'Under Construction',
        isLocked: false,
        isLockedAutoApplied: false,
        projectStartDate: ucStartDate,
        projectHandoverDate: ucHandoverDate,
        tentativeDryLaunchDate: ucDryLaunchDate,
        launchDate: ucLaunchDate
      };
      
      if (ucLaunchMonth) {
        payload.cafeLaunchMonth = ucLaunchMonth;
      }

      await axios.put(\`/api/stores/\${ucDialogStore.id}\`, payload);
      setUcDialogOpen(false);
      setUcDialogStore(null);
      fetchStores();
    } catch (err) {
      setUcDialogError('Failed to update store.');
    }
  };

  const handleCancelUc = () => {
    setUcDialogOpen(false);
    setUcDialogError('');
    setUcDialogStore(null);
  };
`;
  content = content.replace(
    /  const handleStatusChange = async \(storeId, newStatus\) => \{/,
    `${stateAndHandlers}\n  const handleStatusChange = async (storeId, newStatus) => {`
  );
}

// 3. Update onChange in dropdown
const oldOnChange = `onChange={(e) => {
                              if (e.target.value === 'Under Construction') {
                                handleStatusChange(store.id, 'Under Construction');
                              }
                            }}`;

const newOnChange = `onChange={(e) => {
                              if (e.target.value === 'Under Construction') {
                                setUcDialogStore(store);
                                setUcStartDate('');
                                setUcHandoverDate('');
                                setUcDryLaunchDate('');
                                setUcLaunchDate('');
                                setUcLaunchMonth('');
                                setUcDialogError('');
                                setUcDialogOpen(true);
                              }
                            }}`;

content = content.replace(oldOnChange, newOnChange);

// 4. Render the Dialog at the bottom of the component
const dialogRender = `      {/* Dialog: Under Construction Operation Details */}
      <Dialog
        open={ucDialogOpen}
        onClose={handleCancelUc}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: 'background.paper', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
          Operation Details
        </DialogTitle>
        <DialogContent sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ucDialogError && (
            <Alert severity="error" sx={{ borderRadius: '8px' }}>
              {ucDialogError}
            </Alert>
          )}
          <TextField
            fullWidth type="date" label="Project Start Date" InputLabelProps={{ shrink: true }}
            value={ucStartDate} onChange={(e) => setUcStartDate(e.target.value)}
          />
          <TextField
            fullWidth type="date" label="Project Handover Date *" InputLabelProps={{ shrink: true }}
            value={ucHandoverDate} onChange={handleUcHandoverChange} required
          />
          <TextField
            fullWidth type="date" label="Tentative Dry Launch Date" InputLabelProps={{ shrink: true }}
            value={ucDryLaunchDate} onChange={(e) => setUcDryLaunchDate(e.target.value)}
          />
          <TextField
            fullWidth type="date" label="Launch Date *" InputLabelProps={{ shrink: true }}
            value={ucLaunchDate} onChange={handleUcLaunchChange} required
          />
          <TextField
            fullWidth label="Cafe Launch Month & Year" InputProps={{ readOnly: true }}
            value={ucLaunchMonth}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleCancelUc} color="inherit" sx={{ fontWeight: 600, borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmUc} variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: '8px', px: 3, boxShadow: 2 }}>
            Save & Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}`;

if (!content.includes('Dialog: Under Construction Operation Details')) {
  content = content.replace(/    <\/Box>\n  \);\n\}/, dialogRender);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated UpcomingStores.jsx with UcDialog');
