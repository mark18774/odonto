-- Script SQL para MySQL - Consultorio Dental Virgen de Copacabana

-- Tabla de Especialidades
CREATE TABLE IF NOT EXISTS especialidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Médicos
CREATE TABLE IF NOT EXISTS medicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ci VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(255) NOT NULL,
    celular VARCHAR(20),
    correo VARCHAR(100) UNIQUE,
    especialidad_id INT,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (especialidad_id) REFERENCES especialidades(id)
);

-- Tabla de Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT,
    ci VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(255) NOT NULL,
    celular VARCHAR(20),
    correo VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medico_id) REFERENCES medicos(id)
);

-- Tabla de Tipos de Tratamiento
CREATE TABLE IF NOT EXISTS tipos_tratamiento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Tratamientos (Cotizaciones)
CREATE TABLE IF NOT EXISTS tratamientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    tipo_tratamiento_id INT,
    costo_total DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, EN_CURSO, FINALIZADO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
    FOREIGN KEY (tipo_tratamiento_id) REFERENCES tipos_tratamiento(id)
);

-- Tabla de Citas (Cronograma)
CREATE TABLE IF NOT EXISTS citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tratamiento_id INT,
    fecha_programada DATETIME NOT NULL,
    fecha_atencion DATETIME,
    estado VARCHAR(20) DEFAULT 'PROGRAMADA', -- PROGRAMADA, REALIZADA, CANCELADA
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tratamiento_id) REFERENCES tratamientos(id)
);

-- Tabla de Servicios Realizados
CREATE TABLE IF NOT EXISTS servicios_realizados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cita_id INT,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cita_id) REFERENCES citas(id)
);

-- Tabla de Medicamentos Prescritos
CREATE TABLE IF NOT EXISTS medicamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cita_id INT,
    nombre VARCHAR(255) NOT NULL,
    indicaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cita_id) REFERENCES citas(id)
);

-- Tabla de Pagos (Abonos)
CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tratamiento_id INT,
    cita_id INT,
    monto DECIMAL(10, 2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tratamiento_id) REFERENCES tratamientos(id),
    FOREIGN KEY (cita_id) REFERENCES citas(id)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_pacientes_medico ON pacientes(medico_id);
CREATE INDEX idx_tratamientos_paciente ON tratamientos(paciente_id);
CREATE INDEX idx_citas_tratamiento ON citas(tratamiento_id);
CREATE INDEX idx_pagos_tratamiento ON pagos(tratamiento_id);

-- Datos iniciales de especialidades
INSERT IGNORE INTO especialidades (nombre) VALUES 
('Odontología General'),
('Ortodoncia'),
('Endodoncia'),
('Periodoncia'),
('Odontopediatría'),
('Cirugía Maxilofacial'),
('Rehabilitación Oral');

-- Datos iniciales de tipos de tratamiento
INSERT IGNORE INTO tipos_tratamiento (nombre, descripcion) VALUES 
('Limpieza Dental', 'Profilaxis completa'),
('Extracción', 'Exodoncia simple o compleja'),
('Brackets', 'Tratamiento de ortodoncia'),
('Endodoncia', 'Tratamiento de conducto'),
('Blanqueamiento', 'Estética dental'),
('Implante', 'Prótesis fija sobre implante');
