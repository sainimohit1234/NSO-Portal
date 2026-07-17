/**
 * CafeJourneyModal.jsx
 * ─────────────────────────────────────────────────────────────────
 * DEV ONLY · Localhost Preview
 * A modal with two views:
 *  1. Store Lifecycle Overview — detailed module/status reference
 *  2. Store Lifecycle Flow — interactive visual flow diagram
 * ─────────────────────────────────────────────────────────────────
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Chip, Tabs, Tab,
  Card, CardContent, Grid, Avatar, Divider, Paper, Stack, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import DescriptionIcon from '@mui/icons-material/Description';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ConstructionIcon from '@mui/icons-material/Construction';
import BuildIcon from '@mui/icons-material/Build';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ViewListIcon from '@mui/icons-material/ViewList';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import AutorenewIcon from '@mui/icons-material/Autorenew';

// ─── COMPLETE STAGE DEFINITIONS ────────────────────────────────────────────────
const STAGES = [
  {
    id: 'pipeline',
    step: 1,
    label: 'In Pipeline',
    module: 'Expansion Pipeline',
    internalStatus: 'In Pipeline',
    icon: <AddBusinessIcon />,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
    border: 'rgba(99,102,241,0.3)',
    who: 'Expansion / Admin Team',
    trigger: 'Manual — Admin adds a new cafe to the Expansion Pipeline',
    description: 'A new cafe location is identified and added to the Expansion Pipeline module. Basic details are entered: cafe name, brand, city, state, cafe model, and address. This is the earliest stage of a new store lifecycle.',
    conditions: 'Cafe Name must be filled. Cafe Code and LOI document not yet required.',
    emailTrigger: false,
    nextStage: 'Agreement Signed',
    nextCondition: 'LOI document is uploaded to the pipeline record.',
    actions: [
      'Admin clicks "Add New Project" in the Expansion Pipeline',
      'Fill cafe name, brand, city, state, cafe model, and address',
      'Save — store is created with status: In Pipeline',
      'Store appears in the Expansion Pipeline table',
    ],
    fields: ['Cafe Name', 'Brand', 'City', 'State', 'Cafe Model', 'Address'],
  },
  {
    id: 'agreement',
    step: 2,
    label: 'Agreement Signed',
    module: 'Expansion Pipeline',
    internalStatus: 'Agreement Signed',
    icon: <HandshakeIcon />,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.3)',
    who: 'Expansion / Legal Team',
    trigger: 'Automatic — when LOI document is uploaded but Cafe Code is not yet assigned',
    description: 'The Letter of Intent (LOI) or agreement document is uploaded to the pipeline entry, confirming the cafe location has been secured. The store has an agreement in place but construction has not yet been authorized.',
    conditions: 'LOI/Agreement document is uploaded. Cafe Code is NOT yet assigned.',
    emailTrigger: false,
    nextStage: 'Ready for Construction',
    nextCondition: 'Cafe Code is assigned AND LOI document is uploaded.',
    actions: [
      'Legal team finalizes the agreement with the landlord',
      'Upload LOI / Agreement document to the pipeline record',
      'Status auto-updates to "Agreement Signed"',
      'Cafe Code not yet assigned — construction not yet authorized',
    ],
    fields: ['LOI Document URL', 'Agreement Document URL'],
  },
  {
    id: 'ready_construction',
    step: 3,
    label: 'Ready for Construction',
    module: 'Expansion Pipeline',
    internalStatus: 'Ready for Construction',
    icon: <ConstructionIcon />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    who: 'Projects / Admin Team',
    trigger: 'Automatic — when Cafe Code is assigned AND LOI document is uploaded',
    description: 'The cafe has been officially assigned a Cafe Code and an agreement is in place. The project is now authorized to begin construction. This status can also be triggered manually via the status dropdown in the pipeline.',
    conditions: 'Cafe Code is assigned AND LOI document is uploaded.',
    emailTrigger: true,
    emailCategory: 'Status Changes',
    emailSubCategory: 'Ready for Construction',
    nextStage: 'Under Construction',
    nextCondition: 'Dropdown changed to "Under Construction" in the pipeline.',
    actions: [
      'Cafe Code is assigned (auto-triggers status upgrade)',
      'OR admin manually selects "Ready for Construction" from status dropdown',
      'Email notification is sent to relevant stakeholders',
      'Projects team initiates fit-out and construction work',
    ],
    fields: ['Cafe Code', 'LOI Document', 'Budget Document'],
  },
  {
    id: 'under_construction',
    step: 4,
    label: 'Under Construction',
    module: 'Expansion Pipeline',
    internalStatus: 'Under Construction',
    icon: <BuildIcon />,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.3)',
    who: 'Projects / Store Setup Team',
    trigger: 'Manual — Admin selects "Under Construction" from the status dropdown in the pipeline',
    description: 'The physical cafe space is actively being built and fitted out. All construction, interior design, equipment installation, and compliance work is happening during this stage.',
    conditions: 'Status manually updated to "Under Construction" via dropdown.',
    emailTrigger: false,
    nextStage: 'New Store Record Created',
    nextCondition: 'Construction is complete. Admin creates a new store entry in New Store Creation module.',
    actions: [
      'Projects team begins physical construction and fit-out',
      'Track progress via project documents in the Expansion Pipeline',
      'Upload financial, legal, and project documents as they are completed',
      'Once construction is complete, admin moves to create a new store record',
    ],
    fields: ['Project Documents', 'Financial Documents', 'Legal Documents', 'Misc Documents'],
  },
  {
    id: 'new_store',
    step: 5,
    label: 'New Store Record Created',
    module: 'New Store Creation',
    internalStatus: 'UPCOMING',
    icon: <StorefrontIcon />,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.3)',
    who: 'Admin / NSO Team',
    trigger: 'Manual — Admin clicks "Add New Store" in the New Store Creation module',
    description: 'A full store record is created in the NSO Portal (separate from the Expansion Pipeline). All operational details, contacts, aggregator info, GST, FSSAI, and other compliance details are filled in.',
    conditions: 'Construction is complete or nearing completion. All mandatory fields must be filled.',
    emailTrigger: false,
    nextStage: 'Sent for NSO Approval',
    nextCondition: 'All mandatory fields are complete and the store is submitted for approval.',
    actions: [
      'Admin goes to "New Store Creation" module',
      'Fills all required fields: cafe name, code, contacts, GST, FSSAI, model, etc.',
      'Sets project dates: start date, handover date, tentative dry launch date',
      'Submits the form — store created with status: UPCOMING',
      'mailStatus is auto-set to "Pending for S/Z"',
    ],
    fields: ['Cafe Name', 'Cafe Code', 'Brand', 'GST No.', 'FSSAI License', 'City Head', 'Area Manager', 'Cafe Manager', 'RIDs (Swiggy/Zomato)', 'Project Dates'],
  },
  {
    id: 'pending_approval',
    step: 6,
    label: 'Sent for NSO Approval',
    module: 'NSO Approval',
    internalStatus: 'PENDING_APPROVAL',
    icon: <HourglassEmptyIcon />,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    who: 'City Head / Area Manager / Admin',
    trigger: 'Manual — "Send for NSO Approval" is triggered from the Approvals page',
    description: 'The store record is fully filled and submitted to the NSO team for official review and approval. The store appears in the NSO Approval module. An automated email is sent to the NSO team.',
    conditions: 'All mandatory fields must be complete. System validates before allowing the status change.',
    emailTrigger: true,
    emailCategory: 'Status Changes',
    emailSubCategory: 'Sent to NSO Team for Approval',
    nextStage: 'NSO Approved',
    nextCondition: 'NSO team reviews and approves the store.',
    actions: [
      'Admin opens the store in the NSO Approval page',
      'Verifies all required fields are complete',
      'Triggers "Send for NSO Approval" action',
      'System validates mandatory fields — blocks if any are missing',
      'Status updated to PENDING_APPROVAL, email sent to NSO team',
    ],
    fields: ['Project Start Date', 'Project Handover Date', 'Tentative Dry Launch Date', 'All mandatory store fields'],
    hasBranch: true,
    branchLabel: 'On Hold',
    branchStatus: 'ON_HOLD',
    branchColor: '#f97316',
    branchDesc: 'NSO team can place the project On Hold with mandatory remarks. The store stays in the approval queue until the hold reason is resolved.',
  },
  {
    id: 'nso_approved',
    step: 7,
    label: 'NSO Approved',
    module: 'NSO Approval',
    internalStatus: 'NSO_APPROVED',
    icon: <ThumbUpIcon />,
    color: '#eab308',
    bg: 'rgba(234,179,8,0.1)',
    border: 'rgba(234,179,8,0.35)',
    who: 'NSO Team / Super Admin / Approver role',
    trigger: 'Manual — NSO team clicks "Approve" in the NSO Approval page',
    description: 'The NSO team has reviewed and officially approved the store. The store can now proceed towards launch. An email notification is sent to all relevant stakeholders.',
    conditions: 'Store must be in PENDING_APPROVAL status. All mandatory fields must be complete.',
    emailTrigger: true,
    emailCategory: 'Status Changes',
    emailSubCategory: 'Approved',
    nextStage: 'Ready to Go Live',
    nextCondition: 'Pre-launch checks are complete and the store is ready to open.',
    actions: [
      'NSO team reviews the store in the Approvals module',
      'Clicks "Approve" — status changes to NSO_APPROVED',
      'Email notification sent to relevant stakeholders',
      'Store now visible in all dashboards with "Approved" chip',
    ],
    fields: ['Approval timestamp', 'Approved by (user name)'],
  },
  {
    id: 'ready_live',
    step: 8,
    label: 'Ready to Go Live',
    module: 'NSO Approval',
    internalStatus: 'READY_TO_GO_LIVE',
    icon: <RocketLaunchIcon />,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.1)',
    border: 'rgba(6,182,212,0.3)',
    who: 'NSO Team / Admin / Approver',
    trigger: 'Manual — Status changed to "Ready to Go Live" in the Approvals page',
    description: 'All pre-launch preparations are complete. The store has passed all checks, fit-out is done, compliance is verified, and the store is officially declared ready to open. Automated email sent to all stakeholders.',
    conditions: 'Store must be in NSO_APPROVED status. All operational readiness checks must be complete.',
    emailTrigger: true,
    emailCategory: 'Status Changes',
    emailSubCategory: 'Ready to Go Live',
    nextStage: 'In-Store Live',
    nextCondition: 'Admin enables the "In-Store Live" toggle in Edit Store → Go Live section.',
    actions: [
      'Confirm store construction and fit-out is complete',
      'Verify all compliance documents are in order',
      'Change status to "Ready to Go Live" in the Approvals page',
      'Email is sent to all mapped recipients',
    ],
    fields: ['Final Inspection Confirmation', 'Launch Date (tentative)'],
  },
  {
    id: 'instore_live',
    step: 9,
    label: 'In-Store Live',
    module: 'Edit Store → Go Live',
    internalStatus: 'LIVE',
    icon: <StorefrontIcon />,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.3)',
    who: 'Super Admin / Admin (Go-Live permission)',
    trigger: 'Manual — "In-Store Live" toggle enabled in Edit Store',
    description: 'The store officially opens for dine-in and in-store orders. The admin enables the In-Store Live toggle and enters the actual launch date. The store status changes to LIVE. Within the first 30 days it shows as "Newly Launched"; after 30 days it becomes "Active".',
    conditions: 'Store must be in READY_TO_GO_LIVE status. In-Store Live Date is mandatory.',
    emailTrigger: false,
    nextStage: 'Delivery Live + Aggregator Integration',
    nextCondition: 'Aggregator RIDs are received and Delivery Live toggle is enabled.',
    actions: [
      'Go to Edit Store → Go Live section',
      'Enable the "In-Store Live" toggle',
      'Enter the In-Store Live Date',
      'Save — store status becomes LIVE',
      'Store shows as "Newly Launched" on dashboard (first 30 days)',
      'After 30 days: auto-becomes "Active"',
    ],
    fields: ['In-Store Live Date', 'Launch Date'],
  },
  {
    id: 'integration',
    step: 10,
    label: 'Aggregator Integration',
    module: 'Partner Integration Hub',
    internalStatus: 'INTEGRATION',
    icon: <EmailIcon />,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.1)',
    border: 'rgba(168,85,247,0.3)',
    who: 'NSO Team / Integration Team',
    trigger: 'Manual — Integration email drafted and sent to Swiggy/Zomato',
    description: 'The store is onboarded onto delivery platforms (Swiggy and Zomato). Integration emails are sent to the aggregators. Once RIDs (Restaurant IDs) are received from the aggregators, they are entered into the portal to complete integration.',
    conditions: 'Store must be LIVE (in-store). Integration can run in parallel.',
    emailTrigger: true,
    emailCategory: 'Abc / New Outlet Onboarding',
    emailSubCategory: 'Draft mail for BTC | Swiggy / Zomato',
    nextStage: 'Delivery Live',
    nextCondition: 'RIDs received from aggregators AND entered in the portal.',
    actions: [
      'Open Partner Integration Hub module',
      'Draft and send integration emails to Swiggy and/or Zomato',
      'mailStatus updates to "Sent" for each aggregator',
      'Receive RIDs from aggregators (usually 3–7 days)',
      'Enter RIDs in Edit Store → Integration section',
      'Integration status changes to "Integration Completed"',
      'Follow-up emails auto-trigger after 4 days if RIDs not received',
    ],
    fields: ['Swiggy RID', 'Zomato RID', 'Swiggy Mail Status', 'Zomato Mail Status'],
  },
  {
    id: 'delivery_live',
    step: 11,
    label: 'Delivery Live',
    module: 'Edit Store → Go Live',
    internalStatus: 'DELIVERY_LIVE',
    icon: <LocalShippingIcon />,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
    who: 'Super Admin / Admin (Go-Live permission)',
    trigger: 'Manual — "Delivery Live" toggle enabled in Edit Store',
    description: 'The store is now live on delivery platforms (Swiggy/Zomato). The Delivery Live toggle is enabled with the delivery start date. Customers can now place delivery orders from this cafe.',
    conditions: 'Aggregator RIDs must be entered. Store must be LIVE (in-store).',
    emailTrigger: false,
    nextStage: 'Fully Active',
    nextCondition: 'Automatic after 30 days from in-store launch date.',
    actions: [
      'Confirm aggregator RIDs are entered and active on platforms',
      'Go to Edit Store → Go Live section',
      'Enable the "Delivery Live" toggle',
      'Enter the Delivery Live Date',
      'Save — delivery orders are now available',
    ],
    fields: ['Delivery Live Date'],
  },
  {
    id: 'active',
    step: 12,
    label: 'Fully Active',
    module: 'All Stores',
    internalStatus: 'LIVE (Active)',
    icon: <CheckCircleIcon />,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.3)',
    who: 'Automatic (System)',
    trigger: 'Automatic — 30 days after In-Store Live Date',
    description: 'The store is fully operational with both in-store and delivery channels live. The system automatically transitions from "Newly Launched" to "Active" 30 days after the launch date. The store is now part of the live portfolio.',
    conditions: 'Automatic. No manual action required.',
    emailTrigger: false,
    nextStage: null,
    nextCondition: null,
    actions: [
      'No manual action required',
      'System auto-computes "Active" status after 30 days',
      'Store shows with a green "Active" chip in All Stores',
      'Dashboard metrics include this store in live count',
    ],
    fields: [],
    isTerminal: true,
  },
];

const ALTERNATE_PATHS = [
  {
    id: 'on_hold',
    label: 'On Hold',
    fromStage: 'NSO Approval (any stage)',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.3)',
    icon: <PauseCircleIcon />,
    description: 'Project is paused due to compliance, financial, or operational issues. Mandatory remarks are required. The store can be resumed once the issue is resolved.',
    trigger: 'Admin selects "On Hold" from status dropdown in NSO Approval page',
    resolution: 'Once the issue is resolved, the status is changed back to PENDING_APPROVAL or APPROVED.',
  },
  {
    id: 'closed',
    label: 'Closed',
    fromStage: 'Any LIVE state',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    icon: <CancelIcon />,
    description: 'The store is permanently shut down. Both In-Store Closed and Delivery Closed toggles are enabled with closure dates in the Edit Store → Go Live section.',
    trigger: 'Admin enables "In-Store Closed" and/or "Delivery Closed" toggles in Edit Store',
    resolution: 'Terminal state. Store is removed from active dashboard but remains in the Closed Stores list.',
  },
];

const STATUS_REFERENCE = [
  { label: 'In Pipeline', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', desc: 'Earliest stage. Cafe location identified, basic info entered in the Expansion Pipeline module.' },
  { label: 'Agreement Signed', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', desc: 'LOI/agreement document uploaded. Cafe Code not yet assigned. Agreement with landlord is confirmed.' },
  { label: 'Ready for Construction', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', desc: 'Auto-set when Cafe Code is assigned + LOI uploaded. Construction is now authorized.' },
  { label: 'Under Construction', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', desc: 'Physical fit-out and construction in progress. Manual status change in pipeline.' },
  { label: 'Upcoming Store', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', desc: 'New store record created in NSO Portal. Default status for all newly added stores.' },
  { label: 'Pending Approval', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', desc: 'Store submitted to NSO team for approval. Visible in NSO Approval module.' },
  { label: 'NSO Approved', color: '#a16207', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', desc: 'NSO team has approved the store. Proceeding towards launch.' },
  { label: 'Ready to Go Live', color: '#0891b2', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)', desc: 'All pre-launch checks complete. Store declared ready to open.' },
  { label: 'Newly Launched', color: '#a21caf', bg: 'rgba(217,70,239,0.12)', border: 'rgba(217,70,239,0.3)', desc: 'LIVE status within first 30 days of launch. In-Store Live toggle enabled.' },
  { label: 'Active', color: '#16a34a', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', desc: 'Fully operational LIVE store. More than 30 days since launch.' },
  { label: 'On Hold', color: '#ea580c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', desc: 'Project paused. Mandatory remarks required. Can be resumed.' },
  { label: 'Closed', color: '#dc2626', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', desc: 'Store permanently closed. Closure toggles enabled with dates.' },
];

// ─── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [expanded, setExpanded] = useState(null);
  return (
    <Box>
      {/* Module summary */}
      <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(10,49,77,0.06)', border: '1px solid rgba(10,49,77,0.1)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>Modules in the Store Lifecycle</Typography>
        <Grid container spacing={1}>
          {[
            { name: 'Expansion Pipeline', desc: 'Tracks pre-NSO stages: Pipeline → Agreement → Construction', color: '#6366f1' },
            { name: 'New Store Creation', desc: 'Creates full store record with all operational details', color: '#3b82f6' },
            { name: 'NSO Approval', desc: 'Review, approve, or hold stores before launch', color: '#f97316' },
            { name: 'Partner Integration Hub', desc: 'Onboard store onto delivery platforms', color: '#a855f7' },
            { name: 'Edit Store → Go Live', desc: 'Enable In-Store Live and Delivery Live toggles', color: '#22c55e' },
            { name: 'All Stores', desc: 'View and manage the full portfolio of live stores', color: '#06b6d4' },
            { name: 'Store Contact & Email Management', desc: 'Automated IT email provisioning and status tracking', color: '#eab308' },
          ].map(m => (
            <Grid item xs={12} sm={6} key={m.name}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, borderRadius: 1.5, bgcolor: 'background.paper', border: `1px solid ${m.color}22` }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: m.color, mt: '5px', flexShrink: 0 }} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: m.color, display: 'block' }}>{m.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{m.desc}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Stage cards */}
      <Stack spacing={1.5}>
        {STAGES.map(stage => {
          const isExpanded = expanded === stage.id;
          return (
            <Card
              key={stage.id}
              onClick={() => setExpanded(prev => prev === stage.id ? null : stage.id)}
              sx={{
                borderRadius: '12px',
                border: `1.5px solid ${isExpanded ? stage.border : 'rgba(0,0,0,0.08)'}`,
                bgcolor: isExpanded ? stage.bg : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                '&:hover': { border: `1.5px solid ${stage.border}`, bgcolor: stage.bg },
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: stage.bg, border: `1.5px solid ${stage.border}`, color: stage.color, flexShrink: 0 }}>
                    {stage.icon}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: stage.color, opacity: 0.6 }}>STEP {stage.step}</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{stage.label}</Typography>
                      <Chip label={stage.module} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: `${stage.color}15`, color: stage.color, border: `1px solid ${stage.border}` }} />
                      {stage.emailTrigger && (
                        <Chip icon={<EmailIcon sx={{ fontSize: '0.7rem !important' }} />} label="Email" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.25)' }} />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{stage.description}</Typography>
                  </Box>
                  <Typography sx={{ color: stage.color, opacity: 0.6, fontSize: '1.1rem' }}>{isExpanded ? '▲' : '▼'}</Typography>
                </Box>

                {isExpanded && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>👆 Actions</Typography>
                        <Stack spacing={0.3}>
                          {stage.actions.map((a, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                              <Typography sx={{ color: stage.color, fontWeight: 700, fontSize: '0.7rem', mt: '1px', minWidth: 14 }}>{i + 1}.</Typography>
                              <Typography variant="caption" sx={{ color: 'text.primary', lineHeight: 1.5 }}>{a}</Typography>
                            </Box>
                          ))}
                        </Stack>
                        {stage.fields.length > 0 && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>📋 Key Fields</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                              {stage.fields.map(f => <Chip key={f} label={f} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: stage.bg, color: stage.color, border: `1px solid ${stage.border}` }} />)}
                            </Box>
                          </Box>
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>👤 Who</Typography>
                          <Paper variant="outlined" sx={{ px: 1.25, py: 0.6, borderRadius: '8px', display: 'inline-block' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{stage.who}</Typography>
                          </Paper>
                        </Box>
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>⚡ Trigger</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>{stage.trigger}</Typography>
                        </Box>
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>✅ Status After</Typography>
                          <Chip label={stage.internalStatus} size="small" sx={{ bgcolor: stage.bg, color: stage.color, border: `1px solid ${stage.border}`, fontWeight: 800, fontSize: '0.72rem' }} />
                        </Box>
                        {stage.nextStage && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>➡️ Next Stage</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{stage.nextStage}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4, mt: 0.25 }}>{stage.nextCondition}</Typography>
                          </Box>
                        )}
                        {stage.emailTrigger && (
                          <Paper variant="outlined" sx={{ px: 1.25, py: 0.75, borderRadius: '8px', borderColor: 'rgba(139,92,246,0.3)', bgcolor: 'rgba(139,92,246,0.04)' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c3aed', display: 'block' }}>✉️ {stage.emailCategory}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sub-Category: {stage.emailSubCategory}</Typography>
                          </Paper>
                        )}
                        {stage.hasBranch && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#f97316', display: 'block' }}>⤵️ Alternate: On Hold</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{stage.branchDesc}</Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Alternate paths */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <CancelIcon sx={{ color: '#ef4444', fontSize: 18 }} /> Alternate Paths
        </Typography>
        <Grid container spacing={2}>
          {ALTERNATE_PATHS.map(p => (
            <Grid item xs={12} sm={6} key={p.id}>
              <Card sx={{ borderRadius: '12px', border: `1.5px solid ${p.border}`, bgcolor: p.bg }}>
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <Box sx={{ color: p.color }}>{p.icon}</Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: p.color }}>{p.label}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5, display: 'block', mb: 1 }}>{p.description}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', fontSize: '0.65rem', display: 'block' }}>FROM: {p.fromStage}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block' }}>{p.resolution}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Status reference */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>📊 Status Quick Reference</Typography>
        <Grid container spacing={1}>
          {STATUS_REFERENCE.map(s => (
            <Grid item xs={12} sm={6} md={4} key={s.label}>
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '10px', borderColor: s.border, bgcolor: s.bg }}>
                <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 800, fontSize: '0.68rem', mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.5, fontSize: '0.72rem' }}>{s.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

// ─── FLOW TAB ──────────────────────────────────────────────────────────────────
function FlowNode({ stage, isLast }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Node card */}
      <Box
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          width: '100%',
          maxWidth: 520,
          border: `2px solid ${hovered ? stage.color : stage.border}`,
          borderRadius: '14px',
          bgcolor: hovered ? stage.bg : 'background.paper',
          transition: 'all 0.2s ease',
          transform: hovered ? 'scale(1.01)' : 'scale(1)',
          boxShadow: hovered ? `0 8px 24px ${stage.bg}` : '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Top bar */}
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${stage.color}, ${stage.color}88)` }} />
        <Box sx={{ p: 1.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
            <Avatar sx={{ width: 38, height: 38, bgcolor: stage.bg, border: `2px solid ${stage.border}`, color: stage.color, flexShrink: 0 }}>
              {stage.icon}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: stage.color, opacity: 0.6, fontSize: '0.65rem' }}>STEP {stage.step}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{stage.label}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                <Chip label={stage.module} size="small" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, bgcolor: `${stage.color}15`, color: stage.color }} />
                <Chip label={stage.internalStatus} size="small" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 800, bgcolor: stage.bg, color: stage.color, border: `1px solid ${stage.border}` }} />
                {stage.emailTrigger && <Chip icon={<EmailIcon sx={{ fontSize: '0.65rem !important' }} />} label="Email" size="small" sx={{ height: 17, fontSize: '0.6rem', bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed' }} />}
                {stage.who?.includes('Automatic') && <Chip icon={<AutorenewIcon sx={{ fontSize: '0.65rem !important' }} />} label="Auto" size="small" sx={{ height: 17, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.1)', color: '#16a34a' }} />}
              </Box>
            </Box>
          </Box>

          {hovered && (
            <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${stage.border}` }}>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={7}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5, display: 'block' }}>{stage.description}</Typography>
                  {stage.nextStage && (
                    <Box sx={{ mt: 1, p: 0.75, borderRadius: '6px', bgcolor: `${stage.color}0a`, border: `1px solid ${stage.border}` }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: stage.color, fontSize: '0.65rem' }}>→ Next: {stage.nextStage}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem', lineHeight: 1.4 }}>{stage.nextCondition}</Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} sm={5}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: stage.color, display: 'block', fontSize: '0.65rem', mb: 0.3 }}>👤 {stage.who}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', display: 'block', fontSize: '0.65rem', mb: 0.2 }}>⚡ Trigger</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block', fontSize: '0.65rem' }}>{stage.trigger}</Typography>
                  {stage.conditions && (
                    <>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', display: 'block', fontSize: '0.65rem', mt: 0.5, mb: 0.2 }}>📋 Conditions</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block', fontSize: '0.65rem' }}>{stage.conditions}</Typography>
                    </>
                  )}
                </Grid>
              </Grid>

              {stage.hasBranch && (
                <Box sx={{ mt: 1, p: 0.75, borderRadius: '6px', bgcolor: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <PauseCircleIcon sx={{ color: '#f97316', fontSize: 16, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.65rem' }}>
                    <strong style={{ color: '#f97316' }}>Alternate Path:</strong> {stage.branchDesc}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Connector arrow */}
      {!isLast && !stage.isTerminal && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 0.5 }}>
          <Box sx={{ width: 2, height: 16, bgcolor: 'rgba(0,0,0,0.12)' }} />
          <ArrowDownwardIcon sx={{ color: 'rgba(0,0,0,0.2)', fontSize: 18 }} />
        </Box>
      )}
    </Box>
  );
}

