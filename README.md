# Blender Gemini Assistant 🎨🤖

**v2.1 | Blender 4.5+**

This is an AI-powered assistant that lives inside your browser but controls Blender directly. It uses Google's Gemini 2.5/3.0 models to generate geometry nodes, write Python scripts, and automate 3D tasks with a strict **"Verify & Fix"** agent loop.

*Use `gemini_bridge.py` as the canonical Blender addon.*

---

## 🚀 Quick Start for Blender Users

### 1. Prerequisites
*   **Blender 4.5** or higher.
*   A **Google Gemini API Key** (Get one at [aistudio.google.com](https://aistudio.google.com)).

### 2. Install the Bridge Addon
The bridge is a single Python script that allows the Web App to talk to Blender.

1.  Locate the file `gemini_bridge.py` in this repository.
2.  Open Blender.
3.  Go to **Edit > Preferences > Add-ons**.
4.  Click **Install...** and select `gemini_bridge.py`.
5.  Enable the addon.
6.  In the 3D Viewport Sidebar (press `N`), go to the **Gemini** tab.
7.  Enter your API Key (optional, can also use env var).
8.  Click **Start Server**.

### 3. Launch the Web App
1.  Open a terminal in this directory.
2.  Run `npm install`.
3.  Run `npm run dev`.
4.  Click **Launch Interface** in Blender (N-Panel).

### 4. Configuration
*   **API Key**: Set via `.env.local` (`GEMINI_API_KEY=...`) or in Blender preferences.
*   **Model**: Select **Gemini 3 Pro** for complex reasoning, or **Gemini 2.5 Flash** for speed.

---

## 🎮 How to Use

### The Agent Loop
1.  **Request**: "Make a grid of cubes."
2.  **Plan**: The AI defines criteria.
3.  **Act**: It writes code to Blender.
4.  **Verify**: It inspects the scene.
5.  **Fix**: It auto-corrects errors.

### Tools
*   **`execute_code`**: The agent's hands. Runs Python.
*   **`inspect_graph`**: The agent's eyes. Reads node trees.
*   **`search_knowledge_base`**: Queries documentation.
*   **`create_tool`**: Creates reusable shortcuts.

---

## ⚠️ Troubleshooting

*   **"Network Error"**: Ensure "Start Server" is clicked in Blender.
*   **"Failed to capture screenshot"**: Ensure Blender window is visible (not minimized).