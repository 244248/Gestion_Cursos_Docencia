import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstitution } from '../context/InstitutionContext';
import institutionConfigService from '../services/InstitutionConfigService';
import './styles/DeveloperPanel.css';

const DeveloperPanel = () => {
  const navigate = useNavigate();
  const { config, updateConfiguration, resetConfiguration } = useInstitution();
  
  const [formData, setFormData] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [livePreview, setLivePreview] = useState(true);
  const [selectedInterface, setSelectedInterface] = useState('admin');
  const [splitView, setSplitView] = useState(true);
  const [previewScale, setPreviewScale] = useState(1);
  const [interfaceSettings, setInterfaceSettings] = useState(null);

  // Password de desarrollador (en producción debería estar en variables de entorno o Firebase)
  const DEVELOPER_PASSWORD = 'SistemaDocencia';

  useEffect(() => {
    if (config) {
      // Merge de colores con valores por defecto para asegurar que todos los campos existan
      const defaultColors = {
        primary: '#004684',
        primaryLight: '#1a4a9d',
        primaryDark: '#001c54',
        secondary: '#ce0e2d',
        accent: '#f59e0b',
        accentLight: '#ffe066',
        accentDark: '#e6b800',
        brandBlue: '#004684',
        brandBlueLight: '#0b6eca',
        brandBlueHover: '#005b9f',
        brandRed: '#ce0e2d',
        brandRedHover: '#b50d27',
        brandYellow: '#ffd700',
        background: '#f8fafc',
        surface: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        error: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        info: '#3b82f6'
      };
      
      const mergedConfig = {
        ...config,
        colors: {
          ...defaultColors,
          ...(config.colors || {})
        }
      };
      
      setFormData(mergedConfig);
      // Cargar interfaceSettings desde la configuración o usar valores por defecto
      const defaultSettings = {
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
      };
      
      if (config.interfaceSettings) {
        // Merge con valores por defecto para asegurar que todas las propiedades existan
        setInterfaceSettings({
          admin: { ...defaultSettings.admin, ...(config.interfaceSettings.admin || {}) },
          docente: { ...defaultSettings.docente, ...(config.interfaceSettings.docente || {}) },
          loginDocente: { ...defaultSettings.loginDocente, ...(config.interfaceSettings.loginDocente || {}) },
          loginAdmin: { ...defaultSettings.loginAdmin, ...(config.interfaceSettings.loginAdmin || {}) }
        });
      } else {
        // Usar valores por defecto si no existen
        setInterfaceSettings(defaultSettings);
      }
    }
  }, [config]);

  // Previsualización en tiempo real automática
  useEffect(() => {
    if (formData && interfaceSettings && livePreview && isDeveloperMode) {
      // Aplicar tema temporalmente mientras editas
      const timer = setTimeout(() => {
        institutionConfigService.applyTheme(formData.colors, interfaceSettings);
        if (formData.institutionName) {
          document.title = `PREVISUALIZACIÓN - ${formData.institutionName}`;
        }
        // Aplicar configuraciones específicas de interfaz
        applyInterfaceSettings();
        
        // Notificar al iframe de los cambios
        const iframe = document.querySelector('.preview-iframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage({
              type: 'APPLY_CONFIG_PREVIEW',
              config: formData,
              interfaceSettings: interfaceSettings
            }, '*');
          } catch (error) {
            console.log('No se pudo comunicar con el iframe:', error);
          }
        }
      }, 300); // Debounce de 300ms para cambios más rápidos

      return () => clearTimeout(timer);
    }
  }, [formData, livePreview, isDeveloperMode, interfaceSettings, selectedInterface]);
  
  // Listener para recibir mensajes del iframe (sincronización bidireccional)
  useEffect(() => {
    const handleMessage = (event) => {
      // Seguridad: verificar origen si es necesario
      if (event.data && event.data.type === 'IFRAME_READY') {
        console.log('Iframe listo, aplicando configuración...');
        applyInterfaceSettings();
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [interfaceSettings, selectedInterface]);

  const handleInterfaceSettingChange = (setting, value) => {
    setInterfaceSettings(prev => ({
      ...prev,
      [selectedInterface]: {
        ...prev[selectedInterface],
        [setting]: value
      }
    }));
  };

  const applyInterfaceSettings = () => {
    if (!interfaceSettings || !interfaceSettings[selectedInterface]) {
      console.warn('interfaceSettings no disponible para:', selectedInterface);
      return;
    }
    
    const settings = interfaceSettings[selectedInterface];
    
    // Inyectar estilos CSS dinámicamente para sobrescribir los hardcodeados
    let styleElement = document.getElementById('dev-panel-dynamic-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'dev-panel-dynamic-styles';
      document.head.appendChild(styleElement);
    }
    
    let cssRules = '';
    
    // Aplicar estilos para DOCENTE
    if (selectedInterface === 'docente') {
      cssRules += `
        /* DocentePanel - Estilos Dinámicos */
        header {
          background: linear-gradient(135deg, ${settings.headerBackgroundStart} 0%, ${settings.headerBackgroundEnd} 100%) !important;
          color: ${settings.headerTextColor} !important;
        }
        
        .filter-btn {
          background-color: ${settings.filterButtonColor} !important;
          border-color: ${settings.filterButtonColor} !important;
        }
        
        .filter-btn:hover {
          background-color: ${settings.filterButtonActiveColor} !important;
          border-color: ${settings.filterButtonActiveColor} !important;
        }
        
        .filter-btn.active {
          background-color: ${settings.filterButtonActiveColor} !important;
          border-color: ${settings.filterButtonActiveColor} !important;
          box-shadow: 0 4px 12px ${settings.filterButtonActiveColor}66 !important;
        }
        
        .summary-card, .course-card {
          box-shadow: 0 ${settings.courseCardShadow}px ${settings.courseCardShadow * 2}px rgba(0,0,0,0.15) !important;
          border-radius: ${settings.courseCardBorderRadius}px !important;
        }
        
        .summary-card:hover, .course-card:hover {
          transform: scale(${settings.courseCardHoverScale}) !important;
        }
        
        .courses-table thead {
          background: linear-gradient(135deg, ${settings.headerBackgroundStart}, ${settings.headerBackgroundEnd}) !important;
          color: ${settings.headerTextColor} !important;
        }
      `;
    }
    
    // Aplicar estilos para ADMIN
    if (selectedInterface === 'admin') {
      cssRules += `
        /* AdminPanel - Estilos Dinámicos */
        .sidebar {
          background: linear-gradient(160deg, ${settings.sidebarBackgroundStart} 0%, ${settings.sidebarBackgroundEnd} 100%) !important;
          color: ${settings.sidebarTextColor} !important;
        }
        
        .sidebar-nav a, .sidebar-nav button {
          color: ${settings.sidebarTextColor} !important;
        }
        
        .btn-primary, .add-btn {
          background-color: ${settings.buttonAddColor} !important;
          border-color: ${settings.buttonAddColor} !important;
        }
        
        .btn-warning, .edit-btn {
          background-color: ${settings.buttonEditColor} !important;
          border-color: ${settings.buttonEditColor} !important;
        }
        
        .btn-danger, .delete-btn {
          background-color: ${settings.buttonDeleteColor} !important;
          border-color: ${settings.buttonDeleteColor} !important;
        }
        
        .btn-info, .view-btn {
          background-color: ${settings.buttonViewColor} !important;
          border-color: ${settings.buttonViewColor} !important;
        }
        
        .table thead, .data-table-header {
          background-color: ${settings.tableHeaderColor} !important;
          color: white !important;
        }
        
        .table tbody tr:hover, .data-row:hover {
          background-color: ${settings.tableRowHoverColor} !important;
        }
        
        .data-table, .card, .modal-content {
          border-radius: ${settings.tableBorderRadius}px !important;
        }
      `;
    }
    
    // Aplicar estilos para LOGIN DOCENTE
    if (selectedInterface === 'loginDocente') {
      cssRules += `
        /* LoginDocente - Estilos Dinámicos */
        .login-container {
          background: linear-gradient(135deg, ${settings.backgroundGradientStart} 0%, ${settings.backgroundGradientEnd} 100%) !important;
        }
        
        .login-form-panel {
          background-color: ${settings.formPanelBackground} !important;
          border-radius: ${settings.cardBorderRadius}px !important;
          box-shadow: 0 ${settings.cardShadow}px ${settings.cardShadow * 2}px rgba(0,0,0,0.3) !important;
        }
        
        .login-illustration-panel {
          background-color: ${settings.illustrationPanelColor} !important;
        }
        
        .form-group input, .auth-form input {
          border-color: ${settings.inputBorderColor} !important;
        }
        
        .form-group input:focus, .auth-form input:focus {
          border-color: ${settings.inputFocusColor} !important;
          box-shadow: 0 0 0 0.2rem ${settings.inputFocusColor}33 !important;
        }
        
        .btn-primary {
          background-color: ${settings.buttonLoginColor} !important;
          border-color: ${settings.buttonLoginColor} !important;
        }
        
        .btn-primary:hover {
          background-color: ${settings.inputFocusColor} !important;
          border-color: ${settings.inputFocusColor} !important;
        }
      `;
    }
    
    // Aplicar estilos para LOGIN ADMIN
    if (selectedInterface === 'loginAdmin') {
      cssRules += `
        /* LoginAdmin - Estilos Dinámicos */
        .login-container {
          background: linear-gradient(135deg, ${settings.backgroundGradientStart} 0%, ${settings.backgroundGradientEnd} 100%) !important;
        }
        
        .login-form-panel {
          background-color: ${settings.formPanelBackground} !important;
          border-radius: ${settings.cardBorderRadius}px !important;
          box-shadow: 0 ${settings.cardShadow}px ${settings.cardShadow * 2}px rgba(0,0,0,0.3) !important;
        }
        
        .login-illustration-panel {
          background-color: ${settings.illustrationPanelColor} !important;
        }
        
        .form-group input, .auth-form input {
          border-color: ${settings.inputBorderColor} !important;
        }
        
        .form-group input:focus, .auth-form input:focus {
          border-color: ${settings.inputFocusColor} !important;
          box-shadow: 0 0 0 0.2rem ${settings.inputFocusColor}33 !important;
        }
        
        .btn-primary {
          background-color: ${settings.buttonLoginColor} !important;
          border-color: ${settings.buttonLoginColor} !important;
        }
        
        .btn-primary:hover {
          background-color: ${settings.inputFocusColor} !important;
          border-color: ${settings.inputFocusColor} !important;
        }
      `;
    }
    
    // Aplicar las reglas CSS
    styleElement.textContent = cssRules;
    
    // Aplicar variables CSS también
    document.documentElement.style.setProperty('--docente-sidebar-start', settings.sidebarBackgroundStart || '#047857');
    document.documentElement.style.setProperty('--docente-sidebar-end', settings.sidebarBackgroundEnd || '#064e3b');
    document.documentElement.style.setProperty('--docente-sidebar-text', settings.sidebarTextColor || '#ffffff');
    
    // También enviar mensaje al iframe
    const iframe = document.querySelector('.preview-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({
          type: 'UPDATE_INTERFACE_SETTINGS',
          interface: selectedInterface,
          settings: interfaceSettings[selectedInterface],
          cssRules: cssRules
        }, '*');
      } catch (error) {
        console.log('No se pudo comunicar con el iframe:', error);
      }
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleDeveloperLogin = (e) => {
    e.preventDefault();
    if (devPassword === DEVELOPER_PASSWORD) {
      setIsDeveloperMode(true);
      showMessage('Acceso de desarrollador concedido', 'success');
    } else {
      showMessage('Contraseña incorrecta', 'error');
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => {
      if (section === 'root') {
        return { ...prev, [field]: value };
      }
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
    });
  };

  const handleColorChange = (colorKey, value) => {
    setFormData(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!formData || !interfaceSettings) return;

    // Incluir las interfaceSettings en la configuración a guardar
    const configToSave = {
      ...formData,
      interfaceSettings: interfaceSettings
    };

    // Validar configuración
    const validation = institutionConfigService.validateConfig(configToSave);
    if (!validation.isValid) {
      showMessage(`Errores: ${validation.errors.join(', ')}`, 'error');
      return;
    }

    const result = await updateConfiguration(configToSave);
    if (result.success) {
      showMessage('✅ Configuración guardada y aplicada exitosamente. Los cambios se están sincronizando en todo el sistema...', 'success');
      
      // Recargar el iframe de previsualización después de 1 segundo
      setTimeout(() => {
        const iframe = document.querySelector('.preview-iframe');
        if (iframe) {
          iframe.src = iframe.src;
        }
      }, 1000);
    } else {
      showMessage(`❌ Error al guardar: ${result.error}`, 'error');
    }
  };

  const handleReset = async () => {
    if (window.confirm('¿Estás seguro de restablecer a la configuración por defecto de La Salle?')) {
      const result = await resetConfiguration();
      if (result.success) {
        showMessage('✅ Configuración restablecida a valores por defecto', 'success');
      } else {
        showMessage(`❌ Error: ${result.error}`, 'error');
      }
    }
  };

  const handleExport = () => {
    institutionConfigService.exportConfig();
    showMessage('📥 Configuración exportada', 'success');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = await institutionConfigService.importConfig(event.target.result);
      if (result.success) {
        setFormData(result.config);
        showMessage('✅ Configuración importada exitosamente', 'success');
      } else {
        showMessage(`❌ Error: ${result.error || result.errors?.join(', ')}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    // Aplicar tema temporalmente
    institutionConfigService.applyTheme(formData.colors);
    showMessage('👁️ Vista previa aplicada (temporal)', 'info');
  };

  const togglePreviewMode = () => {
    if (!previewMode) {
      // Guardar estado original
      setOriginalData(JSON.parse(JSON.stringify(formData)));
      // Aplicar cambios temporales
      institutionConfigService.applyTheme(formData.colors);
      document.title = `VISTA PREVIA - ${formData.institutionName}`;
      setPreviewMode(true);
      showMessage('👁️ Modo Vista Previa ACTIVADO - Los cambios son temporales', 'info');
    } else {
      // Restaurar estado original
      if (originalData) {
        institutionConfigService.applyTheme(originalData.colors);
        document.title = `Sistema de Gestión - ${originalData.institutionName}`;
      }
      setPreviewMode(false);
      showMessage('✅ Modo Vista Previa DESACTIVADO - Cambios descartados', 'success');
    }
  };

  const openPreviewWindow = () => {
    // Aplicar cambios temporales
    institutionConfigService.applyTheme(formData.colors);
    if (formData.institutionName) {
      document.title = `VISTA PREVIA - ${formData.institutionName}`;
    }
    
    showMessage('🔍 Vista previa aplicada. Abre el inicio en otra pestaña para ver los cambios.', 'info');
    
    // Abrir home en nueva pestaña
    window.open('/', '_blank');
  };

  if (!isDeveloperMode) {
    return (
      <div className="developer-login-container">
        <div className="developer-login-card">
          <div className="developer-login-header">
            <h1>🔧 Modo Desarrollador</h1>
            <p>Acceso restringido para configuración institucional</p>
          </div>
          
          <form onSubmit={handleDeveloperLogin} className="developer-login-form">
            <div className="form-group">
              <label htmlFor="devPassword">
                <i className="fas fa-lock"></i> Contraseña de Desarrollador
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showDevPassword ? "text" : "password"}
                  id="devPassword"
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowDevPassword(!showDevPassword)}
                  aria-label={showDevPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <i className={`fas ${showDevPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-sign-in-alt"></i> Acceder
            </button>
          </form>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left"></i> Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!formData) {
    return <div className="loading">Cargando configuración...</div>;
  }

  return (
    <div className={`developer-panel ${splitView ? 'split-view-active' : ''}`}>
      <div className="developer-header">
        <div className="header-content">
          <h1>🔧 Panel de Configuración Institucional</h1>
          <p>Edita y previsualiza en tiempo real a tu estilo!!!!</p>
        </div>
        <div className="header-actions">
          <div className="live-preview-toggle">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={livePreview}
                onChange={(e) => {
                  setLivePreview(e.target.checked);
                  showMessage(
                    e.target.checked 
                      ? '✅ Previsualización en vivo ACTIVADA' 
                      : '⏸️ Previsualización en vivo PAUSADA', 
                    'info'
                  );
                }}
              />
              <span className="slider"></span>
            </label>
            <span className="toggle-label">
              <i className="fas fa-bolt"></i>
              Vista en Vivo
            </span>
          </div>
          
          <button 
            className={`btn ${splitView ? 'btn-warning' : 'btn-info'}`}
            onClick={() => {
              setSplitView(!splitView);
              showMessage(
                !splitView 
                  ? '📱 Modo Split-Screen ACTIVADO' 
                  : '📄 Modo Editor ACTIVADO', 
                'info'
              );
            }}
            title="Alternar vista dividida"
          >
            <i className={`fas ${splitView ? 'fa-compress' : 'fa-columns'}`}></i>
            {splitView ? 'Editor Solo' : 'Split-Screen'}
          </button>
          
          <button className="btn btn-close" onClick={() => navigate('/')}>
            <i className="fas fa-times"></i> Cerrar
          </button>
        </div>
      </div>

      {/* Selector de Interfaz */}
      {splitView && (
        <>
          <div className="interface-selector">
            <div className="selector-label">
              <i className="fas fa-desktop"></i>
              <span>Previsualizar Interfaz:</span>
            </div>
            <div className="interface-buttons">
              <button 
                className={`interface-btn ${selectedInterface === 'admin' ? 'active' : ''}`}
                onClick={() => setSelectedInterface('admin')}
              >
                <i className="fas fa-user-shield"></i>
                Panel Admin
              </button>
              <button 
                className={`interface-btn ${selectedInterface === 'docente' ? 'active' : ''}`}
                onClick={() => setSelectedInterface('docente')}
              >
                <i className="fas fa-chalkboard-teacher"></i>
                Panel Docente
              </button>
              <button 
                className={`interface-btn ${selectedInterface === 'loginAdmin' ? 'active' : ''}`}
                onClick={() => setSelectedInterface('loginAdmin')}
              >
                <i className="fas fa-user-shield"></i>
                Login Admin
              </button>
              <button 
                className={`interface-btn ${selectedInterface === 'loginDocente' ? 'active' : ''}`}
                onClick={() => setSelectedInterface('loginDocente')}
              >
                <i className="fas fa-chalkboard-teacher"></i>
                Login Docente
              </button>
            </div>
            <div className="scale-controls">
              <button 
                className="scale-btn"
                onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
                title="Reducir escala"
              >
                <i className="fas fa-search-minus"></i>
              </button>
              <span className="scale-label">{Math.round(previewScale * 100)}%</span>
              <button 
                className="scale-btn"
                onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))}
                title="Aumentar escala"
              >
                <i className="fas fa-search-plus"></i>
              </button>
            </div>
          </div>

          {/* Opciones Específicas de Interfaz (Deshabilitadas) */}
          {false && <div className="interface-specific-options">
            <h3 className="options-title">
              <i className="fas fa-sliders-h"></i>
              Opciones de {
                selectedInterface === 'admin' ? 'Panel Administrador' :
                selectedInterface === 'docente' ? 'Panel Docente' :
                selectedInterface === 'loginAdmin' ? 'Login Administrador' :
                selectedInterface === 'loginDocente' ? 'Login Docente' :
                'Interfaz'
              }
            </h3>

            {!interfaceSettings && (
              <div className="loading-message">
                <i className="fas fa-spinner fa-spin"></i> Cargando configuración...
              </div>
            )}

            {/* Opciones para ADMIN */}
            {interfaceSettings && selectedInterface === 'admin' && (
              <div className="options-grid">
                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-palette"></i>
                    Sidebar Inicio (Gradiente)
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.sidebarBackgroundStart}
                      onChange={(e) => handleInterfaceSettingChange('sidebarBackgroundStart', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.sidebarBackgroundStart}
                      onChange={(e) => handleInterfaceSettingChange('sidebarBackgroundStart', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-palette"></i>
                    Sidebar Fin (Gradiente)
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.sidebarBackgroundEnd}
                      onChange={(e) => handleInterfaceSettingChange('sidebarBackgroundEnd', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.sidebarBackgroundEnd}
                      onChange={(e) => handleInterfaceSettingChange('sidebarBackgroundEnd', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-font"></i>
                    Color Texto Sidebar
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.sidebarTextColor}
                      onChange={(e) => handleInterfaceSettingChange('sidebarTextColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.sidebarTextColor}
                      onChange={(e) => handleInterfaceSettingChange('sidebarTextColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-plus-circle"></i>
                    Color Botón Agregar
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.buttonAddColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonAddColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.buttonAddColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonAddColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-edit"></i>
                    Color Botón Editar
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.buttonEditColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonEditColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.buttonEditColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonEditColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-trash-alt"></i>
                    Color Botón Eliminar
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.buttonDeleteColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonDeleteColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.buttonDeleteColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonDeleteColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-eye"></i>
                    Color Botón Ver
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.buttonViewColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonViewColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.buttonViewColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonViewColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-table"></i>
                    Color Header Tabla
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.tableHeaderColor}
                      onChange={(e) => handleInterfaceSettingChange('tableHeaderColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.tableHeaderColor}
                      onChange={(e) => handleInterfaceSettingChange('tableHeaderColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-fill"></i>
                    Color Hover Fila Tabla
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.admin.tableRowHoverColor}
                      onChange={(e) => handleInterfaceSettingChange('tableRowHoverColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.admin.tableRowHoverColor}
                      onChange={(e) => handleInterfaceSettingChange('tableRowHoverColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-border-style"></i>
                    Border Radius Tabla (px)
                  </label>
                  <input
                    type="range"
                    className="option-range"
                    min="0"
                    max="30"
                    value={interfaceSettings.admin.tableBorderRadius}
                    onChange={(e) => handleInterfaceSettingChange('tableBorderRadius', e.target.value)}
                  />
                  <span className="range-value">{interfaceSettings.admin.tableBorderRadius}px</span>
                </div>
              </div>
            )}

            {/* Opciones para DOCENTE */}
            {interfaceSettings && selectedInterface === 'docente' && (
              <div className="options-grid">
                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-palette"></i>
                    Header Inicio (Gradiente)
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.docente.headerBackgroundStart}
                      onChange={(e) => handleInterfaceSettingChange('headerBackgroundStart', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.docente.headerBackgroundStart}
                      onChange={(e) => handleInterfaceSettingChange('headerBackgroundStart', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-palette"></i>
                    Header Fin (Gradiente)
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.docente.headerBackgroundEnd}
                      onChange={(e) => handleInterfaceSettingChange('headerBackgroundEnd', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.docente.headerBackgroundEnd}
                      onChange={(e) => handleInterfaceSettingChange('headerBackgroundEnd', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-font"></i>
                    Color Texto Header
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.docente.headerTextColor}
                      onChange={(e) => handleInterfaceSettingChange('headerTextColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.docente.headerTextColor}
                      onChange={(e) => handleInterfaceSettingChange('headerTextColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-filter"></i>
                    Color Botón Filtro
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.docente.filterButtonColor}
                      onChange={(e) => handleInterfaceSettingChange('filterButtonColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.docente.filterButtonColor}
                      onChange={(e) => handleInterfaceSettingChange('filterButtonColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-check-circle"></i>
                    Color Filtro Activo
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.docente.filterButtonActiveColor}
                      onChange={(e) => handleInterfaceSettingChange('filterButtonActiveColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.docente.filterButtonActiveColor}
                      onChange={(e) => handleInterfaceSettingChange('filterButtonActiveColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-table"></i>
                    Color Header Tabla
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.docente.tableHeaderColor}
                      onChange={(e) => handleInterfaceSettingChange('tableHeaderColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.docente.tableHeaderColor}
                      onChange={(e) => handleInterfaceSettingChange('tableHeaderColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-cloud"></i>
                    Sombra Tarjeta Curso (px)
                  </label>
                  <input
                    type="range"
                    className="option-range"
                    min="0"
                    max="30"
                    value={interfaceSettings.docente.courseCardShadow}
                    onChange={(e) => handleInterfaceSettingChange('courseCardShadow', e.target.value)}
                  />
                  <span className="range-value">{interfaceSettings.docente.courseCardShadow}px</span>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-border-style"></i>
                    Border Radius Tarjeta (px)
                  </label>
                  <input
                    type="range"
                    className="option-range"
                    min="0"
                    max="30"
                    value={interfaceSettings.docente.courseCardBorderRadius}
                    onChange={(e) => handleInterfaceSettingChange('courseCardBorderRadius', e.target.value)}
                  />
                  <span className="range-value">{interfaceSettings.docente.courseCardBorderRadius}px</span>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-expand-arrows-alt"></i>
                    Escala Hover Tarjeta
                  </label>
                  <input
                    type="range"
                    className="option-range"
                    min="1"
                    max="1.1"
                    step="0.01"
                    value={interfaceSettings.docente.courseCardHoverScale}
                    onChange={(e) => handleInterfaceSettingChange('courseCardHoverScale', e.target.value)}
                  />
                  <span className="range-value">{interfaceSettings.docente.courseCardHoverScale}x</span>
                </div>
              </div>
            )}

            {/* Opciones para LOGIN DOCENTE */}
            {interfaceSettings && selectedInterface === 'loginDocente' && (
              <div className="options-grid">
                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-fill-drip"></i>
                    Fondo Inicio (Gradiente)
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginDocente.backgroundGradientStart}
                      onChange={(e) => handleInterfaceSettingChange('backgroundGradientStart', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginDocente.backgroundGradientStart}
                      onChange={(e) => handleInterfaceSettingChange('backgroundGradientStart', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-fill-drip"></i>
                    Fondo Fin (Gradiente)
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginDocente.backgroundGradientEnd}
                      onChange={(e) => handleInterfaceSettingChange('backgroundGradientEnd', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginDocente.backgroundGradientEnd}
                      onChange={(e) => handleInterfaceSettingChange('backgroundGradientEnd', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-square"></i>
                    Color Panel Formulario
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginDocente.formPanelBackground}
                      onChange={(e) => handleInterfaceSettingChange('formPanelBackground', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginDocente.formPanelBackground}
                      onChange={(e) => handleInterfaceSettingChange('formPanelBackground', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-image"></i>
                    Color Panel Ilustración
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginDocente.illustrationPanelColor}
                      onChange={(e) => handleInterfaceSettingChange('illustrationPanelColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginDocente.illustrationPanelColor}
                      onChange={(e) => handleInterfaceSettingChange('illustrationPanelColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-border-style"></i>
                    Border Radius Panel (px)
                  </label>
                  <input
                    type="range"
                    className="option-range"
                    min="0"
                    max="50"
                    value={interfaceSettings.loginDocente.cardBorderRadius}
                    onChange={(e) => handleInterfaceSettingChange('cardBorderRadius', e.target.value)}
                  />
                  <span className="range-value">{interfaceSettings.loginDocente.cardBorderRadius}px</span>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-cloud"></i>
                    Sombra Panel (px)
                  </label>
                  <input
                    type="range"
                    className="option-range"
                    min="0"
                    max="60"
                    value={interfaceSettings.loginDocente.cardShadow}
                    onChange={(e) => handleInterfaceSettingChange('cardShadow', e.target.value)}
                  />
                  <span className="range-value">{interfaceSettings.loginDocente.cardShadow}px</span>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-border-all"></i>
                    Color Borde Input
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginDocente.inputBorderColor}
                      onChange={(e) => handleInterfaceSettingChange('inputBorderColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginDocente.inputBorderColor}
                      onChange={(e) => handleInterfaceSettingChange('inputBorderColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-highlighter"></i>
                    Color Focus Input
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginDocente.inputFocusColor}
                      onChange={(e) => handleInterfaceSettingChange('inputFocusColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginDocente.inputFocusColor}
                      onChange={(e) => handleInterfaceSettingChange('inputFocusColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-sign-in-alt"></i>
                    Color Botón Login
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginDocente.buttonLoginColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonLoginColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginDocente.buttonLoginColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonLoginColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Opciones para LOGIN ADMIN */}
            {interfaceSettings && selectedInterface === 'loginAdmin' && (
              <div className="options-grid">
                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-fill-drip"></i>
                    Fondo Inicio (Gradiente)
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginAdmin.backgroundGradientStart}
                      onChange={(e) => handleInterfaceSettingChange('backgroundGradientStart', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginAdmin.backgroundGradientStart}
                      onChange={(e) => handleInterfaceSettingChange('backgroundGradientStart', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-fill-drip"></i>
                    Fondo Fin (Gradiente)
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginAdmin.backgroundGradientEnd}
                      onChange={(e) => handleInterfaceSettingChange('backgroundGradientEnd', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginAdmin.backgroundGradientEnd}
                      onChange={(e) => handleInterfaceSettingChange('backgroundGradientEnd', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-square"></i>
                    Color Panel Formulario
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginAdmin.formPanelBackground}
                      onChange={(e) => handleInterfaceSettingChange('formPanelBackground', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginAdmin.formPanelBackground}
                      onChange={(e) => handleInterfaceSettingChange('formPanelBackground', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-image"></i>
                    Color Panel Ilustración
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginAdmin.illustrationPanelColor}
                      onChange={(e) => handleInterfaceSettingChange('illustrationPanelColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginAdmin.illustrationPanelColor}
                      onChange={(e) => handleInterfaceSettingChange('illustrationPanelColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-border-style"></i>
                    Border Radius Panel (px)
                  </label>
                  <input
                    type="range"
                    className="option-range"
                    min="0"
                    max="50"
                    value={interfaceSettings.loginAdmin.cardBorderRadius}
                    onChange={(e) => handleInterfaceSettingChange('cardBorderRadius', e.target.value)}
                  />
                  <span className="range-value">{interfaceSettings.loginAdmin.cardBorderRadius}px</span>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-cloud"></i>
                    Sombra Panel (px)
                  </label>
                  <input
                    type="range"
                    className="option-range"
                    min="0"
                    max="60"
                    value={interfaceSettings.loginAdmin.cardShadow}
                    onChange={(e) => handleInterfaceSettingChange('cardShadow', e.target.value)}
                  />
                  <span className="range-value">{interfaceSettings.loginAdmin.cardShadow}px</span>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-border-all"></i>
                    Color Borde Input
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginAdmin.inputBorderColor}
                      onChange={(e) => handleInterfaceSettingChange('inputBorderColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginAdmin.inputBorderColor}
                      onChange={(e) => handleInterfaceSettingChange('inputBorderColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-highlighter"></i>
                    Color Focus Input
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginAdmin.inputFocusColor}
                      onChange={(e) => handleInterfaceSettingChange('inputFocusColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginAdmin.inputFocusColor}
                      onChange={(e) => handleInterfaceSettingChange('inputFocusColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="option-card">
                  <label className="option-label">
                    <i className="fas fa-sign-in-alt"></i>
                    Color Botón Login
                  </label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      className="option-color"
                      value={interfaceSettings.loginAdmin.buttonLoginColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonLoginColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="option-input-small"
                      value={interfaceSettings.loginAdmin.buttonLoginColor}
                      onChange={(e) => handleInterfaceSettingChange('buttonLoginColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="options-actions">
              <button 
                className="btn btn-apply"
                onClick={() => {
                  applyInterfaceSettings();
                  showMessage('✅ Cambios aplicados a la vista previa', 'success');
                }}
              >
                <i className="fas fa-check"></i>
                Aplicar Cambios Ahora
              </button>
              <button 
                className="btn btn-reset-interface"
                onClick={() => {
                  // Reset to defaults
                  const defaults = {
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
                  };
                  setInterfaceSettings(prev => ({
                    ...prev,
                    [selectedInterface]: defaults[selectedInterface]
                  }));
                  applyInterfaceSettings();
                  showMessage('🔄 Opciones restablecidas', 'info');
                }}
              >
                <i className="fas fa-undo"></i>
                Restablecer Opciones
              </button>
            </div>
          </div>}
        </>
      )}

      <div className="developer-workspace">
        <div className="editor-panel">
          <div className="developer-tabs">
        <button 
          className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          <i className="fas fa-info-circle"></i> Información Básica
        </button>
        <button 
          className={`tab ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          <i className="fas fa-palette"></i> Marca e Imágenes
        </button>
        <button 
          className={`tab ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          <i className="fas fa-fill-drip"></i> Colores del Tema
        </button>
        <button 
          className={`tab ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          <i className="fas fa-address-book"></i> Contacto
        </button>
        <button 
          className={`tab ${activeTab === 'social' ? 'active' : ''}`}
          onClick={() => setActiveTab('social')}
        >
          <i className="fas fa-share-alt"></i> Redes Sociales
        </button>
        <button 
          className={`tab ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          <i className="fas fa-cog"></i> Características
        </button>
        <button 
          className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          <i className="fas fa-sliders-h"></i> Avanzado
        </button>
      </div>

      <div className="developer-content">
        {/* Información Básica */}
        {activeTab === 'basic' && (
          <div className="config-section">
            <h2><i className="fas fa-university"></i> Información de la Institución</h2>
            
            <div className="form-group">
              <label>Nombre Completo de la Institución *</label>
              <input
                type="text"
                value={formData.institutionName}
                onChange={(e) => handleInputChange('root', 'institutionName', e.target.value)}
                placeholder="Ej: Universidad Tecnológica de México"
              />
            </div>

            <div className="form-group">
              <label>Nombre Corto</label>
              <input
                type="text"
                value={formData.institutionShortName}
                onChange={(e) => handleInputChange('root', 'institutionShortName', e.target.value)}
                placeholder="Ej: UNITEC"
              />
            </div>

            <div className="form-group">
              <label>Lema o Slogan</label>
              <input
                type="text"
                value={formData.institutionSlogan}
                onChange={(e) => handleInputChange('root', 'institutionSlogan', e.target.value)}
                placeholder="Ej: Innovación y Excelencia"
              />
            </div>
          </div>
        )}

        {/* Marca e Imágenes */}
        {activeTab === 'branding' && (
          <div className="config-section">
            <h2><i className="fas fa-images"></i> Marca e Imágenes</h2>
            
            <div className="form-group">
              <label>URL del Logo Principal *</label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => handleInputChange('root', 'logoUrl', e.target.value)}
                placeholder="https://ejemplo.com/logo.png"
              />
              {formData.logoUrl && (
                <div className="image-preview">
                  <img src={formData.logoUrl} alt="Logo preview" />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>URL del Favicon</label>
              <input
                type="url"
                value={formData.faviconUrl}
                onChange={(e) => handleInputChange('root', 'faviconUrl', e.target.value)}
                placeholder="https://ejemplo.com/favicon.ico"
              />
            </div>

            <div className="form-group">
              <label>URL de Imagen de Fondo</label>
              <input
                type="url"
                value={formData.backgroundImageUrl}
                onChange={(e) => handleInputChange('root', 'backgroundImageUrl', e.target.value)}
                placeholder="https://ejemplo.com/background.jpg"
              />
              {formData.backgroundImageUrl && (
                <div className="image-preview">
                  <img src={formData.backgroundImageUrl} alt="Background preview" />
                </div>
              )}
            </div>

            <div className="info-box">
              <i className="fas fa-info-circle"></i>
              <p>Las imágenes deben estar alojadas en un servidor público. Puedes usar servicios como Firebase Storage, Imgur, o tu propio servidor web.</p>
            </div>
          </div>
        )}

        {/* Colores del Tema */}
        {activeTab === 'colors' && (
          <div className="config-section">
            <h2><i className="fas fa-palette"></i> Colores del Tema</h2>
            <p className="section-description">Personaliza los colores principales de tu institución</p>
            
            {/* Temas Predefinidos */}
            <div className="preset-themes-section" style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: '600', color: '#1e293b' }}>
                <i className="fas fa-magic" style={{ marginRight: '0.5rem', color: '#7c3aed' }}></i>
                Temas Predefinidos
              </h3>
              <p style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                Selecciona un tema predefinido para aplicar todos los colores de una vez. Puedes personalizarlos después.
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '1rem' 
              }}>
                {institutionConfigService.getPresetThemes().map((theme) => (
                  <button
                    key={theme.name}
                    onClick={async () => {
                      const result = await institutionConfigService.applyPresetTheme(theme.name);
                      if (result.success) {
                        // Recargar configuración
                        const newConfig = institutionConfigService.getConfig();
                        setFormData(newConfig);
                        showMessage(`✅ Tema "${theme.name}" aplicado exitosamente`, 'success');
                      } else {
                        showMessage(`❌ Error al aplicar tema: ${result.error}`, 'error');
                      }
                    }}
                    style={{
                      padding: '1rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.primary}33`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                        flexShrink: 0
                      }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                          {theme.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {theme.description}
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      marginTop: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: theme.colors.primary,
                        border: '1px solid #e2e8f0'
                      }} title="Primario"></div>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: theme.colors.secondary,
                        border: '1px solid #e2e8f0'
                      }} title="Secundario"></div>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: theme.colors.accent,
                        border: '1px solid #e2e8f0'
                      }} title="Acento"></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <i className="fas fa-info-circle" style={{ color: '#d97706' }}></i>
                <strong style={{ color: '#92400e' }}>Personalización Manual</strong>
              </div>
              <p style={{ color: '#78350f', fontSize: '0.9rem', margin: 0 }}>
                Ajusta individualmente cada color usando los controles a continuación. Los cambios se aplican en tiempo real.
              </p>
            </div>
            
            <div className="color-grid">
              <div className="color-input-group">
                <label>Color Primario</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    placeholder="#1e3a8a"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Primario Claro</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.primaryLight || '#1a4a9d'}
                    onChange={(e) => handleColorChange('primaryLight', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.primaryLight || '#1a4a9d'}
                    onChange={(e) => handleColorChange('primaryLight', e.target.value)}
                    placeholder="#1a4a9d"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Primario Oscuro</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.primaryDark || '#001c54'}
                    onChange={(e) => handleColorChange('primaryDark', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.primaryDark || '#001c54'}
                    onChange={(e) => handleColorChange('primaryDark', e.target.value)}
                    placeholder="#001c54"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Color Secundario</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                    placeholder="#10b981"
                  />
                </div>
              </div>

              <div className="col-span-full mt-4 mb-2">
                <h4 className="font-bold text-lg">Colores de Marca Institucional</h4>
                <p className="text-sm text-gray-500 mb-2">Estos colores definen la identidad visual en Home y Login</p>
              </div>

              <div className="color-input-group">
                <label>Azul Marca (Principal)</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.brandBlue || '#004684'}
                    onChange={(e) => handleColorChange('brandBlue', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.brandBlue || '#004684'}
                    onChange={(e) => handleColorChange('brandBlue', e.target.value)}
                    placeholder="#004684"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Azul Claro</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.brandBlueLight || '#0b6eca'}
                    onChange={(e) => handleColorChange('brandBlueLight', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.brandBlueLight || '#0b6eca'}
                    onChange={(e) => handleColorChange('brandBlueLight', e.target.value)}
                    placeholder="#0b6eca"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Azul Hover</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.brandBlueHover || '#005b9f'}
                    onChange={(e) => handleColorChange('brandBlueHover', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.brandBlueHover || '#005b9f'}
                    onChange={(e) => handleColorChange('brandBlueHover', e.target.value)}
                    placeholder="#005b9f"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Rojo Marca</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.brandRed || '#ce0e2d'}
                    onChange={(e) => handleColorChange('brandRed', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.brandRed || '#ce0e2d'}
                    onChange={(e) => handleColorChange('brandRed', e.target.value)}
                    placeholder="#ce0e2d"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Rojo Hover</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.brandRedHover || '#b50d27'}
                    onChange={(e) => handleColorChange('brandRedHover', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.brandRedHover || '#b50d27'}
                    onChange={(e) => handleColorChange('brandRedHover', e.target.value)}
                    placeholder="#b50d27"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Amarillo Marca</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.brandYellow || '#ffd700'}
                    onChange={(e) => handleColorChange('brandYellow', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.brandYellow || '#ffd700'}
                    onChange={(e) => handleColorChange('brandYellow', e.target.value)}
                    placeholder="#ffd700"
                  />
                </div>
              </div>

              <div className="col-span-full mt-4 mb-2">
                <h4 className="font-bold text-lg">Colores de Estado y Sistema</h4>
              </div>

              <div className="color-input-group">
                <label>Color de Acento</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.accent}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.accent}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                    placeholder="#f59e0b"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Acento Claro</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.accentLight || '#ffe066'}
                    onChange={(e) => handleColorChange('accentLight', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.accentLight || '#ffe066'}
                    onChange={(e) => handleColorChange('accentLight', e.target.value)}
                    placeholder="#ffe066"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Acento Oscuro</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.accentDark || '#e6b800'}
                    onChange={(e) => handleColorChange('accentDark', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.accentDark || '#e6b800'}
                    onChange={(e) => handleColorChange('accentDark', e.target.value)}
                    placeholder="#e6b800"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Fondo</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.background}
                    onChange={(e) => handleColorChange('background', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.background}
                    onChange={(e) => handleColorChange('background', e.target.value)}
                    placeholder="#f8fafc"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Superficie</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.surface}
                    onChange={(e) => handleColorChange('surface', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.surface}
                    onChange={(e) => handleColorChange('surface', e.target.value)}
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Texto Principal</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.textPrimary}
                    onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.textPrimary}
                    onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                    placeholder="#1e293b"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Texto Secundario</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.textSecondary}
                    onChange={(e) => handleColorChange('textSecondary', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.textSecondary}
                    onChange={(e) => handleColorChange('textSecondary', e.target.value)}
                    placeholder="#64748b"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Error</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.error}
                    onChange={(e) => handleColorChange('error', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.error}
                    onChange={(e) => handleColorChange('error', e.target.value)}
                    placeholder="#ef4444"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Éxito</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.success}
                    onChange={(e) => handleColorChange('success', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.success}
                    onChange={(e) => handleColorChange('success', e.target.value)}
                    placeholder="#10b981"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Advertencia</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.warning}
                    onChange={(e) => handleColorChange('warning', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.warning}
                    onChange={(e) => handleColorChange('warning', e.target.value)}
                    placeholder="#f59e0b"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Información</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={formData.colors.info}
                    onChange={(e) => handleColorChange('info', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colors.info}
                    onChange={(e) => handleColorChange('info', e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>

            {/* Panel de Vista Previa Visual */}
            <div className="live-preview-panel">
              <h3>
                <i className="fas fa-desktop"></i> Vista Previa en Vivo
              </h3>
              <div className="preview-components">
                {/* Botones de ejemplo */}
                <div className="preview-section">
                  <h4>Botones</h4>
                  <div className="preview-buttons">
                    <button 
                      className="preview-btn preview-btn-primary" 
                      style={{background: formData.colors.primary}}
                    >
                      Primario
                    </button>
                    <button 
                      className="preview-btn preview-btn-secondary" 
                      style={{background: formData.colors.secondary}}
                    >
                      Secundario
                    </button>
                    <button 
                      className="preview-btn preview-btn-accent" 
                      style={{background: formData.colors.accent}}
                    >
                      Acento
                    </button>
                  </div>
                </div>

                {/* Tarjetas de ejemplo */}
                <div className="preview-section">
                  <h4>Tarjeta</h4>
                  <div 
                    className="preview-card" 
                    style={{
                      backgroundColor: formData.colors.surface,
                      borderTop: `4px solid ${formData.colors.primary}`
                    }}
                  >
                    <h5 style={{color: formData.colors.textPrimary}}>
                      Título de Tarjeta
                    </h5>
                    <p style={{color: formData.colors.textSecondary}}>
                      Este es un texto de ejemplo para mostrar cómo se verán los colores en la interfaz.
                    </p>
                    <button 
                      className="preview-btn-small" 
                      style={{background: formData.colors.primary}}
                    >
                      Acción
                    </button>
                  </div>
                </div>

                {/* Estados */}
                <div className="preview-section">
                  <h4>Estados</h4>
                  <div className="preview-states">
                    <div 
                      className="preview-badge" 
                      style={{backgroundColor: formData.colors.success}}
                    >
                      <i className="fas fa-check-circle"></i> Éxito
                    </div>
                    <div 
                      className="preview-badge" 
                      style={{backgroundColor: formData.colors.warning}}
                    >
                      <i className="fas fa-exclamation-triangle"></i> Advertencia
                    </div>
                    <div 
                      className="preview-badge" 
                      style={{backgroundColor: formData.colors.error}}
                    >
                      <i className="fas fa-times-circle"></i> Error
                    </div>
                    <div 
                      className="preview-badge" 
                      style={{backgroundColor: formData.colors.info}}
                    >
                      <i className="fas fa-info-circle"></i> Información
                    </div>
                  </div>
                </div>
              </div>

              <div className="preview-note">
                <i className="fas fa-lightbulb"></i>
                <p>Los cambios se aplican automáticamente. Guarda para hacerlos permanentes.</p>
              </div>
            </div>
          </div>
        )}

        {/* Información de Contacto */}
        {activeTab === 'contact' && (
          <div className="config-section">
            <h2><i className="fas fa-phone"></i> Información de Contacto</h2>
            
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                value={formData.contact.email}
                onChange={(e) => handleInputChange('contact', 'email', e.target.value)}
                placeholder="contacto@institucion.edu.mx"
              />
            </div>

            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                value={formData.contact.phone}
                onChange={(e) => handleInputChange('contact', 'phone', e.target.value)}
                placeholder="+52 55 1234 5678"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp</label>
              <input
                type="tel"
                value={formData.contact.whatsapp}
                onChange={(e) => handleInputChange('contact', 'whatsapp', e.target.value)}
                placeholder="+52 55 1234 5678"
              />
            </div>

            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                value={formData.contact.address}
                onChange={(e) => handleInputChange('contact', 'address', e.target.value)}
                placeholder="Calle Principal #123, Colonia, Ciudad"
              />
            </div>

            <div className="form-group">
              <label>Sitio Web</label>
              <input
                type="url"
                value={formData.contact.website}
                onChange={(e) => handleInputChange('contact', 'website', e.target.value)}
                placeholder="https://www.institucion.edu.mx"
              />
            </div>

            <div className="form-group">
              <label>Horario de Atención</label>
              <textarea
                value={formData.contact.scheduleText}
                onChange={(e) => handleInputChange('contact', 'scheduleText', e.target.value)}
                placeholder="Lunes a Viernes: 8:00 - 18:00"
                rows="3"
              />
            </div>
          </div>
        )}

        {/* Características del Sistema */}
        {activeTab === 'features' && (
          <div className="config-section">
            <h2><i className="fas fa-toggle-on"></i> Características del Sistema</h2>
            
            <div className="toggle-group">
              <div className="toggle-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.features.chatbotEnabled}
                    onChange={(e) => handleInputChange('features', 'chatbotEnabled', e.target.checked)}
                  />
                  <span>Habilitar ChatBot con IA</span>
                </label>
              </div>

              <div className="toggle-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.features.statisticsEnabled}
                    onChange={(e) => handleInputChange('features', 'statisticsEnabled', e.target.checked)}
                  />
                  <span>Habilitar Estadísticas</span>
                </label>
              </div>

              <div className="toggle-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.features.reportsEnabled}
                    onChange={(e) => handleInputChange('features', 'reportsEnabled', e.target.checked)}
                  />
                  <span>Habilitar Reportes PDF</span>
                </label>
              </div>

              <div className="toggle-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.features.darkModeEnabled}
                    onChange={(e) => handleInputChange('features', 'darkModeEnabled', e.target.checked)}
                  />
                  <span>Habilitar Modo Oscuro</span>
                </label>
              </div>

              <div className="toggle-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.features.multiLanguage}
                    onChange={(e) => handleInputChange('features', 'multiLanguage', e.target.checked)}
                  />
                  <span>Soporte Multi-idioma</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Redes Sociales */}
        {activeTab === 'social' && (
          <div className="config-section">
            <h2><i className="fas fa-share-alt"></i> Redes Sociales</h2>
            <p className="section-description">Enlaces a perfiles de redes sociales de tu institución</p>
            
            <div className="form-group">
              <label>
                <i className="fab fa-facebook"></i> Facebook
              </label>
              <input
                type="url"
                value={formData.socialMedia?.facebook || ''}
                onChange={(e) => handleInputChange('socialMedia', 'facebook', e.target.value)}
                placeholder="https://facebook.com/tu-institucion"
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fab fa-twitter"></i> Twitter / X
              </label>
              <input
                type="url"
                value={formData.socialMedia?.twitter || ''}
                onChange={(e) => handleInputChange('socialMedia', 'twitter', e.target.value)}
                placeholder="https://twitter.com/tu-institucion"
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fab fa-instagram"></i> Instagram
              </label>
              <input
                type="url"
                value={formData.socialMedia?.instagram || ''}
                onChange={(e) => handleInputChange('socialMedia', 'instagram', e.target.value)}
                placeholder="https://instagram.com/tu-institucion"
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fab fa-linkedin"></i> LinkedIn
              </label>
              <input
                type="url"
                value={formData.socialMedia?.linkedin || ''}
                onChange={(e) => handleInputChange('socialMedia', 'linkedin', e.target.value)}
                placeholder="https://linkedin.com/company/tu-institucion"
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fab fa-youtube"></i> YouTube
              </label>
              <input
                type="url"
                value={formData.socialMedia?.youtube || ''}
                onChange={(e) => handleInputChange('socialMedia', 'youtube', e.target.value)}
                placeholder="https://youtube.com/@tu-institucion"
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fab fa-tiktok"></i> TikTok
              </label>
              <input
                type="url"
                value={formData.socialMedia?.tiktok || ''}
                onChange={(e) => handleInputChange('socialMedia', 'tiktok', e.target.value)}
                placeholder="https://tiktok.com/@tu-institucion"
              />
            </div>

            <div className="info-box">
              <i className="fas fa-info-circle"></i>
              <p>Los iconos de redes sociales se mostrarán automáticamente en el footer y páginas de contacto cuando agregues las URLs.</p>
            </div>
          </div>
        )}

        {/* Configuración Avanzada */}
        {activeTab === 'advanced' && (
          <div className="config-section">
            <h2><i className="fas fa-sliders-h"></i> Configuración Avanzada</h2>
            <p className="section-description">Opciones adicionales y configuraciones de interfaz</p>
            
            <h3>📝 SEO y Metadatos</h3>
            <div className="form-group">
              <label>Meta Descripción (SEO)</label>
              <textarea
                value={formData.seo?.metaDescription || ''}
                onChange={(e) => handleInputChange('seo', 'metaDescription', e.target.value)}
                placeholder="Descripción breve de tu institución para motores de búsqueda"
                rows="3"
                maxLength="160"
              />
              <small>{(formData.seo?.metaDescription || '').length} / 160 caracteres</small>
            </div>

            <div className="form-group">
              <label>Palabras Clave (Keywords)</label>
              <input
                type="text"
                value={formData.seo?.metaKeywords || ''}
                onChange={(e) => handleInputChange('seo', 'metaKeywords', e.target.value)}
                placeholder="educación, universidad, cursos, México"
              />
              <small>Separadas por comas</small>
            </div>

            <hr />

            <h3>🎨 Configuración de Interfaz</h3>
            <div className="toggle-group">
              <div className="toggle-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.uiSettings?.showWelcomeMessage || false}
                    onChange={(e) => handleInputChange('uiSettings', 'showWelcomeMessage', e.target.checked)}
                  />
                  <span>Mostrar Mensaje de Bienvenida</span>
                </label>
              </div>

              {formData.uiSettings?.showWelcomeMessage && (
                <div className="form-group">
                  <label>Mensaje de Bienvenida</label>
                  <input
                    type="text"
                    value={formData.uiSettings?.welcomeMessage || ''}
                    onChange={(e) => handleInputChange('uiSettings', 'welcomeMessage', e.target.value)}
                    placeholder="Bienvenido al sistema de gestión académica"
                  />
                </div>
              )}

              <div className="toggle-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.uiSettings?.animationsEnabled || true}
                    onChange={(e) => handleInputChange('uiSettings', 'animationsEnabled', e.target.checked)}
                  />
                  <span>Habilitar Animaciones</span>
                </label>
              </div>

              <div className="toggle-item">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.uiSettings?.compactMode || false}
                    onChange={(e) => handleInputChange('uiSettings', 'compactMode', e.target.checked)}
                  />
                  <span>Modo Compacto (Menos espaciado)</span>
                </label>
              </div>
            </div>

            <hr />

            <h3>📊 Información Adicional</h3>
            <div className="info-cards">
              <div className="info-card">
                <i className="fas fa-database"></i>
                <h4>Base de Datos</h4>
                <p>Conectado a Firebase Realtime Database</p>
              </div>
              <div className="info-card">
                <i className="fas fa-code-branch"></i>
                <h4>Versión</h4>
                <p>v{formData.version || '1.0.0'}</p>
              </div>
              <div className="info-card">
                <i className="fas fa-calendar"></i>
                <h4>Última Actualización</h4>
                <p>{formData.lastUpdated ? new Date(formData.lastUpdated).toLocaleString('es-MX') : 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="developer-actions">
        <div className="actions-left">
          <button className="btn btn-export" onClick={handleExport}>
            <i className="fas fa-download"></i> Exportar Configuración
          </button>
          
          <label className="btn btn-import">
            <i className="fas fa-upload"></i> Importar Configuración
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>

          <button className="btn btn-reset" onClick={handleReset}>
            <i className="fas fa-undo"></i> Restablecer a La Salle
          </button>
        </div>

        <div className="actions-right">
          <button className="btn btn-success" onClick={handleSave}>
            <i className="fas fa-save"></i> Guardar y Aplicar Cambios
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {message.text && (
        <div className={`developer-message ${message.type}`}>
          <i className={`fas fa-${message.type === 'success' ? 'check-circle' : message.type === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
          {message.text}
        </div>
      )}
        </div>

        {/* Panel de Vista Previa en Vivo */}
        {splitView && (
          <div className="live-preview-container">
            <div className="preview-header">
              <h3>
                <i className="fas fa-eye"></i>
                Vista Previa: {
                  selectedInterface === 'admin' ? 'Panel Administrador' :
                  selectedInterface === 'docente' ? 'Panel Docente' :
                  selectedInterface === 'loginAdmin' ? 'Login Administrador' :
                  selectedInterface === 'loginDocente' ? 'Login Docente' :
                  'Interfaz'
                }
              </h3>
              <div className="preview-device-selector">
                <button 
                  className="device-btn"
                  onClick={() => setPreviewScale(1)}
                  title="Vista escritorio"
                >
                  <i className="fas fa-desktop"></i>
                </button>
                <button 
                  className="device-btn"
                  onClick={() => setPreviewScale(0.75)}
                  title="Vista tablet"
                >
                  <i className="fas fa-tablet-alt"></i>
                </button>
                <button 
                  className="device-btn"
                  onClick={() => setPreviewScale(0.5)}
                  title="Vista móvil"
                >
                  <i className="fas fa-mobile-alt"></i>
                </button>
              </div>
            </div>
            <div className="preview-iframe-container">
              <div 
                className="preview-frame"
                style={{ 
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  width: `${100 / previewScale}%`,
                  height: `${100 / previewScale}%`
                }}
              >
                <iframe
                  src={
                    selectedInterface === 'admin' ? '/admin' :
                    selectedInterface === 'docente' ? '/docente' :
                    selectedInterface === 'loginAdmin' ? '/login-admin' :
                    selectedInterface === 'loginDocente' ? '/login-docente' :
                    '/admin'
                  }
                  title="Vista Previa"
                  className="preview-iframe"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
            </div>
            <div className="preview-footer">
              <span className="preview-info">
                <i className="fas fa-info-circle"></i>
                Los cambios se aplican automáticamente. Recarga el iframe si no se reflejan.
              </span>
              <button 
                className="btn btn-sm btn-refresh"
                onClick={() => {
                  const iframe = document.querySelector('.preview-iframe');
                  if (iframe) iframe.src = iframe.src;
                  showMessage('🔄 Vista previa recargada', 'info');
                }}
              >
                <i className="fas fa-sync-alt"></i>
                Recargar Vista Previa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperPanel;


