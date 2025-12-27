/**
 * Script interactivo para registrar usuarios
 * Permite ingresar datos desde la línea de comandos
 * 
 * Uso: node scripts/register-user-interactive.js
 */

import { supabase } from '../src/supabase/client.js';
import { registerResidente } from '../src/services/bookService.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(pregunta) {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      resolve(respuesta);
    });
  });
}

async function registrarUsuarioInteractivo() {
  try {
    console.log('\n📝 Registro de Usuario\n');
    console.log('Ingresa los siguientes datos:\n');
    
    const nombre = await pregunta('Nombre completo: ');
    const correo = await pregunta('Correo electrónico: ');
    const telefono = await pregunta('Teléfono (opcional): ') || null;
    const cedula = await pregunta('Cédula (opcional): ') || null;
    
    console.log('\nRoles disponibles: admin, propietario, residente, conserje, invitado');
    const rol = await pregunta('Rol: ');
    
    const contraseña = await pregunta('Contraseña: ');
    
    const tieneCondominio = await pregunta('¿Tiene condominio? (s/n): ');
    let condominio_id = null;
    if (tieneCondominio.toLowerCase() === 's') {
      const condominio = await pregunta('ID del condominio: ');
      condominio_id = condominio ? parseInt(condominio) : null;
    }
    
    const necesitaVivienda = await pregunta('¿Necesita asignar vivienda? (s/n): ');
    let vivienda_id = null;
    let rol_en_vivienda = null;
    
    if (necesitaVivienda.toLowerCase() === 's') {
      const numeroApartamento = await pregunta('Número de apartamento: ');
      
      // Buscar o crear vivienda
      let query = supabase
        .from('viviendas')
        .select('id')
        .eq('numero_apartamento', numeroApartamento);
      
      if (condominio_id) {
        query = query.eq('condominio_id', condominio_id);
      }
      
      const { data: vivienda, error: vError } = await query.single();
      
      if (vError || !vivienda) {
        if (condominio_id) {
          const { data: nuevaVivienda, error: createError } = await supabase
            .from('viviendas')
            .insert([{
              condominio_id,
              numero_apartamento: numeroApartamento,
              activo: true
            }])
            .select('id')
            .single();
          
          if (createError) throw createError;
          vivienda_id = nuevaVivienda.id;
          console.log(`✅ Vivienda creada: ${numeroApartamento} (ID: ${vivienda_id})`);
        } else {
          throw new Error('Se requiere condominio_id para crear vivienda');
        }
      } else {
        vivienda_id = vivienda.id;
        console.log(`📦 Vivienda encontrada: ${numeroApartamento} (ID: ${vivienda_id})`);
      }
      
      console.log('\nRoles en vivienda: propietario, inquilino, arrendatario, familiar');
      rol_en_vivienda = await pregunta('Rol en vivienda: ');
    }
    
    // Generar auth_uid
    const auth_uid = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    if (vivienda_id && rol_en_vivienda) {
      // Registrar como residente completo
      const usuario = await registerResidente({
        nombre,
        correo,
        telefono,
        cedula,
        rol: rol,
        contraseña,
        auth_uid,
        condominio_id,
        vivienda_id,
        rol_en_vivienda
      });
      
      console.log('\n✅ Residente registrado exitosamente!');
      console.log('ID:', usuario.id);
      console.log('Nombre:', usuario.nombre);
      console.log('Correo:', usuario.correo);
      console.log('Rol:', usuario.rol);
    } else {
      // Registrar como usuario simple
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .insert([{
          nombre,
          correo,
          telefono,
          cedula,
          rol: rol,
          contraseña,
          auth_uid,
          condominio_id
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('\n✅ Usuario registrado exitosamente!');
      console.log('ID:', usuario.id);
      console.log('Nombre:', usuario.nombre);
      console.log('Correo:', usuario.correo);
      console.log('Rol:', usuario.rol);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Ejecutar
registrarUsuarioInteractivo();





