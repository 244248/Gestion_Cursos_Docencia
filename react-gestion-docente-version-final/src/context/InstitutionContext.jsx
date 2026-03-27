import React, { createContext, useContext, useState, useEffect } from 'react';
import institutionConfigService from '../services/InstitutionConfigService';

/**
 * Contexto para gestionar la configuración institucional
 * Permite acceso global a la personalización de la institución
 */
const InstitutionContext = createContext();

/**
 * Hook personalizado para usar el contexto de institución
 */
export const useInstitution = () => {
  const context = useContext(InstitutionContext);
  if (!context) {
    throw new Error('useInstitution debe usarse dentro de InstitutionProvider');
  }
  return context;
};

/**
 * Provider del contexto de institución
 */
export const InstitutionProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Cargar configuración al montar el componente
   */
  useEffect(() => {
    loadConfiguration();
    
    // Suscribirse a cambios en tiempo real
    const unsubscribe = institutionConfigService.subscribe((newConfig) => {
      console.log('📢 Configuración actualizada desde Firebase:', newConfig.institutionName);
      setConfig(newConfig);
    });
    
    // Limpiar suscripción al desmontar
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Cargar configuración desde el servicio
   */
  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const loadedConfig = await institutionConfigService.loadConfig();
      setConfig(loadedConfig);
      
      // Actualizar título y favicon
      institutionConfigService.updatePageTitle(loadedConfig.institutionName);
      if (loadedConfig.faviconUrl) {
        institutionConfigService.updateFavicon(loadedConfig.faviconUrl);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error al cargar configuración institucional:', err);
      setError(err.message);
      // Usar configuración por defecto en caso de error
      setConfig(institutionConfigService.getConfig());
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar configuración
   */
  const updateConfiguration = async (newConfig) => {
    try {
      setLoading(true);
      const result = await institutionConfigService.saveConfig(newConfig);
      
      if (result.success) {
        setConfig(result.config);
        
        // Actualizar título y favicon
        institutionConfigService.updatePageTitle(result.config.institutionName);
        if (result.config.faviconUrl) {
          institutionConfigService.updateFavicon(result.config.faviconUrl);
        }
        
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error al actualizar configuración:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restablecer a configuración por defecto
   */
  const resetConfiguration = async () => {
    try {
      setLoading(true);
      const result = await institutionConfigService.resetToDefault();
      
      if (result.success) {
        setConfig(result.config);
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error al restablecer configuración:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Recargar configuración
   */
  const reloadConfiguration = () => {
    loadConfiguration();
  };

  const value = {
    config,
    loading,
    error,
    updateConfiguration,
    resetConfiguration,
    reloadConfiguration,
    
    // Accesos directos a propiedades comunes
    institutionName: config?.institutionName || '',
    institutionShortName: config?.institutionShortName || '',
    institutionSlogan: config?.institutionSlogan || '',
    logoUrl: config?.logoUrl || '',
    colors: config?.colors || {},
    contact: config?.contact || {},
    features: config?.features || {}
  };

  return (
    <InstitutionContext.Provider value={value}>
      {children}
    </InstitutionContext.Provider>
  );
};

export default InstitutionContext;


