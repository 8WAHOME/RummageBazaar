import { Link, NavLink, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/clerk-react";
import { useState } from "react";

// NOTE: user sync with the backend is done once in App.jsx (with the Clerk token),
// so it is intentionally not repeated here.

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition ${
    isActive ? "text-emerald-700 bg-emerald-50" : "text-slate-600 hover:text-emerald-700 hover:bg-slate-50"
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useUser();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      setOpen(false);
      await clerk.signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const close = () => setOpen(false);
  const ghostBtn =
    "px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition";
  const solidBtn =
    "px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition";

  return (
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" onClick={close} className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              RB
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900 hidden sm:block">
              Rummage<span className="text-emerald-600">Bazaar</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/browse" className={linkClass}>Browse</NavLink>
            <SignedIn>
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            </SignedIn>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <SignedIn>
              <Link to="/create" className={solidBtn}>+ Sell item</Link>
              {user?.imageUrl && (
                <img src={user.imageUrl} alt="" className="w-9 h-9 rounded-full ring-2 ring-emerald-100 object-cover" />
              )}
              <button onClick={handleSignOut} className={ghostBtn} aria-label="Sign out">Sign out</button>
            </SignedIn>
            <SignedOut>
              <Link to="/sign-in" className={ghostBtn}>Login</Link>
              <Link to="/sign-up" className={solidBtn}>Sign up</Link>
            </SignedOut>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 pt-2 border-t border-slate-100 flex flex-col gap-1">
            <NavLink to="/" end onClick={close} className={linkClass}>Home</NavLink>
            <NavLink to="/browse" onClick={close} className={linkClass}>Browse</NavLink>
            <SignedIn>
              <NavLink to="/dashboard" onClick={close} className={linkClass}>Dashboard</NavLink>
              <Link to="/create" onClick={close} className={`${solidBtn} text-center mt-2`}>+ Sell item</Link>
              <button onClick={handleSignOut} className={`${ghostBtn} mt-1`}>Sign out</button>
            </SignedIn>
            <SignedOut>
              <Link to="/sign-in" onClick={close} className={`${ghostBtn} text-center mt-2`}>Login</Link>
              <Link to="/sign-up" onClick={close} className={`${solidBtn} text-center`}>Sign up</Link>
            </SignedOut>
          </div>
        )}
      </div>
    </nav>
  );
}
