import { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Settings, CustomTool, Message, ExecutionResult, ScreenshotResult, GraphData } from '../types';
import { generateSystemPrompt } from '../utils/prompts';
import { 
  performSemanticSearch, 
  listCollections, 
  createCollection, 
  deleteCollection, 
  addDocuments 
} from '../utils/rag';
import { SYSTEM_TOOLS } from '../utils/tools';

interface UseGeminiAgentProps {
  settings: Settings;
  memoryContent: string;
  customTools: CustomTool[];
  blenderFunctions: {
    appendMemory: (fact: string) => Promise<boolean>;
    fetchMemory: () => Promise<string>;
    saveTool: (tool: CustomTool) => Promise<boolean>;
    fetchTools: () => Promise<CustomTool[]>;
    executeCode: (code: string) => Promise<ExecutionResult>;
    inspectGraph: () => Promise<GraphData>;
    getScreenshot: () => Promise<ScreenshotResult>;
  };
  onMemoryUpdate: (content: string) => void;
  onToolsUpdate: (tools: CustomTool[]) => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (msg: Partial<Message>) => void;
}

export const useGeminiAgent = ({
  settings,
  memoryContent,
  customTools,
  blenderFunctions,
  onMemoryUpdate,
  onToolsUpdate,
  addMessage,
  updateLastMessage
}: UseGeminiAgentProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const sendMessage = async (text: string, attachment?: { mimeType: string, data: string }, historyMessages: Message[] = []) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!apiKey) {
        addMessage({
            id: Date.now().toString(),
            role: 'model',
            text: "Error: No Gemini API key provided. Please set GEMINI_API_KEY in your environment.",
            timestamp: Date.now(),
            isError: true
        });
        return;
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // 1. RAG Augmentation
    let augmentedText = text;
    if (settings.qdrantEnabled) {
         const ragContext = await performSemanticSearch(settings, text, apiKey);
         if (ragContext) {
             augmentedText = `${text}\n${ragContext}`;
         }
    }

    // 2. Construct Request
    const parts: any[] = [];
    if (attachment) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    }
    parts.push({ text: augmentedText });

    const formattedHistory = historyMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || "" }]
    }));

    // 3. Config
    const config: any = {
        systemInstruction: generateSystemPrompt(settings, memoryContent, customTools),
    };

    if (settings.toolsEnabled) {
        config.tools = [
            { functionDeclarations: SYSTEM_TOOLS }
        ];
    }

    if (settings.thinkingBudget > 0) {
        config.thinkingConfig = { thinkingBudget: settings.thinkingBudget };
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        // Recursive Agent Loop
        await runAgentLoop(
            ai, 
            settings.model, 
            config, 
            formattedHistory, 
            parts, 
            signal
        );
    } catch (error: any) {
        if (!signal.aborted) {
            console.error("Gemini Agent Error:", error);
            addMessage({
                id: Date.now().toString(),
                role: 'model',
                text: `**Error**: ${error.message || 'Unknown error occurred.'}`,
                timestamp: Date.now(),
                isError: true
            });
        }
    } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
    }
  };

  const runAgentLoop = async (
      ai: GoogleGenAI, 
      model: string, 
      config: any, 
      history: any[], 
      currentParts: any[], 
      signal: AbortSignal,
      retryCount = 0
  ) => {
      if (signal.aborted) return;
      if (retryCount > 20) throw new Error("Loop limit reached (20 turns).");

      const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: [...history, { role: 'user', parts: currentParts }],
          config
      });

      // Initial Bot Message creation
      if (retryCount === 0) {
          addMessage({
              id: (Date.now() + 1).toString(),
              role: 'model',
              text: '',
              timestamp: Date.now(),
              isStreaming: true,
              groundingLinks: []
          });
      }

      let fullText = '';
      let collectedLinks: any[] = [];
      let toolCalls: any[] = [];

      // Stream processing
      for await (const chunk of responseStream) {
          if (signal.aborted) return;

          if (chunk.text) fullText += chunk.text;
          
          // EXTRACT RAW FUNCTION CALLS
          // We must extract from parts directly to preserve 'thought_signature' for Thinking models.
          // The SDK's chunk.functionCalls helper might return sanitized objects.
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (parts) {
              for (const part of parts) {
                  if (part.functionCall) {
                      toolCalls.push(part.functionCall);
                  }
              }
          } else if (chunk.functionCalls) {
             // Fallback
             toolCalls.push(...chunk.functionCalls);
          }
          
          if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
              chunk.candidates[0].groundingMetadata.groundingChunks.forEach((c: any) => {
                  if (c.web) collectedLinks.push({ title: c.web.title, uri: c.web.uri });
              });
          }

          // Debounced UI Update could go here, but we just update every chunk for responsiveness
          const uniqueLinks = collectedLinks.filter((link, index, self) =>
              index === self.findIndex((t) => t.uri === link.uri)
          );
          
          updateLastMessage({
              text: fullText, 
              groundingLinks: uniqueLinks,
              isStreaming: true 
          });
      }

      // Tool Execution
      if (toolCalls.length > 0) {
          const functionResponses: any[] = [];
          let attachmentUpdate: { mimeType: string, data: string } | undefined = undefined;

          for (const call of toolCalls) {
              if (signal.aborted) break;
              
              const response = await handleToolCall(
                  call, 
                  customTools, 
                  blenderFunctions, 
                  onMemoryUpdate, 
                  onToolsUpdate,
                  settings,
                  ai.apiKey
              );
              functionResponses.push(response.apiResponse);
              
              fullText += `\n\n${response.logText}`;
              if (response.attachment) attachmentUpdate = response.attachment;
          }

          updateLastMessage({
              text: fullText, 
              isStreaming: true,
              ...(attachmentUpdate ? { attachment: attachmentUpdate } : {})
          });

          // Recursion
          if (functionResponses.length > 0 && !signal.aborted) {
              // CRITICAL FIX: Include fullText (thoughts) in history to prevent 'missing thought_signature' error
              const modelParts: any[] = [];
              if (fullText) {
                  modelParts.push({ text: fullText });
              }
              toolCalls.forEach(tc => modelParts.push({ functionCall: tc }));

              const nextHistory = [
                  ...history, 
                  { role: 'user', parts: currentParts },
                  { role: 'model', parts: modelParts }
              ];
              
              await runAgentLoop(ai, model, config, nextHistory, functionResponses, signal, retryCount + 1);
              return;
          }
      }

      // Finalize
      updateLastMessage({ isStreaming: false });
  };

  return { sendMessage, isGenerating, stop };
};

