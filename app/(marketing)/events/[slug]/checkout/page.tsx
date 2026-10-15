"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Ticket,
  CreditCard,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { useEventCart } from "@/contexts/event-cart-context";
import { formatPrice } from "@/lib/format-price";
import { format } from "date-fns";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { COLLECTIONS, type EventDoc } from "@/lib/schema";
import Link from "next/link";

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
}

export default function EventCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { items, getEventItems, clearEventItems } = useEventCart();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
  });

  const cartItems = event ? getEventItems(event.id) : [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Load event by slug
  useEffect(() => {
    const loadEvent = async () => {
      if (!db || !slug) {
        setLoading(false);
        return;
      }

      try {
        const eventsRef = collection(db, COLLECTIONS.EVENTS);
        const q = query(eventsRef, where("slug", "==", slug));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const eventData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as EventDoc;
          setEvent(eventData);
        }
      } catch (error) {
        console.error("Error loading event:", error);
        toast.error("Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [slug]);

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!customerInfo.firstName.trim()) {
      toast.error("First name is required");
      return false;
    }
    if (!customerInfo.lastName.trim()) {
      toast.error("Last name is required");
      return false;
    }
    if (!customerInfo.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateForm() || !event) return;

    setProcessing(true);

    try {
      const tickets = cartItems.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          tickets,
          customerInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Handle free events
      if (data.isFree) {
        clearEventItems(event.id);
        router.push(data.redirectUrl);
        return;
      }

      // Redirect to Stripe Checkout URL
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The event you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/events">Browse Events</Link>
        </Button>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <Ticket className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-4">No Tickets Selected</h1>
        <p className="text-muted-foreground mb-6">
          Please select tickets before proceeding to checkout.
        </p>
        <Button asChild>
          <Link href={`/events/${slug}`}>Back to Event</Link>
        </Button>
      </div>
    );
  }

  const eventDate = event.startDate?.toDate?.() || new Date();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Back Link */}
        <Link
          href={`/events/${slug}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  We'll send your tickets to this email address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={customerInfo.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={customerInfo.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={customerInfo.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
                <CardDescription>
                  Secure payment powered by Stripe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">Secure Checkout</p>
                    <p className="text-sm text-muted-foreground">
                      You'll be redirected to Stripe's secure payment page to complete your purchase.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold line-clamp-2">{event.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(eventDate, "EEEE, MMMM d, yyyy")}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Tickets */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={`${item.eventId}-${item.ticketTypeId}`}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.ticketTypeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-lg font-bold">
                    {subtotal === 0 ? "Free" : formatPrice(subtotal)}
                  </span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : subtotal === 0 ? (
                    "Complete Registration"
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Pay {formatPrice(subtotal)}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
