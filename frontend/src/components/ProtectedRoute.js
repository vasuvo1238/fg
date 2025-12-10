import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/lib/api';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true/false = result
  const [user, setUser] = useState(null);
  const location = useLocation();
  const checkingRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Prevent double checking
      if (checkingRef.current) return;
      checkingRef.current = true;

      // Check if user data was passed from AuthCallback
      const userData = sessionStorage.getItem('user_data');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
          sessionStorage.removeItem('user_data');
          return;
        } catch (e) {
          sessionStorage.removeItem('user_data');
        }
      }

      // Check if just authenticated (skip delay)
      const justAuth = sessionStorage.getItem('just_authenticated');
      if (!justAuth) {
        // Small delay to ensure cookie is set
        await new Promise(r => setTimeout(r, 150));
      } else {
        sessionStorage.removeItem('just_authenticated');
      }

      try {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.log('Not authenticated:', error.response?.status);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated - render children with user context
  return children;
}
