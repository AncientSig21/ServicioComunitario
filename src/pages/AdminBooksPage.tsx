import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase/client';
import { Pagination } from '../components/shared/Pagination';
import { AdminFilters } from '../components/shared/AdminFilters';
import { extractPDFMetadataSimple, detectDocumentType } from '../utils/pdfMetadataSimple';

interface Libro {
  id_libro: number;
  titulo: string;
  autor?: string;
  sinopsis: string;
  type?: string;
  tipo?: string;
  url_portada?: string;
  especialidad?: string;
  fecha_publicacion?: string;
  url_pdf?: string;
}

// Función para subir imagen a Supabase Storage y obtener la URL pública
async function uploadImageToSupabase(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage.from('fotos.portada').upload(fileName, file);
  if (error) {
    alert('Error al subir la imagen: ' + error.message);
    return null;
  }
  // Obtener la URL pública del mismo bucket donde se subió
  const { publicUrl } = supabase.storage.from('fotos.portada').getPublicUrl(fileName).data;
  return publicUrl || null;
}

// Función para subir PDF a Supabase Storage y obtener la URL pública
async function uploadPdfToSupabase(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage.from('libros').upload(fileName, file);
  if (error) {
    alert('Error al subir el PDF: ' + error.message);
    return null;
  }
  // Obtener la URL pública
  const { publicUrl } = supabase.storage.from('libros').getPublicUrl(fileName).data;
  return publicUrl || null;
}

