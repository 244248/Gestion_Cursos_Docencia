import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue, get, set, remove, update, push } from 'firebase/database';
import { auth, db, rtdb, secondaryAuth } from '../firebase/config';
import institutionConfigService from '../services/InstitutionConfigService';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import AdminProfile from './AdminProfile';
import './styles/AdminPanel.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('allCourses');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentCourseToDelete, setCurrentCourseToDelete] = useState(null);
  const [showConfirmTeacherModal, setShowConfirmTeacherModal] = useState(false);
  const [currentTeacherToDelete, setCurrentTeacherToDelete] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);
  const [pendingCourseData, setPendingCourseData] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [teachersLoaded, setTeachersLoaded] = useState(false);
  const [statsCharts, setStatsCharts] = useState([]);
  const [courses, setCourses] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [expandedAttendance, setExpandedAttendance] = useState(new Set());
  const [showCourseMiniModal, setShowCourseMiniModal] = useState(false);
  const [showAttendanceMiniModal, setShowAttendanceMiniModal] = useState(false);
  const [selectedCourseForMiniModal, setSelectedCourseForMiniModal] = useState(null);
  const [selectedTeacherForMiniModal, setSelectedTeacherForMiniModal] = useState(null);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [teacherAreaFilter, setTeacherAreaFilter] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  
  // Refs for form data
  const courseFormRef = useRef(null);
  const teacherFormRef = useRef(null);
  const searchFormRef = useRef(null);

  // Utility functions
  const normalizeName = (name) => {
    return name.toLowerCase()
      .replace(/\s+/g, '-')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
      'posgrado': 'Posgrado',
      'otros': 'Otros'
    };
    return areas[area] || area;
  };

  const parseTimestamp = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      return value < 1e12 ? value * 1000 : value;
    }
    if (typeof value === 'object') {
      if (typeof value.toDate === 'function') {
        return value.toDate().getTime();
      }
      if (value.seconds !== undefined) {
        return value.seconds * 1000 + Math.round((value.nanoseconds || 0) / 1e6);
      }
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const resolveValue = (item, keys) => {
    if (!item) return null;
    for (const key of keys) {
      if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
        return item[key];
      }
    }
    return null;
  };

  const activityLog = useMemo(() => {
    const entries = [];

    // Registrados
    teachers.forEach((teacher) => {
      const timestamp = teacher.fechaCreacion ? new Date(teacher.fechaCreacion).getTime() : Date.now();
      const name = teacher.nombre || 'Docente sin nombre';
      
      const details = [
        teacher.email && `Correo: ${teacher.email}`,
        teacher.matricula && `Id empleado: ${teacher.matricula}`,
        teacher.area && `Área: ${formatArea(teacher.area)}`
      ].filter(Boolean).join(' • ');

      entries.push({
        id: `reg-${teacher.key || teacher.email}`,
        user: name,
        action: 'Registro completado',
        details,
        status: 'registrado',
        statusLabel: 'Registrado',
        timestamp
      });
    });

    // Pendientes
    pendingTeachers.forEach((pending) => {
      const timestamp = pending.fechaSolicitud ? new Date(pending.fechaSolicitud).getTime() : Date.now();
      const name = pending.nombre || pending.email || 'Solicitud sin nombre';
      
      const details = [
        pending.email && `Correo: ${pending.email}`,
        pending.matricula && `Id empleado: ${pending.matricula}`,
        pending.area && `Área: ${formatArea(pending.area)}`
      ].filter(Boolean).join(' • ');

      entries.push({
        id: `pend-${pending.key || pending.email}`,
        user: name,
        action: 'Solicitud pendiente',
        details,
        status: 'pendiente',
        statusLabel: 'Pendiente',
        timestamp
      });
    });

    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  }, [teachers, pendingTeachers]);

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const showLoading = (message = 'Cargando...') => {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{message}</p>
      </div>
    );
  };

  const showEmptyState = (message, icon = 'info-circle') => {
    return (
      <div className="empty-state">
        <i className={`fas fa-${icon}`}></i>
        <p>{message}</p>
      </div>
    );
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login-admin');
        return;
      }

      try {
        const adminDocRef = doc(db, 'administradores', user.uid);
        const adminDoc = await getDoc(adminDocRef);
        if (!adminDoc.exists()) {
          await signOut(auth);
          navigate('/login-admin');
          return;
        }

        setCurrentAdmin(adminDoc.data());
        loadTeachers();
        loadCourses();
        loadPendingTeachers();
      } catch (error) {
        console.error("Error checking admin authentication:", error);
        showMessage("Error al verificar autenticación del administrador", "error");
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

  // Handle custom area visibility
  useEffect(() => {
    const teacherAreaSelect = document.getElementById('teacherArea');
    const customAreaGroup = document.getElementById('customAreaGroup');
    const customAreaInput = document.getElementById('customArea');
    
    if (teacherAreaSelect && customAreaGroup && customAreaInput) {
      const handleAreaChange = () => {
        if (teacherAreaSelect.value === 'otros') {
          customAreaGroup.style.display = 'block';
          customAreaInput.required = true;
        } else {
          customAreaGroup.style.display = 'none';
          customAreaInput.required = false;
          customAreaInput.value = '';
        }
      };
      
      teacherAreaSelect.addEventListener('change', handleAreaChange);
      return () => teacherAreaSelect.removeEventListener('change', handleAreaChange);
    }
  }, [showTeacherModal]);

  // Data loading functions
  const loadTeachers = () => {
    const teachersRef = ref(rtdb, 'docentes');
    onValue(teachersRef, (snapshot) => {
      const teachersList = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const teacher = child.val();
          teacher.key = child.key;
          teachersList.push(teacher);
        });
      }
      setTeachers(teachersList);
      setTeachersLoaded(true);
    }, (error) => {
      console.error("Error al cargar docentes:", error);
      showMessage("Error al cargar docentes", "error");
      setTeachersLoaded(true);
    });
  };

  const loadPendingTeachers = async () => {
    const candidatePaths = ['solicitudesDocentes', 'docentesPendientes', 'docentesPorRegistrar'];
    const pendingList = [];

    try {
      for (const path of candidatePaths) {
        const pendingSnapshot = await get(ref(rtdb, path));
        if (pendingSnapshot.exists()) {
          pendingSnapshot.forEach(child => {
            const data = child.val();
            pendingList.push({
              key: child.key,
              __source: path,
              ...data
            });
          });
        }
      }
      setPendingTeachers(pendingList);
    } catch (error) {
      console.error('Error al cargar solicitudes de docentes:', error);
    }
  };

  const loadCourses = (filter = null) => {
    const coursesRef = ref(rtdb, 'cursos');
    onValue(coursesRef, (snapshot) => {
      const coursesData = snapshot.val() || {};
      setCourses(coursesData);
    }, (error) => {
      console.error("Error al cargar cursos:", error);
      showMessage("Error al cargar cursos", "error");
    });
  };

  const updateTeacherAttendance = async (courseKey, teacherKey, attended) => {
    try {
      const courseRef = ref(rtdb, `cursos/${courseKey}`);
      const snapshot = await get(courseRef);
      
      if (snapshot.exists()) {
        const course = snapshot.val();
        const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
        
        const teacherStatus = course.teacherStatus || {};
        if (!teacherStatus[teacherKey]) {
          teacherStatus[teacherKey] = { completed: false, willAttend: false };
        }
        
        // Para cursos en línea: el admin marca completed
        // Para cursos presenciales: el admin marca completed (diferente de willAttend que marca el docente)
        teacherStatus[teacherKey].completed = attended;
        
        await update(ref(rtdb, `cursos/${courseKey}`), { teacherStatus });
        // showMessage(`Estatus actualizado: ${attended ? 'Completado' : 'No completado'}`, "success");
        return true;
      } else {
        showMessage("No se encontró el curso", "error");
        return false;
      }
    } catch (error) {
      console.error("Error al actualizar estatus de asistencia:", error);
      showMessage("Error al actualizar estatus", "error");
      return false;
    }
  };

  const saveCourse = async (courseData, courseKey = null) => {
    try {
      const teacherStatus = {};
      if (courseData.assignedTeachers) {
        courseData.assignedTeachers.forEach(teacherKey => {
          teacherStatus[teacherKey] = { completed: false, willAttend: false };
        });
      }

      const courseDataWithStatus = {
        ...courseData,
        teacherStatus
      };

      if (courseKey) {
        await update(ref(rtdb, `cursos/${courseKey}`), courseDataWithStatus);
        showMessage("Curso actualizado correctamente", "success");
      } else {
        const newCourseKey = normalizeName(courseData.nombre);
        await set(ref(rtdb, `cursos/${newCourseKey}`), {
          ...courseDataWithStatus,
          fechaCreacion: new Date().toISOString()
        });
        showMessage("Curso agregado correctamente", "success");
      }
      return true;
    } catch (error) {
      console.error("Error al guardar curso:", error);
      showMessage(`Error al guardar curso: ${error.message}`, "error");
      return false;
    }
  };

  const deleteCourse = async (courseKey) => {
    try {
      await remove(ref(rtdb, `cursos/${courseKey}`));
      showMessage("Curso eliminado correctamente", "success");
      return true;
    } catch (error) {
      console.error("Error al eliminar curso:", error);
      showMessage("Error al eliminar curso", "error");
      return false;
    }
  };

  const deleteTeacher = async (teacherKey) => {
    try {
      // Primero, remover el docente de todos los cursos asignados
      const coursesRef = ref(rtdb, 'cursos');
      const coursesSnapshot = await get(coursesRef);
      
      if (coursesSnapshot.exists()) {
        const coursesData = coursesSnapshot.val();
        const updates = {};
        
        Object.keys(coursesData).forEach(courseKey => {
          const course = coursesData[courseKey];
          if (course.assignedTeachers && course.assignedTeachers.includes(teacherKey)) {
            // Remover el docente de la lista de docentes asignados
            const updatedTeachers = course.assignedTeachers.filter(key => key !== teacherKey);
            updates[`cursos/${courseKey}/assignedTeachers`] = updatedTeachers;
            
            // Remover el status del docente
            if (course.teacherStatus && course.teacherStatus[teacherKey]) {
              const updatedStatus = { ...course.teacherStatus };
              delete updatedStatus[teacherKey];
              updates[`cursos/${courseKey}/teacherStatus`] = updatedStatus;
            }
          }
        });
        
        // Aplicar todas las actualizaciones
        if (Object.keys(updates).length > 0) {
          await update(ref(rtdb, '/'), updates);
        }
      }
      
      // Finalmente, eliminar el docente
      await remove(ref(rtdb, `docentes/${teacherKey}`));
      showMessage("Docente eliminado correctamente", "success");
      loadTeachers();
      return true;
    } catch (error) {
      console.error("Error al eliminar docente:", error);
      showMessage("Error al eliminar docente", "error");
      return false;
    }
  };

  const registerTeacher = async (teacherData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        teacherData.email,
        teacherData.password
      );
      const teacherKey = normalizeName(teacherData.nombre);
      await set(ref(rtdb, `docentes/${teacherKey}`), {
        email: teacherData.email,
        matricula: teacherData.matricula,
        nombre: teacherData.nombre,
        area: teacherData.area === 'otros' && teacherData.customArea ? teacherData.customArea : teacherData.area,
        fechaCreacion: new Date().toISOString(),
        uid: userCredential.user.uid
      });

      await signOut(secondaryAuth);
      showMessage("Docente registrado correctamente", "success");
      loadTeachers();
      loadPendingTeachers();
      return true;
    } catch (error) {
      console.error("Error al registrar docente:", error);
      let errorMessage = "Error al registrar docente";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "El correo electrónico ya está en uso";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "El correo electrónico no es válido";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña debe tener al menos 6 caracteres";
      }
      showMessage(errorMessage, "error");
      return false;
    }
  };

  // Event handlers
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      showMessage("Error al cerrar sesión", "error");
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setShowSearchResults(false);
    setSidebarMobileOpen(false); // Close sidebar on mobile when section changes
  };

  const toggleMobileSidebar = () => {
    setSidebarMobileOpen(!sidebarMobileOpen);
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const courseData = {
      tipo: formData.get('courseType'),
      nombre: formData.get('courseName'),
      url: formData.get('courseUrl') || null,
      fecha: formData.get('courseDate') || null,
      descripcion: formData.get('courseDescription'),
      assignedTeachers: Array.from(e.target.querySelectorAll('input[name="assignedTeachers"]:checked')).map(input => input.value)
    };

    if (!courseData.tipo) {
      showMessage("Debes seleccionar un tipo de curso", "error");
      return;
    }

    if (!courseData.nombre.trim()) {
      showMessage("El nombre del curso es obligatorio", "error");
      return;
    }

    if (!courseData.url && !courseData.fecha) {
      showMessage("Debes proporcionar una URL o una fecha para el curso", "error");
      return;
    }

    if (courseData.url && !courseData.url.match(/^https?:\/\/.+/)) {
      showMessage("La URL debe comenzar con http:// o https://", "error");
      return;
    }

    if (courseData.fecha && new Date(courseData.fecha) < new Date()) {
      showMessage("La fecha del curso no puede ser en el pasado", "error");
      return;
    }

    // Si está editando, mostrar modal de confirmación
    if (editingCourse) {
      setPendingCourseData({ courseData, form: e.target });
      setShowConfirmEditModal(true);
    } else {
      // Si es nuevo curso, guardar directamente
      const success = await saveCourse(courseData, editingCourse);
      if (success) {
        setShowCourseModal(false);
        setEditingCourse(null);
        e.target.reset();
      }
    }
  };

  const handleConfirmEdit = async () => {
    if (pendingCourseData) {
      const success = await saveCourse(pendingCourseData.courseData, editingCourse);
      if (success) {
        setShowCourseModal(false);
        setShowConfirmEditModal(false);
        setEditingCourse(null);
        setPendingCourseData(null);
        if (pendingCourseData.form) {
          pendingCourseData.form.reset();
        }
      }
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teacherData = {
      email: formData.get('teacherEmail'),
      matricula: formData.get('teacherMatricula'),
      password: formData.get('teacherPassword'),
      nombre: formData.get('teacherName'),
      area: formData.get('teacherArea'),
      customArea: formData.get('customArea')
    };

    if (!teacherData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      showMessage("El correo electrónico no es válido", "error");
      return;
    }

    if (!teacherData.matricula.trim()) {
      showMessage("El Id empleado es obligatorio", "error");
      return;
    }

    if (teacherData.password.length < 6) {
      showMessage("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }

    if (!teacherData.nombre.trim()) {
      showMessage("El nombre es obligatorio", "error");
      return;
    }

    if (!teacherData.area) {
      showMessage("Debes seleccionar un área", "error");
      return;
    }

    if (teacherData.area === 'otros' && !teacherData.customArea) {
      showMessage("Debes especificar un área personalizada", "error");
      return;
    }

    const success = await registerTeacher(teacherData);
    if (success) {
      setShowTeacherModal(false);
      e.target.reset();
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const searchTerm = formData.get('searchTerm').trim();
    const searchArea = formData.get('searchArea');

    if (searchTerm === '') {
      showMessage("Ingrese un término de búsqueda", "error");
      return;
    }

    searchTeachers(searchTerm, searchArea);
  };

  const searchTeachers = (searchTerm, area = '') => {
    const searchTermLower = searchTerm.toLowerCase();
    const filteredTeachers = teachers.filter(teacher => {
      const matchesSearch = 
        teacher.nombre.toLowerCase().includes(searchTermLower) || 
        teacher.matricula.toLowerCase().includes(searchTermLower);
      
      let matchesArea = true;
      if (area) {
        if (area === 'otros') {
          matchesArea = teacher.area === 'otros' || !['bachillerato', 'licenciatura', 'posgrado'].includes(teacher.area);
        } else {
          matchesArea = teacher.area === area;
        }
      }
      
      return matchesSearch && matchesArea;
    });

    setSearchResults(filteredTeachers);
    setShowSearchResults(true);
  };

  const editCourse = (courseKey) => {
    const course = courses[courseKey];
    if (course) {
      setEditingCourse(courseKey);
      setTeacherAreaFilter(''); // Reset filter when opening edit modal
      setShowCourseModal(true);
    }
  };

  const confirmDelete = (courseKey) => {
    setCurrentCourseToDelete(courseKey);
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (currentCourseToDelete) {
      const success = await deleteCourse(currentCourseToDelete);
      if (success) {
        setShowConfirmModal(false);
        setCurrentCourseToDelete(null);
      }
    }
  };

  const confirmDeleteTeacher = (teacherKey) => {
    setCurrentTeacherToDelete(teacherKey);
    setShowConfirmTeacherModal(true);
  };

  const handleDeleteTeacherConfirm = async () => {
    if (currentTeacherToDelete) {
      const success = await deleteTeacher(currentTeacherToDelete);
      if (success) {
        setShowConfirmTeacherModal(false);
        setCurrentTeacherToDelete(null);
      }
    }
  };

  const toggleCourseExpansion = (courseKey) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseKey)) {
        newSet.delete(courseKey);
      } else {
        newSet.add(courseKey);
      }
      return newSet;
    });
  };

  const toggleAttendanceExpansion = (teacherKey) => {
    setExpandedAttendance(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teacherKey)) {
        newSet.delete(teacherKey);
      } else {
        newSet.add(teacherKey);
      }
      return newSet;
    });
  };

  const openCourseMiniModal = (courseKey) => {
    setSelectedCourseForMiniModal(courseKey);
    setShowCourseMiniModal(true);
  };

  const openAttendanceMiniModal = (teacherKey) => {
    setSelectedTeacherForMiniModal(teacherKey);
    setShowAttendanceMiniModal(true);
  };

  const downloadAttendancePDF = (courseKey) => {
    try {
      const course = courses[courseKey];
      if (!course) {
        showMessage("No se encontró el curso", "error");
        return;
      }

      // Obtener docentes que han marcado asistencia (willAttend: true)
      const teacherStatus = course.teacherStatus || {};
      const attendingTeachers = [];
      
      if (course.assignedTeachers) {
        course.assignedTeachers.forEach(teacherKey => {
          const status = teacherStatus[teacherKey];
          if (status && status.willAttend === true) {
            const teacher = teachers.find(t => t.key === teacherKey);
            if (teacher) {
              attendingTeachers.push({
                nombre: teacher.nombre,
                matricula: teacher.matricula || 'N/A',
                email: teacher.email || 'N/A'
              });
            }
          }
        });
      }

      if (attendingTeachers.length === 0) {
        showMessage("No hay docentes que hayan confirmado asistencia para este curso", "error");
        return;
      }

      // Crear PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Encabezado
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Lista de Asistencia', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Información del curso
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Curso: ${course.nombre}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Tipo: ${formatCourseType(course.tipo)}`, 20, yPosition);
      yPosition += 7;
      
      if (course.fecha) {
        const fecha = new Date(course.fecha).toLocaleDateString('es-ES');
        pdf.text(`Fecha: ${fecha}`, 20, yPosition);
        yPosition += 7;
      }
      
      if (course.url) {
        pdf.text(`URL: ${course.url}`, 20, yPosition);
        yPosition += 7;
      }

      yPosition += 5;
      pdf.setDrawColor(0, 0, 0);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // Título de la lista
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Docentes que Confirmaron Asistencia', 20, yPosition);
      yPosition += 10;

      // Lista de docentes
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      attendingTeachers.forEach((teacher, index) => {
        // Verificar si necesitamos una nueva página
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${teacher.nombre}`, 25, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`   Id empleado: ${teacher.matricula}`, 30, yPosition);
        yPosition += 6;
        pdf.text(`   Email: ${teacher.email}`, 30, yPosition);
        yPosition += 8;
      });

      // Pie de página
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        pdf.text(
          `Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      // Descargar PDF
      const fileName = `Lista_Asistencia_${course.nombre.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      showMessage(`PDF descargado: ${attendingTeachers.length} docente(s) en la lista`, "success");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      showMessage("Error al generar el PDF", "error");
    }
  };

  // Render functions
  const renderCourses = (filter = null, mode = null) => {
    const filteredCourses = Object.entries(courses).filter(([_, course]) => {
      if (filter && course.tipo !== filter) return false;
      if (mode === 'online') {
        return course.url && course.url.match(/^https?:\/\/.+/);
      }
      if (mode === 'in-person') {
        return course.fecha;
      }
      return true;
    });

    if (filteredCourses.length === 0) {
      return showEmptyState(
        filter ? `No hay cursos de tipo ${formatCourseType(filter)}` : 
        mode === 'online' ? 'No hay cursos en línea disponibles' :
        mode === 'in-person' ? 'No hay cursos presenciales disponibles' :
        'No hay cursos disponibles', 
        'book'
      );
    }

    return (
      <div className="courses-table-container">
        <table className="courses-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nombre del Curso</th>
              <th>Tipo</th>
              <th>URL / Fecha</th>
              <th>Docentes Asignados</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map(([courseKey, course], index) => {
              const assignedTeacherNames = course.assignedTeachers
                ? teachers
                    .filter(t => course.assignedTeachers.includes(t.key))
                    .map(t => t.nombre)
                    .join(', ') || 'Ninguno'
                : 'Ninguno';

              const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
              const urlOrDate = course.url 
                ? <a href={course.url} target="_blank" rel="noopener noreferrer" className="course-url">{course.url}</a>
                : course.fecha 
                  ? new Date(course.fecha).toLocaleDateString('es-ES')
                  : '-';

              return (
                <tr 
                  key={courseKey} 
                  className="course-table-row"
                  onClick={() => openCourseMiniModal(courseKey)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="course-number">{index + 1}</td>
                  <td className="course-name">{course.nombre}</td>
                  <td className="course-type">
                    <span className="course-type-badge">{formatCourseType(course.tipo)}</span>
                  </td>
                  <td className="course-url-date">{urlOrDate}</td>
                  <td className="course-teachers">
                    <span className="teachers-count">
                      {course.assignedTeachers ? course.assignedTeachers.length : 0} docente(s)
                    </span>
                    {assignedTeacherNames !== 'Ninguno' && (
                      <span className="teachers-list" title={assignedTeacherNames}>
                        {assignedTeacherNames.length > 30 
                          ? assignedTeacherNames.substring(0, 30) + '...' 
                          : assignedTeacherNames}
                      </span>
                    )}
                  </td>
                  <td className="course-actions-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions">
                      <button 
                        className="btn-action btn-view" 
                        onClick={(e) => {
                          e.stopPropagation();
                          openCourseMiniModal(courseKey);
                        }}
                        title="Ver Detalles"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button 
                        className="btn-action btn-edit" 
                        onClick={(e) => {
                          e.stopPropagation();
                          editCourse(courseKey);
                        }}
                        title="Editar"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn-action btn-download" 
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAttendancePDF(courseKey);
                        }}
                        title="Descargar Lista de Asistencia"
                      >
                        <i className="fas fa-download"></i>
                      </button>
                      <button 
                        className="btn-action btn-delete" 
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(courseKey);
                        }}
                        title="Eliminar"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTeachers = (area = null) => {
    let filteredTeachers = teachers;
    if (area === 'otros') {
      filteredTeachers = teachers.filter(t => 
        t.area === 'otros' || 
        !['bachillerato', 'licenciatura', 'posgrado'].includes(t.area)
      );
    } else if (area) {
      filteredTeachers = teachers.filter(t => t.area === area);
    }

    if (filteredTeachers.length === 0) {
      return showEmptyState('No hay docentes disponibles', 'user-slash');
    }

    return (
      <div className="teachers-table-container">
        <table className="teachers-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Id empleado</th>
              <th>Área</th>
              <th>Cursos Asignados</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((teacher, index) => {
              const assignedCourses = Object.entries(courses)
                .filter(([_, course]) => course.assignedTeachers && course.assignedTeachers.includes(teacher.key))
                .map(([_, course]) => {
                  const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
                  const status = course.teacherStatus && course.teacherStatus[teacher.key]
                    ? course.teacherStatus[teacher.key]
                    : { completed: false, willAttend: false };
                  // Para cursos presenciales: mostrar "Asistirá" si willAttend, "Completado" si completed
                  // Para cursos en línea: mostrar "Completado" si completed
                  const statusLabel = isOnline 
                    ? (status.completed ? 'Completado' : 'Pendiente')
                    : (status.completed ? 'Completado' : (status.willAttend ? 'Asistirá' : 'No confirmado'));
                  const statusClass = isOnline
                    ? (status.completed ? 'completed' : 'pending')
                    : (status.completed ? 'completed' : (status.willAttend ? 'confirmed' : 'pending'));
                  return {
                    nombre: course.nombre,
                    tipo: course.tipo,
                    status: statusClass,
                    statusLabel: statusLabel
                  };
                });

              const coursesList = assignedCourses.length > 0
                ? assignedCourses.map(c => `${c.nombre} (${formatCourseType(c.tipo)})`).join(', ')
                : 'Ninguno';

              return (
                <tr 
                  key={teacher.key} 
                  className="teacher-table-row"
                  onClick={() => openAttendanceMiniModal(teacher.key)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="teacher-number">{index + 1}</td>
                  <td className="teacher-name">{teacher.nombre}</td>
                  <td className="teacher-email">{teacher.email}</td>
                  <td className="teacher-matricula">{teacher.matricula}</td>
                  <td className="teacher-area">
                    <span className="teacher-area-badge">{formatArea(teacher.area)}</span>
                  </td>
                  <td className="teacher-courses-assigned">
                    <span className="courses-count">
                      {assignedCourses.length} curso(s)
                    </span>
                    {assignedCourses.length > 0 && (
                      <span className="courses-list" title={coursesList}>
                        {coursesList.length > 40 
                          ? coursesList.substring(0, 40) + '...' 
                          : coursesList}
                      </span>
                    )}
                  </td>
                  <td className="teacher-actions-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions">
                      <button 
                        className="btn-action btn-view" 
                        onClick={(e) => {
                          e.stopPropagation();
                          openAttendanceMiniModal(teacher.key);
                        }}
                        title="Ver Detalles"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button 
                        className="btn-action btn-delete" 
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDeleteTeacher(teacher.key);
                        }}
                        title="Eliminar Docente"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAttendance = () => {
    if (teachers.length === 0) {
      return showEmptyState('No hay docentes registrados', 'user-slash');
    }

    return (
      <div className="content-grid">
        {teachers.map(teacher => {
          const assignedCourses = Object.entries(courses)
            .filter(([_, course]) => course.assignedTeachers && course.assignedTeachers.includes(teacher.key))
            .map(([courseKey, course]) => {
              const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
              const status = course.teacherStatus && course.teacherStatus[teacher.key]
                ? course.teacherStatus[teacher.key]
                : { completed: false, willAttend: false };
              
              // Para cursos presenciales: mostrar "Asistirá" si willAttend es true (marcado por docente)
              // y "Completado" si completed es true (marcado por admin)
              // Para cursos en línea: mostrar "Completado" si completed es true
              const statusDisplay = isOnline 
                ? (status.completed ? 'Completado' : 'Pendiente')
                : (status.completed ? 'Completado' : (status.willAttend ? 'Asistirá' : 'No confirmado'));
              const statusClass = isOnline
                ? (status.completed ? 'completed' : 'pending')
                : (status.completed ? 'completed' : (status.willAttend ? 'confirmed' : 'pending'));
              
              return (
                <div key={courseKey} className="attendance-course-item">
                  <div className="course-info">
                    <h4>{course.nombre}</h4>
                    <p className="course-type">({formatCourseType(course.tipo)})</p>
                    <span className={`teacher-status status-${statusClass}`}>
                      {statusDisplay}
                    </span>
                  </div>
                  <div className="course-actions">
                    <button 
                      className="btn btn-success attend-btn" 
                      onClick={() => updateTeacherAttendance(courseKey, teacher.key, true)}
                    >
                      <i className="fas fa-check"></i> Asistió
                    </button>
                    <button 
                      className="btn btn-danger no-attend-btn" 
                      onClick={() => updateTeacherAttendance(courseKey, teacher.key, false)}
                    >
                      <i className="fas fa-times"></i> No Asistió
                    </button>
                  </div>
                </div>
              );
            });

          const isExpanded = expandedAttendance.has(teacher.key);

          return (
            <div key={teacher.key} className="teacher-item attendance-teacher-item">
              <div className="teacher-header" onClick={() => toggleAttendanceExpansion(teacher.key)}>
                <h3>{teacher.nombre}</h3>
                <button className="btn btn-info btn-sm teacher-mini-modal-trigger" onClick={(e) => { e.stopPropagation(); openAttendanceMiniModal(teacher.key); }}>
                  <i className="fas fa-eye"></i> Ver Detalles
                </button>
              </div>
              
              {isExpanded && (
                <div className="teacher-details">
                  <ul className="teacher-info-list">
                    <li>
                      <strong>Email:</strong> {teacher.email}
                    </li>
                    <li>
                      <strong>Id empleado:</strong> {teacher.matricula}
                    </li>
                    <li>
                      <strong>Área:</strong> {formatArea(teacher.area)}
                    </li>
                  </ul>
                  
                  <div className="teacher-courses">
                    <h4>Cursos Asignados:</h4>
                    <div className="attendance-course-list">
                      {assignedCourses.length > 0 ? assignedCourses : <p className="no-courses">No tiene cursos asignados</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStats = (courseType) => {
    const matchingCourses = Object.entries(courses).filter(([_, course]) => course.tipo === courseType);
    
    console.log(`renderStats for ${courseType}: Found ${matchingCourses.length} courses`, 
      matchingCourses.map(([key, c]) => ({ key, name: c.nombre })));
    
    if (matchingCourses.length === 0) {
      return (
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center py-5">
                  <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                  <h5 className="card-title text-muted">No hay cursos de tipo "{formatCourseType(courseType)}"</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="container-fluid">
        <div className="row">
          {matchingCourses.map(([courseKey, course], index) => {
            const assignedTeachers = course.assignedTeachers || [];
            const teacherStatus = course.teacherStatus || {};
            
            if (assignedTeachers.length === 0) {
              return (
                <div key={courseKey} className="col-12 col-lg-6 col-xl-4 mb-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body text-center">
                      <i className="fas fa-users fa-2x text-muted mb-3"></i>
                      <h6 className="card-title text-muted">No hay docentes asignados al curso "{course.nombre}"</h6>
                    </div>
                  </div>
                </div>
              );
            }

            const teacherNames = [];
            const completionStatus = [];
            const barColors = [];
            let totalTeachers = 0;
            let completedTeachers = 0;

            const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
            
            assignedTeachers.forEach(teacherKey => {
              const teacher = teachers.find(t => t.key === teacherKey);
              if (teacher) {
                totalTeachers++;
                const status = teacherStatus[teacherKey] || { completed: false, willAttend: false };
                // Para ambos tipos de curso, solo contar como completado si completed es true (marcado por admin)
                const isCompleted = status.completed;
                if (isCompleted) completedTeachers++;
                teacherNames.push(teacher.nombre);
                completionStatus.push(isCompleted ? 1 : 0);
                barColors.push(isCompleted ? '#28a745' : '#dc3545');
              }
            });

            if (totalTeachers === 0) {
              return (
                <div key={courseKey} className="col-12 col-lg-6 col-xl-4 mb-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body text-center">
                      <i className="fas fa-users fa-2x text-muted mb-3"></i>
                      <h6 className="card-title text-muted">No hay docentes asignados al curso "{course.nombre}"</h6>
                    </div>
                  </div>
                </div>
              );
            }

            const completionPercentage = Math.round((completedTeachers / totalTeachers) * 100);
            const canvasId = `statsCanvas-${courseKey}-${index}`;
            
            return (
              <div key={courseKey} className="col-12 col-lg-6 col-xl-4 mb-4">
                <div 
                  className="card border-0 shadow-sm h-100"
                  onClick={() => openCourseMiniModal(courseKey)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-header bg-primary text-white">
                    <h6 className="card-title mb-0">
                      <i className="fas fa-book me-2"></i>
                      {course.nombre}
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row mb-3">
                      <div className="col-6">
                        <div className="text-center">
                          <div className="h3 text-primary mb-0">{completionPercentage}%</div>
                          <small className="text-muted">Completado</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-center">
                          <div className="h3 text-success mb-0">{completedTeachers}</div>
                          <small className="text-muted">de {totalTeachers}</small>
                        </div>
                      </div>
                    </div>
                    
                    <div className="progress mb-3" style={{height: '8px'}}>
                      <div 
                        className="progress-bar bg-success" 
                        role="progressbar" 
                        style={{width: `${completionPercentage}%`}}
                        aria-valuenow={completionPercentage} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                    
                    <div className="mb-3">
                      <small className="text-muted d-block mb-2">
                        {isOnline ? 'Curso en línea' : 'Curso presencial'}
                      </small>
                      <div className="docentes-asignados">
                        <strong className="d-block mb-2" style={{fontSize: '0.85rem', color: '#495057'}}>
                          <i className="fas fa-users me-1"></i> Docentes:
                        </strong>
                        <ul className="list-unstyled mb-0" style={{fontSize: '0.8rem', maxHeight: '120px', overflowY: 'auto'}}>
                          {assignedTeachers.map(teacherKey => {
                            const teacher = teachers.find(t => t.key === teacherKey);
                            if (!teacher) return null;
                            const status = teacherStatus[teacherKey] || { completed: false, willAttend: false };
                            // Solo contar como completado si completed es true (marcado por admin)
                            const isCompleted = status.completed;
                            return (
                              <li key={teacherKey} className="mb-1">
                                <i className={`fas fa-${isCompleted ? 'check-circle text-success' : 'circle text-muted'} me-1`} style={{fontSize: '0.75rem'}}></i>
                                <span style={{color: isCompleted ? '#10b981' : '#6b7280'}}>{teacher.nombre}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="chart-container" style={{height: '220px', position: 'relative'}}>
                      <canvas id={canvasId} key={`canvas-${courseKey}-${index}`}></canvas>
                    </div>
                  </div>
                  <div className="card-footer bg-light">
                    <div className="row text-center">
                      <div className="col-6">
                        <small className="text-success">
                          <i className="fas fa-check-circle me-1"></i>
                          {completedTeachers} Completados
                        </small>
                      </div>
                      <div className="col-6">
                        <small className="text-danger">
                          <i className="fas fa-clock me-1"></i>
                          {totalTeachers - completedTeachers} Pendientes
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (showSearchResults) {
      return (
        <div className="content-grid">
          <h3 className="search-title">Resultados de la búsqueda ({searchResults.length} docentes)</h3>
          {searchResults.map(teacher => {
            const assignedCourses = Object.entries(courses)
              .filter(([_, course]) => course.assignedTeachers && course.assignedTeachers.includes(teacher.key))
              .map(([_, course]) => {
                const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
                const status = course.teacherStatus && course.teacherStatus[teacher.key]
                  ? course.teacherStatus[teacher.key]
                  : { completed: false, willAttend: false };
                // Para cursos presenciales: mostrar "Asistirá" si willAttend, "Completado" si completed
                // Para cursos en línea: mostrar "Completado" si completed
                const statusLabel = isOnline 
                  ? (status.completed ? 'Completado' : 'Pendiente')
                  : (status.completed ? 'Completado' : (status.willAttend ? 'Asistirá' : 'No confirmado'));
                const statusClass = isOnline
                  ? (status.completed ? 'completed' : 'pending')
                  : (status.completed ? 'completed' : (status.willAttend ? 'confirmed' : 'pending'));
                return (
                  <p key={course.nombre}>
                    <strong>{course.nombre}</strong> ({formatCourseType(course.tipo)}): 
                    <span className={`teacher-status status-${statusClass}`}>
                      {statusLabel}
                    </span>
                  </p>
                );
              });

            return (
              <div key={teacher.key} className="teacher-item">
                <h3>{teacher.nombre}</h3>
                <p><strong>Email:</strong> {teacher.email}</p>
                <p><strong>Id empleado:</strong> {teacher.matricula}</p>
                <p><strong>Área:</strong> {formatArea(teacher.area)}</p>
                <p><strong>Cursos Asignados:</strong></p>
                {assignedCourses.length > 0 ? assignedCourses : <p>Ninguno</p>}
              </div>
            );
          })}
        </div>
      );
    }

    switch (activeSection) {
      case 'allCourses':
        return renderCourses();
      case 'basicCourses':
        return renderCourses('basicos');
      case 'techCourses':
        return renderCourses('tecnologias');
      case 'advancedCourses':
        return renderCourses('avanzados');
      case 'specialCourses':
        return renderCourses('especializacion');
      case 'onlineCourses':
        return renderCourses(null, 'online');
      case 'inPersonCourses':
        return renderCourses(null, 'in-person');
      case 'bachilleratoTeachers':
        return renderTeachers('bachillerato');
      case 'licenciaturaTeachers':
        return renderTeachers('licenciatura');
      case 'posgradoTeachers':
        return renderTeachers('posgrado');
      case 'otrosTeachers':
        return renderTeachers('otros');
      case 'statsBasicCourses':
        return renderStats('basicos');
      case 'statsTechCourses':
        return renderStats('tecnologias');
      case 'statsAdvancedCourses':
        return renderStats('avanzados');
      case 'statsSpecialCourses':
        return renderStats('especializacion');
      default:
        return renderCourses();
    }
  };

  // Render Chart.js charts when stats are displayed
  useEffect(() => {
    if (['statsBasicCourses', 'statsTechCourses', 'statsAdvancedCourses', 'statsSpecialCourses'].includes(activeSection)) {
      // Clean up existing charts first
      statsCharts.forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      setStatsCharts([]);

      // Wait for DOM to update
      setTimeout(() => {
        const canvasElements = document.querySelectorAll('canvas[id^="statsCanvas-"]');
        console.log(`Found ${canvasElements.length} canvas elements for charts`);
        
        canvasElements.forEach((canvas, idx) => {
          // Check if canvas already has a chart instance
          const existingChart = Chart.getChart(canvas);
          if (existingChart) {
            existingChart.destroy();
          }

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Could not get 2D context for canvas:', canvas.id);
            return;
          }

          // Parse canvas ID: statsCanvas-{courseKey}-{index}
          const idMatch = canvas.id.match(/^statsCanvas-(.+)-(\d+)$/);
          if (!idMatch) {
            console.warn(`Invalid canvas ID format: ${canvas.id}`);
            return;
          }

          const courseKey = idMatch[1];
          const courseIndex = parseInt(idMatch[2]);
          
          if (!courseKey || courseKey === 'undefined') {
            console.warn(`Empty or undefined course key in canvas: ${canvas.id}`);
            return;
          }

          const course = courses[courseKey];
          if (!course) {
            console.warn(`Course not found for key: "${courseKey}" (ID: ${canvas.id})`);
            return;
          }

          const assignedTeachers = course.assignedTeachers || [];
          const teacherStatus = course.teacherStatus || {};
          const teacherNames = [];
          const completionStatus = [];
          const barColors = [];
          const tooltipData = [];

          const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
          
          assignedTeachers.forEach(teacherKey => {
            const teacher = teachers.find(t => t.key === teacherKey);
            if (teacher) {
              const status = teacherStatus[teacherKey] || { completed: false, willAttend: false };
              // Solo contar como completado si completed es true (marcado por admin)
              const isCompleted = status.completed;
              teacherNames.push(teacher.nombre);
              completionStatus.push(isCompleted ? 1 : 0);
              barColors.push(isCompleted ? '#28a745' : '#dc3545');
              // Para mostrar en tooltip: cursos presenciales muestran "Asistirá" si willAttend, "Completado" si completed
              const statusLabel = isOnline 
                ? (isCompleted ? 'Completado' : 'Pendiente')
                : (isCompleted ? 'Completado' : (status.willAttend ? 'Asistirá' : 'No confirmado'));
              tooltipData.push({
                courseName: course.nombre,
                teacherName: teacher.nombre,
                status: statusLabel
              });
            }
          });

          if (teacherNames.length === 0) {
            console.warn(`No teachers found for course: ${course.nombre}`);
            return;
          }

          try {
            const completed = completionStatus.filter(s => s === 1).length;
            const pending = completionStatus.filter(s => s === 0).length;
            
            console.log(`Creating chart for ${course.nombre}: ${completed} completed, ${pending} pending`);
            
            const chart = new Chart(ctx, {
              type: 'doughnut',
              data: {
                labels: ['Completados', 'Pendientes'],
                datasets: [{
                  data: [completed, pending],
                  backgroundColor: ['#10b981', '#ef4444'],
                  borderColor: '#ffffff',
                  borderWidth: 3,
                  hoverOffset: 8
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      padding: 15,
                      font: { size: 13, weight: '600' },
                      color: '#374151',
                      usePointStyle: true,
                      pointStyle: 'circle',
                      generateLabels: (chart) => {
                        const data = chart.data;
                        return data.labels.map((label, i) => ({
                          text: `${label}: ${data.datasets[0].data[i]}`,
                          fillStyle: data.datasets[0].backgroundColor[i],
                          hidden: false,
                          index: i
                        }));
                      }
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                      label: function(context) {
                        const total = completed + pending;
                        const value = context.parsed;
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${context.label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }
            });

            // Store chart reference for cleanup
            setStatsCharts(prev => [...prev, chart]);
          } catch (error) {
            console.error('Error creating chart:', error);
          }
        });
      }, 200);
    }

    // Cleanup charts when component unmounts or section changes
    return () => {
      statsCharts.forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      setStatsCharts([]);
    };
  }, [activeSection, courses, teachers]);

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      {sidebarMobileOpen && (
        <div className="sidebar-overlay" onClick={toggleMobileSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/9/93/Logo_de_la_Universidad_La_Salle_sin_letras.svg" 
            alt="Logo" 
            className="sidebar-logo"
          />
          <h2 className="sidebar-title">ADMIN</h2>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Cursos</h3>
            <ul className="sidebar-nav">
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'allCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('allCourses'); }}
                >
                  <i className="fas fa-book sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Todos los Cursos</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'basicCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('basicCourses'); }}
                >
                  <i className="fas fa-book-open sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Básicos</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'techCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('techCourses'); }}
                >
                  <i className="fas fa-laptop-code sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Tecnologías</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'advancedCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('advancedCourses'); }}
                >
                  <i className="fas fa-graduation-cap sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Avanzados</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'specialCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('specialCourses'); }}
                >
                  <i className="fas fa-star sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Especialización</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'onlineCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('onlineCourses'); }}
                >
                  <i className="fas fa-globe sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos en Línea</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'inPersonCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('inPersonCourses'); }}
                >
                  <i className="fas fa-users sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Presenciales</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Docentes</h3>
            <ul className="sidebar-nav">
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'bachilleratoTeachers' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('bachilleratoTeachers'); }}
                >
                  <i className="fas fa-user-graduate sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Bachillerato</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'licenciaturaTeachers' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('licenciaturaTeachers'); }}
                >
                  <i className="fas fa-user-tie sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Licenciatura</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'posgradoTeachers' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('posgradoTeachers'); }}
                >
                  <i className="fas fa-chalkboard-teacher sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Posgrado</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'otrosTeachers' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('otrosTeachers'); }}
                >
                  <i className="fas fa-users-cog sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Otros</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Estadísticas</h3>
            <ul className="sidebar-nav">
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'statsBasicCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('statsBasicCourses'); }}
                >
                  <i className="fas fa-chart-bar sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Básicos</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'statsTechCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('statsTechCourses'); }}
                >
                  <i className="fas fa-chart-bar sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Tecnologías</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'statsAdvancedCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('statsAdvancedCourses'); }}
                >
                  <i className="fas fa-chart-bar sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Avanzados</span>
                </a>
              </li>
              <li className="sidebar-nav-item">
                <a 
                  href="#" 
                  className={`sidebar-nav-link ${activeSection === 'statsSpecialCourses' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSectionChange('statsSpecialCourses'); }}
                >
                  <i className="fas fa-chart-bar sidebar-nav-icon"></i>
                  <span className="sidebar-nav-text">Cursos Especialización</span>
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        <header className="main-header">
          <button className="mobile-menu-btn" onClick={toggleMobileSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <div className="header-left">
            <h1 className="header-title">
              {activeSection === 'allCourses' && 'Todos los Cursos'}
              {activeSection === 'basicCourses' && 'Cursos Básicos'}
              {activeSection === 'techCourses' && 'Cursos Tecnologías'}
              {activeSection === 'advancedCourses' && 'Cursos Avanzados'}
              {activeSection === 'specialCourses' && 'Cursos Especialización'}
              {activeSection === 'onlineCourses' && 'Cursos en Línea'}
              {activeSection === 'inPersonCourses' && 'Cursos Presenciales'}
              {activeSection === 'bachilleratoTeachers' && 'Docentes Bachillerato'}
              {activeSection === 'licenciaturaTeachers' && 'Docentes Licenciatura'}
              {activeSection === 'posgradoTeachers' && 'Docentes Posgrado'}
              {activeSection === 'otrosTeachers' && 'Otros Docentes'}
              {activeSection === 'statsBasicCourses' && 'Estadísticas Cursos Básicos'}
              {activeSection === 'statsTechCourses' && 'Estadísticas Cursos Tecnologías'}
              {activeSection === 'statsAdvancedCourses' && 'Estadísticas Cursos Avanzados'}
              {activeSection === 'statsSpecialCourses' && 'Estadísticas Cursos Especialización'}
            </h1>
          </div>
          <div className="header-user">
            <div 
              className="user-avatar-container"
              onClick={() => setShowProfile(true)}
              style={{ cursor: 'pointer' }}
              title="Ver perfil"
            >
              {currentAdmin?.fotoUrl ? (
                <img 
                  src={currentAdmin.fotoUrl} 
                  alt={currentAdmin?.nombre || 'Admin'} 
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>
            <span 
              className="user-name"
              onClick={() => setShowProfile(true)}
              style={{ cursor: 'pointer' }}
            >
              Bienvenido {currentAdmin?.nombre || 'Admin'}
            </span>
            <button className="btn btn-danger btn-icon" onClick={handleLogout} title="Cerrar Sesión">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        <section className="content-area">
          <div className="content-header">
            <div className="header-section-title">
              <h2 className="section-title">
                <i className="fas fa-bolt"></i>
                Bienvenido Administrador
              </h2>
              <p className="section-subtitle">Gestiona cursos, docentes y consulta el historial</p>
            </div>
          </div>
          
          <div className="action-buttons-container">
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={() => {
                setEditingCourse(null);
                setTeacherAreaFilter('');
                setShowCourseModal(true);
              }}>
                <i className="fas fa-plus"></i>
                <span>Agregar Curso</span>
              </button>
              <button className="btn btn-success" onClick={() => setShowTeacherModal(true)}>
                <i className="fas fa-user-plus"></i>
                <span>Agregar Docente</span>
              </button>
              <button className="btn btn-info" onClick={() => setShowSearchModal(true)}>
                <i className="fas fa-search"></i>
                <span>Buscar Docente</span>
              </button>
              <button className="btn btn-activity" onClick={() => setShowActivityModal(true)}>
                <i className="fas fa-history"></i>
                <span>Historial</span>
              </button>
            </div>
          </div>
          
          {/* Content will be rendered based on activeSection */}
          {renderContent()}
        </section>
      </main>

      {/* Message Container */}
      {message && (
        <div className={`message ${messageType}`}>
          <i className={`fas fa-${messageType === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
          {message}
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="modal-backdrop" onClick={() => setShowActivityModal(false)}>
          <div className="modal-content activity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-stream"></i> Historial de Docentes</h2>
              <button className="close" onClick={() => setShowActivityModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="activity-timeline">
                {!activityLog || activityLog.length === 0 ? (
                  <div className="activity-empty">
                    <i className="fas fa-user-clock"></i>
                    <p>No hay movimientos registrados para docentes.</p>
                  </div>
                ) : (
                  activityLog.map((entry) => (
                    <article key={entry.id} className="activity-item">
                      <div className="activity-icon">
                        <i className="fas fa-user-circle"></i>
                      </div>
                      <div className="activity-details">
                        <header>
                          <span className="activity-user">{entry.user}</span>
                          <div className="activity-header-meta">
                            <span className={`activity-badge status-${entry.status}`}>{entry.statusLabel}</span>
                            <time>{new Date(entry.timestamp).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</time>
                          </div>
                        </header>
                        <p className="activity-action">{entry.action}</p>
                        {entry.details && (
                          <p className="activity-meta">{entry.details}</p>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowActivityModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-backdrop" onClick={() => setShowCourseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-book"></i> {editingCourse ? 'Editar Curso' : 'Agregar Nuevo Curso'}
              </h2>
              <button className="close" onClick={() => setShowCourseModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCourseSubmit}>
                <input type="hidden" name="courseId" value={editingCourse || ''} />
                <div className="form-group">
                  <label htmlFor="courseType">Tipo de Curso *</label>
                  <select name="courseType" id="courseType" required defaultValue={editingCourse ? courses[editingCourse]?.tipo : ''}>
                    <option value="">Seleccionar tipo</option>
                    <option value="basicos">Básicos</option>
                    <option value="tecnologias">Tecnologías</option>
                    <option value="avanzados">Avanzados</option>
                    <option value="especializacion">Especialización</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="courseName">Nombre del Curso *</label>
                  <input 
                    type="text" 
                    name="courseName" 
                    id="courseName" 
                    required 
                    defaultValue={editingCourse ? courses[editingCourse]?.nombre : ''}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="courseUrl">URL (para cursos en línea)</label>
                  <input 
                    type="url" 
                    name="courseUrl" 
                    id="courseUrl" 
                    placeholder="https://ejemplo.com"
                    defaultValue={editingCourse ? courses[editingCourse]?.url : ''}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="courseDate">Fecha (para cursos presenciales)</label>
                  <input 
                    type="date" 
                    name="courseDate" 
                    id="courseDate"
                    defaultValue={editingCourse ? courses[editingCourse]?.fecha : ''}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="courseDescription">Descripción</label>
                  <textarea 
                    name="courseDescription" 
                    id="courseDescription" 
                    rows="3"
                    defaultValue={editingCourse ? courses[editingCourse]?.descripcion : ''}
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Docentes Asignados</label>
                  <div className="teacher-filter-container">
                    <div className="teacher-filter-buttons">
                      <button
                        type="button"
                        className={`filter-btn ${teacherAreaFilter === '' ? 'active' : ''}`}
                        onClick={() => setTeacherAreaFilter('')}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${teacherAreaFilter === 'bachillerato' ? 'active' : ''}`}
                        onClick={() => setTeacherAreaFilter('bachillerato')}
                      >
                        Bachillerato
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${teacherAreaFilter === 'licenciatura' ? 'active' : ''}`}
                        onClick={() => setTeacherAreaFilter('licenciatura')}
                      >
                        Licenciatura
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${teacherAreaFilter === 'posgrado' ? 'active' : ''}`}
                        onClick={() => setTeacherAreaFilter('posgrado')}
                      >
                        Posgrado
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${teacherAreaFilter === 'otros' ? 'active' : ''}`}
                        onClick={() => setTeacherAreaFilter('otros')}
                      >
                        Otros
                      </button>
                    </div>
                    <div className="teacher-table-container-modal">
                      <table className="teacher-selection-table">
                        <thead>
                          <tr>
                            <th style={{width: '50px'}}>
                              <input
                                type="checkbox"
                                id="selectAllTeachers"
                                onChange={(e) => {
                                  const checkboxes = document.querySelectorAll('input[name="assignedTeachers"]');
                                  checkboxes.forEach(cb => cb.checked = e.target.checked);
                                }}
                              />
                            </th>
                            <th>No.</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Id empleado</th>
                            <th>Área</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teachers
                            .filter(teacher => {
                              if (teacherAreaFilter === '') return true;
                              if (teacherAreaFilter === 'otros') {
                                return teacher.area === 'otros' || !['bachillerato', 'licenciatura', 'posgrado'].includes(teacher.area);
                              }
                              return teacher.area === teacherAreaFilter;
                            })
                            .map((teacher, index) => (
                              <tr key={teacher.key}>
                                <td style={{textAlign: 'center'}}>
                                  <input
                                    type="checkbox"
                                    name="assignedTeachers"
                                    value={teacher.key}
                                    defaultChecked={editingCourse && courses[editingCourse]?.assignedTeachers?.includes(teacher.key)}
                                  />
                                </td>
                                <td style={{textAlign: 'center', fontWeight: '600'}}>{index + 1}</td>
                                <td>{teacher.nombre}</td>
                                <td>{teacher.email}</td>
                                <td>{teacher.matricula}</td>
                                <td>
                                  <span className="teacher-area-badge">{formatArea(teacher.area)}</span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCourseModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingCourse ? 'Actualizar' : 'Agregar'} Curso
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Modal */}
      {showTeacherModal && (
        <div className="modal-backdrop" onClick={() => setShowTeacherModal(false)}>
          <div className="modal-content teacher-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-user-plus"></i> Agregar Nuevo Docente</h2>
              <button className="close" onClick={() => setShowTeacherModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleTeacherSubmit}>
                <div className="form-group">
                  <label htmlFor="teacherName">Nombre Completo *</label>
                  <input type="text" name="teacherName" id="teacherName" required />
                </div>
                <div className="form-group">
                  <label htmlFor="teacherEmail">Correo Electrónico *</label>
                  <input type="email" name="teacherEmail" id="teacherEmail" required />
                </div>
                <div className="form-group">
                  <label htmlFor="teacherMatricula">Id empleado *</label>
                  <input type="text" name="teacherMatricula" id="teacherMatricula" required />
                </div>
                <div className="form-group">
                  <label htmlFor="teacherPassword">Contraseña * (mínimo 6 caracteres)</label>
                  <input type="password" name="teacherPassword" id="teacherPassword" required minLength="6" />
                </div>
                <div className="form-group">
                  <label htmlFor="teacherArea">Área *</label>
                  <select name="teacherArea" id="teacherArea" required>
                    <option value="">Selecciona un área</option>
                    <option value="bachillerato">Bachillerato</option>
                    <option value="licenciatura">Licenciatura</option>
                    <option value="posgrado">Posgrado</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div className="form-group" id="customAreaGroup" style={{ display: 'none' }}>
                  <label htmlFor="customArea">Especificar Área Personalizada *</label>
                  <input type="text" name="customArea" id="customArea" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTeacherModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success">
                    Registrar Docente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Search Teacher Modal */}
      {showSearchModal && (
        <div className="modal-backdrop" onClick={() => setShowSearchModal(false)}>
          <div className="modal-content search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-search"></i> Buscar Docente</h2>
              <button className="close" onClick={() => setShowSearchModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSearchSubmit}>
                <div className="form-group">
                  <label htmlFor="searchTerm">Término de Búsqueda *</label>
                  <input 
                    type="text" 
                    name="searchTerm" 
                    id="searchTerm" 
                    placeholder="Nombre o Id empleado"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="searchArea">Filtrar por Área</label>
                  <select name="searchArea" id="searchArea">
                    <option value="">Todas las Áreas</option>
                    <option value="bachillerato">Bachillerato</option>
                    <option value="licenciatura">Licenciatura</option>
                    <option value="posgrado">Posgrado</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSearchModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-info">
                    Buscar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-exclamation-triangle"></i> Confirmar Eliminación</h2>
              <button className="close" onClick={() => setShowConfirmModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Teacher Modal */}
      {showConfirmTeacherModal && currentTeacherToDelete && (
        <div className="modal-backdrop" onClick={() => setShowConfirmTeacherModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-exclamation-triangle"></i> Confirmar Eliminación</h2>
              <button className="close" onClick={() => setShowConfirmTeacherModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas eliminar al docente <strong>{teachers.find(t => t.key === currentTeacherToDelete)?.nombre || currentTeacherToDelete}</strong>? Esta acción no se puede deshacer.</p>
              <p className="text-muted" style={{marginTop: '1rem', fontSize: '0.9rem'}}>
                El docente será removido de todos los cursos asignados.
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmTeacherModal(false)}>
                Regresar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteTeacherConfirm}>
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Edit Course Modal */}
      {showConfirmEditModal && pendingCourseData && (
        <div className="modal-backdrop" onClick={() => setShowConfirmEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-question-circle"></i> Confirmar Cambios</h2>
              <button className="close" onClick={() => setShowConfirmEditModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas guardar los cambios realizados al curso <strong>{pendingCourseData.courseData.nombre}</strong>?</p>
              <p className="text-muted" style={{marginTop: '1rem', fontSize: '0.9rem'}}>
                Los cambios se aplicarán inmediatamente y no podrán deshacerse.
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => {
                setShowConfirmEditModal(false);
                setPendingCourseData(null);
              }}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmEdit}>
                <i className="fas fa-check"></i> Sí, Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Mini Modal */}
      {showCourseMiniModal && selectedCourseForMiniModal && (
        <div className="mini-modal-backdrop" onClick={() => setShowCourseMiniModal(false)}>
          <div className="mini-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mini-modal-header">
              <h3>
                <i className="fas fa-book"></i> {courses[selectedCourseForMiniModal]?.nombre}
              </h3>
              <button className="close" onClick={() => setShowCourseMiniModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mini-modal-body">
              <ul className="course-info-list">
                <li>
                  <strong>Tipo:</strong> {formatCourseType(courses[selectedCourseForMiniModal]?.tipo)}
                </li>
                {courses[selectedCourseForMiniModal]?.url && (
                  <li>
                    <strong>URL:</strong> <a href={courses[selectedCourseForMiniModal].url} target="_blank" rel="noopener noreferrer">{courses[selectedCourseForMiniModal].url}</a>
                  </li>
                )}
                {courses[selectedCourseForMiniModal]?.fecha && (
                  <li>
                    <strong>Fecha:</strong> {new Date(courses[selectedCourseForMiniModal].fecha).toLocaleDateString('es-ES')}
                  </li>
                )}
                {courses[selectedCourseForMiniModal]?.descripcion && (
                  <li>
                    <strong>Descripción:</strong> {courses[selectedCourseForMiniModal].descripcion}
                  </li>
                )}
                <li>
                  <strong>Asignado a:</strong> {
                    courses[selectedCourseForMiniModal]?.assignedTeachers
                      ? teachers
                          .filter(t => courses[selectedCourseForMiniModal].assignedTeachers.includes(t.key))
                          .map(t => t.nombre)
                          .join(', ')
                      : 'Ninguno'
                  }
                </li>
              </ul>
            </div>
            <div className="mini-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCourseMiniModal(false)}>
                Cerrar
              </button>
              <button className="btn btn-info" onClick={() => {
                setShowCourseMiniModal(false);
                editCourse(selectedCourseForMiniModal);
              }}>
                <i className="fas fa-edit"></i> Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Mini Modal */}
      {showAttendanceMiniModal && selectedTeacherForMiniModal && (() => {
        const teacher = teachers.find(t => t.key === selectedTeacherForMiniModal);
        return (
          <div className="mini-modal-backdrop" onClick={() => setShowAttendanceMiniModal(false)}>
            <div className="mini-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="mini-modal-header">
                <div className="teacher-modal-header-content">
                  <div className="teacher-profile-picture-container">
                    {teacher?.fotoUrl ? (
                      <img 
                        src={teacher.fotoUrl} 
                        alt={teacher?.nombre || 'Docente'} 
                        className="teacher-profile-picture"
                      />
                    ) : (
                      <div className="teacher-profile-picture-placeholder">
                        <i className="fas fa-user"></i>
                      </div>
                    )}
                  </div>
                  <h3>
                    {teacher?.nombre || 'Docente'}
                  </h3>
                </div>
                <button className="close" onClick={() => setShowAttendanceMiniModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="mini-modal-body">
                <ul className="teacher-info-list">
                  <li>
                    <strong>Email:</strong> {teacher?.email}
                  </li>
                  <li>
                    <strong>Id empleado:</strong> {teacher?.matricula}
                  </li>
                  <li>
                    <strong>Área:</strong> {formatArea(teacher?.area)}
                  </li>
                </ul>
              
              <div className="teacher-courses">
                <h4>Cursos Asignados:</h4>
                {Object.entries(courses)
                  .filter(([_, course]) => course.assignedTeachers && course.assignedTeachers.includes(selectedTeacherForMiniModal))
                  .length === 0 ? (
                    <p className="no-courses">No tiene cursos asignados</p>
                  ) : (
                    <div className="modal-courses-table-container">
                      <table className="modal-courses-table">
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>Nombre del Curso</th>
                            <th>Tipo</th>
                            <th>Asistencia</th>
                            <th>Estatus</th>
                            <th>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(courses)
                            .filter(([_, course]) => course.assignedTeachers && course.assignedTeachers.includes(selectedTeacherForMiniModal))
                            .map(([courseKey, course], index) => {
                              const isOnline = course.url && course.url.match(/^https?:\/\/.+/);
                              const status = course.teacherStatus && course.teacherStatus[selectedTeacherForMiniModal]
                                ? course.teacherStatus[selectedTeacherForMiniModal]
                                : { completed: false, willAttend: false };
                              
                              // Para cursos presenciales: mostrar "Asistirá" si willAttend (marcado por docente)
                              // y "Completado" si completed (marcado por admin)
                              // Para cursos en línea: mostrar "Completado" si completed
                              const statusClass = status.completed ? 'completed' : 'pending';
                              const statusLabel = status.completed ? 'Completado' : 'No completado';
                              
                              // Para cursos presenciales, mostrar también el estado de asistencia del docente
                              const attendanceClass = !isOnline && status.willAttend ? 'confirmed' : 'pending';
                              const attendanceLabel = !isOnline && status.willAttend ? 'Asistirá' : 'Pendiente';
                              
                              return (
                                <tr key={courseKey} className="modal-course-row">
                                  <td className="modal-course-number">{index + 1}</td>
                                  <td className="modal-course-name">{course.nombre}</td>
                                  <td className="modal-course-type">
                                    <span className="modal-course-type-badge">{formatCourseType(course.tipo)}</span>
                                  </td>
                                  <td className="modal-course-attendance">
                                    {isOnline ? (
                                      <span className="attendance-na">N/A</span>
                                    ) : (
                                      <span className={`teacher-status status-${attendanceClass}`}>
                                        {attendanceLabel}
                                      </span>
                                    )}
                                  </td>
                                  <td className="modal-course-status">
                                    <span className={`teacher-status status-${statusClass}`}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td className="modal-course-actions-cell">
                                    <div className="modal-table-actions">
                                      <label className="toggle-switch">
                                        <input
                                          type="checkbox"
                                          checked={status.completed}
                                          onChange={(e) => {
                                            const newStatus = e.target.checked;
                                            updateTeacherAttendance(courseKey, selectedTeacherForMiniModal, newStatus);
                                          }}
                                        />
                                        <span className="toggle-slider"></span>
                                      </label>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </div>
            <div className="mini-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAttendanceMiniModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Perfil de Usuario */}
      {showProfile && currentAdmin && (
        <AdminProfile
          admin={currentAdmin}
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedAdmin) => {
            setCurrentAdmin(updatedAdmin);
            // Recargar datos del admin desde Firestore para asegurar sincronización
            const loadUpdatedAdmin = async () => {
              try {
                const user = auth.currentUser;
                if (user) {
                  const adminDocRef = doc(db, 'administradores', user.uid);
                  const adminDoc = await getDoc(adminDocRef);
                  if (adminDoc.exists()) {
                    setCurrentAdmin(adminDoc.data());
                  }
                }
              } catch (error) {
                console.error('Error al recargar admin:', error);
              }
            };
            loadUpdatedAdmin();
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;
