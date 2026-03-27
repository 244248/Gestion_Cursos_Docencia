import React, { useState, useRef, useEffect } from 'react';
import { ref, update, get } from 'firebase/database';
import { rtdb } from '../firebase/config';
import './styles/DocenteProfile.css';

const DocenteProfile = ({ teacher, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: teacher?.nombre || '',
    email: teacher?.email || '',
    matricula: teacher?.matricula || '',
    area: teacher?.area || '',
    fotoUrl: teacher?.fotoUrl || '',
    idioma: teacher?.idioma || 'es-ES',
    privacidad: teacher?.privacidad || 'admin-y-docentes',
    notificacionesSecuencias: teacher?.notificacionesSecuencias !== undefined ? teacher.notificacionesSecuencias : true,
    notificacionesEmail: teacher?.notificacionesEmail !== undefined ? teacher.notificacionesEmail : true,
    notificacionesPopups: teacher?.notificacionesPopups !== undefined ? teacher.notificacionesPopups : true
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Actualizar formData cuando cambie el teacher
  useEffect(() => {
    if (teacher) {
      setFormData({
        nombre: teacher.nombre || '',
        email: teacher.email || '',
        matricula: teacher.matricula || '',
        area: teacher.area || '',
        fotoUrl: teacher.fotoUrl || '',
        idioma: teacher.idioma || 'es-ES',
        privacidad: teacher.privacidad || 'admin-y-docentes',
        notificacionesSecuencias: teacher.notificacionesSecuencias !== undefined ? teacher.notificacionesSecuencias : true,
        notificacionesEmail: teacher.notificacionesEmail !== undefined ? teacher.notificacionesEmail : true,
        notificacionesPopups: teacher.notificacionesPopups !== undefined ? teacher.notificacionesPopups : true
      });
    }
  }, [teacher]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen');
      return;
    }

    // Limitar a 1MB para Base64 (Realtime Database tiene límite similar)
    if (file.size > 1 * 1024 * 1024) {
      alert('La imagen debe ser menor a 1MB. Por favor, comprime la imagen antes de subirla.');
      return;
    }

    setUploading(true);
    try {
      // Convertir imagen a Base64
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const base64String = event.target.result;
          
          // Comprimir imagen si es muy grande
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Redimensionar si es muy grande (máximo 500x500px)
            const maxSize = 500;
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height * maxSize) / width;
                width = maxSize;
              } else {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a Base64 con compresión
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            handleInputChange('fotoUrl', compressedBase64);
            setUploading(false);
            alert('Imagen cargada exitosamente');
          };
          
          img.onerror = () => {
            setUploading(false);
            alert('Error al procesar la imagen. Por favor, intenta con otra imagen.');
          };
          
          img.src = base64String;
        } catch (error) {
          console.error('Error al procesar imagen:', error);
          setUploading(false);
          alert('Error al procesar la imagen. Por favor, intenta de nuevo.');
        }
      };
      
      reader.onerror = () => {
        setUploading(false);
        alert('Error al leer el archivo. Por favor, intenta de nuevo.');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error al cargar imagen:', error);
      setUploading(false);
      alert('Error al cargar la imagen. Por favor, intenta de nuevo.');
    }
  };

  const handleSave = async () => {
    try {
      if (!teacher || !teacher.key) {
        alert('Error: No se pudo identificar al docente');
        return;
      }

      // Actualizar en Realtime Database
      const teacherRef = ref(rtdb, `docentes/${teacher.key}`);
      const updates = {
        nombre: formData.nombre,
        email: formData.email,
        matricula: formData.matricula,
        area: formData.area,
        fotoUrl: formData.fotoUrl,
        idioma: formData.idioma,
        privacidad: formData.privacidad,
        notificacionesSecuencias: formData.notificacionesSecuencias,
        notificacionesEmail: formData.notificacionesEmail,
        notificacionesPopups: formData.notificacionesPopups,
        ultimaActualizacion: new Date().toISOString()
      };

      await update(teacherRef, updates);

      if (onUpdate) {
        onUpdate({
          ...teacher,
          ...updates
        });
      }

      setIsEditing(false);
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      alert('Error al guardar el perfil. Por favor, intenta de nuevo.');
    }
  };

  const getUsername = () => {
    const email = formData.email || teacher?.email || '';
    return email.split('@')[0] || 'docente';
  };

  const getPrivacidadText = () => {
    const options = {
      'admin-y-docentes': 'Solo los administradores y otros profesores pueden ver la información de mi perfil',
      'solo-admin': 'Solo los administradores pueden ver la información de mi perfil',
      'todos': 'Todos pueden ver la información de mi perfil'
    };
    return options[formData.privacidad] || options['admin-y-docentes'];
  };

  const getIdiomaText = () => {
    const idiomas = {
      'es-ES': 'Español (España)',
      'es-MX': 'Español (México)',
      'en-US': 'English (United States)',
      'fr-FR': 'Français (France)'
    };
    return idiomas[formData.idioma] || 'Español (España)';
  };

  const formatArea = (area) => {
    const areas = {
      'bachillerato': 'Bachillerato',
      'licenciatura': 'Licenciatura',
      'posgrado': 'Posgrado',
      'otros': 'Otros'
    };
    return areas[area] || area;
  };

  return (
    <div className="docente-profile-overlay" onClick={onClose}>
      <div className="docente-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="docente-profile-header">
          <h2>Perfil de Usuario</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="docente-profile-content">
          {/* Foto de perfil y nombre */}
          <div className="profile-header-section">
            <div className="profile-picture-container">
              <div className="profile-picture-wrapper">
                {formData.fotoUrl ? (
                  <img 
                    src={formData.fotoUrl} 
                    alt="Foto de perfil" 
                    className="profile-picture"
                  />
                ) : (
                  <div className="profile-picture-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                )}
                {isEditing && (
                  <div className={`profile-picture-overlay ${uploading ? 'uploading' : ''}`}>
                    <button 
                      className="upload-btn"
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-camera"></i>
                          Cambiar foto
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
            <div className="profile-name-section">
              <h3 className="profile-full-name">{formData.nombre || 'Docente'}</h3>
              <p className="profile-username">{getUsername()}</p>
            </div>
          </div>

          {/* Información básica */}
          <div className="profile-section">
            <h3 className="section-title">Información básica</h3>
            <div className="info-row">
              <span className="info-label">Nombre completo</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Nombre completo"
                  className="edit-input"
                />
              ) : (
                <span className="info-value">{formData.nombre || 'No especificado'}</span>
              )}
            </div>
            <div className="info-row">
              <span className="info-label">Dirección de correo electrónico</span>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="edit-input"
                />
              ) : (
                <span className="info-value">{formData.email || 'No especificado'}</span>
              )}
            </div>
            <div className="info-row">
              <span className="info-label">Matrícula</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.matricula}
                  onChange={(e) => handleInputChange('matricula', e.target.value)}
                  placeholder="Matrícula"
                  className="edit-input"
                />
              ) : (
                <span className="info-value">{formData.matricula || 'No especificado'}</span>
              )}
            </div>
            <div className="info-row">
              <span className="info-label">Área</span>
              {isEditing ? (
                <select
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                  className="edit-select"
                >
                  <option value="bachillerato">Bachillerato</option>
                  <option value="licenciatura">Licenciatura</option>
                  <option value="posgrado">Posgrado</option>
                  <option value="otros">Otros</option>
                </select>
              ) : (
                <span className="info-value">{formatArea(formData.area) || 'No especificado'}</span>
              )}
            </div>
          </div>

          {/* Configuración del sistema */}
          <div className="profile-section">
            <h3 className="section-title">Configuración del sistema</h3>
            <div className="info-row">
              <span className="info-label">Idioma</span>
              {isEditing ? (
                <select
                  value={formData.idioma}
                  onChange={(e) => handleInputChange('idioma', e.target.value)}
                  className="edit-select"
                >
                  <option value="es-ES">Español (España)</option>
                  <option value="es-MX">Español (México)</option>
                  <option value="en-US">English (United States)</option>
                  <option value="fr-FR">Français (France)</option>
                </select>
              ) : (
                <span className="info-value">Predeterminado del sistema ({getIdiomaText()})</span>
              )}
            </div>
            <div className="info-row">
              <span className="info-label">Ajustes de privacidad</span>
              {isEditing ? (
                <select
                  value={formData.privacidad}
                  onChange={(e) => handleInputChange('privacidad', e.target.value)}
                  className="edit-select"
                >
                  <option value="admin-y-docentes">Solo administradores y profesores</option>
                  <option value="solo-admin">Solo administradores</option>
                  <option value="todos">Todos</option>
                </select>
              ) : (
                <span className="info-value">{getPrivacidadText()}</span>
              )}
            </div>
            <div className="info-row">
              <span className="info-label">Ajustes de notificaciones generales</span>
              {isEditing ? (
                <div className="notifications-edit">
                  <label className="notification-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.notificacionesSecuencias}
                      onChange={(e) => handleInputChange('notificacionesSecuencias', e.target.checked)}
                    />
                    <span>Notificaciones de secuencias</span>
                  </label>
                  <label className="notification-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.notificacionesEmail}
                      onChange={(e) => handleInputChange('notificacionesEmail', e.target.checked)}
                    />
                    <span>Notificaciones por correo electrónico</span>
                  </label>
                  <label className="notification-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.notificacionesPopups}
                      onChange={(e) => handleInputChange('notificacionesPopups', e.target.checked)}
                    />
                    <span>Notificaciones emergentes</span>
                  </label>
                </div>
              ) : (
                <div className="notifications-links">
                  {formData.notificacionesSecuencias && (
                    <a href="#" className="notification-link">Notificaciones de secuencias</a>
                  )}
                  {formData.notificacionesEmail && (
                    <a href="#" className="notification-link">Notificaciones por correo electrónico</a>
                  )}
                  {formData.notificacionesPopups && (
                    <a href="#" className="notification-link">Notificaciones emergentes</a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="profile-actions">
            {isEditing ? (
              <>
                <button className="btn btn-primary" onClick={handleSave}>
                  <i className="fas fa-save"></i> Guardar Cambios
                </button>
                <button className="btn btn-secondary" onClick={() => {
                  setFormData({
                    nombre: teacher?.nombre || '',
                    email: teacher?.email || '',
                    matricula: teacher?.matricula || '',
                    area: teacher?.area || '',
                    fotoUrl: teacher?.fotoUrl || '',
                    idioma: teacher?.idioma || 'es-ES',
                    privacidad: teacher?.privacidad || 'admin-y-docentes',
                    notificacionesSecuencias: teacher?.notificacionesSecuencias !== undefined ? teacher.notificacionesSecuencias : true,
                    notificacionesEmail: teacher?.notificacionesEmail !== undefined ? teacher.notificacionesEmail : true,
                    notificacionesPopups: teacher?.notificacionesPopups !== undefined ? teacher.notificacionesPopups : true
                  });
                  setIsEditing(false);
                }}>
                  <i className="fas fa-times"></i> Cancelar
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                <i className="fas fa-edit"></i> Editar Perfil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocenteProfile;

