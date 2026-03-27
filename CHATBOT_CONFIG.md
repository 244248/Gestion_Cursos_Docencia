# Configuración del ChatBot con IA Open Source

## Descripción

El chatbot utiliza el modelo **BlenderBot** de Facebook, disponible gratuitamente a través de Hugging Face. Este modelo de IA conversacional es completamente open source y permite conversaciones naturales en español e inglés.

## Configuración

### 1. Obtener un Token de Hugging Face (Gratis)

1. Visita [https://huggingface.co/](https://huggingface.co/)
2. Crea una cuenta gratuita
3. Ve a tu perfil → Settings → Access Tokens
4. Crea un nuevo token con permisos de lectura (read)
5. Copia el token generado

### 2. Configurar el Token en el Proyecto

Abre el archivo `src/components/ChatBot.jsx` y reemplaza la línea:

```javascript
'Authorization': 'Bearer hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

Por:

```javascript
'Authorization': 'Bearer TU_TOKEN_AQUI'
```

**⚠️ IMPORTANTE:** Por seguridad, considera crear un archivo `.env` para almacenar el token:

1. Crea un archivo `.env` en la raíz del proyecto:
```
REACT_APP_HUGGINGFACE_TOKEN=tu_token_aqui
```

2. En `ChatBot.jsx`, usa la variable de entorno:
```javascript
'Authorization': `Bearer ${process.env.REACT_APP_HUGGINGFACE_TOKEN}`
```

3. Asegúrate de que `.env` esté en tu `.gitignore`

## Modelos Alternativos

Si deseas usar otro modelo de IA open source, puedes cambiar la URL en la función `getAIResponse`:

### Modelos Recomendados:

1. **BlenderBot-400M** (Actual - Conversacional)
   ```javascript
   'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill'
   ```

2. **DialoGPT** (Conversacional en inglés)
   ```javascript
   'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium'
   ```

3. **BLOOM** (Multilenguaje)
   ```javascript
   'https://api-inference.huggingface.co/models/bigscience/bloom-560m'
   ```

4. **GPT-2 Spanish** (Español)
   ```javascript
   'https://api-inference.huggingface.co/models/DeepESP/gpt2-spanish'
   ```

## Características del ChatBot

### Funcionalidades Implementadas:

- ✅ Diseño moderno estilo WhatsApp/Telegram
- ✅ Mensajes en tiempo real
- ✅ Indicador de escritura
- ✅ Historial de conversación
- ✅ Botón flotante para abrir/cerrar
- ✅ Respuestas con IA (cuando se configura el token)
- ✅ Respuestas predefinidas sobre el sistema (fallback)
- ✅ Timestamps en mensajes
- ✅ Diseño responsive
- ✅ Animaciones suaves
- ✅ Colores de la aplicación (#004684 y #ce0e2d)

### Temas que el Chatbot Entiende (sin IA):

Si no configuras el token de Hugging Face, el chatbot tiene respuestas inteligentes sobre:

- Gestión de cursos
- Gestión de docentes
- Estadísticas del sistema
- Ayuda general
- Saludos y despedidas

## Limitaciones de la API Gratuita

La API de Hugging Face tiene algunas limitaciones en el plan gratuito:

- **Rate Limit:** ~30 solicitudes por minuto
- **Primera llamada:** Puede tardar 10-20 segundos (el modelo se "despierta")
- **Llamadas subsecuentes:** 1-3 segundos

## Alternativas Self-Hosted

Si deseas mayor control y velocidad, puedes hospedar el modelo localmente:

### Opción 1: Transformers.js (Cliente)
```bash
npm install @xenova/transformers
```

### Opción 2: Python Backend (Servidor)
```bash
pip install transformers torch
```

### Opción 3: Ollama (Local)
```bash
# Instalar Ollama
curl https://ollama.ai/install.sh | sh

# Descargar modelo
ollama pull llama2
```

## Soporte

Para más información sobre los modelos:
- [Hugging Face Models](https://huggingface.co/models)
- [Hugging Face API Docs](https://huggingface.co/docs/api-inference/index)
- [BlenderBot Paper](https://arxiv.org/abs/2004.13637)

## Licencia

El modelo BlenderBot está bajo licencia Apache 2.0, permitiendo uso comercial y modificación.

