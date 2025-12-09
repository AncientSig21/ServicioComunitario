import { useEffect, useState } from 'react';
import { CardBook } from '../components/products/CardBook';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchBooks } from '../services/bookService';
import { ContainerFilter } from '../components/products/ContainerFilter';
import { Pagination } from '../components/shared/Pagination';
import { useAuth } from '../hooks/useAuth';
import { PDFViewer } from '../components/products/PDFViewer';
import { PreparedBook } from '../interfaces';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';

export const TesisPages = () => {
  const [books, setBooks] = useState<PreparedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpecialities, setSelectedSpecialities] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<PreparedBook | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<string[]>([]);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { isAuthenticated } = useAuth();

  // Lista fija de tipos de servicios para los filtros
  const specialitiesForFilter = [
    'Tesis',
    'Proyecto de Investigacion',
  ];

  // Lista de categorías de servicios para el filtro
  const especialidadesForFilter = [
    'Mantenimiento',
    'Seguridad',
    'Limpieza',
    'Administración',
    'Servicios Comunes',
    'Reservas',
    'Otros',
  ];

  // Función para normalizar textos (ignorar mayúsculas y tildes)
  function normalize(str: string) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Solo elimina tildes
      .trim();
  }

  // También elimina la opción 'Pasantía' y 'Pasantias' de los filtros de libros
  let filteredBooks = books.filter(
    book =>
      book.type === 'Tesis' ||
      book.type === 'Proyecto de Investigacion'
  );

  // Filtrar por tipo seleccionado (igual que BookPages pero usando type)
  if (selectedSpecialities.length > 0) {
    filteredBooks = filteredBooks.filter(book => {
      const result = selectedSpecialities.some(sel =>
        book.type && normalize(sel) === normalize(book.type)
      );
      return result;
    });
  }

  // Filtrar por especialidad seleccionada
  if (selectedEspecialidades.length > 0) {
    filteredBooks = filteredBooks.filter(book => {
      return selectedEspecialidades.some(sel =>
        book.speciality && normalize(sel) === normalize(book.speciality)
      );
    });
  }

  // Lógica de paginación
  const totalItems = filteredBooks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  // Resetear a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSpecialities, selectedEspecialidades]);



  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top cuando cambia de página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoading(true);
        const data = await fetchBooks();
        setBooks(data); // Mostrar todos los libros primero
      } catch (err: any) {
        setError('Error al cargar los servicios');
      } finally {
        setLoading(false);
      }
    };
    loadBooks();
  }, []);

  if (loading) {
    return <p className="text-center text-gray-500 text-lg my-8">Cargando servicios...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500 text-lg my-8">{error}</p>;
  }

  return (
    <div className="my-32">
      <BackToHome />
      <ScrollToTop />
      
      <h2 className="text-3xl font-semibold text-center mb-8 md:text-4xl lg:text-5xl text-primary">
        Servicios de Ciudad Colonial
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Caja de filtros */}
        <div className="col-span-2 lg:col-span-1 flex flex-col gap-3">
          <ContainerFilter
            selectedSpecialities={selectedSpecialities}
            onChange={setSelectedSpecialities}
            specialities={specialitiesForFilter}
            title="Tipos"
          />
          <ContainerFilter
            selectedSpecialities={selectedEspecialidades}
            onChange={setSelectedEspecialidades}
            specialities={especialidadesForFilter}
            title="Categorías"
          />
          <button
            onClick={() => {
              setSelectedSpecialities([]);
              setSelectedEspecialidades([]);
            }}
            className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors font-medium"
          >
            Limpiar
          </button>
        </div>
        <div className="col-span-2 lg:col-span-2 xl:col-span-4 flex flex-col gap-12">
          {filteredBooks.length === 0 ? (
            <div className="my-32">
              <p className="text-center text-gray-500 text-lg my-8">No hay servicios disponibles.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 gap-y-10 xl:grid-cols-4">
                {currentBooks.map(book => (
                  <CardBook
                    key={book.id}
                    title={book.title}
                    authors={book.authors}
                    price={book.price}
                    img={book.coverImage}
                    slug={book.slug}
                    speciality={book.speciality}
                    type={book.type}
                    fragment={book.fragment}
                    fileUrl={book.fileUrl}
                    isAuthenticated={isAuthenticated}
                    onViewDetails={() => {
                      if (!isAuthenticated) {
                        return; // No abrir modal si no está autenticado
                      }
                      setSelectedBook(book);
                      setIsModalOpen(true);
                      setShowPdf(true); // Mostrar PDF directamente
                    }}
                  />
                ))}
              </div>
              
              {/* Paginación */}
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            </>
          )}
        </div>
      </div>
      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && selectedBook && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsModalOpen(false);
              setSelectedBook(null);
            }} // Cerrar al hacer click fuera
          >
            <motion.div
              className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-8 relative flex flex-col items-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()} // Evitar que el click dentro cierre el modal
            >
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedBook(null);
                }}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl z-10"
              >
                &times;
              </button>
              {/* Título y visor PDF, solo primera página */}
              <h3 className="text-lg font-bold text-center w-full truncate">{selectedBook.title}</h3>
              {showPdf && (
                <div className="w-full text-center text-xs text-gray-500">Primera página</div>
              )}
              {selectedBook.fileUrl && showPdf && (
                <div className="w-full h-[65vh] mb-4 flex items-center justify-center relative">
                  <BookDetailsPopover book={selectedBook} />
                  <PDFViewer fileUrl={selectedBook.fileUrl} isAuthenticated={isAuthenticated} showDownloadButtons={false} />
                </div>
              )}
              
              {/* Los proyectos de investigación no permiten descarga ni apertura en nueva ventana */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón de scroll to top */}
      <ScrollToTop />
    </div>
  );
};

// Popover de detalles del servicio
function BookDetailsPopover({ book }: { book: PreparedBook }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center">
      <button
        className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full w-10 h-10 flex items-center justify-center shadow transition"
        onClick={() => setOpen(o => !o)}
        title="Ver detalles"
      >
        <span className="sr-only">Ver detalles</span>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M14 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22 }}
            className="mr-2 bg-white rounded-lg shadow-lg p-4 w-64 border border-gray-200 text-sm text-left right-full relative"
            style={{ left: 'auto', right: '100%' }}
          >
            {/* Flecha visual */}
            <span className="absolute top-1/2 right-[-3px] -translate-y-1/2 w-4 h-4">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="0,8 16,0 16,16" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
              </svg>
            </span>
            <div className="font-bold text-base mb-1 truncate">{book.title}</div>
            <div className="mb-1"><span className="font-semibold">Tipo:</span> {book.type}</div>
            <div className="mb-1"><span className="font-semibold">Especialidad:</span> {book.speciality}</div>
            <div className="mb-1"><span className="font-semibold">Sinopsis:</span> <span className="block text-gray-600 max-h-24 overflow-y-auto whitespace-pre-line">{book.description?.content?.[0]?.content?.[0]?.text || 'Sin sinopsis.'}</span></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
