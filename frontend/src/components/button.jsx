import React from "react";
import clsx from "clsx";

export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center px-4 py-2 rounded-md font-medium";
  const styles = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline: "border border-emerald-600 text-emerald-600 hover:bg-emerald-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button className={clsx(base, styles[variant], className)} {...props}>
      {children}
    </button>
  );
}
