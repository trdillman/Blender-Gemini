
# Developer Documentation 🛠️

**Target Audience:** Human Developers & LLM CLI Workflows.

This project is a **Hybrid Architecture**:
1.  **Frontend**: React (Vite, Tailwind, Lucide) acting as the Brain/UI.
2.  **Backend**: Blender Python API (running as a local HTTP server) acting as the Body/Execution Engine.

---

## 📂 Project Structure (Flat)

We utilize a flat directory structure (conceptually `src/` is root) to make file piping to LLMs easier.

```text
/
├── index.html          # Entry point
├── index.tsx           # React Root
├── App.tsx             # Main State Container
├── gemini_bridge.py.txt # THE BLENDER ADDON (Python source)
├── components/         # UI Components (Chat, Sidebar, etc.)
├── hooks/              # Custom Logic Hooks
│   ├── useBlender.ts       # Comms with Python (Fetch/Post)
│   ├── useGeminiAgent.ts   # The Recursive Agent Loop logic
│   └── ...
├── utils/              # Helpers
│   ├── tools.ts            # Gemini Function Declarations
│   └── prompts.ts          # System Prompts & Context Injection
└── types.ts            # Shared Interfaces
```

---

## 🧠 Architecture: The Agent Loop

The core logic resides in `hooks/useGeminiAgent.ts`. It is **not** a linear Chatbot.

1.  **State `isGenerating`**: Locks UI, initializes `AbortController`.
2.  **RAG (Optional)**: Fetches context from Qdrant if enabled.
3.  **Stream**: Opens `ai.models.generateContentStream`.
4.  **Tool Detection**: If `functionCalls` are present in the chunk:
    *   Pause stream.
    *   Execute function via `useBlender` (calls local Blender server).
    *   **Capture Output**: JSON results, Stdout, Stderr.
    *   **Recursion**: Feed the tool output *back* into the model as a `functionResponse` and call `generateContentStream` again.
5.  **Termination**: Loop ends when the model produces text without function calls, or hits `maxTurns`.

---

## 🐍 The Blender Bridge (`gemini_bridge.py.txt`)

*   **Why .txt?**: To ensure easy copying into Blender's internal Text Editor and safe handling by web-based file bundlers.
*   **Threading**: Uses `socketserver.ThreadingTCPServer`. Blender is single-threaded for API calls. We use `queue.Queue` and `bpy.app.timers.register` to offload HTTP requests onto the main Blender thread to avoid segmentation faults.
*   **Persistence**: Data (History, Tools, Memory) is stored in `bpy.utils.user_resource('SCRIPTS', path='presets')/gemini_assistant_data`. This ensures reliability across sessions and avoids permission issues with the Addon folder or temporary files.
*   **Endpoints**:
    *   `POST /execute`: `exec(code)` with `stdout` capture.
    *   `GET /inspect`: Serializes the active Geometry Node tree into JSON.
    *   `GET /screenshot`: Renders viewport to temp file -> Base64.

---

## 🤖 LLM CLI Workflow (For AIDevs)

If you are an LLM (or using one via CLI) maintaining this repo:

**1. Context Window Strategy**
Do not read all files. This is a heavy logic app.
*   *UI Work*: Read `App.tsx`, `components/Sidebar.tsx`, `index.html`.
*   *Agent Logic*: Read `hooks/useGeminiAgent.ts`, `utils/prompts.ts`, `types.ts`.
*   *Blender Logic*: Read `gemini_bridge.py.txt`.

**2. Modifying the Bridge**
*   **CRITICAL**: If you change `gemini_bridge.py.txt`, you must explicitly instruct the user to "Reload the script in Blender" or "Restart the Server". The Web App cannot hot-reload the Python side.
*   **Serialization**: When adding new inspection capabilities, update `GraphSerializer` in the Python file AND `GraphData` interface in `types.ts`.

**3. Adding Tools**
1.  Define the `FunctionDeclaration` in `utils/tools.ts`.
2.  Add the handler logic in `hooks/useGeminiAgent.ts` (`handleToolCall`).
3.  If it requires Blender access, add a fetch wrapper in `hooks/useBlender.ts`.
4.  Add the endpoint in `gemini_bridge.py.txt`.

---

## 💻 Local Setup

1.  `npm install`
2.  `npm run dev`
3.  Start Blender Bridge (see README).
4.  Set `API_KEY` in environment.

---

## 🧪 Verification

When refactoring:
1.  **Type Check**: Ensure `types.ts` matches both frontend JSON parsing and Python JSON output.
2.  **Loop Safety**: Check `useGeminiAgent.ts` for the `retryCount` guard to prevent infinite billing loops.
3.  **Bridge Logic**: Open Blender, paste the content of `DEVELOPMENT_SUITE/blender_test_runner.py.txt` to verify serialization logic.
