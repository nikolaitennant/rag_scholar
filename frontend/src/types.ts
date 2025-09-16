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
  answer: string;
  citations?: Citation[];
}

export interface Document {
  id: string;
  filename: string;
  chunks: number;
  size: number;
  status: string;
  uploaded_at?: string;
  domains?: string[]; // Which domains this document belongs to
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