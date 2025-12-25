-- =====================================================
-- ESQUEMA DE BASE DE DATOS - SISTEMA GESTIÓN CONDOMINIAL
-- Ciudad Colonial
-- =====================================================

-- =====================================================
-- 1. TABLAS PRINCIPALES EXISTENTES
-- =====================================================

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  contraseña VARCHAR(255) NOT NULL,
  escuela VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'Usuario',
  estado VARCHAR(50) DEFAULT 'Activo',
  uuid UUID,
  telefono VARCHAR(20),
  cedula VARCHAR(20) UNIQUE,
  numeroApartamento VARCHAR(10),
  tipoResidencia VARCHAR(50),
  fechaAdquisicion DATE,
  numeroEscritura VARCHAR(100),
  nombrePropietario VARCHAR(255),
  cedulaPropietario VARCHAR(20),
  telefonoPropietario VARCHAR(20),
  fechaInicioContrato DATE,
  fechaFinContrato DATE,
  nombrePropietarioRelacionado VARCHAR(255),
  cedulaPropietarioRelacionado VARCHAR(20),
  parentesco VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Libros
CREATE TABLE IF NOT EXISTS Libros (
  id_libro SERIAL PRIMARY KEY,
  titulo VARCHAR(500) NOT NULL,
  sinopsis TEXT,
  fecha_publicacion DATE NOT NULL,
  url_portada VARCHAR(500),
  tipo VARCHAR(50),
  especialidad VARCHAR(255),
  categoria VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: autor
CREATE TABLE IF NOT EXISTS autor (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: libros_autores
CREATE TABLE IF NOT EXISTS libros_autores (
  libro_id INTEGER NOT NULL REFERENCES Libros(id_libro) ON DELETE CASCADE,
  autor_id INTEGER NOT NULL REFERENCES autor(id) ON DELETE CASCADE,
  PRIMARY KEY (libro_id, autor_id)
);

-- Tabla: libros_fisicos
CREATE TABLE IF NOT EXISTS libros_fisicos (
  id SERIAL PRIMARY KEY,
  libro_id INTEGER NOT NULL UNIQUE REFERENCES Libros(id_libro) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: libros_virtuales
CREATE TABLE IF NOT EXISTS libros_virtuales (
  id SERIAL PRIMARY KEY,
  libro_id INTEGER UNIQUE REFERENCES Libros(id_libro) ON DELETE CASCADE,
  direccion_del_libro VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: ordenes
CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  libro_id INTEGER NOT NULL REFERENCES Libros(id_libro) ON DELETE CASCADE,
  estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente de buscar',
  fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega TIMESTAMP,
  fecha_devolucion TIMESTAMP,
  fecha_limite_busqueda TIMESTAMP,
  fecha_limite_devolucion TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: tutor
CREATE TABLE IF NOT EXISTS tutor (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: tesis
CREATE TABLE IF NOT EXISTS tesis (
  id SERIAL PRIMARY KEY,
  libro_id INTEGER REFERENCES Libros(id_libro) ON DELETE CASCADE,
  tutor_id INTEGER NOT NULL REFERENCES tutor(id) ON DELETE RESTRICT,
  escuela VARCHAR(255),
  periodo_academico VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: proyecto_investigacion
CREATE TABLE IF NOT EXISTS proyecto_investigacion (
  id SERIAL PRIMARY KEY,
  libro_id INTEGER REFERENCES Libros(id_libro) ON DELETE CASCADE,
  tutor_id INTEGER NOT NULL REFERENCES tutor(id) ON DELETE RESTRICT,
  escuela VARCHAR(255) NOT NULL,
  periodo_academico VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. TABLAS NUEVAS PARA FUNCIONALIDADES DEL CONDOMINIO
-- =====================================================

-- Tabla: anuncios
CREATE TABLE IF NOT EXISTS anuncios (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(500) NOT NULL,
  contenido TEXT NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'general',
  autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  autor_nombre VARCHAR(255),
  fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMP,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: solicitudes_mantenimiento
CREATE TABLE IF NOT EXISTS solicitudes_mantenimiento (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(500) NOT NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  prioridad VARCHAR(50) NOT NULL DEFAULT 'media',
  ubicacion VARCHAR(255),
  responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  responsable_nombre VARCHAR(255),
  usuario_solicitante_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_inicio TIMESTAMP,
  fecha_completado TIMESTAMP,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: espacios_comunes
CREATE TABLE IF NOT EXISTS espacios_comunes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  capacidad INTEGER,
  horarios TEXT,
  equipamiento TEXT[],
  estado VARCHAR(50) NOT NULL DEFAULT 'disponible',
  imagen_url VARCHAR(500),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: reservas_espacios
CREATE TABLE IF NOT EXISTS reservas_espacios (
  id SERIAL PRIMARY KEY,
  espacio_id INTEGER NOT NULL REFERENCES espacios_comunes(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_reserva DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  motivo TEXT,
  numero_personas INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_reserva_espacio_horario UNIQUE (espacio_id, fecha_reserva, hora_inicio, hora_fin)
);

-- Tabla: pagos
CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  concepto VARCHAR(500) NOT NULL,
  monto DECIMAL(10, 2) NOT NULL CHECK (monto >= 0),
  tipo VARCHAR(50) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  fecha_vencimiento DATE NOT NULL,
  fecha_pago TIMESTAMP,
  referencia VARCHAR(100),
  metodo_pago VARCHAR(50),
  monto_pagado DECIMAL(10, 2) DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: historial_pagos
CREATE TABLE IF NOT EXISTS historial_pagos (
  id SERIAL PRIMARY KEY,
  pago_id INTEGER NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  monto DECIMAL(10, 2) NOT NULL,
  metodo_pago VARCHAR(50),
  referencia_transaccion VARCHAR(100),
  fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL, -- 'reserva', 'pago', 'mantenimiento'
  titulo VARCHAR(500) NOT NULL,
  mensaje TEXT NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  relacion_id INTEGER, -- ID de la reserva, pago, etc.
  relacion_tipo VARCHAR(50), -- 'reserva_espacio', 'pago', etc.
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'vista', 'resuelta'
  leida BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_lectura TIMESTAMP,
  accion_requerida BOOLEAN DEFAULT TRUE, -- Si requiere acción del admin
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. ÍNDICES
-- =====================================================

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_cedula ON usuarios(cedula);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- Índices para Libros
CREATE INDEX IF NOT EXISTS idx_libros_tipo ON Libros(tipo);
CREATE INDEX IF NOT EXISTS idx_libros_especialidad ON Libros(especialidad);
CREATE INDEX IF NOT EXISTS idx_libros_categoria ON Libros(categoria);
CREATE INDEX IF NOT EXISTS idx_libros_titulo ON Libros(titulo);

-- Índices para relaciones
CREATE INDEX IF NOT EXISTS idx_libros_autores_libro ON libros_autores(libro_id);
CREATE INDEX IF NOT EXISTS idx_libros_autores_autor ON libros_autores(autor_id);
CREATE INDEX IF NOT EXISTS idx_libros_fisicos_libro ON libros_fisicos(libro_id);
CREATE INDEX IF NOT EXISTS idx_libros_virtuales_libro ON libros_virtuales(libro_id);

-- Índices para ordenes
CREATE INDEX IF NOT EXISTS idx_ordenes_usuario ON ordenes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_libro ON ordenes(libro_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_reserva ON ordenes(fecha_reserva);

-- Índices para tesis
CREATE INDEX IF NOT EXISTS idx_tesis_libro ON tesis(libro_id);
CREATE INDEX IF NOT EXISTS idx_tesis_tutor ON tesis(tutor_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_libro ON proyecto_investigacion(libro_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_tutor ON proyecto_investigacion(tutor_id);
CREATE INDEX IF NOT EXISTS idx_autor_nombre ON autor(nombre);
CREATE INDEX IF NOT EXISTS idx_tutor_nombre ON tutor(nombre);

-- Índices para anuncios
CREATE INDEX IF NOT EXISTS idx_anuncios_categoria ON anuncios(categoria);
CREATE INDEX IF NOT EXISTS idx_anuncios_fecha ON anuncios(fecha_publicacion);
CREATE INDEX IF NOT EXISTS idx_anuncios_activo ON anuncios(activo);
CREATE INDEX IF NOT EXISTS idx_anuncios_autor ON anuncios(autor_id);

-- Índices para mantenimiento
CREATE INDEX IF NOT EXISTS idx_mantenimiento_estado ON solicitudes_mantenimiento(estado);
CREATE INDEX IF NOT EXISTS idx_mantenimiento_prioridad ON solicitudes_mantenimiento(prioridad);
CREATE INDEX IF NOT EXISTS idx_mantenimiento_usuario ON solicitudes_mantenimiento(usuario_solicitante_id);
CREATE INDEX IF NOT EXISTS idx_mantenimiento_responsable ON solicitudes_mantenimiento(responsable_id);
CREATE INDEX IF NOT EXISTS idx_mantenimiento_fecha ON solicitudes_mantenimiento(fecha_solicitud);

-- Índices para reservas
CREATE INDEX IF NOT EXISTS idx_espacios_estado ON espacios_comunes(estado);
CREATE INDEX IF NOT EXISTS idx_espacios_activo ON espacios_comunes(activo);
CREATE INDEX IF NOT EXISTS idx_reservas_espacio ON reservas_espacios(espacio_id);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas_espacios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas_espacios(fecha_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas_espacios(estado);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_tipo ON pagos(tipo);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_vencimiento ON pagos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pagos_referencia ON pagos(referencia);
CREATE INDEX IF NOT EXISTS idx_historial_pago ON historial_pagos(pago_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_pagos(fecha_pago);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_estado ON notificaciones(estado);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_notificaciones_relacion ON notificaciones(relacion_id, relacion_tipo);

-- =====================================================
-- 4. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_libros_updated_at ON Libros;
CREATE TRIGGER update_libros_updated_at BEFORE UPDATE ON Libros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ordenes_updated_at ON ordenes;
CREATE TRIGGER update_ordenes_updated_at BEFORE UPDATE ON ordenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_anuncios_updated_at ON anuncios;
CREATE TRIGGER update_anuncios_updated_at BEFORE UPDATE ON anuncios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mantenimiento_updated_at ON solicitudes_mantenimiento;
CREATE TRIGGER update_mantenimiento_updated_at BEFORE UPDATE ON solicitudes_mantenimiento
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservas_updated_at ON reservas_espacios;
CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas_espacios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pagos_updated_at ON pagos;
CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notificaciones_updated_at ON notificaciones;
CREATE TRIGGER update_notificaciones_updated_at BEFORE UPDATE ON notificaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para reducir stock al crear orden
CREATE OR REPLACE FUNCTION reducir_stock_libro()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'Pendiente de buscar' THEN
        UPDATE libros_fisicos
        SET cantidad = cantidad - 1
        WHERE libro_id = NEW.libro_id AND cantidad > 0;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_reducir_stock ON ordenes;
CREATE TRIGGER trigger_reducir_stock AFTER INSERT ON ordenes
    FOR EACH ROW EXECUTE FUNCTION reducir_stock_libro();

-- Función para aumentar stock al devolver libro
CREATE OR REPLACE FUNCTION aumentar_stock_libro()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'Devuelto' AND OLD.estado != 'Devuelto' THEN
        UPDATE libros_fisicos
        SET cantidad = cantidad + 1
        WHERE libro_id = NEW.libro_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_aumentar_stock ON ordenes;
CREATE TRIGGER trigger_aumentar_stock AFTER UPDATE ON ordenes
    FOR EACH ROW EXECUTE FUNCTION aumentar_stock_libro();

-- Función para actualizar estado de pago
CREATE OR REPLACE FUNCTION actualizar_estado_pago()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.monto_pagado >= NEW.monto THEN
        NEW.estado = 'pagado';
        IF NEW.fecha_pago IS NULL THEN
            NEW.fecha_pago = CURRENT_TIMESTAMP;
        END IF;
    ELSIF NEW.monto_pagado > 0 THEN
        NEW.estado = 'parcial';
    ELSIF NEW.fecha_vencimiento < CURRENT_DATE AND NEW.estado != 'pagado' THEN
        NEW.estado = 'vencido';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_actualizar_estado_pago ON pagos;
CREATE TRIGGER trigger_actualizar_estado_pago BEFORE UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION actualizar_estado_pago();

-- Función para marcar usuarios morosos
CREATE OR REPLACE FUNCTION actualizar_usuarios_morosos()
RETURNS void AS $$
BEGIN
    UPDATE usuarios
    SET estado = 'Moroso'
    WHERE id IN (
        SELECT DISTINCT usuario_id
        FROM pagos
        WHERE estado IN ('vencido', 'pendiente')
        AND fecha_vencimiento < CURRENT_DATE
    )
    AND estado != 'Moroso';
    
    UPDATE usuarios
    SET estado = 'Activo'
    WHERE id NOT IN (
        SELECT DISTINCT usuario_id
        FROM pagos
        WHERE estado IN ('vencido', 'pendiente')
        AND fecha_vencimiento < CURRENT_DATE
    )
    AND estado = 'Moroso';
END;
$$ language 'plpgsql';

-- Función para crear notificación cuando se crea una reserva
CREATE OR REPLACE FUNCTION crear_notificacion_reserva()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notificaciones (
        tipo,
        titulo,
        mensaje,
        usuario_id,
        relacion_id,
        relacion_tipo,
        estado,
        accion_requerida
    )
    SELECT 
        'reserva',
        'Nueva Reserva de Espacio',
        'El residente ' || u.nombre || ' (Apto ' || COALESCE(u.numeroApartamento, 'N/A') || ') ha realizado una reserva del espacio: ' || e.nombre,
        NULL, -- Notificación para admin (usuario_id NULL)
        NEW.id,
        'reserva_espacio',
        'pendiente',
        TRUE
    FROM usuarios u
    JOIN espacios_comunes e ON e.id = NEW.espacio_id
    WHERE u.id = NEW.usuario_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_notificacion_reserva ON reservas_espacios;
CREATE TRIGGER trigger_notificacion_reserva AFTER INSERT ON reservas_espacios
    FOR EACH ROW EXECUTE FUNCTION crear_notificacion_reserva();

-- Función para crear notificación cuando se crea un pago
CREATE OR REPLACE FUNCTION crear_notificacion_pago()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notificaciones (
        tipo,
        titulo,
        mensaje,
        usuario_id,
        relacion_id,
        relacion_tipo,
        estado,
        accion_requerida
    )
    SELECT 
        'pago',
        'Nuevo Pago Registrado',
        'El residente ' || u.nombre || ' (Apto ' || COALESCE(u.numeroApartamento, 'N/A') || ') ha registrado un pago de ' || NEW.monto || ' Bs.S por: ' || NEW.concepto,
        NULL, -- Notificación para admin
        NEW.id,
        'pago',
        'pendiente',
        TRUE
    FROM usuarios u
    WHERE u.id = NEW.usuario_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_notificacion_pago ON pagos;
CREATE TRIGGER trigger_notificacion_pago AFTER INSERT ON pagos
    FOR EACH ROW EXECUTE FUNCTION crear_notificacion_pago();

-- =====================================================
-- 5. VISTAS
-- =====================================================

-- Vista de libros con información completa
CREATE OR REPLACE VIEW vista_libros_completa AS
SELECT 
    l.id_libro,
    l.titulo,
    l.sinopsis,
    l.fecha_publicacion,
    l.url_portada,
    l.tipo,
    l.especialidad,
    l.categoria,
    COALESCE(
        (SELECT string_agg(a.nombre, ', ')
         FROM libros_autores la
         JOIN autor a ON la.autor_id = a.id
         WHERE la.libro_id = l.id_libro),
        'Desconocido'
    ) AS autores,
    COALESCE(lf.cantidad, 0) AS cantidad_disponible,
    lv.direccion_del_libro AS archivo_url
FROM Libros l
LEFT JOIN libros_fisicos lf ON l.id_libro = lf.libro_id
LEFT JOIN libros_virtuales lv ON l.id_libro = lv.libro_id;

-- Vista de pagos pendientes por usuario
CREATE OR REPLACE VIEW vista_pagos_pendientes AS
SELECT 
    u.id AS usuario_id,
    u.nombre,
    u.correo,
    u.numeroApartamento,
    COUNT(p.id) AS total_pagos_pendientes,
    SUM(p.monto - COALESCE(p.monto_pagado, 0)) AS monto_total_pendiente
FROM usuarios u
LEFT JOIN pagos p ON u.id = p.usuario_id 
    AND p.estado IN ('pendiente', 'vencido', 'parcial')
GROUP BY u.id, u.nombre, u.correo, u.numeroApartamento;

-- =====================================================
-- FIN DEL ESQUEMA
-- =====================================================

