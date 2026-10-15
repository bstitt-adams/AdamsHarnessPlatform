import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Adams Electric platform and services.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            Last updated: December 2024
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Adams Electric (&quot;Adams Electric&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our platform and services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Personal Information:</strong> Name, email address, phone number, company name, and job title</li>
              <li><strong>Account Information:</strong> Login credentials and account preferences</li>
              <li><strong>Usage Data:</strong> Information about how you use our platform</li>
              <li><strong>Technical Data:</strong> IP address, browser type, and device information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Process your requests and transactions</li>
              <li>Send you important updates and communications</li>
              <li>Improve our platform and services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Adams Electric</strong><br />
              Email: privacy@adams-electric.com<br />
              Website: <Link href="https://adams-electric.com" className="text-primary hover:underline">adams-electric.com</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
