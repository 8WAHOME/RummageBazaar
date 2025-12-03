import React, { useState, useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { api, parseApiError } from '../../utils/api';
import Loader from '../../components/loader';
import {
  ChartBarIcon,
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  EyeIcon,
  GiftIcon,
  TrendingUpIcon,
  ArrowTrendingUpIcon,
  ChartPieIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

export default function AdminAnalytics() {
  const { session } = useClerk();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days'); // 30days, 90days, 6months, alltime
  const [error, setError] = useState(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await session.getToken();
      const response = await api('/products/admin/analytics', 'GET', null, token);
      
      if (response?.success) {
        setAnalytics(response);
      } else {
        throw new Error(response?.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      const parsedError = parseApiError(error);
      setError(parsedError.message);
      showNotification('Failed to load analytics: ' + parsedError.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value}%`;
  };

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <ChartBarIcon className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Failed to load analytics</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadAnalytics}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <ChartBarIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No analytics data available</h3>
            <p className="text-gray-600 mb-6">Start by creating listings to see analytics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChartBarIcon className="w-8 h-8 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
              </div>
              <p className="text-gray-600">Overview of platform performance and metrics</p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="6months">Last 6 Months</option>
                <option value="alltime">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(analytics.overview.totalUsers)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">
                    +{analytics.userStats.newUsersLast30Days} this month
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(analytics.overview.totalListings)}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.overview.activeListings} active</p>
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
                <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(analytics.overview.totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.overview.soldItems} items sold</p>
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
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatNumber(analytics.overview.totalViews)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg: {analytics.performance.avgViewsPerListing} per listing</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <EyeIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Conversion Rate</span>
                <span className="font-semibold text-green-600">
                  {formatPercentage(analytics.performance.conversionRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Price</span>
                <span className="font-semibold text-purple-600">
                  {formatCurrency(analytics.overview.averagePrice)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Revenue per Sale</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(analytics.performance.avgRevenuePerSale)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Donations</span>
                <span className="font-semibold text-rose-600">{analytics.overview.donationCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-blue-600" />
              User Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Regular Users</span>
                <span className="font-semibold text-blue-600">{analytics.userStats.regularUsers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sellers</span>
                <span className="font-semibold text-purple-600">{analytics.userStats.sellers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Admins</span>
                <span className="font-semibold text-green-600">{analytics.userStats.admins}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Sellers</span>
                <span className="font-semibold text-emerald-600">{analytics.userStats.activeSellers}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ChartPieIcon className="w-5 h-5 text-purple-600" />
              Top Categories
            </h3>
            <div className="space-y-3">
              {analytics.categoryStats.topCategories.map((cat, index) => (
                <div key={cat.category} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-emerald-500' :
                      index === 1 ? 'bg-blue-500' :
                      index === 2 ? 'bg-purple-500' :
                      index === 3 ? 'bg-orange-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-gray-600 truncate max-w-[120px]">{cat.category}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{cat.count} listings</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Total Categories: {analytics.categoryStats.totalCategories}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Growth Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600" />
            Monthly Growth (Last 6 Months)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Month</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Listings</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Sold</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analytics.monthlyGrowth.map((month, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{month.month} {month.year}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ 
                              width: `${(month.listings / Math.max(...analytics.monthlyGrowth.map(m => m.listings))) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-gray-700">{month.listings}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-700">{month.sold}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-purple-600">
                        {formatCurrency(month.revenue)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(analytics.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}