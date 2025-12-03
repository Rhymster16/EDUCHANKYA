import { Project, Candidate, Idea, LearningPath, Institution, UserProfile } from '../types';

// This service mimics Firebase Firestore behavior using LocalStorage
// so the application is fully functional without requiring the user
// to set up an external GCP project immediately.

const STORAGE_KEYS = {
  INSTITUTIONS: 'educhanakya_institutions',
  USERS: 'educhanakya_users',
  PROJECTS: 'educhanakya_projects',
  CANDIDATES: 'educhanakya_candidates',
  IDEAS: 'educhanakya_ideas',
  LEARNING: 'educhanakya_learning',
};

// Seed Data
const SEED_INSTITUTIONS: Institution[] = [
  { id: 'inst_1', name: 'Indian Institute of Technology, Bombay (Virtual)', domain: 'iitb.ac.in' },
  { id: 'inst_2', name: 'Delhi Technological University (Virtual)', domain: 'dtu.ac.in' },
  { id: 'inst_3', name: 'Stanford University (Virtual)', domain: 'stanford.edu' },
];

const SEED_USERS: UserProfile[] = [
  { id: 'u1', institutionId: 'inst_1', name: 'Aarav Patel', email: 'aarav@iitb.ac.in', role: 'Student', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav' },
  { id: 'u2', institutionId: 'inst_1', name: 'Dr. S. Gupta', email: 'gupta@iitb.ac.in', role: 'Faculty', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gupta' },
  { id: 'u3', institutionId: 'inst_2', name: 'Priya Singh', email: 'priya@dtu.ac.in', role: 'Student', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya' },
];

const SEED_CANDIDATES: Candidate[] = [
  { id: 'c1', institutionId: 'inst_1', name: 'Aarav Patel', role: 'Frontend Dev', skills: ['React', 'TypeScript'], projectCount: 5, avgScore: 88 },
  { id: 'c2', institutionId: 'inst_1', name: 'Zara Khan', role: 'Data Scientist', skills: ['Python', 'TensorFlow'], projectCount: 3, avgScore: 92 },
  { id: 'c3', institutionId: 'inst_2', name: 'Liam Smith', role: 'Full Stack', skills: ['Node.js', 'Postgres'], projectCount: 7, avgScore: 85 },
];

const SEED_IDEAS: Idea[] = [
    {
        id: 'idea_1',
        institutionId: 'inst_1',
        title: 'Campus Food Delivery Drone',
        description: 'Autonomous drones to deliver food from canteen to hostels.',
        requiredSkills: ['Robotics', 'Python', 'Computer Vision'],
        openRoles: ['Drone Pilot', 'AI Engineer'],
        applicants: [],
        createdAt: new Date().toISOString(),
        authorName: 'Aarav Patel'
    }
];

class MockFirestore {
  private listeners: Map<string, Function[]> = new Map();
  private logs: string[] = [];
  private logListeners: Function[] = [];

  constructor() {
    this.initSeed(STORAGE_KEYS.INSTITUTIONS, SEED_INSTITUTIONS);
    this.initSeed(STORAGE_KEYS.USERS, SEED_USERS);
    this.initSeed(STORAGE_KEYS.CANDIDATES, SEED_CANDIDATES);
    this.initSeed(STORAGE_KEYS.IDEAS, SEED_IDEAS);
    this.log("SYSTEM", "Backend Service Initialized");
    this.log("DB", "Seed data integrity check complete");
  }

  private log(source: string, message: string) {
    const entry = `[${new Date().toLocaleTimeString()}] [${source}] ${message}`;
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop(); // Keep last 50
    this.notifyLogs();
  }

  private notifyLogs() {
    this.logListeners.forEach(cb => cb([...this.logs]));
  }

  public subscribeLogs(callback: (logs: string[]) => void): () => void {
    this.logListeners.push(callback);
    callback([...this.logs]);
    return () => {
        this.logListeners = this.logListeners.filter(cb => cb !== callback);
    };
  }

  // Debugging: Get raw JSON
  public getRawData(key: string) {
      return this.read(key);
  }

  private initSeed(key: string, data: any[]) {
    const current = localStorage.getItem(key);
    // Seed if missing OR if empty array (fixes stuck state)
    if (!current || JSON.parse(current).length === 0) {
      localStorage.setItem(key, JSON.stringify(data));
      this.log("DB", `Seeded collection ${key} with ${data.length} records`);
    }
  }

  // Helper to read data
  private read<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // Helper to write data
  private write<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
    this.notify(key, data);
  }

  // Subscribe to changes (Simulates onSnapshot)
  subscribe<T>(collection: string, callback: (data: T[]) => void): () => void {
    const key = `educhanakya_${collection}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)?.push(callback);
    
    // Initial call
    this.log("API", `Client subscribed to ${collection}`);
    callback(this.read<T>(key));

    return () => {
      const subs = this.listeners.get(key) || [];
      this.listeners.set(key, subs.filter(cb => cb !== callback));
    };
  }

  private notify(key: string, data: any) {
    const subs = this.listeners.get(key) || [];
    subs.forEach(cb => cb(data));
  }

  async addCollectionItem<T extends { id?: string }>(collection: string, item: T): Promise<string> {
    const key = `educhanakya_${collection}`;
    const current = this.read<T>(key);
    const newItem = { ...item, id: item.id || Math.random().toString(36).substr(2, 9) };
    this.write(key, [newItem, ...current]);
    this.log("WRITE", `Added new record to ${collection} (ID: ${newItem.id})`);
    return newItem.id as string;
  }

  async updateCollectionItem<T extends { id: string }>(collection: string, id: string, updates: Partial<T>) {
    const key = `educhanakya_${collection}`;
    const current = this.read<T>(key);
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
    this.write(key, updated);
    this.log("WRITE", `Updated record in ${collection} (ID: ${id})`);
  }

  async deleteCollectionItem(collection: string, id: string) {
    const key = `educhanakya_${collection}`;
    const current = this.read<{ id: string }>(key);
    const filtered = current.filter(item => item.id !== id);
    this.write(key, filtered);
    this.log("DELETE", `Removed record from ${collection} (ID: ${id})`);
  }

  // Auth & Tenant Management
  async getInstitutions(): Promise<Institution[]> {
    this.log("API", "Fetched Institution list");
    return this.read<Institution>(STORAGE_KEYS.INSTITUTIONS);
  }

  async registerInstitution(name: string, domain: string): Promise<Institution> {
      const inst = { id: `inst_${Math.random().toString(36).substr(2, 5)}`, name, domain };
      await this.addCollectionItem('institutions', inst);
      this.log("AUTH", `Registered new institution: ${name}`);
      return inst;
  }

  async createUser(user: Omit<UserProfile, 'id'>): Promise<UserProfile> {
      const newUser = { 
          ...user, 
          id: `u_${Math.random().toString(36).substr(2, 6)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
      };
      await this.addCollectionItem('users', newUser);
      this.log("AUTH", `Created new user: ${user.name}`);
      return newUser;
  }

  async login(institutionId: string, userId: string): Promise<UserProfile | null> {
    this.log("AUTH", `Login attempt: ${userId} @ ${institutionId}`);
    const users = this.read<UserProfile>(STORAGE_KEYS.USERS);
    // Login by ID or Name match
    const user = users.find(u => 
        u.institutionId === institutionId && 
        (u.id === userId || u.name.toLowerCase() === userId.toLowerCase())
    );
    
    if (user) {
        this.log("AUTH", `Login SUCCESS: ${user.name} (${user.role})`);
    } else {
        this.log("AUTH", `Login FAILED: User not found`);
    }
    return user || null;
  }
}

export const db = new MockFirestore();