import { users, babies, events, voiceCommands } from "@shared/schema";
import type { User, InsertUser, Baby, Event, VoiceCommand } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getBabyByUserId(userId: number): Promise<Baby | undefined>;
  createBaby(baby: Partial<Baby>): Promise<Baby>;
  getEventsByUserId(userId: number): Promise<Event[]>;
  createEvent(event: Partial<Event>): Promise<Event>;
  createVoiceCommand(command: Partial<VoiceCommand>): Promise<VoiceCommand>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();

    // Create a default baby for the user
    await this.createBaby({
      userId: user.id,
      name: "Baby",
    });

    return user;
  }

  async getBabyByUserId(userId: number): Promise<Baby | undefined> {
    const [baby] = await db.select().from(babies).where(eq(babies.userId, userId));
    return baby;
  }

  async createBaby(baby: Partial<Baby>): Promise<Baby> {
    const [newBaby] = await db.insert(babies).values(baby).returning();
    return newBaby;
  }

  async getEventsByUserId(userId: number): Promise<Event[]> {
    const baby = await this.getBabyByUserId(userId);
    if (!baby) return [];

    const allEvents = await db
      .select()
      .from(events)
      .where(eq(events.babyId, baby.id));

    return allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createEvent(event: Partial<Event>): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async createVoiceCommand(command: Partial<VoiceCommand>): Promise<VoiceCommand> {
    const [newCommand] = await db.insert(voiceCommands).values(command).returning();
    return newCommand;
  }
}

export const storage = new DatabaseStorage();