// Helper to process individual tools
async function handleToolCall(
    call: any, 
    tools: CustomTool[], 
    funcs: UseGeminiAgentProps['blenderFunctions'],
    onMemUpdate: (s: string) => void,
    onToolUpdate: (t: CustomTool[]) => void,
    settings: Settings,
    apiKey: string
): Promise<{ apiResponse: any, logText: string, attachment?: {mimeType: string, data: string} }> {
    
    const { name, args } = call;
    let logText = "";
    let resultStr = "";
    let attachment = undefined;

    try {
        switch (name) {
            case 'remember': {
                const success = await funcs.appendMemory(args.fact);
                if (success) {
                    const mem = await funcs.fetchMemory();
                    onMemUpdate(mem);
                    resultStr = "Memory saved.";
                    logText = `*Saved to persistent memory.*`;
                } else {
                    resultStr = "Failed to save.";
                }
                break;
            }
            case 'create_tool': {
                const tool: CustomTool = { 
                    name: args.name, 
                    description: args.description, 
                    trigger: args.trigger, 
                    code: args.code 
                };
                const success = await funcs.saveTool(tool);
                if (success) {
                    const updated = await funcs.fetchTools();
                    onToolUpdate(updated);
                    resultStr = `Tool '${args.trigger}' created.`;
                    logText = `*Created new tool: ${args.name} (${args.trigger})*`;
                } else {
                    resultStr = "Failed to create tool.";
                }
                break;
            }
            case 'run_tool': {
                const tool = tools.find(t => t.trigger === args.trigger);
                if (tool) {
                    const res = await funcs.executeCode(tool.code);
                    resultStr = res.success 
                        ? `Executed. Stdout: ${res.stdout}` 
                        : `Failed. Stderr: ${res.stderr}`;
                    const icon = res.success ? '✅' : '❌';
                    logText = `*${icon} Executed ${args.trigger}*\n` + 
                              (res.stdout ? `\
\
${res.stdout.trim()}\n\
\
` : '') + 
                              (res.stderr ? `\nStderr:\n\
\
${res.stderr.trim()}\n\
\
` : '');
                } else {
                    resultStr = `Tool '${args.trigger}' not found.`;
                }
                break;
            }
            case 'inspect_graph': {
                const data = await funcs.inspectGraph();
                resultStr = JSON.stringify(data);
                const nodeCount = data.nodes ? data.nodes.length : 0;
                logText = `*Inspected Graph: ${nodeCount} nodes found.*`;
                break;
            }
            case 'get_screenshot': {
                const data = await funcs.getScreenshot();
                if (data.success && data.image) {
                    resultStr = "Screenshot captured.";
                    logText = `*Captured Screenshot*`;
                    attachment = { mimeType: 'image/png', data: data.image };
                } else {
                    resultStr = "Failed to capture screenshot.";
                }
                break;
            }
            case 'execute_code': {
                const res = await funcs.executeCode(args.code);
                resultStr = res.success 
                    ? `Executed. Stdout: ${res.stdout}` 
                    : `Failed. Stderr: ${res.stderr}`;
                const icon = res.success ? '✅' : '❌';
                logText = `*${icon} Executed Code*\n` + 
                          (res.stdout ? `\
\
${res.stdout.trim()}\n\
\
` : '') + 
                          (res.stderr ? `\nStderr:\n\
\
${res.stderr.trim()}\n\
\
` : '');
                break;
            }
            case 'search_knowledge_base': {
                if (!settings.qdrantEnabled) {
                    resultStr = "Qdrant knowledge base is disabled in settings.";
                } else {
                    // Support optional collection override from args, or use default
                    const collection = args.collection || settings.qdrantCollection;
                    const results = await performSemanticSearch(settings, args.query, apiKey, collection);
                    resultStr = results || "No relevant results found.";
                }
                logText = `*Searched Knowledge Base for: "${args.query}"*`;
                break;
            }
            case 'qdrant_list_collections': {
                if (!settings.qdrantEnabled) {
                    resultStr = "Qdrant is disabled.";
                } else {
                    const res = await listCollections(settings);
                    resultStr = JSON.stringify(res, null, 2);
                }
                logText = `*Listed Qdrant Collections*`;
                break;
            }
            case 'qdrant_create_collection': {
                if (!settings.qdrantEnabled) {
                    resultStr = "Qdrant is disabled.";
                } else {
                    const res = await createCollection(settings, args.name);
                    resultStr = JSON.stringify(res);
                }
                logText = `*Created Collection: ${args.name}*`;
                break;
            }
            case 'qdrant_delete_collection': {
                if (!settings.qdrantEnabled) {
                    resultStr = "Qdrant is disabled.";
                } else {
                    const res = await deleteCollection(settings, args.name);
                    resultStr = JSON.stringify(res);
                }
                logText = `*Deleted Collection: ${args.name}*`;
                break;
            }
            case 'qdrant_add_knowledge': {
                if (!settings.qdrantEnabled) {
                    resultStr = "Qdrant is disabled.";
                } else {
                    const res = await addDocuments(settings, apiKey, args.collection, [{ content: args.content, metadata: { source: args.source || 'User Input' } }]);
                    resultStr = JSON.stringify(res);
                }
                logText = `*Added Knowledge to ${args.collection}*`;
                break;
            }
            default:
                resultStr = "Unknown function.";
        }
    } catch (e: any) {
        resultStr = `Error executing tool: ${e.message}`;
    }

    return {
        apiResponse: {
            functionResponse: {
                name,
                response: { result: resultStr }
            }
        },
        logText,
        attachment
    };
}