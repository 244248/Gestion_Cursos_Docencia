import React from 'react';
import './styles/InactivityWarning.css';

const InactivityWarning = ({ show, timeLeft, onExtend, onLogout }) => {
  console.log('🔍 InactivityWarning render:', { show, timeLeft });
  
  if (!show) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="inactivity-warning-overlay">
      <div className="inactivity-warning-modal">
        <div className="warning-icon">
          <i className="fas fa-clock"></i>
        </div>
        <h3>Sesión por Expirar</h3>
        <p>Tu sesión expirará en <strong>{formatTime(timeLeft)}</strong> debido a inactividad.</p>
        <p>¿Deseas continuar con tu sesión?</p>
        <div className="warning-actions">
          <button 
            className="btn btn-primary" 
            onClick={onExtend}
          >
            <i className="fas fa-check"></i> Continuar Sesión
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={onLogout}
          >
            <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactivityWarning;