const AdminBooksPage = () => {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [filteredLibros, setFilteredLibros] = useState<Libro[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editLibro, setEditLibro] = useState<Libro | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [selectedLibroId, setSelectedLibroId] = useState<number | null>(null);
  
  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<any>({});
  // Estado para los checkboxes de tipo
  const [tipoFisico, setTipoFisico] = useState(false);
  const [tipoVirtual, setTipoVirtual] = useState(false);
  const [tipoTesis, setTipoTesis] = useState(false);
  const [tipoProyecto, setTipoProyecto] = useState(false);
  // Estados adicionales para campos condicionales
  const [cantidadFisico, setCantidadFisico] = useState('');
  const [periodoTesis, setPeriodoTesis] = useState('');
  const [tutorTesis, setTutorTesis] = useState('');
  // Estado para la lista de tutores
  const [tutores, setTutores] = useState<{ id: number; nombre: string }[]>([]);
  // Estado para agregar tutor
  const [showAddTutor, setShowAddTutor] = useState(false);
  const [nuevoNombreTutor, setNuevoNombreTutor] = useState('');
  const [nuevoApellidoTutor, setNuevoApellidoTutor] = useState('');
  const [addTutorLoading, setAddTutorLoading] = useState(false);
  const [addTutorError, setAddTutorError] = useState<string | null>(null);
  
  // Estados para extracción automática de metadatos
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [metadataExtracted, setMetadataExtracted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Obtener lista de libros
  const fetchLibros = async () => {
    
    // Intentar diferentes combinaciones de campos (sin autor ya que no existe en la BD)
    const fieldCombinations = [
      'id_libro, titulo, sinopsis, fecha_publicacion, url_portada, tipo, especialidad, libros_virtuales:libros_virtuales(direccion_del_libro)',
      'id_libro, titulo, sinopsis, fecha_publicacion, url_portada, type, especialidad, libros_virtuales:libros_virtuales(direccion_del_libro)',
      'id_libro, titulo, sinopsis, fecha_publicacion, url_portada, tipo, libros_virtuales:libros_virtuales(direccion_del_libro)',
      'id_libro, titulo, sinopsis, fecha_publicacion, url_portada, type, libros_virtuales:libros_virtuales(direccion_del_libro)',
      'id_libro, titulo, sinopsis, fecha_publicacion, url_portada, libros_virtuales:libros_virtuales(direccion_del_libro)'
    ];
    
    let data = null;
    let error = null;
    
    
    for (const selectFields of fieldCombinations) {
      
      try {
        const result = await supabase
          .from('Libros')
          .select(selectFields);
        
        data = result.data;
        error = result.error;
        
        if (!error) {
          break;
        } else {
        }
      } catch (err) {
      }
    }
    
    if (error || !data) {
      setLibros([]);
    } else {
      
      // Asociar la URL del PDF si existe (el autor se maneja por separado ya que no existe en la BD)
      const librosConPdf = (data as any[]).map(libro => ({
        ...libro,
        autor: '', // Campo vacío ya que no existe en la BD
        url_pdf: libro.libros_virtuales && libro.libros_virtuales.length > 0 ? libro.libros_virtuales[0].direccion_del_libro : ''
      }));
      
      console.log('📚 Libros cargados desde BD:', librosConPdf);
      console.log('🔍 Especialidades únicas:', [...new Set(librosConPdf.map(l => l.especialidad))]);
      setLibros(librosConPdf);
    }
  };

  useEffect(() => {
    fetchLibros();
  }, []);

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let filtered = [...libros];

    // Aplicar búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(libro =>
        libro.titulo.toLowerCase().includes(query) ||
        libro.sinopsis.toLowerCase().includes(query) ||
        (libro.especialidad && libro.especialidad.toLowerCase().includes(query))
      );
    }

    // Aplicar filtros
    if (activeFilters.tipo && activeFilters.tipo !== '') {
      filtered = filtered.filter(libro => {
        // Verificar tanto 'type' como 'tipo' para compatibilidad
        const libroTipo = libro.type || libro.tipo;
        return libroTipo === activeFilters.tipo;
      });
    }

    if (activeFilters.especialidad && activeFilters.especialidad !== '') {
      console.log('🔍 Filtro de especialidad activo:', activeFilters.especialidad);
      console.log('📚 Libros antes del filtro:', filtered.length);
      filtered = filtered.filter(libro => {
        console.log(`📖 Libro "${libro.titulo}" - Especialidad: "${libro.especialidad}"`);
        const matches = libro.especialidad === activeFilters.especialidad;
        console.log(`✅ ¿Coincide? ${matches}`);
        return matches;
      });
      console.log('📚 Libros después del filtro:', filtered.length);
    }

    setFilteredLibros(filtered);
    setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
  }, [libros, searchQuery, activeFilters]);

  // Calcular libros para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLibros = filteredLibros.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLibros.length / itemsPerPage);

  useEffect(() => {
    // Cargar tutores al montar el componente
    const fetchTutores = async () => {
      const { data, error } = await supabase.from('tutor').select('id, nombre');
      if (!error && data) setTutores(data);
    };
    fetchTutores();
  }, []);

  // Agregar libro
  const handleAddLibro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const titulo = formData.get('titulo')?.toString().trim() || '';
    const fecha_publicacion = formData.get('fecha_publicacion')?.toString() || '';
    const sinopsis = formData.get('sinopsis')?.toString().trim() || '';
    const url_portada = formData.get('url_portada')?.toString().trim() || '';
    let tipo = '';
    if (tipoTesis) {
      tipo = 'Tesis';
    } else if (tipoProyecto) {
      tipo = 'Proyecto de Investigacion';
    } else if (tipoFisico && tipoVirtual) {
      tipo = 'Fisico y Virtual';
    } else if (tipoFisico) {
      tipo = 'Fisico';
    } else if (tipoVirtual) {
      tipo = 'Virtual';
    }
    const especialidad = formData.get('especialidad')?.toString().trim() || '';
    const pdfFile = formData.get('url_pdf') as File | null;
    let url_pdf = '';
    if (pdfFile && pdfFile.size > 0) {
      url_pdf = (await uploadPdfToSupabase(pdfFile)) || '';
    }
    if (!titulo || !fecha_publicacion || !sinopsis || !tipo || !especialidad) {
      setAddError('Completa todos los campos obligatorios');
      return;
    }
    // Guardar libro en 'Libros'
    const { error: errorLibro, data: dataLibro } = await supabase
      .from('Libros')
      .insert([{ titulo, sinopsis, fecha_publicacion, url_portada: url_portada || null, tipo, especialidad }])
      .select();
    if (errorLibro) {
      setAddError('Error al agregar libro: ' + (errorLibro.message || JSON.stringify(errorLibro)));
      return;
    }
    // Si hay PDF, guardar en 'libros_virtuales'
    if (url_pdf && dataLibro && dataLibro.length > 0) {
      const libro_id = dataLibro[0].id_libro;
      const { error: errorVirtual } = await supabase
        .from('libros_virtuales')
        .insert([{ libro_id, direccion_del_libro: url_pdf }]);
      if (errorVirtual) {
        setAddError('Libro guardado, pero error al guardar PDF en libros_virtuales: ' + (errorVirtual.message || JSON.stringify(errorVirtual)));
        return;
      }
    }
    // Después de insertar en 'Libros':
    if (tipoFisico && cantidadFisico && dataLibro && dataLibro.length > 0) {
      const libro_id = dataLibro[0].id_libro;
      await supabase.from('libros_fisicos').insert([{ libro_id, cantidad: parseInt(cantidadFisico, 10) }]);
    }
    if (tipoTesis && periodoTesis && tutorTesis && especialidad && dataLibro && dataLibro.length > 0) {
      const libro_id = dataLibro[0].id_libro;
      await supabase.from('tesis').insert([{ libro_id, periodo_academico: periodoTesis, tutor_id: Number(tutorTesis), escuela: especialidad }]);
    }
    if (tipoProyecto && periodoTesis && tutorTesis && especialidad && dataLibro && dataLibro.length > 0) {
      const libro_id = dataLibro[0].id_libro;
      await supabase.from('proyecto_investigacion').insert([{ libro_id, periodo_academico: periodoTesis, tutor_id: Number(tutorTesis), escuela: especialidad }]);
    }
    setShowForm(false);
    fetchLibros();
  };

  // Eliminar libro (solo si se confirma)
  const handleDeleteLibro = async (id_libro: number) => {
    setDeleteLoading(id_libro);
    const { error } = await supabase
      .from('Libros')
      .delete()
      .eq('id_libro', id_libro);
    if (!error) {
      fetchLibros();
    }
    setDeleteLoading(null);
    setConfirmDeleteId(null);
  };

  // Editar libro
  const handleEditLibro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditError(null);
    setEditLoading(true);
    if (!editLibro) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const titulo = formData.get('titulo')?.toString().trim() || '';
    const sinopsis = formData.get('sinopsis')?.toString().trim() || '';
    const url_portada = formData.get('url_portada')?.toString().trim() || '';
    // Obtener tipo desde los checkboxes
    let tipo = '';
    if (tipoFisico && tipoVirtual) {
      tipo = 'Fisico y Virtual';
    } else if (tipoFisico) {
      tipo = 'Fisico';
    } else if (tipoVirtual) {
      tipo = 'Virtual';
    }
    const especialidad = formData.get('especialidad')?.toString().trim() || '';
    const fecha_publicacion = formData.get('fecha_publicacion')?.toString() || '';
    
    // Manejar imagen de portada si se subió una nueva
    const imagenPortadaFile = formData.get('imagen_portada') as File | null;
    let nuevaUrlPortada = url_portada;
    if (imagenPortadaFile && imagenPortadaFile.size > 0) {
      nuevaUrlPortada = (await uploadImageToSupabase(imagenPortadaFile)) || url_portada;
    }
    
    if (!titulo || !sinopsis || !tipo || !especialidad || !fecha_publicacion) {
      setEditError('Completa todos los campos obligatorios');
      setEditLoading(false);
      return;
    }

    // Actualizar libro en 'Libros'
    let { error } = await supabase
      .from('Libros')
      .update({ titulo, sinopsis, url_portada: nuevaUrlPortada || null, tipo, especialidad, fecha_publicacion })
      .eq('id_libro', editLibro.id_libro);
    
    // Si da error por 'tipo', intenta con 'type'
    if (error && (error as any).message && (error as any).message.includes('tipo')) {
      ({ error } = await supabase
        .from('Libros')
        .update({ titulo, sinopsis, url_portada: nuevaUrlPortada || null, type: tipo, especialidad, fecha_publicacion })
        .eq('id_libro', editLibro.id_libro));
    }
    
    // Si da error por 'especialidad', omite ese campo
    if (error && (error as any).message && (error as any).message.includes('especialidad')) {
      ({ error } = await supabase
        .from('Libros')
        .update({ titulo, sinopsis, url_portada: nuevaUrlPortada || null, tipo, fecha_publicacion })
        .eq('id_libro', editLibro.id_libro));
    }

    if (error) {
      setEditError('Error al actualizar libro');
      setEditLoading(false);
      return;
    }

    // Manejar libros físicos
    if (tipoFisico && cantidadFisico) {
      // Verificar si ya existe un registro en libros_fisicos
      const { data: existingFisico } = await supabase
        .from('libros_fisicos')
        .select('id')
        .eq('libro_id', editLibro.id_libro)
        .single();

      if (existingFisico) {
        // Actualizar registro existente
        await supabase
          .from('libros_fisicos')
          .update({ cantidad: parseInt(cantidadFisico, 10) })
          .eq('libro_id', editLibro.id_libro);
      } else {
        // Insertar nuevo registro
        await supabase
          .from('libros_fisicos')
          .insert([{ libro_id: editLibro.id_libro, cantidad: parseInt(cantidadFisico, 10) }]);
      }
    } else {
      // Si no es físico, eliminar registro de libros_fisicos si existe
      await supabase
        .from('libros_fisicos')
        .delete()
        .eq('libro_id', editLibro.id_libro);
    }

    // Manejar tesis
    if (tipoTesis && periodoTesis && tutorTesis && especialidad) {
      // Verificar si ya existe un registro en tesis
      const { data: existingTesis } = await supabase
        .from('tesis')
        .select('id')
        .eq('libro_id', editLibro.id_libro)
        .single();

      if (existingTesis) {
        // Actualizar registro existente
        await supabase
          .from('tesis')
          .update({ 
            periodo_academico: periodoTesis, 
            tutor_id: Number(tutorTesis), 
            escuela: especialidad 
          })
          .eq('libro_id', editLibro.id_libro);
      } else {
        // Insertar nuevo registro
        await supabase
          .from('tesis')
          .insert([{ 
            libro_id: editLibro.id_libro, 
            periodo_academico: periodoTesis, 
            tutor_id: Number(tutorTesis), 
            escuela: especialidad 
          }]);
      }
    } else {
      // Si no es tesis, eliminar registro de tesis si existe
      await supabase
        .from('tesis')
        .delete()
        .eq('libro_id', editLibro.id_libro);
    }

    // Manejar proyecto de investigación
    if (tipoProyecto && periodoTesis && tutorTesis && especialidad) {
      // Verificar si ya existe un registro en proyecto_investigacion
      const { data: existingProyecto } = await supabase
        .from('proyecto_investigacion')
        .select('id')
        .eq('libro_id', editLibro.id_libro)
        .single();

      if (existingProyecto) {
        // Actualizar registro existente
        await supabase
          .from('proyecto_investigacion')
          .update({ 
            periodo_academico: periodoTesis, 
            tutor_id: Number(tutorTesis), 
            escuela: especialidad 
          })
          .eq('libro_id', editLibro.id_libro);
      } else {
        // Insertar nuevo registro
        await supabase
          .from('proyecto_investigacion')
          .insert([{ 
            libro_id: editLibro.id_libro, 
            periodo_academico: periodoTesis, 
            tutor_id: Number(tutorTesis), 
            escuela: especialidad 
          }]);
      }
    } else {
      // Si no es proyecto, eliminar registro de proyecto_investigacion si existe
      await supabase
        .from('proyecto_investigacion')
        .delete()
        .eq('libro_id', editLibro.id_libro);
    }

    // Subir PDF si se seleccionó uno nuevo
    const pdfFile = formData.get('url_pdf') as File | null;
    let url_pdf = '';
    if (pdfFile && pdfFile.size > 0) {
      url_pdf = (await uploadPdfToSupabase(pdfFile)) || '';
    }
    
    // Si se subió un nuevo PDF, actualizar o insertar en libros_virtuales
    if (url_pdf) {
      // Usar upsert para insertar o actualizar la relación en libros_virtuales
      await supabase
        .from('libros_virtuales')
        .upsert([
          { libro_id: editLibro.id_libro, direccion_del_libro: url_pdf }
        ], { onConflict: 'libro_id' });
    }

    setEditLibro(null);
    fetchLibros();
    setEditLoading(false);
  };

  // Función para extraer metadatos automáticamente del PDF
  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes('pdf')) return;

    setIsExtractingMetadata(true);
    setMetadataExtracted(false);
    setValidationError(null);

    try {
      // Extraer metadatos del PDF
      const metadata = await extractPDFMetadataSimple(file);
      
      // Obtener referencias a los campos del formulario
      const tituloInput = document.querySelector('input[name="titulo"]') as HTMLInputElement;
      
      // Pequeño delay para asegurar que el DOM esté listo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Llenar automáticamente los campos si están vacíos
      if (tituloInput && !tituloInput.value && metadata.title) {
        tituloInput.value = metadata.title;
      }
      
      // Verificar si hay error de validación
      if (metadata.validationError) {
        setValidationError(metadata.validationError);
        setMetadataExtracted(false);
        return;
      }
      
      // Detectar tipo de documento automáticamente
      const detectedType = detectDocumentType('', metadata);
      
      if (detectedType === 'Tesis') {
        setTipoTesis(true);
        setTipoProyecto(false);
        setTipoFisico(false);
        setTipoVirtual(false);
      } else if (detectedType === 'Proyecto de Investigacion') {
        setTipoProyecto(true);
        setTipoTesis(false);
        setTipoFisico(false);
        setTipoVirtual(false);
      } else {
        setTipoVirtual(true);
        setTipoFisico(false);
        setTipoTesis(false);
        setTipoProyecto(false);
      }
      
      setMetadataExtracted(true);
      
      // Mostrar notificación de éxito
      setTimeout(() => {
        setMetadataExtracted(false);
      }, 3000);
      
    } catch (error) {
      // Error silencioso para no mostrar en consola
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  // Hook y ref para cerrar con ESC
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editLibro) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditLibro(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editLibro]);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-center text-gray-800">
        Gestión de Libros
      </h1>
      <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 mb-6 lg:mb-8">
        <h2 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4 text-blue-600">Libros</h2>
        <p className="text-gray-600 mb-4 text-sm lg:text-base">Aquí podrás ver, agregar, editar y eliminar libros.</p>
        
        {/* Filtros y búsqueda */}
        <AdminFilters
          onSearch={setSearchQuery}
          onFilterChange={setActiveFilters}
          searchPlaceholder="Buscar por título, sinopsis o especialidad..."
          filterOptions={[
            {
              key: 'tipo',
              label: 'Tipo de libro',
              type: 'select',
              options: [
                { value: 'Fisico', label: 'Físico' },
                { value: 'Virtual', label: 'Virtual' },
                { value: 'Fisico y Virtual', label: 'Físico y Virtual' },
                { value: 'Tesis', label: 'Tesis' },
                { value: 'Proyecto de Investigacion', label: 'Proyecto de Investigación' },
              ]
            },
            {
              key: 'especialidad',
              label: 'Especialidad',
              type: 'select',
              options: [
                { value: 'Arquitectura', label: 'Arquitectura' },
                { value: 'Ingenieria Civil', label: 'Ingeniería Civil' },
                { value: 'Ingenieria en Mantenimiento Mecanico', label: 'Ingeniería en Mantenimiento Mecánico' },
                { value: 'Ingenieria Electronica', label: 'Ingeniería Electrónica' },
                { value: 'Ingenieria Industrial', label: 'Ingeniería Industrial' },
                { value: 'Ingenieria Electrica', label: 'Ingeniería Eléctrica' },
                { value: 'Ingenieria en Sistemas', label: 'Ingeniería en Sistemas' },
              ]
            }
          ]}
        />
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 items-center">
          <button
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto transition-colors text-sm sm:text-base font-medium"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancelar' : 'Agregar Libro'}
          </button>
        </div>
        {showForm && (
          <form onSubmit={handleAddLibro} className="mb-6 flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <input 
                type="text" 
                name="titulo" 
                required 
                placeholder="Título" 
                className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white flex-1 text-sm sm:text-base" 
              />
              <input 
                type="text" 
                name="autor" 
                required 
                placeholder="Autor" 
                className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white flex-1 text-sm sm:text-base" 
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <input 
                type="date" 
                name="fecha_publicacion" 
                required 
                placeholder="Fecha de publicación" 
                className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white flex-1 text-sm sm:text-base" 
              />
              <textarea 
                name="sinopsis" 
                required 
                placeholder="Sinopsis" 
                className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white resize-none min-h-[80px] flex-1 text-sm sm:text-base" 
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 items-center">
              <input 
                type="url" 
                name="url_portada" 
                placeholder="URL de la portada (opcional)" 
                className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white flex-1 text-sm sm:text-base" 
                id="input-url-portada" 
              />
              <label 
                htmlFor="file-portada" 
                className="cursor-pointer bg-blue-600 text-white rounded-lg px-3 sm:px-4 py-2 flex items-center justify-center hover:bg-blue-700 transition mt-2 sm:mt-0 text-sm sm:text-base font-medium"
              >
                <span className="text-lg sm:text-xl font-bold mr-1">+</span>
                Subir imagen
                <input 
                  type="file" 
                  id="file-portada" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Subir la imagen a Supabase Storage y obtener la URL pública
                    const url = await uploadImageToSupabase(file);
                    const input = document.getElementById('input-url-portada') as HTMLInputElement | null;
                    if (input && url) input.value = url;
                  }} 
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 items-center">
              <label className="block text-sm sm:text-base font-medium text-gray-700">Archivo PDF (opcional):</label>
              <div className="flex flex-col gap-2 flex-1">
                <input 
                  type="file" 
                  name="url_pdf" 
                  accept="application/pdf" 
                  onChange={handlePDFUpload}
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white text-sm sm:text-base" 
                />
                {isExtractingMetadata && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Extrayendo metadatos del PDF...
                  </div>
                )}
                {metadataExtracted && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    ¡Metadatos extraídos automáticamente!
                  </div>
                )}
                {validationError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {validationError}
                  </div>
                )}
              </div>
            </div>
            {/* Checkboxes para tipo de libro */}
            <div className="flex flex-col gap-2">
              <label className="font-medium text-sm sm:text-base text-gray-700">Tipo de libro:</label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input 
                    type="checkbox" 
                    checked={tipoFisico} 
                    onChange={e => setTipoFisico(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  /> 
                  Físico
                </label>
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input 
                    type="checkbox" 
                    checked={tipoVirtual} 
                    onChange={e => setTipoVirtual(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  /> 
                  Virtual
                </label>
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input 
                    type="checkbox" 
                    checked={tipoTesis} 
                    onChange={e => {
                      setTipoTesis(e.target.checked);
                      if (e.target.checked) setTipoProyecto(false);
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  /> 
                  Tesis
                </label>
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input 
                    type="checkbox" 
                    checked={tipoProyecto} 
                    onChange={e => {
                      setTipoProyecto(e.target.checked);
                      if (e.target.checked) setTipoTesis(false);
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  /> 
                  Proyecto de Investigación
                </label>
              </div>
            </div>
            {/* Campo condicional para cantidad si es Físico */}
            {tipoFisico && (
              <div className="flex flex-col gap-1">
                <label className="font-medium text-sm sm:text-base text-gray-700">Cantidad de libros físicos:</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cantidadFisico}
                  onChange={e => setCantidadFisico(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white text-sm sm:text-base"
                  placeholder="Cantidad de ejemplares físicos"
                />
              </div>
            )}
            {/* Campos condicionales para Tesis o Proyecto de Investigación */}
            {(tipoTesis || tipoProyecto) && (
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-sm sm:text-base text-gray-700">Período académico:</label>
                  <input
                    type="text"
                    required
                    value={periodoTesis}
                    onChange={e => setPeriodoTesis(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white text-sm sm:text-base"
                    placeholder="Ej: 2023-2024"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-sm sm:text-base text-gray-700">Tutor:</label>
                  <select
                    required
                    value={tutorTesis}
                    onChange={e => setTutorTesis(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white text-sm sm:text-base"
                  >
                    <option value="">Selecciona un tutor</option>
                    {tutores.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="mt-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium w-fit transition-colors"
                    onClick={() => setShowAddTutor(v => !v)}
                  >
                    {showAddTutor ? 'Cancelar' : 'Agregar tutor'}
                  </button>
                  {showAddTutor && (
                    <div className="flex flex-col gap-2 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        placeholder="Nombre del tutor"
                        value={nuevoNombreTutor}
                        onChange={e => setNuevoNombreTutor(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm sm:text-base"
                      />
                      <input
                        type="text"
                        placeholder="Apellido del tutor"
                        value={nuevoApellidoTutor}
                        onChange={e => setNuevoApellidoTutor(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm sm:text-base"
                      />
                      {addTutorError && <span className="text-red-500 text-xs">{addTutorError}</span>}
                      <button
                        type="button"
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs sm:text-sm font-medium transition-colors"
                        disabled={addTutorLoading}
                        onClick={async () => {
                          setAddTutorError(null);
                          if (!nuevoNombreTutor.trim() || !nuevoApellidoTutor.trim()) {
                            setAddTutorError('Nombre y apellido requeridos');
                            return;
                          }
                          setAddTutorLoading(true);
                          // Guardar tutor en la tabla 'tutor'
                          const nombreCompleto = `${nuevoNombreTutor.trim()} ${nuevoApellidoTutor.trim()}`;
                          const { data, error } = await supabase.from('tutor').insert([{ nombre: nombreCompleto }]).select();
                          if (error) {
                            setAddTutorError('Error al agregar tutor');
                            setAddTutorLoading(false);
                            return;
                          }
                          if (data && data.length > 0) {
                            setTutores(prev => [...prev, { id: data[0].id, nombre: nombreCompleto }]);
                            setTutorTesis(data[0].id.toString());
                            setShowAddTutor(false);
                            setNuevoNombreTutor('');
                            setNuevoApellidoTutor('');
                          }
                          setAddTutorLoading(false);
                        }}
                      >
                        Guardar tutor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Reemplazar input de especialidad por un select */}
            <select 
              name="especialidad" 
              required 
              className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white w-full text-sm sm:text-base" 
            >
              <option value="">Selecciona una especialidad</option>
              <option value="Arquitectura">Arquitectura</option>
              <option value="Ingenieria Civil">Ingenieria Civil</option>
              <option value="Ingenieria en Mantenimiento Mecanico">Ingenieria en Mantenimiento Mecanico</option>
              <option value="Ingenieria Electronica">Ingenieria Electronica</option>
              <option value="Ingenieria Industrial">Ingenieria Industrial</option>
              <option value="Ingenieria Electrica">Ingenieria Electrica</option>
              <option value="Ingenieria en Sistemas">Ingenieria en Sistemas</option>
            </select>
            {addError && <p className="text-red-500 text-sm sm:text-base p-2 bg-red-50 rounded-lg">{addError}</p>}
            <button 
              type="submit" 
              className="bg-blue-600 text-white rounded-lg px-4 py-2 mt-2 hover:bg-blue-700 transition w-full sm:w-auto text-sm sm:text-base font-medium"
            >
              Guardar Libro
            </button>
          </form>
        )}
        {/* Cuadros de libros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {currentLibros.map((libro) => (
            <div
              key={libro.id_libro}
              className="bg-gray-100 rounded-lg shadow-md p-3 lg:p-4 flex flex-col items-center min-h-[180px] lg:min-h-[200px] justify-center cursor-pointer transition-all hover:shadow-lg hover:bg-blue-50"
              onClick={() => setSelectedLibroId(libro.id_libro)}
            >
              {libro.url_portada && (
                <img
                  src={libro.url_portada}
                  alt={libro.titulo}
                  className="w-16 h-20 lg:w-20 lg:h-24 object-cover rounded mb-2 lg:mb-3"
                />
              )}
              <strong className="text-sm lg:text-base mb-1 truncate w-full text-center text-gray-800" title={libro.titulo}>
                {libro.titulo}
              </strong>
              {/* Autor temporalmente oculto hasta que se agregue a la BD
              {libro.autor && (
                <p className="text-xs lg:text-sm text-gray-600 mb-2 truncate w-full text-center" title={libro.autor}>
                  {libro.autor}
                </p>
              )}
              */}
              {selectedLibroId === libro.id_libro && (
                <div className="flex gap-1 lg:gap-2 mt-2 lg:mt-3">
                  <button
                    className="px-2 lg:px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs lg:text-sm transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      setEditLibro(libro);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="px-2 lg:px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs lg:text-sm transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      setConfirmDeleteId(libro.id_libro);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Paginación */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredLibros.length}
          itemsPerPage={itemsPerPage}
        />
        {/* Modal de confirmación de eliminación */}
        {confirmDeleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-3 sm:p-4">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-xs sm:max-w-sm w-full text-center">
              <p className="mb-4 text-sm sm:text-base text-gray-700">¿Estás seguro de que deseas eliminar este libro?</p>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                <button
                  className="px-3 sm:px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 w-full sm:w-auto text-sm sm:text-base transition-colors"
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={deleteLoading !== null}
                >
                  Cancelar
                </button>
                <button
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 w-full sm:w-auto text-sm sm:text-base transition-colors"
                  onClick={() => handleDeleteLibro(confirmDeleteId)}
                  disabled={deleteLoading !== null}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de edición */}
        {editLibro && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-3 sm:p-4"
            onClick={e => {
              // Si el usuario hace clic en el fondo, cerrar el modal
              if (e.target === e.currentTarget) setEditLibro(null);
            }}
          >
            <div
              ref={modalRef}
              className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-md sm:max-w-lg w-full text-center max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()} // Evita que el clic dentro del modal cierre el modal
            >
              <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-800">Editar libro</h3>
              <form onSubmit={handleEditLibro} className="flex flex-col gap-3 sm:gap-4 text-left" encType="multipart/form-data">
                <label className="font-medium text-sm sm:text-base text-gray-700">Título:</label>
                <input 
                  type="text" 
                  name="titulo" 
                  defaultValue={editLibro.titulo} 
                  required 
                  placeholder="Título" 
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition" 
                />
                {/* Campo autor temporalmente deshabilitado hasta que se agregue a la BD
                <label className="font-medium text-sm sm:text-base text-gray-700">Autor:</label>
                <input 
                  type="text" 
                  name="autor" 
                  defaultValue={editLibro.autor || ''} 
                  placeholder="Autor del libro" 
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition" 
                />
                */}
                <label className="font-medium text-sm sm:text-base text-gray-700">Sinopsis:</label>
                <textarea 
                  name="sinopsis" 
                  defaultValue={editLibro.sinopsis} 
                  required 
                  placeholder="Sinopsis" 
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 resize-none min-h-[80px] w-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition" 
                />
                <label className="font-medium text-sm sm:text-base text-gray-700">URL de la portada (opcional):</label>
                <input 
                  type="url" 
                  name="url_portada" 
                  defaultValue={editLibro.url_portada || ''} 
                  placeholder="URL de la portada (opcional)" 
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition" 
                />
                <label className="font-medium text-sm sm:text-base text-gray-700">Imagen de portada (opcional):</label>
                <input 
                  type="file" 
                  name="imagen_portada" 
                  accept="image/*" 
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition" 
                />
                <p className="text-xs text-gray-500">Formatos: JPG, PNG, GIF. Máximo 5MB.</p>
                <label className="font-medium text-sm sm:text-base text-gray-700">Fecha de publicación:</label>
                <input 
                  type="date" 
                  name="fecha_publicacion" 
                  defaultValue={editLibro.fecha_publicacion ? editLibro.fecha_publicacion.substring(0, 10) : ''} 
                  required 
                  placeholder="Fecha de publicación" 
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition" 
                />
                <label className="font-medium text-sm sm:text-base text-gray-700">Archivo PDF (opcional):</label>
                <input 
                  type="file" 
                  name="url_pdf" 
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip" 
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition" 
                />
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-sm sm:text-base text-gray-700">Tipo de libro:</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-sm sm:text-base">
                      <input
                        type="checkbox"
                        checked={tipoFisico}
                        onChange={e => setTipoFisico(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      /> Físico
                    </label>
                    <label className="flex items-center gap-2 text-sm sm:text-base">
                      <input
                        type="checkbox"
                        checked={tipoVirtual}
                        onChange={e => setTipoVirtual(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      /> Virtual
                    </label>
                  </div>
                </div>
                {tipoFisico && (
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-sm sm:text-base text-gray-700">Cantidad de libros físicos:</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={cantidadFisico}
                      onChange={e => setCantidadFisico(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white text-sm sm:text-base"
                      placeholder="Cantidad de ejemplares físicos"
                    />
                  </div>
                )}
                {/* Campos condicionales para Tesis o Proyecto de Investigación */}
                {(tipoTesis || tipoProyecto) && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-medium">Período académico:</label>
                      <input
                        type="text"
                        required
                        value={periodoTesis}
                        onChange={e => setPeriodoTesis(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition bg-white"
                        placeholder="Ej: 2023-2024"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium">Tutor:</label>
                      <select
                        required
                        value={tutorTesis}
                        onChange={e => setTutorTesis(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition bg-white"
                      >
                        <option value="">Selecciona un tutor</option>
                        {tutores.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="mt-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs font-medium w-fit"
                        onClick={() => setShowAddTutor(v => !v)}
                      >
                        {showAddTutor ? 'Cancelar' : 'Agregar tutor'}
                      </button>
                      {showAddTutor && (
                        <div className="flex flex-col gap-2 mt-2 bg-gray-50 p-3 rounded border border-gray-200">
                          <input
                            type="text"
                            placeholder="Nombre del tutor"
                            value={nuevoNombreTutor}
                            onChange={e => setNuevoNombreTutor(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1"
                          />
                          <input
                            type="text"
                            placeholder="Apellido del tutor"
                            value={nuevoApellidoTutor}
                            onChange={e => setNuevoApellidoTutor(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1"
                          />
                          {addTutorError && <span className="text-red-500 text-xs">{addTutorError}</span>}
                          <button
                            type="button"
                            className="bg-cyan-600 text-white px-3 py-1 rounded hover:bg-cyan-700 text-xs font-medium"
                            disabled={addTutorLoading}
                            onClick={async () => {
                              setAddTutorError(null);
                              if (!nuevoNombreTutor.trim() || !nuevoApellidoTutor.trim()) {
                                setAddTutorError('Nombre y apellido requeridos');
                                return;
                              }
                              setAddTutorLoading(true);
                              // Guardar tutor en la tabla 'tutor'
                              const nombreCompleto = `${nuevoNombreTutor.trim()} ${nuevoApellidoTutor.trim()}`;
                              const { data, error } = await supabase.from('tutor').insert([{ nombre: nombreCompleto }]).select();
                              if (error) {
                                setAddTutorError('Error al agregar tutor');
                                setAddTutorLoading(false);
                                return;
                              }
                              if (data && data.length > 0) {
                                setTutores(prev => [...prev, { id: data[0].id, nombre: nombreCompleto }]);
                                setTutorTesis(data[0].id.toString());
                                setShowAddTutor(false);
                                setNuevoNombreTutor('');
                                setNuevoApellidoTutor('');
                              }
                              setAddTutorLoading(false);
                            }}
                          >
                            Guardar tutor
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Reemplazar input de especialidad por un select */}
                <label className="font-medium text-sm sm:text-base text-gray-700">Especialidad:</label>
                <select 
                  name="especialidad" 
                  required 
                  className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white w-full text-sm sm:text-base"
                >
                  <option value="">Selecciona una especialidad</option>
                  <option value="Arquitectura">Arquitectura</option>
                  <option value="Ingenieria Civil">Ingenieria Civil</option>
                  <option value="Ingenieria en Mantenimiento Mecanico">Ingenieria en Mantenimiento Mecanico</option>
                  <option value="Ingenieria Electronica">Ingenieria Electronica</option>
                  <option value="Ingenieria Industrial">Ingenieria Industrial</option>
                  <option value="Ingenieria Electrica">Ingenieria Electrica</option>
                  <option value="Ingenieria en Sistemas">Ingenieria en Sistemas</option>
                </select>
                {editError && <p className="text-red-500 text-sm sm:text-base p-2 bg-red-50 rounded-lg">{editError}</p>}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end mt-2">
                  <button 
                    type="button" 
                    onClick={() => setEditLibro(null)} 
                    className="px-3 sm:px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 w-full sm:w-auto text-sm sm:text-base transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white rounded-lg px-3 sm:px-4 py-2 hover:bg-blue-700 transition w-full sm:w-auto text-sm sm:text-base font-medium" 
                    disabled={editLoading}
                  >
                    {editLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBooksPage; 