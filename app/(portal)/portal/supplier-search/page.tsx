"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Sparkles,
  Building2,
  ListFilter,
  Globe,
  CheckCircle,
  MessageSquare,
  Zap,
  Download,
  Bot,
  User,
  Loader2,
  ExternalLink,
  MapPin,
  Phone,
  Factory,
  Award,
  Users,
  Plus,
  Save,
  Trash2,
  FileText,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type ThomasNetSupplierDoc, type ThomasNetSavedListDoc, type SavedSupplierContact } from "@/lib/schema";

// Supplier categories for filtering
const supplierCategories = [
  { id: "machining", name: "CNC Machining", icon: Factory },
  { id: "metal-fabrication", name: "Metal Fabrication", icon: Factory },
  { id: "plastic", name: "Plastic & Injection Molding", icon: Factory },
  { id: "electronics", name: "Electronics Manufacturing", icon: Factory },
  { id: "automotive", name: "Automotive Parts", icon: Factory },
  { id: "aerospace", name: "Aerospace Components", icon: Factory },
  { id: "medical", name: "Medical Devices", icon: Factory },
  { id: "packaging", name: "Packaging", icon: Factory },
  { id: "casting", name: "Casting & Foundry", icon: Factory },
  { id: "assembly", name: "Contract Assembly", icon: Factory },
];

// Sample search suggestions
const searchSuggestions = [
  "Find CNC machining suppliers in Ohio",
  "Metal fabrication companies near Detroit with ISO certification",
  "Plastic injection molding manufacturers in the Midwest",
  "Aerospace parts suppliers with AS9100 certification",
  "Medical device contract manufacturers FDA registered",
];

// Message types for the chat
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  results?: SupplierResult[];
  suggestions?: string[];
}

interface SupplierResult {
  id: string;
  companyName: string;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  categories?: string[];
  certifications?: string[];
  employeeCount?: string;
  thomasnetUrl?: string;
}

