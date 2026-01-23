/**
 * Node.js Script to Create Test Data
 * This script creates test data and provides instructions to load it into the browser
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MOCK_DB_KEY = 'mockDatabase_condominio';
const FORUM_STORAGE_KEY = 'forum_topics_ciudad_colonial';

// Test user data
const testUser = {
  id: 999,
  nombre: 'Usuario de Prueba',
  correo: 'test@ciudadcolonial.com',
};

console.log('\n🚀 Starting Test Data Creation Script...\n');

// Step 1: Create Event
console.log('📅 Step 1: Creating Event...');

// Load existing data if it exists
let db = { anuncios: [] };
let forumData = { topics: [], comments: [] };

// Try to load existing data from localStorage backup files
const dbBackupPath = join(__dirname, `../test-data-${MOCK_DB_KEY}.json`);
const forumBackupPath = join(__dirname, `../test-data-${FORUM_STORAGE_KEY}.json`);

if (existsSync(dbBackupPath)) {
  try {
    const existing = JSON.parse(readFileSync(dbBackupPath, 'utf-8'));
    db = existing;
    console.log('   ✓ Loaded existing event data');
  } catch (e) {
    console.log('   ⚠ Could not load existing event data, starting fresh');
  }
}

if (existsSync(forumBackupPath)) {
  try {
    const existing = JSON.parse(readFileSync(forumBackupPath, 'utf-8'));
    forumData = existing;
    console.log('   ✓ Loaded existing forum data');
  } catch (e) {
    console.log('   ⚠ Could not load existing forum data, starting fresh');
  }
}

// Create new event
const newEvent = {
  id: db.anuncios.length > 0 
    ? Math.max(...db.anuncios.map((a) => a.id)) + 1 
    : 1,
  titulo: '🎉 Fiesta de Bienvenida - Presentación del Sistema',
  contenido: `¡Hola vecinos! 

Estamos organizando una fiesta de bienvenida para presentar el nuevo sistema de gestión comunitaria.

📅 Fecha: ${new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
🕐 Hora: 6:00 PM
📍 Lugar: Salón de Eventos del Condominio

Actividades:
- Presentación del sistema web
- Refrigerios
- Música en vivo
- Actividades para niños

¡Esperamos contar con tu presencia!

Este evento fue creado automáticamente por el script de pruebas del sistema.`,
  fecha: new Date().toISOString().split('T')[0],
  categoria: 'evento',
  autor: 'Pendiente de aprobación',
  estado: 'pendiente',
  usuario_id: testUser.id,
  usuario_nombre: testUser.nombre,
};

// Check if event already exists
const eventExists = db.anuncios.some(a => 
  a.categoria === 'evento' && 
  a.titulo === newEvent.titulo && 
  a.usuario_id === testUser.id
);

if (!eventExists) {
  db.anuncios.push(newEvent);
  console.log('   ✓ Event created successfully!');
  console.log(`     ID: ${newEvent.id}`);
  console.log(`     Title: ${newEvent.titulo}`);
  console.log(`     Status: ${newEvent.estado}`);
} else {
  console.log('   ⚠ Event already exists, skipping...');
}

// Step 2: Create Forum Topics
console.log('\n💬 Step 2: Creating Forum Topics and Comments...');

const topics = [
  {
    id: forumData.topics.length > 0 
      ? Math.max(...forumData.topics.map((t) => t.id)) + 1 
      : 1,
    categoryId: 'comunidad',
    title: '🎊 Presentación del Nuevo Sistema de Gestión',
    content: `¡Hola a todos los residentes de Ciudad Colonial!

Me complace anunciar que hemos implementado un nuevo sistema de gestión comunitaria que facilitará la comunicación y administración de nuestro condominio.

**Características principales:**
- 📢 Anuncios y noticias en tiempo real
- 💬 Foro comunitario para discusiones
- 📅 Reserva de espacios comunes
- 🔧 Solicitudes de mantenimiento
- 💰 Gestión de pagos
- 🎉 Creación y validación de eventos

Este sistema ha sido probado y verificado para asegurar su correcto funcionamiento.

¡Esperamos que todos lo disfruten!

Saludos,
Equipo de Administración`,
    author: testUser.nombre,
    createdAt: new Date().toISOString(),
  },
  {
    id: (forumData.topics.length > 0 
      ? Math.max(...forumData.topics.map((t) => t.id)) + 1 
      : 1) + 1,
    categoryId: 'profesionales-disponibles',
    title: '🔧 Servicios de Mantenimiento Disponibles',
    content: `Buenos días vecinos,

Me presento: Soy ${testUser.nombre} y ofrezco servicios de mantenimiento y reparaciones para el condominio.

**Servicios que ofrezco:**
- Reparación de electrodomésticos
- Plomería básica
- Electricidad
- Pintura
- Carpintería menor

**Disponibilidad:**
- Lunes a Viernes: 8:00 AM - 6:00 PM
- Sábados: 9:00 AM - 2:00 PM

**Contacto:**
- Email: ${testUser.correo}
- Disponible a través del sistema de mensajería

Precios competitivos y trabajo garantizado.

¡Estoy aquí para ayudar a la comunidad!`,
    author: testUser.nombre,
    createdAt: new Date().toISOString(),
  },
  {
    id: (forumData.topics.length > 0 
      ? Math.max(...forumData.topics.map((t) => t.id)) + 1 
      : 1) + 2,
    categoryId: 'mantenimiento',
    title: '💡 Sugerencia: Mejoras en el Sistema de Iluminación',
    content: `Hola comunidad,

Quisiera proponer algunas mejoras en el sistema de iluminación de las áreas comunes:

1. **Iluminación LED en pasillos:** Cambiar las bombillas actuales por LED para ahorro energético
2. **Sensores de movimiento:** Instalar sensores en áreas poco transitadas
3. **Iluminación exterior:** Mejorar la iluminación del estacionamiento

Estas mejoras podrían:
- Reducir costos de electricidad
- Mejorar la seguridad
- Ser más amigables con el ambiente

¿Qué opinan? ¿Alguien más tiene sugerencias?

Saludos`,
    author: testUser.nombre,
    createdAt: new Date().toISOString(),
  },
];

// Check which topics already exist
const existingTopicTitles = forumData.topics.map(t => t.title);
const newTopics = topics.filter(t => !existingTopicTitles.includes(t.title));

if (newTopics.length > 0) {
  forumData.topics.push(...newTopics);
  console.log(`   ✓ Created ${newTopics.length} new forum topics`);
} else {
  console.log('   ⚠ All topics already exist, skipping...');
}

// Create comments
const comments = [
  {
    id: forumData.comments.length > 0 
      ? Math.max(...forumData.comments.map((c) => c.id)) + 1 
      : 1,
    topicId: topics[0].id,
    author: 'Administración',
    content: `¡Excelente iniciativa! El sistema está diseñado para facilitar la comunicación entre todos los residentes. Cualquier duda o sugerencia, no duden en contactarnos.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: (forumData.comments.length > 0 
      ? Math.max(...forumData.comments.map((c) => c.id)) + 1 
      : 1) + 1,
    topicId: topics[0].id,
    author: 'Residente Ejemplo',
    content: `Me parece genial. Ya probé algunas funciones y todo funciona muy bien. ¡Felicitaciones al equipo!`,
    createdAt: new Date().toISOString(),
  },
  {
    id: (forumData.comments.length > 0 
      ? Math.max(...forumData.comments.map((c) => c.id)) + 1 
      : 1) + 2,
    topicId: topics[2].id,
    author: 'Vecino Responsable',
    content: `Excelente propuesta. Estoy de acuerdo con todas las sugerencias. ¿Podríamos calcular el ahorro estimado?`,
    createdAt: new Date().toISOString(),
  },
];

// Check which comments already exist
const existingCommentIds = forumData.comments.map(c => `${c.topicId}-${c.author}-${c.content.substring(0, 50)}`);
const newComments = comments.filter(c => {
  const key = `${c.topicId}-${c.author}-${c.content.substring(0, 50)}`;
  return !existingCommentIds.includes(key);
});

if (newComments.length > 0) {
  forumData.comments.push(...newComments);
  console.log(`   ✓ Created ${newComments.length} new forum comments`);
} else {
  console.log('   ⚠ All comments already exist, skipping...');
}

// Save to backup files
writeFileSync(dbBackupPath, JSON.stringify(db, null, 2), 'utf-8');
writeFileSync(forumBackupPath, JSON.stringify(forumData, null, 2), 'utf-8');

console.log('\n✅ Step 3: Generating Browser Script...');

// Generate JavaScript code to inject into browser
const browserScript = `
// Auto-generated script to load test data into browser localStorage
(function() {
  const MOCK_DB_KEY = '${MOCK_DB_KEY}';
  const FORUM_STORAGE_KEY = '${FORUM_STORAGE_KEY}';
  
  // Load event data
  const eventData = ${JSON.stringify(db, null, 2)};
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(eventData));
  console.log('✓ Event data loaded into localStorage');
  
  // Load forum data
  const forumData = ${JSON.stringify(forumData, null, 2)};
  localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(forumData));
  console.log('✓ Forum data loaded into localStorage');
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✓ Test data successfully loaded!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Next steps:');
  console.log('1. Refresh your application page');
  console.log('2. Go to Admin → Validación → Events tab');
  console.log('3. Go to Forum (Libros page)');
  console.log('');
  
  return {
    events: eventData.anuncios.filter(a => a.categoria === 'evento'),
    forumTopics: forumData.topics,
    forumComments: forumData.comments
  };
})();
`;

// Save browser script
const browserScriptPath = join(__dirname, '../load-test-data-to-browser.js');
writeFileSync(browserScriptPath, browserScript, 'utf-8');

console.log('   ✓ Browser script generated');

// Step 4: Display Summary
console.log('\n📊 Summary:');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Events created: ${db.anuncios.filter(a => a.categoria === 'evento' && a.usuario_id === testUser.id).length}`);
console.log(`Forum topics: ${forumData.topics.filter(t => t.author === testUser.nombre).length}`);
console.log(`Forum comments: ${forumData.comments.length}`);
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Next Steps:');
console.log('');
console.log('1. Open your application in the browser');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Copy and paste the contents of: load-test-data-to-browser.js');
console.log('5. Press Enter');
console.log('6. Refresh your application page');
console.log('');
console.log('OR');
console.log('');
console.log('1. Open: test-create-data.html in your browser');
console.log('2. Click "Run Test Script" button');
console.log('');
console.log('✅ Script execution completed!\n');




