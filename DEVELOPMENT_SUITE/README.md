# 🛠️ Blender Gemini Development Suite

Welcome to the **Development Suite**. This directory serves as the "Command Center" for maintaining, testing, and extending the Blender Gemini Assistant.

## 📂 Contents

*   **`FEATURES.md`**: Deep technical breakdown of the Agent Loop, Bridge Architecture, and RAG integration.
*   **`MANIFEST.md`**: Inventory of all files in this suite.
*   **`blender_test_runner.py.txt`**: A Python script to run inside Blender to verify the Bridge logic.
*   **`run_webapp_sanity.sh.txt`**: A shell script to verify the frontend build stability.
*   **`llm_developer_cheatsheet.sh.txt`**: Useful commands for LLMs and human devs to navigate the codebase.
*   **`SKILLS_LIBRARY.md`**: A guide on "Prompt Engineering" for the Agent and System Prompt tuning.
*   **`JOKES.txt`**: Because 3D math is hard and we need to laugh.

## 🚀 Quick Start for Developers

1.  **Frontend Check**: Run `bash DEVELOPMENT_SUITE/run_webapp_sanity.sh.txt` to ensure TypeScript compiles correctly (or rename to .sh).
2.  **Backend Check**: Open Blender, paste the content of `blender_test_runner.py.txt` into the Script Editor, and run it. It will validate the serialization and execution logic.

---
*Built with 🧡 by the Gemini Team.*