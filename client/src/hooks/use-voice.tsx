import { useReducer, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    readonly isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
}

interface VoiceState {
  isListening: boolean;
  transcript: string;
  commandStatus: string;
  isProcessing: boolean;
  error: string | null;
}

type VoiceAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_TRANSCRIPT'; payload: string }
  | { type: 'SET_STATUS'; payload: string }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: VoiceState = {
  isListening: false,
  transcript: '',
  commandStatus: '',
  isProcessing: false,
  error: null,
};

function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, isListening: true, commandStatus: 'Listening...', error: null };
    case 'STOP_LISTENING':
      return { ...state, isListening: false };
    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.payload };
    case 'SET_STATUS':
      return { ...state, commandStatus: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

const DEBOUNCE_DELAY = 500; // ms

export function useVoice() {
  const [state, dispatch] = useReducer(voiceReducer, initialState);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        // Remove all event listeners
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;

        // Stop and abort the recognition
        recognitionRef.current.abort();
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
      recognitionRef.current = null;
    }

    isProcessingRef.current = false;
    // Reset state after cleanup
    dispatch({ type: 'RESET' });
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const processCommand = useCallback(async (command: string) => {
    if (isProcessingRef.current) return;

    try {
      isProcessingRef.current = true;
      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_STATUS', payload: 'Processing...' });

      const res = await apiRequest("/api/voice-commands", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command,
          timestamp: new Date().toISOString()
        })
      });

      const result = await res.json();
      dispatch({ type: 'SET_STATUS', payload: `Processed: ${result.message}` });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });

      toast({
        title: "Command processed",
        description: result.message,
      });

      dispatch({ type: 'SET_TRANSCRIPT', payload: '' });
    } catch (error) {
      console.error("Voice command error:", error);
      dispatch({ type: 'SET_STATUS', payload: 'Error processing command' });
      toast({
        title: "Error",
        description: "Failed to process voice command",
        variant: "destructive",
      });
    } finally {
      isProcessingRef.current = false;
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, [toast]);

  const startRecognition = useCallback(() => {
    if (state.isListening || recognitionRef.current || isProcessingRef.current) {
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Speech recognition not supported");
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        dispatch({ type: 'START_LISTENING' });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results.item(i);
          const transcript = result.item(0).transcript;

          if (result.isFinal) {
            finalTranscript = transcript.trim();
            if (finalTranscript) {
              processCommand(finalTranscript);
            }
          } else {
            interimTranscript += transcript;
          }
        }

        dispatch({ type: 'SET_TRANSCRIPT', payload: interimTranscript || finalTranscript });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        dispatch({ type: 'SET_ERROR', payload: event.error });
        dispatch({ type: 'SET_STATUS', payload: `Recognition error: ${event.error}` });

        toast({
          title: "Speech Recognition Error",
          description: `Failed to recognize speech: ${event.error}`,
          variant: "destructive",
        });

        // Use debounce for cleanup to prevent state race conditions
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(cleanup, DEBOUNCE_DELAY);
      };

      recognition.onend = () => {
        // Use debounce to prevent rapid state changes
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(cleanup, DEBOUNCE_DELAY);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Failed to initialize recognition:", error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start speech recognition' });
      dispatch({ type: 'SET_STATUS', payload: 'Failed to start speech recognition' });

      toast({
        title: "Error",
        description: "Could not start speech recognition. Please try again.",
        variant: "destructive",
      });

      cleanup();
    }
  }, [state.isListening, cleanup, processCommand, toast]);

  const toggleListening = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (state.isListening) {
      cleanup();
    } else {
      startRecognition();
    }
  }, [state.isListening, startRecognition, cleanup]);

  return {
    isListening: state.isListening,
    toggleListening,
    transcript: state.transcript,
    commandStatus: state.commandStatus,
  };
}