import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Bot, User } from 'lucide-react'

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { id: '1', text: '¡Hola! Bienvenido a ClickCar. ¿En qué podemos ayudarte hoy? ¿Buscas comprar o vender?', sender: 'bot', time: new Date() }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId] = useState(() => {
    const saved = localStorage.getItem('n8n_chat_session_id')
    if (saved) return saved
    const newId = crypto.randomUUID()
    localStorage.setItem('n8n_chat_session_id', newId)
    return newId
  })
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = { id: Date.now().toString(), text: input, sender: 'user', time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Send to n8n webhook
    try {
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL
      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatInput: input,
            sessionId: sessionId,
            metadata: {
              page: window.location.pathname,
              userAgent: navigator.userAgent
            }
          })
        })
        
        const data = await response.json()
        
        // Handle n8n response formats - typically [{ output: "..." }] or { output: "..." }
        let botResponse = ""
        if (Array.isArray(data)) {
          botResponse = data[0]?.output || data[0]?.message || ""
        } else {
          botResponse = data.output || data.message || ""
        }
        
        if (!botResponse) botResponse = "Disculpa, he tenido un problema procesando tu mensaje. ¿Lo podrías repetir?"
        
        setMessages(prev => [...prev, { 
          id: (Date.now() + 1).toString(), 
          text: botResponse, 
          sender: 'bot', 
          time: new Date() 
        }])
      } else {
        // Fallback mock response if no webhook is set
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            id: (Date.now() + 1).toString(), 
            text: "Nuestro equipo comercial ha recibido tu mensaje y se pondrá en contacto pronto. Mientras tanto, puedes revisar nuestro catálogo.", 
            sender: 'bot', 
            time: new Date() 
          }])
          setIsTyping(false)
        }, 1500)
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="chat-container" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '50%', 
          padding: 0, 
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          background: isOpen ? 'var(--accent)' : 'var(--primary)'
        }}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="glass"
            style={{ 
              position: 'absolute', 
              bottom: '80px', 
              right: 0, 
              width: '350px', 
              height: '500px', 
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* Header */}
            <div style={{ background: 'var(--primary)', color: 'black', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Bot size={20} color="black" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800' }}>ASISTENTE CLICKCAR</h4>
                <p style={{ fontSize: '0.65rem', fontWeight: '600', opacity: 0.7 }}>En línea ahora</p>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: '16px',
                    fontSize: '0.9rem',
                    background: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: msg.sender === 'user' ? 'black' : 'white',
                    border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    fontWeight: '500'
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: '0.6rem', marginTop: '4px', textAlign: msg.sender === 'user' ? 'right' : 'left', opacity: 0.5 }}>
                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '16px', display: 'flex', gap: '4px' }}>
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.6 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                style={{ 
                  flex: 1, 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '12px', borderRadius: '12px', width: 'auto' }}>
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ChatWidget
