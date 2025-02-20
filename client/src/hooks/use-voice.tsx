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

  const processCommand = useCallback(async (command: string) => {
    try {
      console.log("Processing command:", command);
      setCommandStatus("Processing...");

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

      // Clear transcript after successful processing
      setTranscript("");
    } catch (error) {
      console.error("Voice command error:", error);
      setCommandStatus("Error processing command");
      toast({
        title: "Error",
        description: "Failed to process voice command",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    let recognition: SpeechRecognition | null = null;

    if (isListening) {
      recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.continuous = false; 
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log("Voice recognition started");
        setCommandStatus("Listening...");
        setTranscript("");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const finalTranscript = result[0].transcript.trim();
            console.log("Final transcript:", finalTranscript);
            if (finalTranscript) {
              processCommand(finalTranscript);
            }
          } else {
            currentTranscript += result[0].transcript;
          }
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setCommandStatus("Recognition error: " + event.error);
        toast({
          title: "Error",
          description: "Speech recognition failed: " + event.error,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        console.log("Voice recognition ended");
        
        if (isListening && !recognition?.error) {
          console.log("Restarting recognition...");
          recognition?.start();
        }
      };

      try {
        recognition.start();
      } catch (error) {
        console.error("Failed to start recognition:", error);
      }
    }

    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
          console.error("Failed to stop recognition:", error);
        }
      }
    };
  }, [isListening, processCommand, toast]);

  const toggleListening = useCallback(() => {
    setIsListening(prev => !prev);
    if (!isListening) {
      setTranscript("");
      setCommandStatus("");
    }
  }, [isListening]);

  return {
    isListening,
    toggleListening,
    transcript,
    commandStatus,
  };
}