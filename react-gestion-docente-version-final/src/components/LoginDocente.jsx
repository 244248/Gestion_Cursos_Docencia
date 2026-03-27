import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { auth, rtdb } from '../firebase/config';
import { useInstitution } from '../context/InstitutionContext';
import institutionConfigService from '../services/InstitutionConfigService';
import useInactivityWarning from '../hooks/useInactivityWarning';
import InactivityWarning from './InactivityWarning';
import './styles/LoginDocente.css';

const LoginDocente = () => {
  const navigate = useNavigate();
  const { institutionName, logoUrl } = useInstitution();
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Hook para manejar inactividad de sesión con advertencia (5 minutos total, 1 minuto de advertencia)
  const { showWarning, timeLeft, extendSession } = useInactivityWarning(5, 1);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      localStorage.clear();
      navigate('/', { replace: true });
    }
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  // Escuchar mensajes del modo desarrollador para previsualización
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'APPLY_CONFIG_PREVIEW') {
        const { config, interfaceSettings } = event.data;
        if (config && config.colors) {
          institutionConfigService.applyTheme(config.colors, interfaceSettings);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendVerificationEmail = async (user) => {
    try {
      await sendEmailVerification(user);
      showMessage('Enlace de verificación enviado', 'success');
    } catch (error) {
      console.error('Error al enviar correo de verificación:', error);
      showMessage('Error al enviar enlace de verificación', 'error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Search for teacher data using email across all docentes
      const docentesRef = ref(rtdb, 'docentes');
      const snapshot = await get(docentesRef);
      let teacherData = null;

      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data.email === user.email) {
            teacherData = data;
            teacherData.key = childSnapshot.key;
          }
        });
      }

      if (!teacherData) {
        await auth.signOut();
        showMessage('Usuario no registrado como docente', 'error');
        return;
      }

      const isFirstLogin = teacherData.firstLogin !== false;

      if (isFirstLogin && !user.emailVerified) {
        await sendVerificationEmail(user);
        setShowVerifyModal(true);
      } else if (user.emailVerified) {
        if (isFirstLogin) {
          await update(ref(rtdb, `docentes/${teacherData.key}`), { firstLogin: false });
        }
        showMessage('Inicio de sesión exitoso', 'success');
        localStorage.setItem('teacherKey', teacherData.key);
        setTimeout(() => {
          navigate('/docente');
        }, 1000);
      } else {
        showMessage('Por favor, verifica tu correo electrónico', 'error');
        await sendVerificationEmail(user);
        setShowVerifyModal(true);
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      let errorMessage = 'Error al iniciar sesión';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Correo o contraseña incorrectos';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Correo electrónico inválido';
      }
      showMessage(errorMessage, 'error');
    }
  };

  const checkVerification = async () => {
    try {
      await auth.currentUser.reload();
      const user = auth.currentUser;
      if (user.emailVerified) {
        const docentesRef = ref(rtdb, 'docentes');
        const snapshot = await get(docentesRef);
        let teacherData = null;

        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data.email === user.email) {
              teacherData = data;
              teacherData.key = childSnapshot.key;
            }
          });
        }

        if (teacherData) {
          await update(ref(rtdb, `docentes/${teacherData.key}`), { firstLogin: false });
          setShowVerifyModal(false);
          showMessage('Correo verificado. Inicio de sesión exitoso', 'success');
          localStorage.setItem('teacherKey', teacherData.key);
          setTimeout(() => {
            navigate('/docente');
          }, 1000);
        } else {
          showMessage('Usuario no registrado como docente', 'error');
          await auth.signOut();
        }
      } else {
        showMessage('Aún no has verificado tu correo', 'error');
      }
    } catch (error) {
      console.error('Error al verificar correo:', error);
      showMessage('Error al verificar correo', 'error');
    }
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendVerificationEmail(auth.currentUser);
    }
  };

  return (
    <>
      <div className="login-container">
        {/* Panel izquierdo - Formulario */}
        <div className="login-form-panel">
          <div className="login-header">
            <div className="logo-container">
              <img 
                src={logoUrl || "https://lasalleneza.btl.mx/wp-content/uploads/2024/02/WhatsAppLaSalleNeza.jpg"}
                alt={`Logo ${institutionName || 'Universidad'}`}
                className="logo"
              />
            </div>
            <p className="institution-name-subtitle">{institutionName || 'Universidad La Salle Nezahualcóyotl'}</p>
            <h2>Bienvenido Docente</h2>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Correo Electronico</label>
              <input type="email" id="email" required placeholder="ejemplo@lasalle.edu.mx" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  required 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Iniciar Sesión</button>
          </form>

          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}
          
          <button className="btn back-btn" onClick={() => navigate('/')}>
            Volver
          </button>
        </div>

        {/* Panel derecho - Ilustración */}
        <div className="login-illustration-panel">
          <div className="decorative-element top-left"></div>
          <div className="decorative-element bottom-right"></div>
          <div className="illustration-content">
          </div>
        </div>
      </div>

      {showVerifyModal && (
        <div className="modal show">
          <div className="modal-content">
            <span className="close" onClick={() => setShowVerifyModal(false)}>×</span>
            <h3>Verificación de Correo</h3>
            <p>Se ha enviado un enlace de verificación a tu correo electrónico. Por favor, verifica tu correo para continuar.</p>
            <button onClick={checkVerification} className="btn btn-primary">He Verificado Mi Correo</button>
            <button onClick={resendVerification} className="btn back-btn" style={{ marginTop: '10px' }}>Reenviar Enlace</button>
          </div>
        </div>
      )}

      {/* Componente de advertencia de inactividad */}
      <InactivityWarning 
        show={showWarning}
        timeLeft={timeLeft}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
    </>
  );
};

export default LoginDocente;
