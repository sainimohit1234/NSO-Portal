import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import FullScreenLoader from './components/FullScreenLoader';
import { CustomThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Stores = React.lazy(() => import('./pages/Stores'));
const NewStore = React.lazy(() => import('./pages/NewStore'));
const EditStore = React.lazy(() => import('./pages/EditStore'));
const Approvals = React.lazy(() => import('./pages/Approvals'));
const Settings = React.lazy(() => import('./pages/Settings'));
const ContactDetails = React.lazy(() => import('./pages/ContactDetails'));
const Login = React.lazy(() => import('./pages/Login'));
const BulkAction = React.lazy(() => import('./pages/BulkAction'));
const AggregatorMail = React.lazy(() => import('./pages/AggregatorMail'));
const UpcomingStores = React.lazy(() => import('./pages/UpcomingStores'));
const ImagesDocs = React.lazy(() => import('./pages/ImagesDocs'));
const ExpansionPipeline = React.lazy(() => import('./pages/ExpansionPipeline'));
const DeleteBranches = React.lazy(() => import('./pages/DeleteBranches'));
const UserRegistrations = React.lazy(() => import('./pages/UserRegistrations'));
const SwiggyZomatoIntegration = React.lazy(() => import('./pages/SwiggyZomatoIntegration'));

const PageLoader = () => (
  <FullScreenLoader messages={[
    'Warming up the espresso machine…',
    'Grinding the freshest beans…',
    'Loading App…',
    'Plating the details…',
    'Almost ready to serve ☕',
  ]} />
);

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader messages={[
      'Warming up the espresso machine…',
      'Grinding the freshest beans…',
      'Authenticating…',
      'Plating the details…',
      'Almost ready to serve ☕',
    ]} />;
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
    element: <Suspense fallback={<PageLoader />}><Login /></Suspense>,
    errorElement: <GlobalErrorBoundary />
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    errorElement: <GlobalErrorBoundary />,
    children: [
      {
        index: true,
        element: <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
      },
      {
        path: 'stores',
        element: <Suspense fallback={<PageLoader />}><Stores /></Suspense>
      },
      {
        path: 'expansion-pipeline',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'FINANCE']}><Suspense fallback={<PageLoader />}><ExpansionPipeline /></Suspense></ProtectedRoute>
      },
      {
        path: 'stores/new',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><Suspense fallback={<PageLoader />}><NewStore /></Suspense></ProtectedRoute>
      },
      {
        path: 'upcoming-stores',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><Suspense fallback={<PageLoader />}><UpcomingStores /></Suspense></ProtectedRoute>
      },
      {
        path: 'stores/:id',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE', 'USER']}><Suspense fallback={<PageLoader />}><EditStore /></Suspense></ProtectedRoute>
      },
      {
        path: 'approvals',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><Suspense fallback={<PageLoader />}><Approvals /></Suspense></ProtectedRoute>
      },
      {
        path: 'swiggy-zomato',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']}><Suspense fallback={<PageLoader />}><SwiggyZomatoIntegration /></Suspense></ProtectedRoute>
      },
      {
        path: 'images-docs',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Suspense fallback={<PageLoader />}><ImagesDocs /></Suspense></ProtectedRoute>
      },
      {
        path: 'delete-branches',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Suspense fallback={<PageLoader />}><DeleteBranches /></Suspense></ProtectedRoute>
      },
      {
        path: 'aggregator-mail',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']}><Suspense fallback={<PageLoader />}><AggregatorMail /></Suspense></ProtectedRoute>
      },
      {
        path: 'bulk-action',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><Suspense fallback={<PageLoader />}><BulkAction /></Suspense></ProtectedRoute>
      },
      {
        path: 'settings',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']}><Suspense fallback={<PageLoader />}><Settings /></Suspense></ProtectedRoute>
      },
      {
        path: 'contacts',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']}><Suspense fallback={<PageLoader />}><ContactDetails /></Suspense></ProtectedRoute>
      },
      {
        path: 'user-registrations',
        element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Suspense fallback={<PageLoader />}><UserRegistrations /></Suspense></ProtectedRoute>
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
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </CustomThemeProvider>
  );
}

export default App;
