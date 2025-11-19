import React from 'react';
import { Message, GroundingLink } from '../types';
import { CodeBlock } from './CodeBlock';
import { User, Bot, Globe } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onExecuteCode: (code: string) => Promise<{ success: boolean; stdout: string; stderr: string }>;
}

const getLinkLabel = (link: GroundingLink) => {
  const fallback = link.title || link.uri;
  if (!link.uri) {
    return fallback;
  }
  try {
    return link.title || new URL(link.uri).hostname;
  } catch {
    return fallback;
  }
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onExecuteCode }) => {
  const isUser = message.role === 'user';

  // Simple parser to split text by code blocks
  const parseContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Extract language and code
        const match = part.match(/```(\w*)?[\n\r]([\s\S]*?)```/);
        if (match) {
          const language = match[1] || 'text';
          const code = match[2];
          return <CodeBlock key={index} code={code} language={language} onExecute={onExecuteCode} />;
        }
      }
      // Regular text
      if (!part.trim()) return null;
      
      return (
        <div key={index} className="whitespace-pre-wrap mb-2 last:mb-0">
           {part}
        </div>
      );
    });
  };

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] lg:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-xl ${
            isUser 
              ? 'bg-blender-orange text-white ring-2 ring-orange-500/20' 
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-2 ring-indigo-500/20'
          }`}>
            {isUser ? <User size={14} /> : <Bot size={14} />}
          </div>
        </div>

        {/* Content */}
        <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-2 mb-1 text-[10px] text-gray-500 uppercase tracking-wider`}>
            <span className="font-bold text-gray-400">{isUser ? 'You' : 'Gemini Expert'}</span>
            <span>•</span>
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className={`
            p-5 shadow-2xl relative overflow-hidden border w-full
            ${isUser 
              ? 'bg-blender-orange text-white rounded-2xl rounded-tr-sm border-orange-400/20' 
              : 'glass-panel rounded-2xl rounded-tl-sm text-gray-200'
            }
            ${message.isError ? 'border-red-500/50 bg-red-900/10' : ''}
          `}>
            {/* Attachments */}
            {message.attachment && (
              <div className="mb-4 -mx-1">
                <img 
                  src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                  alt="Attachment" 
                  className="max-h-64 rounded-lg border border-white/10 shadow-sm bg-black/20"
                />
              </div>
            )}

            {/* Text Content */}
            <div className={`leading-7 text-[14px] ${isUser ? 'text-white' : 'text-gray-300'}`}>
              {parseContent(message.text)}
            </div>

            {/* Grounding Sources */}
            {message.groundingLinks && message.groundingLinks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2 animate-fade-in">
                <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                  <Globe size={10} /> Sources
                </span>
                <div className="flex flex-wrap gap-2">
                  {message.groundingLinks.map((link: GroundingLink, i: number) => (
                     <a 
                        key={i} 
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] bg-black/20 hover:bg-white/10 border border-white/10 rounded-md px-2.5 py-1.5 text-blender-blue hover:text-white transition-colors truncate max-w-[220px] flex items-center gap-1.5 group"
                        title={link.title || link.uri}
                     >
                        <div className="w-1 h-1 rounded-full bg-blender-blue group-hover:bg-white transition-colors" />
                        {getLinkLabel(link)}
                     </a>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming Indicator */}
            {message.isStreaming && (
               <div className="flex gap-1 mt-2 h-4 items-center">
                 <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                 <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
