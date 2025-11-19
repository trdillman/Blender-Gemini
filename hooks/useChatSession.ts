
import { useState, useEffect, useCallback } from 'react';
import { ChatSession, Message } from '../types';

export const useChatSession = (
  saveHistoryToBackend: (sessions: ChatSession[]) => Promise<boolean>,
  fetchHistoryFromBackend: () => Promise<ChatSession[]>
) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => Date.now().toString());

  // Initialize history
  useEffect(() => {
    let isMounted = true;
    fetchHistoryFromBackend().then(loadedSessions => {
        if (!isMounted) return;
        if (loadedSessions && loadedSessions.length > 0) {
            const sortedSessions = [...loadedSessions].sort((a, b) => b.updatedAt - a.updatedAt);
            setSessions(sortedSessions);
            setCurrentSessionId(sortedSessions[0].id);
        }
    });
    return () => {
        isMounted = false;
    };
  }, [fetchHistoryFromBackend]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || {
    id: currentSessionId,
    title: 'New Chat',
    messages: [],
    updatedAt: Date.now()
  };

  const updateSessionsState = useCallback((newSessions: ChatSession[]) => {
    setSessions(newSessions);
    saveHistoryToBackend(newSessions);
  }, [saveHistoryToBackend]);

  const addMessageToSession = useCallback((sessionId: string, message: Message) => {
    setSessions(prev => {
        const sessionIndex = prev.findIndex(s => s.id === sessionId);
        let newSessions = [...prev];

        if (sessionIndex >= 0) {
            const session = newSessions[sessionIndex];
            const updatedSession = {
                ...session,
                messages: [...session.messages, message],
                updatedAt: Date.now(),
                title: session.messages.length === 0 ? message.text.slice(0, 30) + '...' : session.title
            };
            newSessions[sessionIndex] = updatedSession;
        } else {
            // New session case
            newSessions.push({
                id: sessionId,
                title: message.text.slice(0, 30) + '...',
                messages: [message],
                updatedAt: Date.now()
            });
        }
        
        saveHistoryToBackend(newSessions);
        return newSessions;
    });
  }, [saveHistoryToBackend]);

  const updateLastMessage = useCallback((sessionId: string, messageUpdate: Partial<Message>) => {
    setSessions(prev => {
        const sessionIndex = prev.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) return prev;

        const newSessions = [...prev];
        const session = newSessions[sessionIndex];
        const lastMsgIndex = session.messages.length - 1;
        
        if (lastMsgIndex >= 0) {
            const updatedMsgs = [...session.messages];
            updatedMsgs[lastMsgIndex] = { ...updatedMsgs[lastMsgIndex], ...messageUpdate };
            
            newSessions[sessionIndex] = {
                ...session,
                messages: updatedMsgs,
                updatedAt: Date.now()
            };
            
            // We debounced save in a real app, but here we just save
            saveHistoryToBackend(newSessions);
        }
        return newSessions;
    });
  }, [saveHistoryToBackend]);

  const handleNewSession = useCallback(() => {
    const newId = Date.now().toString();
    setCurrentSessionId(newId);
    setSessions(prev => [...prev, {
        id: newId,
        title: 'New Chat',
        messages: [],
        updatedAt: Date.now()
    }]);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    saveHistoryToBackend(newSessions);
    
    if (currentSessionId === id) {
        if (newSessions.length > 0) {
            setCurrentSessionId(newSessions[0].id);
        } else {
            handleNewSession();
        }
    }
  }, [sessions, currentSessionId, saveHistoryToBackend, handleNewSession]);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    currentSession,
    addMessageToSession,
    updateLastMessage,
    handleNewSession,
    handleDeleteSession
  };
};
