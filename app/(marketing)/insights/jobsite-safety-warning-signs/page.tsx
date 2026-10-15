import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Calendar, Clock, User } from "lucide-react";

export const metadata: Metadata = {
  title: "5 Jobsite Safety Warning Signs Every Electrical Contractor Should Watch",
  description: "Recognizing early warning signs on the jobsite is the first step to preventing incidents. Here are five signals that your safety program needs attention.",
  keywords: ["jobsite safety", "electrical safety", "construction safety", "warning signs", "safety culture"],
  openGraph: {
    title: "5 Jobsite Safety Warning Signs Every Electrical Contractor Should Watch",
    description: "Recognizing early warning signs on the jobsite is the first step to preventing incidents. Here are five signals that your safety program needs attention.",
    type: "article",
    publishedTime: "2025-10-25",
    authors: ["Adams Electric"],
    images: [{ url: "https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", width: 1260, height: 750, alt: "Electricians reviewing safety plan on a jobsite" }]
  }
};

export default function ArticlePage() {
  return (
    <article className="min-h-screen bg-white">
      <div className="relative h-[60vh] min-h-[500px] bg-slate-900">
        <Image src="https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="Electricians reviewing safety plan on a jobsite" fill className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-16">
            <Badge className="mb-4 bg-blue-600 text-white">Safety</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl mb-4">5 Jobsite Safety Warning Signs Every Electrical Contractor Should Watch</h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-300">
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />December 15, 2025</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" />8 min read</span>
              <span className="flex items-center gap-2"><User className="h-4 w-4" />Adams Electric Team</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-16">
        <div className="grid lg:grid-cols-[1fr,320px] gap-12">
          <div className="max-w-3xl">
            <Link href="/insights" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8"><ArrowLeft className="h-4 w-4 mr-2" />Back to Insights</Link>

            <p className="text-xl text-muted-foreground leading-relaxed mb-8">A strong safety record is built long before an incident happens. These five warning signs tell you when a jobsite is drifting toward risk.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Inconsistent PPE and housekeeping</h2>
            <p className="text-lg leading-relaxed mb-6">When personal protective equipment use becomes optional or housekeeping slips, it signals that standards are being traded for schedule. Small lapses compound quickly in electrical work, where arc flash, falls, and struck-by hazards are unforgiving.</p>
            <p className="text-lg leading-relaxed mb-6">The fix is boring but effective: daily walkthroughs, visible expectations, and foremen who model the standard on every task.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Safety meetings that are check-the-box</h2>
            <p className="text-lg leading-relaxed mb-6">If toolbox talks are read verbatim from a sheet while crews tune out, the meeting is paperwork, not prevention. Effective pre-task planning discusses the actual hazards of today&apos;s work and invites the crew to speak up.</p>
            <p className="text-lg leading-relaxed mb-6">Ask a simple test: can the newest person on the crew stop work without fear? If not, the safety voice is missing.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Schedule pressure overriding planning</h2>
            <p className="text-lg leading-relaxed mb-6">Every project feels schedule pressure. The warning sign is when that pressure short-circuits planning—energized work without a plan, rushed lifts, or skipped lockout/tagout verification.</p>
            <p className="text-lg leading-relaxed mb-6">Teams that plan the work around the schedule, not the other way around, consistently deliver both safer and faster.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">Near misses that go unreported</h2>
            <p className="text-lg leading-relaxed mb-6">Near misses are free lessons. When crews stop reporting them, the organization loses its early-warning system and incidents become the teacher instead.</p>
            <p className="text-lg leading-relaxed mb-6">Make reporting easy, blame-free, and visibly acted on. What gets reported and fixed today prevents the recordable tomorrow.</p>
            <h2 className="text-2xl font-bold mb-4 mt-10">New workers left to learn by osmosis</h2>
            <p className="text-lg leading-relaxed mb-6">Electrical work has no margin for on-the-job guesswork. If apprentices and new hires aren&apos;t paired with mentors and briefed on job-specific hazards, risk is being imported unknowingly.</p>
            <p className="text-lg leading-relaxed mb-6">Structured orientation, mentorship, and task-specific training turn new workers into safe, productive team members faster.</p>

            <Separator className="my-8" />

            <h2 className="text-2xl font-bold mb-4">Key Takeaways</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Daily pre-task planning beats checkbox safety meetings</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Near-miss reporting is your early-warning system</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" /><span className="text-lg">Mentorship is a safety control, not a perk</span></li>
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
                  <Link href="/insights/workforce-development-checklist" className="block group"><p className="font-medium group-hover:text-blue-600">The Workforce Development Checklist Every Electrical Contractor Needs</p><p className="text-sm text-muted-foreground">Workforce &bull; 6 min read</p></Link>
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
