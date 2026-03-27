# 🔧 Modo Desarrollador - Configuración Multi-Institución

## Descripción General

El **Modo Desarrollador** permite a cualquier institución educativa personalizar completamente el sistema de gestión académica sin modificar el código fuente. Cada institución puede configurar su propia marca, colores, logos y datos de contacto, manteniendo la misma estructura y funcionalidades.

---

## 🚀 Características Principales

### ✅ Personalización Completa
- **Nombre de la institución** (completo y corto)
- **Lema o slogan** institucional
- **Logo principal** y favicon
- **Imagen de fondo** personalizada
- **Paleta de colores** completa (11 colores personalizables)
- **Información de contacto** (email, teléfono, WhatsApp, dirección, sitio web, horarios)
- **Características del sistema** (habilitar/deshabilitar módulos)

### 🎨 Sistema de Temas Dinámico
- Los colores se aplican **en tiempo real** usando CSS Variables
- Soporte para colores primarios, secundarios, de acento y de estado (error, éxito, advertencia, info)
- Versiones con transparencia generadas automáticamente
- Sin necesidad de recompilar el proyecto

### 💾 Almacenamiento en Firebase
- Configuración guardada en Firebase Realtime Database
- Sincronización automática entre sesiones
- Respaldo y restauración de configuraciones

### 📥📤 Importar/Exportar Configuración
- Exporta la configuración como archivo JSON
- Importa configuraciones predefinidas
- Comparte configuraciones entre instituciones

---

## 🔐 Acceso al Modo Desarrollador

### Paso 1: Acceder al Panel
1. Desde la página principal, haz clic en el botón **"Configuración"** en la parte inferior
2. O navega directamente a: `http://tudominio.com/developer`

### Paso 2: Autenticación
- **Contraseña por defecto:** `lasalle2024dev`
- ⚠️ **IMPORTANTE:** Cambia esta contraseña en producción editando el archivo:
  ```javascript
  // src/components/DeveloperPanel.jsx
  const DEVELOPER_PASSWORD = 'tu_nueva_contraseña_segura';
  ```

---

## 📝 Configuración Paso a Paso

### 1️⃣ Información Básica
**Ruta:** Pestaña "Información Básica"

- **Nombre Completo:** El nombre oficial de tu institución
  - Ejemplo: `Universidad Tecnológica de México`
- **Nombre Corto:** Versión abreviada
  - Ejemplo: `UNITEC`
- **Lema o Slogan:** Frase representativa
  - Ejemplo: `Innovación y Excelencia`

### 2️⃣ Marca e Imágenes
**Ruta:** Pestaña "Marca e Imágenes"

#### Logo Principal (Obligatorio)
- Formato recomendado: PNG con fondo transparente
- Tamaño recomendado: 400x400px mínimo
- URL pública de la imagen
- Ejemplo: `https://tudominio.com/logo.png`

#### Favicon (Opcional)
- Formato: ICO, PNG (16x16, 32x32, 48x48)
- URL pública del favicon

#### Imagen de Fondo (Opcional)
- Formato: JPG, PNG
- Tamaño: 1920x1080px o superior
- URL pública de la imagen

> 💡 **Tip:** Puedes usar servicios gratuitos como:
> - Firebase Storage
> - Imgur
> - Cloudinary
> - GitHub Pages

### 3️⃣ Colores del Tema
**Ruta:** Pestaña "Colores del Tema"

Personaliza los 11 colores del sistema:

| Color | Uso | Ejemplo |
|-------|-----|---------|
| **Primario** | Botones principales, encabezados | `#1e3a8a` |
| **Secundario** | Elementos secundarios, badges | `#10b981` |
| **Acento** | Destacados, llamadas a la acción | `#f59e0b` |
| **Fondo** | Fondo general de la aplicación | `#f8fafc` |
| **Superficie** | Tarjetas y contenedores | `#ffffff` |
| **Texto Principal** | Texto del cuerpo | `#1e293b` |
| **Texto Secundario** | Texto de apoyo | `#64748b` |
| **Error** | Mensajes de error | `#ef4444` |
| **Éxito** | Confirmaciones | `#10b981` |
| **Advertencia** | Alertas | `#f59e0b` |
| **Información** | Mensajes informativos | `#3b82f6` |

