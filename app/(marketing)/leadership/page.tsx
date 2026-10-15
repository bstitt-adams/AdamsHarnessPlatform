import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Leadership",
  description:
    "Meet the Adams Electric leadership team guiding electrical construction across the Southeast.",
};

const leadershipTeam = [
  {
    name: "Executive Leadership",
    title: "Adams Electric",
    image: "/team/leadership.jpg",
    expertise: [
      "Third-Generation Family Ownership",
      "Electrical Construction",
      "Strategic Planning",
      "Southeast Operations",
    ],
  },
  {
    name: "PreConstruction & Design",
    title: "PreConstruction Leadership",
    image: "/team/precon.jpg",
    expertise: [
      "Estimating & Budgeting",
      "Design-Build / Design-Assist",
      "Constructability Review",
    ],
  },
  {
    name: "Virtual Design & PreFabrication",
    title: "BIM / VDC Leadership",
    image: "/team/bim.jpg",
    expertise: [
      "BIM / Virtual Design",
      "Clash Coordination",
      "PreFabrication",
      "Field Technology",
    ],
  },
  {
    name: "Field Operations",
    title: "Construction Leadership",
    image: "/team/operations.jpg",
    expertise: [
      "Project Management",
      "Safety Leadership",
      "Workforce Development",
      "Quality Assurance",
    ],
  },
];

export default function LeadershipPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-black text-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
              Our Leadership
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Leadership <span className="text-primary">Team</span>
            </h1>
            <p className="mt-6 text-xl text-gray-300">
              A third-generation, family-owned team leading electrical construction
              across the Southeast since 1928.
            </p>
          </div>
        </div>
      </section>

      {/* Leadership Team Grid */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {leadershipTeam.map((member) => (
              <Card key={member.name} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="sm:w-48 sm:h-auto h-64 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                      <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold">
                        {member.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 flex-1">
                      <h3 className="text-2xl font-bold">{member.name}</h3>
                      <p className="text-lg text-primary font-semibold mt-1">{member.title}</p>
                      
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {member.expertise.map((skill) => (
                            <Badge 
                              key={skill} 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Work With Our Team?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Contact our team to discuss how Adams Electric can support
            your next electrical construction project.
          </p>
          <Button size="lg" className="mt-8 text-lg px-8" asChild>
            <Link href="/contact">
              Contact Our Team
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
