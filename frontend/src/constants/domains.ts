import { Home, Book, Beaker, Heart, Briefcase, Clock, Code, Cog, PenTool } from 'lucide-react';
import { DomainType } from '../types';

export const DOMAIN_TYPE_INFO = {
  [DomainType.GENERAL]: { icon: Home, label: 'General', shortLabel: 'General', color: 'blue' },
  [DomainType.LAW]: { icon: Book, label: 'Law', shortLabel: 'Law', color: 'amber' },
  [DomainType.SCIENCE]: { icon: Beaker, label: 'Science', shortLabel: 'Science', color: 'green' },
  [DomainType.MEDICINE]: { icon: Heart, label: 'Medicine', shortLabel: 'Medicine', color: 'red' },
  [DomainType.BUSINESS]: { icon: Briefcase, label: 'Business', shortLabel: 'Business', color: 'purple' },
  [DomainType.HISTORY]: { icon: Clock, label: 'History', shortLabel: 'History', color: 'pink' },
  [DomainType.COMPUTER_SCIENCE]: { icon: Code, label: 'Computer Science', shortLabel: 'CS', color: 'cyan' },
  [DomainType.ENGINEERING]: { icon: Cog, label: 'Engineering', shortLabel: 'Eng', color: 'orange' },
  [DomainType.LITERATURE]: { icon: PenTool, label: 'Literature', shortLabel: 'Lit', color: 'indigo' },
};