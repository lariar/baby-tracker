import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EventData, eventDataSchema, Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EventEditorProps {
  event?: Event;
  isOpen: boolean;
  onClose: () => void;
}

export function EventEditor({ event, isOpen, onClose }: EventEditorProps) {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState(event?.type || "feeding");
  
  const form = useForm({
    resolver: zodResolver(eventDataSchema),
    defaultValues: event
      ? {
          type: event.type,
          data: JSON.parse(event.data),
        }
      : {
          type: "feeding",
          data: {},
        },
  });

  const onSubmit = async (data: EventData) => {
    try {
      if (event?.id) {
        await apiRequest(`/api/events/${event.id}`, {
          method: "PATCH",
          data: {
            ...data,
            data: JSON.stringify(data.data),
          },
        });
      } else {
        await apiRequest("/api/events", {
          method: "POST",
          data: {
            ...data,
            data: JSON.stringify(data.data),
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {event ? "Edit Event" : "New Event"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Event Type</Label>
            <Select
              value={eventType}
              onValueChange={(value) => {
                setEventType(value);
                form.setValue("type", value as "feeding" | "diaper" | "sleep");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feeding">Feeding</SelectItem>
                <SelectItem value="diaper">Diaper</SelectItem>
                <SelectItem value="sleep">Sleep</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {eventType === "feeding" && (
            <>
              <div>
                <Label>Type</Label>
                <Select
                  value={form.watch("data.type")}
                  onValueChange={(value) => form.setValue("data.type", value as "formula" | "breast_milk")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select feeding type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formula">Formula</SelectItem>
                    <SelectItem value="breast_milk">Breast Milk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (oz)</Label>
                <Input
                  type="number"
                  step="0.5"
                  {...form.register("data.amount", { valueAsNumber: true })}
                />
              </div>
            </>
          )}

          {eventType === "diaper" && (
            <div>
              <Label>Type</Label>
              <Select
                value={form.watch("data.type")}
                onValueChange={(value) => form.setValue("data.type", value as "wet" | "dirty" | "both")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select diaper type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wet">Wet</SelectItem>
                  <SelectItem value="dirty">Dirty</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {eventType === "sleep" && (
            <>
              <div>
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  {...form.register("data.startTime")}
                  defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  {...form.register("data.endTime")}
                />
              </div>
            </>
          )}

          <div>
            <Label>Notes</Label>
            <Input {...form.register("data.notes")} placeholder="Add any additional notes..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
