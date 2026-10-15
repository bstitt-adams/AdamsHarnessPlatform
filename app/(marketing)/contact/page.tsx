"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { logOpportunityCreated } from "@/lib/activity-logger";

const services = [
  "Supplier Readiness & OEM Qualification",
  "ISO/QMS Certification",
  "Lean Manufacturing",
  "Digital Transformation",
  "Reshoring Advisory",
  "Workforce Development",
  "Other",
];

const companySizes = [
  "1-25 employees",
  "25-100 employees",
  "100-250 employees",
  "250-500 employees",
  "500+ employees",
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    companySize: "",
    industry: "",
    service: "",
    message: "",
    newsletter: false,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        firstName: contactForm.firstName,
        lastName: contactForm.lastName,
        email: contactForm.email,
        phone: contactForm.phone || undefined,
        company: contactForm.company,
        jobTitle: contactForm.jobTitle || undefined,
        companySize: contactForm.companySize,
        industry: contactForm.industry || undefined,
        service: contactForm.service,
        message: contactForm.message || undefined,
        newsletter: contactForm.newsletter,
        source: "contact-page",
        submittedAt: new Date().toISOString(),
      };

      await fetch("https://services.leadconnectorhq.com/hooks/o1rlj177UVXuz2i8tHHJ/webhook-trigger/TpKQ9HtCcac86vGd6sc7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Create an Opportunity for this contact form submission
      if (db) {
        try {
          const opportunityData = {
            name: `Contact Form Lead - ${contactForm.firstName} ${contactForm.lastName}`.trim(),
            organizationName: contactForm.company || "Unknown",
            stage: "lead",
            value: 10000,
            probability: 20,
            expectedCloseDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            description: `Lead submitted through the contact form.\n\nService of Interest: ${contactForm.service || "Not specified"}\nCompany Size: ${contactForm.companySize || "Not specified"}\nIndustry: ${contactForm.industry || "Not specified"}`,
            notes: `Contact Info:\nEmail: ${contactForm.email}\nPhone: ${contactForm.phone || "Not provided"}\nCompany: ${contactForm.company || "Not provided"}\nJob Title: ${contactForm.jobTitle || "Not provided"}\n\nMessage:\n${contactForm.message || "No message provided"}`,
            source: "contact-form",
            affiliateId: null,
            affiliateName: `${contactForm.firstName} ${contactForm.lastName}`.trim(),
            affiliateEmail: contactForm.email,
            affiliatePhone: contactForm.phone || null,
            affiliateCompany: contactForm.company || null,
            deliverables: [],
            isSubscription: false,
            monthlyAmount: null,
            subscriptionTermMonths: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          const oppRef = await addDoc(collection(db, COLLECTIONS.OPPORTUNITIES), opportunityData);
          await logOpportunityCreated(oppRef.id, opportunityData.name);
          console.log("Opportunity created for contact form submission:", oppRef.id);
        } catch (oppError) {
          console.error("Error creating opportunity from contact form:", oppError);
          // Don't block the form submission if opportunity creation fails
        }
      }

      toast.success("Thank you for your inquiry!", {
        description: "We'll get back to you within 24 hours.",
      });

      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        jobTitle: "",
        companySize: "",
        industry: "",
        service: "",
        message: "",
        newsletter: false,
      });
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Failed to submit inquiry", {
        description: "Please try again or contact us directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-black text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
              Get in Touch
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Let's Start Your{" "}
              <span className="text-primary">Transformation</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300">
              Ready to become an OEM-qualified supplier? Schedule a free assessment 
              or reach out to discuss how we can help your manufacturing business grow.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Request a Free Assessment</CardTitle>
                  <CardDescription>
                    Fill out the form below and one of our experts will contact you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          required
                          placeholder="John"
                          value={contactForm.firstName}
                          onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          required
                          placeholder="Smith"
                          value={contactForm.lastName}
                          onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          placeholder="john@company.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(513) 335-1978"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company Name *</Label>
                        <Input
                          id="company"
                          required
                          placeholder="Your Company Inc."
                          value={contactForm.company}
                          onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title">Job Title</Label>
                        <Input
                          id="title"
                          placeholder="VP Operations"
                          value={contactForm.jobTitle}
                          onChange={(e) => setContactForm({ ...contactForm, jobTitle: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="size">Company Size *</Label>
                        <Select
                          required
                          value={contactForm.companySize}
                          onValueChange={(value) => setContactForm({ ...contactForm, companySize: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                          <SelectContent>
                            {companySizes.map((size) => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                          id="industry"
                          placeholder="e.g., Automotive, Aerospace"
                          value={contactForm.industry}
                          onChange={(e) => setContactForm({ ...contactForm, industry: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service">Service of Interest *</Label>
                      <Select
                        required
                        value={contactForm.service}
                        onValueChange={(value) => setContactForm({ ...contactForm, service: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Tell us about your goals</Label>
                      <Textarea
                        id="message"
                        placeholder="What challenges are you facing? What outcomes are you hoping to achieve?"
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      />
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="newsletter"
                        checked={contactForm.newsletter}
                        onCheckedChange={(checked) => setContactForm({ ...contactForm, newsletter: checked === true })}
                      />
                      <Label htmlFor="newsletter" className="text-sm font-normal">
                        Subscribe to our newsletter for manufacturing insights and industry updates
                      </Label>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        "Submitting..."
                      ) : (
                        <>
                          Request Free Assessment
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              {/* Quick Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Email</p>
                      <Link
                        href="mailto:info@adams-electric.com"
                        className="text-muted-foreground hover:text-primary"
                      >
                        info@adams-electric.com
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <Link
                        href="tel:+1-513-335-1978"
                        className="text-muted-foreground hover:text-primary"
                      >
                        (513) 335-1978
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">United States</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Business Hours</p>
                      <p className="text-muted-foreground">Mon-Fri: 8am - 6pm EST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connect */}
              <Card>
                <CardHeader>
                  <CardTitle>Connect With Us</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button variant="outline" size="icon" asChild>
                      <Link href="https://linkedin.com">
                        <Linkedin className="h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* What to Expect */}
              <Card>
                <CardHeader>
                  <CardTitle>What to Expect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">Response within 24 hours</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">Free initial assessment</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">Customized recommendations</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">No obligation to proceed</p>
                  </div>
                </CardContent>
              </Card>

              {/* Connect */}
              <Card>
                <CardHeader>
                  <CardTitle>Connect With Us</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button variant="outline" size="icon" asChild>
                      <Link href="https://linkedin.com">
                        <Linkedin className="h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* What to Expect */}
              <Card>
                <CardHeader>
                  <CardTitle>What to Expect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">Response within 24 hours</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">Free initial assessment</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">Customized recommendations</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">No obligation to proceed</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
