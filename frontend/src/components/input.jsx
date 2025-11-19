import React from "react";

export default function Input({ label, name, type = "text", value, onChange, placeholder = "", required = false, className = "" }) {
  return (
    <div className={className}>
      {label && <label htmlFor={name} className="block text-sm font-medium mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
    </div>
  );
}
