
import React from 'react';
import { Settings, Trash2, Settings2, Cpu, Link2, AlertCircle, X, MessageSquare, Plus, Clock, Database, HardDrive, Zap, Wrench } from 'lucide-react';
import type { Settings as SettingsType, ChatSession, CustomTool } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  settings: SettingsType;
  onSettingsChange: (s: SettingsType) => void;
  isConnected: boolean;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  memoryContent?: string;
  onMemoryChange?: (content: string) => void;
  tools?: CustomTool[];
  onDeleteTool?: (trigger: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen, 
  settings, 
  onSettingsChange, 
  isConnected,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  memoryContent = "",
  tools = [],
  onDeleteTool,
  onMemoryChange
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [qdrantStatus, setQdrantStatus] = React.useState<'connected' | 'disconnected' | 'checking' | 'error'>('disconnected');
  const [qdrantError, setQdrantError] = React.useState('');
  const [memoryContentLocal, setMemoryContentLocal] = React.useState(memoryContent);

  React.useEffect(() => {
    setMemoryContentLocal(memoryContent);
  }, [memoryContent]);

  React.useEffect(() => {
    let isActive = true;
    let currentController: AbortController | null = null;

    if (!settings.qdrantEnabled) {
      setQdrantStatus('disconnected');
      setQdrantError('');
      return;
    }

    const safeUrl = settings.qdrantUrl?.trim().replace(/\/$/, '');
    if (!safeUrl) {
      setQdrantStatus('error');
      setQdrantError('Missing Qdrant URL');
      return;
    }

    const checkConnection = async () => {
      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;

      if (!isActive) return;
      setQdrantStatus('checking');
      setQdrantError('');

      try {
        const response = await fetch(safeUrl, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store'
        });

        if (!isActive) return;

        if (response.ok) {
          setQdrantStatus('connected');
          setQdrantError('');
        } else {
          setQdrantStatus('error');
          setQdrantError(`${response.status} ${response.statusText}`);
        }
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Network error';
        setQdrantStatus('error');
        setQdrantError(message);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => {
      isActive = false;
      currentController?.abort();
      clearInterval(interval);
    };
  }, [settings.qdrantEnabled, settings.qdrantUrl]);

  const getSafeHost = (url: string) => {
      try {
          return new URL(url).host;
      } catch (e) {
          return url;
      }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-80 glass-panel flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blender-orange to-red-600 rounded-lg shadow-lg shadow-orange-900/20 flex items-center justify-center text-white font-bold text-lg">
              B
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">BlenderGemini</h1>
              <p className="text-[10px] text-blender-subtext uppercase tracking-wider">Assistant Pro 2.1</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Status Cards */}
            <div className="space-y-3">
                {/* Blender Bridge Status */}
                <div className={`p-4 rounded-xl border ${isConnected ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-300">Blender Bridge</span>
                        {isConnected ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                                Connected
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <AlertCircle size={10} />
                                Disconnected
                            </div>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono break-all flex items-center gap-2">
                        <Link2 size={10} />
                        127.0.0.1:{settings.blenderPort}
                    </div>
                </div>

                {/* Qdrant Status (Visible only if enabled) */}
                {settings.qdrantEnabled && (
                    <div className={`p-4 rounded-xl border transition-colors duration-300 ${
                        qdrantStatus === 'connected' ? 'bg-indigo-500/5 border-indigo-500/20' : 
                        qdrantStatus === 'checking' ? 'bg-yellow-500/5 border-yellow-500/20' :
                        'bg-red-500/5 border-red-500/20'
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-300">Knowledge Base</span>
                            {qdrantStatus === 'connected' ? (
                                <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
                                    Active
                                </div>
                            ) : qdrantStatus === 'checking' ? (
                                <div className="flex items-center gap-1.5 text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"/>
                                    Connecting...
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                    <AlertCircle size={10} />
                                    {qdrantError ? 'Error' : 'Disconnected'}
                                </div>
                            )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono break-all flex items-center gap-2">
                            <Database size={10} />
                            {getSafeHost(settings.qdrantUrl)}
                        </div>
                        {qdrantStatus !== 'connected' && qdrantError && (
                            <p className="text-[9px] mt-2 text-red-300 break-all font-mono tracking-wide">
                                {qdrantError}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* History */}
            <div>
                <div className="flex items-center justify-between mb-4">
                     <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Clock size={12} /> History
                    </h2>
                    <button 
                        onClick={onNewSession}
                        className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded border border-white/10 flex items-center gap-1 transition-colors"
                    >
                        <Plus size={12} /> New
                    </button>
                </div>
               
                <div className="space-y-2">
                    {sessions.length === 0 && (
                        <div className="text-xs text-gray-600 text-center py-4 italic bg-black/20 rounded-lg border border-white/5">
                            No saved sessions.<br/>History is persistent.
                        </div>
                    )}
                    
                    {sessions.sort((a,b) => b.updatedAt - a.updatedAt).map(session => (
                        <button
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            className={`w-full text-left p-2 rounded-lg border transition-all group flex items-center justify-between ${
                                session.id === currentSessionId
                                ? 'bg-blender-blue/10 border-blender-blue/30 text-blender-blue'
                                : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <MessageSquare size={12} className="shrink-0" />
                                <span className="text-xs truncate max-w-[140px]">{session.title}</span>
                            </div>
                            <div 
                                onClick={(e) => onDeleteSession(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                            >
                                <Trash2 size={12} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Tools */}
            <div>
                 <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                     <Wrench size={12} /> Custom Tools
                 </h2>
                 {tools.length > 0 ? (
                     <div className="space-y-2">
                        {tools.map(tool => (
                          <div key={tool.trigger} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded-lg group hover:bg-white/10 transition-colors">
                             <div className="overflow-hidden">
                               <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-mono text-blender-orange bg-orange-500/10 px-1.5 rounded border border-orange-500/20">{tool.trigger}</span>
                                 <span className="text-xs text-gray-200 truncate font-medium">{tool.name}</span>
                               </div>
                               <p className="text-[10px] text-gray-500 truncate mt-0.5 pl-1">{tool.description}</p>
                             </div>
                             {onDeleteTool && (
                               <button 
                                 onClick={() => onDeleteTool(tool.trigger)}
                                 className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1"
                               >
                                 <Trash2 size={12} />
                               </button>
                             )}
                          </div>
                        ))}
                     </div>
                 ) : (
                    <div className="text-[10px] text-gray-600 text-center py-3 border border-dashed border-white/10 rounded-lg">
                        No custom tools yet.<br/>Ask Gemini to "create a tool"
                    </div>
                 )}
            </div>

            {/* Settings */}
            <div>
                <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings2 size={12} /> Configuration
                </h2>
                
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 font-medium">Gemini Model</label>
                        <select 
                            value={settings.model}
                            onChange={(e) => onSettingsChange({...settings, model: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blender-orange/50 appearance-none cursor-pointer hover:bg-black/30 transition-colors"
                        >
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Speed)</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Balanced)</option>
                            <option value="gemini-3-pro-preview">Gemini 3 Pro (Advanced)</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legacy Safe)</option>
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy Safe)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 font-medium">Verbosity</label>
                        <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                            {(['concise', 'normal', 'detailed'] as const).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => onSettingsChange({...settings, verbosity: v})}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded-md capitalize transition-all ${
                                        settings.verbosity === v 
                                        ? 'bg-white/10 text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center justify-between w-full text-[10px] font-bold text-gray-500 uppercase tracking-wider pt-4 hover:text-gray-300 transition-colors"
                    >
                        <span>Advanced</span>
                        <Settings size={12} className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdvanced && (
                        <div className="space-y-6 animate-fade-in pt-2">
                             <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 font-medium">Blender Server Port</label>
                                <input 
                                    type="number" 
                                    value={settings.blenderPort}
                                    onChange={(e) => onSettingsChange({...settings, blenderPort: parseInt(e.target.value) || 8081})}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blender-orange/50 font-mono"
                                />
                            </div>

                            <div className="flex items-center justify-between p-1">
                                <label className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5">
                                    <Wrench size={10} /> Enable Tools
                                </label>
                                <div className="relative inline-block w-8 h-4 transition duration-200 ease-in-out">
                                    <input 
                                        type="checkbox" 
                                        id="tools-toggle" 
                                        checked={settings.toolsEnabled}
                                        onChange={(e) => onSettingsChange({...settings, toolsEnabled: e.target.checked})}
                                        className="peer absolute opacity-0 w-0 h-0"
                                    />
                                    <label 
                                        htmlFor="tools-toggle" 
                                        className={`block overflow-hidden h-4 rounded-full cursor-pointer border border-white/10 ${settings.toolsEnabled ? 'bg-blender-orange' : 'bg-black/40'}`}
                                    ></label>
                                    <div className={`absolute left-0 top-0 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${settings.toolsEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </div>

                            {(settings.model.includes('thinking') || settings.model.includes('gemini-3')) && (
                                <div className="space-y-2 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] text-indigo-300 font-bold uppercase flex items-center gap-1">
                                            <Cpu size={10} /> Thinking Budget
                                        </label>
                                        <span className="text-[10px] text-indigo-400 font-mono">{settings.thinkingBudget}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="32768" 
                                        step="1024" 
                                        value={settings.thinkingBudget}
                                        onChange={(e) => onSettingsChange({...settings, thinkingBudget: parseInt(e.target.value)})}
                                        className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            )}

                            {/* Qdrant / RAG Settings */}
                            <div className="space-y-3 pt-2 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1.5">
                                        <Database size={10} /> Knowledge Base (Qdrant)
                                    </label>
                                    <div className="relative inline-block w-8 h-4 transition duration-200 ease-in-out">
                                        <input 
                                            type="checkbox" 
                                            id="qdrant-toggle" 
                                            checked={settings.qdrantEnabled}
                                            onChange={(e) => onSettingsChange({...settings, qdrantEnabled: e.target.checked})}
                                            className="peer absolute opacity-0 w-0 h-0"
                                        />
                                        <label 
                                            htmlFor="qdrant-toggle" 
                                            className={`block overflow-hidden h-4 rounded-full cursor-pointer border border-white/10 ${settings.qdrantEnabled ? 'bg-blender-orange' : 'bg-black/40'}`}
                                        ></label>
                                        <div className={`absolute left-0 top-0 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${settings.qdrantEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>

                                {settings.qdrantEnabled && (
                                    <div className="space-y-2 animate-fade-in">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-500 uppercase">Server URL</label>
                                            <input 
                                                type="text" 
                                                value={settings.qdrantUrl}
                                                onChange={(e) => onSettingsChange({...settings, qdrantUrl: e.target.value})}
                                                placeholder="http://localhost:6333"
                                                className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-1.5 text-xs text-gray-300 font-mono focus:border-blender-orange/50"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-500 uppercase">API Key (Optional)</label>
                                            <input 
                                                type="password" 
                                                value={settings.qdrantApiKey}
                                                onChange={(e) => onSettingsChange({...settings, qdrantApiKey: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-1.5 text-xs text-gray-300 font-mono focus:border-blender-orange/50"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-500 uppercase">Collection</label>
                                            <input 
                                                type="text" 
                                                value={settings.qdrantCollection}
                                                onChange={(e) => onSettingsChange({...settings, qdrantCollection: e.target.value})}
                                                placeholder="blender_api"
                                                className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-1.5 text-xs text-gray-300 font-mono focus:border-blender-orange/50"
                                            />
                                        </div>
                                        <p className="text-[9px] text-gray-600 italic">
                                            Note: Database must be populated externally. Agent can search but not ingest documents yet.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Persistent Memory View */}
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <label className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1.5">
                                    <HardDrive size={10} /> Persistent Memory
                                </label>
                                <div className="w-full bg-black/20 border border-white/10 rounded-lg p-0 overflow-hidden">
                                    <textarea
                                        value={memoryContentLocal || ""}
                                        onChange={(e) => setMemoryContentLocal(e.target.value)} 
                                        onBlur={(e) => onMemoryChange?.(e.target.value)}
                                        placeholder="// Memory is empty"
                                        className="w-full h-24 bg-transparent p-2 text-[10px] text-gray-400 font-mono resize-none focus:outline-none focus:bg-black/30 transition-colors"
                                        spellCheck={false}
                                    />
                                </div>
                                <p className="text-[9px] text-gray-600 italic">
                                    Gemini can auto-save tips here. Edit to refine. Stored in User Presets.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20">
             <div className="text-[10px] text-gray-600 text-center">
                v2.1 • Data: User Resources/presets
             </div>
        </div>
      </aside>
    </>
  );
};
