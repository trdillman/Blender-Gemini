import { FunctionDeclaration, Type } from "@google/genai";

// Tool Definition for Persistent Memory
export const rememberTool: FunctionDeclaration = {
  name: 'remember',
  description: 'Save important workflow details, code snippets, specific project rules, or user preferences to persistent memory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fact: {
        type: Type.STRING,
        description: 'The information to store in the persistent memory file.',
      },
    },
    required: ['fact'],
  },
};

// Tool: Create Custom Tool
export const createToolDef: FunctionDeclaration = {
  name: 'create_tool',
  description: 'Create a reusable custom tool (slash command) that executes a specific Python script.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Readable name of the tool' },
      description: { type: Type.STRING, description: 'Short description of what the tool does' },
      trigger: { type: Type.STRING, description: 'The command trigger, usually starting with / (e.g., /cleanup)' },
      code: { type: Type.STRING, description: 'The Python code to execute when triggered' }
    },
    required: ['name', 'description', 'trigger', 'code']
  }
};

// Tool: Run Custom Tool
export const runToolDef: FunctionDeclaration = {
  name: 'run_tool',
  description: 'Execute an existing custom tool by its trigger command.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      trigger: { type: Type.STRING, description: 'The trigger command of the tool to run (e.g., /cleanup)' }
    },
    required: ['trigger']
  }
};

// Tool: Inspect Graph (Agentic)
export const inspectGraphTool: FunctionDeclaration = {
    name: 'inspect_graph',
    description: 'Read the current active Geometry Node graph structure (nodes, inputs, links). Use this BEFORE making changes to understand the state, and AFTER making changes to verify they were applied correctly.',
    parameters: {
        type: Type.OBJECT,
        properties: {},
    }
};

// Tool: Screenshot (Agentic)
export const screenshotTool: FunctionDeclaration = {
    name: 'get_screenshot',
    description: 'Capture an image of the current Blender viewport. Use this to visually verify if geometry is being generated or modified correctly.',
    parameters: {
        type: Type.OBJECT,
        properties: {},
    }
};

// Tool: Execute Code (Agentic)
export const executeCodeTool: FunctionDeclaration = {
    name: 'execute_code',
    description: 'PRIMARY ACTION TOOL. Execute Python code directly in Blender. You MUST use this tool for ALL scene modifications, object creation, modifier application, and data inspection tasks. Do not describe the code, RUN IT.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            code: {
                type: Type.STRING,
                description: 'The Python code to run. Ensure it uses `bpy` correctly.',
            },
        },
        required: ['code'],
    },
};

// --- Qdrant Management Tools ---

export const qdrantListCollectionsTool: FunctionDeclaration = {
  name: 'qdrant_list_collections',
  description: 'List all available Vector Database collections in Qdrant.',
  parameters: { type: Type.OBJECT, properties: {} }
};

export const qdrantCreateCollectionTool: FunctionDeclaration = {
  name: 'qdrant_create_collection',
  description: 'Create a new Vector Database collection in Qdrant.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Name of the collection (no spaces, lowercase)' }
    },
    required: ['name']
  }
};

export const qdrantDeleteCollectionTool: FunctionDeclaration = {
  name: 'qdrant_delete_collection',
  description: 'Delete a Qdrant collection (Permanent).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Name of the collection to delete' }
    },
    required: ['name']
  }
};

export const qdrantAddKnowledgeTool: FunctionDeclaration = {
  name: 'qdrant_add_knowledge',
  description: 'Embed and save text information into a specific Qdrant collection.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      collection: { type: Type.STRING, description: 'Target collection name' },
      content: { type: Type.STRING, description: 'The text content to save' },
      source: { type: Type.STRING, description: 'Optional source/title metadata' }
    },
    required: ['collection', 'content']
  }
};

export const searchKnowledgeBaseTool: FunctionDeclaration = {
    name: 'search_knowledge_base',
    description: 'Search the Qdrant vector database for information.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: 'The search query.' },
            collection: { type: Type.STRING, description: 'Optional specific collection to search. Defaults to "blender_api".' }
        },
        required: ['query'],
    },
};

export const SYSTEM_TOOLS = [
  rememberTool, 
  createToolDef, 
  runToolDef, 
  inspectGraphTool, 
  screenshotTool, 
  executeCodeTool,
  searchKnowledgeBaseTool,
  qdrantListCollectionsTool,
  qdrantCreateCollectionTool,
  qdrantDeleteCollectionTool,
  qdrantAddKnowledgeTool
];