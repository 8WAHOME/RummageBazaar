import React, { createContext, useState, useEffect } from "react";
import { api } from "../utils/api";

export const ProductContext = createContext();

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api("/products");
      setProducts(data);
    } catch (err) {
      console.error("Load products error", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <ProductContext.Provider value={{ products, loading, reload: load }}>
      {children}
    </ProductContext.Provider>
  );
}
