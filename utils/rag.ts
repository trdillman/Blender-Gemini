import { GoogleGenAI } from "@google/genai";
import { Settings } from '../types';

const EMBEDDING_MODEL = 'text-embedding-004';
const DEFAULT_VECTOR_SIZE = 768; // Dimension for text-embedding-004

// --- Helpers ---

const getHeaders = (settings: Settings): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (settings.qdrantApiKey) {
    headers['api-key'] = settings.qdrantApiKey;
  }
  return headers;
};

const getBaseUrl = (settings: Settings): string => {
  return settings.qdrantUrl?.replace(/\/$/, '') || 'http://localhost:6333';
};

const generateEmbedding = async (ai: GoogleGenAI, text: string): Promise<number[] | null> => {
  try {
    const res = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: [{ parts: [{ text }] }]
    });
    return res.embeddings?.[0]?.values || null;
  } catch (e) {
    console.error("Embedding generation failed:", e);
    return null;
  }
};

// --- Management API ---

export const listCollections = async (settings: Settings) => {
  const res = await fetch(`${getBaseUrl(settings)}/collections`, {
    headers: getHeaders(settings)
  });
  if (!res.ok) throw new Error(`List collections failed: ${res.statusText}`);
  return res.json();
};

export const createCollection = async (settings: Settings, name: string, vectorSize: number = DEFAULT_VECTOR_SIZE) => {
  const res = await fetch(`${getBaseUrl(settings)}/collections/${name}`, {
    method: 'PUT',
    headers: getHeaders(settings),
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: "Cosine"
      }
    })
  });
  if (!res.ok) throw new Error(`Create collection failed: ${res.statusText}`);
  return res.json();
};

export const deleteCollection = async (settings: Settings, name: string) => {
  const res = await fetch(`${getBaseUrl(settings)}/collections/${name}`, {
    method: 'DELETE',
    headers: getHeaders(settings)
  });
  if (!res.ok) throw new Error(`Delete collection failed: ${res.statusText}`);
  return res.json();
};

export const getCollectionInfo = async (settings: Settings, name: string) => {
  const res = await fetch(`${getBaseUrl(settings)}/collections/${name}`, {
    headers: getHeaders(settings)
  });
  if (!res.ok) throw new Error(`Get collection info failed: ${res.statusText}`);
  return res.json();
};

// --- Data API ---

export const addDocuments = async (
  settings: Settings,
  apiKey: string,
  collectionName: string,
  documents: { content: string, metadata?: any }[]
) => {
  const ai = new GoogleGenAI({ apiKey });
  
  // Generate embeddings for all docs (sequentially for now to avoid rate limits, could be batched)
  const points = [];
  for (const doc of documents) {
    const vector = await generateEmbedding(ai, doc.content);
    if (vector) {
      points.push({
        id: crypto.randomUUID(),
        vector: vector,
        payload: {
          text: doc.content,
          ...doc.metadata,
          timestamp: Date.now()
        }
      });
    }
  }

  if (points.length === 0) return { status: 'failed', message: 'No embeddings generated' };

  // Upsert to Qdrant
  const res = await fetch(`${getBaseUrl(settings)}/collections/${collectionName}/points?wait=true`, {
    method: 'PUT',
    headers: getHeaders(settings),
    body: JSON.stringify({ points })
  });

  if (!res.ok) throw new Error(`Add documents failed: ${res.statusText}`);
  return res.json();
};

/**
 * Performs a semantic search against a Qdrant server using Gemini embeddings.
 */
export const performSemanticSearch = async (
  settings: Settings,
  query: string,
  apiKey: string,
  collectionOverride?: string
): Promise<string> => {
  if (!settings.qdrantEnabled || !settings.qdrantUrl) return '';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const vector = await generateEmbedding(ai, query);

    if (!vector) {
      console.warn("Failed to generate embedding for RAG");
      return '';
    }

    const collection = collectionOverride || settings.qdrantCollection;
    const searchUrl = `${getBaseUrl(settings)}/collections/${collection}/points/search`;
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: getHeaders(settings),
      body: JSON.stringify({
        vector: vector,
        limit: 5,
        with_payload: true
      })
    });

    if (!response.ok) {
      console.warn(`Qdrant search failed: ${response.status} ${response.statusText}`);
      return `Error searching Qdrant: ${response.statusText}`;
    }

    const data = await response.json();
    const results = data.result || [];

    if (results.length === 0) return 'No matching documents found.';

    // Format Context
    const contextParts = results.map((r: any) => {
      const p = r.payload || {};
      const content = p.text || p.content || p.code || JSON.stringify(p);
      const source = p.source || 'Knowledge Base';
      const score = r.score ? `(Confidence: ${r.score.toFixed(2)})` : '';
      return `[${source} ${score}]
${content}`;
    });

    return `\n\n--- RELEVANT KNOWLEDGE (${collection}) ---\n${contextParts.join('\n\n')}\n----------------------------------------\n`;

  } catch (e: any) {
    console.error("RAG Error:", e);
    return `RAG Error: ${e.message}`;
  }
};