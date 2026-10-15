"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle,
  ArrowRight,
  MessageCircle,
  Target,
  Users,
  Loader2,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberAvailabilityDoc } from "@/lib/schema";

const benefits = [
  {
    icon: Target,
    title: "Clarity on Your Project",
    description: "We'll talk through scope, schedule, and delivery requirements.",
  },
  {
    icon: Users,
    title: "The Right Team",
    description: "Get connected with the Adams Electric team for your project type.",
  },
  {
    icon: MessageCircle,
    title: "No Pressure, No Pitch",
    description: "This is a genuine conversation about your project needs.",
  },
];

const expectations = [
  "Discuss your project scope, schedule, and goals",
  "Review your Project Readiness results (if you've taken the assessment)",
  "Explore preconstruction, design-assist, and delivery options",
  "Determine how Adams Electric can best support your project",
  "Answer any questions you have about our services",
];

export default function ScheduleCallPage() {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<TeamMemberAvailabilityDoc | null>(null);
  const [bookingSlug, setBookingSlug] = useState<string>("strategy-call");

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!db) return;
      
      try {
        const q = query(
          collection(db, COLLECTIONS.TEAM_MEMBER_AVAILABILITY),
          where("isActive", "==", true)
        );
        const snapshot = await getDocs(q);
        
        let found: TeamMemberAvailabilityDoc | null = null;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TeamMemberAvailabilityDoc;
          if (!found || data.bookingSlug === "strategy-call" || data.teamMemberName.toLowerCase().includes("adams")) {
            found = { ...data, id: docSnap.id };
          }
        });
        
        if (found) {
          setAvailability(found);
          setBookingSlug((found as TeamMemberAvailabilityDoc).bookingSlug);
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailability();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              Project Consultation
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
              Let's Talk About Your{" "}
              <span className="text-blue-400">Project</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Schedule a call with Adams Electric to discuss your electrical
              construction needs and explore how our team can help.
            </p>

            <div className="flex items-center justify-center gap-6 text-gray-400 mb-10">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>30 Minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>Video or Phone</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-400" />
                <span>100% Free</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <Card className="border-0 shadow-xl">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-muted-foreground">Loading booking options...</p>
                </CardContent>
              </Card>
            ) : availability ? (
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardContent className="p-0">
                  <iframe
                    src={`/book/${bookingSlug}`}
                    className="w-full min-h-[700px] border-0"
                    title="Book Your Strategy Call"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-xl">
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-blue-500 mb-6 mx-auto" />
                  <h3 className="text-2xl font-bold mb-4">Book Your Call</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Our scheduling system is being set up. Please use one of these options to book your call.
                  </p>
                  
                  <div className="space-y-4 w-full max-w-sm mx-auto">
                    <Button 
                      size="lg" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      asChild
                    >
                      <a href="https://adams-electric.com" target="_blank" rel="noopener noreferrer">
                        <Phone className="mr-2 h-5 w-5" />
                        Visit adams-electric.com
                      </a>
                    </Button>
                    
                    <div className="text-center text-muted-foreground">or</div>
                    
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <a href="mailto:info@adams-electric.com?subject=Call Request">
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Email to Schedule
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* QR Code Section */}
      {availability && (
        <section className="py-8 bg-slate-50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <Card className="border-0 shadow-md">
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">Quick Booking</CardTitle>
                  <CardDescription>Scan to book on your mobile device</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${bookingSlug}`)}`}
                      alt="Booking QR Code"
                      className="w-48 h-48"
                    />
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      Scan to book instantly
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* What to Expect */}
      <section className="py-16 bg-slate-50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              What to Expect on Your Call
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">During our conversation, we'll:</h3>
                <ul className="space-y-3">
                  {expectations.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="space-y-6">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <benefit.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 md:p-12">
              <blockquote className="text-xl md:text-2xl font-medium mb-6">
                "Build Trust Through Performance."
              </blockquote>
              <div className="font-semibold">Adams Electric</div>
              <div className="text-muted-foreground text-sm">Electrical construction across the Southeast since 1928</div>
            </div>
          </div>
        </div>
      </section>

      {/* Haven't Taken Quiz CTA */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">
              Haven't Taken the Assessment Yet?
            </h2>
            <p className="text-gray-400 mb-8">
              Get more out of your call by taking our free Project Readiness Assessment first. 
              It only takes 2 minutes and will give us valuable insights to discuss.
            </p>
            <Button 
              size="lg" 
              className="bg-blue-500 hover:bg-blue-600 text-slate-900"
              asChild
            >
              <Link href="/quiz-intro">
                Take the Assessment First
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-8">Other Ways to Reach Us</h2>
            
            <div className="grid sm:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6 text-center">
                  <Phone className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Website</h3>
                  <a href="https://adams-electric.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    adams-electric.com
                  </a>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Email</h3>
                  <a href="mailto:info@adams-electric.com" className="text-blue-600 hover:underline text-sm">
                    info@adams-electric.com
                  </a>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md">
                <CardContent className="p-6 text-center">
                  <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Region</h3>
                  <p className="text-muted-foreground text-sm">
                    Serving the Southeast
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
