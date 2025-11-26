import React from "react";
import { SignIn } from "@clerk/clerk-react";

export default function Login() {
  return (
    <div className="max-w-md mx-auto p-6">
      <SignIn 
        routing="path" 
        path="/sign-in" 
        redirectUrl="/"  // Changed from /dashboard to /
        signUpUrl="/sign-up"
      />
    </div>
  );
}