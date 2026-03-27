import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const useInactivityTimer = (timeoutMinutes = 5) => {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const timeoutDuration = timeoutMinutes * 60 * 1000; // Convertir a milisegundos

  const resetTimer = useCallback(() => {
    // Limpiar el timer anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Establecer nuevo timer
    timeoutRef.current = setTimeout(async () => {
      try {
        console.log('Sesión expirada por inactividad');
        await signOut(auth);
        localStorage.clear();
        navigate('/', { replace: true });
        
        // Mostrar notificación si hay un elemento para mostrarla
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #dc3545;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-family: Arial, sans-serif;
          font-size: 14px;
          max-width: 300px;
        `;
        notification.textContent = 'Sesión expirada por inactividad. Por favor, inicia sesión nuevamente.';
        document.body.appendChild(notification);
        
        // Remover notificación después de 5 segundos
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
        
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Forzar navegación incluso si hay error
        localStorage.clear();
        navigate('/', { replace: true });
      }
    }, timeoutDuration);
  }, [timeoutDuration, navigate]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Agregar listeners de eventos
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Inicializar el timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
      clearTimer();
    };
  }, [resetTimer, clearTimer]);

  return {
    resetTimer,
    clearTimer
  };
};

export default useInactivityTimer;

