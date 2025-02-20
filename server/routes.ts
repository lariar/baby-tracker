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
    const data = insertVoiceCommandSchema.parse(req.body);
    
    // Process voice command
    const command = data.command.toLowerCase();
    let event;

    if (command.includes("feeding")) {
      event = {
        type: "feeding",
        data: command,
        timestamp: new Date(),
        babyId: (await storage.getBabyByUserId(req.user.id))?.id,
      };
    } else if (command.includes("diaper")) {
      event = {
        type: "diaper",
        data: command,
        timestamp: new Date(),
        babyId: (await storage.getBabyByUserId(req.user.id))?.id,
      };
    } else if (command.includes("sleep")) {
      event = {
        type: "sleep",
        data: command,
        timestamp: new Date(),
        babyId: (await storage.getBabyByUserId(req.user.id))?.id,
      };
    }

    if (event) {
      await storage.createEvent(event);
      res.json({ message: "Event logged successfully" });
    } else {
      res.status(400).json({ message: "Could not understand command" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
