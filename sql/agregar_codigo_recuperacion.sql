-- =====================================================
-- AGREGAR CÓDIGO DE RECUPERACIÓN DE CONTRASEÑA
-- =====================================================
-- El código se asigna al registrar por primera vez.
-- El usuario lo usa en "Olvidé mi contraseña" para restablecer la contraseña.
-- El administrador puede ver este código en la sección Residentes.
-- Ejecutar en el SQL Editor de Supabase.
-- =====================================================

-- Columna: código único por usuario, generado en el registro
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS codigo_recuperacion VARCHAR(20) UNIQUE DEFAULT NULL;

COMMENT ON COLUMN usuarios.codigo_recuperacion IS
'Código de recuperación de contraseña. Se genera al registrar; el usuario lo usa en "Olvidé mi contraseña". El administrador puede verlo en Residentes.';

-- Índice para búsqueda por código (opcional; UNIQUE ya crea índice)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_codigo_recuperacion ON usuarios(codigo_recuperacion) WHERE codigo_recuperacion IS NOT NULL;

-- =====================================================
-- RPC: Restablecer contraseña con código de recuperación
-- Permite a usuarios no autenticados restablecer contraseña
-- con correo + código (bypass RLS).
-- =====================================================
CREATE OR REPLACE FUNCTION reset_password_con_codigo(
  p_correo TEXT,
  p_codigo TEXT,
  p_nueva_contraseña TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario RECORD;
BEGIN
  SELECT id, nombre, codigo_recuperacion
  INTO v_usuario
  FROM usuarios
  WHERE correo = lower(trim(p_correo))
  LIMIT 1;

  IF v_usuario.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  IF v_usuario.codigo_recuperacion IS NULL OR trim(v_usuario.codigo_recuperacion) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este usuario no tiene código de recuperación. Contacte al administrador.');
  END IF;

  IF lower(trim(p_codigo)) <> lower(trim(v_usuario.codigo_recuperacion)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de recuperación incorrecto.');
  END IF;

  UPDATE usuarios
  SET contraseña = p_nueva_contraseña
  WHERE id = v_usuario.id;

  RETURN jsonb_build_object('success', true, 'nombre', v_usuario.nombre);
END;
$$;

COMMENT ON FUNCTION reset_password_con_codigo(TEXT, TEXT, TEXT) IS
'Restablece la contraseña usando correo y código de recuperación. Uso: Olvidé mi contraseña. Bypass RLS.';

-- Verificación columna
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'codigo_recuperacion';
