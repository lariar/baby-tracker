import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertEventSchema, insertVoiceCommandSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const events = await storage.getEventsByUserId(req.user.id);
    res.json(events);
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertEventSchema.parse(req.body);
    const event = await storage.createEvent({
      ...data,
      babyId: (await storage.getBabyByUserId(req.user.id))?.id,
      timestamp: new Date(),
    });
    res.json(event);
  });

  app.post("/api/voice-commands", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log("Received voice command:", req.body); // Debug log

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
      let eventData = command;

      if (command.includes("feeding")) {
        eventType = "feeding";
      } else if (command.includes("diaper")) {
        eventType = "diaper";
      } else if (command.includes("sleep")) {
        eventType = "sleep";
      }

      if (eventType) {
        console.log("Creating event of type:", eventType); // Debug log
        const event = await storage.createEvent({
          type: eventType,
          data: eventData,
          timestamp: new Date(),
          babyId: baby.id,
        });
        console.log("Created event:", event); // Debug log
        res.json({ message: `Logged ${eventType} event successfully` });
      } else {
        console.log("Could not determine event type from command"); // Debug log
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