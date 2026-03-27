import { ref, get, set, onValue } from 'firebase/database';
import { rtdb } from '../firebase/config';

/**
 * Servicio de Configuración Institucional
 * Permite a diferentes instituciones personalizar el sistema
 */
class InstitutionConfigService {
  constructor() {
    this.currentConfig = null;
    this.listeners = [];
    this.configListener = null;
    this.defaultConfig = {
      // Información básica
      institutionName: 'Universidad La Salle Nezahualcóyotl',
      institutionShortName: 'La Salle Neza',
      institutionSlogan: 'Indivisa Manent',
      institutionDescription: 'Institución educativa de excelencia',
      institutionMission: 'Formar profesionales íntegros y competentes',
      institutionVision: 'Ser referente en educación superior',
      
      // Imágenes y logos
      logoUrl: 'https://lasalleneza.btl.mx/wp-content/uploads/2024/02/WhatsAppLaSalleNeza.jpg',
      faviconUrl: '',
      backgroundImageUrl: '',
      bannerUrl: '',
      footerLogoUrl: '',
      
      // Colores del tema (hexadecimales)
      colors: {
        primary: '#004684',        // Azul La Salle / Principal
        primaryLight: '#1a4a9d',   // Principal claro
        primaryDark: '#001c54',    // Principal oscuro
        secondary: '#ce0e2d',      // Rojo La Salle / Secundario
        accent: '#f59e0b',         // Amarillo acento
        accentLight: '#ffe066',    // Acento claro
        accentDark: '#e6b800',     // Acento oscuro
        
        // Colores de Marca Específicos
        brandBlue: '#004684',      // --azul-lasalle
        brandBlueLight: '#0b6eca', // --azul-claro
        brandBlueHover: '#005b9f', // --azul-hover
        brandRed: '#ce0e2d',       // --rojo-lasalle
        brandRedHover: '#b50d27',  // --rojo-hover
        brandYellow: '#ffd700',    // --amarillo-lasalle
        
        background: '#f8fafc',     // Fondo claro
        surface: '#ffffff',        // Superficie blanca
        textPrimary: '#1e293b',    // Texto principal
        textSecondary: '#64748b',  // Texto secundario
        error: '#ef4444',          // Rojo error
        success: '#10b981',        // Verde éxito
        warning: '#f59e0b',        // Amarillo advertencia
        info: '#3b82f6'            // Azul información
      },
      
      // Información de contacto
      contact: {
        email: 'soporte@lasallenezahualcoyotl.edu.mx',
        phone: '+52 55 1234 5678',
        whatsapp: '+52 55 1234 5678',
        address: 'Nezahualcóyotl, Estado de México',
        city: 'Nezahualcóyotl',
        state: 'Estado de México',
        country: 'México',
        zipCode: '57000',
        website: 'https://lasallenezahualcoyotl.edu.mx',
        scheduleText: 'Lunes a Viernes: 8:00 - 18:00, Sábados: 9:00 - 14:00',
        mapUrl: ''
      },
      
      // Redes sociales
      socialMedia: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: '',
        tiktok: '',
        pinterest: ''
      },
      
      // SEO y metadatos
      seo: {
        metaDescription: 'Sistema de gestión académica',
        metaKeywords: 'educación, universidad, gestión académica',
        ogImage: '',
        ogTitle: '',
        ogDescription: ''
      },
      
      // Configuración del sistema
      features: {
        chatbotEnabled: true,
        statisticsEnabled: true,
        reportsEnabled: true,
        multiLanguage: false,
        darkModeEnabled: true,
        notificationsEnabled: true,
        emailNotificationsEnabled: false,
        smsNotificationsEnabled: false,
        calendarEnabled: true,
        forumEnabled: false,
        blogEnabled: false
      },
      
      // Configuración de interfaz
      uiSettings: {
        showWelcomeMessage: true,
        welcomeMessage: 'Bienvenido al sistema de gestión académica',
        showInstitutionSlogan: true,
        showFooter: true,
        footerText: '',
        animationsEnabled: true,
        compactMode: false,
        sidebarPosition: 'left'
      },
      
      // Configuraciones específicas por interfaz
      interfaceSettings: {
        home: {
          heroBackgroundColor: '#003366',
          heroBorderRadius: '15',
          buttonPrimaryColor: '#ff9900',
          buttonHoverColor: '#ffb733',
          featureCardShadow: '10',
          featureIconSize: '48'
        },
        admin: {
          sidebarBackgroundStart: '#1e3a8a',
          sidebarBackgroundEnd: '#002244',
          sidebarTextColor: '#ffffff',
          buttonAddColor: '#1e40af',
          buttonEditColor: '#f59e0b',
          buttonDeleteColor: '#ef4444',
          buttonViewColor: '#0891b2',
          tableHeaderColor: '#1e3a8a',
          tableRowHoverColor: '#f1f5f9',
          tableBorderRadius: '15'
        },
        docente: {
          headerBackgroundStart: '#003087',
          headerBackgroundEnd: '#001c54',
          headerTextColor: '#ffffff',
          filterButtonColor: '#003087',
          filterButtonActiveColor: '#1a4a9d',
          courseCardShadow: '10',
          courseCardBorderRadius: '12',
          courseCardHoverScale: '1.02',
          tableHeaderColor: '#003087'
        },
        loginDocente: {
          backgroundGradientStart: '#667eea',
          backgroundGradientEnd: '#764ba2',
          formPanelBackground: '#ffffff',
          cardBorderRadius: '20',
          cardShadow: '20',
          inputBorderColor: '#e2e8f0',
          inputFocusColor: '#667eea',
          buttonLoginColor: '#667eea',
          illustrationPanelColor: '#f8fafc'
        },
        loginAdmin: {
          backgroundGradientStart: '#1e3a8a',
          backgroundGradientEnd: '#0c1e3a',
          formPanelBackground: '#ffffff',
          cardBorderRadius: '20',
          cardShadow: '20',
          inputBorderColor: '#e2e8f0',
          inputFocusColor: '#1e3a8a',
          buttonLoginColor: '#1e3a8a',
          illustrationPanelColor: '#f0f4ff'
        }
      },
      
      // Metadatos
      lastUpdated: new Date().toISOString(),
      version: '1.1.0'
    };
  }

  /**
   * Cargar configuración desde Firebase
   */
  async loadConfig() {
    try {
      const configRef = ref(rtdb, 'institutionConfig');
      const snapshot = await get(configRef);
      
      if (snapshot.exists()) {
        this.currentConfig = snapshot.val();
        console.log('✅ Configuración institucional cargada:', this.currentConfig.institutionName);
      } else {
        // Si no existe configuración, usar la predeterminada
        console.log('⚠️ No hay configuración guardada. Usando configuración por defecto.');
        this.currentConfig = this.defaultConfig;
        // Guardar configuración por defecto
        await this.saveConfig(this.defaultConfig);
      }
      
      // Aplicar tema CSS e interfaceSettings
      // Usar requestAnimationFrame para asegurar que se ejecute después de que se carguen los CSS
      requestAnimationFrame(() => {
        this.applyTheme(this.currentConfig.colors, this.currentConfig.interfaceSettings);
      });
      
      // Iniciar listener en tiempo real si no existe
      if (!this.configListener) {
        this.startRealtimeListener();
      }
      
      return this.currentConfig;
    } catch (error) {
      console.error('❌ Error al cargar configuración:', error);
      this.currentConfig = this.defaultConfig;
      return this.defaultConfig;
    }
  }

  /**
   * Iniciar listener en tiempo real para cambios en la configuración
   */
  startRealtimeListener() {
    const configRef = ref(rtdb, 'institutionConfig');
    this.configListener = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const newConfig = snapshot.val();
        const oldConfig = this.currentConfig;
        this.currentConfig = newConfig;
        
        // Aplicar tema y configuraciones de interfaz automáticamente
        requestAnimationFrame(() => {
          this.applyTheme(newConfig.colors, newConfig.interfaceSettings);
        });
        
        // Actualizar título y favicon
        this.updatePageTitle(newConfig.institutionName);
        if (newConfig.faviconUrl) {
          this.updateFavicon(newConfig.faviconUrl);
        }
        
        // Notificar a todos los listeners
        this.notifyListeners(newConfig, oldConfig);
        
        console.log('🔄 Configuración actualizada en tiempo real');
      }
    });
  }

  /**
   * Suscribirse a cambios en la configuración
   */
  subscribe(callback) {
    this.listeners.push(callback);
    // Retornar función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notificar a todos los listeners sobre cambios
   */
  notifyListeners(newConfig, oldConfig) {
    this.listeners.forEach(listener => {
      try {
        listener(newConfig, oldConfig);
      } catch (error) {
        console.error('Error en listener de configuración:', error);
      }
    });
  }

  /**
   * Guardar configuración en Firebase
   */
  async saveConfig(config) {
    try {
      const configRef = ref(rtdb, 'institutionConfig');
      const updatedConfig = {
        ...config,
        lastUpdated: new Date().toISOString()
      };
      
      await set(configRef, updatedConfig);
      this.currentConfig = updatedConfig;
      
      // Aplicar tema y configuraciones de interfaz inmediatamente
      requestAnimationFrame(() => {
        this.applyTheme(updatedConfig.colors, updatedConfig.interfaceSettings);
      });
      
      console.log('✅ Configuración guardada exitosamente');
      return { success: true, config: updatedConfig };
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener configuración actual
   */
  getConfig() {
    return this.currentConfig || this.defaultConfig;
  }

  /**
   * Restablecer a configuración por defecto
   */
  async resetToDefault() {
    return await this.saveConfig(this.defaultConfig);
  }

  /**
   * Aplicar tema CSS dinámicamente
   */
  applyTheme(colors, interfaceSettings = null) {
    if (!colors) return;
    
    const root = document.documentElement;
    
    // Aplicar variables CSS de colores principales
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--primary-color', colors.primary); // Compatibilidad
    
    root.style.setProperty('--color-primary-light', colors.primaryLight || this.hexToRgba(colors.primary, 0.8));
    root.style.setProperty('--primary-light', colors.primaryLight || this.hexToRgba(colors.primary, 0.8));
    
    root.style.setProperty('--color-primary-dark', colors.primaryDark || this.hexToRgba(colors.primary, 1)); // Fallback mejorable
    root.style.setProperty('--primary-dark', colors.primaryDark || colors.primary);
    
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--accent-color', colors.accent);
    
    root.style.setProperty('--accent-light', colors.accentLight || this.hexToRgba(colors.accent, 0.8));
    root.style.setProperty('--accent-dark', colors.accentDark || colors.accent);
    
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-text-primary', colors.textPrimary);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-info', colors.info);
    
    // Aplicar colores de estado SIN prefijo (usados directamente en CSS)
    root.style.setProperty('--success-color', colors.success);
    root.style.setProperty('--error-color', colors.error);
    root.style.setProperty('--warning-color', colors.warning);
    root.style.setProperty('--info-color', colors.info);
    
    // También aplicar variantes de colores de estado si existen
    root.style.setProperty('--success-light', colors.successLight || this.hexToRgba(colors.success, 0.8));
    root.style.setProperty('--success-dark', colors.successDark || colors.success);
    root.style.setProperty('--error-light', colors.errorLight || this.hexToRgba(colors.error, 0.8));
    root.style.setProperty('--error-dark', colors.errorDark || colors.error);
    root.style.setProperty('--warning-light', colors.warningLight || this.hexToRgba(colors.warning, 0.8));
    root.style.setProperty('--warning-dark', colors.warningDark || colors.warning);
    root.style.setProperty('--info-light', colors.infoLight || this.hexToRgba(colors.info, 0.8));
    root.style.setProperty('--info-dark', colors.infoDark || colors.info);
    
    // Colores de Marca (Nuevos) - Aplicar valores con fallbacks apropiados
    root.style.setProperty('--azul-lasalle', colors.brandBlue || colors.primary);
    root.style.setProperty('--azul-claro', colors.brandBlueLight || colors.primaryLight || '#0b6eca');
    root.style.setProperty('--azul-hover', colors.brandBlueHover || colors.primary || '#005b9f');
    root.style.setProperty('--rojo-lasalle', colors.brandRed || colors.secondary);
    root.style.setProperty('--rojo-hover', colors.brandRedHover || colors.secondary || '#b50d27');
    root.style.setProperty('--amarillo-lasalle', colors.brandYellow || colors.accent || '#ffd700');
    
    // Versiones con transparencia (Generadas automáticamente si no existen)
    root.style.setProperty('--color-primary-light-alpha', this.hexToRgba(colors.primary, 0.1));
    root.style.setProperty('--color-primary-medium', this.hexToRgba(colors.primary, 0.5));
    root.style.setProperty('--color-secondary-light', this.hexToRgba(colors.secondary, 0.1));
    root.style.setProperty('--color-accent-light', this.hexToRgba(colors.accent, 0.1));
    
    // Crear un estilo dinámico para sobrescribir variables hardcodeadas en CSS
    // Esto asegura que nuestras variables tengan prioridad sobre los valores en :root de los archivos CSS
    let dynamicStyle = document.getElementById('institution-theme-override');
    if (!dynamicStyle) {
      dynamicStyle = document.createElement('style');
      dynamicStyle.id = 'institution-theme-override';
      dynamicStyle.setAttribute('data-priority', '9999');
      // Insertar al final del head para máxima prioridad (después de todos los CSS)
      document.head.appendChild(dynamicStyle);
    } else {
      // Si ya existe, moverlo al final para asegurar máxima prioridad
      dynamicStyle.remove();
      document.head.appendChild(dynamicStyle);
    }
    
    // Calcular colores derivados automáticamente si no existen
    const primaryVars = colors.primaryLight && colors.primaryDark 
      ? { light: colors.primaryLight, dark: colors.primaryDark, hover: colors.primaryLight }
      : this.generateColorVariants(colors.primary);
    const accentVars = colors.accentLight && colors.accentDark
      ? { light: colors.accentLight, dark: colors.accentDark, hover: colors.accentLight }
      : this.generateColorVariants(colors.accent);
    
    const primaryLight = colors.primaryLight || primaryVars.light;
    const primaryDark = colors.primaryDark || primaryVars.dark;
    const accentLight = colors.accentLight || accentVars.light;
    const accentDark = colors.accentDark || accentVars.dark;
    
    // Calcular colores de marca
    const brandBlue = colors.brandBlue || colors.primary;
    const brandBlueLight = colors.brandBlueLight || primaryVars.light;
    const brandBlueHover = colors.brandBlueHover || primaryVars.hover;
    const brandRed = colors.brandRed || colors.secondary;
    const brandRedHover = colors.brandRedHover || this.generateColorVariants(colors.secondary).hover;
    const brandYellow = colors.brandYellow || colors.accent;
    
    // Crear CSS completo que sobrescriba TODOS los valores hardcodeados
    dynamicStyle.textContent = `
      /* ===== VARIABLES CSS GLOBALES ===== */
      :root, html, body {
        /* Colores principales */
        --primary-color: ${colors.primary} !important;
        --primary-light: ${primaryLight} !important;
        --primary-dark: ${primaryDark} !important;
        --accent-color: ${colors.accent} !important;
        --accent-light: ${accentLight} !important;
        --accent-dark: ${accentDark} !important;
        
        /* Colores de estado */
        --success-color: ${colors.success} !important;
        --error-color: ${colors.error} !important;
        --warning-color: ${colors.warning} !important;
        --info-color: ${colors.info} !important;
        
        /* Colores de marca institucional */
        --azul-lasalle: ${brandBlue} !important;
        --azul-claro: ${brandBlueLight} !important;
        --azul-hover: ${brandBlueHover} !important;
        --rojo-lasalle: ${brandRed} !important;
        --rojo-hover: ${brandRedHover} !important;
        --amarillo-lasalle: ${brandYellow} !important;
      }
      
      /* ===== APLICACIÓN DIRECTA A ELEMENTOS ===== */
      
      /* ===== ADMINPANEL ===== */
      /* Sidebar completo */
      .sidebar {
        background: linear-gradient(160deg, ${colors.primary} 0%, ${primaryDark} 100%) !important;
      }
      
      /* Títulos de sección del sidebar (CURSOS, DOCENTES, ESTADÍSTICAS) - MÁXIMA ESPECIFICIDAD */
      /* El CSS original usa var(--accent-light), así que aplicamos directamente el color */
      .sidebar .sidebar-section-title,
      .sidebar-section-title,
      nav.sidebar-nav .sidebar-section-title,
      .sidebar nav .sidebar-section-title,
      .sidebar > nav > .sidebar-section-title,
      * .sidebar-section-title {
        color: ${colors.accent} !important;
      }
      
      /* Forzar actualización de la variable que usa el CSS */
      .sidebar {
        --accent-light: ${colors.accent} !important;
      }
      
      .sidebar-nav-link {
        color: var(--white, #ffffff) !important;
      }
      
      .sidebar-nav-link:hover {
        background: ${this.hexToRgba(colors.accent, 0.1)} !important;
      }
      
      /* Item activo del sidebar - Fondo naranja/dorado - MÁXIMA ESPECIFICIDAD */
      .sidebar .sidebar-nav-link.active,
      .sidebar-nav-link.active,
      nav.sidebar-nav .sidebar-nav-link.active,
      .sidebar-nav .sidebar-nav-link.active {
        background: linear-gradient(90deg, ${colors.accent}, ${accentDark}) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 15px ${this.hexToRgba(colors.accent, 0.3)} !important;
      }
      
      .sidebar.collapsed .sidebar-nav-link.active,
      .sidebar.collapsed nav.sidebar-nav .sidebar-nav-link.active {
        background: linear-gradient(135deg, ${colors.accent}, ${accentDark}) !important;
        box-shadow: 0 4px 15px ${this.hexToRgba(colors.accent, 0.4)} !important;
      }
      
      .sidebar-nav-link.active:hover {
        background: linear-gradient(90deg, ${colors.accent}, ${accentDark}) !important;
      }
      
      /* Animación del item activo con color del tema - SOBRESCRIBIR LA ANIMACIÓN EXISTENTE */
      @keyframes activeItemGlow {
        0%, 100% {
          box-shadow: 0 4px 15px ${this.hexToRgba(colors.accent, 0.3)} !important;
        }
        50% {
          box-shadow: 0 6px 20px ${this.hexToRgba(colors.accent, 0.5)} !important;
        }
      }
      
      /* Forzar que la animación use el nuevo keyframe */
      .sidebar-nav-link.active {
        animation: activeItemGlow 2s ease-in-out infinite !important;
      }
      
      /* Header principal */
      .main-header, header.main-header {
        background: linear-gradient(135deg, ${primaryDark} 0%, ${colors.primary} 100%) !important;
      }
      
      /* Botones de acción - Ver (azul) */
      .btn-info, .view-btn, button[title*="Ver"], button[title*="View"],
      .action-btn.view, .btn-view, .btn-circle[style*="blue"] {
        background-color: ${colors.info} !important;
        border-color: ${colors.info} !important;
        color: #ffffff !important;
      }
      
      /* Botones de acción - Editar (amarillo) */
      .btn-warning, .edit-btn, button[title*="Editar"], button[title*="Edit"],
      .action-btn.edit, .btn-edit, .btn-circle[style*="yellow"] {
        background-color: ${colors.warning} !important;
        border-color: ${colors.warning} !important;
        color: #ffffff !important;
      }
      
      /* Botones de acción - Eliminar (rojo) */
      .btn-danger, .delete-btn, button[title*="Eliminar"], button[title*="Delete"],
      .action-btn.delete, .btn-delete, .btn-circle[style*="red"] {
        background-color: ${colors.error} !important;
        border-color: ${colors.error} !important;
        color: #ffffff !important;
      }
      
      /* Botones de acción - Agregar/Asignar (azul primario) */
      .btn-primary, .add-btn, button[title*="Agregar"], button[title*="Add"],
      .action-btn.add, .btn-add, .btn-circle[style*="primary"] {
        background-color: ${colors.primary} !important;
        border-color: ${colors.primary} !important;
        color: #ffffff !important;
      }
      
      /* Botones de éxito */
      .btn-success {
        background-color: ${colors.success} !important;
        border-color: ${colors.success} !important;
        color: #ffffff !important;
      }
      
      /* Tablas - Headers */
      .table thead, .data-table-header, .courses-table thead,
      .teachers-table thead, .modal-courses-table thead,
      .teacher-selection-table thead {
        background: linear-gradient(135deg, ${colors.primary}, ${primaryDark}) !important;
        color: #ffffff !important;
      }
      
      /* Línea dorada/amarilla debajo del header de tabla - MÁXIMA ESPECIFICIDAD */
      .table thead th,
      .courses-table thead th,
      .teachers-table thead th,
      .modal-courses-table thead th,
      .teacher-selection-table thead th,
      .data-table-header th,
      table thead th,
      thead th {
        border-bottom: 2px solid ${colors.accent} !important;
        border-bottom-color: ${colors.accent} !important;
      }
      
      /* Asegurar que todas las tablas usen el color de acento */
      .courses-table thead th,
      .teachers-table thead th {
        border-bottom: 2px solid ${colors.accent} !important;
      }
      
      /* Headers de mini modales */
      .mini-modal-header {
        border-bottom: 2px solid ${colors.accent} !important;
        background: linear-gradient(135deg, ${colors.primary}, ${primaryDark}) !important;
      }
      
      /* Tablas - Filas hover */
      .table tbody tr:hover, .data-row:hover {
        background-color: ${this.hexToRgba(colors.primary, 0.05)} !important;
      }
      
      /* Badges y Pills de categoría */
      .badge, .pill, .category-badge, [class*="category"],
      .btn-sm[class*="BÁSICOS"], .btn-sm[class*="TECNOLOGÍAS"],
      .btn-sm[class*="AVANZADOS"], .btn-sm[class*="ESPECIALIZACIÓN"] {
        background-color: ${colors.primary} !important;
        color: #ffffff !important;
      }
      
      /* Títulos de sección en sidebar */
      .sidebar-section-title, [class*="section-title"] {
        color: ${colors.accent} !important;
      }
      
      /* ===== DOCENTEPANEL ===== */
      /* Header */
      header:not(.main-header) {
        background: linear-gradient(135deg, ${colors.primary} 0%, ${primaryDark} 100%) !important;
        color: #ffffff !important;
      }
      
      /* Botones de filtro */
      .filter-btn {
        background-color: ${colors.primary} !important;
        border-color: ${colors.primary} !important;
        color: #ffffff !important;
      }
      
      .filter-btn:hover, .filter-btn.active {
        background-color: ${primaryLight} !important;
        border-color: ${primaryLight} !important;
        color: #ffffff !important;
      }
      
      /* ===== HOME ===== */
      /* Botones principales */
      .btn-docente, .btn-docente:hover {
        background: linear-gradient(120deg, ${brandBlue}, ${brandBlueLight}) !important;
        border: none !important;
        color: #ffffff !important;
      }
      
      .btn-admin, .btn-admin:hover {
        background: linear-gradient(120deg, ${brandRed}, ${brandRedHover}) !important;
        border: none !important;
        color: #ffffff !important;
      }
      
      /* ===== LOGIN ===== */
      /* Botones de login */
      .btn-primary, .login-btn {
        background: ${brandRed} !important;
        border-color: ${brandRed} !important;
        color: #ffffff !important;
      }
      
      .btn-primary:hover, .login-btn:hover {
        background: ${brandRedHover} !important;
        border-color: ${brandRedHover} !important;
        color: #ffffff !important;
      }
      
      /* Gradientes de fondo en login */
      .login-form-panel {
        background: linear-gradient(150deg,
          ${this.hexToRgba(brandBlue, 0.42)} 0%,
          rgba(255, 255, 255, 0.92) 50%,
          ${this.hexToRgba(brandRed, 0.4)} 100%) !important;
      }
      
      /* ===== ELEMENTOS GENERALES ===== */
      /* Links y textos primarios */
      a:not(.sidebar-nav-link):not(.btn) {
        color: ${colors.info} !important;
      }
      
      a:hover:not(.sidebar-nav-link):not(.btn) {
        color: ${colors.primary} !important;
      }
      
      /* Iconos con color primario */
      i[class*="primary"], .icon-primary {
        color: ${colors.primary} !important;
      }
      
      /* Bordes y líneas de separación */
      hr, .divider {
        border-color: ${this.hexToRgba(colors.primary, 0.2)} !important;
      }
      
      /* Cards y contenedores con borde primario */
      .card, .panel {
        border-left-color: ${colors.primary} !important;
      }
      
      /* Progress bars */
      .progress-bar {
        background-color: ${colors.primary} !important;
      }
      
      /* Spinners y loaders */
      .spinner, .loader {
        border-top-color: ${colors.primary} !important;
      }
    `;
    
    console.log('🎨 Tema aplicado completamente:', {
      primary: colors.primary,
      brandBlue: brandBlue,
      brandRed: brandRed,
      accent: colors.accent,
      accentLight: accentLight,
      accentDark: accentDark,
      'Variables aplicadas': {
        '--accent-color': colors.accent,
        '--accent-light': accentLight,
        '--accent-dark': accentDark
      }
    });
    
    // Forzar actualización de estilos después de un breve delay para asegurar que se apliquen
    setTimeout(() => {
      // Re-aplicar las variables CSS directamente en el root
      const root = document.documentElement;
      root.style.setProperty('--accent-color', colors.accent, 'important');
      root.style.setProperty('--accent-light', accentLight, 'important');
      root.style.setProperty('--accent-dark', accentDark, 'important');
    }, 100);
    
    // Aplicar configuraciones de interfaz si están disponibles
    if (interfaceSettings) {
      this.applyInterfaceSettings(interfaceSettings);
    }
    
    console.log('🎨 Tema aplicado exitosamente');
  }

  /**
   * Aplicar configuraciones específicas de interfaz
   */
  applyInterfaceSettings(interfaceSettings) {
    if (!interfaceSettings) return;
    
    const root = document.documentElement;
    
    // Inyectar estilos CSS dinámicos
    let styleElement = document.getElementById('institution-interface-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'institution-interface-styles';
      document.head.appendChild(styleElement);
    }
    
    let cssRules = '';
    
    // Aplicar configuraciones de DOCENTE
    if (interfaceSettings.docente) {
      const docente = interfaceSettings.docente;
      root.style.setProperty('--docente-header-start', docente.headerBackgroundStart);
      root.style.setProperty('--docente-header-end', docente.headerBackgroundEnd);
      root.style.setProperty('--docente-header-text', docente.headerTextColor);
      root.style.setProperty('--docente-filter-btn', docente.filterButtonColor);
      root.style.setProperty('--docente-filter-active', docente.filterButtonActiveColor);
      root.style.setProperty('--docente-card-shadow', `0 ${docente.courseCardShadow}px ${docente.courseCardShadow * 2}px rgba(0,0,0,0.15)`);
      root.style.setProperty('--docente-card-radius', `${docente.courseCardBorderRadius}px`);
      root.style.setProperty('--docente-card-scale', docente.courseCardHoverScale);
      root.style.setProperty('--docente-table-header', docente.tableHeaderColor);
      
      cssRules += `
        /* DocentePanel - Configuración Institucional */
        header {
          background: linear-gradient(135deg, ${docente.headerBackgroundStart} 0%, ${docente.headerBackgroundEnd} 100%) !important;
          color: ${docente.headerTextColor} !important;
        }
        
        .filter-btn {
          background-color: ${docente.filterButtonColor} !important;
          border-color: ${docente.filterButtonColor} !important;
        }
        
        .filter-btn:hover {
          background-color: ${docente.filterButtonActiveColor} !important;
          border-color: ${docente.filterButtonActiveColor} !important;
        }
        
        .filter-btn.active {
          background-color: ${docente.filterButtonActiveColor} !important;
          border-color: ${docente.filterButtonActiveColor} !important;
          box-shadow: 0 4px 12px ${docente.filterButtonActiveColor}66 !important;
        }
        
        .summary-card, .course-card {
          box-shadow: 0 ${docente.courseCardShadow}px ${docente.courseCardShadow * 2}px rgba(0,0,0,0.15) !important;
          border-radius: ${docente.courseCardBorderRadius}px !important;
        }
        
        .summary-card:hover, .course-card:hover {
          transform: scale(${docente.courseCardHoverScale}) !important;
        }
        
        .courses-table thead {
          background: linear-gradient(135deg, ${docente.headerBackgroundStart}, ${docente.headerBackgroundEnd}) !important;
          color: ${docente.headerTextColor} !important;
        }
      `;
    }
    
    // Aplicar configuraciones de ADMIN
    if (interfaceSettings.admin) {
      const admin = interfaceSettings.admin;
      root.style.setProperty('--admin-sidebar-start', admin.sidebarBackgroundStart);
      root.style.setProperty('--admin-sidebar-end', admin.sidebarBackgroundEnd);
      root.style.setProperty('--admin-sidebar-text', admin.sidebarTextColor);
      root.style.setProperty('--admin-btn-add', admin.buttonAddColor);
      root.style.setProperty('--admin-btn-edit', admin.buttonEditColor);
      root.style.setProperty('--admin-btn-delete', admin.buttonDeleteColor);
      root.style.setProperty('--admin-btn-view', admin.buttonViewColor);
      root.style.setProperty('--admin-table-header', admin.tableHeaderColor);
      root.style.setProperty('--admin-table-hover', admin.tableRowHoverColor);
      root.style.setProperty('--admin-table-radius', `${admin.tableBorderRadius}px`);
      
      cssRules += `
        /* AdminPanel - Configuración Institucional */
        .sidebar {
          background: linear-gradient(160deg, ${admin.sidebarBackgroundStart} 0%, ${admin.sidebarBackgroundEnd} 100%) !important;
          color: ${admin.sidebarTextColor} !important;
        }
        
        .sidebar-nav a, .sidebar-nav button {
          color: ${admin.sidebarTextColor} !important;
        }
        
        .btn-primary, .add-btn {
          background-color: ${admin.buttonAddColor} !important;
          border-color: ${admin.buttonAddColor} !important;
        }
        
        .btn-warning, .edit-btn {
          background-color: ${admin.buttonEditColor} !important;
          border-color: ${admin.buttonEditColor} !important;
        }
        
        .btn-danger, .delete-btn {
          background-color: ${admin.buttonDeleteColor} !important;
          border-color: ${admin.buttonDeleteColor} !important;
        }
        
        .btn-info, .view-btn {
          background-color: ${admin.buttonViewColor} !important;
          border-color: ${admin.buttonViewColor} !important;
        }
        
        .table thead, .data-table-header {
          background-color: ${admin.tableHeaderColor} !important;
          color: white !important;
        }
        
        .table tbody tr:hover, .data-row:hover {
          background-color: ${admin.tableRowHoverColor} !important;
        }
        
        .data-table, .card, .modal-content {
          border-radius: ${admin.tableBorderRadius}px !important;
        }
      `;
    }
    
    // Aplicar configuraciones de HOME
    if (interfaceSettings.home) {
      const home = interfaceSettings.home;
      root.style.setProperty('--home-hero-bg', home.heroBackgroundColor);
      root.style.setProperty('--home-hero-radius', `${home.heroBorderRadius}px`);
      root.style.setProperty('--home-btn-primary', home.buttonPrimaryColor);
      root.style.setProperty('--home-btn-hover', home.buttonHoverColor);
      root.style.setProperty('--home-card-shadow', `0 ${home.featureCardShadow}px ${home.featureCardShadow * 2}px rgba(0,0,0,0.1)`);
      root.style.setProperty('--home-icon-size', `${home.featureIconSize}px`);
      
      cssRules += `
        /* Home - Configuración Institucional */
        .main-card {
          border-radius: ${home.heroBorderRadius}px !important;
        }
        
        .cta-button, .btn-primary {
          background-color: ${home.buttonPrimaryColor} !important;
          border-color: ${home.buttonPrimaryColor} !important;
        }
        
        .cta-button:hover, .btn-primary:hover {
          background-color: ${home.buttonHoverColor} !important;
          border-color: ${home.buttonHoverColor} !important;
        }
        
        .feature-card, .info-card {
          box-shadow: 0 ${home.featureCardShadow}px ${home.featureCardShadow * 2}px rgba(0,0,0,0.1) !important;
        }
        
        .feature-icon, .icon {
          font-size: ${home.featureIconSize}px !important;
        }
      `;
    }
    
    // Aplicar configuraciones de LOGIN DOCENTE
    if (interfaceSettings.loginDocente) {
      const loginDocente = interfaceSettings.loginDocente;
      root.style.setProperty('--login-docente-bg-start', loginDocente.backgroundGradientStart);
      root.style.setProperty('--login-docente-bg-end', loginDocente.backgroundGradientEnd);
      root.style.setProperty('--login-docente-panel-bg', loginDocente.formPanelBackground);
      root.style.setProperty('--login-docente-card-radius', `${loginDocente.cardBorderRadius}px`);
      root.style.setProperty('--login-docente-card-shadow', `0 ${loginDocente.cardShadow}px ${loginDocente.cardShadow * 2}px rgba(0,0,0,0.3)`);
      root.style.setProperty('--login-docente-input-border', loginDocente.inputBorderColor);
      root.style.setProperty('--login-docente-input-focus', loginDocente.inputFocusColor);
      root.style.setProperty('--login-docente-btn-color', loginDocente.buttonLoginColor);
      root.style.setProperty('--login-docente-illustration', loginDocente.illustrationPanelColor);
    }
    
    // Aplicar configuraciones de LOGIN ADMIN
    if (interfaceSettings.loginAdmin) {
      const loginAdmin = interfaceSettings.loginAdmin;
      root.style.setProperty('--login-admin-bg-start', loginAdmin.backgroundGradientStart);
      root.style.setProperty('--login-admin-bg-end', loginAdmin.backgroundGradientEnd);
      root.style.setProperty('--login-admin-panel-bg', loginAdmin.formPanelBackground);
      root.style.setProperty('--login-admin-card-radius', `${loginAdmin.cardBorderRadius}px`);
      root.style.setProperty('--login-admin-card-shadow', `0 ${loginAdmin.cardShadow}px ${loginAdmin.cardShadow * 2}px rgba(0,0,0,0.3)`);
      root.style.setProperty('--login-admin-input-border', loginAdmin.inputBorderColor);
      root.style.setProperty('--login-admin-input-focus', loginAdmin.inputFocusColor);
      root.style.setProperty('--login-admin-btn-color', loginAdmin.buttonLoginColor);
      root.style.setProperty('--login-admin-illustration', loginAdmin.illustrationPanelColor);
    }
    
    // Aplicar las reglas CSS
    styleElement.textContent = cssRules;
    
    console.log('✨ Configuraciones de interfaz aplicadas');
  }

  /**
   * Convertir hexadecimal a RGBA
   */
  hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Actualizar favicon dinámicamente
   */
  updateFavicon(faviconUrl) {
    if (!faviconUrl) return;
    
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }

  /**
   * Actualizar título de la página
   */
  updatePageTitle(institutionName) {
    if (institutionName) {
      document.title = `Sistema de Gestión - ${institutionName}`;
    }
  }

  /**
   * Validar configuración
   */
  validateConfig(config) {
    const errors = [];
    
    if (!config.institutionName || config.institutionName.trim() === '') {
      errors.push('El nombre de la institución es obligatorio');
    }
    
    if (!config.logoUrl || config.logoUrl.trim() === '') {
      errors.push('La URL del logo es obligatoria');
    }
    
    // Validar formato de colores
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    Object.entries(config.colors || {}).forEach(([key, value]) => {
      if (!hexColorRegex.test(value)) {
        errors.push(`El color ${key} no tiene un formato hexadecimal válido`);
      }
    });
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (config.contact?.email && !emailRegex.test(config.contact.email)) {
      errors.push('El formato del correo electrónico no es válido');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Exportar configuración como JSON
   */
  exportConfig() {
    const config = this.getConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.institutionShortName || 'institution'}-config.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Importar configuración desde JSON
   */
  async importConfig(jsonString) {
    try {
      const config = JSON.parse(jsonString);
      const validation = this.validateConfig(config);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }
      
      return await this.saveConfig(config);
    } catch (error) {
      return {
        success: false,
        error: 'Error al parsear el archivo JSON: ' + error.message
      };
    }
  }

  /**
   * Generar colores derivados de un color base
   */
  generateColorVariants(baseColor) {
    // Convertir hex a RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    
    // Generar versión más clara (aumentar brillo)
    const lightR = Math.min(255, Math.floor(r + (255 - r) * 0.3));
    const lightG = Math.min(255, Math.floor(g + (255 - g) * 0.3));
    const lightB = Math.min(255, Math.floor(b + (255 - b) * 0.3));
    const light = `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
    
    // Generar versión más oscura (reducir brillo)
    const darkR = Math.max(0, Math.floor(r * 0.7));
    const darkG = Math.max(0, Math.floor(g * 0.7));
    const darkB = Math.max(0, Math.floor(b * 0.7));
    const dark = `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
    
    // Generar hover (intermedio)
    const hoverR = Math.max(0, Math.min(255, Math.floor(r * 0.85)));
    const hoverG = Math.max(0, Math.min(255, Math.floor(g * 0.85)));
    const hoverB = Math.max(0, Math.min(255, Math.floor(b * 0.85)));
    const hover = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;
    
    return { light, dark, hover };
  }

  /**
   * Expandir tema con colores derivados automáticamente
   */
  expandTheme(theme) {
    const primaryVars = this.generateColorVariants(theme.colors.primary);
    const secondaryVars = this.generateColorVariants(theme.colors.secondary);
    const accentVars = this.generateColorVariants(theme.colors.accent);
    
    return {
      ...theme,
      colors: {
        ...theme.colors,
        // Variantes de primario
        primaryLight: primaryVars.light,
        primaryDark: primaryVars.dark,
        // Variantes de secundario
        secondaryLight: secondaryVars.light,
        secondaryDark: secondaryVars.dark,
        // Variantes de acento
        accentLight: accentVars.light,
        accentDark: accentVars.dark,
        // Colores de marca (usar primario y secundario como base)
        brandBlue: theme.colors.primary,
        brandBlueLight: primaryVars.light,
        brandBlueHover: primaryVars.hover,
        brandRed: theme.colors.secondary,
        brandRedHover: secondaryVars.hover,
        brandYellow: theme.colors.accent,
        // Variantes de estado
        successLight: this.generateColorVariants(theme.colors.success).light,
        successDark: this.generateColorVariants(theme.colors.success).dark,
        errorLight: this.generateColorVariants(theme.colors.error).light,
        errorDark: this.generateColorVariants(theme.colors.error).dark,
        warningLight: this.generateColorVariants(theme.colors.warning).light,
        warningDark: this.generateColorVariants(theme.colors.warning).dark,
        infoLight: this.generateColorVariants(theme.colors.info).light,
        infoDark: this.generateColorVariants(theme.colors.info).dark
      }
    };
  }

  /**
   * Obtener temas predefinidos
   */
  getPresetThemes() {
    const baseThemes = [
      {
        name: 'La Salle',
        description: 'Colores institucionales La Salle',
        colors: {
          primary: '#004684',
          secondary: '#ce0e2d',
          accent: '#f59e0b',
          background: '#f8fafc',
          surface: '#ffffff',
          textPrimary: '#1e293b',
          textSecondary: '#64748b',
          error: '#ef4444',
          success: '#10b981',
          warning: '#f59e0b',
          info: '#3b82f6'
        }
      },
      {
        name: 'Océano',
        description: 'Tonos azules y cyan frescos',
        colors: {
          primary: '#0284c7',
          secondary: '#06b6d4',
          accent: '#14b8a6',
          background: '#f0f9ff',
          surface: '#ffffff',
          textPrimary: '#0c4a6e',
          textSecondary: '#0369a1',
          error: '#dc2626',
          success: '#059669',
          warning: '#f59e0b',
          info: '#0891b2'
        }
      },
      {
        name: 'Bosque',
        description: 'Verde natural y fresco',
        colors: {
          primary: '#15803d',
          secondary: '#84cc16',
          accent: '#eab308',
          background: '#f7fee7',
          surface: '#ffffff',
          textPrimary: '#14532d',
          textSecondary: '#166534',
          error: '#dc2626',
          success: '#16a34a',
          warning: '#ca8a04',
          info: '#0284c7'
        }
      },
      {
        name: 'Elegante',
        description: 'Gris profesional y sofisticado',
        colors: {
          primary: '#1e293b',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#f8fafc',
          surface: '#ffffff',
          textPrimary: '#0f172a',
          textSecondary: '#475569',
          error: '#ef4444',
          success: '#10b981',
          warning: '#f59e0b',
          info: '#3b82f6'
        }
      },
      {
        name: 'Royal',
        description: 'Púrpura y rosa vibrante',
        colors: {
          primary: '#7c3aed',
          secondary: '#a855f7',
          accent: '#ec4899',
          background: '#faf5ff',
          surface: '#ffffff',
          textPrimary: '#581c87',
          textSecondary: '#7e22ce',
          error: '#dc2626',
          success: '#10b981',
          warning: '#f59e0b',
          info: '#8b5cf6'
        }
      },
      {
        name: 'Atardecer',
        description: 'Naranja cálido y rojo intenso',
        colors: {
          primary: '#ea580c',
          secondary: '#dc2626',
          accent: '#f59e0b',
          background: '#fff7ed',
          surface: '#ffffff',
          textPrimary: '#7c2d12',
          textSecondary: '#9a3412',
          error: '#b91c1c',
          success: '#16a34a',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Azul Profesional',
        description: 'Azul corporativo y confiable',
        colors: {
          primary: '#1e40af',
          secondary: '#3b82f6',
          accent: '#60a5fa',
          background: '#eff6ff',
          surface: '#ffffff',
          textPrimary: '#1e3a8a',
          textSecondary: '#3b82f6',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Verde Naturaleza',
        description: 'Verde ecológico y fresco',
        colors: {
          primary: '#059669',
          secondary: '#10b981',
          accent: '#34d399',
          background: '#ecfdf5',
          surface: '#ffffff',
          textPrimary: '#064e3b',
          textSecondary: '#047857',
          error: '#dc2626',
          success: '#10b981',
          warning: '#f59e0b',
          info: '#0891b2'
        }
      },
      {
        name: 'Púrpura Moderno',
        description: 'Púrpura vibrante y moderno',
        colors: {
          primary: '#7c3aed',
          secondary: '#a855f7',
          accent: '#c084fc',
          background: '#faf5ff',
          surface: '#ffffff',
          textPrimary: '#581c87',
          textSecondary: '#7e22ce',
          error: '#dc2626',
          success: '#10b981',
          warning: '#f59e0b',
          info: '#8b5cf6'
        }
      },
      {
        name: 'Rojo Pasión',
        description: 'Rojo intenso y energético',
        colors: {
          primary: '#dc2626',
          secondary: '#ef4444',
          accent: '#f87171',
          background: '#fef2f2',
          surface: '#ffffff',
          textPrimary: '#991b1b',
          textSecondary: '#b91c1c',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Cyan Tecnológico',
        description: 'Cyan moderno y tecnológico',
        colors: {
          primary: '#0891b2',
          secondary: '#06b6d4',
          accent: '#22d3ee',
          background: '#ecfeff',
          surface: '#ffffff',
          textPrimary: '#164e63',
          textSecondary: '#0e7490',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0891b2'
        }
      },
      {
        name: 'Oro Elegante',
        description: 'Dorado lujoso y elegante',
        colors: {
          primary: '#d97706',
          secondary: '#f59e0b',
          accent: '#fbbf24',
          background: '#fffbeb',
          surface: '#ffffff',
          textPrimary: '#78350f',
          textSecondary: '#92400e',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Gris Minimalista',
        description: 'Grises sofisticados y minimalistas',
        colors: {
          primary: '#374151',
          secondary: '#6b7280',
          accent: '#9ca3af',
          background: '#f9fafb',
          surface: '#ffffff',
          textPrimary: '#111827',
          textSecondary: '#4b5563',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Rosa Suave',
        description: 'Rosa delicado y suave',
        colors: {
          primary: '#db2777',
          secondary: '#ec4899',
          accent: '#f472b6',
          background: '#fdf2f8',
          surface: '#ffffff',
          textPrimary: '#9f1239',
          textSecondary: '#be185d',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Indigo Profundo',
        description: 'Indigo profundo y misterioso',
        colors: {
          primary: '#4338ca',
          secondary: '#6366f1',
          accent: '#818cf8',
          background: '#eef2ff',
          surface: '#ffffff',
          textPrimary: '#312e81',
          textSecondary: '#4f46e5',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#6366f1'
        }
      },
      {
        name: 'Turquesa Tropical',
        description: 'Turquesa vibrante y tropical',
        colors: {
          primary: '#0d9488',
          secondary: '#14b8a6',
          accent: '#2dd4bf',
          background: '#f0fdfa',
          surface: '#ffffff',
          textPrimary: '#134e4a',
          textSecondary: '#0f766e',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0891b2'
        }
      },
      {
        name: 'Esmeralda Elegante',
        description: 'Verde esmeralda sofisticado',
        colors: {
          primary: '#047857',
          secondary: '#059669',
          accent: '#10b981',
          background: '#ecfdf5',
          surface: '#ffffff',
          textPrimary: '#064e3b',
          textSecondary: '#047857',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Coral Vibrante',
        description: 'Coral cálido y acogedor',
        colors: {
          primary: '#f97316',
          secondary: '#fb923c',
          accent: '#fdba74',
          background: '#fff7ed',
          surface: '#ffffff',
          textPrimary: '#9a3412',
          textSecondary: '#c2410c',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Lavanda Sereno',
        description: 'Lavanda suave y relajante',
        colors: {
          primary: '#a855f7',
          secondary: '#c084fc',
          accent: '#d8b4fe',
          background: '#faf5ff',
          surface: '#ffffff',
          textPrimary: '#6b21a8',
          textSecondary: '#7e22ce',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#8b5cf6'
        }
      },
      {
        name: 'Azul Cielo',
        description: 'Azul cielo claro y fresco',
        colors: {
          primary: '#0ea5e9',
          secondary: '#38bdf8',
          accent: '#7dd3fc',
          background: '#f0f9ff',
          surface: '#ffffff',
          textPrimary: '#0c4a6e',
          textSecondary: '#0369a1',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Amarillo Sol',
        description: 'Amarillo brillante y energético',
        colors: {
          primary: '#eab308',
          secondary: '#facc15',
          accent: '#fde047',
          background: '#fefce8',
          surface: '#ffffff',
          textPrimary: '#713f12',
          textSecondary: '#854d0e',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Negro Premium',
        description: 'Negro elegante y premium',
        colors: {
          primary: '#1f2937',
          secondary: '#374151',
          accent: '#4b5563',
          background: '#f9fafb',
          surface: '#ffffff',
          textPrimary: '#111827',
          textSecondary: '#1f2937',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Blanco Nieve',
        description: 'Blanco puro y limpio',
        colors: {
          primary: '#6b7280',
          secondary: '#9ca3af',
          accent: '#d1d5db',
          background: '#ffffff',
          surface: '#f9fafb',
          textPrimary: '#111827',
          textSecondary: '#4b5563',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      },
      {
        name: 'Arcoíris Moderno',
        description: 'Colores vibrantes y modernos',
        colors: {
          primary: '#8b5cf6',
          secondary: '#ec4899',
          accent: '#f59e0b',
          background: '#faf5ff',
          surface: '#ffffff',
          textPrimary: '#581c87',
          textSecondary: '#7e22ce',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
          info: '#0284c7'
        }
      }
    ];
    
    // Expandir todos los temas con colores derivados
    return baseThemes.map(theme => this.expandTheme(theme));
  }

  /**
   * Aplicar tema predefinido
   */
  async applyPresetTheme(themeName) {
    const themes = this.getPresetThemes();
    const theme = themes.find(t => t.name === themeName);
    
    if (!theme) {
      return { success: false, error: 'Tema no encontrado' };
    }

    const currentConfig = this.getConfig();
    const updatedConfig = {
      ...currentConfig,
      colors: theme.colors
    };

    return await this.saveConfig(updatedConfig);
  }
}

// Singleton
const institutionConfigService = new InstitutionConfigService();
export default institutionConfigService;


