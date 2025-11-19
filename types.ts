
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachment?: {
    mimeType: string;
    data: string;
  };
  isStreaming?: boolean;
  isError?: boolean;
  groundingLinks?: GroundingLink[];
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface Settings {
  model: string;
  blenderPort: number;
  thinkingBudget: number;
  verbosity: 'concise' | 'normal' | 'detailed';
  blenderToken: string;
  toolsEnabled: boolean;
  
  // Qdrant / RAG Settings
  qdrantEnabled: boolean;
  qdrantUrl: string;
  qdrantApiKey: string;
  qdrantCollection: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface CustomTool {
  name: string;
  description: string;
  trigger: string; // e.g., "/cleanup"
  code: string;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export interface ScreenshotResult {
  success: boolean;
  image?: string;
  error?: string;
}

export interface GraphData {
  nodes: any[];
  links: any[];
  error?: string;
}
