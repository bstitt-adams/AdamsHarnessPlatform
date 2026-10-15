import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Calendar, Clock, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Project Closeout Best Practices for Electrical Contractors",
  description: "Closeout is where reputations are finished. These practices help electrical contractors turn over projects cleanly and earn the next one.",
  keywords: ["project closeout", "turnover", "commissioning", "punch list", "O&M documentation"],
  openGraph: {
    title: "Project Closeout Best Practices for Electrical Contractors",
    description: "Closeout is where reputations are finished. These practices help electrical contractors turn over projects cleanly and earn the next one.",
    type: "article",
    publishedTime: "2025-10-25",
    authors: ["Adams Electric"],
    images: [{ url: "https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", width: 1260, height: 750, alt: "Completed commercial building at dusk" }]
  }
};

export default function ArticlePage() {
  return (
    <article className="min-h-screen bg-white">
      <div className="relative h-[60vh] min-h-[500px] bg-slate-900">
        <Image src="https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="Completed commercial building at dusk" fill className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-16">
            <Badge className="mb-4 bg-blue-600 text-white">Closeout</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl mb-4">Project Closeout Best Practices for Electrical Contractors</h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-300">
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />November 28, 2025</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" />10 min read</span>
              <span className="flex items-center gap-2"><User className="h-4 w-4" />Adams Electric Team</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-16">
        <div className="grid lg:grid-cols-[1fr,320px] gap-12">
          <div className="max-w-3xl">
            <Link href="/insights" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8"><ArrowLeft className="h-4 w-4 mr-2" />Back to Insights</Link>

            <p className="text-xl text-muted-foreground leading-relaxed mb-8">A project isn&apos;t done when the lights turn on—it&apos;s done when the owner can operate, maintain, and trust what you built.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Start closeout at kickoff</h2>
            <p className="text-lg leading-relaxed mb-6">The best closeouts are planned in preconstruction. Define documentation requirements, commissioning scope, and turnover expectations before work begins so nothing is reconstructed from memory at the end.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Keep the punch list rolling</h2>
            <p className="text-lg leading-relaxed mb-6">A punch list that grows to the end is a schedule risk. Inspect and correct continuously so the final list is short and the finish line stays clean.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Deliver documentation that operators actually use</h2>
            <p className="text-lg leading-relaxed mb-6">O&M manuals, as-builts, panel schedules, and test reports should be organized for the people who will run the building—not just archived for the file.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Support commissioning properly</h2>
            <p className="text-lg leading-relaxed mb-6">Electrical systems are at the heart of commissioning. Resourced, scheduled support for functional testing prevents the last-week scramble.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Close the loop with the owner</h2>
            <p className="text-lg leading-relaxed mb-6">A walkthrough, a warranty conversation, and a clear service contact turn a completed project into a long-term relationship.</p>

            <Separator className="my-8" />

            <h2 className="text-2xl font-bold mb-4">Key Takeaways</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Plan closeout during preconstruction</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Roll the punch list, don&apos;t batch it</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Turnover is the start of the relationship</span></li>
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
                  <Link href="/insights/workforce-development-checklist" className="block group"><p className="font-medium group-hover:text-blue-600">The Workforce Development Checklist Every Electrical Contractor Needs</p><p className="text-sm text-muted-foreground">Workforce &bull; 6 min read</p></Link>
                  <Separator />
                  <Link href="/insights/building-field-leadership-team" className="block group"><p className="font-medium group-hover:text-blue-600">Building a Field Leadership Team You Can Trust</p><p className="text-sm text-muted-foreground">Workforce &bull; 7 min read</p></Link>
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
