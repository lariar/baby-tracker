import { useState, useCallback, useEffect, useRef } from "react";
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
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (error) {
        console.error("Failed to stop recognition:", error);
      }
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      try {
        recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        const recognition = recognitionRef.current;

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
          recognitionRef.current = null;
          toast({
            title: "Error",
            description: "Speech recognition failed: " + event.error,
            variant: "destructive",
          });
        };

        recognition.onend = () => {
          console.log("Voice recognition ended");
          if (isListening && !recognition.error) {
            console.log("Starting new recognition session");
            startRecognition();
          } else {
            recognitionRef.current = null;
          }
        };

        recognition.start();
      } catch (error) {
        console.error("Failed to start recognition:", error);
        setIsListening(false);
        recognitionRef.current = null;
      }
    }
  }, [isListening, processCommand, toast]);

  useEffect(() => {
    if (isListening) {
      startRecognition();
    } else {
      stopRecognition();
    }

    return () => {
      stopRecognition();
    };
  }, [isListening, startRecognition, stopRecognition]);

  const toggleListening = useCallback(() => {
    setIsListening(prev => !prev);
  }, []);

  return {
    isListening,
    toggleListening,
    transcript,
    commandStatus,
  };
}