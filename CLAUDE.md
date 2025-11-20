# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Project Overview

Blender Gemini Assistant Pro is a hybrid AI Assistant combining a React web frontend with a Blender Python backend. It creates an intelligent 3D modeling assistant powered by Google's Gemini AI models, featuring a unique "Verify & Fix" agent loop for autonomous 3D task execution.

## 🏗️ Architecture Overview

### Hybrid Communication Pattern
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS (port 3000)
- **Backend**: Python HTTP server inside Blender 4.5+ (port 8081)
- **Security**: Token-based authentication with CORS handling
- **Persistence**: Data stored in `~/Documents/Presets/gemini_assistant_data/`

### Core Agent Loop
The heart of the system implements a recursive AI workflow:
```
Request → Plan → Execute → Verify → Fix → Repeat
```

## 🛠️ Development Commands

### Frontend Development
```bash
npm install          # Install Node.js dependencies
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend (Blender) Setup
1. Copy `gemini_bridge.py` content to Blender Scripting tab
2. Run script in Blender to register addon
3. Enable addon in Edit > Preferences > Add-ons
4. Start server from Gemini sidebar tab in 3D Viewport (N-panel)

### Testing
```bash
# Development suite available in DEVELOPMENT_SUITE/
python blender_test_runner.py        # Comprehensive Blender testing
python bridge_smoke_test.py           # Quick connectivity test
```

## 🔧 Key Technical Files

### Critical Architecture Files
1. **`gemini_bridge.py`** - THE Blender addon (most critical file)
   - HTTP server with threading support
   - Blender API integration
   - Data persistence system
   - MUST be reloaded in Blender after any changes

2. **`hooks/useGeminiAgent.ts`** - Core AI agent logic
   - Handles streaming responses
   - Manages recursive tool execution
   - Implements error recovery and retry logic

3. **`utils/tools.ts`** - AI tool definitions
   - Function declarations for Gemini
   - MUST match Python implementations exactly

4. **`types.ts`** - TypeScript interfaces
   - MUST match Python JSON responses exactly
   - Critical for type safety across the bridge

5. **`vite.config.ts`** - Build configuration
   - Proxy configuration for Blender server communication
   - Environment variable handling

### Configuration
- **API Key**: Set `GEMINI_API_KEY` in `.env.local` or Blender preferences
- **Models**: Gemini 2.5 Flash (fast) or Gemini 3 Pro (reasoning)
- **Port**: Frontend 3000, Backend 8081

## 🎮 AI Integration Patterns

### Multi-Provider Support
- **Gemini**: Native support with function calling
- **OpenAI/Anthropic**: Via API proxy
- **Thinking Models**: Special handling for reasoning-only mode

### Available Tools to AI
- `execute_code` - Run Python scripts in Blender
- `inspect_graph` - Read Geometry Nodes structure
- `get_screenshot` - Capture viewport image
- `remember` - Store persistent memories
- `search_knowledge_base` - Query RAG system
- Custom tools management

### Session Management
- Persistent chat history with automatic saving
- Memory context across sessions
- Multiple sessions support
- Custom tools persistence

## ⚡ Development Workflow Best Practices

### File Organization Strategy
- **UI Work**: Focus on `components/`, `contexts/`, `hooks/`
- **Agent Logic**: Work in `utils/` (tools.ts, prompts.ts, providers.ts)
- **Bridge Changes**: Always inform user to reload Blender script

### Critical Rules
1. **Type Safety**: Update `types.ts` when changing API responses
2. **Tool Addition**: Update both `utils/tools.ts` and bridge handlers
3. **Context Sync**: Ensure TypeScript interfaces match Python structures
4. **Security**: Never hardcode tokens or API keys

### Architecture Understanding
- **Flat Structure**: Conceptual `src/` is root for easier file navigation
- **Streaming First**: All AI responses are streaming with real-time execution
- **Error Recovery**: Built-in retry logic and automatic error handling
- **Security Model**: Token-based auth with proper CORS handling

## 🔒 Security & Safety

- **Token Authentication**: One-time generated tokens for all requests
- **Local Execution**: All Python code runs locally on user's machine
- **Sandboxed API**: Controlled access to Blender's Python API
- **Input Validation**: Structured API with comprehensive type safety

## 🧪 Development Testing

### Available Test Scripts
- **`DEVELOPMENT_SUITE/blender_test_runner.py`** - Comprehensive testing suite
- **`DEVELOPMENT_SUITE/bridge_smoke_test.py`** - Quick connectivity verification
- **Feature documentation**: `DEVELOPMENT_SUITE/FEATURES.md`
- **Skills library**: `DEVELOPMENT_SUITE/SKILLS_LIBRARY.md`

### Recent Architecture Changes (from git history)
- **a712f3f**: Fixed hallucinations and restored few-shot examples
- **9969177**: Fixed reset button and thinking model prompt issues
- **3beeda4**: Resolved connectivity issues and API 400 errors
- **fcb16e4**: New architecture with all features restored

## 📋 Architecture Notes

### Important Conventions
- **Bridge First**: `gemini_bridge.py` is the canonical addon
- **Flat Imports**: Use `@/` alias for all imports from project root
- **Streaming Responses**: All AI communication is streaming
- **Error Recovery**: AI automatically attempts to fix errors
- **Memory System**: Persistent facts and preferences stored locally

### Common Development Patterns
- Add new tools by updating both `utils/tools.ts` and bridge handlers
- Modify AI behavior through `utils/prompts.ts` and system prompts
- Update type definitions in `types.ts` for any API changes
- Use `utils/providers.ts` for multi-AI provider support

This architecture enables a powerful AI assistant that can understand Blender's state, execute complex 3D operations, and autonomously fix errors while maintaining clean separation between frontend UI and backend execution engine.