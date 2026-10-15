"use client";

import { useRouter } from "next/navigation";
import { useCourseCart } from "@/contexts/course-cart-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingCart, 
  X, 
  Trash2, 
  CreditCard,
  BookOpen,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CourseCartDrawer() {
  const router = useRouter();
  const { items, removeItem, clearCart, getSubtotal, isCartOpen, setIsCartOpen } = useCourseCart();
  const { profile, isAuthenticated } = useUserProfile();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleCheckout = async () => {
    if (!isAuthenticated || !profile.id) {
      setIsCartOpen(false);
      router.push("/sign-in?redirect=/academy/courses");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map(item => ({
            courseId: item.courseId,
            courseTitle: item.courseTitle,
            price: item.price,
          })),
          userId: profile.id,
          userEmail: profile.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const subtotal = getSubtotal();

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            {items.length > 0 && (
              <Badge variant="secondary">{items.length}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">
              Browse our courses and add them to your cart.
            </p>
            <Button onClick={() => {
              setIsCartOpen(false);
              router.push("/academy/courses");
            }}>
              Browse Courses
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div key={item.courseId} className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                      {item.thumbnailUrl ? (
                        <img 
                          src={item.thumbnailUrl} 
                          alt={item.courseTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">
                        {item.courseTitle}
                      </h4>
                      {item.instructorName && (
                        <p className="text-xs text-muted-foreground">
                          {item.instructorName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold text-sm">
                          {formatPrice(item.price)}
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(item.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => removeItem(item.courseId)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4 space-y-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-xl font-bold">{formatPrice(subtotal)}</span>
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900" 
                size="lg"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Checkout
                  </>
                )}
              </Button>

              {/* Clear Cart */}
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Cart button to show in header
export function CartButton() {
  const { getItemCount, setIsCartOpen } = useCourseCart();
  const itemCount = getItemCount();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setIsCartOpen(true)}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-blue-500 text-slate-900"
        >
          {itemCount}
        </Badge>
      )}
    </Button>
  );
}
