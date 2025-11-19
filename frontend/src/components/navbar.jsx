import { Link, useNavigate } from "react-router-dom";
import { UserButton, SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { api } from "../utils/api";

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useUser();

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

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left — Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-md flex items-center justify-center text-white font-bold">
                RB
              </div>
              <div className="text-lg font-semibold text-emerald-700">
                RummageBazaar
              </div>
            </Link>
          </div>

          {/* Middle — Links */}
          <div className="hidden md:flex items-center gap-6 text-gray-700">
            <Link to="/" className="hover:text-emerald-600">Home</Link>
            <Link to="/browse" className="hover:text-emerald-600">Browse</Link>
            <Link
              to="/create"
              className="bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700"
            >
              Sell Item
            </Link>
          </div>

          {/* Right — Auth */}
          <div className="flex items-center gap-3">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <Link
                to="/sign-in"
                className="px-3 py-1 rounded-md border border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              >
                Login
              </Link>
            </SignedOut>
          </div>

        </div>
      </div>
    </nav>
  );
}
