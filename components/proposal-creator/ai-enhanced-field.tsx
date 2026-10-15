"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Loader2, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIEnhancedFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "input" | "textarea";
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  documentType: string;
  fieldContext: string;
  sectionContext?: string;
  additionalContext?: Record<string, string>;
  className?: string;
}

export function AIEnhancedField({
  id, label, value, onChange, placeholder, type = "input", rows = 3,
  required = false, disabled = false, helpText, documentType, fieldContext,
  additionalContext = {}, className,
}: AIEnhancedFieldProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [wasEnhanced, setWasEnhanced] = useState(false);

  const enhanceWithAI = async () => {
    if (!value && !Object.values(additionalContext).some((v) => v)) {
      toast.error("Please enter some text first");
      return;
    }
    setIsEnhancing(true);
    setPreviousValue(value);
    try {
      const prompt = buildPrompt(documentType, fieldContext, value, additionalContext);
      const response = await fetch("/api/ai/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value || "", context: { type: documentType + "_" + fieldContext, documentType, fieldContext, ...additionalContext }, prompt }),
      });
      const result = await response.json();
      if (result.success && result.enhancedText) {
        onChange(result.enhancedText);
        setWasEnhanced(true);
        toast.success("Text enhanced with AI");
      } else {
        const fallbackText = getFallbackText(documentType, fieldContext, additionalContext);
        if (fallbackText) { onChange(fallbackText); setWasEnhanced(true); toast.info("Enhanced with template"); }
        else { toast.error("Failed to enhance text"); }
      }
    } catch (error) {
      console.error("Error enhancing text:", error);
      const fallbackText = getFallbackText(documentType, fieldContext, additionalContext);
      if (fallbackText) { onChange(fallbackText); setWasEnhanced(true); toast.info("Enhanced with template"); }
      else { toast.error("Failed to enhance text"); }
    } finally { setIsEnhancing(false); }
  };

  const revertEnhancement = () => {
    if (previousValue !== null) { onChange(previousValue); setPreviousValue(null); setWasEnhanced(false); toast.info("Reverted to original text"); }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-1">{label}{required && <span className="text-red-500">*</span>}</Label>
        <div className="flex items-center gap-1">
          {wasEnhanced && previousValue !== null && (
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="sm" onClick={revertEnhancement} className="h-7 px-2 text-muted-foreground hover:text-foreground"><RotateCcw className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Revert to original</p></TooltipContent></Tooltip></TooltipProvider>
          )}
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="sm" onClick={enhanceWithAI} disabled={isEnhancing || disabled} className="h-7 gap-1">{isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : wasEnhanced ? <Check className="h-3 w-3 text-green-500" /> : <Sparkles className="h-3 w-3" />}<span className="text-xs">Enhance with AI</span></Button></TooltipTrigger><TooltipContent><p>Use AI to improve and professionalize this text</p></TooltipContent></Tooltip></TooltipProvider>
        </div>
      </div>
      {type === "textarea" ? (
        <Textarea id={id} placeholder={placeholder} value={value} onChange={(e) => { onChange(e.target.value); if (wasEnhanced) setWasEnhanced(false); }} rows={rows} disabled={disabled} className={cn(wasEnhanced && "border-green-300 bg-green-50/30")} />
      ) : (
        <Input id={id} placeholder={placeholder} value={value} onChange={(e) => { onChange(e.target.value); if (wasEnhanced) setWasEnhanced(false); }} disabled={disabled} className={cn(wasEnhanced && "border-green-300 bg-green-50/30")} />
      )}
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function buildPrompt(documentType: string, fieldContext: string, currentText: string, additionalContext: Record<string, string>): string {
  const name = additionalContext.name || additionalContext.title || "this project";
  const hasText = currentText && currentText.trim().length > 0;
  const textPart = hasText ? "Enhance: " + currentText : "Generate professional content.";
  const prompts: Record<string, Record<string, string>> = {
    grant: { description: "Create a compelling grant proposal description for " + name + ". " + textPart, objectives: "Create clear, measurable SMART objectives. " + textPart, methodology: "Develop a detailed methodology section. " + textPart, budget_justification: "Write a compelling budget justification. " + textPart, impact: "Describe expected impact and outcomes. " + textPart, sustainability: "Explain the sustainability plan. " + textPart },
    nda: { purpose: "Write a clear NDA purpose statement. " + textPart, confidential_info: "Define confidential information comprehensively. " + textPart, obligations: "Describe receiving party obligations. " + textPart, exceptions: "Define standard confidentiality exceptions. " + textPart, term: "Specify term and termination conditions. " + textPart },
    rfp_response: { executive_summary: "Write a compelling executive summary. " + textPart, understanding: "Demonstrate understanding of client needs. " + textPart, approach: "Describe the proposed approach. " + textPart, qualifications: "Highlight relevant qualifications. " + textPart, differentiators: "Articulate key differentiators. " + textPart },
    contract: { scope: "Define the scope of work clearly. " + textPart, deliverables: "Specify deliverables and acceptance criteria. " + textPart, terms: "Write clear payment terms. " + textPart, warranties: "Define warranties and representations. " + textPart, liability: "Address liability and indemnification. " + textPart },
    agreement: { purpose: "State the agreement purpose clearly. " + textPart, responsibilities: "Define party responsibilities. " + textPart, terms: "Specify terms and conditions. " + textPart, dispute_resolution: "Address dispute resolution. " + textPart },
    mou: { background: "Provide MOU background context. " + textPart, objectives: "State shared objectives. " + textPart, commitments: "Define party commitments. " + textPart, governance: "Describe governance structure. " + textPart, resources: "Specify resource commitments. " + textPart },
    oem_supplier_readiness: { capabilities: "Describe manufacturing capabilities. " + textPart, quality_systems: "Describe quality management systems. " + textPart, capacity: "Specify production capacity. " + textPart, compliance: "Address regulatory compliance. " + textPart, supply_chain: "Describe supply chain management. " + textPart },
  };
  const docPrompts = prompts[documentType] || prompts.agreement;
  return docPrompts[fieldContext] || "Enhance this " + fieldContext.replace(/_/g, " ") + " text. " + textPart;
}

function getFallbackText(documentType: string, fieldContext: string, additionalContext: Record<string, string>): string {
  const name = additionalContext.name || additionalContext.title || "this project";
  const fallbacks: Record<string, Record<string, string>> = {
    grant: { description: name + " is a comprehensive initiative designed to address critical needs in our target community. This project will leverage evidence-based approaches and collaborative partnerships to achieve measurable outcomes.", objectives: "1. Increase target outcomes by 25% within the project period\n2. Establish sustainable systems and processes\n3. Build capacity among key stakeholders\n4. Document and disseminate best practices", methodology: "Our methodology employs a phased approach combining research-based strategies with practical implementation. Phase 1 focuses on assessment and planning, Phase 2 on implementation and monitoring, and Phase 3 on evaluation and sustainability planning." },
    nda: { purpose: "The purpose of this Non-Disclosure Agreement is to protect confidential and proprietary information shared between the parties in connection with " + name + ".", confidential_info: "Confidential Information includes trade secrets, business plans, financial information, customer data, technical specifications, product designs, marketing strategies, and any other information designated as confidential." },
    rfp_response: { executive_summary: "We are pleased to submit this proposal for " + name + ". Our team brings extensive experience and a proven track record of success in similar engagements.", approach: "Our approach is built on three pillars: thorough understanding of your requirements, proven methodologies adapted to your context, and continuous collaboration throughout the engagement." },
    contract: { scope: "This agreement covers the complete scope of services related to " + name + ", including all deliverables, milestones, and support activities as detailed in the attached specifications.", deliverables: "The following deliverables shall be provided:\n1. Initial assessment and project plan\n2. Regular progress reports\n3. Final deliverables as specified\n4. Documentation and training materials" },
    agreement: { purpose: "This Agreement establishes the terms and conditions governing the relationship between the parties with respect to " + name + ".", responsibilities: "Each party agrees to fulfill their respective responsibilities in good faith, maintain open communication, and work collaboratively to achieve the objectives outlined in this agreement." },
    mou: { background: "The parties to this Memorandum of Understanding share a common interest in " + name + " and recognize the mutual benefits of collaboration.", objectives: "The parties agree to collaborate toward shared objectives including advancing mutual interests, sharing resources and expertise, and coordinating activities to maximize impact." },
    oem_supplier_readiness: { capabilities: "Our manufacturing facility is equipped with state-of-the-art equipment and staffed by experienced professionals. We maintain robust quality systems and have demonstrated capacity to meet demanding production requirements.", quality_systems: "We maintain comprehensive quality management systems certified to ISO 9001:2015 and IATF 16949 standards. Our quality processes include incoming inspection, in-process controls, and final inspection." },
  };
  const docFallbacks = fallbacks[documentType] || fallbacks.agreement;
  return docFallbacks[fieldContext] || "";
}