"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

export interface CartItem {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl: string | null;
  instructorName: string;
  priceInCents: number;
  compareAtPriceInCents: number | null;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "academy_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart from localStorage:", e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isHydrated]);

  const addItem = (item: CartItem) => {
    if (items.some((i) => i.courseId === item.courseId)) {
      toast.info("Course already in cart");
      return;
    }
    setItems((prev) => [...prev, item]);
    toast.success("Added to cart");
    setIsOpen(true);
  };

  const removeItem = (courseId: string) => {
    setItems((prev) => prev.filter((i) => i.courseId !== courseId));
    toast.success("Removed from cart");
  };

  const clearCart = () => {
    setItems([]);
  };

  const isInCart = (courseId: string) => {
    return items.some((i) => i.courseId === courseId);
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const itemCount = items.length;
  const subtotal = items.reduce((acc, item) => acc + item.priceInCents, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isOpen,
        addItem,
        removeItem,
        clearCart,
        isInCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
