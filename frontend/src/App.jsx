import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { theme } from './theme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

import Stores from './pages/Stores';
import NewStore from './pages/NewStore';
import EditStore from './pages/EditStore';
import Approvals from './pages/Approvals';
import Settings from './pages/Settings';
import ContactDetails from './pages/ContactDetails';
import Login from './pages/Login';
import BulkAction from './pages/BulkAction';

import AggregatorMail from './pages/AggregatorMail';
import UpcomingStores from './pages/UpcomingStores';
import ImagesDocs from './pages/ImagesDocs';
import ExpansionPipeline from './pages/ExpansionPipeline';
import DeleteBranches from './pages/DeleteBranches';
import UserRegistrations from './pages/UserRegistrations';
import SwiggyZomatoIntegration from './pages/SwiggyZomatoIntegration';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: 'stores',
        element: <Stores />
      },
      {
        path: 'expansion-pipeline',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'FINANCE']}><ExpansionPipeline /></ProtectedRoute>
      },
      {
        path: 'stores/new',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><NewStore /></ProtectedRoute>
      },
      {
        path: 'upcoming-stores',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><UpcomingStores /></ProtectedRoute>
      },
      {
        path: 'stores/:id',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE', 'USER']}><EditStore /></ProtectedRoute>
      },
      {
        path: 'approvals',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><Approvals /></ProtectedRoute>
      },

      {
        path: 'swiggy-zomato',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']}><SwiggyZomatoIntegration /></ProtectedRoute>
      },
      {
        path: 'images-docs',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']}><ImagesDocs /></ProtectedRoute>
      },
      {
        path: 'delete-branches',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']}><DeleteBranches /></ProtectedRoute>
      },
      {
        path: 'aggregator-mail',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']}><AggregatorMail /></ProtectedRoute>
      },
      {
        path: 'bulk-action',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><BulkAction /></ProtectedRoute>
      },
      {
        path: 'settings',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']}><Settings /></ProtectedRoute>
      },
      {
        path: 'contacts',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']}><ContactDetails /></ProtectedRoute>
      },
      {
        path: 'user-registrations',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><UserRegistrations /></ProtectedRoute>
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
