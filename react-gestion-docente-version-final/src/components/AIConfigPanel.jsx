import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Badge, Row, Col } from 'react-bootstrap';
import AIService from '../services/AIService';

const AIConfigPanel = () => {
  const [aiService] = useState(new AIService());
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [config, setConfig] = useState({
    ollamaUrl: 'http://localhost:11434',
    model: 'llama3.1:8b',
    temperature: 0.7,
    maxTokens: 500
  });

  useEffect(() => {
    checkAIAvailability();
  }, []);
  
  const checkAIAvailability = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${config.ollamaUrl}/api/tags`, {
        method: 'GET',
        timeout: 3000
      });
      setIsAvailable(response.ok);
    } catch (error) {
      setIsAvailable(false);
    }
    setIsChecking(false);
  };

  const testAI = async () => {
    if (!testMessage.trim()) return;
    
    setIsTesting(true);
    try {
      const response = await aiService.generateIntelligentResponse(testMessage, {
        userType: 'admin',
        systemInfo: 'Sistema de gestión académica'
      });
      setTestResponse(response);
    } catch (error) {
      setTestResponse('Error al probar la IA: ' + error.message);
    }
    setIsTesting(false);
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">
          🤖 Configuración de IA Open Source
          <Badge 
            bg={isAvailable ? 'success' : 'secondary'} 
            className="ms-2"
          >
            {isAvailable ? 'Disponible' : 'No disponible'}
          </Badge>
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={6}>
            <h6>Estado del Sistema</h6>
            <Alert variant={isAvailable ? 'success' : 'warning'}>
              {isAvailable ? (
                <>
                  <strong>✅ Ollama está funcionando</strong><br/>
                  El sistema de IA está disponible y funcionando correctamente.
                </>
              ) : (
                <>
                  <strong>⚠️ Ollama no disponible</strong><br/>
                  El sistema usará respuestas inteligentes predefinidas.
                </>
              )}
            </Alert>
            
            <Button 
              variant="outline-primary" 
              onClick={checkAIAvailability}
              disabled={isChecking}
              className="mb-3"
            >
              {isChecking ? 'Verificando...' : 'Verificar Estado'}
            </Button>
          </Col>
          
          <Col md={6}>
            <h6>Configuración</h6>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>URL de Ollama</Form.Label>
                <Form.Control
                  type="text"
                  value={config.ollamaUrl}
                  onChange={(e) => handleConfigChange('ollamaUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Modelo</Form.Label>
                <Form.Select
                  value={config.model}
                  onChange={(e) => handleConfigChange('model', e.target.value)}
                >
                  <option value="llama3.1:8b">Llama 3.1 8B (Rápido)</option>
                  <option value="llama3.1:70b">Llama 3.1 70B (Calidad)</option>
                  <option value="mistral:7b">Mistral 7B</option>
                  <option value="mistral:70b">Mistral 70B</option>
                </Form.Select>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Creatividad: {config.temperature}</Form.Label>
                <Form.Range
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Longitud máxima: {config.maxTokens}</Form.Label>
                <Form.Range
                  min="100"
                  max="1000"
                  step="50"
                  value={config.maxTokens}
                  onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                />
              </Form.Group>
            </Form>
          </Col>
        </Row>
        
        <hr/>
        
        <Row>
          <Col>
            <h6>Prueba de IA</h6>
            <Form.Group className="mb-3">
              <Form.Label>Mensaje de prueba</Form.Label>
              <Form.Control
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Escribe un mensaje para probar la IA..."
              />
            </Form.Group>
            
            <Button 
              variant="primary" 
              onClick={testAI}
              disabled={isTesting || !testMessage.trim()}
              className="mb-3"
            >
              {isTesting ? 'Probando...' : 'Probar IA'}
            </Button>
            
            {testResponse && (
              <Alert variant="info">
                <strong>Respuesta de la IA:</strong><br/>
                {testResponse}
              </Alert>
            )}
          </Col>
        </Row>
        
        <Alert variant="info" className="mt-3">
          <strong>💡 Información:</strong><br/>
          • El sistema funciona perfectamente sin Ollama instalado<br/>
          • La IA mejora la experiencia pero no es requerida<br/>
          • Todas las respuestas son procesadas localmente<br/>
          • No se envían datos a servicios externos
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default AIConfigPanel;
