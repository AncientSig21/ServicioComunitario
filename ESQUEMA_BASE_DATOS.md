# Esquema de Base de Datos - Sistema de Gestión Condominial

## 📋 Resumen

Este documento define la estructura completa de la base de datos para el sistema de gestión condominial "Ciudad Colonial", incluyendo todas las funcionalidades implementadas.

---

## 🗄️ Tablas Principales

### 1. **usuarios** - Gestión de Usuarios/Residentes

Almacena información de todos los usuarios del sistema (residentes, administradores).

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  contraseña VARCHAR(255) NOT NULL,
  escuela VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'Usuario', -- 'admin', 'Usuario', 'Administrador'
  estado VARCHAR(50) DEFAULT 'Activo', -- 'Activo', 'Moroso', 'Inactivo'
  uuid UUID,
  
  -- Información de contacto
  telefono VARCHAR(20),
  cedula VARCHAR(20) UNIQUE,
  
  -- Información de residencia
  numeroApartamento VARCHAR(10),
  tipoResidencia VARCHAR(50), -- 'Propietario', 'Inquilino', 'Arrendatario', 'Familiar del Propietario'
  
  -- Campos para Propietario
  fechaAdquisicion DATE,
  numeroEscritura VARCHAR(100),
  
  -- Campos para Inquilino/Arrendatario
  nombrePropietario VARCHAR(255),
  cedulaPropietario VARCHAR(20),
  telefonoPropietario VARCHAR(20),
  fechaInicioContrato DATE,
  fechaFinContrato DATE,
  
  -- Campos para Familiar del Propietario
  nombrePropietarioRelacionado VARCHAR(255),
  cedulaPropietarioRelacionado VARCHAR(20),
  parentesco VARCHAR(50), -- 'Cónyuge', 'Hijo', 'Padre', etc.
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_usuarios_cedula ON usuarios(cedula);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
```

---

### 2. **Libros** - Catálogo de Documentos/Libros

Almacena información de todos los documentos, libros, tesis y recursos disponibles.

```sql
CREATE TABLE Libros (
  id_libro SERIAL PRIMARY KEY,
  titulo VARCHAR(500) NOT NULL,
  sinopsis TEXT,
  fecha_publicacion DATE NOT NULL,
  url_portada VARCHAR(500),
  tipo VARCHAR(50), -- 'Físico', 'Virtual', 'Tesis', 'Fisico y Virtual'
  especialidad VARCHAR(255),
  categoria VARCHAR(100), -- Para filtros: 'anuncios', 'mantenimiento', 'reservas', 'pagos', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_libros_tipo ON Libros(tipo);
CREATE INDEX idx_libros_especialidad ON Libros(especialidad);
CREATE INDEX idx_libros_categoria ON Libros(categoria);
CREATE INDEX idx_libros_titulo ON Libros(titulo);
```

---

### 3. **autor** - Autores de Libros

Catálogo de autores.

```sql
CREATE TABLE autor (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_autor_nombre ON autor(nombre);
```

---

### 4. **libros_autores** - Relación Libros-Autores

Tabla de relación muchos a muchos entre libros y autores.

```sql
CREATE TABLE libros_autores (
  libro_id INTEGER NOT NULL REFERENCES Libros(id_libro) ON DELETE CASCADE,
  autor_id INTEGER NOT NULL REFERENCES autor(id) ON DELETE CASCADE,
  PRIMARY KEY (libro_id, autor_id)
);

CREATE INDEX idx_libros_autores_libro ON libros_autores(libro_id);
CREATE INDEX idx_libros_autores_autor ON libros_autores(autor_id);
```

---

### 5. **libros_fisicos** - Inventario de Libros Físicos

Control de stock de libros físicos.

```sql
CREATE TABLE libros_fisicos (
  id SERIAL PRIMARY KEY,
  libro_id INTEGER NOT NULL UNIQUE REFERENCES Libros(id_libro) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_libros_fisicos_libro ON libros_fisicos(libro_id);
```

---

### 6. **libros_virtuales** - Archivos Digitales

Almacena las rutas/URLs de los archivos PDF y documentos digitales.

```sql
CREATE TABLE libros_virtuales (
  id SERIAL PRIMARY KEY,
  libro_id INTEGER UNIQUE REFERENCES Libros(id_libro) ON DELETE CASCADE,
  direccion_del_libro VARCHAR(500) NOT NULL, -- Ruta en Supabase Storage o URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_libros_virtuales_libro ON libros_virtuales(libro_id);
```

---

### 7. **ordenes** - Sistema de Préstamos y Reservas

Gestiona todas las reservas y préstamos de libros físicos.

```sql
CREATE TABLE ordenes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  libro_id INTEGER NOT NULL REFERENCES Libros(id_libro) ON DELETE CASCADE,
  estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente de buscar', 
    -- 'Pendiente de buscar', 'Prestado', 'Devuelto', 'Moroso', 'Cancelado'
  fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega TIMESTAMP,
  fecha_devolucion TIMESTAMP,
  fecha_limite_busqueda TIMESTAMP, -- Fecha límite para buscar el libro
  fecha_limite_devolucion TIMESTAMP, -- Fecha límite para devolver
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ordenes_usuario ON ordenes(usuario_id);
CREATE INDEX idx_ordenes_libro ON ordenes(libro_id);
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_fecha_reserva ON ordenes(fecha_reserva);
```

---

### 8. **tesis** - Tesis y Proyectos de Investigación

Información específica de tesis.

```sql
CREATE TABLE tesis (
  id SERIAL PRIMARY KEY,
  libro_id INTEGER REFERENCES Libros(id_libro) ON DELETE CASCADE,
  tutor_id INTEGER NOT NULL REFERENCES tutor(id) ON DELETE RESTRICT,
  escuela VARCHAR(255),
  periodo_academico VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tesis_libro ON tesis(libro_id);
CREATE INDEX idx_tesis_tutor ON tesis(tutor_id);
```

---

### 9. **tutor** - Tutores de Tesis

Catálogo de tutores.

```sql
CREATE TABLE tutor (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tutor_nombre ON tutor(nombre);
```

---

### 10. **proyecto_investigacion** - Proyectos de Investigación

Información de proyectos de investigación.

```sql
CREATE TABLE proyecto_investigacion (
  id SERIAL PRIMARY KEY,
  libro_id INTEGER REFERENCES Libros(id_libro) ON DELETE CASCADE,
  tutor_id INTEGER NOT NULL REFERENCES tutor(id) ON DELETE RESTRICT,
  escuela VARCHAR(255) NOT NULL,
  periodo_academico VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proyecto_libro ON proyecto_investigacion(libro_id);
CREATE INDEX idx_proyecto_tutor ON proyecto_investigacion(tutor_id);
```

---

## 🆕 Tablas Nuevas para Funcionalidades del Condominio

### 11. **anuncios** - Anuncios y Noticias

Gestiona todos los anuncios, noticias y publicaciones del foro.

```sql
CREATE TABLE anuncios (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(500) NOT NULL,
  contenido TEXT NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'general',
    -- 'general', 'importante', 'mantenimiento', 'evento', 'foro'
  autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  autor_nombre VARCHAR(255), -- Nombre del autor (puede ser diferente del usuario)
  fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMP, -- Opcional: fecha de expiración del anuncio
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anuncios_categoria ON anuncios(categoria);
CREATE INDEX idx_anuncios_fecha ON anuncios(fecha_publicacion);
CREATE INDEX idx_anuncios_activo ON anuncios(activo);
CREATE INDEX idx_anuncios_autor ON anuncios(autor_id);
```

---

### 12. **solicitudes_mantenimiento** - Solicitudes de Mantenimiento

Gestiona las solicitudes de mantenimiento y reparaciones.

```sql
CREATE TABLE solicitudes_mantenimiento (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(500) NOT NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    -- 'pendiente', 'en-proceso', 'completado', 'cancelado'
  prioridad VARCHAR(50) NOT NULL DEFAULT 'media',
    -- 'baja', 'media', 'alta', 'urgente'
  ubicacion VARCHAR(255),
  responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  responsable_nombre VARCHAR(255), -- Nombre del responsable
  usuario_solicitante_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_inicio TIMESTAMP,
  fecha_completado TIMESTAMP,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mantenimiento_estado ON solicitudes_mantenimiento(estado);
CREATE INDEX idx_mantenimiento_prioridad ON solicitudes_mantenimiento(prioridad);
CREATE INDEX idx_mantenimiento_usuario ON solicitudes_mantenimiento(usuario_solicitante_id);
CREATE INDEX idx_mantenimiento_responsable ON solicitudes_mantenimiento(responsable_id);
CREATE INDEX idx_mantenimiento_fecha ON solicitudes_mantenimiento(fecha_solicitud);
```

---

### 13. **espacios_comunes** - Espacios Comunes del Condominio

Catálogo de espacios comunes disponibles para reserva.

```sql
CREATE TABLE espacios_comunes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  capacidad INTEGER,
  horarios TEXT, -- Ej: "Lunes a Viernes: 9:00 AM - 9:00 PM"
  equipamiento TEXT[], -- Array de equipamiento disponible
  estado VARCHAR(50) NOT NULL DEFAULT 'disponible',
    -- 'disponible', 'reservado', 'mantenimiento', 'cerrado'
  imagen_url VARCHAR(500),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_espacios_estado ON espacios_comunes(estado);
CREATE INDEX idx_espacios_activo ON espacios_comunes(activo);
```

---

### 14. **reservas_espacios** - Reservas de Espacios Comunes

Gestiona las reservas de espacios comunes.

```sql
CREATE TABLE reservas_espacios (
  id SERIAL PRIMARY KEY,
  espacio_id INTEGER NOT NULL REFERENCES espacios_comunes(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_reserva DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    -- 'pendiente', 'confirmada', 'en-uso', 'completada', 'cancelada'
  motivo TEXT,
  numero_personas INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Evitar reservas duplicadas en el mismo espacio y horario
  CONSTRAINT unique_reserva_espacio_horario UNIQUE (espacio_id, fecha_reserva, hora_inicio, hora_fin)
);

CREATE INDEX idx_reservas_espacio ON reservas_espacios(espacio_id);
CREATE INDEX idx_reservas_usuario ON reservas_espacios(usuario_id);
CREATE INDEX idx_reservas_fecha ON reservas_espacios(fecha_reserva);
CREATE INDEX idx_reservas_estado ON reservas_espacios(estado);
```

---

### 15. **pagos** - Sistema de Pagos y Cuotas

Gestiona todos los pagos, cuotas y facturación.

```sql
CREATE TABLE pagos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  concepto VARCHAR(500) NOT NULL,
  monto DECIMAL(10, 2) NOT NULL CHECK (monto >= 0),
  tipo VARCHAR(50) NOT NULL,
    -- 'mantenimiento', 'servicios', 'multa', 'otros'
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    -- 'pendiente', 'pagado', 'vencido', 'parcial'
  fecha_vencimiento DATE NOT NULL,
  fecha_pago TIMESTAMP,
  referencia VARCHAR(100), -- Número de referencia del pago
  metodo_pago VARCHAR(50), -- 'transferencia', 'efectivo', 'tarjeta', etc.
  monto_pagado DECIMAL(10, 2) DEFAULT 0, -- Para pagos parciales
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE INDEX idx_pagos_tipo ON pagos(tipo);
CREATE INDEX idx_pagos_fecha_vencimiento ON pagos(fecha_vencimiento);
CREATE INDEX idx_pagos_referencia ON pagos(referencia);
```

---

### 16. **historial_pagos** - Historial de Transacciones

Registro detallado de todas las transacciones de pago.

```sql
CREATE TABLE historial_pagos (
  id SERIAL PRIMARY KEY,
  pago_id INTEGER NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  monto DECIMAL(10, 2) NOT NULL,
  metodo_pago VARCHAR(50),
  referencia_transaccion VARCHAR(100),
  fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historial_pago ON historial_pagos(pago_id);
CREATE INDEX idx_historial_fecha ON historial_pagos(fecha_pago);
```

---

### 17. **notificaciones** - Sistema de Notificaciones

Gestiona todas las notificaciones del sistema, especialmente para reservas y pagos que requieren aprobación del administrador.

```sql
CREATE TABLE notificaciones (
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

CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_estado ON notificaciones(estado);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_fecha ON notificaciones(fecha_creacion);
CREATE INDEX idx_notificaciones_relacion ON notificaciones(relacion_id, relacion_tipo);
```

---

## 🔄 Triggers y Funciones

### Trigger para actualizar `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_libros_updated_at BEFORE UPDATE ON Libros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordenes_updated_at BEFORE UPDATE ON ordenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anuncios_updated_at BEFORE UPDATE ON anuncios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mantenimiento_updated_at BEFORE UPDATE ON solicitudes_mantenimiento
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas_espacios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Trigger para reducir stock al crear orden

```sql
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

CREATE TRIGGER trigger_reducir_stock AFTER INSERT ON ordenes
    FOR EACH ROW EXECUTE FUNCTION reducir_stock_libro();
```

### Trigger para aumentar stock al devolver libro

```sql
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

CREATE TRIGGER trigger_aumentar_stock AFTER UPDATE ON ordenes
    FOR EACH ROW EXECUTE FUNCTION aumentar_stock_libro();
```

### Trigger para actualizar estado de pago

```sql
CREATE OR REPLACE FUNCTION actualizar_estado_pago()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el monto pagado es igual o mayor al monto total, marcar como pagado
    IF NEW.monto_pagado >= NEW.monto THEN
        NEW.estado = 'pagado';
        IF NEW.fecha_pago IS NULL THEN
            NEW.fecha_pago = CURRENT_TIMESTAMP;
        END IF;
    -- Si el monto pagado es mayor a 0 pero menor al total, marcar como parcial
    ELSIF NEW.monto_pagado > 0 THEN
        NEW.estado = 'parcial';
    -- Si la fecha de vencimiento pasó y no está pagado, marcar como vencido
    ELSIF NEW.fecha_vencimiento < CURRENT_DATE AND NEW.estado != 'pagado' THEN
        NEW.estado = 'vencido';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_actualizar_estado_pago BEFORE UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION actualizar_estado_pago();
```

### Función para marcar usuarios morosos

```sql
CREATE OR REPLACE FUNCTION actualizar_usuarios_morosos()
RETURNS void AS $$
BEGIN
    -- Marcar como moroso si tiene pagos vencidos sin pagar
    UPDATE usuarios
    SET estado = 'Moroso'
    WHERE id IN (
        SELECT DISTINCT usuario_id
        FROM pagos
        WHERE estado IN ('vencido', 'pendiente')
        AND fecha_vencimiento < CURRENT_DATE
    )
    AND estado != 'Moroso';
    
    -- Marcar como activo si no tiene pagos vencidos
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
```

---

## 📊 Vistas Útiles

### Vista de libros con información completa

```sql
CREATE VIEW vista_libros_completa AS
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
```

### Vista de pagos pendientes por usuario

```sql
CREATE VIEW vista_pagos_pendientes AS
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
```

---

## 🔐 Políticas de Seguridad (RLS - Row Level Security)

### Habilitar RLS en tablas sensibles

```sql
-- Habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_espacios ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo pueden ver sus propios datos
CREATE POLICY "Usuarios ven solo sus datos" ON usuarios
    FOR SELECT USING (auth.uid()::text = id::text);

-- Política: Usuarios solo pueden ver sus propios pagos
CREATE POLICY "Usuarios ven solo sus pagos" ON pagos
    FOR SELECT USING (auth.uid()::text = usuario_id::text);

-- Política: Administradores pueden ver todo
CREATE POLICY "Admins ven todo" ON usuarios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id::text = auth.uid()::text 
            AND rol = 'admin'
        )
    );
```

---

## 📝 Notas Importantes

1. **Moneda**: Los montos en la tabla `pagos` están en **Bolívares Venezolanos (VES)**.

2. **Índices**: Se han creado índices en campos frecuentemente consultados para optimizar las consultas.

3. **Cascadas**: Las relaciones están configuradas con `ON DELETE CASCADE` donde tiene sentido (ej: eliminar un libro elimina sus reservas).

4. **Validaciones**: Se incluyen `CHECK` constraints para validar datos (ej: montos no negativos, cantidades no negativas).

5. **Timestamps**: Todas las tablas importantes tienen `created_at` y `updated_at` para auditoría.

6. **Estados**: Los estados están normalizados como strings para facilitar filtros y búsquedas.

---

## 🚀 Próximos Pasos

1. Ejecutar los scripts SQL en orden en Supabase
2. Configurar las políticas RLS según los requisitos de seguridad
3. Crear usuarios de prueba
4. Poblar las tablas con datos iniciales
5. Configurar los triggers y funciones
6. Probar todas las funcionalidades

---

## 📞 Soporte

Para cualquier duda sobre la estructura de la base de datos, consultar este documento o contactar al equipo de desarrollo.

