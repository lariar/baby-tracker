import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [commandStatus, setCommandStatus] = useState("");
  const { toast } = useToast();

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  const processCommand = useCallback(async (command: string) => {
    try {
      console.log("Processing command:", command); // Debug log
      const res = await apiRequest("POST", "/api/voice-commands", { 
        command,
        timestamp: new Date().toISOString()
      });
      const result = await res.json();
      setCommandStatus(`Processed: ${result.message}`);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });

      toast({
        title: "Command processed",
        description: result.message,
      });
    } catch (error) {
      console.error("Voice command error:", error); // Debug log
      setCommandStatus("Error processing command");
      toast({
        title: "Error",
        description: "Failed to process voice command",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcriptArray = Array.from(event.results)
        .map(result => result[0].transcript)
        .join("");
      setTranscript(transcriptArray);

      if (event.results[0].isFinal) {
        console.log("Final transcript:", transcriptArray); // Debug log
        processCommand(transcriptArray);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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