function FlowTab() {
  return (
    <Box>
      <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', gap: 1, alignItems: 'center' }}>
        <NewReleasesIcon sx={{ color: '#6366f1', fontSize: 18, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
          <strong style={{ color: '#6366f1' }}>Interactive Flow:</strong> Hover over any stage card to see full details, trigger conditions, next steps, and email notifications.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {STAGES.map((stage, idx) => (
          <FlowNode key={stage.id} stage={stage} isLast={idx === STAGES.length - 1} />
        ))}

        {/* Closed terminal */}
        <Box sx={{ mt: 1.5, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {ALTERNATE_PATHS.map(p => (
            <Tooltip key={p.id} title={p.description} placement="top" arrow>
              <Box sx={{
                px: 2, py: 1.25, borderRadius: '10px',
                border: `2px dashed ${p.border}`,
                bgcolor: p.bg,
                display: 'flex', alignItems: 'center', gap: 0.75,
                cursor: 'default',
              }}>
                <Box sx={{ color: p.color }}>{p.icon}</Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: p.color, display: 'block' }}>{p.label}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>From: {p.fromStage}</Typography>
                </Box>
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ─── MAIN MODAL EXPORT ─────────────────────────────────────────────────────────
export default function CafeJourneyModal({ open, onClose }) {
  const [tab, setTab] = useState(0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '90vh',
          overflow: 'hidden',
          border: '1px solid rgba(99,102,241,0.2)',
        }
      }}
    >
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d2137 50%, #0A314D 100%)',
        px: 3, pt: 2.5, pb: 0,
        position: 'relative',
      }}>
        <Box sx={{ height: 3, background: 'linear-gradient(90deg, #6366f1, #3b82f6, #22c55e, #f59e0b)', borderRadius: 2, mb: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 44, height: 44, bgcolor: 'rgba(99,102,241,0.2)', border: '1.5px solid rgba(99,102,241,0.4)' }}>
              <AccountTreeIcon sx={{ color: '#a5b4fc', fontSize: 22 }} />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
                  Cafe Journey
                </Typography>
                <Chip label="Localhost Only" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                Complete store lifecycle — from Pipeline to Fully Active
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.82rem', textTransform: 'none', minHeight: 44 },
            '& .MuiTab-root.Mui-selected': { color: '#a5b4fc' },
            '& .MuiTabs-indicator': { bgcolor: '#6366f1', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab icon={<ViewListIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Store Lifecycle Overview" />
          <Tab icon={<AccountTreeIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Store Lifecycle Flow" />
        </Tabs>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 2.5, overflow: 'auto' }}>
        {tab === 0 && <OverviewTab />}
        {tab === 1 && <FlowTab />}
      </DialogContent>
    </Dialog>
  );
}
