import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./utils/api.js";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/clerk-react";

import Navbar from "./components/navbar.jsx";
import Footer from "./components/footer.jsx";
import Loader from "./components/loader.jsx";

import Home from "./pages/home.jsx";
import Browse from "./pages/browse.jsx";
import ProductDetail from "./pages/productDetail.jsx";
import Dashboard from "./pages/dashboard.jsx";
import NotFound from "./pages/notFound.jsx";
import SignInPage from "./pages/login.jsx";
import SignUpPage from "./pages/signup.jsx";
import CreateListing from "./pages/createListing.jsx";
import SsoCallback from "./pages/SsoCallback.jsx";

function App() {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // Show loading between route changes
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Sync user with backend
  useEffect(() => {
    if (user && isLoaded) {
      api("/users/sync", "POST", {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        username: user.username
      })
      .then(() => console.log("User synced successfully"))
      .catch(err => console.warn("User sync warning:", err.message));
    }
  }, [user, isLoaded]);

  // Don't render until Clerk is loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading RummageBazaar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation Bar */}
      <Navbar />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-3"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/products" element={<Browse />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/products/:id" element={<ProductDetail />} />

          {/* AUTH PAGES */}
          <Route 
            path="/sign-in/*" 
            element={
              <SignedOut>
                <SignInPage />
              </SignedOut>
            } 
          />
          <Route 
            path="/sign-up/*" 
            element={
              <SignedOut>
                <SignUpPage />
              </SignedOut>
            } 
          />
          
          {/* CLERK SSO CALLBACK ROUTES */}
          <Route 
            path="/sign-in/sso-callback" 
            element={<SsoCallback />} 
          />
          <Route 
            path="/sign-up/sso-callback" 
            element={<SsoCallback />} 
          />

          {/* PROTECTED ROUTES */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/create"
            element={
              <RequireAuth>
                <CreateListing />
              </RequireAuth>
            }
          />

          <Route
            path="/create/:id"
            element={
              <RequireAuth>
                <CreateListing />
              </RequireAuth>
            }
          />

          {/* REDIRECT LEGACY ROUTES */}
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/register" element={<Navigate to="/sign-up" replace />} />
          <Route path="/sell" element={<Navigate to="/create" replace />} />

          {/* CATCH-ALL ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Footer - Hide on auth pages */}
      {!location.pathname.includes('/sign-') && <Footer />}

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton />
    </div>
  );
}

// Protected route component
function RequireAuth({ children }) {
  const location = useLocation();
  
  return (
    <>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn 
          redirectUrl={location.pathname}
        />
      </SignedOut>
    </>
  );
}

// Floating Action Button for quick actions
function FloatingActionButton() {
  const { user } = useUser();
  const location = useLocation();

  // Don't show on auth pages or create page
  if (location.pathname.includes('/sign-') || location.pathname === '/create') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {user ? (
        <a
          href="/create"
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
          title="Create New Listing"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </a>
      ) : (
        <a
          href="/sign-up"
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
          title="Join RummageBazaar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </a>
      )}
    </div>
  );
}

export default App;