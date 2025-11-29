// src/components/loadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }) {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`${sizeClasses[size]} border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3`}></div>
      {text && <p className="text-gray-600 font-medium">{text}</p>}
    </div>
  );
}