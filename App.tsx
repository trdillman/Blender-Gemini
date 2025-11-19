
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { CustomTool } from './types';
import { useSettings } from './hooks/useSettings';
import { useBlender } from './hooks/useBlender';
import { useChatSession } from './hooks/useChatSession';
import { useGeminiAgent } from './hooks/useGeminiAgent';

const App: React.FC = () => {
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Data State
  const [memoryContent, setMemoryContent] = useState<string>("");
  const [tools, setTools] = useState<CustomTool[]>([]);

  // Settings
  const [settings, setSettings] = useSettings();
  
  // Backend Connection
  const blender = useBlender(settings.blenderPort, settings.blenderToken);
  
  // Session Management
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSessionId, 
    currentSession, 
    addMessageToSession, 
    updateLastMessage, 
    handleNewSession, 
    handleDeleteSession 
  } = useChatSession(blender.saveHistory, blender.fetchHistory);

  // Initial Data Load
  useEffect(() => {
    if (blender.isConnected) {
        blender.fetchMemory().then(setMemoryContent);
        blender.fetchTools().then(setTools);
    }
  }, [blender.isConnected]);

  // New Session from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('newSession') === 'true') {
        handleNewSession();
        const newUrl = window.location.pathname + '?' + params.toString().replace(/&?newSession=true/, '');
        window.history.replaceState({}, '', newUrl);
    }
  }, [handleNewSession]);

  // Agent Logic
  const { sendMessage, isGenerating, stop } = useGeminiAgent({
    settings,
    memoryContent,
    customTools: tools,
    blenderFunctions: blender,
    onMemoryUpdate: setMemoryContent,
    onToolsUpdate: setTools,
    addMessage: (msg) => addMessageToSession(currentSessionId, msg),
    updateLastMessage: (msg) => updateLastMessage(currentSessionId, msg)
  });

  // Handlers
  const handleSendMessage = async (text: string, attachment?: { mimeType: string, data: string }) => {
    const userMsgId = Date.now().toString();
    addMessageToSession(currentSessionId, {
        id: userMsgId,
        role: 'user',
        text,
        attachment,
        timestamp: Date.now(),
    });
    
    await sendMessage(text, attachment, currentSession.messages);
  };

  return (
    <div className="flex h-full w-full bg-[#09090b]">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        settings={settings}
        onSettingsChange={setSettings}
        isConnected={blender.isConnected}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={(id, e) => { e.stopPropagation(); handleDeleteSession(id); }}
        memoryContent={memoryContent}
        tools={tools}
        onDeleteTool={async (trigger) => {
             await blender.deleteTool(trigger);
             const updated = await blender.fetchTools();
             setTools(updated);
        }}
        onMemoryChange={async (newContent) => {
            setMemoryContent(newContent);
            await blender.overwriteMemory(newContent);
        }}
      />
      
      <div className={`flex-1 h-full transition-all duration-300 flex flex-col relative ${isSidebarOpen ? 'md:ml-80' : ''}`}>
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 p-2 rounded-lg bg-blender-panel border border-white/10 text-white hover:bg-white/10"
          >
            <span className="sr-only">Open Sidebar</span>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 3v18"/></svg>
          </button>
        )}

        <ChatInterface 
            messages={currentSession.messages} 
            onSendMessage={handleSendMessage}
            onStop={stop}
            isGenerating={isGenerating}
            onExecuteCode={blender.executeCode}
            isSidebarOpen={isSidebarOpen}
            onResetChat={handleNewSession}
        />
      </div>
    </div>
  );
};

export default App;
