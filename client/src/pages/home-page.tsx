import { useAuth } from "@/hooks/use-auth";
import { useVoice } from "@/hooks/use-voice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, LogOut } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { isListening, toggleListening, transcript, commandStatus } = useVoice();

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    refetchInterval: 2000, // Refresh every 2 seconds while the page is open
  });

  const addEventMutation = useMutation({
    mutationFn: async (event: { type: string; data: string }) => {
      const res = await apiRequest("POST", "/api/events", event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Baby Tracker</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user?.username}</span>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Voice Commands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  className="w-full h-24 text-lg"
                  variant={isListening ? "destructive" : "default"}
                  onClick={toggleListening}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-8 w-8 mr-2" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="h-8 w-8 mr-2" />
                      Start Listening
                    </>
                  )}
                </Button>

                {transcript && (
                  <div className="p-4 bg-muted rounded-lg animate-pulse">
                    <p className="font-medium">Listening:</p>
                    <p>{transcript}</p>
                  </div>
                )}

                {commandStatus && (
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="font-medium">Status:</p>
                    <p>{commandStatus}</p>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium mb-2">Voice Command Examples:</p>
                  <ul className="space-y-2 text-sm">
                    <li>"Feeding started at 2 PM"</li>
                    <li>"Diaper change, wet only"</li>
                    <li>"Sleep time started"</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventsLoading ? (
                  <div className="text-center p-4">Loading events...</div>
                ) : events && events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 border rounded-lg flex justify-between items-center hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium capitalize">{event.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="max-w-[200px] truncate">{event.data}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    No events recorded yet. Try using voice commands to log some events!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}