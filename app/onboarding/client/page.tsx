"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  User,
  MapPin,
  Mail,
  Phone,
  Globe,
  FileText,
  Award,
  Truck,
  Shield,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  Upload,
  Users,
  Target,
  Briefcase,
} from "lucide-react";

// Company types
const companyTypes = [
  { id: "manufacturer", name: "Manufacturer" },
  { id: "supplier", name: "Supplier/Vendor" },
  { id: "oem", name: "OEM (Original Equipment Manufacturer)" },
  { id: "tier1", name: "Tier 1 Supplier" },
  { id: "tier2", name: "Tier 2 Supplier" },
  { id: "distributor", name: "Distributor" },
  { id: "service_provider", name: "Service Provider" },
  { id: "other", name: "Other" },
];

// Industry sectors
const industrySectors = [
  { id: "automotive", name: "Automotive" },
  { id: "aerospace", name: "Aerospace & Defense" },
  { id: "electronics", name: "Electronics" },
  { id: "medical", name: "Medical Devices" },
  { id: "industrial", name: "Industrial Equipment" },
  { id: "consumer", name: "Consumer Products" },
  { id: "energy", name: "Energy & Utilities" },
  { id: "food", name: "Food & Beverage" },
  { id: "pharma", name: "Pharmaceutical" },
  { id: "other", name: "Other" },
];

// Manufacturing capabilities
const manufacturingCapabilities = [
  { id: "cnc", name: "CNC Machining" },
  { id: "stamping", name: "Metal Stamping" },
  { id: "injection", name: "Injection Molding" },
  { id: "casting", name: "Die Casting" },
  { id: "welding", name: "Welding & Fabrication" },
  { id: "assembly", name: "Assembly" },
  { id: "electronics", name: "Electronics Assembly" },
  { id: "finishing", name: "Surface Finishing" },
  { id: "testing", name: "Testing & Inspection" },
  { id: "packaging", name: "Packaging" },
];

// Certifications
const certificationOptions = [
  { id: "iso9001", name: "ISO 9001" },
  { id: "iso14001", name: "ISO 14001" },
  { id: "iatf16949", name: "IATF 16949" },
  { id: "as9100", name: "AS9100" },
  { id: "iso13485", name: "ISO 13485" },
  { id: "iso45001", name: "ISO 45001" },
  { id: "nadcap", name: "NADCAP" },
  { id: "cmmi", name: "CMMI" },
];

