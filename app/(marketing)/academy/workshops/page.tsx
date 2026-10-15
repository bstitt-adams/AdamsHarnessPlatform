"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Users,
  Video,
  Play,
  MapPin,
  ArrowRight,
} from "lucide-react";

const upcomingWorkshops = [
  {
    id: "1",
    title: "Preconstruction Kickoff Best Practices",
    description: "Learn how to set up budgets, schedules, and long-lead procurement tracking before mobilization.",
    date: "January 15, 2025",
    time: "2:00 PM - 4:00 PM EST",
    type: "live",
    category: "PreConstruction",
    instructor: "Adams Electric",
    spotsTotal: 25,
    spotsRemaining: 12,
    price: "Included with Builder+",
  },
  {
    id: "2",
    title: "Project Closeout Deep Dive",
    description: "A comprehensive workshop on planning documentation from kickoff so turnover is clean and fast.",
    date: "January 22, 2025",
    time: "1:00 PM - 3:30 PM EST",
    type: "live",
    category: "Project Delivery",
    instructor: "Adams Electric",
    spotsTotal: 20,
    spotsRemaining: 8,
    price: "Included with Builder+",
  },
  {
    id: "3",
    title: "Field Leadership Roundtable",
    description: "Discussion-based session on mentoring crew leaders and building field decision-making capacity.",
    date: "January 29, 2025",
    time: "3:00 PM - 5:00 PM EST",
    type: "live",
    category: "Workforce & Leadership",
    instructor: "Adams Electric",
    spotsTotal: 30,
    spotsRemaining: 15,
    price: "Included with Builder+",
  },
  {
    id: "4",
    title: "BIM Coordination Workflows",
    description: "Hands-on session on clash detection, coordination sign-off, and prefabrication-ready modeling.",
    date: "February 5, 2025",
    time: "2:00 PM - 4:00 PM EST",
    type: "live",
    category: "BIM & Prefabrication",
    instructor: "Adams Electric",
    spotsTotal: 25,
    spotsRemaining: 22,
    price: "Included with Builder+",
  },
  {
    id: "5",
    title: "Pre-Task Safety Planning",
    description: "Build daily pre-task planning routines that keep hazard awareness front and center on every crew.",
    date: "February 12, 2025",
    time: "1:00 PM - 3:00 PM EST",
    type: "live",
    category: "Safety",
    instructor: "Adams Electric",
    spotsTotal: 25,
    spotsRemaining: 18,
    price: "Included with Builder+",
  },
];

const pastWorkshops = [
  {
    id: "p1",
    title: "Year-End Project Planning",
    description: "Annual planning workshop to set project delivery standards for the new year.",
    date: "December 15, 2024",
    duration: "2.5 hours",
    type: "recorded",
    category: "PreConstruction",
    attendees: 45,
  },
  {
    id: "p2",
    title: "Workforce Development Workshop",
    description: "Strategies for recruiting, training, and retaining skilled electrical talent.",
    date: "December 8, 2024",
    duration: "2 hours",
    type: "recorded",
    category: "Workforce & Leadership",
    attendees: 38,
  },
  {
    id: "p3",
    title: "Prefabrication Planning Sprint",
    description: "Hands-on workshop to identify and scope prefabrication opportunities on active projects.",
    date: "November 20, 2024",
    duration: "3 hours",
    type: "recorded",
    category: "BIM & Prefabrication",
    attendees: 52,
  },
  {
    id: "p4",
    title: "Coordination Meeting Facilitation",
    description: "Running effective trade coordination meetings that resolve conflicts early.",
    date: "November 10, 2024",
    duration: "2 hours",
    type: "recorded",
    category: "Project Delivery",
    attendees: 29,
  },
];

export default function WorkshopsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="container">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Workshops</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            Join live, interactive workshops led by Adams Electric. Get hands-on guidance,
            ask questions in real-time, and connect with fellow professionals in the field.
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-8">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Workshops</TabsTrigger>
            <TabsTrigger value="recorded">Recorded Workshops</TabsTrigger>
          </TabsList>

          {/* Upcoming Workshops */}
          <TabsContent value="upcoming" className="space-y-6">
            {upcomingWorkshops.map((workshop) => (
              <Card key={workshop.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Date sidebar */}
                  <div className="bg-blue-500 text-white p-6 md:w-48 flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-medium opacity-90">
                      {workshop.date.split(" ")[0]}
                    </div>
                    <div className="text-4xl font-bold">
                      {workshop.date.split(" ")[1].replace(",", "")}
                    </div>
                    <div className="text-sm opacity-90">
                      {workshop.date.split(" ")[2]}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-500/50">
                        <Video className="h-3 w-3 mr-1" />
                        Live Workshop
                      </Badge>
                      <Badge variant="outline">{workshop.category}</Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{workshop.title}</h3>
                    <p className="text-muted-foreground mb-4">{workshop.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {workshop.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {workshop.spotsRemaining} of {workshop.spotsTotal} spots left
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-blue-600">{workshop.price}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button className="bg-blue-500 hover:bg-blue-600 text-slate-900">
                        Register Now
                      </Button>
                      <Button variant="ghost" className="text-blue-600">
                        Add to Calendar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Recorded Workshops */}
          <TabsContent value="recorded">
            <div className="grid md:grid-cols-2 gap-6">
              {pastWorkshops.map((workshop) => (
                <Card key={workshop.id} className="group hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-slate-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-slate-900/40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-6 w-6 text-blue-600 ml-1" />
                      </div>
                    </div>
                    <Badge className="absolute top-3 left-3 bg-slate-900/80 text-white">
                      Recorded
                    </Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Badge variant="outline" className="text-xs">{workshop.category}</Badge>
                      <span>•</span>
                      <span>{workshop.date}</span>
                    </div>
                    <CardTitle className="text-lg">{workshop.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{workshop.description}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {workshop.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {workshop.attendees} attended
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Get Unlimited Workshop Access
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Adams Builder and Adams Master members get priority registration and unlimited access 
            to all live and recorded workshops.
          </p>
          <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-slate-900" asChild>
            <Link href="/academy#pricing">
              View Membership Options
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
