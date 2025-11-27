import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

export default function Signup() {
  const { isSignedIn } = useUser();

  // If user is already signed in, redirect to home page
  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          {/* Removed the "Already have an account?" text as requested */}
        </div>
        <SignUp 
          routing="path" 
          path="/sign-up" 
          signInUrl="/sign-in"
          redirectUrl="/"
          afterSignUpUrl="/"
          afterSignInUrl="/"
        />
      </div>
    </div>
  );
}