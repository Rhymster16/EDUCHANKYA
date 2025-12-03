export interface Institution {
  id: string;
  name: string;
  domain: string;
}

export interface Project {
  id: string;
  institutionId: string;
  parentId?: string; // For lineage/iterations
  title: string;
  description: string;
  complexity: number; // 0-100
  tags: string[];
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
  critique?: ProjectCritique;
  handoverNote?: string; // Teacher's note for future students
  recommendedPathId?: string; // Link to a Learning Path
  authorName?: string;
}

export interface RefactoringSuggestion {
  file: string;
  issue: string;
  suggestedCode: string;
}

export interface ProjectCritique {
  summary: string;
  weaknesses: string[];
  nextSteps: string;
  refactoringSuggestions: RefactoringSuggestion[];
  revisedComplexity: number;
}

export interface Candidate {
  id: string;
  institutionId: string;
  name: string;
  role: string;
  skills: string[];
  projectCount: number;
  avgScore: number;
  bio?: string;
}

export interface Idea {
  id: string;
  institutionId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  openRoles: string[]; 
  applicants: string[]; // User IDs or Names
  createdAt: string;
  authorName: string;
}

export interface LearningPath {
  id: string;
  institutionId?: string; // Optional: null means global/community path
  goal: string;
  author?: string; 
  steps: {
    title: string;
    description: string;
    estimatedHours: number;
  }[];
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  REPOSITORY = 'REPOSITORY',
  LEARNING = 'LEARNING',
  TALENT = 'TALENT',
  IDEATION = 'IDEATION',
  SYSTEM = 'SYSTEM',
}

export interface UserProfile {
  id: string;
  institutionId: string;
  name: string;
  email: string;
  role: 'Student' | 'Faculty';
  avatar: string;
}