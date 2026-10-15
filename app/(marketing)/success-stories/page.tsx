import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { SuccessStoriesContent } from "@/components/marketing/success-stories-content";

export const metadata: Metadata = {
  title: "Success Stories",
  description:
    "See how Adams Electric delivers electrical construction projects across the Southeast, from preconstruction through closeout.",
};

export default function SuccessStoriesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              Success Stories
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Real Results from{" "}
              <span className="text-blue-400">Real Business Owners</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
              Don&apos;t just take our word for it. See how Adams Electric has helped entrepreneurs 
              across industries build businesses that thrive today and endure for generations.
            </p>
          </div>
        </div>
      </section>

      {/* Dynamic Content from Firestore */}
      <SuccessStoriesContent />
    </>
  );
}
