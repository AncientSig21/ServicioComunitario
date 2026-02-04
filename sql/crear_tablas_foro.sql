-- =====================================================
-- TABLAS DEL FORO COMUNITARIO
-- Ejecutar en el SQL Editor de Supabase (o en tu cliente PostgreSQL).
-- Garantiza que los temas y comentarios se persistan y sean visibles para todos los usuarios.
-- =====================================================

-- Tabla: Temas del foro (conversaciones)
CREATE TABLE IF NOT EXISTS forum_temas (
  id SERIAL PRIMARY KEY,
  category_id VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE forum_temas IS 'Temas de conversación del foro comunitario. Visibles para todos los usuarios.';
COMMENT ON COLUMN forum_temas.category_id IS 'Id de categoría del foro: gestion-unidades, documentos, pagos, mantenimiento, reservas, comunidad, profesionales-disponibles, problemas-pagina';
COMMENT ON COLUMN forum_temas.author IS 'Nombre mostrado del autor (usuario o administrador)';
COMMENT ON COLUMN forum_temas.usuario_id IS 'Usuario que creó el tema (opcional, para auditoría)';

-- Tabla: Comentarios de cada tema
CREATE TABLE IF NOT EXISTS forum_comentarios (
  id SERIAL PRIMARY KEY,
  tema_id INTEGER NOT NULL REFERENCES forum_temas(id) ON DELETE CASCADE,
  author VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE forum_comentarios IS 'Comentarios/respuestas a los temas del foro.';
COMMENT ON COLUMN forum_comentarios.author IS 'Nombre mostrado del autor del comentario';

-- Índices para listar por categoría y por tema
CREATE INDEX IF NOT EXISTS idx_forum_temas_category ON forum_temas(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_temas_created_at ON forum_temas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_comentarios_tema ON forum_comentarios(tema_id);
CREATE INDEX IF NOT EXISTS idx_forum_comentarios_created_at ON forum_comentarios(created_at DESC);

-- =====================================================
-- OPCIONAL: Políticas RLS (Supabase)
-- Descomenta y ejecuta si usas Row Level Security en Supabase.
-- Ajusta get_current_user_id() e is_admin() si tu proyecto usa otros nombres.
-- =====================================================
/*
ALTER TABLE forum_temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comentarios ENABLE ROW LEVEL SECURITY;

-- Temas: todos los usuarios autenticados pueden ver y crear; solo autor o admin pueden actualizar/eliminar
CREATE POLICY "Todos ven temas del foro"
  ON forum_temas FOR SELECT
  USING (true);

CREATE POLICY "Usuarios y admin crean temas"
  ON forum_temas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Autor o admin editan/eliminan tema"
  ON forum_temas FOR ALL
  USING (
    usuario_id = get_current_user_id() OR
    is_admin(get_current_user_id())
  )
  WITH CHECK (
    usuario_id = get_current_user_id() OR
    is_admin(get_current_user_id())
  );

-- Comentarios: todos ven y crean; solo autor o admin pueden actualizar/eliminar
CREATE POLICY "Todos ven comentarios del foro"
  ON forum_comentarios FOR SELECT
  USING (true);

CREATE POLICY "Usuarios y admin crean comentarios"
  ON forum_comentarios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Autor o admin editan/eliminan comentario"
  ON forum_comentarios FOR ALL
  USING (
    usuario_id = get_current_user_id() OR
    is_admin(get_current_user_id())
  )
  WITH CHECK (
    usuario_id = get_current_user_id() OR
    is_admin(get_current_user_id())
  );
*/
