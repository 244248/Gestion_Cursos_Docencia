# 🤖 Instalación de Ollama + Modelo de IA

## 📥 Paso 1: Descargar Ollama

### Opción A - Descarga Directa (Recomendado)
1. Ve a: https://ollama.com/download
2. Descarga el instalador para Windows
3. Ejecuta `OllamaSetup.exe`
4. Sigue el asistente de instalación

### Opción B - PowerShell
Ejecuta este comando en PowerShell:
```powershell
Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile "$env:USERPROFILE\Downloads\OllamaSetup.exe"
```

Luego ejecuta el instalador descargado.

### Opción C - Winget
```powershell
winget install Ollama.Ollama
```

---

## 🚀 Paso 2: Verificar Instalación

Abre una nueva terminal PowerShell y ejecuta:
```powershell
ollama --version
```

Deberías ver la versión de Ollama instalada.

---

## 📦 Paso 3: Descargar Modelo de IA (Llama 3.1)

Una vez instalado Ollama, descarga el modelo ejecutando:

```powershell
ollama pull llama3.1:8b
```

**Esto descargará aproximadamente 4.7 GB**

### Modelos Alternativos (opcionales):

**Modelo más ligero (recomendado para PCs con poca RAM):**
```powershell
ollama pull llama3.2:3b
```
Tamaño: ~2 GB

**Modelo más potente (si tienes buena PC):**
```powershell
ollama pull llama3.1:70b
```
Tamaño: ~40 GB

**Mistral (alternativa rápida):**
```powershell
ollama pull mistral:7b
```
Tamaño: ~4.1 GB

---

## ✅ Paso 4: Verificar que el Modelo Funciona

Prueba el modelo con:
```powershell
ollama run llama3.1:8b "Hola, ¿cómo estás?"
```

---

## 🔧 Paso 5: Configurar el Chatbot

El chatbot ya está configurado para usar Ollama automáticamente. 

### Configuración por defecto:
- **URL:** `http://localhost:11434`
- **Modelo:** `llama3.1:8b`
- **Puerto:** 11434

Ollama se ejecuta automáticamente en segundo plano al iniciar Windows.

---

## 🎯 Paso 6: Probar el Chatbot

1. Inicia tu aplicación React:
```bash
cd react-gestion-app
npm start
```

2. Abre el chatbot en la aplicación

3. El sistema detectará automáticamente si Ollama está disponible

4. Si Ollama está corriendo, verás respuestas generadas por IA

---

## 🔍 Verificar Estado de Ollama

Para ver si Ollama está corriendo:
```powershell
ollama list
```

Para ver los modelos descargados:
```powershell
ollama list
```

Para iniciar Ollama manualmente:
```powershell
ollama serve
```

---

## ⚙️ Configuración Avanzada

Si quieres cambiar el modelo que usa el chatbot, modifica en `src/services/AIService.js`:

```javascript
this.model = 'llama3.1:8b'; // Cambia aquí
```

Modelos disponibles:
- `llama3.1:8b` (Rápido, 4.7GB)
- `llama3.2:3b` (Muy rápido, 2GB)
- `llama3.1:70b` (Mejor calidad, 40GB)
- `mistral:7b` (Alternativa, 4.1GB)

---

## 🐛 Solución de Problemas

### Ollama no se reconoce como comando
- Reinicia la terminal o PC después de instalar
- Verifica que Ollama esté en PATH

### El chatbot no usa IA
- Verifica que Ollama esté corriendo: `ollama list`
- Verifica que el modelo esté descargado: `ollama list`
- Revisa la consola del navegador para errores

### Error de conexión
- Asegúrate de que Ollama esté corriendo en `http://localhost:11434`
- El firewall puede estar bloqueando la conexión

---

## 📊 Requisitos del Sistema

**Mínimo:**
- RAM: 8 GB
- Espacio: 10 GB libre
- CPU: Procesador moderno

**Recomendado:**
- RAM: 16 GB o más
- Espacio: 20 GB libre
- GPU: Opcional, mejora el rendimiento

---

## ✨ ¡Listo!

Una vez completados todos los pasos, tu chatbot tendrá:
- ✅ Respuestas predefinidas inteligentes
- ✅ IA Open Source con Llama 3.1
- ✅ Fallback automático si la IA no está disponible
- ✅ Sin envío de datos a servicios externos
- ✅ Todo funciona localmente

El sistema seguirá funcionando perfectamente incluso si Ollama no está instalado, usando las respuestas predefinidas mejoradas.

