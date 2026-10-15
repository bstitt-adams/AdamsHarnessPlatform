import Link from "next/link";
import Image from "next/image";
import { Globe, Mail, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  services: [
    { title: "PreConstruction", href: "/services/preconstruction" },
    { title: "Design-Build / Design-Assist", href: "/services/design-build" },
    { title: "BIM / Virtual Design", href: "/services/bim-virtual-design" },
    { title: "PreFabrication", href: "/services/prefabrication" },
    { title: "Construction", href: "/services/construction" },
    { title: "Post Construction", href: "/services/post-construction" },
  ],
  company: [
    { title: "About Us", href: "/about" },
    { title: "Leadership", href: "/leadership" },
    { title: "Adams Platform", href: "/adams-platform" },
    { title: "Success Stories", href: "/success-stories" },
    { title: "Contact", href: "/contact" },
  ],
  resources: [
    { title: "Insights", href: "/insights" },
    { title: "Academy", href: "/academy" },
    { title: "Resources", href: "/resources" },
    { title: "Events", href: "/events" },
    { title: "FAQ", href: "/faq" },
  ],
  legal: [
    { title: "Privacy Policy", href: "/privacy" },
    { title: "Terms of Service", href: "/terms" },
    { title: "Accessibility", href: "/accessibility" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/adamselectric_logo.png"
                alt="Adams Electric Logo"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-none">Adams Electric</span>
                <span className="text-xs text-gray-400">Build Trust Through Performance</span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 max-w-xs">
              A third-generation, family-owned electrical contractor serving the Southeast since 1928.
            </p>
            <div className="flex gap-4">
              <Link href="https://adams-electric.com" className="text-gray-400 hover:text-primary transition-colors">
                <Globe className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-accent">Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.title}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-semibold text-accent">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.title}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-semibold text-accent">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.title}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-accent">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Serving the Southeast</span>
              </li>
              <li>
                <Link href="https://adams-electric.com" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <Globe className="h-4 w-4" />
                  adams-electric.com
                </Link>
              </li>
              <li>
                <Link href="/contact" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <Mail className="h-4 w-4" />
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-800" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Adams Electric. All rights reserved.
          </p>
          <div className="flex gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
