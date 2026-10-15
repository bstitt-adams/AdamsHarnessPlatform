"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Calendar,
  Ticket,
} from "lucide-react";
import { useEventCart } from "@/contexts/event-cart-context";
import { formatPrice } from "@/lib/format-price";
import { format } from "date-fns";

export function CartSheet() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
    getSubtotal,
  } = useEventCart();

  const itemCount = getItemCount();
  const subtotal = getSubtotal();

  // Group items by event
  const itemsByEvent = items.reduce((acc, item) => {
    if (!acc[item.eventId]) {
      acc[item.eventId] = {
        eventTitle: item.eventTitle,
        eventSlug: item.eventSlug,
        eventDate: item.eventDate,
        items: [],
      };
    }
    acc[item.eventId].items.push(item);
    return acc;
  }, {} as Record<string, { eventTitle: string; eventSlug: string; eventDate: Date; items: typeof items }>);

  const handleCheckout = (eventId: string, eventSlug: string) => {
    setOpen(false);
    router.push(`/events/${eventSlug}/checkout`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
            {itemCount > 0 && (
              <Badge variant="secondary">{itemCount} tickets</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground">
              Browse our events and add tickets to get started.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 py-4">
                {Object.entries(itemsByEvent).map(([eventId, eventData]) => (
                  <div key={eventId} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold line-clamp-1">
                          {eventData.eventTitle}
                        </h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(eventData.eventDate, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {eventData.items.map((item) => (
                        <div
                          key={`${item.eventId}-${item.ticketTypeId}`}
                          className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {item.ticketTypeName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.price)} each
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateQuantity(
                                    item.eventId,
                                    item.ticketTypeId,
                                    item.quantity - 1
                                  )
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateQuantity(
                                    item.eventId,
                                    item.ticketTypeId,
                                    item.quantity + 1
                                  )
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() =>
                                removeItem(item.eventId, item.ticketTypeId)
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-medium">Event Subtotal</span>
                      <span className="font-semibold">
                        {formatPrice(
                          eventData.items.reduce(
                            (sum, item) => sum + item.price * item.quantity,
                            0
                          )
                        )}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(eventId, eventData.eventSlug)}
                    >
                      Checkout for this Event
                    </Button>

                    <Separator />
                  </div>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="flex-col gap-3 sm:flex-col border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
