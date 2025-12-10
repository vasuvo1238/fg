import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import App from './App';
import Login from './components/Login';
import Register from './components/Register';
import AuthCallback from './components/AuthCallback';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import ProtectedRoute from './components/ProtectedRoute';
import CookieConsent from './components/CookieConsent';

// Component to handle session_id in URL hash
function AuthRouter() {
  const location = useLocation();
  
  // Check for session_id in hash SYNCHRONOUSLY during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect root to dashboard (will redirect to login if not authenticated) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthRouter />
      <CookieConsent />
    </BrowserRouter>
  );
}
