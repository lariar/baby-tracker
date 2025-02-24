import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const babies = pgTable("babies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  babyId: integer("baby_id").notNull(),
  type: text("type").notNull(), // feeding, diaper, sleep
  timestamp: timestamp("timestamp").notNull(),
  data: text("data").notNull(), // JSON string of event data
});

export const voiceCommands = pgTable("voice_commands", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  command: text("command").notNull(),
  processed: boolean("processed").notNull().default(false),
  timestamp: timestamp("timestamp").notNull(),
});

// Event type-specific schemas
export const feedingDataSchema = z.object({
  amount: z.number().optional(),
  type: z.enum(["formula", "breast_milk"]).optional(),
  notes: z.string().optional(),
});

export const diaperDataSchema = z.object({
  type: z.enum(["wet", "dirty", "both"]),
  notes: z.string().optional(),
});

export const sleepDataSchema = z.object({
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().optional(), // in minutes
  notes: z.string().optional(),
});

// Combined event data schema
export const eventDataSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("feeding"), data: feedingDataSchema }),
  z.object({ type: z.literal("diaper"), data: diaperDataSchema }),
  z.object({ type: z.literal("sleep"), data: sleepDataSchema }),
]);

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBabySchema = createInsertSchema(babies).pick({
  name: true,
});

export const insertEventSchema = createInsertSchema(events)
  .pick({
    type: true,
    data: true,
  })
  .extend({
    data: z.string(), // Keep as string in DB schema but validate before saving
  });

export const insertVoiceCommandSchema = createInsertSchema(voiceCommands).pick({
  command: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Baby = typeof babies.$inferSelect;
export type Event = typeof events.$inferSelect;
export type VoiceCommand = typeof voiceCommands.$inferSelect;
export type EventData = z.infer<typeof eventDataSchema>;
export type FeedingData = z.infer<typeof feedingDataSchema>;
export type DiaperData = z.infer<typeof diaperDataSchema>;
export type SleepData = z.infer<typeof sleepDataSchema>;