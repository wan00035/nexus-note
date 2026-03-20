// 1. We added ipcRenderer here
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Get all note filenames
  getNotesList: () => ipcRenderer.invoke('get-notes-list'),
  
  // Read a specific note
  readNote: (filename) => ipcRenderer.invoke('read-note', filename),
  
  // Save a specific note
  saveNote: (filename, content) => ipcRenderer.send('save-note', filename, content),
  // Rename a specific note
  renameNote: (oldFilename, newFilename) => ipcRenderer.invoke('rename-note', oldFilename, newFilename),
  askAI: (prompt, noteContext) => ipcRenderer.invoke('ask-ai', prompt, noteContext),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key)
}


// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    // This exposes the 'api' object we defined above to window.api in React
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}