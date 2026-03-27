import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const useInactivityWarning = (timeoutMinutes = 5, warningMinutes = 1) => {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const intervalRef = useRef(null);
  
  const timeoutDuration = timeoutMinutes * 60 * 1000;
  const warningDuration = warningMinutes * 60 * 1000;

  const resetTimer = useCallback(() => {
    console.log('🔄 Resetting timer...');
    // Limpiar timers anteriores
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setShowWarning(false);
    setTimeLeft(0);

    // Timer de advertencia
    warningRef.current = setTimeout(() => {
      console.log('⚠️ Warning timer triggered!');
      setShowWarning(true);
      setTimeLeft(warningMinutes * 60);
      
      // Contador regresivo
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          console.log('⏰ Time left:', prev);
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutDuration - warningDuration);

    // Timer principal de expiración
    timeoutRef.current = setTimeout(async () => {
      console.log('🚨 Session expired!');
      try {
        console.log('Sesión expirada por inactividad');
        await signOut(auth);
        localStorage.clear();
        navigate('/', { replace: true });
        
        // Notificación de expiración
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
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
        
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        localStorage.clear();
        navigate('/', { replace: true });
      }
    }, timeoutDuration);
  }, [timeoutDuration, warningDuration, warningMinutes, navigate]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    setTimeLeft(0);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetTimer]);

  return {
    showWarning,
    timeLeft,
    extendSession,
    resetTimer
  };
};

export default useInactivityWarning;
