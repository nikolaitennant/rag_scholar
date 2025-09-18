export interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp?: string;
  domainId?: string; // Which domain this message belongs to
}

export interface Citation {
  id: string;
  source: string;
  page?: number;
  preview: string;
  summary?: string;
  full_text?: string;
  relevance_score: number;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  sources: string[];
}

export interface Document {
  id: string;
  filename: string;
  collection: string;
  chunks: number;
  upload_date?: string;
  file_type: string;
  assigned_classes: string[];
  size?: number; // File size in bytes (optional for backward compatibility)
}

// User-created class/domain
export interface UserDomain {
  id: string;
  name: string; // e.g., "History of Law Class", "Biology Research"
  type: DomainType; // The domain type (law, science, etc.)
  documents: string[]; // Document IDs assigned to this domain
  created_at: string;
  description?: string;
}

// User profile for personalization
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  domains: UserDomain[];
  preferences?: {
    theme: 'light' | 'dark';
    defaultDomain?: string;
  };
  isAdmin?: boolean;
}

export enum DomainType {
  GENERAL = 'general',
  LAW = 'law',
  SCIENCE = 'science',
  MEDICINE = 'medicine',
  BUSINESS = 'business',
  HUMANITIES = 'humanities',
  COMPUTER_SCIENCE = 'computer_science',
}

export interface DomainConfig {
  icon: string;
  color: string;
}

// Extended user data from backend (additional to Firebase User)
export interface UserProfile {
  profile?: {
    bio?: string;
    research_interests?: string[];
    preferred_domains?: string[];
  };
  stats?: {
    total_points?: number;
    sessions_count?: number;
    documents_uploaded?: number;
    messages_sent?: number;
  };
  achievements?: Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    unlocked_at: string | null;
    progress?: number;
    required?: number;
    points?: number;
    target?: number;
  }>;
}