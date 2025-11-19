import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Box, RotateCcw } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, attachment?: { mimeType: string, data: string }) => Promise<void>;
  onStop: () => void;
  isGenerating: boolean;
  onExecuteCode: (code: string) => Promise<{ success: boolean; stdout: string; stderr: string }>;
  isSidebarOpen: boolean;
  onResetChat: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage,
  onStop,
  isGenerating,
  onExecuteCode,
  isSidebarOpen,
  onResetChat
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header Shadow & Controls */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#09090b] to-transparent z-10 pointer-events-none" />
      
      <button 
        onClick={onResetChat}
        className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm"
        title="Reset Chat (Start New)"
      >
        <RotateCcw size={18} />
      </button>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 pb-40 custom-scrollbar scroll-smooth pt-20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 select-none">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blender-orange/20 to-red-600/20 flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
              <Box size={48} className="text-blender-orange" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Blender Assistant</h1>
            <p className="text-gray-500 text-sm max-w-md text-center leading-relaxed">
              Ask me to generate geometry nodes, write Python scripts, or debug your scene.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onExecuteCode={onExecuteCode} 
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent">
        <div className="max-w-3xl mx-auto">
          <ChatInput 
            onSendMessage={onSendMessage} 
            onStop={onStop}
            isGenerating={isGenerating}
          />
          
          <div className="text-center mt-3">
            <span className="text-[10px] text-gray-600 flex items-center justify-center gap-2">
              Generated code may require verification. Always save your .blend file.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};