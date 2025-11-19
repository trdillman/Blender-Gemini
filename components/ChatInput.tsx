import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Loader2, Square } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, attachment?: { mimeType: string, data: string }) => Promise<void>;
  onStop: () => void;
  isGenerating: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onStop, isGenerating }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ mimeType: string, data: string } | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachment({
          mimeType: file.type,
          data: base64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !attachment) return;
    if (isGenerating) return;

    await onSendMessage(text, attachment);
    setText('');
    setAttachment(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`
      relative glass-panel rounded-3xl p-2 transition-all duration-300 shadow-2xl
      ${isGenerating ? 'opacity-100' : 'opacity-100'}
    `}>
      {/* Attachment Preview */}
      {attachment && (
        <div className="absolute -top-20 left-4 p-2 bg-[#18181b] rounded-xl border border-white/10 shadow-xl flex items-center gap-3 animate-fade-in z-30">
          <img 
            src={`data:${attachment.mimeType};base64,${attachment.data}`} 
            className="w-12 h-12 rounded-lg object-cover border border-white/5" 
            alt="preview" 
          />
          <div className="flex flex-col pr-2">
            <span className="text-[10px] text-gray-400 font-mono">Image attached</span>
            <button 
              onClick={() => {
                setAttachment(undefined);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-[10px] text-red-400 hover:text-red-300 text-left flex items-center gap-1"
            >
              <X size={10} /> Remove
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating}
          className={`p-3 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Attach Image"
        >
          <ImageIcon size={20} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileSelect} 
        />
        
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGenerating ? "Agent is working..." : "Describe a node setup, scripting task, or debug request..."}
          disabled={isGenerating}
          className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm p-3 focus:outline-none resize-none max-h-32 custom-scrollbar disabled:opacity-50"
          rows={1}
          style={{ minHeight: '44px' }}
        />

        {isGenerating ? (
          <button 
            onClick={onStop}
            className="p-3 rounded-full shrink-0 transition-all duration-300 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20"
            title="Stop Generation"
          >
            <Square size={20} fill="currentColor" className="p-0.5" />
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={!text.trim() && !attachment}
            className={`
              p-3 rounded-full shrink-0 transition-all duration-300
              ${(text.trim() || attachment)
                ? 'bg-blender-orange text-white shadow-lg shadow-orange-500/20 hover:scale-105' 
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }
            `}
          >
            <Send size={20} className={text.trim() || attachment ? "ml-0.5" : ""} />
          </button>
        )}
      </div>
    </div>
  );
};