import { useState, useCallback, useRef } from "react";
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  const processCommand = useCallback(async (command: string) => {
    try {
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

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Failed to stop recognition:", error);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
    setCommandStatus("");
  }, []);

  const startRecognition = useCallback(() => {
    // If already listening, do nothing
    if (isListening || recognitionRef.current) {
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Speech recognition not supported");
      }

      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setCommandStatus("Listening...");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const finalTranscript = result[0].transcript.trim();
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
        console.error("Speech recognition error:", event.error);
        setCommandStatus(`Recognition error: ${event.error}`);
        stopRecognition();

        toast({
          title: "Speech Recognition Error",
          description: `Failed to recognize speech: ${event.error}`,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        stopRecognition();
      };

      recognition.start();
    } catch (error) {
      console.error("Failed to initialize recognition:", error);
      stopRecognition();
      setCommandStatus("Failed to start speech recognition");

      toast({
        title: "Error",
        description: "Could not start speech recognition. Please try again.",
        variant: "destructive",
      });
    }
  }, [isListening, processCommand, stopRecognition, toast]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  }, [isListening, startRecognition, stopRecognition]);

  return {
    isListening,
    toggleListening,
    transcript,
    commandStatus,
  };
}