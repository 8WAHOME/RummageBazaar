// src/pages/admin/AdminProducts.jsx - FULLY UPDATED
import React, { useState, useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { api, parseApiError } from '../../utils/api';
import { notification } from '../../utils/notifications.js';
import Loader from '../../components/loader';
import {
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { FaWhatsapp } from 'react-icons/fa';

export default function AdminProducts() {
  const { session, user } = useClerk();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await session.getToken();
      const response = await api('/products/admin/all', 'GET', null, token);
      
      if (response?.success) {
        setProducts(response.products || []);
      } else if (Array.isArray(response)) {
        setProducts(response);
      } else {
        throw new Error(response?.error || 'Failed to load products');
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      const parsedError = parseApiError(error);
      setError(parsedError.message);
      notification.error(parsedError.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId, productTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${productTitle}"? This action cannot be undone.`)) return;
    
    setDeletingId(productId);
    try {
      const token = await session.getToken();
      const result = await api(`/products/admin/${productId}`, 'DELETE', null, token);
      
      if (result?.success) {
        setProducts(prev => prev.filter(p => p._id !== productId));
        notification.success(`"${productTitle}" deleted successfully`);
      } else {
        throw new Error(result?.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      const parsedError = parseApiError(error);
      notification.error('Failed to delete product: ' + parsedError.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = () => {
    loadProducts();
    notification.info('Refreshing products...');
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-gray-600">Manage all products on the platform</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <FunnelIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="relative">
              <FunnelIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Categories</option>
                {categories.filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                    notification.info('Filters cleared');
                  }}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <XMarkIcon className="w-5 h-5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Products Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isDonation = product.isDonation || Number(product.price || 0) === 0;
            const isSold = product.status === "sold";
            const formattedPhone = product.sellerPhone ? `+254${product.sellerPhone.toString().replace(/\D/g, '').slice(-9)}` : null;
            const whatsappHref = formattedPhone
              ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Hi! I'm interested in "${product.title}" listed for ${isDonation ? "FREE" : `KSH ${(product.price || 0)?.toLocaleString()}`}. Is it still available?`)}`
              : null;

            return (
              <div key={product._id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="relative">
                  <img
                    src={product.images?.[0] || '/api/placeholder/400/300'}
                    alt={product.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => e.target.src = '/api/placeholder/400/300'}
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === 'active' ? 'bg-green-100 text-green-800' :
                      product.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                      product.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {product.status || 'active'}
                    </span>
                    {product.isDonation && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                        FREE
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-gray-900">
                      {isDonation ? 'FREE' : `KSH ${(product.price || 0).toLocaleString()}`}
                    </span>
                    <span className="text-sm text-gray-500">{product.category}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                      <EyeIcon className="w-4 h-4" />
                      <span>{product.views || 0} views</span>
                    </div>
                    <span>{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Unknown date'}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(`/products/${product._id}`, '_blank')}
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 text-sm"
                    >
                      <EyeIcon className="w-4 h-4" />
                      View
                    </button>
                    {whatsappHref && !isSold && (
                      <a 
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <FaWhatsapp className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteProduct(product._id, product.title)}
                      disabled={deletingId === product._id}
                      className="px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {deletingId === product._id ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                ? "Try adjusting your filters" 
                : "No products available yet"}
            </p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Refresh Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}