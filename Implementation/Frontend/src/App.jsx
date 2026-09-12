import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { TeamChatProvider } from './context/TeamChatContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import SyncStatusBar from './components/ui/SyncStatusBar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import CreateTicket from './pages/CreateTicket';
import Customers from './pages/Customers';
import AIAssistant from './pages/AIAssistant';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import ErrorBoundary from './components/ui/ErrorBoundary';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Update browser tab document.title dynamically based on active route
  useEffect(() => {
    const routeTitles = {
      '/': 'StrawCRM · Internal Support & Operations Desk',
      '/login': 'Sign In · StrawCRM',
      '/dashboard': 'Dashboard · StrawCRM',
      '/tickets': 'Tickets · StrawCRM',
      '/tickets/create': 'Create Ticket · StrawCRM',
      '/customers': 'Customers · StrawCRM',
      '/ai': 'AI Assistant · StrawCRM',
      '/reports': 'Reports & Analytics · StrawCRM',
      '/settings': 'Settings · StrawCRM',
    };
    document.title = routeTitles[currentPath] || 'Dashboard · StrawCRM';
  }, [currentPath]);

  // If user is authenticated and hits /login or root '/', direct to /dashboard
  useEffect(() => {
    if (isAuthenticated && (currentPath === '/login' || currentPath === '/')) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, currentPath]);

  // Root landing page
  if (currentPath === '/') {
    return <LandingPage onNavigate={navigate} />;
  }

  // If path is /login and user is not authenticated, show login page
  if (currentPath === '/login' && !isAuthenticated) {
    return <Login onNavigate={navigate} />;
  }

  // Render the current authenticated route content
  const renderRoute = () => {
    if (currentPath === '/tickets') {
      return <Tickets onNavigate={navigate} />;
    }
    if (currentPath === '/tickets/create') {
      return <CreateTicket onNavigate={navigate} />;
    }
    if (currentPath === '/customers') {
      return <Customers onNavigate={navigate} />;
    }
    if (currentPath === '/ai') {
      return <AIAssistant onNavigate={navigate} />;
    }
    if (currentPath === '/reports') {
      return <Reports onNavigate={navigate} />;
    }
    if (currentPath === '/settings') {
      return <SettingsPage onNavigate={navigate} />;
    }

    // Default to Dashboard for /dashboard and any other protected path
    return <Dashboard onNavigate={navigate} />;
  };

  return (
    <ProtectedRoute fallback={<Login onNavigate={navigate} />}>
      <AppShell currentPath={currentPath} onNavigate={navigate}>
        {renderRoute()}
      </AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TeamChatProvider>
          <AppContent />
        </TeamChatProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
