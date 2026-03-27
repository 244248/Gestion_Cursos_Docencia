import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, InputGroup, Badge, ButtonGroup } from 'react-bootstrap';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import ChatBotService from '../services/ChatBotService';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/ChatBot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "¡Hola! Soy el asistente virtual de la Universidad La Salle Nezahualcóyotl. ¿En qué puedo ayudarte hoy?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const messagesEndRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Detectar tipo de usuario y configurar el servicio
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Detectar si es admin o docente
        const teacherKey = localStorage.getItem('teacherKey');
        const adminDoc = localStorage.getItem('adminDoc');
        
        if (teacherKey) {
          setUserType('docente');
          ChatBotService.setCurrentUser({ key: teacherKey }, 'docente');
        } else if (adminDoc) {
          setUserType('admin');
          ChatBotService.setCurrentUser({ key: adminDoc }, 'admin');
        } else {
          setUserType('guest');
          ChatBotService.setCurrentUser(null, 'guest');
        }
      } else {
        setCurrentUser(null);
        setUserType('guest');
        ChatBotService.setCurrentUser(null, 'guest');
      }
    });

    return () => unsubscribe();
  }, []);

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Sugerencias rápidas dinámicas según el tipo de usuario
  const getQuickSuggestions = () => {
    if (userType === 'docente') {
      return [
        "¿Cuáles son mis cursos asignados?",
        "¿Información del curso Matemáticas?",
        "¿Cómo funciona el sistema de gestión?",
        "¿Estadísticas de mis cursos?",
        "¿Cómo registrar calificaciones?",
        "¿Estado de mis estudiantes?"
      ];
    } else if (userType === 'admin') {
      return [
        "¿Estadísticas del sistema?",
        "¿Información de docentes?",
        "¿Cómo funciona el sistema de gestión?",
        "¿Resumen de cursos activos?",
        "¿Distribución por áreas?",
        "¿Cursos en línea vs presenciales?"
      ];
    } else {
      return [
        "¿Cómo funciona el sistema de gestión?",
        "¿Qué cursos hay disponibles?",
        "¿Información sobre docentes?",
        "¿Estadísticas del sistema?",
        "¿Funcionalidades del sistema?",
        "¿Cómo usar el sistema?"
      ];
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findBestResponse = async (userMessage) => {
    try {
      // Usar el servicio de Firebase para obtener respuestas basadas en datos reales
      const response = await ChatBotService.processQuery(userMessage);
      
      // Si la respuesta es un objeto con text y metadata, devolverlo tal cual
      if (response && typeof response === 'object' && 'text' in response) {
        return response;
      }
      
      // Si es solo un string, envolverlo en un objeto
      return {
        text: typeof response === 'string' ? response : "⚠️ Error al procesar la respuesta.",
        metadata: { fineTuned: false }
      };
    } catch (error) {
      console.error('Error al procesar consulta:', error);
      return {
        text: "⚠️ Error temporal al procesar tu consulta. Por favor, inténtalo de nuevo en unos momentos.",
        metadata: { error: true }
      };
    }
  };

  const handleSendMessage = async (e, suggestion = null) => {
    e.preventDefault();
    const messageToSend = suggestion || inputMessage;
    if (!messageToSend.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: messageToSend,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      // Obtener respuesta del servicio de Firebase
      const responsePayload = await findBestResponse(messageToSend);
      
      // Extraer el texto y los metadatos del objeto de respuesta
      const responseText = responsePayload?.text || "⚠️ Error al generar respuesta.";
      const responseMetadata = responsePayload?.metadata || {};
      
      const botResponse = {
        id: messages.length + 2,
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
        metadata: responseMetadata
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error al obtener respuesta:', error);
      const errorResponse = {
        id: messages.length + 2,
        text: "⚠️ Error temporal al procesar tu consulta. Por favor, inténtalo de nuevo en unos momentos.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      
      // Limpiar mensaje de error después de 5 segundos
      errorTimeoutRef.current = setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== errorResponse.id));
      }, 5000);
    } finally {
      setIsTyping(false);
      // Mostrar sugerencias de nuevo después de la respuesta del bot
      setTimeout(() => {
        setShowSuggestions(true);
      }, 500);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage({ preventDefault: () => {} }, suggestion);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowSuggestions(true);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Función para formatear el texto del bot con markdown básico
  const formatBotMessage = (text) => {
    if (!text) return '';
    
    // Dividir el texto en líneas
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // Ignorar líneas vacías pero agregar espacio
      if (!line.trim()) {
        return <div key={index} style={{ height: '4px' }} />;
      }
      
      // Detectar encabezados (texto entre **)
      if (line.includes('**')) {
        const parts = line.split('**');
        return (
          <div key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
            {parts.map((part, i) => 
              i % 2 === 1 ? (
                <strong key={i} style={{ fontSize: '0.95rem' }}>{part}</strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </div>
        );
      }
      
      // Detectar listas con bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={index} style={{ 
            marginLeft: '8px', 
            marginBottom: '3px',
            lineHeight: '1.5'
          }}>
            {line}
          </div>
        );
      }
      
      // Línea normal
      return (
        <div key={index} style={{ marginBottom: '4px', lineHeight: '1.5' }}>
          {line}
        </div>
      );
    });
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "¡Hola! Soy el asistente virtual de la Universidad La Salle Nezahualcóyotl. ¿En qué puedo ayudarte hoy?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
    setShowSuggestions(true);
    setIsTyping(false);
    
    // Limpiar timeout de error si existe
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  };

  const deleteMessage = (messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  return (
    <div className="chatbot-container">
      {/* Botón flotante mejorado */}
      <Button
        variant="primary"
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        title={isOpen ? 'Cerrar chat' : 'Abrir chat'}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-headset'}`}></i>
        {!isOpen && (
          <Badge bg="danger" className="notification-badge">
            1
          </Badge>
        )}
      </Button>

      {/* Ventana del chat */}
      <Card className={`chatbot-window ${isOpen ? 'show' : ''}`}>
        <Card.Header className="chatbot-header">
          <div className="d-flex align-items-center">
            <div className="bot-avatar-header">
              <i className="fas fa-robot"></i>
            </div>
            <div className="ms-3 header-info">
              <h6 className="mb-0 fw-bold">Asistente Virtual</h6>
              <small className="text-light opacity-75">
                {isTyping ? 'Escribiendo...' : 'En línea'}
              </small>
            </div>
          </div>
          <div className="header-actions">
            <Button
              variant="link"
              className="action-btn"
              onClick={clearChat}
              title="Limpiar"
            >
              <i className="fas fa-trash-alt"></i>
            </Button>
            <Button
              variant="link"
              className="close-btn"
              onClick={toggleChat}
              title="Cerrar"
            >
              <i className="fas fa-times"></i>
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="chatbot-body">
          <div className="messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-wrapper ${message.sender === 'user' ? 'user-wrapper' : 'bot-wrapper'}`}
              >
                {message.sender === 'bot' && (
                  <div className="bot-avatar-message">
                    <i className="fas fa-robot"></i>
                  </div>
                )}
                
                <div className="message-content-column">
                  {/* Encabezado del mensaje */}
                  <div className="message-meta">
                    {message.sender === 'bot' ? (
                      <span className="bot-name">Asistente Virtual</span>
                    ) : null}
                    {message.sender === 'bot' && <span className="message-time">{formatTime(message.timestamp)}</span>}
                    {message.sender === 'user' && <span className="message-time-user">Just now</span>}
                  </div>

                  {/* Burbuja del mensaje */}
                  <div className={`message-bubble ${message.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                    {message.sender === 'bot' && message.metadata?.fineTuned && (
                       <div className="fine-tuned-indicator">
                         <i className="fas fa-check-circle"></i> Respuesta Personalizada
                       </div>
                    )}
                    <div className="message-text">
                      {message.sender === 'bot' ? formatBotMessage(message.text) : message.text}
                    </div>
                  </div>

                  {/* Botones de feedback solo para el bot */}
                  {message.sender === 'bot' && message.id > 1 && (
                    <div className="feedback-buttons">
                      <Button variant="outline-secondary" size="sm" className="feedback-btn">
                        <i className="fas fa-thumbs-up"></i> Útil
                      </Button>
                      <Button variant="outline-secondary" size="sm" className="feedback-btn">
                        <i className="fas fa-thumbs-down"></i> No útil
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message-wrapper bot-wrapper">
                <div className="bot-avatar-message">
                  <i className="fas fa-robot"></i>
                </div>
                <div className="message-bubble bot-bubble typing-bubble">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card.Body>

        {/* Sugerencias rápidas si no hay mensajes o usuario acaba de limpiar */}
        {showSuggestions && messages.length === 1 && (
          <div className="suggestions-overlay">
            <div className="suggestions-grid">
              {getQuickSuggestions().slice(0, 3).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline-primary"
                  size="sm"
                  className="suggestion-btn"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Card.Footer className="chatbot-footer">
          <Form onSubmit={handleSendMessage} className="input-form">
            <Form.Control
              type="text"
              placeholder="Escribe tu pregunta aquí..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="clean-input"
              onFocus={() => setShowSuggestions(false)}
            />
            <div className="input-actions">
              <Button variant="link" className="icon-btn">
                <i className="fas fa-paperclip"></i>
              </Button>
              <Button 
                type="submit" 
                variant="link" 
                className="icon-btn send-icon-btn"
                disabled={!inputMessage.trim()}
              >
                <i className="fas fa-paper-plane"></i>
              </Button>
            </div>
          </Form>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default ChatBot;