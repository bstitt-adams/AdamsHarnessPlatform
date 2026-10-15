"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calendar,
  MapPin,
  Video,
  Clock,
  Users,
  Share2,
  ExternalLink,
  Loader2,
  Globe,
  Linkedin,
  Twitter,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { COLLECTIONS, type EventDoc } from "@/lib/schema";
import { TicketSelector } from "@/components/events/ticket-selector";
import { CartSheet } from "@/components/events/cart-sheet";
import Link from "next/link";

export default function EventLandingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);

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
          
          // Only show published events
          if (eventData.status === "published") {
            setEvent(eventData);
          }
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

  const handleShare = async () => {
    if (!event) return;

    const shareData = {
      title: event.title,
      text: event.shortDescription || `Check out ${event.title}!`,
      url: window.location.href,
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

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This event doesn't exist or is no longer available.
        </p>
        <Button asChild>
          <Link href="/events">Browse Events</Link>
        </Button>
      </div>
    );
  }

  const eventDate = event.startDate?.toDate?.() || new Date();
  const endDate = event.endDate?.toDate?.();
  const design = event.landingPageDesign;

  const categoryColors: Record<string, string> = {
    webinar: "bg-blue-100 text-blue-800",
    workshop: "bg-purple-100 text-purple-800",
    conference: "bg-green-100 text-green-800",
    networking: "bg-orange-100 text-orange-800",
    training: "bg-cyan-100 text-cyan-800",
    other: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="min-h-screen">
      {/* Floating Cart Button */}
      <div className="fixed top-4 right-4 z-50">
        <CartSheet />
      </div>

      {/* Hero Section */}
      <section
        className="relative bg-gradient-to-br from-primary/10 via-background to-background py-16 lg:py-24"
        style={design?.theme?.backgroundColor ? { backgroundColor: design.theme.backgroundColor } : undefined}
      >
        {event.imageUrl && (
          <div className="absolute inset-0 opacity-10">
            <img
              src={event.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="container relative max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                {event.category && (
                  <Badge className={categoryColors[event.category] || categoryColors.other}>
                    {event.category}
                  </Badge>
                )}
                {event.isFeatured && (
                  <Badge variant="default">Featured</Badge>
                )}
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                {design?.heroTitle || event.title}
              </h1>

              {(design?.heroSubtitle || event.shortDescription) && (
                <p className="text-xl text-muted-foreground">
                  {design?.heroSubtitle || event.shortDescription}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  <span>
                    {format(eventDate, "EEEE, MMMM d, yyyy")}
                    {endDate && !event.isAllDay && (
                      <> - {format(endDate, "MMMM d, yyyy")}</>
                    )}
                  </span>
                </div>
                {!event.isAllDay && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-5 w-5" />
                    <span>{format(eventDate, "h:mm a")}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                {event.locationType === "virtual" ? (
                  <Video className="h-5 w-5" />
                ) : event.locationType === "hybrid" ? (
                  <Globe className="h-5 w-5" />
                ) : (
                  <MapPin className="h-5 w-5" />
                )}
                <span className="capitalize">{event.locationType}</span>
                {event.location && <span>• {event.location}</span>}
              </div>

              {event.maxAttendees && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-5 w-5" />
                  <span>
                    {event.currentAttendees || 0} / {event.maxAttendees} registered
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <Button size="lg" asChild>
                  <a href="#tickets">Get Tickets</a>
                </Button>
                <Button variant="outline" size="lg" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {event.imageUrl && (
              <div className="hidden lg:block">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="rounded-xl shadow-2xl w-full aspect-video object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Description */}
            {event.description && (
              <section>
                <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{event.description}</p>
                </div>
              </section>
            )}

            {/* Agenda */}
            {event.agenda && event.agenda.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Schedule</h2>
                <div className="space-y-4">
                  {event.agenda.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="text-sm font-medium text-primary min-w-[80px]">
                        {item.time}
                      </div>
                      <div>
                        <h4 className="font-semibold">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Speakers */}
            {event.speakers && event.speakers.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Speakers</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {event.speakers.map((speaker) => (
                    <Card key={speaker.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={speaker.imageUrl} alt={speaker.name} />
                            <AvatarFallback>
                              {speaker.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-semibold">{speaker.name}</h4>
                            {speaker.title && (
                              <p className="text-sm text-muted-foreground">
                                {speaker.title}
                              </p>
                            )}
                            {speaker.company && (
                              <p className="text-sm text-muted-foreground">
                                {speaker.company}
                              </p>
                            )}
                            {speaker.bio && (
                              <p className="text-sm mt-2 line-clamp-3">
                                {speaker.bio}
                              </p>
                            )}
                            {speaker.socialLinks && (
                              <div className="flex gap-2 mt-2">
                                {speaker.socialLinks.linkedin && (
                                  <a
                                    href={speaker.socialLinks.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <Linkedin className="h-4 w-4" />
                                  </a>
                                )}
                                {speaker.socialLinks.twitter && (
                                  <a
                                    href={speaker.socialLinks.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <Twitter className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* FAQ */}
            {event.faq && event.faq.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full">
                  {event.faq.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{item.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {/* Sponsors */}
            {event.sponsors && event.sponsors.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Sponsors</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {event.sponsors.map((sponsor) => (
                    <a
                      key={sponsor.id}
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      {sponsor.logoUrl ? (
                        <img
                          src={sponsor.logoUrl}
                          alt={sponsor.name}
                          className="max-h-12 max-w-full object-contain"
                        />
                      ) : (
                        <span className="font-medium text-center">
                          {sponsor.name}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar - Tickets */}
          <div className="lg:col-span-1">
            <div id="tickets" className="sticky top-6">
              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                <TicketSelector
                  eventId={event.id}
                  eventTitle={event.title}
                  eventSlug={event.slug || event.id}
                  eventDate={eventDate}
                  ticketTypes={event.ticketTypes}
                  isFreeEvent={event.isFreeEvent}
                />
              ) : event.registrationUrl ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Register</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" asChild>
                      <a
                        href={event.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Register Now
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      Registration information coming soon.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Event Details Card */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {format(eventDate, "MMMM d, yyyy")}
                    </p>
                    {!event.isAllDay && (
                      <p className="text-sm text-muted-foreground">
                        {format(eventDate, "h:mm a")}
                        {endDate && ` - ${format(endDate, "h:mm a")}`}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="font-medium capitalize">{event.locationType}</p>
                    {event.location && (
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    )}
                  </div>

                  {event.tags && event.tags.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {event.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
