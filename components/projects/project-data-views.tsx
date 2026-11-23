"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Table as TableIcon, LayoutGrid, KanbanSquare, GripVertical } from "lucide-react";

export type BoardStatus = "todo" | "in-progress" | "blocked" | "done";

export interface ProjectItem {
  id: string;
  title: string;
  sourceStatus: string;
  boardStatus: BoardStatus;
  fields: Record<string, string>;
  sortOrder: number;
}

const COLUMNS: { key: BoardStatus; label: string; badge: string }[] = [
  { key: "todo", label: "To Do", badge: "bg-gray-100 text-gray-800" },
  { key: "in-progress", label: "In Progress", badge: "bg-blue-100 text-blue-800" },
  { key: "blocked", label: "Blocked", badge: "bg-red-100 text-red-800" },
  { key: "done", label: "Done", badge: "bg-green-100 text-green-800" },
];

const statusBadge = (key: string) => COLUMNS.find((c) => c.key === key)?.badge || "bg-gray-100 text-gray-800";

function FieldRows({ fields }: { fields: Record<string, string> }) {
  const entries = Object.entries(fields).filter(([, v]) => v);
  return (
    <dl className="space-y-1.5 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="w-32 shrink-0 text-muted-foreground truncate" title={k}>{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProjectDataViews({
  items,
  onStatusChange,
}: {
  items: ProjectItem[];
  onStatusChange: (itemId: string, status: BoardStatus) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<BoardStatus | null>(null);
  const columns = [...new Set(items.flatMap((i) => Object.keys(i.fields)))];

  if (!items.length) {
    return <p className="text-muted-foreground italic text-center py-6">No data items on this project</p>;
  }

  return (
    <Tabs defaultValue="spreadsheet">
      <TabsList>
        <TabsTrigger value="spreadsheet"><TableIcon className="h-4 w-4 mr-1.5" />Spreadsheet</TabsTrigger>
        <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4 mr-1.5" />Cards</TabsTrigger>
        <TabsTrigger value="kanban"><KanbanSquare className="h-4 w-4 mr-1.5" />Kanban</TabsTrigger>
      </TabsList>

      <TabsContent value="spreadsheet" className="mt-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead className="min-w-56">Item</TableHead>
                <TableHead>Status</TableHead>
                {columns.map((c) => <TableHead key={c} className="min-w-32">{c}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell><Badge className={statusBadge(item.boardStatus)}>{item.sourceStatus || item.boardStatus}</Badge></TableCell>
                  {columns.map((c) => <TableCell key={c} className="max-w-64 truncate" title={item.fields[c]}>{item.fields[c]}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="cards" className="mt-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium leading-snug">{item.title}</h4>
                  <Badge className={`shrink-0 ${statusBadge(item.boardStatus)}`}>{item.sourceStatus || item.boardStatus}</Badge>
                </div>
                <FieldRows fields={item.fields} />
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="kanban" className="mt-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
          {COLUMNS.map((col) => {
            const colItems = items.filter((i) => i.boardStatus === col.key);
            return (
              <div
                key={col.key}
                className={`rounded-lg border bg-muted/30 p-3 min-h-32 transition-colors ${dropCol === col.key ? "border-primary bg-primary/5" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDropCol(col.key); }}
                onDragLeave={() => setDropCol((d) => (d === col.key ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) onStatusChange(dragId, col.key);
                  setDragId(null); setDropCol(null);
                }}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge variant="secondary">{colItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDragId(item.id)}
                      onDragEnd={() => { setDragId(null); setDropCol(null); }}
                      className={`rounded-md border bg-background p-3 cursor-grab active:cursor-grabbing shadow-sm ${dragId === item.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug">{item.title}</p>
                          {item.sourceStatus && item.sourceStatus !== item.boardStatus && (
                            <Badge className="mt-1.5" variant="outline">{item.sourceStatus}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!colItems.length && <p className="text-xs text-muted-foreground italic text-center py-4">Drop items here</p>}
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}
