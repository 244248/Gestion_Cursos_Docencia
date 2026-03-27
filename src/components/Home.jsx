import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { useInstitution } from '../context/InstitutionContext';
import institutionConfigService from '../services/InstitutionConfigService';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/Home.css';

const getViewportSize = () => ({
  width: typeof window !== 'undefined' ? window.innerWidth : 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
});

const Home = () => {
  const navigate = useNavigate();
  const { config, institutionName, institutionSlogan, logoUrl } = useInstitution();
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const directionRef = useRef({ x: 1, y: 1 });
  const boundsRef = useRef({ ...getViewportSize(), logoWidth: 0, logoHeight: 0 });
  const logoRef = useRef(null);
  const mainCardRef = useRef(null);

  const handleDocenteClick = () => {
    navigate('/login-docente');
  };

  const handleAdminClick = () => {
    navigate('/login-admin');
  };

  const handleDeveloperClick = () => {
    navigate('/developer');
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

  useEffect(() => {
    const logoElement = logoRef.current;
    if (!logoElement) {
      return undefined;
    }

    const speed = 110; // píxeles por segundo
    let animationFrame = null;
    let previousTimestamp;

    const updateBounds = () => {
      const viewport = getViewportSize();
      const logoRect = logoElement.getBoundingClientRect();
      const { width, height } = logoRect;
      boundsRef.current = {
        width: viewport.width,
        height: viewport.height,
        logoWidth: width || logoElement.naturalWidth || 0,
        logoHeight: height || logoElement.naturalHeight || 0,
      };
    };

    const clampInside = (position) => {
      const { width, height, logoWidth, logoHeight } = boundsRef.current;
      const maxX = Math.max(width - logoWidth, 0);
      const maxY = Math.max(height - logoHeight, 0);
      return {
        x: Math.min(Math.max(position.x, 0), maxX),
        y: Math.min(Math.max(position.y, 0), maxY),
      };
    };

    const adjustDirection = (axis, sign) => {
      const direction = directionRef.current;
      const otherAxis = axis === 'x' ? 'y' : 'x';
      direction[axis] = sign * (0.8 + Math.random() * 0.6);
      direction[otherAxis] += (Math.random() - 0.5) * 0.4;
      const magnitude = Math.hypot(direction.x, direction.y);
      if (magnitude === 0) {
        direction.x = sign;
        direction.y = axis === 'x' ? 0 : 1;
      } else {
        direction.x /= magnitude;
        direction.y /= magnitude;
      }
    };

    const initializePosition = () => {
      updateBounds();
      const direction = directionRef.current;
      const { width, height, logoWidth, logoHeight } = boundsRef.current;
      const maxX = Math.max(width - logoWidth, 0);
      const maxY = Math.max(height - logoHeight, 0);
      direction.x = Math.random() > 0.5 ? 1 : -1;
      direction.y = Math.random() > 0.5 ? 1 : -1;
      setLogoPosition({
        x: maxX ? Math.random() * maxX : 0,
        y: maxY ? Math.random() * maxY : 0,
      });
    };

    const step = (timestamp) => {
      if (previousTimestamp === undefined) {
        previousTimestamp = timestamp;
      }

      const delta = (timestamp - previousTimestamp) / 1000;
      previousTimestamp = timestamp;

      // Actualizar bounds periódicamente para manejar scroll y resize
      updateBounds();

      setLogoPosition((prev) => {
        const { width, height, logoWidth, logoHeight } = boundsRef.current;
        if (!width || !height || !logoWidth || !logoHeight) {
          return prev;
        }

        const direction = directionRef.current;
        let nextX = prev.x + direction.x * speed * delta;
        let nextY = prev.y + direction.y * speed * delta;
        const maxX = Math.max(width - logoWidth, 0);
        const maxY = Math.max(height - logoHeight, 0);

        // Verificar colisión con los bordes del viewport
        if (nextX <= 0) {
          nextX = 0;
          adjustDirection('x', 1);
        } else if (nextX >= maxX) {
          nextX = maxX;
          adjustDirection('x', -1);
        }

        if (nextY <= 0) {
          nextY = 0;
          adjustDirection('y', 1);
        } else if (nextY >= maxY) {
          nextY = maxY;
          adjustDirection('y', -1);
        }

        return { x: nextX, y: nextY };
      });

      animationFrame = requestAnimationFrame(step);
    };

    const handleResize = () => {
      updateBounds();
      setLogoPosition((pos) => clampInside(pos));
    };

    const handleScroll = () => {
      updateBounds();
    };

    const handleImageLoad = () => {
      initializePosition();
      previousTimestamp = undefined;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      animationFrame = requestAnimationFrame(step);
    };

    if (logoElement.complete) {
      handleImageLoad();
    } else {
      logoElement.addEventListener('load', handleImageLoad);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      logoElement.removeEventListener('load', handleImageLoad);
    };
  }, []);

  return (
    <div className="home-container">
      <div
        className="floating-logo"
        style={{ transform: `translate3d(${logoPosition.x}px, ${logoPosition.y}px, 0)` }}
        aria-hidden="true"
      >
        <img
          ref={logoRef}
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Logo_de_la_Universidad_La_Salle_sin_letras.svg/1200px-Logo_de_la_Universidad_La_Salle_sin_letras.svg.png"
          alt="Logo Universidad La Salle"
        />
      </div>
      {/* Hero Section */}
      <Container fluid className="hero-section">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col xs={12} md={12} lg={10} xl={8} xxl={7}>
            <Card ref={mainCardRef} className="main-card">
              <Card.Body className="p-md-5 p-3">
                <div className="bubble-layer" aria-hidden="true">
                  <span className="bubble bubble-1"></span>
                  <span className="bubble bubble-2"></span>
                  <span className="bubble bubble-3"></span>
                  <span className="bubble bubble-4"></span>
                  <span className="bubble bubble-5"></span>
                  <span className="bubble bubble-6"></span>
                </div>
                {/* Logo Section */}
                <div className="text-center mb-4">
                  <img
                    src={logoUrl || "https://lasalleneza.btl.mx/wp-content/uploads/2024/02/WhatsAppLaSalleNeza.jpg"}
                    alt={`Logo ${institutionName}`}
                    className="logo img-fluid"
                  />
                </div>

                {/* Title Section */}
                <div className="text-center mb-4">
                  <h1 className="main-title fw-bold mb-3">
                    {institutionName || "Universidad La Salle Nezahualcóyotl"}
                  </h1>
                  <h2>{institutionSlogan || "Indivisa Manent"}</h2>
                </div>

                {/* Action Buttons */}
                <Row className="g-3 mt-4">
                  <Col xs={12} md={6}>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      className="w-100 py-3 py-md-3 rounded-pill fw-semibold btn-docente"
                      onClick={handleDocenteClick}
                    >
                      <i className="fas fa-user-tie me-2"></i>
                      <span>Iniciar Sesión Docente</span>
                    </Button>
                  </Col>
                  <Col xs={12} md={6}>
                    <Button 
                      variant="danger" 
                      size="lg" 
                      className="w-100 py-3 py-md-3 rounded-pill fw-semibold btn-admin"
                      onClick={handleAdminClick}
                    >
                      <i className="fas fa-cog me-2"></i>
                      <span>Iniciar Sesión Administrador</span>
                    </Button>
                  </Col>
                </Row>

                {/* Botón Desarrollador - Discreto */}
                <div className="text-center mt-3">
                  <button 
                    onClick={handleDeveloperClick}
                    className="btn-developer-link"
                    title="Modo Desarrollador"
                  >
                    <i className="fas fa-code"></i> Configuración
                  </button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

      </Container>
    </div>
  );
};

export default Home;
