# ✨ NexusNote

**NexusNote** is a high-performance, local-first desktop rich text editor integrated with a powerful **AI Agent**. Built with **Electron**, **React**, and **TypeScript**, it offers a seamless writing experience while keeping your data 100% private in your local file system.

---

## 🚀 Key Features

* **WYSIWYG Editing**: A modern "What You See Is What You Get" rich text experience powered by the **Tiptap** editor engine—no Markdown syntax required.
* **AI Agent Integration**: Built-in side panel connected to **Gemini**. The AI reads your current note context to summarize, rewrite, or answer questions.
* **Local-First Architecture**: All notes are stored as HTML files in your local `Documents/NexusNoteVault` folder. Your thoughts never leave your machine unless you ask the AI.
* **Secure API Management**: Configure your own Gemini API Key within the app UI. Keys are stored locally in a `settings.json` and are never hardcoded in the source code.
* **Smart File Management**: Create, load, and rename notes with a streamlined sidebar interface.

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Tiptap (Rich Text Engine)
* **Desktop Wrapper**: Electron (Cross-platform support)
* **Backend Logic**: Node.js (FileSystem API, IPC Communication)
* **AI Engine**: Google Gemini API
* **Build Tool**: electron-vite

## 🏗️ Architecture & Technical Highlights

### 1. Secure Inter-Process Communication (IPC)
The application utilizes Electron's `contextBridge` to maintain a strict separation between the UI and the Node.js backend. This ensures that the frontend cannot directly access the filesystem, providing a secure bridge for saving and reading notes.

### 2. Concurrency & Race Condition Handling
Solved complex UI bugs related to React's component unmounting during file renaming. Implemented a robust "Debounce Lock" using `useRef` to prevent duplicate IPC calls during `onBlur` and `onKeyDown` events.

### 3. Context-Aware AI (RAG Principle)
Unlike basic chatbots, the NexusNote AI Agent dynamically extracts the text content from the Tiptap editor and injects it into the prompt. This allows the LLM to provide highly relevant answers based specifically on your private notes.

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone 
   cd nexus-note
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run in development mode:**
   ```bash
   npm run dev
   ```
4. Configure AI:
Click the ⚙️ (Settings) icon in the right side panel.
Enter your Gemini API Key.
Start chatting with your notes!
