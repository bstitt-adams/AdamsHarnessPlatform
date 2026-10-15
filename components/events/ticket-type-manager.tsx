"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Ticket, GripVertical } from "lucide-react";
import { type EventTicketType } from "@/lib/schema";
import { formatPrice } from "@/lib/format-price";

interface TicketTypeManagerProps {
  ticketTypes: EventTicketType[];
  onChange: (ticketTypes: EventTicketType[]) => void;
  isFreeEvent?: boolean;
  onFreeEventChange?: (isFree: boolean) => void;
}

interface TicketFormData {
  name: string;
  description: string;
  price: string;
  quantity: string;
  maxPerOrder: string;
  isActive: boolean;
}

const emptyTicketForm: TicketFormData = {
  name: "",
  description: "",
  price: "0",
  quantity: "100",
  maxPerOrder: "10",
  isActive: true,
};

export function TicketTypeManager({
  ticketTypes,
  onChange,
  isFreeEvent = false,
  onFreeEventChange,
}: TicketTypeManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<EventTicketType | null>(null);
  const [formData, setFormData] = useState<TicketFormData>(emptyTicketForm);

  const openDialog = (ticket?: EventTicketType) => {
    if (ticket) {
      setEditingTicket(ticket);
      setFormData({
        name: ticket.name,
        description: ticket.description || "",
        price: (ticket.price / 100).toFixed(2),
        quantity: ticket.quantity.toString(),
        maxPerOrder: ticket.maxPerOrder.toString(),
        isActive: ticket.isActive,
      });
    } else {
      setEditingTicket(null);
      setFormData(emptyTicketForm);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    const priceInCents = Math.round(parseFloat(formData.price || "0") * 100);
    const quantity = parseInt(formData.quantity || "100");
    const maxPerOrder = parseInt(formData.maxPerOrder || "10");

    if (!formData.name.trim()) {
      return;
    }

    if (editingTicket) {
      // Update existing ticket
      const updated = ticketTypes.map((t) =>
        t.id === editingTicket.id
          ? {
              ...t,
              name: formData.name,
              description: formData.description || undefined,
              price: priceInCents,
              quantity,
              maxPerOrder,
              isActive: formData.isActive,
            }
          : t
      );
      onChange(updated);
    } else {
      // Add new ticket
      const newTicket: EventTicketType = {
        id: `ticket-${Date.now()}`,
        name: formData.name,
        description: formData.description || undefined,
        price: priceInCents,
        quantity,
        quantitySold: 0,
        maxPerOrder,
        isActive: formData.isActive,
        sortOrder: ticketTypes.length,
      };
      onChange([...ticketTypes, newTicket]);
    }

    setDialogOpen(false);
    setFormData(emptyTicketForm);
    setEditingTicket(null);
  };

  const handleDelete = (ticketId: string) => {
    onChange(ticketTypes.filter((t) => t.id !== ticketId));
  };

  const toggleActive = (ticketId: string) => {
    onChange(
      ticketTypes.map((t) =>
        t.id === ticketId ? { ...t, isActive: !t.isActive } : t
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-muted-foreground">Ticketing</h3>
        {onFreeEventChange && (
          <div className="flex items-center space-x-2">
            <Switch
              id="isFreeEvent"
              checked={isFreeEvent}
              onCheckedChange={onFreeEventChange}
            />
            <Label htmlFor="isFreeEvent" className="text-sm">
              Free Event
            </Label>
          </div>
        )}
      </div>

      {ticketTypes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Ticket className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No ticket types configured
            </p>
            <Button variant="outline" size="sm" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ticket Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ticketTypes.map((ticket) => (
            <div
              key={ticket.id}
              className={`flex items-center gap-3 p-3 border rounded-lg ${
                !ticket.isActive ? "opacity-60 bg-muted/50" : ""
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ticket.name}</span>
                  {!ticket.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {ticket.price === 0 ? "Free" : formatPrice(ticket.price)} •{" "}
                  {ticket.quantitySold}/{ticket.quantity} sold
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleActive(ticket.id)}
                >
                  <Switch checked={ticket.isActive} className="pointer-events-none" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openDialog(ticket)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(ticket.id)}
                  disabled={ticket.quantitySold > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => openDialog()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Ticket Type
          </Button>
        </div>
      )}

      {/* Ticket Type Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTicket ? "Edit Ticket Type" : "Add Ticket Type"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ticketName">Ticket Name *</Label>
              <Input
                id="ticketName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., General Admission, VIP, Early Bird"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketDescription">Description</Label>
              <Textarea
                id="ticketDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What's included with this ticket?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticketPrice">Price ($)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketQuantity">Quantity</Label>
                <Input
                  id="ticketQuantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketMaxPerOrder">Max Per Order</Label>
                <Input
                  id="ticketMaxPerOrder"
                  type="number"
                  min="1"
                  value={formData.maxPerOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, maxPerOrder: e.target.value })
                  }
                  placeholder="10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ticketActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="ticketActive">Active (available for purchase)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingTicket ? "Save Changes" : "Add Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
