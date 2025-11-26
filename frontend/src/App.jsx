import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { api } from "./utils/api.js";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/clerk-react";

import Navbar from "./components/navbar.jsx";
import Footer from "./components/footer.jsx";

import Home from "./pages/home.jsx";
import Browse from "./pages/browse.jsx";
import ProductDetail from "./pages/productDetail.jsx";
import Dashboard from "./pages/dashboard.jsx";
import NotFound from "./pages/notFound.jsx";
import SignInPage from "./pages/login.jsx";
import SignUpPage from "./pages/signup.jsx";
import CreateListing from "./pages/createListing.jsx";

function App() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      api("/users/sync", "POST", {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl
      });
    }
  }, [user]);

  return (
    <>
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="min-h-screen flex flex-col justify-between">
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/products" element={<Browse />} />
          <Route path="/products/:id" element={<ProductDetail />} />

          {/* AUTH PAGES */}
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-in/*" element={<SignInPage />} />

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

          {/* CATCH-ALL ROUTE - This is important for SPA */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}

// Optional: create a reusable protected route component
function RequireAuth({ children }) {
  return (
    <>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default App;