-- =====================================================
-- SCRIPT PARA INSERTAR DATOS DE DEMOSTRACIÓN
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- =====================================================
-- 1. INSERTAR 3 ESPACIOS COMUNES
-- =====================================================

INSERT INTO espacios_comunes (condominio_id, nombre, descripcion, capacidad, ubicacion, activo, requiere_aprobacion, created_at, updated_at)
VALUES 
(
  1,
  'Salón de Eventos Principal',
  'Amplio salón multiusos para eventos, reuniones y celebraciones. Equipado con aire acondicionado, sistema de sonido y mobiliario para 50 personas.',
  50,
  'Planta Baja - Edificio A',
  true,
  true,
  NOW(),
  NOW()
),
(
  1,
  'Área de BBQ y Terraza',
  'Zona de parrillera con 2 asadores, mesas, sillas y vista panorámica. Ideal para reuniones familiares y celebraciones al aire libre.',
  25,
  'Terraza Piso 5',
  true,
  true,
  NOW(),
  NOW()
),
(
  1,
  'Sala de Reuniones',
  'Sala ejecutiva para reuniones de la junta de condominio o pequeñas reuniones de trabajo. Incluye proyector y pizarra.',
  15,
  'Planta Baja - Oficina Administrativa',
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. INSERTAR 3 EVENTOS/ANUNCIOS
-- =====================================================

-- Primero, obtener el ID del administrador (usuario con rol 'admin')
-- Asumimos que existe al menos un admin con id = 1

INSERT INTO anuncios (condominio_id, autor_usuario_id, titulo, contenido, categoria, fecha_publicacion, fecha_evento, lugar, activo, estado, created_at, updated_at)
VALUES 
(
  1,
  1,
  'Asamblea General de Propietarios - Marzo 2026',
  'Se convoca a todos los propietarios a la Asamblea General Ordinaria para tratar los siguientes puntos:

1. Lectura y aprobación del acta anterior
2. Informe financiero del período enero-febrero 2026
3. Presupuesto para mantenimiento de áreas comunes
4. Elección de nuevos miembros de la junta directiva
5. Proposiciones y varios

La asistencia es obligatoria. En caso de no poder asistir, favor enviar carta poder autenticada.

¡Su participación es importante para el bienestar de nuestra comunidad!',
  'reunion',
  NOW(),
  '2026-03-15 18:00:00',
  'Salón de Eventos Principal - Planta Baja',
  true,
  'aprobado',
  NOW(),
  NOW()
),
(
  1,
  1,
  'Jornada de Limpieza Comunitaria',
  'Invitamos a todos los residentes a participar en nuestra jornada de limpieza y embellecimiento de las áreas comunes.

Actividades programadas:
- Limpieza de jardines y áreas verdes
- Pintura de murales en el estacionamiento
- Mantenimiento de bancas y mobiliario exterior
- Siembra de plantas ornamentales

Se proporcionarán: guantes, bolsas, pinturas y herramientas.
Refrigerios incluidos para todos los participantes.

¡Juntos hacemos de Ciudad Colonial un mejor lugar para vivir!',
  'evento',
  NOW(),
  '2026-03-08 08:00:00',
  'Punto de encuentro: Entrada Principal',
  true,
  'aprobado',
  NOW(),
  NOW()
),
(
  1,
  1,
  'Torneo de Dominó - Residentes Ciudad Colonial',
  '¡Atención amantes del dominó!

Se abre la inscripción para el Primer Torneo de Dominó entre residentes de Ciudad Colonial.

Detalles del torneo:
- Modalidad: Parejas
- Inscripción: Gratuita (solo para residentes)
- Premios: Trofeos y reconocimientos
- Fecha límite de inscripción: 20 de marzo

Premiación:
🥇 1er lugar: Cena para 4 personas
🥈 2do lugar: Cena para 2 personas  
🥉 3er lugar: Reconocimiento especial

Inscríbase en la conserjería o con la administración.
¡Demuestre sus habilidades y comparta con sus vecinos!',
  'actividad',
  NOW(),
  '2026-03-22 15:00:00',
  'Área de BBQ - Terraza Piso 5',
  true,
  'aprobado',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver espacios insertados
SELECT id, nombre, ubicacion, capacidad, activo FROM espacios_comunes ORDER BY id DESC LIMIT 5;

-- Ver anuncios insertados
SELECT id, titulo, categoria, fecha_evento, estado FROM anuncios ORDER BY id DESC LIMIT 5;
