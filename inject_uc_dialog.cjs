const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'EditStore.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add states
const stateInjection = `
  const [ucDialogOpen, setUcDialogOpen] = useState(false);
  const [ucDialogStore, setUcDialogStore] = useState(null);
  const [ucStartDate, setUcStartDate] = useState('');
  const [ucHandoverDate, setUcHandoverDate] = useState('');
  const [ucDryLaunchDate, setUcDryLaunchDate] = useState('');
  const [ucLaunchDate, setUcLaunchDate] = useState('');
  const [ucLaunchMonth, setUcLaunchMonth] = useState('');
  const [ucDialogError, setUcDialogError] = useState('');

  // Under Construction Handlers
  const handleUcHandoverChange = (e) => {
    const val = e.target.value;
    setUcHandoverDate(val);
    if (val) {
      const d = new Date(val);
      d.setDate(d.getDate() + 3);
      setUcDryLaunchDate(d.toISOString().split('T')[0]);
    } else {
      setUcDryLaunchDate('');
    }
  };

  const handleUcLaunchChange = (e) => {
    const val = e.target.value;
    setUcLaunchDate(val);
    if (val) {
      const d = new Date(val);
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      setUcLaunchMonth(month + ' ' + year);
    } else {
      setUcLaunchMonth('');
    }
  };

  const handleConfirmUc = () => {
    if (!ucHandoverDate || !ucLaunchDate) {
      setUcDialogError('Project Handover Date and Launch Date are mandatory.');
      return;
    }
    setUcDialogError('');
    setValue('projectStartDate', ucStartDate, { shouldDirty: true });
    setValue('projectHandoverDate', ucHandoverDate, { shouldDirty: true });
    setValue('tentativeDryLaunchDate', ucDryLaunchDate, { shouldDirty: true });
    setValue('launchDate', ucLaunchDate, { shouldDirty: true });
    if (ucLaunchMonth) {
      const [m, y] = ucLaunchMonth.split(' ');
      setValue('launchMonth', m, { shouldDirty: true });
      setValue('launchYear', y, { shouldDirty: true });
    }
    setValue('status', 'Under Construction', { shouldDirty: true });
    setPrevStatus('Under Construction');
    setUcDialogOpen(false);
  };

  const handleCancelUc = () => {
    setUcDialogOpen(false);
    setUcDialogError('');
    // reset status back to previous
    setValue('status', 'Ready for Construction', { shouldDirty: false });
  };
`;
if (!content.includes('const [ucDialogOpen, setUcDialogOpen] = useState(false);')) {
  content = content.replace('const [closureDialogOpen, setClosureDialogOpen] = useState(false);', stateInjection + '\n  const [closureDialogOpen, setClosureDialogOpen] = useState(false);');
}

// 2. Insert Dialog Component
const dialogInjection = `
      {/* Dialog: Under Construction Operation Details */}
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
`;
if (!content.includes('Under Construction Operation Details')) {
  content = content.replace('{/* Dialog 4: Closure Configuration */}', dialogInjection + '\n      {/* Dialog 4: Closure Configuration */}');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Injected Under Construction dialog logic');
