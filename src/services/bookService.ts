import { supabase } from '../supabase/client';
import { getCurrentLocalISOString } from '../utils/dateUtils';
import mockDatabase from '../data/mockDatabase.json';
import { PreparedBook } from '../interfaces';

// Función para cargar datos desde el archivo JSON local
const fetchBooksFromMock = async (): Promise<PreparedBook[]> => {
  console.log('📄 Usando base de datos temporal (mockDatabase.json)');
  
  return mockDatabase.libros.map((book: any) => {
    const mappedBook: PreparedBook = {
      id: book.id_libro,
      title: book.titulo,
      authors: book.autores && book.autores.length > 0
        ? book.autores.join(', ')
        : 'Desconocido',
      author: book.autores && book.autores.length > 0
        ? book.autores[0]
        : 'Desconocido',
      slug: book.titulo.toLowerCase().replace(/\s+/g, '-'),
      features: [],
      description: { content: [{ type: 'paragraph', content: [{ type: 'text', text: book.sinopsis || '' }] }] },
      coverImage: book.url_portada,
      created_at: book.fecha_publicacion,
      price: 0,
      type: book.tipo,
      speciality: book.especialidad || '',
      fragment: '',
      fileUrl: book.fileUrl || '',
      sinopsis: book.sinopsis || '',
      cantidadDisponible: book.cantidadDisponible,
    };
    
    return mappedBook;
  });
};

export const fetchBooks = async () => {
  try {
    // Verificar que Supabase esté configurado
    const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
    const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
    
    if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
      console.warn('⚠️ Supabase no está configurado. Usando base de datos temporal.');
      return await fetchBooksFromMock();
    }

    // Primero, obtener todos los libros
    const { data: libros, error: librosError } = await supabase
      .from('Libros')
      .select(`
        id_libro, 
        titulo, 
        fecha_publicacion, 
        sinopsis, 
        url_portada, 
        tipo, 
        especialidad, 
        libros_autores(autor:autor_id(nombre)), 
        libros_fisicos(cantidad)
      `);

    if (librosError) {
      console.error('Error al obtener libros:', librosError);
      throw new Error('Error al cargar los documentos desde la base de datos');
    }

    // Luego, obtener todos los PDFs
    const { data: pdfs, error: pdfsError } = await supabase
      .from('libros_virtuales')
      .select('libro_id, direccion_del_libro');

    if (pdfsError) {
      console.error('Error al obtener PDFs:', pdfsError);
      // No lanzar error, continuar sin PDFs
    }

    // Crear un mapa de PDFs por libro_id
    const pdfsMap = new Map();
    if (pdfs) {
      pdfs.forEach(pdf => {
        pdfsMap.set(pdf.libro_id, pdf.direccion_del_libro);
      });
    }

    return (libros || []).map((book: any) => {
    // Buscar el PDF usando el mapa
    let fileUrl = '';
    
    const rawUrl = pdfsMap.get(book.id_libro);
    if (rawUrl) {
      // Si la URL ya es pública, usarla tal cual. Si es solo la ruta, construir la URL pública.
      if (rawUrl.startsWith('http')) {
        fileUrl = rawUrl;
      } else {
        // Construir la URL pública
        fileUrl = `https://ueufprdedokleqlyooyq.supabase.co/storage/v1/object/public/${rawUrl}`;
      }
    }
    // Obtener cantidad disponible de libros físicos (si aplica)
    let cantidadDisponible = undefined;
    
    if ((book.tipo === 'Físico' || book.tipo === 'Fisico' || book.tipo === 'Fisico y Virtual') && book.libros_fisicos && book.libros_fisicos.length > 0) {
      cantidadDisponible = book.libros_fisicos[0].cantidad;
    }
    const mappedBook = {
      id: book.id_libro,
      title: book.titulo,
      authors: book.libros_autores && book.libros_autores.length > 0
        ? book.libros_autores.map((a: any) => a.autor.nombre).join(', ')
        : 'Desconocido',
      author: book.libros_autores && book.libros_autores.length > 0
        ? book.libros_autores[0].autor.nombre
        : 'Desconocido',
      slug: book.titulo.toLowerCase().replace(/\s+/g, '-'),
      features: [],
      description: { content: [{ type: 'paragraph', content: [{ type: 'text', text: book.sinopsis || '' }] }] },
      coverImage: book.url_portada,
      created_at: book.fecha_publicacion,
      price: 0,
      type: book.tipo,
      speciality: book.especialidad || '',
      fragment: '',
      fileUrl,
      sinopsis: book.sinopsis || '',
      cantidadDisponible,
    };
    
    return mappedBook;
  });

  } catch (error) {
    console.error('Error en fetchBooks:', error);
    throw error;
  }
};

