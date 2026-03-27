import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, get, update } from 'firebase/database';
import { auth, rtdb } from '../firebase/config';
import institutionConfigService from '../services/InstitutionConfigService';
import DocenteProfile from './DocenteProfile';
import './styles/DocentePanel.css';

const DocentePanel = () => {
  const navigate = useNavigate();
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [courses, setCourses] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login-docente');
        return;
      }

      const teacherKey = localStorage.getItem('teacherKey');
      if (!teacherKey) {
        await signOut(auth);
        navigate('/login-docente');
        return;
      }

      try {
        const snapshot = await get(ref(rtdb, `docentes/${teacherKey}`));
        const docenteData = snapshot.val();

        if (!docenteData) {
          await signOut(auth);
          localStorage.removeItem('teacherKey');
          navigate('/login-docente');
        return;
          
        }


        setCurrentTeacher({ ...docenteData, key: teacherKey, uid: user.uid });
      } catch (error) {
        console.error('Error al cargar datos del docente:', error);
        showMessage('Error al cargar datos del docente', 'error');
        localStorage.removeItem('teacherKey');
        navigate('/login-docente');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

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

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const formatCourseType = (type) => {
    const types = {
      'basicos': 'Básicos',
      'tecnologias': 'Tecnologías',
      'avanzados': 'Avanzados',
      'especializacion': 'Especialización'
    };
    return types[type] || type;
  };

  const formatArea = (area) => {
    const areas = {
      'bachillerato': 'Bachillerato',
      'licenciatura': 'Licenciatura',
      'posgrado': 'Posgrado'
    };
    return areas[area] || area;
  };

  const updateCourseStatus = async (courseId, teacherId, isOnline, statusType) => {
    try {
      const courseRef = ref(rtdb, `cursos/${courseId}`);
      const snapshot = await get(courseRef);
      if (snapshot.exists()) {
        const course = snapshot.val();
        const teacherStatus = course.teacherStatus || {};
        teacherStatus[teacherId] = teacherStatus[teacherId] || { completed: false, willAttend: false };
        
        if (isOnline) {
          teacherStatus[teacherId].completed = statusType === 'complete';
        } else {
          teacherStatus[teacherId].willAttend = statusType === 'confirm';
        }
        
        await update(ref(rtdb, `cursos/${courseId}`), { teacherStatus });
        
        showMessage(
          isOnline
            ? statusType === 'complete'
              ? "Curso marcado como completado"
              : "Estado de curso actualizado"
            : statusType === 'confirm'
            ? "Asistencia confirmada"
            : "Asistencia cancelada",
          "success"
        );
        
        console.log('Course status updated:', courseId, teacherId, teacherStatus);
      } else {
        showMessage("No se encontró el curso", "error");
      }
    } catch (error) {
      console.error("Error al actualizar estatus:", error);
      showMessage("Error al actualizar estatus", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('teacherKey');
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      showMessage(`Error al cerrar sesión: ${error.message}`, 'error');
    }
  };

  const loadCourses = () => {
    if (!currentTeacher) return;

    const coursesRef = ref(rtdb, 'cursos');
    onValue(coursesRef, (snapshot) => {
      console.log('Courses snapshot:', snapshot.val());
      const coursesData = snapshot.val() || {};
      setCourses(coursesData);
    }, (error) => {
      console.error("Error al cargar cursos:", error);
      showMessage(`Error al cargar cursos: ${error.message}`, 'error');
    });
  };

  const assignedCourses = useMemo(() => {
    if (!currentTeacher || !courses) return [];
    return Object.entries(courses).filter(([, course]) => {
      const assignedTeachers = course.assignedTeachers || [];
      return assignedTeachers.includes(currentTeacher.key);
    });
  }, [courses, currentTeacher]);

  const filteredCourses = useMemo(() => {
    if (activeFilter === 'all') return assignedCourses;
    return assignedCourses.filter(([, course]) => course.tipo === activeFilter);
  }, [assignedCourses, activeFilter]);

  const summary = useMemo(() => {
    if (!currentTeacher || assignedCourses.length === 0) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        online: 0,
        presential: 0,
        upcoming: null,
      };
    }

    let completed = 0;
    let pending = 0;
    let online = 0;
    let presential = 0;
    let upcoming = null;
    const now = new Date();

    assignedCourses.forEach(([courseId, course]) => {
      const isOnline = !!(course.url && course.url.match(/^https?:\/\/.+/));
      if (isOnline) {
        online += 1;
      } else {
        presential += 1;
      }

      const status = course.teacherStatus?.[currentTeacher.key] || { completed: false, willAttend: false };
      const isDone = isOnline ? status.completed : status.willAttend;
      if (isDone) {
        completed += 1;
      } else {
        pending += 1;
      }

      if (course.fecha) {
        const courseDate = new Date(course.fecha);
        if (!isNaN(courseDate) && courseDate >= now) {
          if (!upcoming || courseDate < upcoming.date) {
            upcoming = {
              id: courseId,
              name: course.nombre,
              date: courseDate,
            };
          }
        }
      }
    });

    return {
      total: assignedCourses.length,
      completed,
      pending,
      online,
      presential,
      upcoming,
    };
  }, [assignedCourses, currentTeacher]);

  const handleCourseAction = (courseId, action) => {
    const isOnline = courses[courseId]?.url && courses[courseId].url.match(/^https?:\/\/.+/);
    
    if (action === 'complete') {
      updateCourseStatus(courseId, currentTeacher.key, true, 'complete');
    } else if (action === 'confirm') {
      updateCourseStatus(courseId, currentTeacher.key, false, 'confirm');
    } else if (action === 'cancel') {
      updateCourseStatus(courseId, currentTeacher.key, false, 'cancel');
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  useEffect(() => {
    if (currentTeacher) {
      loadCourses();
    }
  }, [currentTeacher]);

  return (
    <>
      <header>
        <div className="header-left">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/9/93/Logo_de_la_Universidad_La_Salle_sin_letras.svg" 
            alt="Logo Universidad La Salle" 
            className="header-logo"
          />
          <div className="header-text">
            <h1>Universidad La Salle Nezahualcóyotl</h1>
            <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div 
                className="docente-avatar-container"
                onClick={() => setShowProfile(true)}
                style={{ cursor: 'pointer' }}
                title="Ver perfil"
              >
                {currentTeacher?.fotoUrl ? (
                  <img 
                    src={currentTeacher.fotoUrl} 
                    alt={currentTeacher?.nombre || 'Docente'} 
                    className="docente-avatar"
                  />
                ) : (
                  <div className="docente-avatar-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
              <div>
                <h2 
                  style={{ cursor: 'pointer', margin: 0 }}
                  onClick={() => setShowProfile(true)}
                  title="Ver perfil"
                >
                  Bienvenido Docente <span id="userName">{currentTeacher?.nombre || ''}</span>
                </h2>
                <p id="userArea" style={{ margin: 0 }}>
                  {currentTeacher ? `Área: ${formatArea(currentTeacher.area)}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
        <button className="btn logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Salir
        </button>
      </header>

      <main className="docente-main">
        <div className="course-filters">
          <h3 className="filters-title">
            <i className="fas fa-book"></i> Filtrar Cursos
          </h3>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              <i className="fas fa-list"></i>
              <span>Todos los Cursos</span>
            </button>
            <button
              className={`filter-btn ${activeFilter === 'basicos' ? 'active' : ''}`}
              onClick={() => handleFilterChange('basicos')}
            >
              <i className="fas fa-graduation-cap"></i>
              <span>Básicos</span>
            </button>
            <button
              className={`filter-btn ${activeFilter === 'tecnologias' ? 'active' : ''}`}
              onClick={() => handleFilterChange('tecnologias')}
            >
              <i className="fas fa-laptop-code"></i>
              <span>Tecnologías</span>
            </button>
            <button
              className={`filter-btn ${activeFilter === 'avanzados' ? 'active' : ''}`}
              onClick={() => handleFilterChange('avanzados')}
            >
              <i className="fas fa-brain"></i>
              <span>Avanzados</span>
            </button>
            <button
              className={`filter-btn ${activeFilter === 'especializacion' ? 'active' : ''}`}
              onClick={() => handleFilterChange('especializacion')}
            >
              <i className="fas fa-award"></i>
              <span>Especialización</span>
            </button>
          </div>
        </div>

        <div id="coursesContainer">
          <div className="courses-table-header">
            <h2>Mis Cursos</h2>
          </div>
          <div className="courses-table-wrapper">
            {!currentTeacher ? (
              <div className="loading">
                <p>Cargando...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="no-courses">
                <i className="fas fa-book"></i>
                <p>{activeFilter !== 'all' ? 'No hay cursos asignados de este tipo' : 'No hay cursos asignados'}</p>
              </div>
            ) : (
              <table className="courses-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Curso</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Estatus</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map(([courseId, course], index) => {
                    const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
                    const status = course.teacherStatus && course.teacherStatus[currentTeacher.key]
                      ? course.teacherStatus[currentTeacher.key]
                      : { completed: false, willAttend: false };

                    return (
                      <tr 
                        key={courseId} 
                        className="course-row"
                        onClick={(e) => {
                          // No abrir modal si se hace clic en los botones de acción
                          if (!e.target.closest('.action-buttons')) {
                            setSelectedCourse({ ...course, id: courseId });
                            setShowCourseModal(true);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="course-number">{index + 1}</td>
                        <td className="course-name">
                          <div className="course-name-content">
                            <strong>{course.nombre}</strong>
                            {course.descripcion && (
                              <span className="course-description">{course.descripcion}</span>
                            )}
                          </div>
                        </td>
                        <td className="course-type">
                          <span className="course-type-badge">{formatCourseType(course.tipo)}</span>
                        </td>
                        <td className="course-date">
                          {course.fecha ? (
                            <span>{new Date(course.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          ) : course.fechaPublicacion ? (
                            <span>{new Date(course.fechaPublicacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          ) : (
                            <span className="no-date">Sin fecha</span>
                          )}
                        </td>
                        <td className="course-status">
                          <span className={`status-badge ${isOnline ? (status.completed ? 'status-completed' : 'status-pending') : (status.willAttend ? 'status-confirmed' : 'status-not-confirmed')}`}>
                            {isOnline ? (status.completed ? 'Completado' : 'Pendiente') : (status.willAttend ? 'Asistirá' : 'No confirmado')}
                          </span>
                        </td>
                        <td className="course-action">
                          <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                            {isOnline && !status.completed && (
                              <button 
                                className="action-icon-btn complete-btn" 
                                onClick={() => handleCourseAction(courseId, 'complete')}
                                title="Marcar como completado"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            )}
                            {!isOnline && !status.willAttend && (
                              <button 
                                className="action-icon-btn confirm-btn" 
                                onClick={() => handleCourseAction(courseId, 'confirm')}
                                title="Confirmar asistencia"
                              >
                                <i className="fas fa-calendar-check"></i>
                              </button>
                            )}
                            {!isOnline && status.willAttend && (
                              <button 
                                className="action-icon-btn cancel-btn" 
                                onClick={() => handleCourseAction(courseId, 'cancel')}
                                title="Cancelar asistencia"
                              >
                                <i className="fas fa-calendar-times"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dashboard-controls">
          <div className="summary-grid">
            <article className="summary-card accent-primary">
              <div className="summary-icon">
                <i className="fas fa-layer-group"></i>
              </div>
              <div>
                <span className="summary-label">Cursos asignados</span>
                <span className="summary-value">{summary.total}</span>
                <span className="summary-sub">{summary.online} en línea · {summary.presential} presenciales</span>
              </div>
            </article>
            <article className="summary-card accent-success">
              <div className="summary-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <span className="summary-label">Progreso docente</span>
                <span className="summary-value">
                  {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
                </span>
                <span className="summary-sub">{summary.completed} completados · {summary.pending} pendientes</span>
              </div>
            </article>
            <article className="summary-card accent-warning">
              <div className="summary-icon">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <div>
                <span className="summary-label">Próxima actividad</span>
                <span className="summary-value">
                  {summary.upcoming ? summary.upcoming.date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
                </span>
                <span className="summary-sub">
                  {summary.upcoming ? summary.upcoming.name : 'No hay eventos próximos'}
                </span>
              </div>
            </article>
          </div>
        </div>
      </main>

      {/* Message */}
      {message && (
        <div className={`message ${messageType}`}>
          <i className={`fas fa-${messageType === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
          {message}
        </div>
      )}

      {/* Course Details Modal */}
      {showCourseModal && selectedCourse && (
        <div className="course-modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="course-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="course-modal-close" onClick={() => setShowCourseModal(false)}>
              <i className="fas fa-times"></i>
            </button>
            <div className="course-modal-header">
              <h2>{selectedCourse.nombre}</h2>
              <span className={`course-modal-status-badge ${selectedCourse.url && selectedCourse.url.match(/^https?:\/\/.+/) ? 'online' : 'presential'}`}>
                {selectedCourse.url && selectedCourse.url.match(/^https?:\/\/.+/) ? 'En línea' : 'Presencial'}
              </span>
            </div>
            <div className="course-modal-body">
              <div className="course-info-row">
                <div className="course-info-item">
                  <i className="fas fa-tag"></i>
                  <div>
                    <strong>Tipo de Curso</strong>
                    <p>{formatCourseType(selectedCourse.tipo)}</p>
                  </div>
                </div>
              </div>
              
              {selectedCourse.area && (
                <div className="course-info-row">
                  <div className="course-info-item">
                    <i className="fas fa-layer-group"></i>
                    <div>
                      <strong>Área</strong>
                      <p>{formatArea(selectedCourse.area)}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCourse.fechaPublicacion && (
                <div className="course-info-row">
                  <div className="course-info-item">
                    <i className="fas fa-calendar-plus"></i>
                    <div>
                      <strong>Fecha de Publicación</strong>
                      <p>{new Date(selectedCourse.fechaPublicacion).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCourse.fecha && (
                <div className="course-info-row">
                  <div className="course-info-item">
                    <i className="fas fa-calendar"></i>
                    <div>
                      <strong>Fecha del Curso</strong>
                      <p>{new Date(selectedCourse.fecha).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCourse.descripcion && (
                <div className="course-info-row">
                  <div className="course-info-item full-width">
                    <i className="fas fa-info-circle"></i>
                    <div>
                      <strong>Descripción</strong>
                      <p>{selectedCourse.descripcion}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCourse.url && selectedCourse.url.match(/^https?:\/\/.+/) && (
                <div className="course-info-row">
                  <div className="course-info-item full-width">
                    <i className="fas fa-link"></i>
                    <div>
                      <strong>Enlace del Curso</strong>
                      <p>
                        <a href={selectedCourse.url} target="_blank" rel="noopener noreferrer" className="course-link">
                          {selectedCourse.url}
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCourse.teacherStatus && selectedCourse.teacherStatus[currentTeacher?.key] && (
                <div className="course-info-row">
                  <div className="course-info-item">
                    <i className="fas fa-clipboard-check"></i>
                    <div>
                      <strong>Mi Estatus</strong>
                      <p>
                        <span className={`status-badge ${selectedCourse.url && selectedCourse.url.match(/^https?:\/\/.+/) 
                          ? (selectedCourse.teacherStatus[currentTeacher.key].completed ? 'status-completed' : 'status-pending')
                          : (selectedCourse.teacherStatus[currentTeacher.key].willAttend ? 'status-confirmed' : 'status-not-confirmed')
                        }`}>
                          {selectedCourse.url && selectedCourse.url.match(/^https?:\/\/.+/) 
                            ? (selectedCourse.teacherStatus[currentTeacher.key].completed ? 'Completado' : 'Pendiente')
                            : (selectedCourse.teacherStatus[currentTeacher.key].willAttend ? 'Asistirá' : 'No confirmado')
                          }
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="course-modal-footer">
              {selectedCourse.url && selectedCourse.url.match(/^https?:\/\/.+/) && 
                !selectedCourse.teacherStatus?.[currentTeacher?.key]?.completed && (
                  <button 
                    className="btn action-btn mark-complete-btn" 
                    onClick={() => {
                      handleCourseAction(selectedCourse.id, 'complete');
                      setShowCourseModal(false);
                    }}
                  >
                    <i className="fas fa-check"></i> Marcar como Completado
                  </button>
                )}
              {(!selectedCourse.url || !selectedCourse.url.match(/^https?:\/\/.+/)) && 
                !selectedCourse.teacherStatus?.[currentTeacher?.key]?.willAttend && (
                  <button 
                    className="btn action-btn confirm-attend-btn" 
                    onClick={() => {
                      handleCourseAction(selectedCourse.id, 'confirm');
                      setShowCourseModal(false);
                    }}
                  >
                    <i className="fas fa-calendar-check"></i> Confirmar Asistencia
                  </button>
                )}
              {(!selectedCourse.url || !selectedCourse.url.match(/^https?:\/\/.+/)) && 
                selectedCourse.teacherStatus?.[currentTeacher?.key]?.willAttend && (
                  <button 
                    className="btn cancel-btn" 
                    onClick={() => {
                      handleCourseAction(selectedCourse.id, 'cancel');
                      setShowCourseModal(false);
                    }}
                  >
                    <i className="fas fa-calendar-times"></i> Cancelar Asistencia
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Perfil de Usuario Docente */}
      {showProfile && currentTeacher && (
        <DocenteProfile
          teacher={currentTeacher}
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedTeacher) => {
            setCurrentTeacher(updatedTeacher);
            // Recargar datos del docente desde Realtime Database para asegurar sincronización
            const loadUpdatedTeacher = async () => {
              try {
                const teacherKey = localStorage.getItem('teacherKey');
                if (teacherKey) {
                  const snapshot = await get(ref(rtdb, `docentes/${teacherKey}`));
                  const docenteData = snapshot.val();
                  if (docenteData) {
                    setCurrentTeacher({ ...docenteData, key: teacherKey, uid: auth.currentUser?.uid });
                  }
                }
              } catch (error) {
                console.error('Error al recargar docente:', error);
              }
            };
            loadUpdatedTeacher();
          }}
        />
      )}
    </>
  );
};

export default DocentePanel;
