import { HeroSlide } from "@/components/marketing/hero-carousel";

/**
 * Adams Electric - Hero Carousel Slides
 *
 * These slides market Adams Electric's electrical construction
 * services and the Adams Platform.
 */

export const adamsHeroSlides: HeroSlide[] = [
  {
    id: "adams-1",
    badge: "Since 1928",
    headline: "Build Trust Through",
    highlightedText: "Performance",
    subheadline: "Adams Electric is a third-generation, family-owned electrical contractor serving the Southeast with PreConstruction, Design-Build, BIM, PreFabrication, Construction, and Post Construction services.",
    benefits: ["Founded 1928", "Family Owned", "Southeast Coverage"],
    primaryCta: { text: "Explore Our Services", href: "/services" },
    secondaryCta: { text: "Contact Our Team", href: "/contact" },
    isPublished: true,
    order: 1,
    backgroundImage: {
      imageId: "pexels-electrical-construction",
      url: "https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      name: "Electrical Construction"
    }
  },
  {
    id: "adams-2",
    badge: "PreConstruction & Design",
    headline: "Plan It Right",
    highlightedText: "Before You Build",
    subheadline: "From budgeting and constructability reviews to Design-Build and Design-Assist delivery, our preconstruction team sets your project up for success.",
    benefits: ["PreConstruction", "Design-Build", "Design-Assist"],
    primaryCta: { text: "Start Planning", href: "/contact" },
    secondaryCta: { text: "Our Capabilities", href: "/services" },
    isPublished: true,
    order: 2,
    backgroundImage: {
      imageId: "pexels-blueprint-planning",
      url: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      name: "Construction Planning"
    }
  },
  {
    id: "adams-3",
    badge: "BIM & Virtual Design",
    headline: "Coordinate in 3D,",
    highlightedText: "Build with Confidence",
    subheadline: "Our BIM and Virtual Design team models and coordinates every system before work hits the field, reducing rework and keeping schedules on track.",
    benefits: ["BIM Modeling", "Clash Coordination", "PreFabrication"],
    primaryCta: { text: "See How We Work", href: "/services" },
    secondaryCta: { text: "Read Our Insights", href: "/insights" },
    isPublished: true,
    order: 3,
    backgroundImage: {
      imageId: "pexels-bim-coordination",
      url: "https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      name: "Virtual Design Coordination"
    }
  },
  {
    id: "adams-4",
    badge: "Safety First",
    headline: "Safety on Every",
    highlightedText: "Jobsite, Every Day",
    subheadline: "A strong safety culture protects our people, our partners, and your project. It is the foundation of how Adams Electric builds.",
    benefits: ["Safety Culture", "Trained Workforce", "Reliable Delivery"],
    primaryCta: { text: "Learn About Adams", href: "/about" },
    secondaryCta: { text: "Get in Touch", href: "/contact" },
    isPublished: true,
    order: 4,
    backgroundImage: {
      imageId: "pexels-safety-crew",
      url: "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      name: "Jobsite Safety"
    }
  },
  {
    id: "adams-5",
    badge: "The Adams Platform",
    headline: "One Platform for",
    highlightedText: "Every Project",
    subheadline: "The Adams Platform connects our teams, tools, and partners—streamlining project coordination, communication, and workforce development.",
    benefits: ["Project Coordination", "Team Tools", "Workforce Development"],
    primaryCta: { text: "Discover the Platform", href: "/adams-platform" },
    secondaryCta: { text: "Contact Us", href: "/contact" },
    isPublished: true,
    order: 5,
    backgroundImage: {
      imageId: "pexels-platform-team",
      url: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
      name: "Adams Platform Team"
    }
  },
];

/**
 * Adams Electric Trust Indicators
 * Display these in the hero section footer
 */
