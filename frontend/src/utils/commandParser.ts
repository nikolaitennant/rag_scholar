export interface Command {
  type: 'background' | 'persona' | 'reset' | 'summarize' | 'explain' | 'compare' | 'search' | 'cite';
  content: string;
  isValid: boolean;
  error?: string;
}

export interface CommandSuggestion {
  command: string;
  description: string;
  example: string;
}

export const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  {
    command: '/background',
    description: 'Ask questions using general knowledge instead of documents',
    example: '/background What is machine learning?'
  },
  {
    command: '/persona',
    description: 'Set AI personality or role for this conversation',
    example: '/persona Act as a patient tutor'
  },
  {
    command: '/reset',
    description: 'Reset persona and return to default behavior',
    example: '/reset'
  },
  {
    command: '/summarize',
    description: 'Summarize the conversation or uploaded documents',
    example: '/summarize this conversation'
  },
  {
    command: '/explain',
    description: 'Explain a topic from your documents in simple terms',
    example: '/explain photosynthesis'
  },
  {
    command: '/compare',
    description: 'Compare two concepts from your documents',
    example: '/compare mitosis vs meiosis'
  },
  {
    command: '/search',
    description: 'Search for specific terms in your uploaded documents',
    example: '/search DNA structure'
  },
  {
    command: '/cite',
    description: 'Find citations and sources for a specific claim',
    example: '/cite DNA is a double helix'
  }
];

export function parseCommand(input: string): Command | null {
  const trimmed = input.trim();

  if (!trimmed.startsWith('/')) {
    return null;
  }

  const parts = trimmed.split(' ');
  const commandWord = parts[0].toLowerCase();
  const content = parts.slice(1).join(' ').trim();

  switch (commandWord) {
    case '/background':
      return {
        type: 'background',
        content,
        isValid: content.length > 0,
        error: content.length === 0 ? 'Please provide a question for background knowledge' : undefined
      };

    case '/persona':
      return {
        type: 'persona',
        content,
        isValid: content.length > 0,
        error: content.length === 0 ? 'Please specify the role or personality to adopt' : undefined
      };

    case '/reset':
      return {
        type: 'reset',
        content: '',
        isValid: true
      };

    case '/summarize':
      return {
        type: 'summarize',
        content: content || 'documents',
        isValid: true
      };

    case '/explain':
      return {
        type: 'explain',
        content,
        isValid: content.length > 0,
        error: content.length === 0 ? 'Please specify what you want explained' : undefined
      };

    case '/compare':
      return {
        type: 'compare',
        content,
        isValid: content.includes(' vs ') || content.includes(' and '),
        error: !content.includes(' vs ') && !content.includes(' and ')
          ? 'Please use format: /compare A vs B or /compare A and B'
          : undefined
      };

    case '/search':
      return {
        type: 'search',
        content,
        isValid: content.length > 0,
        error: content.length === 0 ? 'Please provide search terms' : undefined
      };

    case '/cite':
      return {
        type: 'cite',
        content,
        isValid: content.length > 0,
        error: content.length === 0 ? 'Please provide the claim you want citations for' : undefined
      };

    default:
      return {
        type: 'background',
        content: trimmed,
        isValid: false,
        error: `Unknown command: ${commandWord}. Available commands: /background, /persona, /reset, /summarize, /explain, /compare, /search, /cite`
      };
  }
}

export function getCommandSuggestions(input: string): CommandSuggestion[] {
  if (!input.startsWith('/')) {
    return [];
  }

  const query = input.toLowerCase();
  return COMMAND_SUGGESTIONS.filter(suggestion =>
    suggestion.command.toLowerCase().startsWith(query) ||
    suggestion.description.toLowerCase().includes(query.slice(1))
  );
}

export function formatCommandForBackend(command: Command): string {
  switch (command.type) {
    case 'background':
      return `/background ${command.content}`;

    case 'persona':
      return `Please adopt the following role/persona: ${command.content}`;

    case 'reset':
      return 'Please reset to your default behavior and clear any active persona';

    case 'summarize':
      if (command.content === 'documents' || command.content === '') {
        return 'Please provide a comprehensive summary of all the uploaded documents, highlighting the key points and main findings';
      } else if (command.content.includes('conversation')) {
        return 'Please summarize our conversation so far, including the main topics discussed and key insights';
      } else {
        return `Please summarize the following from the uploaded documents: ${command.content}`;
      }

    case 'explain':
      return `Please explain ${command.content} in simple, easy-to-understand terms based on the information in the uploaded documents. Use examples and analogies where helpful.`;

    case 'compare':
      return `Please compare and contrast ${command.content} based on the information in the uploaded documents. Highlight the similarities, differences, and key distinguishing features.`;

    case 'search':
      return `Please search through the uploaded documents for information about "${command.content}" and provide all relevant findings with citations.`;

    case 'cite':
      return `Please find and provide specific citations and sources from the uploaded documents that support or discuss the following claim: "${command.content}"`;

    default:
      return command.content;
  }
}