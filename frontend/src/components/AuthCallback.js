import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/lib/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    const processAuth = async () => {
      // Prevent double processing
      if (processedRef.current) return;
      processedRef.current = true;

      // Get session_id from URL hash
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        console.error('No session_id found in URL');
        navigate('/login', { replace: true });
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        // Exchange session_id for session token
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        if (response.data.success) {
          // Set flag to skip delay in ProtectedRoute
          sessionStorage.setItem('just_authenticated', 'true');
          
          // Store user data temporarily
          sessionStorage.setItem('user_data', JSON.stringify(response.data.user));
          
          // Redirect to dashboard
          navigate('/dashboard', { 
            replace: true,
            state: { user: response.data.user }
          });
        } else {
          throw new Error('Authentication failed');
        }
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login', { replace: true, state: { error: 'Authentication failed' } });
      }
    };

    processAuth();
  }, [navigate]);

  // Show nothing while processing (silent auth)
  return null;
}
