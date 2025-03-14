import { useAuth } from "@/hooks/use-auth";
import { useVoice } from "@/hooks/use-voice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, LogOut, Baby, Plus, Edit2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { memo, useState } from "react";
import { EventEditor } from "@/components/event-editor";

// Memoize the event card to prevent unnecessary re-renders
const EventCard = memo(({ event, onEdit }: { event: Event; onEdit: (event: Event) => void }) => {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (error) {
    console.error(`Failed to parse event data for event ${event.id}:`, error);
    data = { notes: event.data }; // Fallback for legacy data
  }

  const getEventSummary = (type: string, data: any) => {
    switch (type) {
      case "feeding":
        return `${data.type === "formula" ? "Formula" : "Breast Milk"}${data.amount ? `, ${data.amount}oz` : ""}`;
      case "diaper":
        return data.type ? (data.type.charAt(0).toUpperCase() + data.type.slice(1)) : "Unknown";
      case "sleep":
        const duration = data.endTime 
          ? Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / (1000 * 60))
          : null;
        return duration ? `Duration: ${duration} minutes` : "In progress";
      default:
        return "";
    }
  };

  return (
    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors duration-200">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium capitalize text-primary">{event.type}</p>
            <Button variant="ghost" size="icon" onClick={() => onEdit(event)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(event.timestamp).toLocaleString()}
          </p>
          <p className="text-sm mt-1">{getEventSummary(event.type, data)}</p>
        </div>
        {data?.notes && (
          <p className="text-sm text-muted-foreground max-w-[200px] text-right">
            {data.notes}
          </p>
        )}
      </div>
    </div>
  );
});

// Rest of your voice control panel component remains unchanged
const VoiceControlPanel = memo(({ 
  isListening, 
  toggleListening, 
  transcript, 
  commandStatus 
}: { 
  isListening: boolean;
  toggleListening: () => void;
  transcript: string;
  commandStatus: string;
}) => (
  <Card className="border-2 border-primary/10">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Mic className="h-5 w-5" />
        Voice Commands
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        <Button
          className="w-full h-32 text-lg relative overflow-hidden transition-all duration-200"
          variant={isListening ? "destructive" : "default"}
          onClick={toggleListening}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-primary/20 pointer-events-none" />
          <div className="relative flex items-center justify-center gap-3">
            {isListening ? (
              <>
                <MicOff className="h-8 w-8 animate-pulse" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Stop Listening</span>
                  <span className="text-sm opacity-90">Click to stop recording</span>
                </div>
              </>
            ) : (
              <>
                <Mic className="h-8 w-8" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Start Listening</span>
                  <span className="text-sm opacity-90">Click to record voice command</span>
                </div>
              </>
            )}
          </div>
        </Button>

        {transcript && (
          <div className="p-4 bg-muted rounded-lg border animate-pulse">
            <p className="font-medium text-sm text-muted-foreground">Listening:</p>
            <p className="mt-1">{transcript}</p>
          </div>
        )}

        {commandStatus && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <p className="font-medium text-sm text-muted-foreground">Status:</p>
            <p className="mt-1">{commandStatus}</p>
          </div>
        )}

        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="font-medium text-sm text-muted-foreground mb-3">Voice Command Examples:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/50" />
              "Feeding started at 2 PM"
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/50" />
              "Diaper change, wet only"
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/50" />
              "Sleep time started"
            </li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
));

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { isListening, toggleListening, transcript, commandStatus } = useVoice();
  const [isEventEditorOpen, setIsEventEditorOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    refetchInterval: 2000,
  });

  const handleEventEdit = (event?: Event) => {
    setSelectedEvent(event);
    setIsEventEditorOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Baby className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Baby Tracker
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline">
              Welcome, {user?.username}
            </span>
            <ThemeSwitcher />
            <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <VoiceControlPanel
              isListening={isListening}
              toggleListening={toggleListening}
              transcript={transcript}
              commandStatus={commandStatus}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">Recent Events</CardTitle>
                <Button size="sm" onClick={() => handleEventEdit()}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventsLoading ? (
                  <div className="text-center p-8 text-muted-foreground animate-pulse">
                    Loading events...
                  </div>
                ) : events.length > 0 ? (
                  events.map((event) => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      onEdit={handleEventEdit}
                    />
                  ))
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <p>No events recorded yet.</p>
                    <p className="text-sm mt-1">Try using voice commands to log some events!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <EventEditor
        event={selectedEvent}
        isOpen={isEventEditorOpen}
        onClose={() => {
          setIsEventEditorOpen(false);
          setSelectedEvent(undefined);
        }}
      />
    </div>
  );
}