export interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp?: string;
  classId?: string; // Which class this message belongs to
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
  chat_name?: string; // ChatGPT-style generated name
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
  status?: string; // Processing status (optional for backward compatibility)
}

// User-created class (instances like "Law 101", "Biology Research")
export interface UserClass {
  id: string;
  name: string; // e.g., "Law 101", "Biology Research"
  domainType: DomainType; // The domain type (law, science, etc.)
  documents: string[]; // Document IDs assigned to this class
  created_at: string;
  description?: string;
}

// Keep old name for backwards compatibility during migration
export interface UserDomain extends UserClass {}

// User profile for personalization
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  classes: UserClass[];
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
  HISTORY = 'history',
  COMPUTER_SCIENCE = 'computer_science',
  ENGINEERING = 'engineering',
  LITERATURE = 'literature',
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