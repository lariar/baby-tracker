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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBabySchema = createInsertSchema(babies).pick({
  name: true,
});

export const insertEventSchema = createInsertSchema(events).pick({
  type: true,
  data: true,
});

export const insertVoiceCommandSchema = createInsertSchema(voiceCommands).pick({
  command: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Baby = typeof babies.$inferSelect;
export type Event = typeof events.$inferSelect;
export type VoiceCommand = typeof voiceCommands.$inferSelect;
