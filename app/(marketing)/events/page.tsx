import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Mic,
  BookOpen,
  Star,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Events & Community",
  description:
    "Join Adams Electric events, workshops, and training sessions covering safety, preconstruction, BIM coordination, and workforce development.",
};

const upcomingEvents = [
  {
    id: 1,
    title: "Preconstruction Planning Webinar",
    type: "Webinar",
    date: "January 15, 2026",
    time: "12:00 PM - 1:00 PM EST",
    location: "Virtual (Zoom)",
    description:
      "How early involvement, accurate estimating, and constructability review set electrical projects up for predictable delivery.",
    spots: 47,
    icon: Video,
    featured: true,
  },
  {
    id: 2,
    title: "Field Leadership Meetup",
    type: "Monthly Meetup",
    date: "January 22, 2026",
    time: "8:00 AM - 10:00 AM EST",
    location: "Southeast Region",
    description:
      "Connect with fellow field leaders to share challenges, lessons learned, and workforce development practices.",
    spots: 12,
    icon: Users,
  },
  {
    id: 3,
    title: "BIM Coordination Workshop",
    type: "Workshop",
    date: "February 8, 2026",
    time: "9:00 AM - 4:00 PM EST",
    location: "Southeast Region",
    description:
      "A full-day, hands-on workshop on clash detection, coordination workflows, and prefabrication-ready modeling.",
    spots: 20,
    icon: BookOpen,
  },
  {
    id: 4,
    title: "Ask Adams: Live Q&A Session",
    type: "Live Q&A",
    date: "February 12, 2026",
    time: "12:00 PM - 12:45 PM EST",
    location: "Virtual (Zoom)",
    description:
      "Bring your project delivery questions. Our team answers live with practical guidance you can apply immediately.",
    spots: 100,
    icon: Mic,
  },
];

const pastEvents = [
  {
    title: "Safety Week Kickoff",
    date: "December 2025",
    attendees: 85,
  },
  {
    title: "Field Leadership Workshop",
    date: "November 2025",
    attendees: 24,
  },
  {
    title: "Prefabrication Summit",
    date: "October 2025",
    attendees: 120,
  },
];

const communityBenefits = [
  {
    title: "Monthly Field Sessions",
    description: "Connect with peers facing similar project and workforce challenges.",
  },
  {
    title: "Exclusive Webinars",
    description: "Access to members-only training and Q&A sessions with our team.",
  },
  {
    title: "Resource Library",
    description: "Templates, checklists, and tools to support project delivery.",
  },
  {
    title: "Private Community",
    description: "24/7 access to a network of construction professionals.",
  },
  {
    title: "Early Event Access",
    description: "First access to workshops and events before public registration.",
  },
  {
    title: "Member Discounts",
    description: "Special pricing on training programs and intensive workshops.",
  },
];

export default function EventsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              Events & Community
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Learn, Connect, and{" "}
              <span className="text-blue-400">Build Together</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
              Join events and training sessions focused on safety, preconstruction,
              coordination, and developing the next generation of field leaders.
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
              Mark Your Calendar
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Upcoming Events
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From virtual webinars to in-person workshops, there&apos;s always an opportunity to learn and connect.
            </p>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {upcomingEvents.map((event) => (
              <Card 
                key={event.id} 
                className={`border-0 shadow-lg ${event.featured ? "ring-2 ring-blue-500" : ""}`}
              >
                {event.featured && (
                  <div className="bg-blue-500 text-slate-900 text-center py-2 text-sm font-medium">
                    <Star className="h-4 w-4 inline mr-2" />
                    Featured Event
                  </div>
                )}
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <event.icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary">{event.type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {event.spots} spots available
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                      <p className="text-muted-foreground mb-4">{event.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {event.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </span>
                      </div>
                      <Button className="bg-blue-500 hover:bg-blue-600 text-slate-900">
                        Register Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
                Adams Professional Community
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                You Don&apos;t Have to Build Alone
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Join a community of construction professionals who understand the challenges
                of modern project delivery. The Adams Professional Community is where
                field leaders and project teams come to grow together.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {communityBenefits.map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-slate-900">
                Join the Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="relative">
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    About Adams Electric
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">1928</div>
                      <div className="text-sm text-muted-foreground">Founded</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">3rd Gen</div>
                      <div className="text-sm text-muted-foreground">Family Owned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">Southeast</div>
                      <div className="text-sm text-muted-foreground">Region Served</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">6</div>
                      <div className="text-sm text-muted-foreground">Lifecycle Services</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Past Events */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">Recent Events</h2>
            <p className="mt-2 text-muted-foreground">
              See what our community has been up to
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pastEvents.map((event) => (
              <Card key={event.title} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6 text-slate-600" />
                  </div>
                  <h3 className="font-semibold mb-1">{event.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{event.date}</p>
                  <Badge variant="secondary">{event.attendees} attendees</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container text-center">
          <Calendar className="h-12 w-12 mx-auto mb-6 text-blue-400" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Don&apos;t Miss Our Next Event
          </h2>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Subscribe to get notified about upcoming events, workshops, and community gatherings.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Button
              size="lg"
              className="text-lg px-8 bg-blue-500 hover:bg-blue-600 text-slate-900"
              asChild
            >
              <Link href="/schedule-a-call">
                Schedule a Call
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-white/30 hover:bg-white/10"
              asChild
            >
              <Link href="/academy">
                Visit the Academy
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
