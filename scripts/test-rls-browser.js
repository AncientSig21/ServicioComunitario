/**
 * Script Helper para Ejecutar Test RLS desde el Navegador
 * 
 * Este archivo contiene el código que debes pegar en la consola del navegador
 * para ejecutar las pruebas RLS.
 * 
 * INSTRUCCIONES:
 * 1. Abre tu aplicación en http://localhost:3000
 * 2. Inicia sesión con cualquier usuario
 * 3. Abre la consola del navegador (F12)
 * 4. Copia y pega el siguiente código:
 */

const testRLSFromConsole = async () => {
  console.log('🧪 Iniciando pruebas RLS desde la consola...\n');
  
  // Obtener usuario del localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    console.error('❌ No hay usuario autenticado. Inicia sesión primero.');
    return;
  }

  const user = JSON.parse(userStr);
  console.log('👤 Usuario detectado:', {
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
    condominio_id: user.condominio_id
  });

  // Importar dinámicamente el módulo (si está disponible)
  try {
    // Intentar usar la función si está disponible en window
    if (window.runRLSTests) {
      console.log('\n✅ Función runRLSTests encontrada. Ejecutando...\n');
      await window.runRLSTests();
    } else {
      console.log('\n⚠️ Función runRLSTests no está disponible.');
      console.log('Por favor, navega a http://localhost:3000/test-rls para usar la interfaz web.');
      console.log('O asegúrate de que la aplicación esté cargada completamente.');
    }
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error);
    console.log('\n💡 Alternativa: Ve a http://localhost:3000/test-rls para usar la interfaz web.');
  }
};

// Ejecutar automáticamente si se pega en la consola
testRLSFromConsole();




