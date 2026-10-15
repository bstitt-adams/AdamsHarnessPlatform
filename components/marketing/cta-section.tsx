import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Phone } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-primary text-primary-foreground">
      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to Become an OEM-Qualified Supplier?
          </h2>
          <p className="mt-6 text-lg opacity-90 max-w-2xl mx-auto">
            Take the first step toward winning OEM contracts. Get a free assessment 
            of your current operations and a customized roadmap to supplier qualification.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 bg-white text-primary hover:bg-white/90"
              asChild
            >
              <Link href="/contact">
                <Calendar className="mr-2 h-5 w-5" />
                Schedule Free Assessment
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-white/30 text-white hover:bg-white/10"
              asChild
            >
              <Link href="tel:+1-555-123-4567">
                <Phone className="mr-2 h-5 w-5" />
                Call (555) 123-4567
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
            <div>
              <div className="text-3xl font-bold">Free</div>
              <div className="text-sm opacity-80">Assessment</div>
            </div>
            <div>
              <div className="text-3xl font-bold">30 min</div>
              <div className="text-sm opacity-80">Discovery Call</div>
            </div>
            <div>
              <div className="text-3xl font-bold">No</div>
              <div className="text-sm opacity-80">Obligation</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
