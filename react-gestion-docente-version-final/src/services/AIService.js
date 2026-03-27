/**
 * AIService - Servicio de Inteligencia Artificial con Ollama
 * Integración con modelos de IA Open Source locales
 */
class AIService {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.model = 'llama3.1:8b'; // Modelo por defecto
    this.isAvailable = false;
    this.temperature = 0.7;
    this.maxTokens = 500;
  }

  /**
   * Verificar si Ollama está disponible
   */
  async checkAvailability() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.isAvailable = response.ok;
      return this.isAvailable;
    } catch (error) {
      console.log('Ollama no disponible, usando respuestas predefinidas');
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Generar respuesta con IA
   */
  async generateResponse(prompt, context = {}) {
    // Si Ollama no está disponible, retornar null para usar respuestas predefinidas
    if (!this.isAvailable) {
      await this.checkAvailability();
      if (!this.isAvailable) {
        return null;
      }
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\nUsuario: ${prompt}\n\nAsistente:`;

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: this.temperature,
            num_predict: this.maxTokens,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Error al generar respuesta con Ollama');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error en generateResponse:', error);
      this.isAvailable = false;
      return null;
    }
  }

  /**
   * Generar respuesta inteligente con contexto del sistema
   */
  async generateIntelligentResponse(query, systemData = {}) {
    const context = {
      userType: systemData.userType || 'guest',
      systemName: 'Sistema de Gestión Académica - Universidad La Salle Nezahualcóyotl',
      capabilities: [
        'Información sobre cursos y materias',
        'Datos de docentes y profesores',
        'Estadísticas del sistema',
        'Horarios y aulas',
        'Consultas generales académicas'
      ],
      cursos: systemData.cursos || [],
      docentes: systemData.docentes || []
    };

    return await this.generateResponse(query, context);
  }

  /**
   * Construir el prompt del sistema con contexto
   */
  buildSystemPrompt(context) {
    let prompt = `Eres un asistente virtual inteligente para ${context.systemName || 'Universidad La Salle Nezahualcóyotl'}.\n\n`;
    
    prompt += `**Tu rol:**\n`;
    prompt += `- Ayudar a estudiantes, docentes y administradores\n`;
    prompt += `- Proporcionar información precisa y útil\n`;
    prompt += `- Ser amable, profesional y conciso\n\n`;
    
    if (context.capabilities && context.capabilities.length > 0) {
      prompt += `**Puedes ayudar con:**\n`;
      context.capabilities.forEach(cap => {
        prompt += `- ${cap}\n`;
      });
      prompt += `\n`;
    }

    if (context.userType) {
      prompt += `**Usuario actual:** ${context.userType}\n\n`;
    }

    if (context.cursos && context.cursos.length > 0) {
      prompt += `**Información de cursos disponible:** ${context.cursos.length} cursos registrados\n`;
    }

    if (context.docentes && context.docentes.length > 0) {
      prompt += `**Información de docentes disponible:** ${context.docentes.length} docentes registrados\n`;
    }

    prompt += `\n**Instrucciones:**\n`;
    prompt += `- Responde en español de manera clara y concisa\n`;
    prompt += `- Usa emojis apropiados para mejor experiencia\n`;
    prompt += `- Si no tienes información específica, sugiere preguntar de otra forma\n`;
    prompt += `- Mantén un tono profesional pero amigable\n`;
    prompt += `- Limita tus respuestas a 3-4 párrafos máximo\n\n`;

    return prompt;
  }

  /**
   * Configurar parámetros del servicio
   */
  configure(config) {
    if (config.ollamaUrl) this.ollamaUrl = config.ollamaUrl;
    if (config.model) this.model = config.model;
    if (config.temperature !== undefined) this.temperature = config.temperature;
    if (config.maxTokens) this.maxTokens = config.maxTokens;
  }

  /**
   * Obtener modelos disponibles
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error al obtener modelos:', error);
      return [];
    }
  }

  /**
   * Verificar si un modelo específico está disponible
   */
  async isModelAvailable(modelName) {
    const models = await this.getAvailableModels();
    return models.some(m => m.name === modelName);
  }

  /**
   * Generar respuesta mejorada con fallback
   */
  async generateWithFallback(query, predefinedResponse, context = {}) {
    // Intentar usar IA primero
    const aiResponse = await this.generateIntelligentResponse(query, context);
    
    // Si la IA responde, usar su respuesta
    if (aiResponse) {
      return {
        text: aiResponse,
        metadata: { 
          fineTuned: true, 
          aiGenerated: true,
          model: this.model
        }
      };
    }
    
    // Fallback a respuesta predefinida
    return {
      text: predefinedResponse.text,
      metadata: { 
        fineTuned: predefinedResponse.metadata?.fineTuned || false,
        aiGenerated: false
      }
    };
  }
}

// Exportar instancia única (singleton)
const aiService = new AIService();
export default aiService;

