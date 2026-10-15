import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Calendar, Clock, User } from "lucide-react";

export const metadata: Metadata = {
  title: "The Workforce Development Checklist Every Electrical Contractor Needs",
  description: "Skilled electricians are made, not found. This checklist covers the fundamentals of building a workforce development program that actually works.",
  keywords: ["workforce development", "electrical apprenticeship", "training", "skilled trades", "career path"],
  openGraph: {
    title: "The Workforce Development Checklist Every Electrical Contractor Needs",
    description: "Skilled electricians are made, not found. This checklist covers the fundamentals of building a workforce development program that actually works.",
    type: "article",
    publishedTime: "2025-10-25",
    authors: ["Adams Electric"],
    images: [{ url: "https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", width: 1260, height: 750, alt: "Apprentice electrician training with a mentor" }]
  }
};

export default function ArticlePage() {
  return (
    <article className="min-h-screen bg-white">
      <div className="relative h-[60vh] min-h-[500px] bg-slate-900">
        <Image src="https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="Apprentice electrician training with a mentor" fill className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-16">
            <Badge className="mb-4 bg-blue-600 text-white">Workforce</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl mb-4">The Workforce Development Checklist Every Electrical Contractor Needs</h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-300">
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />December 10, 2025</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" />6 min read</span>
              <span className="flex items-center gap-2"><User className="h-4 w-4" />Adams Electric Team</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-16">
        <div className="grid lg:grid-cols-[1fr,320px] gap-12">
          <div className="max-w-3xl">
            <Link href="/insights" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8"><ArrowLeft className="h-4 w-4 mr-2" />Back to Insights</Link>

            <p className="text-xl text-muted-foreground leading-relaxed mb-8">The skilled-trades shortage isn&apos;t solved by recruiting alone. Contractors who grow their own talent build stronger, more loyal crews.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Start with a clear career path</h2>
            <p className="text-lg leading-relaxed mb-6">People stay where they can see a future. Define what progression looks like—from apprentice to journeyman to foreman and beyond—and communicate it from day one.</p>
            <p className="text-lg leading-relaxed mb-6">Written skill milestones make advancement objective instead of political.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Pair classroom learning with field mentorship</h2>
            <p className="text-lg leading-relaxed mb-6">Classroom instruction builds knowledge; mentorship builds judgment. Structured pairing of apprentices with experienced journeymen transfers the craft knowledge that never makes it into a textbook.</p>
            <p className="text-lg leading-relaxed mb-6">The best mentors are trained to teach, not just to work.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Invest in supervision training</h2>
            <p className="text-lg leading-relaxed mb-6">The jump from journeyman to foreman is a career change, not a promotion. Planning, communication, and people leadership are separate skills that need their own development track.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Measure skills, not just seat time</h2>
            <p className="text-lg leading-relaxed mb-6">Competency-based advancement—verified skills rather than hours logged—produces more capable tradespeople and makes training gaps visible early.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Make safety part of the curriculum</h2>
            <p className="text-lg leading-relaxed mb-6">Workforce development and safety training are the same investment. Every skill milestone should include the safe way to perform it.</p>

            <Separator className="my-8" />

            <h2 className="text-2xl font-bold mb-4">Key Takeaways</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Visible career paths retain talent</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Mentorship transfers irreplaceable craft knowledge</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Train foremen to lead, not just to build</span></li>
            </ul>

            <Card className="mb-10 bg-slate-900 text-white">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-2">Build with Adams Electric</h3>
                <p className="text-gray-300 mb-4">Adams Electric is a third-generation, family-owned electrical contractor serving the Southeast since 1928. Talk to our team about your next project.</p>
                <div className="flex flex-wrap gap-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild><Link href="/contact">Contact Us<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  <Button variant="outline" className="border-white/30 hover:bg-white/10" asChild><Link href="/services">Our Services</Link></Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Related Articles</h3>
                <div className="space-y-4">
                  <Link href="/insights/jobsite-safety-warning-signs" className="block group"><p className="font-medium group-hover:text-blue-600">5 Jobsite Safety Warning Signs Every Electrical Contractor Should Watch</p><p className="text-sm text-muted-foreground">Safety &bull; 8 min read</p></Link>
                  <Separator />
                  <Link href="/insights/building-field-leadership-team" className="block group"><p className="font-medium group-hover:text-blue-600">Building a Field Leadership Team You Can Trust</p><p className="text-sm text-muted-foreground">Workforce &bull; 7 min read</p></Link>
                  <Separator />
                  <Link href="/insights/project-closeout-best-practices" className="block group"><p className="font-medium group-hover:text-blue-600">Project Closeout Best Practices for Electrical Contractors</p><p className="text-sm text-muted-foreground">Closeout &bull; 10 min read</p></Link>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold mb-2">Start a Conversation</h3>
                <p className="text-sm mb-4">Learn how Adams Electric can support your next electrical construction project.</p>
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white" asChild><Link href="/contact">Get in Touch<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <section className="py-16 bg-slate-50">
        <div className="container max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">Build Trust Through Performance</h2>
          <p className="text-muted-foreground mb-8">From preconstruction through closeout, Adams Electric delivers electrical work you can count on.</p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="lg" asChild><Link href="/contact">Contact Adams Electric<ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
        </div>
      </section>
    </article>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
