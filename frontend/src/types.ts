export interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export interface Citation {
  id: string;
  source: string;
  page?: number;
  preview: string;
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
}

export interface Collection {
  name: string;
  documents: Document[];
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