-- =====================================================
-- RPC para preguntas de seguridad (bypass RLS)
-- Permite a usuarios no autenticados obtener preguntas
-- y restablecer contraseña por correo.
-- =====================================================
-- Requiere: extensión pgcrypto (Supabase la tiene por defecto)
-- Ejecutar en el SQL Editor de Supabase.

-- Habilitar pgcrypto si no está (para digest SHA-256)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- RPC: Obtener preguntas de seguridad por correo
-- Devuelve solo nombre y preguntas_seguridad para ese correo.
-- SECURITY DEFINER = ejecuta con privilegios del dueño, ignora RLS.
-- =====================================================
CREATE OR REPLACE FUNCTION get_preguntas_seguridad_por_correo(p_correo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'nombre', u.nombre,
    'preguntas_seguridad', u.preguntas_seguridad
  ) INTO v_result
  FROM usuarios u
  WHERE u.correo = lower(trim(p_correo))
  LIMIT 1;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_preguntas_seguridad_por_correo(TEXT) IS
'Obtiene nombre y preguntas_seguridad de un usuario por correo. Uso: recuperación de contraseña. Bypass RLS.';

-- =====================================================
-- RPC: Restablecer contraseña con preguntas de seguridad
-- Valida respuestas (SHA-256, igual que el cliente) y actualiza contraseña.
-- p_respuestas: JSONB array [{"pregunta": "texto", "respuesta": "texto"}, ...]
-- =====================================================
CREATE OR REPLACE FUNCTION reset_password_con_preguntas(
  p_correo TEXT,
  p_nueva_contraseña TEXT,
  p_respuestas JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario RECORD;
  v_preguntas JSONB;
  v_item JSONB;
  v_respuesta_usuario TEXT;
  v_respuesta_hash TEXT;
  v_hash_calculado TEXT;
  v_match BOOLEAN;
  v_totales INT;
  v_correctas INT := 0;
BEGIN
  -- Obtener usuario (bypass RLS por SECURITY DEFINER)
  SELECT id, nombre, preguntas_seguridad
  INTO v_usuario
  FROM usuarios
  WHERE correo = lower(trim(p_correo))
  LIMIT 1;

  IF v_usuario.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  v_preguntas := v_usuario.preguntas_seguridad -> 'preguntas';
  IF v_preguntas IS NULL OR jsonb_array_length(v_preguntas) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay preguntas de seguridad configuradas');
  END IF;

  v_totales := jsonb_array_length(v_preguntas);

  -- Validar cada respuesta (mismo criterio que securityUtils: SHA-256 de respuesta normalizada)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_preguntas)
  LOOP
    v_respuesta_hash := v_item ->> 'respuesta_hash';
    SELECT r->>'respuesta' INTO v_respuesta_usuario
    FROM jsonb_array_elements(p_respuestas) AS r
    WHERE r->>'pregunta' = (v_item ->> 'pregunta')
    LIMIT 1;

    IF v_respuesta_usuario IS NOT NULL AND v_respuesta_hash IS NOT NULL THEN
      v_hash_calculado := encode(digest(lower(trim(v_respuesta_usuario)), 'sha256'), 'hex');
      IF v_hash_calculado = v_respuesta_hash THEN
        v_correctas := v_correctas + 1;
      END IF;
    END IF;
  END LOOP;

  IF v_correctas < v_totales THEN
    RETURN jsonb_build_object('success', false, 'error', 'Una o más respuestas son incorrectas.');
  END IF;

  -- Actualizar contraseña
  UPDATE usuarios
  SET contraseña = p_nueva_contraseña
  WHERE id = v_usuario.id;

  RETURN jsonb_build_object('success', true, 'nombre', v_usuario.nombre);
END;
$$;

COMMENT ON FUNCTION reset_password_con_preguntas(TEXT, TEXT, JSONB) IS
'Valida respuestas de seguridad (SHA-256) y actualiza contraseña. Uso: recuperación de contraseña. Bypass RLS.';
