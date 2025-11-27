// src/pages/SsoCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';

export default function SsoCallback() {
  const { handleRedirectCallback } = useClerk();
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const { authType } = useParams();
  const [errorHandled, setErrorHandled] = useState(false);

  useEffect(() => {
    // If user is already signed in, redirect to home immediately
    if (isSignedIn) {
      console.log('User already signed in, redirecting to home');
      navigate('/', { replace: true });
      return;
    }

    // Prevent multiple error handling attempts
    if (errorHandled) return;

    const handleCallback = async () => {
      try {
        console.log(`Handling ${authType} SSO callback...`);
        await handleRedirectCallback({
          // Add explicit error handling for the callback
          onError: (error) => {
            console.warn(`Clerk callback error handled:`, error);
            setErrorHandled(true);
            navigate('/', { replace: true });
          }
        });
        console.log(`${authType} SSO callback successful, redirecting to home`);
        navigate('/', { replace: true });
      } catch (err) {
        console.warn(`${authType} SSO callback error:`, err);
        setErrorHandled(true);
        
        // For ALL errors, redirect to home - Clerk handles user state
        console.log('Redirecting to home despite error');
        navigate('/', { replace: true });
      }
    };

    // Add a safety timeout to handle uncaught errors
    const safetyTimeout = setTimeout(() => {
      if (!errorHandled) {
        console.log('Safety timeout triggered, redirecting to home');
        setErrorHandled(true);
        navigate('/', { replace: true });
      }
    }, 5000); // 5 second safety net

    handleCallback();

    return () => clearTimeout(safetyTimeout);
  }, [handleRedirectCallback, navigate, authType, isSignedIn, errorHandled]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">
          Completing {authType === 'sign-up' ? 'Sign Up' : 'Sign In'}
        </h2>
        <p className="text-gray-600 mt-2">Please wait while we redirect you...</p>
      </div>
    </div>
  );
}