# Admin Backend Website Build Prompt

Use this prompt to create an admin backend website with the same configuration, look, and feel as the Adams Platform admin section.

---

## Project Overview

Build a modern, professional admin backend dashboard using **Next.js 16+** with the **App Router**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Firebase Firestore** for data persistence. The UI should use **shadcn/ui** components with **Radix UI** primitives and **Lucide React** icons.

---

## Tech Stack

```json
{
  "framework": "Next.js 16.x (App Router)",
  "react": "19.x",
  "typescript": "5.x",
  "styling": "Tailwind CSS 4.x",
  "ui-components": "shadcn/ui with Radix UI primitives",
  "icons": "lucide-react",
  "database": "Firebase Firestore",
  "state-management": "React useState/useEffect + Zustand (optional)",
  "forms": "react-hook-form with zod validation",
  "charts": "recharts (if needed)",
  "animations": "tw-animate-css"
}
```

---

## Brand Colors & Theme

Use CSS custom properties for theming with light/dark mode support:

```css
:root {
  --radius: 0.625rem;
  /* Light Mode */
  --background: #f3f0ec;
  --foreground: #000000;
  --card: #ffffff;
  --card-foreground: #000000;
  --popover: #ffffff;
  --popover-foreground: #000000;
  --primary: #FFC72C;           /* Gold/Yellow - Primary brand color */
  --primary-foreground: #000000;
  --secondary: #188bf6;          /* Blue - Secondary actions */
  --secondary-foreground: #ffffff;
  --muted: #d6ddd3;
  --muted-foreground: #596654;
  --accent: #FFC72C;
  --accent-foreground: #000000;
  --destructive: #e93d3d;        /* Red - Delete/danger actions */
  --destructive-foreground: #ffffff;
  --border: #cbd5e0;
  --input: #cbd5e0;
  --ring: #FFC72C;
  /* Sidebar - Dark theme */
  --sidebar: #000000;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #FFC72C;
  --sidebar-primary-foreground: #000000;
  --sidebar-accent: #1a1a1a;
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: #333333;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ffffff;
  --card: #1a1a1a;
  --card-foreground: #ffffff;
  --popover: #1a1a1a;
  --popover-foreground: #ffffff;
  --primary: #FFC72C;
  --primary-foreground: #000000;
  --secondary: #188bf6;
  --secondary-foreground: #ffffff;
  --muted: #2a2a2a;
  --muted-foreground: #a0a0a0;
  --accent: #FFC72C;
  --accent-foreground: #000000;
  --destructive: #e93d3d;
  --border: #333333;
  --input: #333333;
  --ring: #FFC72C;
}
```

---

## Required shadcn/ui Components

Install and use these components:

- **Layout**: Card, Tabs, ScrollArea, Separator
- **Forms**: Input, Label, Textarea, Select, Switch, Checkbox, RadioGroup
- **Feedback**: Badge, Progress, Avatar, Tooltip
- **Overlays**: Dialog, DropdownMenu, Popover, AlertDialog
- **Data Display**: Table (TableHeader, TableBody, TableRow, TableCell, TableHead)
- **Actions**: Button

---

## Admin Page Structure & Patterns

Each admin management page should follow this consistent pattern:

### 1. Page Header
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold">[Entity] Management</h1>
    <p className="text-muted-foreground">
      Manage your [entities] and their information
    </p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" onClick={handleRefresh}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh
    </Button>
    <Button onClick={() => openDialog()}>
      <Plus className="h-4 w-4 mr-2" />
      Add [Entity]
    </Button>
  </div>
</div>
```

### 2. Stats Cards Row
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Total [Entities]
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{total}</div>
    </CardContent>
  </Card>
  {/* More stat cards... */}
</div>
```

### 3. Search & Filter Bar
```tsx
<div className="flex items-center gap-4">
  <div className="relative flex-1 max-w-sm">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search [entities]..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-10"
    />
  </div>
  <Select value={filter} onValueChange={setFilter}>
    <SelectTrigger className="w-40">
      <SelectValue placeholder="Filter by..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
    </SelectContent>
  </Select>
  <div className="flex border rounded-md">
    <Button
      variant={viewMode === "list" ? "secondary" : "ghost"}
      size="sm"
      onClick={() => setViewMode("list")}
    >
      <List className="h-4 w-4" />
    </Button>
    <Button
      variant={viewMode === "card" ? "secondary" : "ghost"}
      size="sm"
      onClick={() => setViewMode("card")}
    >
      <LayoutGrid className="h-4 w-4" />
    </Button>
  </div>
</div>
```

### 4. Data Table (List View)
```tsx
<Card>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Role</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {filteredItems.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="font-medium">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {item.firstName[0]}{item.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{item.firstName} {item.lastName}</div>
                <div className="text-sm text-muted-foreground">{item.company}</div>
              </div>
            </div>
          </TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>
            <Badge variant={item.status === "active" ? "default" : "secondary"}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell>{item.role}</TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(item)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(item.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Card>
```