export default function SupplierSearchPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Welcome to Supplier Search! I can help you find manufacturing suppliers using natural language. Try asking something like:\n\n• \"Find CNC machining suppliers in Ohio\"\n• \"Metal fabrication companies near Detroit\"\n• \"ISO certified plastic injection molding\"\n\nWhat kind of suppliers are you looking for today?",
      timestamp: new Date(),
      suggestions: searchSuggestions,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [allResults, setAllResults] = useState<SupplierResult[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search type state (All Suppliers, By Name, By Brand, Product Catalogs)
  const [searchType, setSearchType] = useState<"all" | "name" | "brand" | "catalogs">("all");
  const [directSearchQuery, setDirectSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

  // Category search state
  const [selectedCategory, setSelectedCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  // Saved lists state
  const [savedLists, setSavedLists] = useState<ThomasNetSavedListDoc[]>([]);
  const [showAddToListDialog, setShowAddToListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [addingToList, setAddingToList] = useState(false);

  // Supplier detail dialog
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<SupplierResult | null>(null);
  const [supplierNotes, setSupplierNotes] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load saved lists on mount
  useEffect(() => {
    loadSavedLists();
  }, []);

  const loadSavedLists = async () => {
    if (!db) return;
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.THOMASNET_SAVED_LISTS));
      const lists: ThomasNetSavedListDoc[] = [];
      querySnapshot.forEach((docSnap) => {
        lists.push({ id: docSnap.id, ...docSnap.data() } as ThomasNetSavedListDoc);
      });
      setSavedLists(lists);
    } catch (error) {
      console.error("Error loading saved lists:", error);
    }
  };

  // Generate unique ID for messages
  const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Search suppliers via API
  const searchSuppliers = async (query: string): Promise<{ results: SupplierResult[]; message: string }> => {
    try {
      const response = await fetch("/api/thomasnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ai_search",
          searchParams: { query },
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          results: data.results || [],
          message: data.interpretation || `Found ${data.total} suppliers`,
        };
      }
      return { results: [], message: data.error || "Search failed. Please try again." };
    } catch (error) {
      console.error("Search error:", error);
      return { results: [], message: "Search failed. Please try again." };
    }
  };

  // Search by category
  const searchByCategory = async () => {
    if (!selectedCategory) return;

    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: `Search for ${selectedCategory} suppliers${locationFilter ? ` in ${locationFilter}` : ""}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/thomasnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search_by_category",
          searchParams: {
            category: selectedCategory,
            location: locationFilter,
          },
        }),
      });

      const data = await response.json();

      const responseMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: data.results?.length > 0
          ? `✅ **Found ${data.results.length} suppliers** in the ${selectedCategory} category${locationFilter ? ` near ${locationFilter}` : ""}.\n\nYou can save suppliers to a list or view their details.`
          : `🔍 **No suppliers found** for ${selectedCategory}${locationFilter ? ` in ${locationFilter}` : ""}. Try a different category or remove the location filter.`,
        timestamp: new Date(),
        results: data.results || [],
      };

      setMessages((prev) => [...prev, responseMessage]);
      setActiveTab("results"); // Switch to results tab to show results
      if (data.results?.length > 0) {
        setAllResults((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newResults = data.results.filter((r: SupplierResult) => !existingIds.has(r.id));
          return [...prev, ...newResults];
        });
      }
    } catch (error) {
      console.error("Category search error:", error);
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "❌ **Search failed**. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle direct search with query parameter (for All Suppliers tab)
  const handleDirectSearch = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setDirectSearchQuery("");
    setIsLoading(true);

    try {
      const { results, message } = await searchSuppliers(query);

      const responseMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: results.length > 0
          ? `✅ ${message}\n\nI found **${results.length} suppliers** matching your criteria. You can save them to a list or click on any supplier to view details.`
          : `🔍 ${message}\n\nTry adjusting your search terms or browse by category.`,
        timestamp: new Date(),
        results: results.length > 0 ? results : undefined,
        suggestions: results.length === 0 ? searchSuggestions : undefined,
      };

      setMessages((prev) => [...prev, responseMessage]);
      setActiveTab("results"); // Switch to results tab

      // Add to all results
      if (results.length > 0) {
        setAllResults((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newResults = results.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newResults];
        });
      }
    } catch (error) {
      console.error("Direct search error:", error);
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "❌ **Something went wrong**. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { results, message } = await searchSuppliers(inputValue);

      const responseMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: results.length > 0
          ? `✅ ${message}\n\nI found **${results.length} suppliers** matching your criteria. You can save them to a list or click on any supplier to view details.`
          : `🔍 ${message}\n\nTry adjusting your search terms or browse by category.`,
        timestamp: new Date(),
        results: results.length > 0 ? results : undefined,
        suggestions: results.length === 0 ? searchSuggestions : undefined,
      };

      setMessages((prev) => [...prev, responseMessage]);

      // Add to all results
      if (results.length > 0) {
        setAllResults((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newResults = results.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newResults];
        });
      }
    } catch (error) {
      console.error("Message handling error:", error);
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "❌ **Something went wrong**. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle supplier selection
  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId);
      } else {
        newSet.add(supplierId);
      }
      return newSet;
    });
  };

  // Add suppliers to a list
  const addSuppliersToList = async (suppliers: SupplierResult[], listId: string | null, newListName?: string) => {
    if (!db || suppliers.length === 0) return;

    setAddingToList(true);

    try {
      // Convert to SavedSupplierContact format
      const contacts: SavedSupplierContact[] = suppliers.map((supplier) => ({
        thomasnetId: supplier.id,
        companyName: supplier.companyName,
        description: supplier.description,
        location: supplier.location,
        city: supplier.city,
        state: supplier.state,
        phone: supplier.phone,
        website: supplier.website,
        categories: supplier.categories,
        certifications: supplier.certifications,
        employeeCount: supplier.employeeCount,
        thomasnetUrl: supplier.thomasnetUrl,
        addedAt: Timestamp.now(),
      }));

      if (listId) {
        // Add to existing list
        const listRef = doc(db, COLLECTIONS.THOMASNET_SAVED_LISTS, listId);
        const listSnap = await getDoc(listRef);

        if (listSnap.exists()) {
          const existingSuppliers = listSnap.data().suppliers || [];
          const existingIds = new Set(existingSuppliers.map((s: SavedSupplierContact) => s.thomasnetId));
          const newSuppliers = contacts.filter((c) => !existingIds.has(c.thomasnetId));

          await updateDoc(listRef, {
            suppliers: [...existingSuppliers, ...newSuppliers],
            updatedAt: Timestamp.now(),
          });
        }
      } else if (newListName) {
        // Create new list
        const newList = {
          name: newListName,
          suppliers: contacts,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await addDoc(collection(db, COLLECTIONS.THOMASNET_SAVED_LISTS), newList);
      }

      await loadSavedLists();
      setShowAddToListDialog(false);
      setNewListName("");
      setSelectedListId(null);
      setSelectedSuppliers(new Set());
    } catch (error) {
      console.error("Error adding to list:", error);
    } finally {
      setAddingToList(false);
    }
  };

  // Export results to CSV
  const exportToCSV = (data: SupplierResult[] | SavedSupplierContact[], filename: string) => {
    if (data.length === 0) return;

    const headers = ["Company Name", "Description", "Location", "Phone", "Website", "Categories", "Certifications", "Employee Count"];

    const rows = data.map((item) => {
      const row = [
        item.companyName || "",
        item.description || "",
        item.location || "",
        item.phone || "",
        item.website || "",
        item.categories?.join("; ") || "",
        item.certifications?.join("; ") || "",
        item.employeeCount || "",
      ];
      return row.map((val) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete a saved list
  const deleteList = async (listId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.THOMASNET_SAVED_LISTS, listId));
      await loadSavedLists();
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-blue-600">
                <Factory className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  Supplier Search
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Powered
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Search 500,000+ Trusted Industrial Suppliers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedSuppliers.size > 0 && (
                <Button onClick={() => setShowAddToListDialog(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save {selectedSuppliers.size} Selected
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="border-b px-4">
            <TabsList className="h-10">
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Chat
              </TabsTrigger>
              <TabsTrigger value="category" className="gap-2">
                <Factory className="h-4 w-4" />
                Category Search
              </TabsTrigger>
              <TabsTrigger value="all-suppliers" className="gap-2">
                <Building2 className="h-4 w-4" />
                All Suppliers
              </TabsTrigger>
              <TabsTrigger value="by-name" className="gap-2">
                <Search className="h-4 w-4" />
                By Name
              </TabsTrigger>
              <TabsTrigger value="by-brand" className="gap-2">
                <Award className="h-4 w-4" />
                By Brand
              </TabsTrigger>
              <TabsTrigger value="catalogs" className="gap-2">
                <FileText className="h-4 w-4" />
                Product Catalogs
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-2">
                <Building2 className="h-4 w-4" />
                Results ({allResults.length})
              </TabsTrigger>
              <TabsTrigger value="lists" className="gap-2">
                <ListFilter className="h-4 w-4" />
                Saved Lists ({savedLists.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* AI Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 min-h-0 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg p-4 max-w-[80%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {/* Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                setInputValue(suggestion);
                                inputRef.current?.focus();
                              }}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Results */}
                      {message.results && message.results.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {message.results.map((supplier) => (
                            <Card
                              key={supplier.id}
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-md",
                                selectedSuppliers.has(supplier.id) && "ring-2 ring-primary"
                              )}
                              onClick={() => toggleSupplierSelection(supplier.id)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-sm">{supplier.companyName}</h4>
                                      {selectedSuppliers.has(supplier.id) && (
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {supplier.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      {supplier.location && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {supplier.location}
                                        </span>
                                      )}
                                      {supplier.phone && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {supplier.phone}
                                        </span>
                                      )}
                                      {supplier.employeeCount && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {supplier.employeeCount}
                                        </span>
                                      )}
                                    </div>
                                    {supplier.categories && supplier.categories.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {supplier.categories.slice(0, 3).map((cat, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {cat}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSupplierDetail(supplier);
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Searching suppliers...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4">
              <div className="max-w-4xl mx-auto flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Describe the suppliers you're looking for..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Category Search Tab */}
          <TabsContent value="category" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="p-4 max-w-2xl mx-auto w-full">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5" />
                    Search by Category
                  </CardTitle>
                  <CardDescription>
                    Browse suppliers by manufacturing category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category *</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location (optional)</label>
                    <Input
                      placeholder="e.g., Ohio, Detroit, Midwest"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={searchByCategory}
                    disabled={!selectedCategory || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search Suppliers
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Category Buttons */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3">Quick Categories</h3>
                <div className="grid grid-cols-2 gap-2">
                  {supplierCategories.slice(0, 6).map((cat) => (
                    <Button
                      key={cat.id}
                      variant="outline"
                      className="justify-start"
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setActiveTab("category");
                      }}
                    >
                      <Factory className="h-4 w-4 mr-2" />
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* All Suppliers Tab */}
          <TabsContent value="all-suppliers" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="p-4 max-w-2xl mx-auto w-full">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    All Suppliers Search
                  </CardTitle>
                  <CardDescription>
                    Describe what you&apos;re looking for — Be as detailed as you like
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search Query</label>
                    <Input
                      placeholder="e.g., CNC machining suppliers with ISO certification"
                      value={directSearchQuery}
                      onChange={(e) => setDirectSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && directSearchQuery.trim()) {
                          handleDirectSearch(directSearchQuery);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Region (optional)</label>
                    <Select value={regionFilter} onValueChange={setRegionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="northeast">Northeast</SelectItem>
                        <SelectItem value="southeast">Southeast</SelectItem>
                        <SelectItem value="midwest">Midwest</SelectItem>
                        <SelectItem value="southwest">Southwest</SelectItem>
                        <SelectItem value="west">West</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleDirectSearch(directSearchQuery)}
                    disabled={!directSearchQuery.trim() || isLoading}
                    className="w-full"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Search All Suppliers
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* By Name Tab */}
          <TabsContent value="by-name" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="p-4 max-w-2xl mx-auto w-full">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search Suppliers by Name
                  </CardTitle>
                  <CardDescription>
                    Find a specific supplier by company name
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Name</label>
                    <Input
                      placeholder="Enter supplier company name..."
                      value={directSearchQuery}
                      onChange={(e) => setDirectSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && directSearchQuery.trim()) {
                          handleDirectSearch(directSearchQuery);
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => handleDirectSearch(directSearchQuery)}
                    disabled={!directSearchQuery.trim() || isLoading}
                    className="w-full"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Search by Name
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* By Brand Tab */}
          <TabsContent value="by-brand" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="p-4 max-w-2xl mx-auto w-full">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Search Suppliers by Brand
                  </CardTitle>
                  <CardDescription>
                    Find suppliers that carry specific brands or products
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Brand Name</label>
                    <Input
                      placeholder="Enter brand name..."
                      value={directSearchQuery}
                      onChange={(e) => setDirectSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && directSearchQuery.trim()) {
                          handleDirectSearch(`${directSearchQuery} brand suppliers`);
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => handleDirectSearch(`${directSearchQuery} brand suppliers`)}
                    disabled={!directSearchQuery.trim() || isLoading}
                    className="w-full"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Search by Brand
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Product Catalogs Tab */}
          <TabsContent value="catalogs" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="p-4 max-w-2xl mx-auto w-full">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Product Catalogs
                  </CardTitle>
                  <CardDescription>
                    Search product catalogs and specifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product or Catalog Search</label>
                    <Input
                      placeholder="Search product catalogs..."
                      value={directSearchQuery}
                      onChange={(e) => setDirectSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && directSearchQuery.trim()) {
                          setInputValue(`${directSearchQuery} product catalog`);
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (directSearchQuery.trim()) {
                        setInputValue(`${directSearchQuery} product catalog`);
                        handleSendMessage();
                      }
                    }}
                    disabled={!directSearchQuery.trim() || isLoading}
                    className="w-full"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Search Catalogs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full min-h-0 p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {allResults.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No results yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Search for suppliers using AI Chat or Category Search
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">
                          {allResults.length} Supplier{allResults.length !== 1 ? "s" : ""} Found
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          Data sourced from{" "}
                          <a 
                            href="https://www.thomasnet.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            ThomasNet.com
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {selectedSuppliers.size > 0 && (
                          <Button variant="outline" size="sm" onClick={() => setShowAddToListDialog(true)}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Selected ({selectedSuppliers.size})
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportToCSV(allResults, "supplier_results")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
                    </div>

                    {allResults.map((supplier) => (
                      <Card
                        key={supplier.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedSuppliers.has(supplier.id) && "ring-2 ring-primary"
                        )}
                        onClick={() => toggleSupplierSelection(supplier.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{supplier.companyName}</h4>
                                {selectedSuppliers.has(supplier.id) && (
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {supplier.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-4 mt-3">
                                {supplier.location && (
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {supplier.location}
                                  </span>
                                )}
                                {supplier.phone && (
                                  <span className="text-sm text-green-600 flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    {supplier.phone}
                                  </span>
                                )}
                                {supplier.employeeCount && (
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {supplier.employeeCount}
                                  </span>
                                )}
                                {supplier.website && (
                                  <a
                                    href={`https://${supplier.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Globe className="h-4 w-4" />
                                    {supplier.website}
                                  </a>
                                )}
                              </div>
                              {supplier.categories && supplier.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {supplier.categories.map((cat, idx) => (
                                    <Badge key={idx} variant="secondary">
                                      {cat}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {supplier.certifications && supplier.certifications.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {supplier.certifications.map((cert, idx) => (
                                    <Badge key={idx} variant="outline" className="text-green-600 border-green-600">
                                      <Award className="h-3 w-3 mr-1" />
                                      {cert}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {supplier.thomasnetUrl && (
                                <a
                                  href={supplier.thomasnetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-orange-600 hover:underline flex items-center gap-1 mt-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View on ThomasNet
                                </a>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSupplierDetail(supplier);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Saved Lists Tab */}
          <TabsContent value="lists" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full min-h-0 p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {savedLists.length === 0 ? (
                  <div className="text-center py-12">
                    <ListFilter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No saved lists yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Search for suppliers and save them to a list
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {savedLists.length} Saved List{savedLists.length !== 1 ? "s" : ""}
                      </h3>
                    </div>

                    {savedLists.map((list) => (
                      <Card key={list.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <ListFilter className="h-5 w-5" />
                              {list.name}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {list.suppliers?.length || 0} suppliers
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const exportData = (list.suppliers || []).map((s) => ({
                                    ...s,
                                    id: s.thomasnetId || "",
                                  }));
                                  exportToCSV(exportData as SupplierResult[], `list_${list.name.replace(/\s+/g, "_")}`);
                                }}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Export
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteList(list.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription>
                            Created {list.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {(list.suppliers || []).map((supplier, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{supplier.companyName}</p>
                                  {supplier.location && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3" />
                                      {supplier.location}
                                    </p>
                                  )}
                                  <div className="flex gap-3 mt-2">
                                    {supplier.phone && (
                                      <span className="text-xs text-green-600 flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {supplier.phone}
                                      </span>
                                    )}
                                    {supplier.website && (
                                      <a
                                        href={`https://${supplier.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
                                      >
                                        <Globe className="h-3 w-3" />
                                        Website
                                      </a>
                                    )}
                                  </div>
                                  {supplier.categories && supplier.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {supplier.categories.slice(0, 3).map((cat, catIdx) => (
                                        <Badge key={catIdx} variant="secondary" className="text-xs">
                                          {cat}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Sidebar - Categories */}
      <div className="w-72 border-l bg-muted/30 overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            Quick Search
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Browse by category
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-1">
            {supplierCategories.map((category) => (
              <button
                key={category.id}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                onClick={() => {
                  setSelectedCategory(category.name);
                  setActiveTab("category");
                }}
              >
                <Factory className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{category.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Add to List Dialog */}
      <Dialog open={showAddToListDialog} onOpenChange={setShowAddToListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Suppliers to List</DialogTitle>
            <DialogDescription>
              Add {selectedSuppliers.size} selected supplier{selectedSuppliers.size !== 1 ? "s" : ""} to a list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Add to existing list</label>
              <Select value={selectedListId || undefined} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a list" />
                </SelectTrigger>
                <SelectContent>
                  {savedLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name} ({list.suppliers?.length || 0} suppliers)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Create new list</label>
              <Input
                placeholder="Enter list name"
                value={newListName}
                onChange={(e) => {
                  setNewListName(e.target.value);
                  if (e.target.value) setSelectedListId(null);
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToListDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const suppliersToAdd = allResults.filter((r) => selectedSuppliers.has(r.id));
                addSuppliersToList(suppliersToAdd, selectedListId, newListName || undefined);
              }}
              disabled={addingToList || (!selectedListId && !newListName)}
            >
              {addingToList ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Save to List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Dialog */}
      <Dialog open={!!selectedSupplierDetail} onOpenChange={() => setSelectedSupplierDetail(null)}>
        <DialogContent className="max-w-2xl">
          {selectedSupplierDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {selectedSupplierDetail.companyName}
                </DialogTitle>
                <DialogDescription>
                  {selectedSupplierDetail.location}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm">{selectedSupplierDetail.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  {selectedSupplierDetail.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{selectedSupplierDetail.phone}</span>
                    </div>
                  )}
                  {selectedSupplierDetail.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <a
                        href={`https://${selectedSupplierDetail.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {selectedSupplierDetail.website}
                      </a>
                    </div>
                  )}
                  {selectedSupplierDetail.employeeCount && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedSupplierDetail.employeeCount} employees</span>
                    </div>
                  )}
                  {selectedSupplierDetail.thomasnetUrl && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={selectedSupplierDetail.thomasnetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View on ThomasNet
                      </a>
                    </div>
                  )}
                </div>

                {selectedSupplierDetail.categories && selectedSupplierDetail.categories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedSupplierDetail.categories.map((cat, idx) => (
                        <Badge key={idx} variant="secondary">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSupplierDetail.certifications && selectedSupplierDetail.certifications.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Certifications</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedSupplierDetail.certifications.map((cert, idx) => (
                        <Badge key={idx} variant="outline" className="text-green-600 border-green-600">
                          <Award className="h-3 w-3 mr-1" />
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <Textarea
                    placeholder="Add notes about this supplier..."
                    value={supplierNotes}
                    onChange={(e) => setSupplierNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedSupplierDetail(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    toggleSupplierSelection(selectedSupplierDetail.id);
                    setSelectedSupplierDetail(null);
                  }}
                >
                  {selectedSuppliers.has(selectedSupplierDetail.id) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Select Supplier
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
