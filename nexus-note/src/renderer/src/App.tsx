import React, { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

function App() {
  const [notes, setNotes] = useState<string[]>([])
  const [activeNote, setActiveNote] = useState<string | null>(null)
  
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const isRenaming = useRef(false) 

  // --- AI AGENT STATES ---
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  
  // --- NEW STATES FOR SETTINGS ---
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '', 
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 100vh; padding: 40px; font-size: 16px; line-height: 1.6; color: #374151;',
      },
    },
  })

  // Load notes and API Key on startup
  useEffect(() => {
    const fetchInitialData = async () => {
      // @ts-ignore
      const files = await window.api.getNotesList()
      setNotes(files)
      if (files.length > 0) setActiveNote(files[0])

      // @ts-ignore
      const savedKey = await window.api.getApiKey()
      if (savedKey) {
        setApiKeyInput(savedKey)
        setHasApiKey(true)
      } else {
        // If no key is found, show settings panel by default
        setShowSettings(true)
      }
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    const loadContent = async () => {
      if (activeNote && editor) {
        // @ts-ignore
        const content = await window.api.readNote(activeNote)
        editor.commands.setContent(content || '<p>Empty note...</p>')
      } else if (!activeNote && editor) {
        editor.commands.setContent('<h2>Welcome to NexusNote!</h2><p>Create a new note to start.</p>')
      }
    }
    loadContent()
  }, [activeNote, editor])

  const createNewNote = () => {
    const newFilename = `Note-${Date.now()}.html`
    const defaultContent = '<h1>New Note</h1><p>Start typing here...</p>'
    const updatedNotes = [...notes, newFilename]
    setNotes(updatedNotes)
    setActiveNote(newFilename)
    
    if (editor) editor.commands.setContent(defaultContent)
    // @ts-ignore
    window.api.saveNote(newFilename, defaultContent)
  }

  const handleRenameSubmit = async (oldFilename: string) => {
    if (isRenaming.current) return
    isRenaming.current = true 

    const oldNameWithoutExt = oldFilename.replace('.html', '')
    if (!editValue || editValue.trim() === '' || editValue === oldNameWithoutExt) {
      setEditingNote(null)
      isRenaming.current = false 
      return
    }

    // @ts-ignore 
    const result = await window.api.renameNote(oldFilename, editValue)

    if (result.success) {
      const updatedNotes = notes.map(n => n === oldFilename ? result.newFilename : n)
      setNotes(updatedNotes)
      if (activeNote === oldFilename) setActiveNote(result.newFilename)
    } else {
      alert(result.error) 
    }
    
    setEditingNote(null)
    setTimeout(() => { isRenaming.current = false }, 100)
  }

  const handleAskAI = async () => {
    if (!aiPrompt.trim() || !editor) return
    if (!hasApiKey) {
      alert("Please configure your API Key first!")
      setShowSettings(true)
      return
    }
    
    setIsAiLoading(true)
    setAiResponse('') 
    
    const noteContext = editor.getText() 
    // @ts-ignore
    const response = await window.api.askAI(aiPrompt, noteContext)
    
    setAiResponse(response)
    setIsAiLoading(false)
  }

  // --- NEW: FUNCTION TO SAVE API KEY ---
  const saveApiKeySettings = async () => {
    // @ts-ignore
    const success = await window.api.saveApiKey(apiKeyInput.trim())
    if (success) {
      setHasApiKey(true)
      setShowSettings(false)
      alert('API Key saved successfully!')
    } else {
      alert('Failed to save API Key.')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', margin: 0 }}>
      {/* 🟢 Left Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#f3f4f6', borderRight: '1px solid #e5e7eb', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>NexusNote</h2>
        <button onClick={createNewNote} style={{ width: '100%', padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '15px', fontWeight: 'bold' }}>
          + New Note
        </button>
        <ul style={{ listStyle: 'none', padding: 0, overflowY: 'auto', flex: 1 }}>
          {notes.map((note) => (
            <li 
              key={note}
              onClick={() => { if (editingNote !== note) setActiveNote(note) }}
              onDoubleClick={() => { setEditingNote(note); setEditValue(note.replace('.html', '')) }}
              style={{ padding: '10px', marginBottom: '8px', backgroundColor: activeNote === note ? '#d1d5db' : 'transparent', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', wordBreak: 'break-all', display: 'flex', alignItems: 'center' }}
            >
              <span style={{ marginRight: '8px' }}>📄</span>
              {editingNote === note ? (
                <input
                  type="text" autoFocus value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(note)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(note) 
                    if (e.key === 'Escape') { setEditingNote(null); isRenaming.current = false }
                  }}
                  style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #3b82f6', outline: 'none' }}
                />
              ) : (
                <span>{note.replace('.html', '')}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* 🔵 Middle Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
        <div style={{ padding: '10px 40px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: 'bold' }}>
            {activeNote ? activeNote.replace('.html', '') : 'No note selected'}
          </span>
          <button 
            style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', opacity: activeNote ? 1 : 0.5 }}
            disabled={!activeNote}
            onClick={() => {
              if (editor && activeNote) {
                // @ts-ignore
                window.api.saveNote(activeNote, editor.getHTML())
                alert('Saved successfully!')
              }
            }}
          >
            💾 Save
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* 🟣 Right Sidebar (AI Agent & Settings) */}
      <div style={{ width: '300px', backgroundColor: '#f8fafc', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header with Settings Toggle */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#334155' }}>✨ AI Agent</h3>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.6 }}
            title="AI Settings"
          >
            ⚙️
          </button>
        </div>
        
        {/* Conditional Rendering: Settings View OR Chat View */}
        {showSettings ? (
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#475569' }}>Configuration</h4>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>Gemini API Key:</label>
            <input 
              type="password" 
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your API key here..."
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '14px', outline: 'none' }}
            />
            <button 
              onClick={saveApiKeySettings}
              style={{ padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Save Settings
            </button>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '15px', lineHeight: '1.5' }}>
              Your key is saved locally and never shared. You need a valid key to use the AI features.
            </p>
          </div>
        ) : (
          <>
            {/* AI Response Area */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
              {!hasApiKey && (
                <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '13px' }}>
                  ⚠️ API Key is missing. Please click the ⚙️ icon to configure it.
                </div>
              )}
              {isAiLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <span style={{ color: '#94a3b8' }}>Thinking... 🧠</span>
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{aiResponse}</div>
              )}
            </div>

            {/* AI Input Area */}
            <div style={{ padding: '15px', borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask me to summarize or rewrite..."
                style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'none', outline: 'none', fontSize: '13px', marginBottom: '10px' }}
              />
              <button 
                onClick={handleAskAI}
                disabled={isAiLoading || !aiPrompt.trim()}
                style={{ width: '100%', padding: '10px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: (isAiLoading || !aiPrompt.trim()) ? 0.5 : 1 }}
              >
                {isAiLoading ? 'Asking...' : 'Send to AI'}
              </button>
            </div>
          </>
        )}
      </div>
      
    </div>
  )
}

export default App