export const registerBookReservation = async ({ libro_id, usuario_id }: { libro_id: number, usuario_id: number }) => {
  try {
    // Verificar que Supabase esté configurado
    const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
    const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
    
    if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
      console.warn('⚠️ Supabase no está configurado. Simulando reserva en modo temporal.');
      
      // Simular verificación de usuario
      const usuario = mockDatabase.usuarios.find(u => u.id === usuario_id);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }
      
      if (usuario.estado === 'Moroso') {
        throw new Error('Usted se encuentra bloqueado por morosidad. No puede realizar reservas.');
      }
      
      // Simular verificación de stock
      const libro = mockDatabase.libros.find(l => l.id_libro === libro_id);
      if (!libro) {
        throw new Error('Documento no encontrado');
      }
      
      if (libro.cantidadDisponible <= 0) {
        throw new Error('No hay ejemplares disponibles en este momento');
      }
      
      // Simular verificación de órdenes existentes
      const ordenes: any[] = (mockDatabase as any).ordenes || [];
      const ordenesExistentes = ordenes.filter(
        (o: any) => o.usuario_id === usuario_id && 
             o.libro_id === libro_id && 
             ['Pendiente de buscar', 'Prestado', 'Moroso'].includes(o.estado)
      );
      
      if (ordenesExistentes.length > 0) {
        const ordenActiva = ordenesExistentes[0];
        throw new Error(`Ya tiene una orden activa para este documento (Estado: ${ordenActiva.estado}). Debe completar o cancelar la orden anterior antes de reservar nuevamente.`);
      }
      
      // Crear orden simulada
      const fechaReserva = getCurrentLocalISOString();
      const nuevaOrden = {
        id: ordenes.length + 1,
        libro_id,
        usuario_id,
        estado: 'Pendiente de buscar',
        fecha_reserva: fechaReserva,
        fecha_entrega: null,
        fecha_devolucion: null,
        fecha_limite_busqueda: null,
        fecha_limite_devolucion: null,
      };
      
      ordenes.push(nuevaOrden);
      (mockDatabase as any).ordenes = ordenes;
      
      // Reducir stock (simulado)
      libro.cantidadDisponible -= 1;
      
      console.log('✅ Reserva simulada creada:', nuevaOrden);
      return [nuevaOrden];
    }

    // 1. Verificar que el usuario no esté moroso
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('estado')
      .eq('id', usuario_id)
      .single();
      
    if (userError) {
      throw new Error('Error al verificar el estado del usuario');
    }
    
    if (usuario?.estado === 'Moroso') {
      throw new Error('Usted se encuentra bloqueado por morosidad. No puede realizar reservas.');
    }

    // 2. Verificar stock disponible
    const { data: libroFisico, error: stockError } = await supabase
      .from('libros_fisicos')
      .select('cantidad')
      .eq('libro_id', libro_id)
      .single();
      
    if (stockError) {
      throw new Error('Error al verificar disponibilidad del documento');
    }
    
    if (!libroFisico || libroFisico.cantidad <= 0) {
      throw new Error('No hay ejemplares disponibles en este momento');
    }

    // 3. Verificar que no tenga una orden activa para el mismo libro
    const { data: ordenesExistentes, error: ordenError } = await supabase
      .from('ordenes')
      .select('id, estado')
      .eq('usuario_id', usuario_id)
      .eq('libro_id', libro_id)
      .in('estado', ['Pendiente de buscar', 'Prestado', 'Moroso']);
      
    if (ordenError) {
      throw new Error('Error al verificar órdenes existentes');
    }
    
    if (ordenesExistentes && ordenesExistentes.length > 0) {
      const ordenActiva = ordenesExistentes[0];
        throw new Error(`Ya tiene una orden activa para este documento (Estado: ${ordenActiva.estado}). Debe completar o cancelar la orden anterior antes de reservar nuevamente.`);
    }

    // 4. Crear la orden (el trigger automáticamente reducirá el stock y establecerá fechas límite)
    const fechaReserva = getCurrentLocalISOString();
    const ordenObj = {
      libro_id,
      usuario_id,
      estado: 'Pendiente de buscar',
      fecha_reserva: fechaReserva,
      fecha_entrega: null,
      fecha_devolucion: null,
      fecha_limite_busqueda: null, // Se establecerá automáticamente con el trigger
      fecha_limite_devolucion: null,
    };
    
    const { data, error } = await supabase
      .from('ordenes')
      .insert(ordenObj);
    
    if (error) {
      throw new Error('Error al crear la orden de reserva');
    }
    
    return data;
    
  } catch (error) {
    throw error;
  }
};