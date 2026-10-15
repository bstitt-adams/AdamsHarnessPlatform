"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  CreditCard,
  TrendingUp,
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  getAllPurchases,
  getPurchaseStats,
  type CoursePurchaseDoc,
} from "@/lib/firebase-lms";
import { formatPrice } from "@/lib/stripe";

type PaymentStatus = "all" | "paid" | "pending" | "failed" | "refunded";

function getStatusBadge(status: CoursePurchaseDoc["paymentStatus"]) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    case "pending":
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "failed":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case "refunded":
      return <Badge variant="outline"><RotateCcw className="h-3 w-3 mr-1" />Refunded</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function PurchasesAdminPage() {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<CoursePurchaseDoc[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<CoursePurchaseDoc[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPurchases: 0,
    paidPurchases: 0,
    pendingPurchases: 0,
    refundedPurchases: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPurchases();
  }, [purchases, searchQuery, statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [purchasesData, statsData] = await Promise.all([
        getAllPurchases(),
        getPurchaseStats(),
      ]);
      setPurchases(purchasesData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading purchases:", error);
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }

  function filterPurchases() {
    let filtered = [...purchases];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.paymentStatus === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.userName.toLowerCase().includes(query) ||
          p.userEmail.toLowerCase().includes(query) ||
          p.courseTitle.toLowerCase().includes(query)
      );
    }

    setFilteredPurchases(filtered);
  }

  function exportToCSV() {
    const headers = ["Date", "Customer", "Email", "Course", "Amount", "Status"];
    const rows = filteredPurchases.map((p) => [
      p.purchasedAt?.toDate?.()?.toLocaleDateString() || "N/A",
      p.userName,
      p.userEmail,
      p.courseTitle,
      formatPrice(p.totalInCents),
      p.paymentStatus,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `course-purchases-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Purchases exported to CSV");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/admin/academy">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Academy
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Purchases</h1>
          <p className="text-muted-foreground">
            View and manage all course purchases and revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats.paidPurchases} paid purchases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPurchases}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">
              {stats.pendingPurchases}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunded</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.refundedPurchases}
            </div>
            <p className="text-xs text-muted-foreground">Total refunds</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>
            {filteredPurchases.length} of {purchases.length} purchases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PaymentStatus)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No purchases found</h3>
              <p className="text-muted-foreground">
                {purchases.length === 0
                  ? "No course purchases have been made yet"
                  : "No purchases match your search criteria"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="text-sm">
                        {purchase.purchasedAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{purchase.userName}</p>
                          <p className="text-sm text-muted-foreground">
                            {purchase.userEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {purchase.courseTitle}
                      </TableCell>
                      <TableCell className="font-medium">
                        {purchase.totalInCents === 0
                          ? "Free"
                          : formatPrice(purchase.totalInCents)}
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.paymentStatus)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
