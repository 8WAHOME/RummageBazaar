// src/pages/SsoCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export default function SsoCallback() {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Handling SSO callback...');
        await handleRedirectCallback();
        console.log('SSO callback successful, redirecting to home');
        navigate('/', { replace: true });
      } catch (err) {
        console.error('SSO callback error:', err);
        // Even if there's an error, redirect to home
        console.log('Redirecting to home despite error');
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [handleRedirectCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Completing Authentication</h2>
        <p className="text-gray-600 mt-2">Please wait while we redirect you...</p>
      </div>
    </div>
  );
}