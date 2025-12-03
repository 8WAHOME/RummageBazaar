// src/utils/api.js

export async function api(endpoint, method = "GET", body = null, token = null) {
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const headers = {};;
  
  // Only set content-type and body for non-GET/HEAD requests
  if (body && method !== "GET" && method !== "HEAD") {
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
  }
  
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Don't include body for GET/HEAD requests
  const config = {
    method,
    headers,
  };

  // Only add body for non-GET/HEAD requests
  if (body && method !== "GET" && method !== "HEAD") {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(baseURL + endpoint, config);

  // Handle 204 No Content responses
  if (res.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    const raw = await res.text();
    console.error("❌ Backend did not return JSON. Raw response:", raw);
    throw new Error("Server returned invalid JSON");
  }

  if (!res.ok) {
    throw new Error(data?.message || "API error");
  }

  return data;
}

export async function markProductAsSold(productId, token) {
  return api(`/products/${productId}/sold`, "PATCH", {}, token);
}

// ADD THIS FUNCTION - it's imported in dashboard.jsx
export function parseApiError(error) {
  console.log('parseApiError called with:', error);
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  if (error?.response?.data?.error) {
    return { message: error.response.data.error };
  }
  
  if (error?.response?.data?.message) {
    return { message: error.response.data.message };
  }
  
  if (error?.message) {
    return { message: error.message };
  }
  
  return { message: 'An unknown error occurred. Please try again.' };
}