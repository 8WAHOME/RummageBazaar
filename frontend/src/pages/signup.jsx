import React from "react";
import { SignUp } from "@clerk/clerk-react";

export default function Signup() {
  return (
    <div className="max-w-md mx-auto p-6">
      <SignUp 
        routing="path" 
        path="/sign-up" 
        redirectUrl="/"  // Changed from /dashboard to /
        signInUrl="/sign-in"
      />
    </div>
  );
}