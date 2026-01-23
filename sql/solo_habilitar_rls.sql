-- =====================================================
-- SOLO HABILITAR RLS (SIN POLÍTICAS)
-- ⚠️  ADVERTENCIA: Esto BLOQUEARÁ TODAS las consultas
-- =====================================================
-- 
-- Si ejecutas solo esto, NO podrás acceder a ningún dato
-- porque RLS estará activo pero NO habrá políticas que permitan acceso
--
-- NECESITAS ejecutar también: sql/rls_policies_supabase_auth.sql
-- para crear las políticas que definen QUÉ puede hacer cada usuario
--
-- =====================================================

-- Habilitar RLS en todas las tablas principales
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE viviendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_vivienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE espacios_comunes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_espacios ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_residencia ENABLE ROW LEVEL SECURITY;

-- ⚠️  DESPUÉS DE ESTO, TODAS LAS CONSULTAS SERÁN BLOQUEADAS
-- HASTA QUE CREES LAS POLÍTICAS CON: sql/rls_policies_supabase_auth.sql

