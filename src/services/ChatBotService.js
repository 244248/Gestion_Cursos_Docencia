import { collection, getDocs, query } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { db, rtdb } from '../firebase/config';
import aiService from './AIService';

/**
 * Servicio ChatBot - Respuestas predefinidas + IA Open Source
 * Soporte para configuración institucional dinámica
 */
class ChatBotService {
  constructor() {
    this.currentUser = null;
    this.userType = 'guest';
    this.cache = {
      cursos: null,
      docentes: null,
      lastUpdate: null
    };
    this.cacheExpiration = 2 * 60 * 1000;
    this.aiService = aiService;
    this.useAI = true; // Habilitar uso de IA por defecto
    this.institutionConfig = null; // Configuración institucional
    
    // Verificar disponibilidad de IA al iniciar
    this.checkAIAvailability();
    // Cargar configuración institucional
    this.loadInstitutionConfig();
  }

  /**
   * Cargar configuración institucional
   */
  async loadInstitutionConfig() {
    try {
      const configRef = ref(rtdb, 'institutionConfig');
      const snapshot = await get(configRef);
      if (snapshot.exists()) {
        this.institutionConfig = snapshot.val();
      }
    } catch (error) {
      console.error('Error al cargar configuración institucional:', error);
    }
  }

  /**
   * Obtener nombre de la institución
   */
  getInstitutionName() {
    return this.institutionConfig?.institutionName || 'Universidad La Salle Nezahualcóyotl';
  }

  /**
   * Obtener nombre corto de la institución
   */
  getInstitutionShortName() {
    return this.institutionConfig?.institutionShortName || 'La Salle Neza';
  }

  /**
   * Obtener información de contacto
   */
  getContactInfo() {
    return this.institutionConfig?.contact || {
      email: 'soporte@lasallenezahualcoyotl.edu.mx',
      phone: '+52 55 1234 5678',
      whatsapp: '+52 55 1234 5678',
      address: 'Nezahualcóyotl, Estado de México',
      website: 'https://lasallenezahualcoyotl.edu.mx',
      scheduleText: 'Lunes a Viernes: 8:00 - 18:00, Sábados: 9:00 - 14:00'
    };
  }

  async checkAIAvailability() {
    await this.aiService.checkAvailability();
  }

  setCurrentUser(user, userType = 'guest') {
    this.currentUser = user;
    this.userType = userType;
  }

