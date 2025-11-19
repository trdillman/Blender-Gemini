
# Welcome to Blender Gemini Assistant 🎨🤖

**Blender Gemini Assistant** is an expert AI companion designed for **Blender 4.5+**. It bridges the power of Google's Gemini models directly into your 3D viewport, enabling you to generate Python scripts, automate complex tasks, and build procedural Geometry Nodes systems using natural language.

## 🌟 Core Capabilities

### 1. Geometry Nodes & Scripting
Instead of manually connecting nodes, simply describe what you want. The assistant generates complete, executable `bpy` Python scripts that:
- Create Node Groups.
- Add and link nodes with correct parameters.
- Handle math and logic for procedural setups.

### 2. Live Execution & Validation
This dashboard connects to a running Blender instance (default port `8081`).
- **Run Code**: Generated snippets can be executed immediately in Blender.
- **Auto-Execution**: The system attempts to validate logic before running.
- **Error Healing**: If a script fails, the assistant analyzes the Blender traceback (stderr) and offers an **Auto-Fix** button to correct the code.

## 🛠️ Features

- **Multimodal Input**: Drag & drop images of reference art or node graphs to guide the AI.
- **Model Selection**:
    - **Gemini 2.5 Flash**: The default. Fast and efficient for routine tasks.
    - **Gemini 2.5 Flash-Lite**: Extremely fast, lower cost (good for simple scripts).
    - **Gemini 3 Pro**: Equipped with **Thinking Mode** for complex reasoning and 3D math problems.
- **Tools**:
    - **Google Search**: For looking up documentation or textures.
    - **Auto Speech**: Text-to-Speech playback of responses.

## 🚀 Getting Started

1.  **Install Addon**: Ensure the `Gemini Bridge` addon is installed in Blender.
2.  **Start Server**: In Blender's sidebar, start the server (Default: `http://127.0.0.1:8081`).
3.  **Connect**: This dashboard will automatically connect.
4.  **Configure**:
    - Enter your **API Key** in *Advanced Settings*.
    - Select your preferred **Model**.
    - Adjust **Verbosity** (Concise vs Detailed).

## 💡 Example Prompts

> "Create a procedural donut using geometry nodes with random sprinkles."

> "Arrange the selected objects in a golden spiral."

> "Write a script to bake the ambient occlusion for all visible meshes."

---

*Happy Blending!* 🧊
