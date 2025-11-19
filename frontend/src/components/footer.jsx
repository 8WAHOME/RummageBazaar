import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          © {new Date().getFullYear()} <span className="font-semibold">RummageBazaar</span> — Promote reuse • Support SDG 12 ♻️
        </div>

        <div className="flex gap-4 text-sm">
          <a href="#" className="hover:text-emerald-600">Privacy</a>
          <a href="#" className="hover:text-emerald-600">Terms</a>
          <a href="#" className="hover:text-emerald-600">Support</a>
        </div>
      </div>
    </footer>
  );
}
