"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type EventTicketType } from "@/lib/schema";

export interface CartItem {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventDate: Date;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketDescription?: string;
  price: number; // in cents
  quantity: number;
}

interface EventCartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (eventId: string, ticketTypeId: string) => void;
  updateQuantity: (eventId: string, ticketTypeId: string, quantity: number) => void;
  clearCart: () => void;
  clearEventItems: (eventId: string) => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getEventItems: (eventId: string) => CartItem[];
  isInCart: (eventId: string, ticketTypeId: string) => boolean;
}

const EventCartContext = createContext<EventCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "event-cart";

export function EventCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const cartItems = parsed.map((item: CartItem & { eventDate: string }) => ({
          ...item,
          eventDate: new Date(item.eventDate),
        }));
        setItems(cartItems);
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

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.eventId === item.eventId && i.ticketTypeId === item.ticketTypeId
      );

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }

      // Add new item
      return [...prev, { ...item, quantity }];
    });
  };

  const removeItem = (eventId: string, ticketTypeId: string) => {
    setItems((prev) =>
      prev.filter(
        (item) => !(item.eventId === eventId && item.ticketTypeId === ticketTypeId)
      )
    );
  };

  const updateQuantity = (eventId: string, ticketTypeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(eventId, ticketTypeId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.eventId === eventId && item.ticketTypeId === ticketTypeId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const clearEventItems = (eventId: string) => {
    setItems((prev) => prev.filter((item) => item.eventId !== eventId));
  };

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getEventItems = (eventId: string) => {
    return items.filter((item) => item.eventId === eventId);
  };

  const isInCart = (eventId: string, ticketTypeId: string) => {
    return items.some(
      (item) => item.eventId === eventId && item.ticketTypeId === ticketTypeId
    );
  };

  return (
    <EventCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearEventItems,
        getItemCount,
        getSubtotal,
        getEventItems,
        isInCart,
      }}
    >
      {children}
    </EventCartContext.Provider>
  );
}

export function useEventCart() {
  const context = useContext(EventCartContext);
  if (context === undefined) {
    throw new Error("useEventCart must be used within an EventCartProvider");
  }
  return context;
}
