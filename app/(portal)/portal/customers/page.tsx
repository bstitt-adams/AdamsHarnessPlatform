"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Building,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  FolderKanban,
  Mail,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";

interface CustomerDisplay {
  id: string;
  name: string;
  industry: string;
  size: string;
  location: string;
  status: "active" | "inactive" | "pending";
  projects: number;
  contacts: { name: string; role: string; initials: string }[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case "inactive":
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    case "pending":
      return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function mapTeamMemberToCustomer(member: TeamMemberDoc): CustomerDisplay {
  return {
    id: member.id,
    name: member.company || `${member.firstName} ${member.lastName}`.trim(),
    industry: member.expertise || member.title || "Client",
    size: "-",
    location: member.location || "-",
    status: member.status,
    projects: 0,
    contacts: [
      {
        name: `${member.firstName} ${member.lastName}`,
        role: member.title || "Contact",
        initials: getInitials(member.firstName, member.lastName),
      },
    ],
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadCustomers = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        const customersQuery = query(
          collection(db, COLLECTIONS.TEAM_MEMBERS),
          where("role", "==", "client")
        );
        const snapshot = await getDocs(customersQuery);
        const members = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TeamMemberDoc[];
        setCustomers(members.map(mapTeamMemberToCustomer));
      } catch (error) {
        console.error("Error loading customers:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const prospects = customers.filter((c) => c.status === "pending").length;
  const totalProjects = customers.reduce((sum, c) => sum + c.projects, 0);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage customer relationships and track engagements
          </p>
        </div>
        <Button asChild>
          <Link href="/portal/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{prospects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No customers found. Add a client user to get started.
                  </TableCell>
                </TableRow>
              )}
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Link
                          href={`/portal/customers/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {customer.size} employees
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.industry}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {customer.location}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(customer.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      {customer.projects}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {customer.contacts.slice(0, 3).map((contact, i) => (
                        <Avatar key={i} className="h-7 w-7 border-2 border-background">
                          <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                            {contact.initials}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {customer.contacts.length > 3 && (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                          +{customer.contacts.length - 3}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/portal/customers/${customer.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/portal/customers/${customer.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
