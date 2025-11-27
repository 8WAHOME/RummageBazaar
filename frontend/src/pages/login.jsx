import React from "react";
import { SignIn } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

export default function Login() {
  const { isSignedIn } = useUser();
  const location = useLocation();
  
  // Get message from navigation state (passed from SSO callback)
  const message = location.state?.message;

  // If user is already signed in, redirect to home page
  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {message && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 text-center">{message}</p>
            </div>
          )}
          {/* Removed the "Don't have an account?" text as requested */}
        </div>
        <SignIn 
          routing="path" 
          path="/sign-in" 
          redirectUrl="/"
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          afterSignUpUrl="/"
        />
      </div>
    </div>
  );
}