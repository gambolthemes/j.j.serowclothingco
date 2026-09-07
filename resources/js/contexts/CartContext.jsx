import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "jjserow_cart_v1";

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => {
    const addItem = (item) => {
      const key = [item.productId, item.colorName, JSON.stringify(item.ratio), item.privateLabel, item.sample].join("|");
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) => (i.key === key ? { ...i, sets: i.sets + item.sets } : i));
        }
        return [...prev, { ...item, key }];
      });
    };
    const updateSets = (key, sets) =>
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, sets } : i)));
    const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
    const clear = () => setItems([]);
    const count = items.reduce((a, i) => a + i.sets, 0);
    return { items, addItem, updateSets, removeItem, clear, count };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);

export default CartContext;
