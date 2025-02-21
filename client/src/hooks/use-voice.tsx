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

  const stopRecognition = useCallback(() => {
    console.log("Stopping recognition");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Failed to stop recognition:", error);
      } finally {
        recognitionRef.current = null;
      }
    }
    setTranscript("");
    setCommandStatus("");
  }, []);

  const startRecognition = useCallback(() => {
    console.log("Starting recognition");
    if (recognitionRef.current) {
      stopRecognition();
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log("Recognition started successfully");
        setCommandStatus("Listening...");
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
        console.error("Speech recognition error:", event.error);
        setCommandStatus(`Recognition error: ${event.error}`);
        setIsListening(false);
        stopRecognition();

        toast({
          title: "Speech Recognition Error",
          description: `Failed to recognize speech: ${event.error}`,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        console.log("Recognition ended");
        // Simply stop and cleanup, don't auto-restart
        setIsListening(false);
        stopRecognition();
      };

      recognition.start();
      console.log("Recognition.start() called successfully");
    } catch (error) {
      console.error("Failed to initialize recognition:", error);
      setIsListening(false);
      stopRecognition();
      setCommandStatus("Failed to start speech recognition");

      toast({
        title: "Error",
        description: "Could not start speech recognition. Please try again.",
        variant: "destructive",
      });
    }
  }, [processCommand, stopRecognition, toast]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
    setIsListening(!isListening);
  }, [isListening, startRecognition, stopRecognition]);

  return {
    isListening,
    toggleListening,
    transcript,
    commandStatus,
  };
}