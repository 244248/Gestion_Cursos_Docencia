import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref as rtdbRef, update as rtdbUpdate } from 'firebase/database';
import { db, rtdb } from '../firebase/config';
import './styles/AdminProfile.css';

const AdminProfile = ({ admin, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: admin?.nombre || '',
    apellidos: admin?.apellidos || '',
    email: admin?.email || '',
    fotoUrl: admin?.fotoUrl || '',
    idioma: admin?.idioma || 'es-ES',
    privacidad: admin?.privacidad || 'admin-y-docentes',
    notificacionesSecuencias: admin?.notificacionesSecuencias !== undefined ? admin.notificacionesSecuencias : true,
    notificacionesEmail: admin?.notificacionesEmail !== undefined ? admin.notificacionesEmail : true,
    notificacionesPopups: admin?.notificacionesPopups !== undefined ? admin.notificacionesPopups : true
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Actualizar formData cuando cambie el admin
  useEffect(() => {
    if (admin) {
      setFormData({
        nombre: admin.nombre || '',
        apellidos: admin.apellidos || '',
        email: admin.email || '',
        fotoUrl: admin.fotoUrl || '',
        idioma: admin.idioma || 'es-ES',
        privacidad: admin.privacidad || 'admin-y-docentes',
        notificacionesSecuencias: admin.notificacionesSecuencias !== undefined ? admin.notificacionesSecuencias : true,
        notificacionesEmail: admin.notificacionesEmail !== undefined ? admin.notificacionesEmail : true,
        notificacionesPopups: admin.notificacionesPopups !== undefined ? admin.notificacionesPopups : true
      });
    }
  }, [admin]);

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

    // Limitar a 1MB para Base64 (Firestore tiene límite de 1MB por documento)
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
      // Actualizar en Firestore
      const adminDocRef = doc(db, 'administradores', admin.uid);
      await updateDoc(adminDocRef, {
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        fotoUrl: formData.fotoUrl,
        idioma: formData.idioma,
        privacidad: formData.privacidad,
        notificacionesSecuencias: formData.notificacionesSecuencias,
        notificacionesEmail: formData.notificacionesEmail,
        notificacionesPopups: formData.notificacionesPopups,
        ultimaActualizacion: new Date().toISOString()
      });

      // Actualizar en Realtime Database si existe
      const sanitizedName = (formData.nombre || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (sanitizedName) {
        const adminRtdbRef = rtdbRef(rtdb, `administradores/${sanitizedName}`);
        await rtdbUpdate(adminRtdbRef, {
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          fotoUrl: formData.fotoUrl,
          idioma: formData.idioma,
          privacidad: formData.privacidad,
          notificacionesSecuencias: formData.notificacionesSecuencias,
          notificacionesEmail: formData.notificacionesEmail,
          notificacionesPopups: formData.notificacionesPopups
        });
      }

      if (onUpdate) {
        onUpdate({
          ...admin,
          ...formData
        });
      }

      setIsEditing(false);
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      alert('Error al guardar el perfil. Por favor, intenta de nuevo.');
    }
  };

  const getNombreCompleto = () => {
    return `${formData.nombre || ''} ${formData.apellidos || ''}`.trim() || 'Administrador';
  };

  const getUsername = () => {
    const email = formData.email || admin?.email || '';
    return email.split('@')[0] || 'admin';
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

  return (
    <div className="admin-profile-overlay" onClick={onClose}>
      <div className="admin-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-profile-header">
          <h2>Perfil de Usuario</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="admin-profile-content">
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
              <h3 className="profile-full-name">{getNombreCompleto()}</h3>
              <p className="profile-username">{getUsername()}</p>
            </div>
          </div>

          {/* Información básica */}
          <div className="profile-section">
            <h3 className="section-title">Información básica</h3>
            <div className="info-row">
              <span className="info-label">Nombre completo</span>
              {isEditing ? (
                <div className="edit-name-fields">
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    placeholder="Nombre"
                    className="edit-input"
                  />
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => handleInputChange('apellidos', e.target.value)}
                    placeholder="Apellidos"
                    className="edit-input"
                  />
                </div>
              ) : (
                <span className="info-value">{getNombreCompleto()}</span>
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
                <span className="info-value">{formData.email || admin?.email || 'No especificado'}</span>
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
                    nombre: admin?.nombre || '',
                    apellidos: admin?.apellidos || '',
                    email: admin?.email || '',
                    fotoUrl: admin?.fotoUrl || '',
                    idioma: admin?.idioma || 'es-ES',
                    privacidad: admin?.privacidad || 'admin-y-docentes',
                    notificacionesSecuencias: admin?.notificacionesSecuencias !== undefined ? admin.notificacionesSecuencias : true,
                    notificacionesEmail: admin?.notificacionesEmail !== undefined ? admin.notificacionesEmail : true,
                    notificacionesPopups: admin?.notificacionesPopups !== undefined ? admin.notificacionesPopups : true
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

export default AdminProfile;

