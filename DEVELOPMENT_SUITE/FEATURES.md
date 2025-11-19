# 🏗️ Feature Deep Dive

## 1. The Agent Loop (`useGeminiAgent.ts`)
The core of this application is **recursive**, not linear.

### State Machine
1.  **Idle**: Waiting for user input.
2.  **Thinking (Generating)**: Streaming tokens from Gemini.
3.  **Tool Call Detected**:
    *   Stream pauses.
    *   `handleToolCall` is triggered.
    *   Request sent to Blender Bridge (`fetch`).
4.  **Tool Output**:
    *   Result (JSON/Text) is captured.
    *   Output is appended to conversation history as `functionResponse`.
5.  **Recursion**: The Agent calls `runAgentLoop` again with the new history (User Request + Model Tool Call + Tool Response).
6.  **Termination**: Loop ends when the model produces text *without* tool calls, or `maxTurns` (20) is reached.

## 2. The Blender Bridge (`gemini_bridge.py.txt`)
Blender's Python API is single-threaded and blocking. We use a hacked HTTP server to bypass this.

### Architecture
*   **`socketserver.ThreadingTCPServer`**: Runs on a background thread (Daemon).
*   **`EXECUTION_QUEUE`**: Requests (like `execute_python`) are NOT run immediately. They are pushed to a `queue.Queue`.
*   **`bpy.app.timers`**: A timer runs on the **Main Blender Thread** every 0.05s. It pops tasks off the queue and executes them.
    *   *Why?* Accessing `bpy.context` from a background thread causes Segmentation Faults.

### Inspection System
*   **`GraphSerializer`**: Custom class that walks `node_tree.nodes` and `node_tree.links`.
*   **Serialization Rules**:
    *   Converts `Vector`, `Color`, `Euler` to tuples/lists.
    *   Ignores unlinked sockets without default values to save token space.

## 3. RAG Integration (`rag.ts`)
*   **Vector DB**: Qdrant (optional).
*   **Embedding Model**: `text-embedding-004`.
*   **Process**:
    1.  User query is embedded.
    2.  Cosine similarity search against Qdrant.
    3.  Top 3 chunks are injected into the `systemInstruction` or user prompt before sending to Gemini.

## 4. Safety Rails
*   **`isGenerating` Lock**: Prevents double-submission while the Agent is looping.
*   **`AbortController`**: The Stop button kills the HTTP request to Gemini and breaks the recursion loop immediately.
*   **Error Healing**: If Blender returns a Python `Traceback`, the Agent sees it as a tool output and automatically prompts itself to fix the code.