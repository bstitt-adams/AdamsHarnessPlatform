"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Banknote,
} from "lucide-react";

interface MercuryAccount {
  id: string;
  name: string;
  status: string;
  type: string;
  routingNumber: string;
  accountNumber: string;
  currentBalance: number;
  availableBalance: number;
  kind: string;
  createdAt: string;
}

interface MercuryTransaction {
  id: string;
  amount: number;
  bankDescription: string | null;
  counterpartyName: string;
  createdAt: string;
  dashboardLink: string;
  kind: string;
  note: string | null;
  externalMemo: string | null;
  postedAt: string | null;
  status: string;
}

interface MercuryRecipient {
  id: string;
  name: string;
  nickname: string | null;
  status: string;
  emails: string[];
  paymentMethod: string;
}

export default function MercuryPage() {
  const [accounts, setAccounts] = useState<MercuryAccount[]>([]);
  const [transactions, setTransactions] = useState<MercuryTransaction[]>([]);
  const [recipients, setRecipients] = useState<MercuryRecipient[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch transactions when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions(selectedAccountId);
    }
  }, [selectedAccountId]);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mercury?action=accounts");
      const data = await response.json();
      if (data.success && data.data?.accounts) {
        setAccounts(data.data.accounts);
        if (data.data.accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data.data.accounts[0].id);
        }
      } else {
        setError(data.error || "Failed to fetch accounts");
      }
    } catch (err) {
      setError("Failed to connect to Mercury API");
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (accountId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/mercury?action=transactions&accountId=${accountId}&limit=50`);
      const data = await response.json();
      if (data.success && data.data?.transactions) {
        setTransactions(data.data.transactions);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mercury?action=recipients");
      const data = await response.json();
      if (data.success && data.data?.recipients) {
        setRecipients(data.data.recipients);
      }
    } catch (err) {
      console.error("Error fetching recipients:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "sent":
      case "completed":
      case "active":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-sky-100 text-sky-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalAvailable = accounts.reduce((sum, acc) => sum + acc.availableBalance, 0);

  // Calculate income/expenses from transactions
  const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="h-8 w-8" />
            Mercury Bank
          </h1>
          <p className="text-muted-foreground">
            View your Mercury accounts, transactions, and recipients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAccounts} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href="https://app.mercury.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Mercury
            </a>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <Button asChild variant="default" size="sm">
                <a href="/portal/settings?tab=integrations">
                  Configure in Settings
                </a>
              </Button>
              <a 
                href="https://app.mercury.com/settings/tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Get API Token from Mercury
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Go to Settings → Integrations → Mercury Bank to add your API token.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Account Selector */}
      {accounts.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Account:</span>
          <Select value={selectedAccountId || ""} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} - {formatCurrency(account.currentBalance)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAvailable)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Income (Recent)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(income)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expenses (Recent)</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(expenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="recipients" className="flex items-center gap-2" onClick={fetchRecipients}>
            <Users className="h-4 w-4" />
            Recipients
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="overview" className="space-y-4">
          {accounts.length === 0 && !loading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No accounts found</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Mercury account to view your banking information.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {accounts.map((account) => (
                <Card key={account.id} className={account.id === selectedAccountId ? "ring-2 ring-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {account.name}
                        </CardTitle>
                        <CardDescription>
                          {account.type} • {account.kind}
                        </CardDescription>
                      </div>
                      {getStatusBadge(account.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="text-xl font-semibold">{formatCurrency(account.currentBalance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                        <p className="text-xl font-semibold">{formatCurrency(account.availableBalance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Routing Number</p>
                        <p className="font-mono">{account.routingNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Account Number</p>
                        <p className="font-mono">••••{account.accountNumber.slice(-4)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                {selectedAccount ? `Transactions for ${selectedAccount.name}` : "Select an account to view transactions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Counterparty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {transaction.bankDescription || transaction.note || transaction.kind}
                            </div>
                          </TableCell>
                          <TableCell>{transaction.counterpartyName}</TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell className="text-right">
                            <span className={transaction.amount >= 0 ? "text-green-600" : "text-red-600"}>
                              {transaction.amount >= 0 ? (
                                <ArrowDownLeft className="h-4 w-4 inline mr-1" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 inline mr-1" />
                              )}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <CardTitle>Payment Recipients</CardTitle>
              <CardDescription>
                Manage your saved payment recipients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recipients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No recipients found</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Nickname</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell>{recipient.nickname || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{recipient.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(recipient.status)}</TableCell>
                          <TableCell>{recipient.emails?.[0] || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Source Attribution */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Data provided by{" "}
            <a 
              href="https://mercury.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Mercury Bank
              <ExternalLink className="h-3 w-3" />
            </a>
            {" "}• Banking services provided through Choice Financial Group and Column N.A., Members FDIC
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
