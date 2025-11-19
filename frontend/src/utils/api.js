// src/utils/api.js
export async function api(endpoint, method = "GET", body = null, token = null) {
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const headers = {};
  // If body is plain JSON (not FormData), set content-type
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(baseURL + endpoint, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : null,
  });

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

