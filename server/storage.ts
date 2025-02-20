import { users, babies, events, voiceCommands } from "@shared/schema";
import type { User, InsertUser, Baby, Event, VoiceCommand } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private babies: Map<number, Baby>;
  private events: Map<number, Event>;
  private voiceCommands: Map<number, VoiceCommand>;
  sessionStore: session.Store;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.babies = new Map();
    this.events = new Map();
    this.voiceCommands = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    
    // Create a default baby for the user
    await this.createBaby({
      userId: user.id,
      name: "Baby",
    });
    
    return user;
  }

  async getBabyByUserId(userId: number): Promise<Baby | undefined> {
    return Array.from(this.babies.values()).find(
      (baby) => baby.userId === userId,
    );
  }

  async createBaby(baby: Partial<Baby>): Promise<Baby> {
    const id = this.currentId++;
    const newBaby = { ...baby, id } as Baby;
    this.babies.set(id, newBaby);
    return newBaby;
  }

  async getEventsByUserId(userId: number): Promise<Event[]> {
    const baby = await this.getBabyByUserId(userId);
    if (!baby) return [];
    
    return Array.from(this.events.values())
      .filter(event => event.babyId === baby.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createEvent(event: Partial<Event>): Promise<Event> {
    const id = this.currentId++;
    const newEvent = { ...event, id } as Event;
    this.events.set(id, newEvent);
    return newEvent;
  }

  async createVoiceCommand(command: Partial<VoiceCommand>): Promise<VoiceCommand> {
    const id = this.currentId++;
    const newCommand = { ...command, id } as VoiceCommand;
    this.voiceCommands.set(id, newCommand);
    return newCommand;
  }
}

export const storage = new MemStorage();
