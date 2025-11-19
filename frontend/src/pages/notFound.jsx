import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Page not found.</h1>
        <p className="mt-4">The page you’re looking for doesn’t exist.</p>
        <Link to="/" className="mt-6 inline-block bg-emerald-600 text-white px-4 py-2 rounded">Return home</Link>
      </div>
    </div>
  );
}
