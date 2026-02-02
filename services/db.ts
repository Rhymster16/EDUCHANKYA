
import { Project, Candidate, Idea, LearningPath, Institution, UserProfile, Message, Resource } from '../types';

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
  MESSAGES: 'educhanakya_messages',
  RESOURCES: 'educhanakya_resources'
};

// Seed Data
const SEED_INSTITUTIONS: Institution[] = [
  { id: 'inst_1', name: 'Indian Institute of Technology, Bombay (Virtual)', domain: 'iitb.ac.in' },
];

const SEED_USERS: UserProfile[] = [
  { 
      id: 'u_admin', 
      institutionId: 'inst_1', 
      name: 'Dr. R. K. Director', 
      email: 'director@iitb.ac.in', 
      role: 'Admin', 
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Director',
      phoneNumber: '+91-9876543210'
  },
  { 
      id: 'u1', 
      institutionId: 'inst_1', 
      name: 'Aarav Patel', 
      email: 'aarav@iitb.ac.in', 
      role: 'Student', 
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
      batch: '2022-2026',
      course: 'B.Tech CS',
      year: '3rd Year',
      phoneNumber: '+91-9988776655'
  },
  { 
      id: 'u2', 
      institutionId: 'inst_1', 
      name: 'Dr. S. Gupta', 
      email: 'gupta@iitb.ac.in', 
      role: 'Faculty', 
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gupta',
      phoneNumber: '+91-8877665544',
      subjects: ['Data Structures', 'Algorithms']
  },
  { 
      id: 'u3', 
      institutionId: 'inst_1', 
      name: 'Priya Singh', 
      email: 'priya@iitb.ac.in', 
      role: 'Student', 
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
      batch: '2023-2027',
      course: 'B.Tech IT',
      year: '2nd Year',
      phoneNumber: '+91-7766554433'
  },
];

const SEED_CANDIDATES: Candidate[] = [
  { id: 'u1', institutionId: 'inst_1', name: 'Aarav Patel', role: 'Frontend Dev', skills: ['React', 'TypeScript'], projectCount: 5, avgScore: 88 },
  { id: 'u3', institutionId: 'inst_1', name: 'Priya Singh', role: 'Data Scientist', skills: ['Python', 'TensorFlow'], projectCount: 3, avgScore: 92 },
];

const SEED_IDEAS: Idea[] = [
    {
        id: 'idea_1',
        institutionId: 'inst_1',
        title: 'Campus Food Delivery Drone',
        description: 'Autonomous drones to deliver food from canteen to hostels.',
        requiredSkills: ['Robotics', 'Python', 'Computer Vision'],
        openRoles: ['Drone Pilot', 'AI Engineer'],
        applicants: ['u3'],
        team: ['u1'],
        status: 'Open',
        createdAt: new Date().toISOString(),
        authorName: 'Aarav Patel',
        authorId: 'u1'
    }
];

const SEED_RESOURCES: Resource[] = [
    {
        id: 'res_1',
        institutionId: 'inst_1',
        title: 'Advanced Algorithms Lecture Notes',
        description: 'PDF notes for Graph Theory and Dynamic Programming.',
        authorName: 'Dr. S. Gupta',
        postedAt: new Date().toISOString()
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
    this.initSeed(STORAGE_KEYS.RESOURCES, SEED_RESOURCES);
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
      // Create user with a short, readable ID for easier manual login if role is student
      const prefix = user.role === 'Admin' ? 'admin' : user.role === 'Faculty' ? 'fac' : 'stu';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newUser = { 
          ...user, 
          id: `${prefix}_${randomSuffix}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
      };
      await this.addCollectionItem('users', newUser);
      
      // If student, also create candidate profile
      if (user.role === 'Student') {
           await this.addCollectionItem('candidates', { 
            id: newUser.id,
            institutionId: user.institutionId, 
            name: user.name, 
            role: user.course || 'Student', 
            skills: [], 
            projectCount: 0, 
            avgScore: 0 
        });
      }

      this.log("AUTH", `Created new user: ${user.name} (ID: ${newUser.id})`);
      return newUser;
  }

  // NEW: Bulk Create for Admin CSV upload
  async bulkCreateUsers(institutionId: string, users: Partial<UserProfile>[]): Promise<UserProfile[]> {
      const createdUsers: UserProfile[] = [];
      for (const u of users) {
          if (u.name && u.role) {
              const fullUser: Omit<UserProfile, 'id'> = {
                  institutionId,
                  name: u.name,
                  email: u.email || `${u.name.toLowerCase().replace(' ', '.')}@inst.edu`,
                  role: u.role as 'Student'|'Faculty'|'Admin',
                  avatar: '',
                  batch: u.batch,
                  course: u.course,
                  year: u.year,
                  phoneNumber: u.phoneNumber,
                  subjects: u.subjects
              };
              const newUser = await this.createUser(fullUser);
              createdUsers.push(newUser);
          }
      }
      return createdUsers;
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

  // Specific method to get users for Admin/Faculty listing
  async getUsersByInstitution(institutionId: string): Promise<UserProfile[]> {
      const users = this.read<UserProfile>(STORAGE_KEYS.USERS);
      return users.filter(u => u.institutionId === institutionId);
  }

  async appendUserSkills(userId: string, tags: string[]) {
    const key = STORAGE_KEYS.CANDIDATES;
    const candidates = this.read<Candidate>(key);
    const updated = candidates.map(c => {
        if (c.id === userId) {
            const newSkills = Array.from(new Set([...c.skills, ...tags]));
            return { ...c, skills: newSkills };
        }
        return c;
    });
    this.write(key, updated);
    this.log("UPDATE", `Appended skills to user ${userId}: ${tags.join(', ')}`);
  }
}

export const db = new MockFirestore();
