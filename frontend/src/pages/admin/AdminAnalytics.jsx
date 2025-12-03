// src/pages/admin/AdminAnalytics.jsx
import React, { useEffect, useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { api, parseApiError } from "../../utils/api.js";
import Loader from "../../components/loader.jsx";
import Notification from "../../components/Notification.jsx";
import {
  ChartBarIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  EyeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ChartPieIcon,
  UsersIcon,
  TagIcon,
  BanknotesIcon,
  GlobeAltIcon,
  GiftIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function AdminAnalytics() {
  const { user, session } = useClerk();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("month");

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info"
  });

  const showNotification = (message, type = "info") => {
    setNotification({
      show: true,
      message,
      type
    });

    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const loadAnalytics = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const token = await session.getToken();
      const data = await api(`/products/analytics/platform?timeRange=${timeRange}`, "GET", null, token);
      
      console.log("Analytics response:", data);
      
      if (data?.success) {
        setAnalytics(data);
      } else {
        throw new Error(data?.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error("Analytics load error:", err);
      const parsedError = parseApiError(err);
      setError(parsedError.message);
      showNotification("Failed to load analytics: " + parsedError.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [user?.id, timeRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-KE').format(num || 0);
  };

  const getPercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (loading) return <Loader />;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Platform Analytics
                </h1>
                <p className="text-gray-600 mt-2">
                  Comprehensive insights and metrics for your marketplace
                </p>
              </div>
              
              {/* Time Range Selector */}
              <div className="flex gap-2 mt-4 md:mt-0">
                {["day", "week", "month", "year"].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                      timeRange === range
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {range}
                  </button>
                ))}
                <button
                  onClick={loadAnalytics}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {analytics ? (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatNumber(analytics.overview?.totalUsers || analytics.totalUsers || 0)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <ArrowUpIcon className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-600">
                          +{analytics.userStats?.newUsersLast30Days || analytics.newUsersLast30Days || 0} this month
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <UsersIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Listings</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {formatNumber(analytics.overview?.activeListings || analytics.activeListings || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total: {formatNumber(analytics.overview?.totalListings || analytics.totalListings || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <ShoppingBagIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {formatCurrency(analytics.overview?.totalRevenue || analytics.totalRevenue || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatNumber(analytics.overview?.soldItems || analytics.soldItems || 0)} items sold
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <BanknotesIcon className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Price</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {formatCurrency(analytics.overview?.averagePrice || analytics.averagePrice || 0)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-blue-600">
                          {analytics.performance?.conversionRate || analytics.conversionRate || 0}% conversion
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <ChartPieIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* User Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <UserGroupIcon className="w-5 h-5" />
                      User Statistics
                    </h2>
                    <UsersIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Regular Users</span>
                      <span className="font-bold text-gray-900">
                        {formatNumber(analytics.userStats?.regularUsers || analytics.regularUsers || 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700">Sellers</span>
                      <span className="font-bold text-blue-900">
                        {formatNumber(analytics.userStats?.sellers || analytics.sellers || 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-700">Active Sellers</span>
                      <span className="font-bold text-purple-900">
                        {formatNumber(analytics.userStats?.activeSellers || analytics.activeSellers || 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <span className="text-emerald-700">New Users (30 days)</span>
                      <span className="font-bold text-emerald-900">
                        {formatNumber(analytics.userStats?.newUsersLast30Days || analytics.newUsersLast30Days || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <ChartBarIcon className="w-5 h-5" />
                      Performance Metrics
                    </h2>
                    <ArrowTrendingUpIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Conversion Rate</span>
                      <span className="font-bold text-gray-900">
                        {analytics.performance?.conversionRate || analytics.conversionRate || 0}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-orange-700">Avg Views per Listing</span>
                      <span className="font-bold text-orange-900">
                        {formatNumber(analytics.performance?.avgViewsPerListing || analytics.avgViewsPerListing || 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700">Avg Revenue per Sale</span>
                      <span className="font-bold text-green-900">
                        {formatCurrency(analytics.performance?.avgRevenuePerSale || analytics.avgRevenuePerSale || 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg">
                      <span className="text-rose-700">Donation Listings</span>
                      <span className="font-bold text-rose-900">
                        {formatNumber(analytics.overview?.donationCount || analytics.donationCount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Distribution */}
              {analytics.categoryStats?.topCategories && analytics.categoryStats.topCategories.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <TagIcon className="w-5 h-5" />
                      Top Categories
                    </h2>
                    <span className="text-sm text-gray-500">
                      {analytics.categoryStats.totalCategories || 0} categories total
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {analytics.categoryStats.topCategories.map((cat, index) => (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">
                            {index + 1}. {cat.category}
                          </span>
                          <span className="font-bold text-gray-900">
                            {formatNumber(cat.count)} listings
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full"
                            style={{
                              width: `${(cat.count / (analytics.overview?.totalListings || analytics.totalListings || 1)) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Growth */}
              {analytics.monthlyGrowth && analytics.monthlyGrowth.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Monthly Performance
                  </h2>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-gray-600 font-medium">Month</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-medium">Listings</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-medium">Sold</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-medium">Revenue</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-medium">Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.monthlyGrowth.map((month, index) => {
                          const prevMonth = analytics.monthlyGrowth[index - 1];
                          const growth = prevMonth ? getPercentageChange(month.listings, prevMonth.listings) : 100;
                          
                          return (
                            <tr key={`${month.month}-${month.year}`} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">
                                {month.month} {month.year}
                              </td>
                              <td className="py-3 px-4">
                                {formatNumber(month.listings)}
                              </td>
                              <td className="py-3 px-4">
                                {formatNumber(month.sold)}
                              </td>
                              <td className="py-3 px-4 font-medium text-green-600">
                                {formatCurrency(month.revenue)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  {growth >= 0 ? (
                                    <>
                                      <ArrowUpIcon className="w-4 h-4 text-green-500" />
                                      <span className="text-green-600 font-medium">
                                        +{growth}%
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDownIcon className="w-4 h-4 text-red-500" />
                                      <span className="text-red-600 font-medium">
                                        {growth}%
                                      </span>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      <EyeIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900">Total Views</h3>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        {formatNumber(analytics.overview?.totalViews || analytics.totalViews || 0)}
                      </p>
                    </div>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Combined views across all listings
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      <GiftIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900">Donations</h3>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {formatNumber(analytics.overview?.donationCount || analytics.donationCount || 0)}
                      </p>
                    </div>
                  </div>
                  <p className="text-green-700 text-sm">
                    Free items helping the community
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      <GlobeAltIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-purple-900">Platform Health</h3>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {analytics.performance?.conversionRate || analytics.conversionRate || 0}%
                      </p>
                    </div>
                  </div>
                  <p className="text-purple-700 text-sm">
                    Overall conversion rate
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <ChartBarIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No analytics data</h3>
              <p className="text-gray-600 mb-6">
                {error ? "Failed to load analytics" : "Analytics data is not available yet"}
              </p>
              <button
                onClick={loadAnalytics}
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <ArrowTrendingUpIcon className="w-5 h-5" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notification */}
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
      />
    </>
  );
}