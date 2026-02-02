
export interface Institution {
  id: string;
  name: string;
  domain: string;
}

export type ProjectStatus = 'Pending' | 'In Progress' | 'Completed';

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
  authorId: string;
  authorName: string;
  status: ProjectStatus;
  assignedFacultyId?: string; // ID of faculty reviewing this
  sharedResources?: string[]; // Links to external folders/drive
}

export interface Message {
  id: string;
  institutionId: string;
  projectId: string; // OR ideaId
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Resource {
  id: string;
  institutionId: string;
  title: string;
  description: string;
  link?: string;
  authorName: string;
  postedAt: string;
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
  applicants: string[]; // User IDs
  team: string[]; // User IDs of accepted members
  status: 'Open' | 'Closed' | 'In Progress';
  createdAt: string;
  authorName: string;
  authorId: string;
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
  NOTES = 'NOTES',
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN',
}

export interface UserProfile {
  id: string;
  institutionId: string;
  name: string;
  email: string;
  role: 'Student' | 'Faculty' | 'Admin';
  avatar: string;
  // Academic Details
  phoneNumber?: string;
  batch?: string; // e.g. 2024-2028
  course?: string; // e.g. B.Tech CS
  year?: string; // e.g. 2nd Year
  subjects?: string[]; // For Faculty: List of subjects taught
}
