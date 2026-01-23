
// Auto-generated script to load test data into browser localStorage
(function() {
  const MOCK_DB_KEY = 'mockDatabase_condominio';
  const FORUM_STORAGE_KEY = 'forum_topics_ciudad_colonial';
  
  // Load event data
  const eventData = {
  "anuncios": [
    {
      "id": 1,
      "titulo": "🎉 Fiesta de Bienvenida - Presentación del Sistema",
      "contenido": "¡Hola vecinos! \n\nEstamos organizando una fiesta de bienvenida para presentar el nuevo sistema de gestión comunitaria.\n\n📅 Fecha: jueves, 22 de enero de 2026\n🕐 Hora: 6:00 PM\n📍 Lugar: Salón de Eventos del Condominio\n\nActividades:\n- Presentación del sistema web\n- Refrigerios\n- Música en vivo\n- Actividades para niños\n\n¡Esperamos contar con tu presencia!\n\nEste evento fue creado automáticamente por el script de pruebas del sistema.",
      "fecha": "2026-01-22",
      "categoria": "evento",
      "autor": "Pendiente de aprobación",
      "estado": "pendiente",
      "usuario_id": 999,
      "usuario_nombre": "Usuario de Prueba"
    }
  ]
};
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(eventData));
  console.log('✓ Event data loaded into localStorage');
  
  // Load forum data
  const forumData = {
  "topics": [
    {
      "id": 1,
      "categoryId": "comunidad",
      "title": "🎊 Presentación del Nuevo Sistema de Gestión",
      "content": "¡Hola a todos los residentes de Ciudad Colonial!\n\nMe complace anunciar que hemos implementado un nuevo sistema de gestión comunitaria que facilitará la comunicación y administración de nuestro condominio.\n\n**Características principales:**\n- 📢 Anuncios y noticias en tiempo real\n- 💬 Foro comunitario para discusiones\n- 📅 Reserva de espacios comunes\n- 🔧 Solicitudes de mantenimiento\n- 💰 Gestión de pagos\n- 🎉 Creación y validación de eventos\n\nEste sistema ha sido probado y verificado para asegurar su correcto funcionamiento.\n\n¡Esperamos que todos lo disfruten!\n\nSaludos,\nEquipo de Administración",
      "author": "Usuario de Prueba",
      "createdAt": "2026-01-22T06:11:33.344Z"
    },
    {
      "id": 2,
      "categoryId": "profesionales-disponibles",
      "title": "🔧 Servicios de Mantenimiento Disponibles",
      "content": "Buenos días vecinos,\n\nMe presento: Soy Usuario de Prueba y ofrezco servicios de mantenimiento y reparaciones para el condominio.\n\n**Servicios que ofrezco:**\n- Reparación de electrodomésticos\n- Plomería básica\n- Electricidad\n- Pintura\n- Carpintería menor\n\n**Disponibilidad:**\n- Lunes a Viernes: 8:00 AM - 6:00 PM\n- Sábados: 9:00 AM - 2:00 PM\n\n**Contacto:**\n- Email: test@ciudadcolonial.com\n- Disponible a través del sistema de mensajería\n\nPrecios competitivos y trabajo garantizado.\n\n¡Estoy aquí para ayudar a la comunidad!",
      "author": "Usuario de Prueba",
      "createdAt": "2026-01-22T06:11:33.344Z"
    },
    {
      "id": 3,
      "categoryId": "mantenimiento",
      "title": "💡 Sugerencia: Mejoras en el Sistema de Iluminación",
      "content": "Hola comunidad,\n\nQuisiera proponer algunas mejoras en el sistema de iluminación de las áreas comunes:\n\n1. **Iluminación LED en pasillos:** Cambiar las bombillas actuales por LED para ahorro energético\n2. **Sensores de movimiento:** Instalar sensores en áreas poco transitadas\n3. **Iluminación exterior:** Mejorar la iluminación del estacionamiento\n\nEstas mejoras podrían:\n- Reducir costos de electricidad\n- Mejorar la seguridad\n- Ser más amigables con el ambiente\n\n¿Qué opinan? ¿Alguien más tiene sugerencias?\n\nSaludos",
      "author": "Usuario de Prueba",
      "createdAt": "2026-01-22T06:11:33.344Z"
    }
  ],
  "comments": [
    {
      "id": 1,
      "topicId": 1,
      "author": "Administración",
      "content": "¡Excelente iniciativa! El sistema está diseñado para facilitar la comunicación entre todos los residentes. Cualquier duda o sugerencia, no duden en contactarnos.",
      "createdAt": "2026-01-22T06:11:33.344Z"
    },
    {
      "id": 2,
      "topicId": 1,
      "author": "Residente Ejemplo",
      "content": "Me parece genial. Ya probé algunas funciones y todo funciona muy bien. ¡Felicitaciones al equipo!",
      "createdAt": "2026-01-22T06:11:33.344Z"
    },
    {
      "id": 3,
      "topicId": 3,
      "author": "Vecino Responsable",
      "content": "Excelente propuesta. Estoy de acuerdo con todas las sugerencias. ¿Podríamos calcular el ahorro estimado?",
      "createdAt": "2026-01-22T06:11:33.344Z"
    }
  ]
};
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
