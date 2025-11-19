
import { useState, useEffect, useCallback } from 'react';
import { ChatSession, CustomTool, ExecutionResult, GraphData, ScreenshotResult } from '../types';

export const useBlender = (port: number, token: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const baseUrl = `http://127.0.0.1:${port}`;
  const authHeaders = token ? { 'X-Blender-Token': token } : {};

  useEffect(() => {
    const checkConnection = async () => {
      if (!token) {
        setIsConnected(false);
        return;
      }
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(`${baseUrl}/`, { 
            method: 'GET',
            signal: controller.signal,
            headers: authHeaders
        }).catch(() => null); 
        clearTimeout(id);
        setIsConnected(!!res && res.ok);
      } catch (e) {
        setIsConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [port, baseUrl, token]);

  const postJson = async (endpoint: string, body: any) => {
    if (!token) {
      throw new Error('Missing Blender token');
    }
    const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body)
    });
    return res.json();
  };

  const executeCode = useCallback(async (code: string): Promise<ExecutionResult> => {
    if (!token) {
      return {
        success: false,
        stdout: '',
        stderr: 'Missing Blender token. Launch the assistant from Blender to obtain one.'
      };
    }
    try {
      const result = await postJson('/execute', { code });
      return {
        success: result.success,
        stdout: result.stdout || '',
        stderr: result.stderr || result.error || ''
      };
    } catch (e: any) {
      return {
        success: false,
        stdout: '',
        stderr: `Network Error: Could not connect to Blender on port ${port}.`
      };
    }
  }, [baseUrl, port, token]);

  const fetchHistory = useCallback(async (): Promise<ChatSession[]> => {
    if (!isConnected) return [];
    try {
        const res = await fetch(`${baseUrl}/history`, {
            headers: authHeaders
        });
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    } catch (e) { console.warn("Fetch history failed"); }
    return [];
  }, [baseUrl, isConnected, token]);

  const saveHistory = useCallback(async (sessions: ChatSession[]): Promise<boolean> => {
    if (!isConnected) return false;
    try {
        await postJson('/history', sessions);
        return true;
    } catch (e) { return false; }
  }, [baseUrl, isConnected, token]);

  const fetchMemory = useCallback(async (): Promise<string> => {
    if (!isConnected) return "";
    try {
        const res = await fetch(`${baseUrl}/memory`, {
            headers: authHeaders
        });
        if (res.ok) return await res.text();
    } catch (e) { }
    return "";
  }, [baseUrl, isConnected, token]);

  const appendMemory = useCallback(async (text: string): Promise<boolean> => {
    if (!isConnected) return false;
    try {
        await fetch(`${baseUrl}/memory`, { method: 'POST', headers: authHeaders, body: text });
        return true;
    } catch (e) { return false; }
  }, [baseUrl, isConnected, token]);

  const overwriteMemory = useCallback(async (text: string): Promise<boolean> => {
    if (!isConnected) return false;
    try {
        await fetch(`${baseUrl}/memory`, { method: 'PUT', headers: authHeaders, body: text });
        return true;
    } catch (e) { return false; }
  }, [baseUrl, isConnected, token]);

  const fetchTools = useCallback(async (): Promise<CustomTool[]> => {
    if (!isConnected) return [];
    try {
        const res = await fetch(`${baseUrl}/tools`, {
            headers: authHeaders
        });
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    } catch (e) { }
    return [];
  }, [baseUrl, isConnected, token]);

  const saveTool = useCallback(async (tool: CustomTool): Promise<boolean> => {
    if (!isConnected) return false;
    try {
        await postJson('/tools', tool);
        return true;
    } catch (e) { return false; }
  }, [baseUrl, isConnected, token]);

  const deleteTool = useCallback(async (trigger: string): Promise<boolean> => {
    if (!isConnected) return false;
    try {
        await fetch(`${baseUrl}/tools`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ trigger })
        });
        return true;
    } catch (e) { return false; }
  }, [baseUrl, isConnected, token]);

  const inspectGraph = useCallback(async (): Promise<GraphData> => {
    if (!isConnected) return { nodes:[], links:[], error: "Not connected" };
    try {
        const res = await fetch(`${baseUrl}/inspect`, {
            headers: authHeaders
        });
        if (res.ok) return await res.json();
    } catch (e) { }
    return { nodes:[], links:[], error: "Failed to inspect" };
  }, [baseUrl, isConnected, token]);

  const getScreenshot = useCallback(async (): Promise<ScreenshotResult> => {
    if (!isConnected) return { success: false };
    try {
        const res = await fetch(`${baseUrl}/screenshot`, {
            headers: authHeaders
        });
        if (res.ok) return await res.json();
    } catch (e) { }
    return { success: false };
  }, [baseUrl, isConnected]);

  return { 
    isConnected, executeCode, fetchHistory, saveHistory, 
    fetchMemory, appendMemory, overwriteMemory, fetchTools, saveTool, deleteTool, 
    inspectGraph, getScreenshot 
  };
};
