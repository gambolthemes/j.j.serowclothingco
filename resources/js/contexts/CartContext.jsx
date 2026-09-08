import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getCart, saveCart } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const CartContext = createContext(null);
const STORAGE_KEY = "jjserow_cart_v1";
/* Long enough that dragging a set count from 10 to 60 is one request, short
   enough that closing the laptop straight after still saves. */
const PUSH_DELAY_MS = 700;

const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

const writeLocal = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* private mode, or storage full — the account copy is the real one anyway */
  }
};

/** The identity of a cart line: same product, colour, ratio and options. */
export const lineKey = (item) =>
  [item.productId, item.colorName, JSON.stringify(item.ratio), item.privateLabel, item.sample].join("|");

/**
 * Folds the cart sitting in this browser into the one stored on the account.
 *
 * Where both sides have the same line the larger set count wins rather than the
 * sum: the usual reason a line exists on both is that it was already synced
 * from the other device, and adding them would silently double the order.
 */
export const mergeCarts = (local, remote) => {
  const byKey = new Map((remote ?? []).map((item) => [item.key, item]));

  (local ?? []).forEach((item) => {
    const existing = byKey.get(item.key);
    byKey.set(item.key, existing ? { ...existing, sets: Math.max(existing.sets, item.sets) } : item);
  });

  return [...byKey.values()];
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [items, setItems] = useState(readLocal);
  const [syncing, setSyncing] = useState(false);

  /* Which account the in-memory cart has been reconciled against. `undefined`
     means "not reconciled yet", which is what keeps the push effect below from
     firing an empty cart at the server before the pull has answered. */
  const reconciledFor = useRef(undefined);
  const lastPushed = useRef(null);

  // The local copy is kept for everyone: it is the whole cart for a guest, and
  // for a signed-in retailer it is what survives a reload before the pull lands.
  useEffect(() => writeLocal(items), [items]);

  useEffect(() => {
    let cancelled = false;
    const previous = reconciledFor.current;

    if (userId === null) {
      // Signed out. Whatever is in this browser belongs to the account that
      // just left, so it must not greet the next person to use this machine.
      if (previous !== undefined && previous !== null) setItems([]);
      reconciledFor.current = null;
      lastPushed.current = null;

      return undefined;
    }

    if (previous === userId) return undefined;

    setSyncing(true);

    getCart()
      .then((remote) => {
        if (cancelled) return;

        // Only a first sign-in merges the browser's cart up. A *different*
        // account on the same browser adopts its own cart outright — merging
        // would hand it the previous retailer's lines.
        const local = previous === undefined || previous === null ? readLocal() : [];

        // Both refs are set before the state update, because that update is
        // what runs the push effect and it has to see them.
        reconciledFor.current = userId;
        lastPushed.current = JSON.stringify(remote ?? []);
        setItems(mergeCarts(local, remote));
      })
      .catch(() => {
        // Offline, or the session died. Keep working from the local copy and
        // stay unreconciled, so nothing is pushed over a cart we failed to read.
        if (!cancelled) reconciledFor.current = undefined;
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (userId === null || reconciledFor.current !== userId) return undefined;

    const payload = JSON.stringify(items);
    if (payload === lastPushed.current) return undefined;

    const timer = setTimeout(() => {
      saveCart(items)
        .then(() => {
          lastPushed.current = payload;
        })
        .catch(() => {
          /* Left unmarked so the next change tries again. */
        });
    }, PUSH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [items, userId]);

  const addItem = useCallback((item) => {
    const key = lineKey(item);

    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);

      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, sets: i.sets + item.sets } : i));
      }

      return [...prev, { ...item, key }];
    });
  }, []);

  const updateSets = useCallback(
    (key, sets) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, sets } : i))),
    []
  );

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateSets,
      removeItem,
      clear,
      syncing,
      count: items.reduce((a, i) => a + i.sets, 0),
    }),
    [items, addItem, updateSets, removeItem, clear, syncing]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);

export default CartContext;
