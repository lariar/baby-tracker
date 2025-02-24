import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertEventSchema, insertVoiceCommandSchema, eventDataSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const events = await storage.getEventsByUserId(req.user.id);
    res.json(events);
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Validate the event data structure first
      const validatedData = eventDataSchema.parse(req.body);

      // Create event with validated and stringified data
      const event = await storage.createEvent({
        type: validatedData.type,
        data: JSON.stringify(validatedData.data),
        babyId: (await storage.getBabyByUserId(req.user.id))?.id,
        timestamp: new Date(),
      });

      res.json(event);
    } catch (error) {
      console.error("Event creation error:", error);
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Validate the event data structure
      const validatedData = eventDataSchema.parse(req.body);

      // Update event with validated and stringified data
      const event = await storage.updateEvent(parseInt(req.params.id), {
        type: validatedData.type,
        data: JSON.stringify(validatedData.data),
      });

      res.json(event);
    } catch (error) {
      console.error("Event update error:", error);
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  app.post("/api/voice-commands", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log("Received voice command:", req.body);

    try {
      const data = insertVoiceCommandSchema.parse(req.body);
      const baby = await storage.getBabyByUserId(req.user.id);

      if (!baby) {
        console.error("No baby found for user:", req.user.id);
        return res.status(400).json({ message: "No baby profile found" });
      }

      // Store the voice command
      await storage.createVoiceCommand({
        userId: req.user.id,
        command: data.command,
        timestamp: new Date(),
        processed: false,
      });

      // Process voice command
      const command = data.command.toLowerCase();
      let eventType: string | null = null;
      let eventData: any = {};

      if (command.includes("feeding")) {
        eventType = "feeding";
        // Extract feeding type
        if (command.includes("formula")) {
          eventData.type = "formula";
        } else if (command.includes("breast") || command.includes("milk")) {
          eventData.type = "breast_milk";
        }
        // Extract amount
        const amountMatch = command.match(/(\d+(\.\d+)?)\s*(?:oz|ounces?)/i);
        if (amountMatch) {
          eventData.amount = parseFloat(amountMatch[1]);
        }
      } else if (command.includes("diaper")) {
        eventType = "diaper";
        if (command.includes("wet") && command.includes("dirty")) {
          eventData.type = "both";
        } else if (command.includes("wet")) {
          eventData.type = "wet";
        } else if (command.includes("dirty")) {
          eventData.type = "dirty";
        } else {
          eventData.type = "wet"; // Default to wet if not specified
        }
      } else if (command.includes("sleep")) {
        eventType = "sleep";
        eventData.startTime = new Date().toISOString();
        if (command.includes("woke") || command.includes("end")) {
          eventData.endTime = new Date().toISOString();
        }
      }

      if (eventType) {
        console.log("Creating event of type:", eventType, "with data:", eventData);
        const event = await storage.createEvent({
          type: eventType,
          data: JSON.stringify(eventData),
          timestamp: new Date(),
          babyId: baby.id,
        });
        console.log("Created event:", event);
        res.json({ message: `Logged ${eventType} event successfully` });
      } else {
        console.log("Could not determine event type from command");
        res.status(400).json({ message: "Could not understand command. Try saying 'feeding', 'diaper', or 'sleep'" });
      }
    } catch (error) {
      console.error("Error processing voice command:", error);
      res.status(500).json({ message: "Error processing voice command" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}