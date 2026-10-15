"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Send, Factory } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PopupField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "url" | "select" | "radio" | "checkbox";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  enabled: boolean;
}

export interface PopupConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  successMessage: string;
  triggerDelay: number; // seconds before auto-showing (0 = never auto-show)
  showOnPages: string[]; // which pages to show on, empty = all
  position: "bottom-right" | "bottom-left" | "center";
  fields: PopupField[];
  productOptions: string[];
  productLabel: string;
  allowCustomProduct: boolean;
}

// Default configuration
export const defaultPopupConfig: PopupConfig = {
  enabled: false,
  title: "Adams Electric",
  subtitle: "Tell us about your project and our team will follow up to discuss how we can help.",
  description: "Adams Electric provides PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction services throughout the Southeast.",
  buttonText: "Request a Call Back",
  successMessage: "Thank you! We'll be in touch within 24 hours.",
  triggerDelay: 0,
  showOnPages: [],
  position: "bottom-right",
  fields: [
    { id: "firstName", type: "text", label: "First Name", placeholder: "First Name", required: false, enabled: true },
    { id: "lastName", type: "text", label: "Last Name", placeholder: "Last Name", required: false, enabled: true },
    { id: "phone", type: "phone", label: "Phone", placeholder: "Phone", required: true, enabled: true },
    { id: "email", type: "email", label: "Email", placeholder: "Email", required: true, enabled: true },
    { id: "website", type: "url", label: "Website", placeholder: "Web URL goes here", required: false, enabled: true },
    { id: "company", type: "text", label: "Company", placeholder: "Company Name", required: false, enabled: false },
    { id: "message", type: "textarea", label: "Message", placeholder: "How can we help you?", required: false, enabled: false },
  ],
  productOptions: [
    "PreConstruction",
    "Design-Build / Design-Assist",
    "BIM / Virtual Design",
    "PreFabrication",
    "Construction",
    "Post Construction",
  ],
  productLabel: "Which service are you interested in?",
  allowCustomProduct: true,
};

interface ContactPopupProps {
  config?: PopupConfig;
}

export function ContactPopup({ config = defaultPopupConfig }: ContactPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedProduct, setSelectedProduct] = useState("");
  const [customProduct, setCustomProduct] = useState("");
  const [showTriggerButton] = useState(true);

  useEffect(() => {
    if (config.triggerDelay > 0) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, config.triggerDelay * 1000);
      return () => clearTimeout(timer);
    }
  }, [config.triggerDelay]);

  if (!config.enabled) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", { ...formData, product: selectedProduct || customProduct });
    setIsSubmitted(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsSubmitted(false);
      setFormData({});
      setSelectedProduct("");
      setCustomProduct("");
    }, 3000);
  };

  const updateField = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const enabledFields = config.fields.filter((f) => f.enabled);

  return (
    <>
      {/* Floating Trigger Button */}
      {showTriggerButton && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed z-50 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform",
            config.position === "bottom-right" && "bottom-6 right-6",
            config.position === "bottom-left" && "bottom-6 left-6",
            config.position === "center" && "bottom-6 right-6"
          )}
          aria-label="Contact us"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Popup Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-2">
              <Factory className="h-8 w-8 text-primary" />
              <DialogTitle className="text-xl text-primary font-semibold">
                {config.title}
              </DialogTitle>
            </div>
            <p className="text-base font-medium text-foreground">
              {config.subtitle}
            </p>
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
          </DialogHeader>

          {isSubmitted ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-green-600">
                {config.successMessage}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {enabledFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.id}
                      placeholder={field.placeholder}
                      required={field.required}
                      value={formData[field.id] || ""}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      className="bg-muted/50"
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type === "phone" ? "tel" : field.type}
                      placeholder={field.placeholder}
                      required={field.required}
                      value={formData[field.id] || ""}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      className="bg-muted/50"
                    />
                  )}
                </div>
              ))}

              {/* Product Selection */}
              {config.productOptions.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-primary">
                    {config.productLabel}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <RadioGroup
                    value={selectedProduct}
                    onValueChange={(value) => {
                      setSelectedProduct(value);
                      setCustomProduct("");
                    }}
                  >
                    {config.productOptions.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={option} />
                        <Label htmlFor={option} className="font-normal cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                    {config.allowCustomProduct && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Input
                          placeholder="Press enter to add custom option"
                          value={customProduct}
                          onChange={(e) => {
                            setCustomProduct(e.target.value);
                            setSelectedProduct("custom");
                          }}
                          className="flex-1 bg-muted/50"
                        />
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                {config.buttonText}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
