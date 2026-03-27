// Componente adicional para mostrar estadísticas en tiempo real
import React, { useState, useEffect } from 'react';
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase/config';

const RealTimeStats = ({ userType }) => {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalTeachers: 0,
    onlineCourses: 0,
    completedCourses: 0
  });

  useEffect(() => {
    const coursesRef = ref(rtdb, 'cursos');
    const teachersRef = ref(rtdb, 'docentes');

    const unsubscribeCourses = onValue(coursesRef, (snapshot) => {
      const courses = snapshot.val() || {};
      const courseList = Object.values(courses);
      
      const onlineCourses = courseList.filter(course => 
        course.url && course.url.match(/^https?:\/\/.+/)
      ).length;

      let completedCourses = 0;
      courseList.forEach(course => {
        if (course.teacherStatus) {
          Object.values(course.teacherStatus).forEach(status => {
            if (status.completed) completedCourses++;
          });
        }
      });

      setStats(prev => ({
        ...prev,
        totalCourses: courseList.length,
        onlineCourses,
        completedCourses
      }));
    });

    const unsubscribeTeachers = onValue(teachersRef, (snapshot) => {
      const teachers = snapshot.val() || {};
      setStats(prev => ({
        ...prev,
        totalTeachers: Object.keys(teachers).length
      }));
    });

    return () => {
      unsubscribeCourses();
      unsubscribeTeachers();
    };
  }, []);

  if (userType === 'guest') {
    return null; // No mostrar estadísticas a usuarios no autenticados
  }

  return (
    <Card className="mb-3 stats-card">
      <Card.Body className="p-2">
        <Row className="text-center">
          <Col xs={6} md={3}>
            <div className="stat-item">
              <Badge bg="primary" className="stat-badge">
                {stats.totalCourses}
              </Badge>
              <small className="stat-label">Cursos</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-item">
              <Badge bg="success" className="stat-badge">
                {stats.totalTeachers}
              </Badge>
              <small className="stat-label">Docentes</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-item">
              <Badge bg="info" className="stat-badge">
                {stats.onlineCourses}
              </Badge>
              <small className="stat-label">En línea</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-item">
              <Badge bg="warning" className="stat-badge">
                {stats.completedCourses}
              </Badge>
              <small className="stat-label">Completados</small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default RealTimeStats;
