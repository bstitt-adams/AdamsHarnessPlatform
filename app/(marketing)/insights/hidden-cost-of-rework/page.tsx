import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Calendar, Clock, User } from "lucide-react";

export const metadata: Metadata = {
  title: "The Hidden Cost of Rework in Electrical Construction",
  description: "Rework costs far more than the labor to redo it. Where rework really comes from in electrical projects and how coordination eliminates it.",
  keywords: ["rework", "coordination", "clash detection", "BIM", "project cost"],
  openGraph: {
    title: "The Hidden Cost of Rework in Electrical Construction",
    description: "Rework costs far more than the labor to redo it. Where rework really comes from in electrical projects and how coordination eliminates it.",
    type: "article",
    publishedTime: "2025-10-25",
    authors: ["Adams Electric"],
    images: [{ url: "https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", width: 1260, height: 750, alt: "Workers coordinating installation in a ceiling space" }]
  }
};

export default function ArticlePage() {
  return (
    <article className="min-h-screen bg-white">
      <div className="relative h-[60vh] min-h-[500px] bg-slate-900">
        <Image src="https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="Workers coordinating installation in a ceiling space" fill className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-16">
            <Badge className="mb-4 bg-blue-600 text-white">Coordination</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl mb-4">The Hidden Cost of Rework in Electrical Construction</h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-300">
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />October 25, 2025</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" />5 min read</span>
              <span className="flex items-center gap-2"><User className="h-4 w-4" />Adams Electric Team</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-16">
        <div className="grid lg:grid-cols-[1fr,320px] gap-12">
          <div className="max-w-3xl">
            <Link href="/insights" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8"><ArrowLeft className="h-4 w-4 mr-2" />Back to Insights</Link>

            <p className="text-xl text-muted-foreground leading-relaxed mb-8">Rework doesn&apos;t just cost the labor to fix it—it costs the schedule, the crew&apos;s momentum, and the owner&apos;s confidence.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">The true cost is compounding</h2>
            <p className="text-lg leading-relaxed mb-6">Redo the labor, reorder the material, reschedule the crew, delay the trade behind you—and then explain it. Rework multiplies quietly and shows up loudly.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Most rework is born upstream</h2>
            <p className="text-lg leading-relaxed mb-6">Field rework usually traces to a design conflict, a missing answer, or a procurement miss—not a careless installer. Fixing the upstream cause is where the leverage is.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Clash coordination is cheap insurance</h2>
            <p className="text-lg leading-relaxed mb-6">Resolving conflicts in a coordinated model costs a fraction of resolving them in a congested ceiling. BIM coordination is the most reliable rework-reduction tool available.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Information flow is the other half</h2>
            <p className="text-lg leading-relaxed mb-6">Unanswered RFIs and stale drawings cause as much rework as physical clashes. A disciplined loop between field and office keeps crews building the current design.</p>

            <Separator className="my-8" />

            <h2 className="text-2xl font-bold mb-4">Key Takeaways</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Rework costs compound beyond the fix</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Solve causes upstream, not symptoms in the field</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Coordination and information flow prevent most rework</span></li>
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
