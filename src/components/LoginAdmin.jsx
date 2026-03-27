import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';
import { auth, db, rtdb } from '../firebase/config';
import { useInstitution } from '../context/InstitutionContext';
import institutionConfigService from '../services/InstitutionConfigService';
import useInactivityWarning from '../hooks/useInactivityWarning';
import InactivityWarning from './InactivityWarning';
import './styles/LoginAdmin.css';

const LoginAdmin = () => {
  const navigate = useNavigate();
  const { institutionName, logoUrl } = useInstitution();
  const [showRegister, setShowRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  
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
    }, 4000);
  };

  const handleAuthError = (error) => {
    let errorMessage = "Error en la autenticación";
    
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "El correo ya está registrado";
        break;
      case "auth/invalid-email":
        errorMessage = "Correo electrónico inválido";
        break;
      case "auth/weak-password":
        errorMessage = "La contraseña debe tener al menos 6 caracteres";
        break;
      case "auth/wrong-password":
        errorMessage = "Contraseña incorrecta";
        break;
      case "auth/user-not-found":
        errorMessage = "Usuario no encontrado";
        break;
      case "auth/too-many-requests":
        errorMessage = "Demasiados intentos. Intenta de nuevo más tarde";
        break;
      case "auth/operation-not-allowed":
        errorMessage = "Registro de usuarios no permitido";
        break;
      case "auth/network-request-failed":
        errorMessage = "Error de red. Verifica tu conexión";
        break;
      default:
        errorMessage = `Error: ${error.message}`;
    }
    
    showMessage(errorMessage, "error");
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

  const handleRegister = async (e) => {
    e.preventDefault();
    
    const email = e.target.regEmail.value;
    const name = e.target.regName.value;
    const lastName = e.target.regLastName.value;
    const password = e.target.regPassword.value;
    const confirmPassword = e.target.regConfirmPassword.value;
    
    if (!email || !name || !lastName || !password || !confirmPassword) {
      showMessage("Por favor, completa todos los campos", "error");
      return;
    }
    
    if (password !== confirmPassword) {
      showMessage("Las contraseñas no coinciden", "error");
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const adminData = {
        email: email,
        nombre: name,
        apellidos: lastName,
        rol: 'administrador',
        fechaRegistro: new Date().toISOString(),
        uid: user.uid
      };
      
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await setDoc(doc(db, 'administradores', user.uid), adminData);
      await set(ref(rtdb, 'administradores/' + sanitizedName), adminData);
      
      showMessage("Registro exitoso. Ahora puedes iniciar sesión.", "success");
      e.target.reset();
      setShowRegister(false);
    } catch (error) {
      console.error("Error en registro:", error);
      handleAuthError(error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User authenticated:", user.uid, user.email);
      
      const adminsRef = ref(rtdb, 'administradores');
      const snapshot = await get(adminsRef);
      let isAdmin = false;
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const adminData = childSnapshot.val();
          console.log("Checking admin:", childSnapshot.key, adminData);
          if (adminData.email === email && adminData.rol === 'administrador') {
            isAdmin = true;
            console.log("Admin found under key:", childSnapshot.key);
          }
        });
      }
      
      if (isAdmin) {
        navigate('/admin');
      } else {
        console.log("No admin found for email:", email);
        await auth.signOut();
        showMessage("No tienes permisos de administrador", "error");
      }
    } catch (error) {
      console.error("Error en login:", error);
      handleAuthError(error);
    }
  };

  return (
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
          <h2>Bienvenido Administrador</h2>
          <p className="institution-name">{institutionName || 'Universidad La Salle Nezahualcóyotl'}</p>
        </div>
        {!showRegister ? (
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
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="login-header">
              <h2>Registro Administrador</h2>
            </div>
            <div className="form-group">
              <label htmlFor="regEmail">Correo electrónico</label>
              <input type="email" id="regEmail" required placeholder="ejemplo@lasalle.edu.mx" />
            </div>
            <div className="form-group">
              <label htmlFor="regName">Nombre</label>
              <input type="text" id="regName" required placeholder="Tu nombre" />
            </div>
            <div className="form-group">
              <label htmlFor="regLastName">Apellidos</label>
              <input type="text" id="regLastName" required placeholder="Tus apellidos" />
            </div>
            <div className="form-group">
              <label htmlFor="regPassword">Contraseña (mínimo 6 caracteres)</label>
              <div className="password-input-wrapper">
                <input 
                  type={showRegPassword ? "text" : "password"} 
                  id="regPassword" 
                  minLength="6" 
                  required 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <i className={`fas ${showRegPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="regConfirmPassword">Confirmar Contraseña</label>
              <div className="password-input-wrapper">
                <input 
                  type={showRegConfirmPassword ? "text" : "password"} 
                  id="regConfirmPassword" 
                  minLength="6" 
                  required 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  aria-label={showRegConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <i className={`fas ${showRegConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Registrarse</button>
          </form>
        )}
       
        <p className="toggle-form-text">
          {!showRegister ? (
            <>Tiene cuenta? <a href="#" onClick={(e) => { e.preventDefault(); setShowRegister(true); }}>Registrese Ahora</a></>
          ) : (
            <>¿Ya tienes cuenta? <a href="#" onClick={(e) => { e.preventDefault(); setShowRegister(false); }}>Iniciar Sesión</a></>
          )}
        </p>
       
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
      
      {/* Componente de advertencia de inactividad */}
      <InactivityWarning 
        show={showWarning}
        timeLeft={timeLeft}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default LoginAdmin;
