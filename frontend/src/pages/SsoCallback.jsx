// src/pages/SsoCallback.jsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export default function SsoCallback() {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();
  const { authType } = useParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log(`Handling ${authType} SSO callback...`);
        await handleRedirectCallback();
        console.log(`${authType} SSO callback successful, redirecting to home`);
        navigate('/', { replace: true });
      } catch (err) {
        console.error(`${authType} SSO callback error:`, err);
        
        // Check if this is an "existing user" error
        const errorMessage = err?.message?.toLowerCase() || '';
        const errorCode = err?.errors?.[0]?.code || '';
        
        console.log('Error details:', { errorMessage, errorCode });
        
        // If it's a sign-up attempt and we get certain errors, redirect to sign-in
        if (authType === 'sign-up' && (
          errorMessage.includes('already exists') ||
          errorMessage.includes('already registered') ||
          errorMessage.includes('taken') ||
          errorCode.includes('form_identifier_exists') ||
          errorCode.includes('user_already_exists')
        )) {
          console.log('Existing user detected during sign-up, redirecting to sign-in');
          navigate('/sign-in', { 
            replace: true,
            state: { 
              message: 'An account with this email/phone already exists. Please sign in instead.' 
            }
          });
        } else {
          // For other errors or sign-in errors, redirect to home
          console.log('Redirecting to home despite error');
          navigate('/', { replace: true });
        }
      }
    };

    handleCallback();
  }, [handleRedirectCallback, navigate, authType]);

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