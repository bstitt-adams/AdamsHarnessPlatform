"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  X,
  Trash2,
  BookOpen,
  Loader2,
} from "lucide-react";
import { formatPrice } from "@/lib/stripe";

export function ShoppingCartButton() {
  const { itemCount, isOpen, openCart, closeCart } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
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
            Shopping Cart
          </SheetTitle>
          <SheetDescription>
            {itemCount === 0
              ? "Your cart is empty"
              : `${itemCount} course${itemCount > 1 ? "s" : ""} in your cart`}
          </SheetDescription>
        </SheetHeader>
        <CartContents />
      </SheetContent>
    </Sheet>
  );
}

function CartContents() {
  const { items, subtotal, removeItem, clearCart, closeCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
        <p className="text-muted-foreground text-center mb-6">
          Browse our courses and add some to your cart
        </p>
        <Button asChild onClick={closeCart}>
          <Link href="/academy">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    closeCart();
    // Navigate to checkout page
    window.location.href = "/academy/cart";
  };

  return (
    <>
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-4 py-4">
          {items.map((item) => (
            <div key={item.courseId} className="flex gap-4">
              <div className="w-20 h-14 rounded-md bg-muted overflow-hidden flex-shrink-0">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.courseTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-slate-900/40 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2">{item.courseTitle}</h4>
                <p className="text-xs text-muted-foreground">{item.instructorName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-sm">
                    {item.priceInCents === 0 ? "Free" : formatPrice(item.priceInCents)}
                  </span>
                  {item.compareAtPriceInCents && item.compareAtPriceInCents > item.priceInCents && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(item.compareAtPriceInCents)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => removeItem(item.courseId)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="pt-4 border-t space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-xl font-bold">{formatPrice(subtotal)}</span>
        </div>
        
        <div className="space-y-2">
          <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isCheckingOut}>
            {isCheckingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Proceed to Checkout"
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={clearCart}>
            Clear Cart
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground">
          Secure checkout powered by Stripe
        </p>
      </div>
    </>
  );
}

export function AddToCartButton({
  courseId,
  courseTitle,
  courseSlug,
  thumbnailUrl,
  instructorName,
  priceInCents,
  compareAtPriceInCents,
  isFree,
  className,
}: {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl: string | null;
  instructorName: string;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  isFree: boolean;
  className?: string;
}) {
  const { addItem, isInCart, openCart } = useCart();

  const handleAddToCart = () => {
    if (isInCart(courseId)) {
      openCart();
      return;
    }

    addItem({
      courseId,
      courseTitle,
      courseSlug,
      thumbnailUrl,
      instructorName,
      priceInCents: isFree ? 0 : priceInCents,
      compareAtPriceInCents,
    });
  };

  const inCart = isInCart(courseId);

  return (
    <Button
      onClick={handleAddToCart}
      variant={inCart ? "secondary" : "default"}
      className={className}
    >
      {inCart ? (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          View Cart
        </>
      ) : isFree ? (
        "Enroll Free"
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </>
      )}
    </Button>
  );
}

export function CoursePrice({
  priceInCents,
  compareAtPriceInCents,
  isFree,
  className,
}: {
  priceInCents: number;
  compareAtPriceInCents: number | null;
  isFree: boolean;
  className?: string;
}) {
  if (isFree || priceInCents === 0) {
    return (
      <div className={className}>
        <Badge variant="secondary" className="text-green-600">Free</Badge>
      </div>
    );
  }

  const hasDiscount = compareAtPriceInCents && compareAtPriceInCents > priceInCents;
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPriceInCents - priceInCents) / compareAtPriceInCents) * 100)
    : 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xl font-bold">{formatPrice(priceInCents)}</span>
      {hasDiscount && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(compareAtPriceInCents)}
          </span>
          <Badge variant="destructive" className="text-xs">
            {discountPercent}% off
          </Badge>
        </>
      )}
    </div>
  );
}
