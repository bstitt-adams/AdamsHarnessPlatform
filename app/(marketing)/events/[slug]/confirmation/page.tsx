"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Calendar,
  MapPin,
  Ticket,
  Mail,
  Download,
  Share2,
  Loader2,
  Video,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { COLLECTIONS, type EventDoc, type EventRegistration } from "@/lib/schema";
import { formatPrice } from "@/lib/format-price";
import Link from "next/link";

export default function EventConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const sessionId = searchParams.get("session_id");
  const registrationId = searchParams.get("registration_id");

  const [event, setEvent] = useState<EventDoc | null>(null);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!db || !slug) {
        setLoading(false);
        return;
      }

      try {
        // Load event by slug
        const eventsRef = collection(db, COLLECTIONS.EVENTS);
        const eventQuery = query(eventsRef, where("slug", "==", slug));
        const eventSnapshot = await getDocs(eventQuery);

        if (!eventSnapshot.empty) {
          const eventData = { id: eventSnapshot.docs[0].id, ...eventSnapshot.docs[0].data() } as EventDoc;
          setEvent(eventData);

          // Load registration
          if (registrationId) {
            const regRef = doc(db, COLLECTIONS.EVENT_REGISTRATIONS, registrationId);
            const regSnap = await getDoc(regRef);
            if (regSnap.exists()) {
              setRegistration({ id: regSnap.id, ...regSnap.data() } as EventRegistration);
            }
          } else if (sessionId) {
            // Find registration by Stripe session ID
            const regsRef = collection(db, COLLECTIONS.EVENT_REGISTRATIONS);
            const regQuery = query(regsRef, where("stripeSessionId", "==", sessionId));
            const regSnapshot = await getDocs(regQuery);
            if (!regSnapshot.empty) {
              setRegistration({ id: regSnapshot.docs[0].id, ...regSnapshot.docs[0].data() } as EventRegistration);
            }
          }
        }
      } catch (error) {
        console.error("Error loading confirmation data:", error);
        toast.error("Failed to load confirmation details");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, sessionId, registrationId]);

  const handleShare = async () => {
    if (!event) return;

    const shareData = {
      title: event.title,
      text: `I'm attending ${event.title}! Join me!`,
      url: `${window.location.origin}/events/${slug}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Event link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event || !registration) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Confirmation Not Found</h1>
        <p className="text-muted-foreground mb-6">
          We couldn't find your registration details.
        </p>
        <Button asChild>
          <Link href="/events">Browse Events</Link>
        </Button>
      </div>
    );
  }

  const eventDate = event.startDate?.toDate?.() || new Date();
  const isPaid = registration.paymentStatus === "paid";
  const isConfirmed = registration.status === "confirmed";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20">
      <div className="container max-w-3xl mx-auto py-12 px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isConfirmed ? "You're Registered!" : "Registration Pending"}
          </h1>
          <p className="text-muted-foreground">
            {isConfirmed
              ? "Your tickets have been confirmed. Check your email for details."
              : "Your registration is being processed."}
          </p>
        </div>

        {/* Confirmation Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(eventDate, "EEEE, MMMM d, yyyy")}
                  </div>
                  {!event.isAllDay && (
                    <div className="flex items-center gap-1">
                      {format(eventDate, "h:mm a")}
                    </div>
                  )}
                </div>
              </div>
              <Badge variant={isConfirmed ? "default" : "secondary"}>
                {isConfirmed ? "Confirmed" : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location */}
            <div className="flex items-start gap-3">
              {event.locationType === "virtual" ? (
                <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
              ) : (
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              )}
              <div>
                <p className="font-medium capitalize">{event.locationType} Event</p>
                {event.location && (
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                )}
                {event.virtualLink && isConfirmed && (
                  <a
                    href={event.virtualLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Join Virtual Event
                  </a>
                )}
              </div>
            </div>

            <Separator />

            {/* Tickets */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Your Tickets
              </h3>
              <div className="space-y-2">
                {registration.tickets.map((ticket, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium">{ticket.ticketTypeName}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {ticket.quantity}
                      </p>
                    </div>
                    <p className="font-medium">
                      {ticket.totalPrice === 0 ? "Free" : formatPrice(ticket.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Order Total */}
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total Paid</span>
              <span className="text-lg font-bold">
                {registration.total === 0 ? "Free" : formatPrice(registration.total)}
              </span>
            </div>

            <Separator />

            {/* Attendee Info */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Confirmation Sent To
              </h3>
              <p className="text-sm">
                {registration.firstName} {registration.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{registration.email}</p>
            </div>

            {/* Confirmation Number */}
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Confirmation Number</p>
              <p className="font-mono text-lg font-bold">{registration.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Event
          </Button>
          <Button asChild className="flex-1">
            <Link href="/events">Browse More Events</Link>
          </Button>
        </div>

        {/* Add to Calendar Note */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          A calendar invitation has been sent to your email address.
        </p>
      </div>
    </div>
  );
}
