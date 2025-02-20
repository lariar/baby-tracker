import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [commandStatus, setCommandStatus] = useState("");
  const { toast } = useToast();

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;

  const processCommand = useCallback(async (command: string) => {
    try {
      const res = await apiRequest("POST", "/api/voice-commands", { command });
      const result = await res.json();
      setCommandStatus(`Processed: ${result.message}`);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      toast({
        title: "Command processed",
        description: result.message,
      });
    } catch (error) {
      setCommandStatus("Error processing command");
      toast({
        title: "Error",
        description: "Failed to process voice command",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join("");
      setTranscript(transcript);

      if (event.results[0].isFinal) {
        processCommand(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      toast({
        title: "Error",
        description: "Speech recognition failed",
        variant: "destructive",
      });
    };

    return () => {
      recognition.stop();
    };
  }, [recognition, processCommand, toast]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      setTranscript("");
      setCommandStatus("");
    }
  }, [isListening, recognition]);

  return {
    isListening,
    toggleListening,
    transcript,
    commandStatus,
  };
}
