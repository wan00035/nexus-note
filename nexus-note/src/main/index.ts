import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import path from 'path'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'NexusNote',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
// --- NEW VAULT LOGIC ---
  
  // Define the path for our notes vault (inside the Documents folder)
  const vaultPath = path.join(app.getPath('documents'), 'NexusNoteVault')
  
  // Create the folder if it doesn't exist
  if (!fs.existsSync(vaultPath)) {
    fs.mkdirSync(vaultPath)
  }

  // 1. Get the list of all notes in the vault
  ipcMain.handle('get-notes-list', () => {
    try {
      // Read all files in the folder and filter only .html files
      const files = fs.readdirSync(vaultPath).filter(file => file.endsWith('.html'))
      return files
    } catch (error) {
      console.error('Failed to read notes list:', error)
      return []
    }
  })

  // 2. Read a specific note by its filename
  ipcMain.handle('read-note', (_, filename) => {
    const filePath = path.join(vaultPath, filename)
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8')
    }
    return ''
  })

  // 3. Save a specific note by its filename
  ipcMain.on('save-note', (_, filename, content) => {
    const filePath = path.join(vaultPath, filename)
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log('Saved note:', filename)
  })
  // 4. Rename a specific note
  ipcMain.handle('rename-note', (_, oldFilename, newFilename) => {
    try {
      const oldPath = path.join(vaultPath, oldFilename)
      // Make sure the new filename ends with .html
      const safeNewFilename = newFilename.endsWith('.html') ? newFilename : `${newFilename}.html`
      const newPath = path.join(vaultPath, safeNewFilename)
      
      // Check if a file with the new name already exists to prevent overwriting
      if (fs.existsSync(newPath)) {
        return { success: false, error: 'A note with this name already exists.' }
      }

      fs.renameSync(oldPath, newPath)
      return { success: true, newFilename: safeNewFilename }
    } catch (error) {
      console.error('Failed to rename note:', error)
      return { success: false, error: 'Failed to rename the note.' }
    }
  })
  // --- NEW: SETTINGS MANAGEMENT ---
  const settingsPath = path.join(vaultPath, 'settings.json')

  // Helper function to get the saved API key
  function getApiKey() {
    if (fs.existsSync(settingsPath)) {
      try {
        const data = fs.readFileSync(settingsPath, 'utf-8')
        const settings = JSON.parse(data)
        return settings.apiKey || ''
      } catch (error) {
        console.error('Failed to parse settings:', error)
        return ''
      }
    }
    return ''
  }

  // 5. Get API Key from settings
  ipcMain.handle('get-api-key', () => {
    return getApiKey()
  })

  // 6. Save API Key to settings
  ipcMain.handle('save-api-key', (_, key) => {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify({ apiKey: key }), 'utf-8')
      return true
    } catch (error) {
      console.error('Failed to save API key:', error)
      return false
    }
  })

  // 7. Ask AI Assistant (Gemini Version - Dynamic Key)
  ipcMain.handle('ask-ai', async (_, prompt, noteContext) => {
    try {
      // Dynamically read the key from the user's local settings!
      const API_KEY = getApiKey()
      
      if (!API_KEY) {
        return 'Please configure your Gemini API Key in the settings first.'
      }

      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an AI assistant integrated into the note-taking app NexusNote. Please answer the user's questions strictly based on the provided note context. If the question is unrelated to the note, answer based on your general knowledge.

--- Note Context Start ---
${noteContext}
--- Note Context End ---

The user's question/instruction is: ${prompt}`
            }]
          }]
        })
      })

      const data = await response.json()
      
      if (data.error) {
        return `Gemini API Error: ${data.error.message}`
      }

      return data.candidates[0].content.parts[0].text

    } catch (error) {
      console.error('AI Call Failed:', error)
      return 'Request failed. Please check your network connection or your API Key.'
    }
  })

  
  
  


})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
