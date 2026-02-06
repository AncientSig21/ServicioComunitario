import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaBullhorn, FaMapMarkerAlt, FaImage, FaTimes, FaUser } from 'react-icons/fa';

interface Anuncio {
  id: number;
  titulo: string;
  contenido: string | null;
  categoria: string | null;
  fecha_publicacion: string | null;
  fecha_evento?: string | null;
  archivo_imagen_id?: number | null;
  imagen_url?: string | null; // URL base64 obtenida de la tabla archivos
  lugar?: string | null;
  autor?: {
    nombre: string;
  };
}

interface Props {
  maxItems?: number;
  autoPlayInterval?: number;
}

export const AnunciosCarousel = ({ maxItems = 5, autoPlayInterval = 6000 }: Props) => {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [modalAnuncio, setModalAnuncio] = useState<Anuncio | null>(null);

  // Cargar anuncios desde Supabase
  useEffect(() => {
    const cargarAnuncios = async () => {
      try {
        setLoading(true);
        console.log('🔍 Iniciando carga de anuncios...');
        
        // Consulta con join a usuarios y archivos para obtener la imagen
        let { data, error } = await supabase
          .from('anuncios')
          .select(`
            *,
            autor_usuario:usuarios!anuncios_autor_usuario_id_fkey(nombre),
            archivo_imagen:archivos!anuncios_archivo_imagen_id_fkey(url)
          `)
          .eq('activo', true)
          .order('fecha_publicacion', { ascending: false })
          .limit(maxItems);

        console.log('📊 Consulta con joins:', { data, error });

        // Si falla el join, intentar sin join de archivos
        if (error) {
          console.warn('⚠️ Fallo consulta con join, intentando sin join de archivos...');
          const result = await supabase
            .from('anuncios')
            .select(`
              *,
              autor_usuario:usuarios!anuncios_autor_usuario_id_fkey(nombre)
            `)
            .eq('activo', true)
            .order('fecha_publicacion', { ascending: false })
            .limit(maxItems);
          
          data = result.data;
          error = result.error;
          console.log('📊 Consulta sin join de archivos:', { data, error });
        }

        // Si aún falla, intentar consulta simple
        if (error) {
          console.warn('⚠️ Fallo consulta, intentando consulta simple...');
          const result = await supabase
            .from('anuncios')
            .select('*')
            .eq('activo', true)
            .order('fecha_publicacion', { ascending: false })
            .limit(maxItems);
          
          data = result.data;
          error = result.error;
          console.log('📊 Consulta simple:', { data, error });
        }

        if (error) {
          console.error('❌ Error final cargando anuncios:', error);
          setAnuncios([]);
        } else if (data && data.length > 0) {
          console.log('✅ Anuncios cargados exitosamente:', data.length, 'registros');
          // Mapear los datos
          const anunciosMapeados = data.map((a: any) => ({
            ...a,
            autor: a.autor_usuario ? { nombre: a.autor_usuario.nombre } : undefined,
            imagen_url: a.archivo_imagen?.url || a.imagen_url || null
          }));
          setAnuncios(anunciosMapeados);
        } else {
          console.log('📭 No se encontraron anuncios en la base de datos');
          setAnuncios([]);
        }
      } catch (err) {
        console.error('❌ Error en cargarAnuncios:', err);
        setAnuncios([]);
      } finally {
        setLoading(false);
      }
    };

    cargarAnuncios();
  }, [maxItems]);

  // Navegación
  const nextSlide = useCallback(() => {
    if (anuncios.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % anuncios.length);
  }, [anuncios.length]);

  const prevSlide = useCallback(() => {
    if (anuncios.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + anuncios.length) % anuncios.length);
  }, [anuncios.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || anuncios.length <= 1) {
      setProgress(0);
      return;
    }

    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const newProgress = (elapsed / autoPlayInterval) * 100;
      
      if (elapsed >= autoPlayInterval) {
        nextSlide();
        elapsed = 0;
        setProgress(0);
      } else {
        setProgress(newProgress);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide, autoPlayInterval, anuncios.length]);

  // Pausar auto-play al interactuar
  const handleUserInteraction = useCallback(() => {
    setIsAutoPlaying(false);
    setProgress(0);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  // Formatear fecha
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return null;
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obtener color por categoría
  const getCategoriaColor = (categoria: string | null) => {
    switch (categoria?.toLowerCase()) {
      case 'evento':
        return 'from-purple-600 to-indigo-600';
      case 'importante':
        return 'from-red-600 to-rose-600';
      case 'mantenimiento':
        return 'from-amber-600 to-orange-600';
      case 'foro':
        return 'from-teal-600 to-cyan-600';
      default:
        return 'from-blue-600 to-indigo-600';
    }
  };

  // Obtener badge de categoría
  const getCategoriaBadge = (categoria: string | null) => {
    switch (categoria?.toLowerCase()) {
      case 'evento':
        return { text: 'Evento', bg: 'bg-purple-100 text-purple-700' };
      case 'importante':
        return { text: 'Importante', bg: 'bg-red-100 text-red-700' };
      case 'mantenimiento':
        return { text: 'Mantenimiento', bg: 'bg-amber-100 text-amber-700' };
      case 'foro':
        return { text: 'Foro', bg: 'bg-teal-100 text-teal-700' };
      default:
        return { text: 'General', bg: 'bg-blue-100 text-blue-700' };
    }
  };

  // Truncar texto
  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24 lg:my-32">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-6 sm:mb-8 md:text-4xl lg:text-5xl text-gray-800">
          Anuncios y Eventos
        </h2>
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </section>
    );
  }

  // Estado vacío
  if (anuncios.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24 lg:my-32">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-6 sm:mb-8 md:text-4xl lg:text-5xl text-gray-800">
          Anuncios y Eventos
        </h2>
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl shadow-lg border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <FaBullhorn className="text-3xl text-blue-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
            No hay eventos próximos
          </h3>
          <p className="text-gray-600 mb-6">
            No hay anuncios ni eventos activos en Ciudad Colonial en este momento.
            ¡Mantente atento para futuras novedades!
          </p>
          <Link
            to="/anuncios"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Ver todos los anuncios
          </Link>
        </div>
      </section>
    );
  }

  const anuncioActual = anuncios[currentIndex];
  const categoriaBadge = getCategoriaBadge(anuncioActual.categoria);
  const tieneImagen = !!anuncioActual.imagen_url;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24 lg:my-32">
      <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-6 sm:mb-8 md:text-4xl lg:text-5xl text-gray-800">
        Anuncios y Eventos
      </h2>

      <div className="relative max-w-4xl mx-auto px-12 sm:px-16 lg:px-20">
        {/* Flechas de navegación */}
        {anuncios.length > 1 && (
          <>
            <button
              onClick={() => {
                prevSlide();
                handleUserInteraction();
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-110 border border-gray-200"
              aria-label="Anuncio anterior"
            >
              <FaChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={() => {
                nextSlide();
                handleUserInteraction();
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-110 border border-gray-200"
              aria-label="Siguiente anuncio"
            >
              <FaChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Contenedor del carrusel */}
        <div className="relative overflow-hidden rounded-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={anuncioActual.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="relative"
            >
              {/* Tarjeta del anuncio */}
              <div className={`relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br ${getCategoriaColor(anuncioActual.categoria)}`}>
                {/* Layout: con imagen = flex row, sin imagen = solo contenido */}
                <div className={`flex ${tieneImagen ? 'flex-col sm:flex-row' : ''}`}>
                  
                  {/* Contenido del anuncio */}
                  <div className={`p-6 sm:p-8 text-white ${tieneImagen ? 'sm:w-3/5 lg:w-2/3' : 'w-full'}`}>
                    {/* Badge de categoría */}
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm text-white">
                        <FaBullhorn className="w-3 h-3" />
                        {categoriaBadge.text}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className={`font-bold mb-4 leading-tight ${tieneImagen ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-2xl sm:text-3xl lg:text-4xl'}`}>
                      {anuncioActual.titulo}
                    </h3>

                    {/* Descripción */}
                    <p className="text-sm sm:text-base mb-6 leading-relaxed text-white/90">
                      {truncateText(anuncioActual.contenido, tieneImagen ? 150 : 250)}
                    </p>

                    {/* Metadatos */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      {(anuncioActual.fecha_evento || anuncioActual.fecha_publicacion) && (
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="w-4 h-4 text-white/70" />
                          <span className="text-sm sm:text-base text-white/80">
                            {formatFecha(anuncioActual.fecha_evento || anuncioActual.fecha_publicacion)}
                          </span>
                        </div>
                      )}

                      {anuncioActual.lugar && (
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="w-4 h-4 text-white/70" />
                          <span className="text-sm sm:text-base text-white/80">
                            {anuncioActual.lugar}
                          </span>
                        </div>
                      )}
                    </div>

                    {anuncioActual.autor?.nombre && (
                      <p className="mt-4 text-sm text-white/60">
                        Publicado por: {anuncioActual.autor.nombre}
                      </p>
                    )}
                  </div>

                  {/* Imagen dentro del recuadro - Solo si tiene imagen */}
                  {tieneImagen && (
                    <div 
                      className="sm:w-2/5 lg:w-1/3 relative cursor-pointer group"
                      onClick={() => setModalAnuncio(anuncioActual)}
                    >
                      {/* En móvil: imagen horizontal debajo */}
                      <div className="h-48 sm:h-full sm:min-h-[280px] relative">
                        <img
                          src={anuncioActual.imagen_url!}
                          alt={anuncioActual.titulo}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.parentElement!.style.display = 'none';
                          }}
                        />
                        {/* Overlay hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black/60 px-4 py-2 rounded-full flex items-center gap-2">
                            <FaImage className="w-4 h-4" />
                            Ver detalles
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicadores de página */}
        {anuncios.length > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            {anuncios.map((_, index) => (
              <div key={index} className="relative">
                <button
                  onClick={() => {
                    goToSlide(index);
                    handleUserInteraction();
                  }}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    currentIndex === index 
                      ? 'bg-blue-600 scale-110' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Ir al anuncio ${index + 1}`}
                />
                {currentIndex === index && isAutoPlaying && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.05, ease: 'linear' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {anuncios.length > 1 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {currentIndex + 1} de {anuncios.length}
          </p>
        )}

        {/* Botón "Ver más" */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex justify-center mt-8"
        >
          <Link
            to="/anuncios"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
          >
            Ver todos los anuncios
            <FaChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>

      {/* Modal para ver imagen y detalles */}
      <AnimatePresence>
        {modalAnuncio && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setModalAnuncio(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón cerrar */}
              <button
                onClick={() => setModalAnuncio(null)}
                className="absolute top-2 right-2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>

              {/* Imagen con object-cover */}
              {modalAnuncio.imagen_url && (
                <div className="w-full h-44 sm:h-52 bg-gray-200 flex-shrink-0">
                  <img
                    src={modalAnuncio.imagen_url}
                    alt={modalAnuncio.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Contenido con scroll */}
              <div className="p-4 overflow-y-auto flex-1">
                {/* Badge y título */}
                <div className="flex items-start gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getCategoriaBadge(modalAnuncio.categoria).bg}`}>
                    <FaBullhorn className="w-2.5 h-2.5" />
                    {getCategoriaBadge(modalAnuncio.categoria).text}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {modalAnuncio.titulo}
                </h3>

                {/* Información en formato compacto */}
                <div className="space-y-2 mb-3">
                  {(modalAnuncio.fecha_evento || modalAnuncio.fecha_publicacion) && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaCalendarAlt className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        {formatFecha(modalAnuncio.fecha_evento || modalAnuncio.fecha_publicacion)}
                      </span>
                    </div>
                  )}

                  {modalAnuncio.lugar && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaMapMarkerAlt className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-gray-700">{modalAnuncio.lugar}</span>
                    </div>
                  )}

                  {modalAnuncio.autor?.nombre && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaUser className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{modalAnuncio.autor.nombre}</span>
                    </div>
                  )}
                </div>

                {/* Descripción */}
                {modalAnuncio.contenido && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {modalAnuncio.contenido}
                    </p>
                  </div>
                )}

                {/* Botón cerrar */}
                <button
                  onClick={() => setModalAnuncio(null)}
                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default AnunciosCarousel;