#### Cómo Elegir Colores
1. Usa el selector de color visual
2. O ingresa el código hexadecimal directamente
3. Haz clic en **"Vista Previa"** para ver los cambios temporalmente
4. Guarda cuando estés satisfecho

> 🎨 **Recomendación:** Usa herramientas como [Coolors.co](https://coolors.co) o [Adobe Color](https://color.adobe.com) para crear paletas armónicas.

### 4️⃣ Información de Contacto
**Ruta:** Pestaña "Contacto"

Configura todos los datos de contacto:

- **Correo Electrónico:** contacto@tuinstitucion.edu.mx
- **Teléfono:** +52 55 1234 5678
- **WhatsApp:** +52 55 1234 5678 (puede ser diferente al teléfono)
- **Dirección:** Dirección completa del campus
- **Sitio Web:** https://www.tuinstitucion.edu.mx
- **Horario de Atención:** Texto libre con los horarios

Estos datos se mostrarán en:
- Respuestas del ChatBot
- Footer del sistema
- Páginas de contacto

### 5️⃣ Características del Sistema
**Ruta:** Pestaña "Características"

Habilita o deshabilita módulos:

- ✅ **ChatBot con IA:** Asistente virtual inteligente
- ✅ **Estadísticas:** Reportes y gráficas
- ✅ **Reportes PDF:** Generación de documentos
- ✅ **Modo Oscuro:** Tema oscuro (próximamente)
- ✅ **Multi-idioma:** Soporte para varios idiomas (próximamente)

---

## 💾 Gestión de Configuraciones

### Guardar Cambios
1. Haz todos los cambios necesarios en las pestañas
2. Haz clic en **"Guardar y Aplicar Cambios"**
3. Los cambios se aplicarán inmediatamente
4. Se guardará en Firebase automáticamente

### Exportar Configuración
1. Haz clic en **"Exportar Configuración"**
2. Se descargará un archivo JSON con toda la configuración
3. Guárdalo como respaldo o para compartir

### Importar Configuración
1. Haz clic en **"Importar Configuración"**
2. Selecciona un archivo JSON previamente exportado
3. La configuración se cargará automáticamente
4. Revisa los cambios antes de guardar

### Restablecer a La Salle
- Haz clic en **"Restablecer a La Salle"**
- Se restaurará la configuración predeterminada de La Salle Nezahualcóyotl
- Esta acción requiere confirmación

---

## 🔄 Aplicación de Cambios

Los cambios se aplican de las siguientes maneras:

### Cambios Inmediatos (Sin Recargar)
- Colores del tema
- Información de contacto en el ChatBot
- Características habilitadas/deshabilitadas

### Cambios que Requieren Recarga
- Logo principal
- Favicon
- Nombre de la institución (en algunos componentes)

Para ver todos los cambios:
1. Guarda la configuración
2. Recarga la página (F5)
3. Verifica todos los componentes

---

## 🎯 Casos de Uso

### Caso 1: Nueva Institución desde Cero
```javascript
1. Acceder al Modo Desarrollador
2. Información Básica:
   - Nombre: "Instituto Politécnico Nacional"
   - Nombre Corto: "IPN"
   - Slogan: "La Técnica al Servicio de la Patria"
3. Marca e Imágenes:
   - Logo: URL del logo del IPN
4. Colores:
   - Primario: #8B1538 (Guinda IPN)
   - Secundario: #FFFFFF (Blanco)
5. Contacto:
   - Email: contacto@ipn.mx
   - Teléfono: +52 55 5729 6000
6. Guardar cambios
```

### Caso 2: Cambiar Solo Colores Institucionales
```javascript
1. Acceder al Modo Desarrollador
2. Ir a pestaña "Colores del Tema"
3. Modificar colores según identidad institucional
4. Hacer "Vista Previa"
5. Si todo está bien, "Guardar y Aplicar"
```

### Caso 3: Actualizar Información de Contacto
```javascript
1. Acceder al Modo Desarrollador
2. Ir a pestaña "Contacto"
3. Actualizar campos necesarios
4. Guardar cambios
5. Probar el ChatBot para verificar
```

---

## 🛠️ Solución de Problemas

### Problema: Los colores no se aplican
**Solución:**
- Verifica que los colores estén en formato hexadecimal válido (#RRGGBB)
- Recarga la página con Ctrl+F5 (recarga forzada)
- Revisa la consola del navegador (F12) en busca de errores

### Problema: El logo no se muestra
**Solución:**
- Verifica que la URL sea pública y accesible
- Asegúrate de que la imagen no esté bloqueada por CORS
- Prueba abrir la URL en una nueva pestaña
- Formatos soportados: PNG, JPG, SVG

### Problema: No puedo acceder al panel
**Solución:**
- Verifica la contraseña (por defecto: `lasalle2024dev`)
- Revisa la consola del navegador (F12) por errores
- Verifica la conexión a Firebase

### Problema: Los cambios no se guardan
**Solución:**
- Verifica la conexión a internet
- Revisa los permisos de Firebase
- Asegúrate de que Firebase Realtime Database esté habilitado
- Revisa la consola por errores de autenticación

### Problema: Quiero volver a la configuración anterior
**Solución:**
- Si exportaste la configuración: Importa el archivo JSON guardado
- Si no: Haz clic en "Restablecer a La Salle" y personaliza desde ahí

---

## 🔒 Seguridad

### Recomendaciones Importantes

1. **Cambia la Contraseña en Producción**
   ```javascript
   // En DeveloperPanel.jsx, línea ~21
   const DEVELOPER_PASSWORD = 'tu_contraseña_segura_y_compleja';
   ```

2. **Restringe el Acceso**
   - Considera agregar autenticación adicional
   - Implementa roles de usuario en Firebase
   - Limita el acceso solo a administradores autorizados

3. **Respaldos Regulares**
   - Exporta la configuración periódicamente
   - Guarda los JSON en un lugar seguro
   - Documenta todos los cambios realizados

4. **Valida URLs**
   - Solo usa URLs de fuentes confiables
   - Evita URLs de sitios desconocidos
   - Verifica que las imágenes sean legítimas

---

## 📚 Integración con el Sistema

### Componentes que Usan la Configuración

1. **Home** (`/`)
   - Logo principal
   - Nombre de la institución
   - Slogan

2. **LoginAdmin** (`/login-admin`)
   - Logo
   - Nombre de la institución

3. **LoginDocente** (`/login-docente`)
   - Logo
   - Nombre de la institución

4. **ChatBot** (Todas las páginas)
   - Nombre de la institución en respuestas
   - Información de contacto
   - Horarios de atención

5. **AdminPanel** y **DocentePanel**
   - Colores del tema
   - Logo en el header

### Variables CSS Disponibles

```css
/* Colores principales */
--color-primary
--color-secondary
--color-accent

/* Fondos y superficies */
--color-background
--color-surface

/* Textos */
--color-text-primary
--color-text-secondary

/* Estados */
--color-error
--color-success
--color-warning
--color-info

/* Transparencias (generadas automáticamente) */
--color-primary-light
--color-primary-medium
--color-secondary-light
--color-accent-light
```

---

## 🚀 Próximas Mejoras

- [ ] Modo oscuro automático
- [ ] Soporte multi-idioma
- [ ] Editor de temas visual en tiempo real
- [ ] Biblioteca de paletas de colores predefinidas
- [ ] Historial de cambios de configuración
- [ ] Roles de usuario con diferentes permisos
- [ ] API REST para configuración remota
- [ ] Temas predefinidos por industria educativa

---

## 📞 Soporte

Si tienes problemas o preguntas:

1. **Revisa este documento** primero
2. **Consulta la sección de Solución de Problemas**
3. **Revisa la consola del navegador** (F12 → Console)
4. **Contacta al desarrollador del sistema**

---

## 📄 Licencia y Créditos

**Sistema de Gestión Académica - Modo Desarrollador**
- Desarrollado para: Universidad La Salle Nezahualcóyotl
- Compatible con: Cualquier institución educativa
- Tecnologías: React, Firebase, CSS Variables
- Versión: 1.0.0

---

## ✨ Conclusión

El Modo Desarrollador te permite crear una experiencia completamente personalizada para tu institución sin tocar una sola línea de código. Mantén todos los beneficios del sistema de gestión académica con la identidad visual de tu institución.

**¡Disfruta personalizando tu sistema!** 🎨🎓


