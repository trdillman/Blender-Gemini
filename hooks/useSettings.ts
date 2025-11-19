
import { useState, useEffect } from 'react';
import { Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  model: 'gemini-2.5-flash',
  blenderPort: 8081,
  thinkingBudget: 0,
  verbosity: 'normal',
  blenderToken: '',
  toolsEnabled: true,
  
  // Qdrant Defaults
  qdrantEnabled: false,
  qdrantUrl: 'http://localhost:6333',
  qdrantApiKey: '',
  qdrantCollection: 'blender_api',
};

const VALID_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-pro-preview',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp'
];

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Load settings
  useEffect(() => {
    const saved = localStorage.getItem('blender_gemini_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate Model
        if (parsed.model && !VALID_MODELS.includes(parsed.model)) {
            console.warn(`Invalid model '${parsed.model}' found in storage. Resetting to default.`);
            parsed.model = DEFAULT_SETTINGS.model;
        }
        // Merge with defaults
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('blender_gemini_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    
    const updates: Partial<Settings> = {};
    
    const token = params.get('token');
    if (token) updates.blenderToken = token;

    const urlModel = params.get('model');
    if (urlModel && VALID_MODELS.includes(urlModel)) {
        updates.model = urlModel;
    }

    const toolsEnabledParam = params.get('toolsEnabled');
    if (toolsEnabledParam !== null) {
        updates.toolsEnabled = toolsEnabledParam === 'true';
    }

    if (Object.keys(updates).length > 0) {
        setSettings(prev => ({ ...prev, ...updates }));
    }
  }, [setSettings]);

  return [settings, setSettings] as const;
};