// Services of interest
const servicesOfInterest = [
  { id: "strategy", name: "Business Strategy" },
  { id: "quality", name: "Quality Systems & ISO" },
  { id: "automation", name: "Automation & Technology" },
  { id: "workforce", name: "Workforce Development" },
  { id: "supply_chain", name: "Supply Chain Optimization" },
  { id: "digital", name: "Digital Transformation" },
  { id: "assessment", name: "Business Assessment" },
  { id: "training", name: "Training Programs" },
];

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("company");
  const [isSaving, setIsSaving] = useState(false);
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    // Company Information
    companyName: "",
    companyType: "",
    dunsNumber: "",
    taxId: "",
    yearEstablished: "",
    employeeCount: "",
    annualRevenue: "",
    website: "",
    
    // Address
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    
    // Primary Contact
    contactName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    
    // Secondary Contact
    secondaryContactName: "",
    secondaryContactTitle: "",
    secondaryContactEmail: "",
    secondaryContactPhone: "",
    
    // Manufacturing Profile
    industrySectors: [] as string[],
    capabilities: [] as string[],
    certifications: [] as string[],
    productionCapacity: "",
    facilitySize: "",
    
    // Quality & Compliance
    qualityManual: false,
    documentedProcesses: false,
    internalAudits: false,
    correctiveActionProcess: false,
    supplierQualification: false,
    
    // Services & Goals
    servicesInterested: [] as string[],
    primaryGoals: "",
    currentChallenges: "",
    timeline: "",
    budget: "",
    
    // Additional Info
    howDidYouHear: "",
    additionalNotes: "",
    agreeToTerms: false,
  });

  // Load session data on mount
  useEffect(() => {
    const userName = sessionStorage.getItem("adams_user_name") || "";
    const userEmail = sessionStorage.getItem("adams_user_email") || "";
    const userCompany = sessionStorage.getItem("adams_user_company") || "";
    const userPhone = sessionStorage.getItem("adams_user_phone") || "";

    if (userName) {
      setFormData(prev => ({
        ...prev,
        contactName: userName,
        contactEmail: userEmail,
        companyName: userCompany,
        contactPhone: userPhone,
      }));
    }
  }, []);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: string, value: string) => {
    const currentArray = formData[field as keyof typeof formData] as string[];
    if (currentArray.includes(value)) {
      updateFormData(field, currentArray.filter(v => v !== value));
    } else {
      updateFormData(field, [...currentArray, value]);
    }
  };

  const calculateProgress = () => {
    const requiredFields = [
      formData.companyName,
      formData.companyType,
      formData.streetAddress,
      formData.city,
      formData.state,
      formData.zipCode,
      formData.contactName,
      formData.contactEmail,
      formData.contactPhone,
    ];
    const completed = requiredFields.filter(f => f && f.trim() !== "").length;
    return Math.round((completed / requiredFields.length) * 100);
  };

  const isTabComplete = (tab: string) => {
    switch (tab) {
      case "company":
        return formData.companyName && formData.companyType && formData.streetAddress && formData.city && formData.state && formData.zipCode;
      case "contacts":
        return formData.contactName && formData.contactEmail && formData.contactPhone;
      case "quality":
        return true; // Optional
      case "services":
        return formData.servicesInterested.length > 0 && formData.agreeToTerms;
      default:
        return false;
    }
  };

  const handleTabChange = (tab: string) => {
    // Mark current tab as completed if valid
    if (isTabComplete(activeTab) && !completedTabs.includes(activeTab)) {
      setCompletedTabs(prev => [...prev, activeTab]);
    }
    setActiveTab(tab);
  };

  const handleNext = () => {
    const tabs = ["company", "contacts", "quality", "services"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      handleTabChange(tabs[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const tabs = ["company", "contacts", "quality", "services"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      handleTabChange(tabs[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, save to Firebase here
      console.log("Client onboarding data:", formData);
      
      // Redirect to portal
      router.push("/portal");
    } catch (error) {
      console.error("Error saving client data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
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
              <span className="text-xs text-muted-foreground">Client Onboarding</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Progress: {calculateProgress()}%
            </div>
            <Progress value={calculateProgress()} className="w-32 h-2" />
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#0072BC] to-[#a08840] mb-4">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Client Registration</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Complete your company profile to access Adams Electric services and connect with our network of expert consultants.
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Company</span>
                {completedTabs.includes("company") && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Contacts</span>
                {completedTabs.includes("contacts") && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Quality</span>
                {completedTabs.includes("quality") && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Services</span>
                {completedTabs.includes("services") && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
            </TabsList>

            {/* Company Information Tab */}
            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Tell us about your organization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => updateFormData("companyName", e.target.value)}
                        placeholder="Your Company LLC"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyType">Company Type *</Label>
                      <Select value={formData.companyType} onValueChange={(v) => updateFormData("companyType", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {companyTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dunsNumber">DUNS Number</Label>
                      <Input
                        id="dunsNumber"
                        value={formData.dunsNumber}
                        onChange={(e) => updateFormData("dunsNumber", e.target.value)}
                        placeholder="00-000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearEstablished">Year Established</Label>
                      <Input
                        id="yearEstablished"
                        value={formData.yearEstablished}
                        onChange={(e) => updateFormData("yearEstablished", e.target.value)}
                        placeholder="1990"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeCount">Number of Employees</Label>
                      <Select value={formData.employeeCount} onValueChange={(v) => updateFormData("employeeCount", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-50">11-50</SelectItem>
                          <SelectItem value="51-100">51-100</SelectItem>
                          <SelectItem value="101-250">101-250</SelectItem>
                          <SelectItem value="251-500">251-500</SelectItem>
                          <SelectItem value="500+">500+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => updateFormData("website", e.target.value)}
                        placeholder="www.yourcompany.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Company Address</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="streetAddress">Street Address *</Label>
                        <Input
                          id="streetAddress"
                          value={formData.streetAddress}
                          onChange={(e) => updateFormData("streetAddress", e.target.value)}
                          placeholder="123 Manufacturing Way"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2 col-span-2 md:col-span-1">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => updateFormData("city", e.target.value)}
                            placeholder="Greensboro"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => updateFormData("state", e.target.value)}
                            placeholder="NC"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zipCode">ZIP Code *</Label>
                          <Input
                            id="zipCode"
                            value={formData.zipCode}
                            onChange={(e) => updateFormData("zipCode", e.target.value)}
                            placeholder="27401"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={formData.country}
                            onChange={(e) => updateFormData("country", e.target.value)}
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Primary Contact</CardTitle>
                  <CardDescription>Main point of contact for your organization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contactName"
                          value={formData.contactName}
                          onChange={(e) => updateFormData("contactName", e.target.value)}
                          placeholder="John Doe"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactTitle">Title</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contactTitle"
                          value={formData.contactTitle}
                          onChange={(e) => updateFormData("contactTitle", e.target.value)}
                          placeholder="Operations Manager"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => updateFormData("contactEmail", e.target.value)}
                          placeholder="john@company.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Phone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contactPhone"
                          value={formData.contactPhone}
                          onChange={(e) => updateFormData("contactPhone", e.target.value)}
                          placeholder="(555) 123-4567"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Secondary Contact (Optional)</CardTitle>
                  <CardDescription>Backup contact for your organization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="secondaryContactName">Full Name</Label>
                      <Input
                        id="secondaryContactName"
                        value={formData.secondaryContactName}
                        onChange={(e) => updateFormData("secondaryContactName", e.target.value)}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryContactTitle">Title</Label>
                      <Input
                        id="secondaryContactTitle"
                        value={formData.secondaryContactTitle}
                        onChange={(e) => updateFormData("secondaryContactTitle", e.target.value)}
                        placeholder="Quality Manager"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="secondaryContactEmail">Email</Label>
                      <Input
                        id="secondaryContactEmail"
                        type="email"
                        value={formData.secondaryContactEmail}
                        onChange={(e) => updateFormData("secondaryContactEmail", e.target.value)}
                        placeholder="jane@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryContactPhone">Phone</Label>
                      <Input
                        id="secondaryContactPhone"
                        value={formData.secondaryContactPhone}
                        onChange={(e) => updateFormData("secondaryContactPhone", e.target.value)}
                        placeholder="(555) 123-4568"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manufacturing Profile Tab */}
            <TabsContent value="manufacturing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Industry Sectors</CardTitle>
                  <CardDescription>Select all industries you serve</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {industrySectors.map((sector) => (
                      <div
                        key={sector.id}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.industrySectors.includes(sector.id)
                            ? "border-[#0072BC] bg-[#0072BC]/5"
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                        onClick={() => toggleArrayField("industrySectors", sector.id)}
                      >
                        <Checkbox
                          checked={formData.industrySectors.includes(sector.id)}
                          onCheckedChange={() => toggleArrayField("industrySectors", sector.id)}
                        />
                        <span className="text-sm">{sector.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manufacturing Capabilities</CardTitle>
                  <CardDescription>Select your core capabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {manufacturingCapabilities.map((cap) => (
                      <div
                        key={cap.id}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.capabilities.includes(cap.id)
                            ? "border-[#0072BC] bg-[#0072BC]/5"
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                        onClick={() => toggleArrayField("capabilities", cap.id)}
                      >
                        <Checkbox
                          checked={formData.capabilities.includes(cap.id)}
                          onCheckedChange={() => toggleArrayField("capabilities", cap.id)}
                        />
                        <span className="text-sm">{cap.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Certifications</CardTitle>
                  <CardDescription>Select your current certifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {certificationOptions.map((cert) => (
                      <div
                        key={cert.id}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.certifications.includes(cert.id)
                            ? "border-[#0072BC] bg-[#0072BC]/5"
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                        onClick={() => toggleArrayField("certifications", cert.id)}
                      >
                        <Checkbox
                          checked={formData.certifications.includes(cert.id)}
                          onCheckedChange={() => toggleArrayField("certifications", cert.id)}
                        />
                        <span className="text-sm">{cert.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Facility Information</CardTitle>
                  <CardDescription>Tell us about your manufacturing facility</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facilitySize">Facility Size (sq ft)</Label>
                      <Input
                        id="facilitySize"
                        value={formData.facilitySize}
                        onChange={(e) => updateFormData("facilitySize", e.target.value)}
                        placeholder="50,000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productionCapacity">Production Capacity Description</Label>
                      <Input
                        id="productionCapacity"
                        value={formData.productionCapacity}
                        onChange={(e) => updateFormData("productionCapacity", e.target.value)}
                        placeholder="e.g., 10,000 units/month"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quality & Compliance Tab */}
            <TabsContent value="quality" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quality Management System</CardTitle>
                  <CardDescription>Tell us about your quality practices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="qualityManual"
                        checked={formData.qualityManual}
                        onCheckedChange={(checked) => updateFormData("qualityManual", checked)}
                      />
                      <div>
                        <Label htmlFor="qualityManual" className="font-medium cursor-pointer">Quality Manual</Label>
                        <p className="text-sm text-muted-foreground">We have a documented quality manual</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="documentedProcesses"
                        checked={formData.documentedProcesses}
                        onCheckedChange={(checked) => updateFormData("documentedProcesses", checked)}
                      />
                      <div>
                        <Label htmlFor="documentedProcesses" className="font-medium cursor-pointer">Documented Processes</Label>
                        <p className="text-sm text-muted-foreground">We have documented work instructions and procedures</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="internalAudits"
                        checked={formData.internalAudits}
                        onCheckedChange={(checked) => updateFormData("internalAudits", checked)}
                      />
                      <div>
                        <Label htmlFor="internalAudits" className="font-medium cursor-pointer">Internal Audits</Label>
                        <p className="text-sm text-muted-foreground">We conduct regular internal quality audits</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="correctiveActionProcess"
                        checked={formData.correctiveActionProcess}
                        onCheckedChange={(checked) => updateFormData("correctiveActionProcess", checked)}
                      />
                      <div>
                        <Label htmlFor="correctiveActionProcess" className="font-medium cursor-pointer">Corrective Action Process</Label>
                        <p className="text-sm text-muted-foreground">We have a formal corrective action process (CAPA)</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="supplierQualification"
                        checked={formData.supplierQualification}
                        onCheckedChange={(checked) => updateFormData("supplierQualification", checked)}
                      />
                      <div>
                        <Label htmlFor="supplierQualification" className="font-medium cursor-pointer">Supplier Qualification</Label>
                        <p className="text-sm text-muted-foreground">We have a supplier qualification and monitoring program</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services & Goals Tab */}
            <TabsContent value="services" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Services of Interest</CardTitle>
                  <CardDescription>Select the Adams Electric services you&apos;re interested in</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {servicesOfInterest.map((service) => (
                      <div
                        key={service.id}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.servicesInterested.includes(service.id)
                            ? "border-[#0072BC] bg-[#0072BC]/5"
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                        onClick={() => toggleArrayField("servicesInterested", service.id)}
                      >
                        <Checkbox
                          checked={formData.servicesInterested.includes(service.id)}
                          onCheckedChange={() => toggleArrayField("servicesInterested", service.id)}
                        />
                        <span className="text-sm">{service.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Goals & Challenges</CardTitle>
                  <CardDescription>Help us understand your needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryGoals">Primary Goals</Label>
                    <Textarea
                      id="primaryGoals"
                      value={formData.primaryGoals}
                      onChange={(e) => updateFormData("primaryGoals", e.target.value)}
                      placeholder="What are your main objectives for working with Adams Electric?"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentChallenges">Current Challenges</Label>
                    <Textarea
                      id="currentChallenges"
                      value={formData.currentChallenges}
                      onChange={(e) => updateFormData("currentChallenges", e.target.value)}
                      placeholder="What challenges are you currently facing in your operations?"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeline">Project Timeline</Label>
                      <Select value={formData.timeline} onValueChange={(v) => updateFormData("timeline", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate (within 1 month)</SelectItem>
                          <SelectItem value="short">Short-term (1-3 months)</SelectItem>
                          <SelectItem value="medium">Medium-term (3-6 months)</SelectItem>
                          <SelectItem value="long">Long-term (6+ months)</SelectItem>
                          <SelectItem value="exploring">Just exploring options</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="howDidYouHear">How did you hear about us?</Label>
                      <Select value={formData.howDidYouHear} onValueChange={(v) => updateFormData("howDidYouHear", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="search">Online Search</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="event">Trade Show/Event</SelectItem>
                          <SelectItem value="partner">Partner Organization</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalNotes">Additional Notes</Label>
                    <Textarea
                      id="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={(e) => updateFormData("additionalNotes", e.target.value)}
                      placeholder="Any additional information you'd like to share..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => updateFormData("agreeToTerms", checked)}
                    />
                    <div>
                      <Label htmlFor="agreeToTerms" className="cursor-pointer">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                        {" "}and{" "}
                        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        By submitting this form, you consent to Adams Electric contacting you about our services.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={activeTab === "company"}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex gap-3">
              {activeTab !== "services" ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.agreeToTerms || isSaving}
                  className="bg-gradient-to-r from-[#0072BC] to-[#a08840] hover:from-[#b89841] hover:to-[#907830] text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Registration
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
