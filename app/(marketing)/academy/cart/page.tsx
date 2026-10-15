"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  BookOpen,
  Loader2,
  CreditCard,
  Shield,
  Lock,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "@/lib/stripe";
import { CoursePrice } from "@/components/academy/shopping-cart";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, subtotal, removeItem, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
  });

  const cancelled = searchParams.get("cancelled");

  const handleCheckout = async () => {
    if (!customerInfo.name.trim() || !customerInfo.email.trim()) {
      toast.error("Please fill in your name and email");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/stripe/course-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseIds: items.map((item) => item.courseId),
          customerInfo: {
            userId: `guest-${Date.now()}`, // In production, use actual user ID
            name: customerInfo.name,
            email: customerInfo.email,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.isFree) {
        // Free courses - enrolled directly
        clearCart();
        router.push(data.redirectUrl);
        return;
      }

      // Redirect to Stripe checkout
      if (data.sessionUrl) {
        clearCart();
        window.location.href = data.sessionUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingCart className="h-20 w-20 text-muted-foreground mb-6" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground text-center mb-8 max-w-md">
            Looks like you haven't added any courses yet. Browse our catalog to find courses that interest you.
          </p>
          <Button asChild size="lg">
            <Link href="/academy">
              <BookOpen className="mr-2 h-5 w-5" />
              Browse Courses
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/academy">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>

      {cancelled && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your checkout was cancelled. Your cart items have been preserved.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Shopping Cart ({items.length})
          </h1>

          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.courseId}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-32 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.courseTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-slate-900/40 flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/academy/courses/${item.courseSlug}`}
                        className="font-semibold hover:text-primary line-clamp-2"
                      >
                        {item.courseTitle}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        By {item.instructorName}
                      </p>
                      <CoursePrice
                        priceInCents={item.priceInCents}
                        compareAtPriceInCents={item.compareAtPriceInCents}
                        isFree={item.priceInCents === 0}
                        className="mt-2"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.courseId)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={clearCart}>
              Clear Cart
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.courseId} className="flex justify-between text-sm">
                    <span className="truncate flex-1 mr-2">{item.courseTitle}</span>
                    <span className="font-medium">
                      {item.priceInCents === 0 ? "Free" : formatPrice(item.priceInCents)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
              <CardDescription>Enter your details to complete purchase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : subtotal === 0 ? (
                  "Enroll Now (Free)"
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay {formatPrice(subtotal)}
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Secure
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  SSL Encrypted
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By completing this purchase, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Secure payment powered by</p>
            <div className="flex justify-center">
              <Badge variant="outline" className="text-sm">
                <CreditCard className="mr-1 h-3 w-3" />
                Stripe
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-4xl py-12">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}
