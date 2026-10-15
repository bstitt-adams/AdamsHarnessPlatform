"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Ticket, ShoppingCart, Check } from "lucide-react";
import { useEventCart, type CartItem } from "@/contexts/event-cart-context";
import { formatPrice } from "@/lib/format-price";
import { type EventTicketType } from "@/lib/schema";
import { toast } from "sonner";

interface TicketSelectorProps {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventDate: Date;
  ticketTypes: EventTicketType[];
  isFreeEvent?: boolean;
}

export function TicketSelector({
  eventId,
  eventTitle,
  eventSlug,
  eventDate,
  ticketTypes,
  isFreeEvent,
}: TicketSelectorProps) {
  const { addItem, getEventItems, isInCart } = useEventCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const cartItems = getEventItems(eventId);

  const getAvailableQuantity = (ticket: EventTicketType) => {
    const inCart = cartItems.find((item) => item.ticketTypeId === ticket.id);
    const cartQuantity = inCart?.quantity || 0;
    return ticket.quantity - ticket.quantitySold - cartQuantity;
  };

  const handleQuantityChange = (ticketId: string, delta: number, maxPerOrder: number, available: number) => {
    setQuantities((prev) => {
      const current = prev[ticketId] || 0;
      const newQuantity = Math.max(0, Math.min(current + delta, maxPerOrder, available));
      return { ...prev, [ticketId]: newQuantity };
    });
  };

  const handleAddToCart = (ticket: EventTicketType) => {
    const quantity = quantities[ticket.id] || 0;
    if (quantity === 0) {
      toast.error("Please select at least 1 ticket");
      return;
    }

    addItem(
      {
        eventId,
        eventTitle,
        eventSlug,
        eventDate,
        ticketTypeId: ticket.id,
        ticketTypeName: ticket.name,
        ticketDescription: ticket.description,
        price: ticket.price,
      },
      quantity
    );

    setQuantities((prev) => ({ ...prev, [ticket.id]: 0 }));
    toast.success(`Added ${quantity} ${ticket.name} ticket${quantity > 1 ? "s" : ""} to cart`);
  };

  const activeTickets = ticketTypes.filter((t) => t.isActive);

  if (activeTickets.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Tickets Available</h3>
          <p className="text-sm text-muted-foreground">
            Tickets for this event are not currently available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          {isFreeEvent ? "Register" : "Get Tickets"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTickets.map((ticket) => {
          const available = getAvailableQuantity(ticket);
          const quantity = quantities[ticket.id] || 0;
          const inCart = isInCart(eventId, ticket.id);
          const cartItem = cartItems.find((item) => item.ticketTypeId === ticket.id);
          const isSoldOut = available <= 0 && !inCart;

          return (
            <div
              key={ticket.id}
              className={`border rounded-lg p-4 ${isSoldOut ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{ticket.name}</h4>
                    {isSoldOut && (
                      <Badge variant="secondary">Sold Out</Badge>
                    )}
                    {inCart && (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        {cartItem?.quantity} in cart
                      </Badge>
                    )}
                  </div>
                  {ticket.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {ticket.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {ticket.price === 0 ? "Free" : formatPrice(ticket.price)}
                  </p>
                  {!isSoldOut && available < 20 && (
                    <p className="text-xs text-orange-600">
                      Only {available} left
                    </p>
                  )}
                </div>
              </div>

              {!isSoldOut && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleQuantityChange(ticket.id, -1, ticket.maxPerOrder, available)
                      }
                      disabled={quantity === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleQuantityChange(ticket.id, 1, ticket.maxPerOrder, available)
                      }
                      disabled={quantity >= Math.min(ticket.maxPerOrder, available)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={() => handleAddToCart(ticket)}
                    disabled={quantity === 0}
                    className="gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                    {quantity > 0 && (
                      <span className="ml-1">
                        ({formatPrice(ticket.price * quantity)})
                      </span>
                    )}
                  </Button>
                </div>
              )}

              {ticket.maxPerOrder < 10 && !isSoldOut && (
                <p className="text-xs text-muted-foreground mt-2">
                  Max {ticket.maxPerOrder} per order
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
