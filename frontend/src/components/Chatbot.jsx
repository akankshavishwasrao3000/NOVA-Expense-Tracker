import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

export default function Chatbot({ notice, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
  }, [])

  async function sendMessage() {
    const text = input.trim()
    if (!text) return

    setMessages((current) => [...current, { text, sender: 'user' }])
    setInput('')

    try {
      const response = await api.chatbot(text)
      setMessages((current) => [...current, { text: response.response, sender: 'bot' }])
      if (response.changed) await onRefresh()
    } catch (error) {
      notice(error.message)
    }
  }

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      notice('Speech recognition is not supported in this browser.')
      return
    }

    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    recognitionRef.current.start()
    setListening(true)
  }

  return (
    <>
      <button type="button" className="chat-fab" onClick={() => setOpen((value) => !value)}>✦</button>

      {open && (
        <section className="chat-window">
          <header>
            <strong>Nova assistant</strong>
            <button type="button" onClick={() => setOpen(false)}>×</button>
          </header>

          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">Ask Nova to add an expense or summarize your spending.</p>
            )}

            {messages.map((item, index) => (
              <div
                key={`${item.sender}-${index}`}
                className={`message ${item.sender}`}
                dangerouslySetInnerHTML={{ __html: item.text }}
              />
            ))}
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') sendMessage()
              }}
              placeholder="Type your expense..."
            />
            <button type="button" className={listening ? 'voice active' : 'voice'} onClick={toggleVoice}>
              ♩
            </button>
            <button type="button" onClick={sendMessage}>Send</button>
          </div>
        </section>
      )}
    </>
  )
}
