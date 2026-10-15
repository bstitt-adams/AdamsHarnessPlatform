"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CourseCartItem {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl?: string | null;
  instructorName?: string | null;
  price: number; // in cents
  originalPrice?: number; // in cents, for showing discounts
}

interface CourseCartContextType {
  items: CourseCartItem[];
  addItem: (item: CourseCartItem) => void;
  removeItem: (courseId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  isInCart: (courseId: string) => boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CourseCartContext = createContext<CourseCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "course-cart";

export function CourseCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CourseCartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setItems(parsed);
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

  const addItem = (item: CourseCartItem) => {
    setItems((prev) => {
      // Don't add duplicates - courses can only be purchased once
      if (prev.some((i) => i.courseId === item.courseId)) {
        return prev;
      }
      return [...prev, item];
    });
    setIsCartOpen(true);
  };

  const removeItem = (courseId: string) => {
    setItems((prev) => prev.filter((item) => item.courseId !== courseId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemCount = () => {
    return items.length;
  };

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + item.price, 0);
  };

  const isInCart = (courseId: string) => {
    return items.some((item) => item.courseId === courseId);
  };

  return (
    <CourseCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        getItemCount,
        getSubtotal,
        isInCart,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CourseCartContext.Provider>
  );
}

export function useCourseCart() {
  const context = useContext(CourseCartContext);
  if (context === undefined) {
    throw new Error("useCourseCart must be used within a CourseCartProvider");
  }
  return context;
}
