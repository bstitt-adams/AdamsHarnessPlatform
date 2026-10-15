"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Save,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  Settings,
  FormInput,
  Type,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PopupConfig, PopupField } from "@/components/marketing/contact-popup";
import { defaultPopupConfig, ContactPopup } from "@/components/marketing/contact-popup";

const fieldTypes = [
  { value: "text", label: "Text", icon: Type },
  { value: "email", label: "Email", icon: FormInput },
  { value: "phone", label: "Phone", icon: FormInput },
  { value: "url", label: "URL/Website", icon: FormInput },
  { value: "textarea", label: "Text Area", icon: Type },
];

export default function PopupManagementPage() {
  const [config, setConfig] = useState<PopupConfig>(defaultPopupConfig);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newField, setNewField] = useState<Partial<PopupField>>({
    type: "text",
    label: "",
    placeholder: "",
    required: false,
    enabled: true,
  });
  const [newProductOption, setNewProductOption] = useState("");

  const updateConfig = <K extends keyof PopupConfig>(key: K, value: PopupConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateField = (fieldId: string, updates: Partial<PopupField>) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    }));
  };

  const addField = () => {
    if (!newField.label) return;
    const field: PopupField = {
      id: `field_${Date.now()}`,
      type: newField.type as PopupField["type"],
      label: newField.label,
      placeholder: newField.placeholder || "",
      required: newField.required || false,
      enabled: true,
    };
    setConfig((prev) => ({ ...prev, fields: [...prev.fields, field] }));
    setNewField({ type: "text", label: "", placeholder: "", required: false, enabled: true });
    setIsAddFieldOpen(false);
  };

  const removeField = (fieldId: string) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const index = config.fields.findIndex((f) => f.id === fieldId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === config.fields.length - 1)
    )
      return;

    const newFields = [...config.fields];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    setConfig((prev) => ({ ...prev, fields: newFields }));
  };

  const addProductOption = () => {
    if (!newProductOption.trim()) return;
    setConfig((prev) => ({
      ...prev,
      productOptions: [...prev.productOptions, newProductOption.trim()],
    }));
    setNewProductOption("");
  };

  const removeProductOption = (option: string) => {
    setConfig((prev) => ({
      ...prev,
      productOptions: prev.productOptions.filter((o) => o !== option),
    }));
  };

  const saveConfig = () => {
    console.log("Saving popup config:", config);
    toast.success("Popup configuration saved successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contact Popup Management</h1>
          <p className="text-muted-foreground">
            Configure the contact popup form that appears on your website
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={saveConfig}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Contact Popup</h3>
                <p className="text-sm text-muted-foreground">
                  Show floating contact button on your website
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={config.enabled ? "default" : "secondary"}>
                {config.enabled ? "Active" : "Disabled"}
              </Badge>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => updateConfig("enabled", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="fields">Form Fields</TabsTrigger>
          <TabsTrigger value="products">Product Options</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Popup Content</CardTitle>
              <CardDescription>
                Customize the text and messaging displayed in the popup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={config.title}
                  onChange={(e) => updateConfig("title", e.target.value)}
                  placeholder="Adams Electric Solutions"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Textarea
                  id="subtitle"
                  value={config.subtitle}
                  onChange={(e) => updateConfig("subtitle", e.target.value)}
                  placeholder="Take advantage of our complimentary 45-minute Impact Session..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => updateConfig("description", e.target.value)}
                  placeholder="Our Value+ Team will develop quality-driven strategies..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Submit Button Text</Label>
                  <Input
                    id="buttonText"
                    value={config.buttonText}
                    onChange={(e) => updateConfig("buttonText", e.target.value)}
                    placeholder="Request Free Session"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="successMessage">Success Message</Label>
                  <Input
                    id="successMessage"
                    value={config.successMessage}
                    onChange={(e) => updateConfig("successMessage", e.target.value)}
                    placeholder="Thank you! We'll be in touch within 24 hours."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Form Fields</CardTitle>
                  <CardDescription>
                    Configure which fields appear in the contact form
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddFieldOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={cn(
                      "flex items-center gap-4 p-4 border rounded-lg",
                      !field.enabled && "bg-muted/50 opacity-60"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveField(field.id, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveField(field.id, "down")}
                        disabled={index === config.fields.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1 grid gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Placeholder</Label>
                        <Input
                          value={field.placeholder || ""}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) =>
                            updateField(field.id, { type: value as PopupField["type"] })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`required-${field.id}`}
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateField(field.id, { required: checked })
                            }
                          />
                          <Label htmlFor={`required-${field.id}`} className="text-xs">
                            Required
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={(checked) => updateField(field.id, { enabled: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product/Service Options</CardTitle>
              <CardDescription>
                Configure the product selection options in the form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productLabel">Selection Label</Label>
                <Input
                  id="productLabel"
                  value={config.productLabel}
                  onChange={(e) => updateConfig("productLabel", e.target.value)}
                  placeholder="For a free demo, please select one of the EDGE products below:"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Allow Custom Option</Label>
                  <p className="text-sm text-muted-foreground">
                    Let users enter their own option if not listed
                  </p>
                </div>
                <Switch
                  checked={config.allowCustomProduct}
                  onCheckedChange={(checked) => updateConfig("allowCustomProduct", checked)}
                />
              </div>

              <div className="space-y-3">
                <Label>Product Options</Label>
                {config.productOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...config.productOptions];
                        newOptions[index] = e.target.value;
                        updateConfig("productOptions", newOptions);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => removeProductOption(option)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new product option..."
                    value={newProductOption}
                    onChange={(e) => setNewProductOption(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addProductOption()}
                  />
                  <Button onClick={addProductOption}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>Configure when and where the popup appears</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position">Button Position</Label>
                  <Select
                    value={config.position}
                    onValueChange={(value) =>
                      updateConfig("position", value as PopupConfig["position"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="triggerDelay">Auto-Open Delay (seconds)</Label>
                  <Input
                    id="triggerDelay"
                    type="number"
                    min="0"
                    value={config.triggerDelay}
                    onChange={(e) => updateConfig("triggerDelay", parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to 0 to disable auto-open
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Show on Pages</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Leave empty to show on all pages, or specify page paths (e.g., /, /about, /services)
                </p>
                <Textarea
                  value={config.showOnPages.join("\n")}
                  onChange={(e) =>
                    updateConfig(
                      "showOnPages",
                      e.target.value.split("\n").filter((p) => p.trim())
                    )
                  }
                  placeholder="/ (homepage)&#10;/about&#10;/services"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Field Dialog */}
      <Dialog open={isAddFieldOpen} onOpenChange={setIsAddFieldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Field</DialogTitle>
            <DialogDescription>Add a new field to the contact form</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newFieldLabel">Field Label</Label>
              <Input
                id="newFieldLabel"
                value={newField.label || ""}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                placeholder="e.g., Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newFieldPlaceholder">Placeholder</Label>
              <Input
                id="newFieldPlaceholder"
                value={newField.placeholder || ""}
                onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                placeholder="e.g., Enter your company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newFieldType">Field Type</Label>
              <Select
                value={newField.type}
                onValueChange={(value) => setNewField({ ...newField, type: value as PopupField["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="newFieldRequired"
                checked={newField.required}
                onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
              />
              <Label htmlFor="newFieldRequired">Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFieldOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addField}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-primary">V</span>
                <sup className="text-primary text-xl">+</sup>
                <DialogTitle className="text-xl text-primary font-semibold">
                  {config.title}
                </DialogTitle>
              </div>
              <p className="text-base font-medium text-foreground">{config.subtitle}</p>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </DialogHeader>

            <div className="space-y-4 mt-6">
              {config.fields
                .filter((f) => f.enabled)
                .map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.type === "textarea" ? (
                      <Textarea placeholder={field.placeholder} className="bg-muted/50" rows={3} />
                    ) : (
                      <Input placeholder={field.placeholder} className="bg-muted/50" />
                    )}
                  </div>
                ))}

              {config.productOptions.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-primary">
                    {config.productLabel}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <div className="space-y-2">
                    {config.productOptions.map((option) => (
                      <div key={option} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                        <span className="text-sm">{option}</span>
                      </div>
                    ))}
                    {config.allowCustomProduct && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                        <Input
                          placeholder="Press enter to add custom option"
                          className="flex-1 bg-muted/50 h-8"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button className="w-full" size="lg">
                {config.buttonText}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
