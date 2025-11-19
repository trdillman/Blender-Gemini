import React, { useState } from 'react';
import { Play, Check, AlertTriangle, Terminal, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language: string;
  onExecute: (code: string) => Promise<{ success: boolean; stdout: string; stderr: string }>;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, onExecute }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [output, setOutput] = useState<{ stdout: string; stderr: string } | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStatus('idle');
    setOutput(null);

    try {
      const result = await onExecute(code);
      setStatus(result.success ? 'success' : 'error');
      setOutput({ stdout: result.stdout, stderr: result.stderr });
      setShowConsole(true);
    } catch (e) {
      setStatus('error');
      setOutput({ stdout: '', stderr: 'Failed to execute command.' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#18181b] shadow-xl group">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#202025] border-b border-white/5">
        <div className="flex items-center gap-3">
           <div className="flex gap-1.5">
             <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
             <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
             <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
           </div>
           <span className="text-gray-500 font-mono text-[10px] uppercase tracking-wider ml-2">{language}</span>
        </div>
        
        <div className="flex items-center gap-2">
           {language === 'python' && (
             <button
                onClick={handleRun}
                disabled={isRunning}
                className={`
                  flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all
                  ${status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                    status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                    'bg-blender-orange text-white hover:bg-white hover:text-blender-orange shadow-lg shadow-orange-900/20'}
                `}
             >
                {isRunning ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></span>
                    Running
                  </span>
                ) : status === 'success' ? (
                  <span className="flex items-center gap-1"><Check size={12} /> Done</span>
                ) : status === 'error' ? (
                   <span className="flex items-center gap-1"><AlertTriangle size={12} /> Failed</span>
                ) : (
                   <span className="flex items-center gap-1"><Play size={10} fill="currentColor" /> Run Code</span>
                )}
             </button>
           )}
           
           <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

           <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors" title="Copy Code">
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
           </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto bg-[#18181b] custom-scrollbar">
        <pre className="text-xs font-mono leading-relaxed text-gray-300 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>

      {/* Output Console */}
      {output && (
        <div className="border-t border-white/10 bg-[#121215]">
          <button 
            onClick={() => setShowConsole(!showConsole)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 transition-colors"
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${status === 'error' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
               {status === 'error' ? 'Execution Failed' : 'Execution Output'}
            </span>
            <div className="flex items-center gap-2 text-gray-500">
                <span className="text-[10px]">{showConsole ? 'Hide' : 'Show'} Console</span>
                <Terminal size={12} />
            </div>
          </button>
          
          {showConsole && (
            <div className="p-4 pt-0 text-xs font-mono animate-fade-in border-t border-white/5">
              {output.stdout && (
                <div className="mb-3 mt-3">
                  <div className="text-gray-500 mb-1 text-[10px] uppercase font-bold">Standard Output</div>
                  <pre className="text-gray-300 whitespace-pre-wrap p-3 bg-black/30 rounded-lg border border-white/5">
                    {output.stdout}
                  </pre>
                </div>
              )}
              {output.stderr && (
                <div className="mb-3 mt-3">
                  <div className="text-red-400 mb-1 text-[10px] uppercase font-bold">Traceback / Error</div>
                  <pre className="text-red-300 whitespace-pre-wrap p-3 bg-red-900/10 rounded-lg border border-red-500/20">
                    {output.stderr}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};