  async processQuery(query) {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      
      // Cargar datos
      const [cursos, docentes] = await Promise.all([
        this.getCursosData(),
        this.getDocentesData()
      ]);

      // Detectar intención
      if (this.detectCursosIntent(normalizedQuery)) {
        return this.handleCursosQuery(normalizedQuery, cursos, docentes);
      }
      
      if (this.detectDocentesIntent(normalizedQuery)) {
        return this.handleDocentesQuery(normalizedQuery, docentes, cursos);
      }
      
      if (this.detectEstadisticasIntent(normalizedQuery)) {
        return this.handleEstadisticasQuery(cursos, docentes);
      }

      // Búsqueda general en datos (con soporte de IA)
      return this.handleGeneralSearch(normalizedQuery, cursos, docentes);

    } catch (error) {
      console.error('Error en processQuery:', error);
      return {
        text: "Hubo un problema al consultar los datos. Por favor intenta de nuevo.",
        metadata: { error: true }
      };
    }
  }

  /**
   * Procesar consulta con IA (si está disponible)
   */
  async processWithAI(query, predefinedResponse, cursos, docentes) {
    if (!this.useAI) {
      return predefinedResponse;
    }

    try {
      const context = {
        userType: this.userType,
        cursos: cursos,
        docentes: docentes
      };

      const aiResponse = await this.aiService.generateWithFallback(
        query, 
        predefinedResponse, 
        context
      );

      return aiResponse;
    } catch (error) {
      console.error('Error al usar IA:', error);
      return predefinedResponse;
    }
  }

  detectCursosIntent(query) {
    return /cursos?|materia|asignatura|clase|horario|aula/i.test(query);
  }

  detectDocentesIntent(query) {
    return /docentes?|profesor|maestro|imparte|enseña/i.test(query);
  }

  detectEstadisticasIntent(query) {
    return /estadística|estadistica|resumen|total|cantidad|cuántos|cuantos/i.test(query);
  }

  async handleCursosQuery(query, cursos, docentes) {
    if (!cursos || cursos.length === 0) {
      return {
        text: "📚 No hay cursos registrados en la base de datos actualmente.",
        metadata: { fineTuned: true }
      };
    }

    // Buscar curso específico
    const terminos = query.split(' ').filter(t => t.length > 3);
    for (const termino of terminos) {
      const cursoEncontrado = cursos.find(c => 
        c.nombre?.toLowerCase().includes(termino) ||
        c.area?.toLowerCase().includes(termino)
      );
      
      if (cursoEncontrado) {
        return this.formatCursoDetalle(cursoEncontrado, docentes);
      }
    }

    // Si pregunta "¿Qué cursos hay?" mostrar resumen
    if (/qué|cuáles|disponibles|hay/i.test(query)) {
      return this.formatListaCursos(cursos);
    }

    // Por defecto, resumen de cursos
    return this.formatResumenCursos(cursos);
  }

  async handleDocentesQuery(query, docentes, cursos) {
    if (!docentes || docentes.length === 0) {
      return {
        text: "👨‍🏫 No hay docentes registrados en la base de datos actualmente.",
        metadata: { fineTuned: true }
      };
    }

    // Buscar docente específico
    const terminos = query.split(' ').filter(t => t.length > 3);
    for (const termino of terminos) {
      const docenteEncontrado = docentes.find(d => 
        d.nombre?.toLowerCase().includes(termino) ||
        d.email?.toLowerCase().includes(termino)
      );
      
      if (docenteEncontrado) {
        return this.formatDocenteDetalle(docenteEncontrado, cursos);
      }
    }

    // Por defecto, lista de docentes
    return this.formatListaDocentes(docentes);
  }

  async handleEstadisticasQuery(cursos, docentes) {
    const totalCursos = cursos?.length || 0;
    const totalDocentes = docentes?.length || 0;
    const cursosActivos = cursos?.filter(c => !c.completado).length || 0;
    const cursosCompletados = cursos?.filter(c => c.completado).length || 0;

    let response = `📊 **Estadísticas del Sistema**\n\n`;
    response += `**Cursos:**\n`;
    response += `• Total: ${totalCursos}\n`;
    response += `• Activos: ${cursosActivos}\n`;
    response += `• Completados: ${cursosCompletados}\n\n`;
    response += `**Docentes:**\n`;
    response += `• Total: ${totalDocentes}\n`;

    if (totalCursos > 0 && totalDocentes > 0) {
      const promedio = (totalCursos / totalDocentes).toFixed(1);
      response += `• Promedio cursos/docente: ${promedio}\n`;
    }

    return {
      text: response,
      metadata: { fineTuned: true }
    };
  }

  async handleGeneralSearch(query, cursos, docentes) {
    // Saludos y presentación
    if (/hola|buenos|hey|hi|saludos/i.test(query)) {
      return {
        text: `¡Hola! 👋 Soy el asistente virtual de ${this.getInstitutionName()}. Puedo ayudarte con información sobre cursos, docentes, horarios y estadísticas. ¿Qué necesitas?`,
        metadata: { fineTuned: true }
      };
    }

    // Despedidas
    if (/adiós|adios|hasta luego|bye|chao|nos vemos/i.test(query)) {
      return {
        text: "¡Hasta luego! 👋 Fue un placer ayudarte. Si necesitas algo más, aquí estaré.",
        metadata: { fineTuned: true }
      };
    }

    // Agradecimientos
    if (/gracias|thank you|thanks|te agradezco/i.test(query)) {
      return {
        text: "¡De nada! 😊 Estoy aquí para ayudarte. Si tienes más preguntas, no dudes en consultarme.",
        metadata: { fineTuned: true }
      };
    }

    // ¿Quién eres? / ¿Qué eres?
    if (/quién eres|quien eres|qué eres|que eres|tu nombre|como te llamas/i.test(query)) {
      return {
        text: `🤖 Soy el asistente virtual inteligente de ${this.getInstitutionName()}.\n\nEstoy diseñado para ayudarte con:\n• 📚 Información de cursos\n• 👨‍🏫 Datos de docentes\n• 📊 Estadísticas del sistema\n• ⏰ Horarios y aulas\n• 📋 Consultas generales\n\nUtilizo inteligencia artificial para darte respuestas precisas y personalizadas.`,
        metadata: { fineTuned: true }
      };
    }

    // ¿Cómo funciona el sistema?
    if (/cómo funciona|como funciona|funcionalidades|características|que puedes hacer/i.test(query)) {
      return {
        text: "🎯 **Sistema de Gestión Académica**\n\n**Funcionalidades principales:**\n• 📚 Gestión de cursos y materias\n• 👨‍🏫 Administración de docentes\n• 📊 Reportes y estadísticas\n• ⏰ Control de horarios\n• 🏫 Asignación de aulas\n• 📈 Seguimiento de progreso\n\n**Para docentes:**\n• Registro de calificaciones\n• Control de asistencia\n• Gestión de materiales\n\n**Para administradores:**\n• Dashboard completo\n• Análisis de datos\n• Gestión de usuarios",
        metadata: { fineTuned: true }
      };
    }

    // Ayuda / ¿Qué puedo preguntar?
    if (/ayuda|help|qué puedo preguntar|que puedo preguntar|opciones|comandos/i.test(query)) {
      return {
        text: "💡 **Puedo ayudarte con:**\n\n**Sobre cursos:**\n• ¿Qué cursos hay disponibles?\n• ¿Cuál es el horario de [nombre curso]?\n• ¿En qué aula es [nombre curso]?\n• ¿Cuántos cursos activos hay?\n\n**Sobre docentes:**\n• ¿Qué docentes hay?\n• ¿Quién imparte [nombre curso]?\n• ¿Qué cursos imparte [nombre docente]?\n• ¿Cuántos docentes hay registrados?\n\n**Estadísticas:**\n• Resumen del sistema\n• Estadísticas generales\n• Cursos por área\n• Distribución de docentes",
        metadata: { fineTuned: true }
      };
    }

    // Horarios
    if (/horario|hora|cuando/i.test(query) && !this.detectCursosIntent(query)) {
      return {
        text: "⏰ **Consultas de horarios:**\n\nPara ver horarios específicos, pregúntame:\n• \"¿Cuál es el horario de [nombre del curso]?\"\n• \"¿Cuándo es la clase de [materia]?\"\n\nTambién puedo mostrarte todos los cursos con sus horarios si me preguntas:\n• \"Muéstrame todos los horarios\"",
        metadata: { fineTuned: true }
      };
    }

    // Aulas
    if (/aula|salón|salon|dónde|donde/i.test(query) && !this.detectCursosIntent(query)) {
      return {
        text: "🏫 **Consultas de aulas:**\n\nPara saber en qué aula es un curso, pregúntame:\n• \"¿En qué aula es [nombre del curso]?\"\n• \"¿Dónde es la clase de [materia]?\"\n\nTambién puedo mostrarte la distribución de aulas si preguntas:\n• \"Muéstrame las aulas asignadas\"",
        metadata: { fineTuned: true }
      };
    }

    // Modalidad (presencial/en línea)
    if (/modalidad|presencial|en línea|online|virtual|distancia/i.test(query)) {
      const presenciales = cursos?.filter(c => c.modalidad?.toLowerCase() === 'presencial').length || 0;
      const enLinea = cursos?.filter(c => c.modalidad?.toLowerCase() === 'en línea').length || 0;
      const total = cursos?.length || 0;
      
      return {
        text: `📡 **Modalidades de cursos:**\n\n• 🏫 Presencial: ${presenciales} cursos\n• 💻 En línea: ${enLinea} cursos\n• 📊 Total: ${total} cursos\n\n¿Te gustaría ver los detalles de alguna modalidad específica?`,
        metadata: { fineTuned: true }
      };
    }

    // Áreas académicas
    if (/área|areas|departamento|facultad/i.test(query)) {
      const areas = {};
      cursos?.forEach(c => {
        const area = c.area || 'Sin área';
        areas[area] = (areas[area] || 0) + 1;
      });
      
      let texto = "🎓 **Áreas Académicas:**\n\n";
      Object.entries(areas).forEach(([area, count]) => {
        texto += `• ${area}: ${count} curso${count !== 1 ? 's' : ''}\n`;
      });
      
      return {
        text: texto,
        metadata: { fineTuned: true }
      };
    }

    // Estado del sistema
    if (/estado|status|funcionando|disponible|activo/i.test(query)) {
      const totalCursos = cursos?.length || 0;
      const totalDocentes = docentes?.length || 0;
      const cursosActivos = cursos?.filter(c => !c.completado).length || 0;
      
      return {
        text: `✅ **Estado del Sistema**\n\n🟢 Sistema operativo\n\n**Datos actuales:**\n• 📚 ${totalCursos} cursos registrados\n• 👨‍🏫 ${totalDocentes} docentes activos\n• 🟢 ${cursosActivos} cursos en progreso\n\n**Última actualización:** ${new Date().toLocaleString('es-MX')}\n\nTodo funcionando correctamente 🎯`,
        metadata: { fineTuned: true }
      };
    }

    // Contacto / Soporte
    if (/contacto|soporte|ayuda técnica|problema|error|support/i.test(query)) {
      const contact = this.getContactInfo();
      return {
        text: `📞 **Soporte y Contacto**\n\n**Soporte técnico:**\n📧 Email: ${contact.email}\n📱 WhatsApp: ${contact.whatsapp}\n\n**Horario de atención:**\n🕐 ${contact.scheduleText}\n\n**Campus:**\n📍 ${this.getInstitutionName()}\n${contact.address}${contact.website ? `\n🌐 ${contact.website}` : ''}`,
        metadata: { fineTuned: true }
      };
    }

    // Calificaciones
    if (/calificación|calificaciones|notas|evaluación|examen/i.test(query)) {
      return {
        text: "📝 **Sistema de Calificaciones**\n\nLos docentes pueden:\n• Registrar calificaciones por alumno\n• Generar reportes de evaluaciones\n• Hacer seguimiento del desempeño\n• Exportar datos a PDF\n\n¿Eres docente y necesitas ayuda para registrar calificaciones?\n\nPara más información sobre tu curso específico, pregúntame por el nombre del curso.",
        metadata: { fineTuned: true }
      };
    }

    // Registro / Inscripción
    if (/registro|inscripción|inscripcion|matricula|id empleado|alta|agregar curso/i.test(query)) {
      return {
        text: "📋 **Registro e Inscripción**\n\n**Para docentes:**\nContacta al administrador para obtener tus credenciales de acceso al sistema.\n\n**Para administradores:**\nPuedes agregar cursos y docentes desde el panel de administración.\n\n**Proceso de alta:**\n1️⃣ Solicitar acceso al administrador\n2️⃣ Recibir credenciales\n3️⃣ Ingresar al sistema\n4️⃣ Completar perfil\n\n¿Necesitas ayuda con algo más específico?",
        metadata: { fineTuned: true }
      };
    }

    // Buscar en todo
    const terminos = query.split(' ').filter(t => t.length > 3);
    
    for (const termino of terminos) {
      // Buscar en cursos
      const cursoMatch = cursos?.find(c => 
        c.nombre?.toLowerCase().includes(termino)
      );
      if (cursoMatch) {
        return this.formatCursoDetalle(cursoMatch, docentes);
      }

      // Buscar en docentes
      const docenteMatch = docentes?.find(d => 
        d.nombre?.toLowerCase().includes(termino)
      );
      if (docenteMatch) {
        return this.formatDocenteDetalle(docenteMatch, cursos);
      }
    }

    // No se encontró nada específico - Respuesta mejorada
    return {
      text: `🔍 No encontré información específica sobre "${query}".\n\n**Sugerencias:**\n• Intenta reformular tu pregunta\n• Pregúntame sobre cursos disponibles\n• Consulta información de docentes\n• Solicita estadísticas del sistema\n\n💡 Escribe "ayuda" para ver todas mis funcionalidades.`,
      metadata: { fineTuned: false }
    };
  }

  // Formateo de respuestas
  formatCursoDetalle(curso, docentes) {
    const docente = docentes?.find(d => 
      d.id === curso.docente || d.nombre === curso.docenteNombre
    );

    let texto = `📚 **${curso.nombre}**\n\n`;
    texto += `📍 **Área:** ${curso.area || 'No especificada'}\n`;
    texto += `📡 **Modalidad:** ${curso.modalidad || 'Presencial'}\n`;
    texto += `👨‍🏫 **Docente:** ${docente?.nombre || curso.docenteNombre || 'Sin asignar'}\n`;
    
    if (curso.horario) texto += `⏰ **Horario:** ${curso.horario}\n`;
    if (curso.aula) texto += `🏫 **Aula:** ${curso.aula}\n`;
    
    const estado = curso.completado ? '✅ Completado' : '🟢 Activo';
    texto += `📊 **Estado:** ${estado}\n`;

    return {
      text: texto,
      metadata: { fineTuned: true }
    };
  }

  formatDocenteDetalle(docente, cursos) {
    const cursosDocente = cursos?.filter(c => 
      c.docente === docente.id || c.docenteNombre === docente.nombre
    ) || [];

    let texto = `👨‍🏫 **${docente.nombre}**\n\n`;
    if (docente.email) texto += `📧 ${docente.email}\n`;
    if (docente.telefono) texto += `📞 ${docente.telefono}\n`;
    texto += `📚 **Área:** ${docente.area || 'No especificada'}\n`;

    if (cursosDocente.length > 0) {
      texto += `\n**Cursos que imparte (${cursosDocente.length}):**\n`;
      cursosDocente.forEach(c => {
        texto += `• ${c.nombre}\n`;
      });
    } else {
      texto += `\nℹ️ No tiene cursos asignados actualmente.`;
    }

    return {
      text: texto,
      metadata: { fineTuned: true }
    };
  }

  formatListaCursos(cursos) {
    const activos = cursos.filter(c => !c.completado);
    
    let texto = `📚 **Cursos Disponibles (${activos.length})**\n\n`;
    
    const porArea = {};
    activos.forEach(c => {
      const area = c.area || 'Sin área';
      if (!porArea[area]) porArea[area] = [];
      porArea[area].push(c);
    });

    for (const [area, cursosList] of Object.entries(porArea)) {
      texto += `**${area}:**\n`;
      cursosList.slice(0, 3).forEach(c => {
        texto += `• ${c.nombre} - ${c.docenteNombre || 'Sin docente'}\n`;
      });
      if (cursosList.length > 3) {
        texto += `  ... y ${cursosList.length - 3} más\n`;
      }
      texto += `\n`;
    }

    return {
      text: texto,
      metadata: { fineTuned: true }
    };
  }

  formatResumenCursos(cursos) {
    const total = cursos.length;
    const activos = cursos.filter(c => !c.completado).length;
    
    let texto = `📚 **Resumen de Cursos**\n\n`;
    texto += `• Total: ${total}\n`;
    texto += `• Activos: ${activos}\n`;
    texto += `• Completados: ${total - activos}\n`;

    return {
      text: texto,
      metadata: { fineTuned: true }
    };
  }

  formatListaDocentes(docentes) {
    let texto = `👨‍🏫 **Docentes Registrados (${docentes.length})**\n\n`;
    
    docentes.slice(0, 10).forEach(d => {
      texto += `• ${d.nombre}`;
      if (d.area) texto += ` - ${d.area}`;
      texto += `\n`;
    });

    if (docentes.length > 10) {
      texto += `\n... y ${docentes.length - 10} más`;
    }

    return {
      text: texto,
      metadata: { fineTuned: true }
    };
  }

  // Obtención de datos desde Firebase
  async getCursosData() {
    try {
      if (this.cache.cursos && (Date.now() - this.cache.lastUpdate < this.cacheExpiration)) {
        return this.cache.cursos;
      }

      const rtdbRef = ref(rtdb, 'cursos');
      const snapshot = await get(rtdbRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const cursos = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        this.cache.cursos = cursos;
        this.cache.lastUpdate = Date.now();
        return cursos;
      }

      // Intentar Firestore si RTDB está vacío
      const firestoreSnapshot = await getDocs(collection(db, 'cursos'));
      const cursos = firestoreSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.cache.cursos = cursos;
      this.cache.lastUpdate = Date.now();
      return cursos;

    } catch (error) {
      console.error('Error al cargar cursos:', error);
      return this.cache.cursos || [];
    }
  }

  async getDocentesData() {
    try {
      if (this.cache.docentes && (Date.now() - this.cache.lastUpdate < this.cacheExpiration)) {
        return this.cache.docentes;
      }

      const rtdbRef = ref(rtdb, 'docentes');
      const snapshot = await get(rtdbRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const docentes = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        this.cache.docentes = docentes;
        this.cache.lastUpdate = Date.now();
        return docentes;
      }

      // Intentar Firestore si RTDB está vacío
      const firestoreSnapshot = await getDocs(collection(db, 'docentes'));
      const docentes = firestoreSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.cache.docentes = docentes;
      this.cache.lastUpdate = Date.now();
      return docentes;

    } catch (error) {
      console.error('Error al cargar docentes:', error);
      return this.cache.docentes || [];
    }
  }

  clearCache() {
    this.cache = {
      cursos: null,
      docentes: null,
      lastUpdate: null
    };
  }
}

const chatBotService = new ChatBotService();
export default chatBotService;