export const adamsTrustIndicators = [
  { title: "Since 1928", subtitle: "Founded" },
  { title: "3rd Gen", subtitle: "Family Owned" },
  { title: "Southeast", subtitle: "Service Area" },
  { title: "Safety", subtitle: "First Always" },
  { title: "Full", subtitle: "Lifecycle Services" },
];

/**
 * Adams Electric Core Values
 * For use in about section and other marketing materials
 */
export const adamsCoreValues = [
  {
    name: "Trust",
    description: "We build trust through performance on every project.",
  },
  {
    name: "Safety",
    description: "The wellbeing of our people and partners comes first.",
  },
  {
    name: "Craftsmanship",
    description: "Quality workmanship in every installation we deliver.",
  },
  {
    name: "Family",
    description: "Third-generation family ownership guides how we treat people.",
  },
];

/**
 * Adams Electric Services
 * Core service offerings
 */
export const adamsServices = [
  {
    id: "preconstruction",
    title: "PreConstruction",
    tagline: "Plan it right before you build.",
    description: "Budgeting, estimating, and constructability reviews that set projects up for success.",
    features: [
      "Estimating & Budgeting",
      "Constructability Reviews",
      "Value Engineering",
      "Schedule Planning",
    ],
  },
  {
    id: "design-build",
    title: "Design-Build / Design-Assist",
    tagline: "One team from concept to completion.",
    description: "Integrated design and construction delivery that streamlines decisions and reduces risk.",
    features: [
      "Design-Build Delivery",
      "Design-Assist Collaboration",
      "Early Trade Involvement",
      "Cost & Schedule Certainty",
    ],
  },
  {
    id: "bim-virtual-design",
    title: "BIM / Virtual Design",
    tagline: "Coordinate digitally, build confidently.",
    description: "3D modeling and clash coordination that resolves conflicts before field work begins.",
    features: [
      "3D Modeling",
      "Clash Detection",
      "Coordination Drawings",
      "Prefabrication Support",
    ],
  },
  {
    id: "prefabrication",
    title: "PreFabrication",
    tagline: "Build offsite, install faster.",
    description: "Offsite fabrication of electrical assemblies that improves quality, safety, and schedule.",
    features: [
      "Assembly Fabrication",
      "Kitting & Logistics",
      "Quality Control",
      "Field Installation Support",
    ],
  },
  {
    id: "construction",
    title: "Construction",
    tagline: "Skilled crews. Reliable execution.",
    description: "Experienced electrical construction teams delivering safe, on-time installations.",
    features: [
      "Electrical Installation",
      "Project Management",
      "Field Supervision",
      "Quality Assurance",
    ],
  },
  {
    id: "post-construction",
    title: "Post Construction",
    tagline: "Support beyond turnover.",
    description: "Closeout documentation, commissioning support, and ongoing service after project completion.",
    features: [
      "Closeout Documentation",
      "Commissioning Support",
      "Service & Maintenance",
      "Warranty Support",
    ],
  },
];

/**
 * Adams Electric FAQ Items
 */
export const adamsFAQs = [
  {
    question: "What services does Adams Electric provide?",
    answer: "Adams Electric provides PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction electrical services.",
  },
  {
    question: "Where does Adams Electric work?",
    answer: "Adams Electric operates throughout the Southeast, supporting commercial, industrial, and institutional electrical construction projects.",
  },
  {
    question: "How long has Adams Electric been in business?",
    answer: "Adams Electric was founded in 1928 and remains a third-generation, family-owned company.",
  },
  {
    question: "What is the Adams Platform?",
    answer: "The Adams Platform is Adams Electric's internal platform for project coordination, team tools, communication, and workforce development.",
  },
];

/**
 * Adams Electric Company Info
 */
export const adamsCompanyInfo = {
  name: "Adams Electric",
  tagline: "Build Trust Through Performance",
  founded: "1928",
  ownership: "Third-generation family owned",
  serviceArea: "Southeast United States",
  email: "info@adams-electric.com",
  website: "https://adams-electric.com",
  contactUrl: "https://adams-electric.com/contact",
};
