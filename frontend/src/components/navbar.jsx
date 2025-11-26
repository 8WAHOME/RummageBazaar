import { Link, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { api } from "../utils/api";

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useUser();
  const clerk = useClerk();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sync Clerk user to MongoDB 
  useEffect(() => {
    if (!user) return;

    api("/users/sync", "POST", {
      clerkId: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName,
      avatar: user.imageUrl,
    }).catch(() => {});
  }, [user]);

  const handleSignOut = async () => {
    try {
      await clerk.signOut();
      navigate("/"); // Redirect to home after sign out
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left — Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3" onClick={() => setIsMenuOpen(false)}>
              <div className="w-10 h-10 bg-emerald-600 rounded-md flex items-center justify-center text-white font-bold">
                RB
              </div>
              <div className="text-lg font-semibold text-emerald-700 hidden sm:block">
                RummageBazaar
              </div>
            </Link>
          </div>

          {/* Middle — Desktop Links */}
          <div className="hidden md:flex items-center gap-6 text-gray-700">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
            <Link to="/browse" className="hover:text-emerald-600 transition-colors">Browse</Link>
            <SignedIn>
              <Link
                to="/create"
                className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
              >
                Sell Item
              </Link>
            </SignedIn>
          </div>

          {/* Right — Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            <SignedIn>
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-md border border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                Dashboard
              </Link>

              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-md border border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition-colors"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </SignedIn>

            <SignedOut>
              <Link
                to="/sign-in"
                className="px-4 py-2 rounded-md border border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/sign-up"
                className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Sign Up
              </Link>
            </SignedOut>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-emerald-600 p-2 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 bg-white">
            <div className="flex flex-col space-y-3">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-emerald-600 py-2 px-4 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              
              <Link 
                to="/browse" 
                className="text-gray-700 hover:text-emerald-600 py-2 px-4 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Browse
              </Link>

              <SignedIn>
                <Link 
                  to="/create" 
                  className="text-gray-700 hover:text-emerald-600 py-2 px-4 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sell Item
                </Link>

                <Link 
                  to="/dashboard" 
                  className="text-gray-700 hover:text-emerald-600 py-2 px-4 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>

                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="text-left text-gray-700 hover:text-emerald-600 py-2 px-4 transition-colors"
                >
                  Sign out
                </button>
              </SignedIn>

              <SignedOut>
                <Link 
                  to="/sign-in" 
                  className="text-gray-700 hover:text-emerald-600 py-2 px-4 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  to="/sign-up" 
                  className="text-emerald-600 hover:text-emerald-700 py-2 px-4 transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </SignedOut>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}