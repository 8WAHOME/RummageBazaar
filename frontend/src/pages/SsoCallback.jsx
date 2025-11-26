// src/pages/SsoCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export default function SsoCallback() {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    handleRedirectCallback()
      .then(() => {
        // Successfully signed in, redirect to home
        console.log('SSO callback successful, redirecting to home');
        navigate('/', { replace: true });
      })
      .catch((err) => {
        console.error('SSO callback error:', err);
        // If there's an error, still redirect to home
        navigate('/', { replace: true });
      });
  }, [handleRedirectCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Completing Sign In</h2>
        <p className="text-gray-600 mt-2">Please wait while we redirect you...</p>
      </div>
    </div>
  );
}