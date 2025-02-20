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

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
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
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">Transcript:</p>
                    <p>{transcript}</p>
                  </div>
                )}
                {commandStatus && (
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="font-medium">Status:</p>
                    <p>{commandStatus}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events?.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium capitalize">{event.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div>{event.data}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
