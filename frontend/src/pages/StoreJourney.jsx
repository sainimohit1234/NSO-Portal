/**
 * StoreJourney.jsx
 * ─────────────────────────────────────────────────────────────────
 * READ-ONLY: This page is a visual journey map of the complete
 * lifecycle of a New Store — from "Add New Project" to
 * "Delivery Live". It is intended for localhost review ONLY and
 * must NOT be deployed to production.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stepper, Step,
  StepLabel, StepContent, Button, Collapse, Divider, Stack,
  Avatar, Paper, Grid, Tooltip
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import EmailIcon from '@mui/icons-material/Email';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VerifiedIcon from '@mui/icons-material/Verified';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';

// ─── Journey Step Definitions ──────────────────────────────────────────────────
const JOURNEY_STEPS = [
  {
    id: 1,
    label: 'Add New Project',
    internalStatus: null,
    displayStatus: 'INITIATED',
    icon: <AddCircleOutlineIcon />,
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.10)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    chipColor: '#4f46e5',
    chipBg: 'rgba(99, 102, 241, 0.12)',
    description: 'A user clicks "Add New Store" in the NSO Portal. A new store record is created in the system with the initial launch status set to "Upcoming Store".',
    who: 'Any authorised NSO Portal user',
    actions: [
      'Fill in Cafe Name, Cafe Code, Brand, City, State, Address',
      'Select Cafe Model, Trading Area, Zone, Platform Type',
      'Enter contacts: Area Manager, City Head, Cafe Manager',
      'Add aggregator RIDs (Swiggy/Zomato) if available',
      'Click "Submit" — store is saved with status: UPCOMING',
    ],
    emailTrigger: false,
    fields: ['Cafe Name', 'Cafe Code', 'Brand', 'City', 'State', 'Cafe Model', 'Trading Area'],
    statusAfter: 'UPCOMING',
    notes: 'mailStatus is set to "Pending for S/Z" automatically. The store appears in "All Upcoming Stores" and "All Stores" views.',
  },
  {
    id: 2,
    label: 'Project Details Filled & Sent for NSO Approval',
    internalStatus: 'PENDING_APPROVAL',
    displayStatus: 'PENDING APPROVAL',
    icon: <PendingActionsIcon />,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.10)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    chipColor: '#c2410c',
    chipBg: 'rgba(249, 115, 22, 0.12)',
    description: 'The project details are reviewed and submitted to the NSO team for official approval. An automated email notification is sent to the NSO team.',
    who: 'City Head / Area Manager / Admin',
    actions: [
      'Edit the store — verify all mandatory fields are complete',
      'Confirm project start date, handover date, tentative dry launch date',
      'Click "Send for NSO Approval" in the Approvals page',
      'System validates all mandatory fields before allowing status change',
      'Status is updated to PENDING_APPROVAL',
    ],
    emailTrigger: true,
    emailCategory: 'Status Changes',
    emailSubCategory: 'Sent to NSO Team for Approval',
    fields: ['Project Start Date', 'Project Handover Date', 'Tentative Dry Launch Date', 'GST No.', 'FSSAI License'],
    statusAfter: 'PENDING_APPROVAL',
    notes: 'If mandatory fields are missing, the system shows a validation dialog listing all missing fields. The status change is blocked until all are filled.',
  },
  {
    id: 3,
    label: 'NSO Approval / On Hold',
    internalStatus: 'NSO_APPROVED',
    displayStatus: 'NSO APPROVED',
    icon: <ThumbUpIcon />,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.10)',
    borderColor: 'rgba(234, 179, 8, 0.35)',
    chipColor: '#a16207',
    chipBg: 'rgba(234, 179, 8, 0.12)',
    description: 'The NSO team reviews the submitted project. They either Approve it (moving it forward) or place it On Hold with remarks explaining the reason.',
    who: 'NSO Team / Super Admin / Approver role',
    actions: [
      'Review submitted store in the NSO Approval page',
      'Approve → status moves to NSO_APPROVED, email sent to team',
      '— OR —',
      'On Hold → Admin enters mandatory remarks explaining reason',
      'On Hold email with remarks is sent to the relevant team',
    ],
    emailTrigger: true,
    emailCategory: 'Status Changes',
    emailSubCategory: 'Approved / On Hold',
    fields: ['Approval Remarks (if On Hold)'],
    statusAfter: 'NSO_APPROVED or ON_HOLD',
    notes: 'ON_HOLD requires mandatory remarks. Store can be moved back into the pipeline once the on-hold reason is resolved.',
    hasBranch: true,
    branchLabel: 'On Hold',
    branchStatus: 'ON_HOLD',
    branchColor: '#ef4444',
    branchDescription: 'Project is paused — admin must enter a reason. Store stays in the approval queue until resolved.',
  },
  {
    id: 4,
    label: 'Ready to Go Live',
    internalStatus: 'READY_TO_GO_LIVE',
    displayStatus: 'READY TO GO LIVE',
    icon: <RocketLaunchIcon />,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.10)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    chipColor: '#1d4ed8',
    chipBg: 'rgba(59, 130, 246, 0.12)',
    description: 'All pre-launch checks are complete. The store has been built, fit-out is done, and it is declared ready for launch. An automated email is sent to all relevant stakeholders.',
    who: 'NSO Team / Admin / Approver',
    actions: [
      'Confirm physical store setup is complete',
      'Verify all documents and compliance are in order',
      'Set status to "Ready to Go Live" in the Approvals page',
      'System sends automated email to all mapped recipients',
    ],
    emailTrigger: true,
    emailCategory: 'Status Changes',
    emailSubCategory: 'Ready to Go Live',
    fields: ['Actual Launch Date', 'Menu Version', 'Seating Count'],
    statusAfter: 'READY_TO_GO_LIVE',
    notes: 'This status is visible on the All Stores page with a blue chip indicator. The store now appears in upcoming launch dashboards.',
  },
  {
    id: 5,
    label: 'In-Store Live Toggle Enabled',
    internalStatus: 'LIVE',
    displayStatus: 'LIVE',
    icon: <StorefrontIcon />,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.10)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    chipColor: '#16a34a',
    chipBg: 'rgba(34, 197, 94, 0.12)',
    description: 'The store opens for in-store customers. The admin enables the "In-Store Live" toggle in the Edit Store page and sets the actual launch date.',
    who: 'Super Admin / Admin (Go-Live permissions)',
    actions: [
      'Go to Edit Store → "Go Live" section',
      'Enable the "In-Store Live" toggle',
      'Enter the In-Store Live Date',
      'Save the form — status moves to LIVE',
      'Store now shows as "Newly Launched" on the dashboard (within 30 days)',
      'After 30 days: status changes to "Active" automatically',
    ],
    emailTrigger: false,
    fields: ['In-Store Live Date', 'Launch Date'],
    statusAfter: 'LIVE (Newly Launched → Active)',
    notes: 'The "Go Live" section is only visible to users with Go Live permissions. Once enabled, the store status becomes LIVE and appears in the main Stores list.',
  },
  {
    id: 6,
    label: 'Aggregator Integration (Swiggy / Zomato)',
    internalStatus: 'INTEGRATION',
    displayStatus: 'INTEGRATION',
    icon: <EmailIcon />,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.10)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    chipColor: '#7c3aed',
    chipBg: 'rgba(139, 92, 246, 0.12)',
    description: 'Integration emails are sent to Swiggy and Zomato to onboard the store. Once the RIDs (Restaurant IDs) are received from the aggregators, they are entered into the system.',
    who: 'NSO Team / Integration Team',
    actions: [
      'Go to Partner Integration Hub page',
      'Draft and send integration emails to Swiggy and/or Zomato',
      'mailStatus updates to "Sent" for each aggregator',
      'Receive RIDs from aggregators (Restaurant IDs)',
      'Enter RIDs in the store record (Edit Store → Integration section)',
      'Integration status updates to "Integration Completed"',
    ],
    emailTrigger: true,
    emailCategory: 'Abc / New Outlet Onboarding',
    emailSubCategory: 'Draft a mail for BTC | Swiggy / Zomato',
    fields: ['Swiggy RID', 'Zomato RID', 'Integration Mail Status'],
    statusAfter: 'LIVE + Integration Completed',
    notes: 'This can happen in parallel with or after In-Store Live. Integration status is tracked separately from store status. Follow-up emails are triggered automatically after 4 days if RIDs are not received.',
  },
  {
    id: 7,
    label: 'Delivery Live Toggle Enabled',
    internalStatus: 'DELIVERY_LIVE',
    displayStatus: 'DELIVERY LIVE',
    icon: <LocalShippingIcon />,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.10)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    chipColor: '#047857',
    chipBg: 'rgba(16, 185, 129, 0.12)',
    description: 'Once the store is onboarded on delivery platforms (Swiggy/Zomato) and RIDs are active, the admin enables the "Delivery Live" toggle to mark delivery as operational.',
    who: 'Super Admin / Admin (Go-Live permissions)',
    actions: [
      'Confirm aggregator RIDs are entered and active',
      'Go to Edit Store → "Go Live" section',
      'Enable the "Delivery Live" toggle',
      'Enter the Delivery Live Date',
      'Save the form',
    ],
    emailTrigger: false,
    fields: ['Delivery Live Date'],
    statusAfter: 'LIVE + Delivery Live = true',
    notes: 'The Delivery Live toggle is separate from In-Store Live. Both can be enabled independently. A delivery icon appears on the store card in All Stores when this is active.',
  },
  {
    id: 8,
    label: 'Store Fully Active',
    internalStatus: 'ACTIVE',
    displayStatus: 'ACTIVE',
    icon: <DoneAllIcon />,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    chipColor: '#15803d',
    chipBg: 'rgba(34, 197, 94, 0.12)',
    description: 'The store is fully operational — both in-store and delivery are live. After 30 days post-launch, the store status transitions from "Newly Launched" to "Active" automatically.',
    who: 'Automatic (System)',
    actions: [
      'No manual action required',
      'System automatically computes "Active" status after 30 days from launch date',
      'Store visible in All Stores with a green "Active" chip',
      'Dashboard metrics update to include this store',
    ],
    emailTrigger: false,
    fields: [],
    statusAfter: 'LIVE (Active)',
    notes: 'The store continues to be tracked in the portal. Future updates (closure, reopening) are managed through the Edit Store workflow.',
    isTerminal: true,
  },
];

// ─── Side Branch: Alternate Paths ─────────────────────────────────────────────
const SIDE_PATHS = [
  {
    id: 'ON_HOLD',
    label: 'On Hold',
    color: '#f97316',
    description: 'Project is paused due to a compliance, financial, or operational issue. Mandatory remarks are entered. Can be resumed once issue is resolved.',
    from: 'PENDING_APPROVAL or NSO_APPROVED',
    to: 'Back into pipeline once resolved',
  },
  {
    id: 'CLOSED',
    label: 'Closed',
    color: '#ef4444',
    description: 'The store is permanently shut down. Both In-Store Closed and Delivery Closed toggles are enabled with closure dates. The store moves to the Closed status.',
    from: 'Any LIVE state',
    to: 'CLOSED (terminal)',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function StoreJourney() {
  const [expandedStep, setExpandedStep] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');

  const toggleStep = (id) => {
    setExpandedStep(prev => prev === id ? null : id);
  };

  return (
    <Box sx={{ py: 2, px: { xs: 2, md: 3 } }}>
      {/* ── Header ── */}
      <Card sx={{
        mb: 4,
        background: 'linear-gradient(135deg, #0A1628 0%, #0d2137 50%, #0A314D 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Decorative top bar */}
        <Box sx={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #3b82f6, #22c55e, #eab308, #ef4444)' }} />
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(99,102,241,0.18)', border: '2px solid rgba(99,102,241,0.4)' }}>
              <TimelineIcon sx={{ color: '#a5b4fc', fontSize: 28 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                  New Store Journey
                </Typography>
                <Chip label="Preview Only · Localhost" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)', fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 680, lineHeight: 1.6 }}>
                Complete lifecycle of a new cafe — from the first click of "Add New Project" all the way through to Delivery Live. Each stage shows the internal status, responsible actor, actions taken, and automated email triggers.
              </Typography>
              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                {[
                  { label: 'Email Triggered', color: '#8b5cf6', icon: '✉️' },
                  { label: 'Manual Action', color: '#3b82f6', icon: '👆' },
                  { label: 'Auto by System', color: '#22c55e', icon: '⚙️' },
                  { label: 'Alternate Path', color: '#f97316', icon: '⤵️' },
                ].map(item => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontSize: '0.8rem' }}>{item.icon}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Journey Steps ── */}
      <Box sx={{ position: 'relative' }}>
        {/* Vertical line connector */}
        <Box sx={{
          position: 'absolute',
          left: { xs: 28, md: 36 },
          top: 0,
          bottom: 0,
          width: 3,
          background: 'linear-gradient(180deg, #6366f1 0%, #3b82f6 30%, #22c55e 60%, #10b981 80%, #22c55e 100%)',
          borderRadius: 4,
          zIndex: 0,
          opacity: 0.25,
        }} />

        <Stack spacing={3}>
          {JOURNEY_STEPS.map((step, idx) => {
            const isExpanded = expandedStep === step.id;
            return (
              <Box key={step.id} sx={{ position: 'relative', zIndex: 1 }}>
                <Card
                  onClick={() => toggleStep(step.id)}
                  sx={{
                    borderRadius: '16px',
                    border: `1.5px solid ${isExpanded ? step.borderColor : 'rgba(0,0,0,0.08)'}`,
                    bgcolor: isExpanded ? step.bgColor : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      border: `1.5px solid ${step.borderColor}`,
                      bgcolor: step.bgColor,
                      transform: 'translateX(4px)',
                      boxShadow: `0 4px 20px ${step.bgColor}`,
                    },
                    ml: { xs: 7, md: 9 },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: 2 } }}>
                    {/* Step header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      {/* Step number */}
                      <Typography variant="caption" sx={{ fontWeight: 900, color: step.color, opacity: 0.7, minWidth: 20 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </Typography>

                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.95rem' }}>
                            {step.label}
                          </Typography>
                          <Chip
                            label={step.displayStatus}
                            size="small"
                            sx={{ bgcolor: step.chipBg, color: step.chipColor, border: `1px solid ${step.borderColor}`, fontWeight: 800, fontSize: '0.68rem', height: 20 }}
                          />
                          {step.emailTrigger && (
                            <Tooltip title={`Email sent: ${step.emailCategory} › ${step.emailSubCategory}`}>
                              <Chip icon={<EmailIcon sx={{ fontSize: '0.8rem !important' }} />} label="Email" size="small" sx={{ bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.25)', fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                            </Tooltip>
                          )}
                          {step.who?.includes('Automatic') && (
                            <Chip label="Auto" size="small" sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)', fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, fontSize: '0.82rem', lineHeight: 1.5 }}>
                          {step.description}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: step.color, opacity: 0.7 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                          {isExpanded ? 'Less' : 'Details'}
                        </Typography>
                        {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </Box>
                    </Box>

                    {/* Expanded details */}
                    <Collapse in={isExpanded} timeout="auto">
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2.5}>
                        {/* Actions column */}
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: step.color, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                            👆 Actions Performed
                          </Typography>
                          <Stack spacing={0.5}>
                            {step.actions.map((action, i) => (
                              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <Typography sx={{ color: step.color, fontWeight: 700, fontSize: '0.75rem', mt: '1px', minWidth: 14 }}>
                                  {action === '— OR —' ? '' : `${i + 1}.`}
                                </Typography>
                                <Typography variant="body2" sx={{ color: action === '— OR —' ? step.color : 'text.primary', fontWeight: action === '— OR —' ? 700 : 500, fontSize: '0.82rem', lineHeight: 1.5 }}>
                                  {action}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Grid>

                        {/* Meta column */}
                        <Grid item xs={12} md={6}>
                          {/* Responsible */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: step.color, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 0.75 }}>
                              👤 Responsible
                            </Typography>
                            <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: '8px', display: 'inline-block' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{step.who}</Typography>
                            </Paper>
                          </Box>

                          {/* Key fields */}
                          {step.fields.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: step.color, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 0.75 }}>
                                📋 Key Fields at This Stage
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {step.fields.map(f => (
                                  <Chip key={f} label={f} size="small" sx={{ bgcolor: step.bgColor, color: step.chipColor, border: `1px solid ${step.borderColor}`, fontSize: '0.7rem', height: 22, fontWeight: 600 }} />
                                ))}
                              </Box>
                            </Box>
                          )}

                          {/* Email trigger details */}
                          {step.emailTrigger && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 0.75 }}>
                                ✉️ Email Triggered
                              </Typography>
                              <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: '8px', borderColor: 'rgba(139,92,246,0.3)', bgcolor: 'rgba(139,92,246,0.04)' }}>
                                <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 700, display: 'block' }}>
                                  Category: {step.emailCategory}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  Sub-Category: {step.emailSubCategory}
                                </Typography>
                              </Paper>
                            </Box>
                          )}

                          {/* Status after */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: step.color, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 0.75 }}>
                              ✅ Status After This Step
                            </Typography>
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: '0.9rem !important', color: `${step.chipColor} !important` }} />}
                              label={step.statusAfter}
                              sx={{ bgcolor: step.chipBg, color: step.chipColor, border: `1px solid ${step.borderColor}`, fontWeight: 700, fontSize: '0.78rem' }}
                            />
                          </Box>

                          {/* Notes */}
                          {step.notes && (
                            <Paper variant="outlined" sx={{ px: 1.5, py: 1, borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                              <InfoOutlinedIcon sx={{ fontSize: '0.9rem', color: 'text.disabled', mt: '1px', flexShrink: 0 }} />
                              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.55, fontSize: '0.78rem' }}>
                                {step.notes}
                              </Typography>
                            </Paper>
                          )}
                        </Grid>
                      </Grid>

                      {/* On Hold branch note */}
                      {step.hasBranch && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <PauseCircleIcon sx={{ color: '#ef4444', mt: '1px', flexShrink: 0 }} />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#ef4444', display: 'block', mb: 0.25 }}>
                              ⤵️ Alternate Path: On Hold
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.55, fontSize: '0.78rem' }}>
                              {step.branchDescription}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Collapse>
                  </CardContent>
                </Card>

                {/* Circle icon on the left */}
                <Box sx={{
                  position: 'absolute',
                  left: { xs: 4, md: 8 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: { xs: 48, md: 56 },
                  height: { xs: 48, md: 56 },
                  borderRadius: '50%',
                  bgcolor: step.bgColor,
                  border: `2px solid ${step.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: step.color,
                  zIndex: 2,
                  boxShadow: `0 0 0 4px ${step.bgColor}`,
                }}>
                  {step.icon}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* ── Alternate Paths ── */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelIcon sx={{ color: '#ef4444' }} /> Alternate Paths
        </Typography>
        <Grid container spacing={2.5}>
          {SIDE_PATHS.map(path => (
            <Grid item xs={12} md={6} key={path.id}>
              <Card sx={{ borderRadius: '14px', border: `1.5px solid rgba(239,68,68,0.25)`, bgcolor: 'rgba(239,68,68,0.04)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {path.id === 'ON_HOLD' ? <PauseCircleIcon sx={{ color: path.color }} /> : <CancelIcon sx={{ color: path.color }} />}
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: path.color }}>{path.label}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, lineHeight: 1.6 }}>{path.description}</Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', fontSize: '0.65rem' }}>From</Typography>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>{path.from}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', fontSize: '0.65rem' }}>To</Typography>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>{path.to}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Status Summary Grid ── */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedIcon sx={{ color: '#3b82f6' }} /> All Store Status Reference
        </Typography>
        <Grid container spacing={1.5}>
          {[
            { label: 'Upcoming Store', color: '#a16207', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', desc: 'Default for all newly added stores. Visible in Upcoming Stores list.' },
            { label: 'Pending Approval', color: '#c2410c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', desc: 'Sent to NSO team. Awaiting approval. Visible in Approvals page.' },
            { label: 'NSO Approved', color: '#a16207', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', desc: 'Approved by NSO team. Moving towards launch preparation.' },
            { label: 'Ready to Go Live', color: '#1d4ed8', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', desc: 'All pre-launch checks done. Store is ready to open.' },
            { label: 'Newly Launched', color: '#a21caf', bg: 'rgba(217,70,239,0.12)', border: 'rgba(217,70,239,0.3)', desc: 'LIVE status within first 30 days of launch date.' },
            { label: 'Active', color: '#16a34a', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', desc: 'LIVE status after 30 days. Fully operational store.' },
            { label: 'On Hold', color: '#ea580c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', desc: 'Project paused. Remarks mandatory. Can be resumed.' },
            { label: 'Closed', color: '#dc2626', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', desc: 'Store permanently closed. Both in-store and delivery closed toggles enabled.' },
          ].map(s => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px', borderColor: s.border, bgcolor: s.bg, height: '100%' }}>
                <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 800, fontSize: '0.72rem', mb: 0.75 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5, display: 'block', fontSize: '0.76rem' }}>{s.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Footer disclaimer ── */}
      <Paper variant="outlined" sx={{ mt: 5, p: 2.5, borderRadius: '12px', bgcolor: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <LockOpenIcon sx={{ color: '#ef4444', flexShrink: 0 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <strong style={{ color: '#ef4444' }}>Localhost Only:</strong> This page is a read-only journey visualization for internal review. It does not affect any store data or live functionality. This route must not be included in the production deployment. Contact the developer to add a "Store Journey" button in the All Stores module when ready.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
