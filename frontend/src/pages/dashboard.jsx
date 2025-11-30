import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { api } from "../utils/api.js";
import ProductCard from "../components/productCard.jsx";
import Loader from "../components/loader.jsx";
import {
  ChartBarIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  TrashIcon,
  PencilIcon,
  UserGroupIcon,
  SparklesIcon,
  GiftIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

// Cache management utilities
const DashboardCache = {
  KEY: 'dashboard_cache',
  TTL: 5 * 60 * 1000, // 5 minutes

  get() {
    try {
      const cached = localStorage.getItem(this.KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - timestamp > this.TTL) {
        this.clear();
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading dashboard cache:', error);
      this.clear();
      return null;
    }
  },

  set(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting dashboard cache:', error);
    }
  },

  clear() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (error) {
      console.error('Error clearing dashboard cache:', error);
    }
  }
};

export default function Dashboard() {
  const { user, session } = useClerk();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalListings: 0,
    soldItems: 0,
    activeListings: 0,
    totalRevenue: 0,
    views: 0,
    averagePrice: 0,
    donationCount: 0,
  });

  // FIXED: Use MongoDB role from userProfile instead of Clerk metadata
  const isAdmin = userProfile?.role === "admin";
  const isSeller = userProfile?.role === "seller" || items.length > 0;

  // Calculate analytics from items (fallback)
  const calculateAnalytics = (itemsArray) => {
    const userItems = Array.isArray(itemsArray) ? itemsArray : [];
    const soldItems = userItems.filter(item => item.status === "sold");
    const activeListings = userItems.filter(item => item.status === "active");
    const totalRevenue = soldItems.reduce((sum, item) => sum + (item.price || 0), 0);
    
    return {
      totalListings: userItems.length,
      soldItems: soldItems.length,
      activeListings: activeListings.length,
      totalRevenue,
      views: userItems.reduce((sum, item) => sum + (item.views || 0), 0),
      averagePrice: userItems.length > 0 
        ? Math.round(userItems.reduce((sum, item) => sum + (item.price || 0), 0) / userItems.length)
        : 0,
      donationCount: userItems.filter(p => p.isDonation).length,
    };
  };

  async function load(useCache = true) {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to load from cache first for immediate display
      if (useCache) {
        const cachedData = DashboardCache.get();
        if (cachedData) {
          setItems(cachedData.items || []);
          setAnalytics(cachedData.analytics || calculateAnalytics(cachedData.items || []));
          setUserProfile(cachedData.userProfile || null);
        }
      }

      let userItems = [];
      let analyticsData = {};
      let profileData = null;

      try {
        const token = await session.getToken();
        
        // Load user's products
        const res = await api(`/products?userId=${user.id}`, "GET", null, token);
        userItems = Array.isArray(res) ? res : [];
        setItems(userItems);

        // Load user profile - THIS IS CRITICAL FOR ROLE CHECK
        try {
          const profileResponse = await api(`/users/profile/${user.id}`, "GET", null, token);
          profileData = profileResponse;
          setUserProfile(profileResponse.user);
          console.log('🔐 USER PROFILE LOADED:', {
            email: profileResponse.user?.email,
            role: profileResponse.user?.role,
            isAdmin: profileResponse.user?.role === 'admin'
          });
        } catch (profileError) {
          console.warn("Profile endpoint failed:", profileError);
          // If profile fails, try to sync user first
          try {
            await api("/users/sync", "POST", {
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl,
            }, token);
            console.log('🔄 User synced, retrying profile...');
            const retryProfile = await api(`/users/profile/${user.id}`, "GET", null, token);
            profileData = retryProfile;
            setUserProfile(retryProfile.user);
          } catch (syncError) {
            console.error("User sync also failed:", syncError);
          }
        }

        // Try to load analytics from dedicated endpoint
        try {
          analyticsData = await api(`/products/analytics/seller/${user.id}`, "GET", null, token);
          setAnalytics(analyticsData);
        } catch (analyticsError) {
          console.warn("Analytics endpoint failed, calculating locally:", analyticsError);
          // Fallback to client-side calculation
          analyticsData = calculateAnalytics(userItems);
          setAnalytics(analyticsData);
        }

        // Cache the successful data
        DashboardCache.set({
          items: userItems,
          analytics: analyticsData,
          userProfile: profileData?.user || null
        });

      } catch (fetchError) {
        console.error("Fetch failed:", fetchError);
        throw fetchError;
      }

    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err.message || "Failed to load dashboard data");
      
      // If we have cached data, use it even if fetch failed
      const cachedData = DashboardCache.get();
      if (!cachedData) {
        setError("Unable to load dashboard data. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true); // Enable cache on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAsSold = async (productId) => {
    if (!user?.id) return alert("Not signed in");
    if (!confirm("Mark this listing as SOLD? This will move it to your sales history.")) return;
    
    setBusyId(productId);
    try {
      const token = await session.getToken();
      await api(`/products/${productId}/sold`, "PATCH", {}, token);
      
      // Update local state immediately for better UX
      setItems((prev) => prev.map((p) => 
        p._id === productId ? { ...p, status: "sold", soldAt: new Date() } : p
      ));
      
      // Clear cache and reload fresh data
      DashboardCache.clear();
      await load(false);
      
    } catch (err) {
      console.error("Mark sold error:", err);
      alert(err.message || "Failed to mark as sold");
    } finally {
      setBusyId(null);
    }
  };

  const removeListing = async (productId) => {
    if (!user?.id) return alert("Not signed in");
    if (!confirm("Delete this listing? This action cannot be undone.")) return;
    
    setBusyId(productId);
    try {
      const token = await session.getToken();
      await api(`/products/${productId}`, "DELETE", null, token);
      
      // Update local state immediately
      setItems((prev) => prev.filter((p) => p._id !== productId));
      
      // Clear cache and reload
      DashboardCache.clear();
      await load(false);
      
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message || "Failed to delete listing");
    } finally {
      setBusyId(null);
    }
  };

  const handleRefresh = async () => {
    DashboardCache.clear();
    await load(false);
  };

  // Force user sync if profile is missing
  const forceUserSync = async () => {
    if (!user?.id) return;
    
    try {
      const token = await session.getToken();
      const result = await api("/users/sync", "POST", {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      }, token);
      
      console.log('🔄 FORCE SYNC RESULT:', result);
      alert(`User synced! Role: ${result.user.role}`);
      
      // Reload dashboard
      DashboardCache.clear();
      await load(false);
    } catch (error) {
      console.error('Force sync failed:', error);
      alert('Sync failed: ' + error.message);
    }
  };

  // Filter items for display
  const activeItems = items.filter(item => item.status === "active");
  const soldItems = items.filter(item => item.status === "sold");

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {isAdmin ? "Admin Dashboard" : "Seller Dashboard"}
              </h1>
              <p className="text-gray-600 mt-2">
                {isAdmin 
                  ? "Manage platform, users, and listings" 
                  : "Manage your listings and track your performance"
                }
              </p>
              {error && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                  {error} {DashboardCache.get() && "(Showing cached data)"}
                </div>
              )}
              
              {/* Debug info for admin issues */}
              {user && !isAdmin && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs">
                  <p>Debug: Clerk ID: {user.id}</p>
                  <p>MongoDB Role: {userProfile?.role || 'Not loaded'}</p>
                  <button 
                    onClick={forceUserSync}
                    className="mt-1 bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Force Sync User
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Link 
                to="/create" 
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Create Listing
              </Link>
              <button 
                onClick={handleRefresh} 
                disabled={loading}
                className="border border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        {userProfile && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={userProfile.avatar || user.imageUrl || "/api/placeholder/100/100"}
                    alt={userProfile.name || user.fullName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{userProfile.name || user.fullName}</h2>
                    <p className="text-gray-600">{userProfile.email || user.primaryEmailAddress?.emailAddress}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        userProfile.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : userProfile.role === 'seller'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userProfile.role?.toUpperCase() || 'USER'}
                      </span>
                      {isAdmin && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          ADMIN PRIVILEGES
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Member since</p>
                  <p className="text-gray-900 font-medium">
                    {userProfile.joinedDate ? new Date(userProfile.joinedDate).toLocaleDateString() : 'Recently'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Listings: {analytics.totalListings}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Enhanced Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalListings}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Listings</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{analytics.activeListings}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items Sold</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{analytics.soldItems}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckBadgeIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">KSH {analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{analytics.views}</p>
                <p className="text-xs text-gray-500 mt-1">Your listings</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <EyeIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Donations</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{analytics.donationCount}</p>
              </div>
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <GiftIcon className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Listings Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <SparklesIcon className="w-6 h-6" />
              Active Listings ({activeItems.length})
            </h2>
          </div>

          {activeItems.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingBagIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No active listings</h3>
              <p className="text-gray-600 mb-6">Create a new listing to start selling</p>
              <Link 
                to="/create" 
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Create New Listing
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeItems.map((p) => (
                <div key={p._id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <ProductCard item={p} />
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {/* Admin Edit Button */}
                        {isAdmin && (
                          <button 
                            onClick={() => navigate(`/create?edit=${p._id}`)}
                            disabled={busyId === p._id}
                            className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit Listing (Admin Only)"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}

                        {/* Mark as Sold Button */}
                        <button
                          onClick={() => markAsSold(p._id)}
                          disabled={busyId === p._id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {busyId === p._id ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckBadgeIcon className="w-4 h-4" />
                              Mark Sold
                            </>
                          )}
                        </button>
                      </div>

                      {/* Admin Delete Button */}
                      {isAdmin && (
                        <button
                          onClick={() => removeListing(p._id)}
                          disabled={busyId === p._id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Listing (Admin Only)"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Views Counter - Only show to seller */}
                    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                      <span>{p.views || 0} views</span>
                      {p.isDonation && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                          FREE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sold Items Section */}
        {soldItems.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CheckBadgeIcon className="w-6 h-6 text-green-600" />
                Sold Items ({soldItems.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {soldItems.map((p) => (
                <div key={p._id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 opacity-80">
                  <ProductCard item={p} />
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 px-3 rounded-lg">
                      <CheckBadgeIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Sold for KSH {(p.price || 0).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 text-center text-xs text-gray-500">
                      {p.soldAt ? `Sold on ${new Date(p.soldAt).toLocaleDateString()}` : 'Sale completed'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Admin Panel Section */}
        {isAdmin && (
          <section className="mb-12">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserGroupIcon className="w-6 h-6 text-purple-600" />
                Admin Panel
              </h2>
              <p className="text-gray-600 mb-6">
                Access administrative features and manage platform content.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link 
                  to="/admin/users" 
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <UserGroupIcon className="w-5 h-5" />
                  Manage Users
                </Link>
                <Link 
                  to="/admin/products" 
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <ShoppingBagIcon className="w-5 h-5" />
                  Manage Products
                </Link>
                <Link 
                  to="/admin/analytics" 
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <ChartBarIcon className="w-5 h-5" />
                  Platform Analytics
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}