### 5. Add/Edit Dialog
```tsx
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        {editingItem ? "Edit" : "Add"} [Entity]
      </DialogTitle>
      <DialogDescription>
        {editingItem ? "Update" : "Create a new"} [entity] record
      </DialogDescription>
    </DialogHeader>
    
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            placeholder="Enter first name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            placeholder="Enter last name"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder="email@example.com"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select 
          value={formData.status} 
          onValueChange={(value) => setFormData({...formData, status: value})}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            {editingItem ? "Update" : "Create"}
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Firebase Integration Pattern

### Schema Definition (`lib/schema.ts`)
```typescript
import { Timestamp } from "firebase/firestore";

export interface EntityDoc {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  role: "admin" | "user" | "guest";
  status: "active" | "inactive" | "pending";
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const COLLECTIONS = {
  USERS: "users",
  ENTITIES: "entities",
  // Add more collections...
} as const;
```

### Firebase Config (`lib/firebase.ts`)
```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
```

### CRUD Operations Pattern
```typescript
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type EntityDoc } from "@/lib/schema";

// Fetch all
const fetchEntities = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.ENTITIES));
  const data: EntityDoc[] = [];
  querySnapshot.forEach((docSnap) => {
    data.push({ id: docSnap.id, ...docSnap.data() } as EntityDoc);
  });
  return data;
};

// Create
const createEntity = async (data: Omit<EntityDoc, "id" | "createdAt" | "updatedAt">) => {
  await addDoc(collection(db, COLLECTIONS.ENTITIES), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

// Update
const updateEntity = async (id: string, data: Partial<EntityDoc>) => {
  await updateDoc(doc(db, COLLECTIONS.ENTITIES, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

// Delete
const deleteEntity = async (id: string) => {
  await deleteDoc(doc(db, COLLECTIONS.ENTITIES, id));
};
```

---

## Accessibility Requirements (WCAG 2.1 Compliant)

1. **Focus indicators**: All interactive elements must have visible focus states
2. **Reduced motion**: Respect `prefers-reduced-motion` preference
3. **Minimum touch targets**: 24x24px minimum for buttons/links
4. **Color contrast**: Ensure 4.5:1 ratio for text
5. **Screen reader support**: Use semantic HTML and ARIA labels

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## File Structure

```
app/
├── (admin)/
│   └── admin/
│       ├── layout.tsx          # Admin layout with sidebar
│       ├── page.tsx            # Dashboard
│       ├── users/
│       │   └── page.tsx        # User management
│       ├── [entity]/
│       │   └── page.tsx        # Entity management pages
│       └── settings/
│           └── page.tsx        # Admin settings
├── api/
│   └── [endpoints]/
│       └── route.ts            # API routes
├── globals.css                 # Theme & global styles
└── layout.tsx                  # Root layout

components/
├── ui/                         # shadcn/ui components
└── admin/                      # Admin-specific components

lib/
├── firebase.ts                 # Firebase config
├── schema.ts                   # Firestore types & collections
└── utils.ts                    # Utility functions
```

---

## Key Features to Implement

1. **Dashboard** - Overview stats, recent activity, quick actions
2. **User Management** - CRUD for users with roles/permissions
3. **Entity Management** - Generic CRUD pages following the pattern above
4. **Search & Filtering** - Real-time search with status/role filters
5. **View Modes** - Toggle between table (list) and card grid views
6. **Bulk Actions** - Seed data, bulk delete, export
7. **Responsive Design** - Mobile-friendly tables and forms
8. **Loading States** - Skeleton loaders and spinners
9. **Error Handling** - Toast notifications for success/error
10. **Dark Mode** - Full dark mode support via next-themes

---

## Example Icons Usage

```tsx
import {
  // Navigation
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  // Actions
  Plus, Pencil, Trash2, RefreshCw, Upload, Download,
  // Status
  CheckCircle, XCircle, AlertCircle, Clock,
  // Entities
  Users, Building2, Briefcase, Mail, Phone, Globe,
  // UI
  Search, Filter, MoreHorizontal, LayoutGrid, List,
  Eye, EyeOff, Settings, LogOut,
} from "lucide-react";
```

---

## Badge Variants

```tsx
// Status badges
<Badge variant="default">Active</Badge>      // Primary color
<Badge variant="secondary">Inactive</Badge>  // Gray
<Badge variant="destructive">Deleted</Badge> // Red
<Badge variant="outline">Pending</Badge>     // Outlined

// Role badges with custom colors
<Badge className="bg-purple-500 text-white">Admin</Badge>
<Badge className="bg-blue-500 text-white">Team</Badge>
<Badge className="bg-green-500 text-white">Affiliate</Badge>
```

---

Use this prompt as a foundation to build any admin backend with consistent styling, patterns, and functionality matching the Adams Platform admin section.
