import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ForumComment {
  id: number;
  topicId: number;
  author: string;
  content: string;
  createdAt: string;
}

interface ForumTopic {
  id: number;
  categoryId: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
}

const FORUM_STORAGE_KEY = 'forum_topics_ciudad_colonial';

export const BookPages = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');

  // Cargar datos desde localStorage al iniciar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FORUM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTopics(parsed.topics || []);
        setComments(parsed.comments || []);
      }
    } catch (error) {
      console.warn('Error cargando foro desde localStorage:', error);
    }
  }, []);

  // Guardar cambios en localStorage
  const saveForumData = (updatedTopics: ForumTopic[], updatedComments: ForumComment[]) => {
    setTopics(updatedTopics);
    setComments(updatedComments);
    try {
      localStorage.setItem(
        FORUM_STORAGE_KEY,
        JSON.stringify({ topics: updatedTopics, comments: updatedComments })
      );
    } catch (error) {
      console.warn('Error guardando foro en localStorage:', error);
    }
  };

  // Leer categoría activa desde la URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const categoriaParam = searchParams.get('categoria');
    if (categoriaParam) {
      setSelectedCategoria(categoriaParam);
    } else {
      setSelectedCategoria(null);
    }
    setSelectedTopicId(null);
  }, [location.search]);

  // Categorías visibles del foro comunitario
  const forumCategories: { id: string; label: string; description: string }[] = [
    { id: 'gestion-unidades', label: 'Gestión de Unidades', description: 'Dudas sobre apartamentos y unidades' },
    { id: 'documentos', label: 'Documentos y Normas', description: 'Reglamentos, manuales y guías' },
    { id: 'pagos', label: 'Pagos y Cuotas', description: 'Consultas sobre pagos y facturas' },
    { id: 'mantenimiento', label: 'Mantenimiento', description: 'Reportes y solicitudes de mantenimiento' },
    { id: 'reservas', label: 'Espacios comunes', description: 'Uso de áreas y espacios comunes' },
    { id: 'comunidad', label: 'Comunidad', description: 'Información y temas de residentes' },
    { id: 'profesionales-disponibles', label: 'Profesionales Disponibles', description: 'Servicios ofrecidos por vecinos' },
    { id: 'problemas-pagina', label: 'Problemas de la Página', description: 'Reportar fallos del portal' },
  ];

  const handleCategoryClick = (categoriaId: string | null) => {
    const params = new URLSearchParams(location.search);
    if (categoriaId) {
      params.set('categoria', categoriaId);
    } else {
      params.delete('categoria');
    }
    navigate({ pathname: '/libros', search: params.toString() }, { replace: false });
  };

  // Función para obtener el título según la categoría
  const getPageTitle = () => {
    if (!selectedCategoria) return 'Foro Comunitario';

    const categoriaTitles: { [key: string]: string } = {
      'gestion-unidades': 'Gestión de Unidades',
      'documentos': 'Documentos y Normativas',
      'pagos': 'Pagos y Facturación',
      'mantenimiento': 'Mantenimiento y Servicios',
      'reservas': 'Espacios comunes',
      'comunidad': 'Comunidad y Directorio',
      'profesionales-disponibles': 'Profesionales Disponibles',
      'problemas-pagina': 'Problemas de la Página',
    };

    return categoriaTitles[selectedCategoria] || 'Foro Comunitario';
  };

  const selectedCategoryInfo = selectedCategoria
    ? forumCategories.find(c => c.id === selectedCategoria)
    : null;

  const filteredTopics = selectedCategoria
    ? topics.filter(t => t.categoryId === selectedCategoria)
    : topics;

  const currentTopic = filteredTopics.find(t => t.id === selectedTopicId) || null;
  const currentComments = currentTopic
    ? comments.filter(c => c.topicId === currentTopic.id)
    : [];

  const handleCreateTopic = () => {
    if (!user) {
      alert('Debes iniciar sesión para crear un tema en el foro.');
      return;
    }
    if (!selectedCategoria) {
      alert('Primero selecciona una categoría del foro.');
      return;
    }
    if (!newTopicTitle.trim() || !newTopicContent.trim()) {
      alert('Por favor completa el título y el contenido del tema.');
      return;
    }

    const newId = topics.length > 0 ? Math.max(...topics.map(t => t.id)) + 1 : 1;
    const newTopic: ForumTopic = {
      id: newId,
      categoryId: selectedCategoria,
      title: newTopicTitle.trim(),
      content: newTopicContent.trim(),
      author: user.nombre,
      createdAt: new Date().toISOString(),
    };

    const updatedTopics = [...topics, newTopic];
    saveForumData(updatedTopics, comments);
    setNewTopicTitle('');
    setNewTopicContent('');
    setSelectedTopicId(newId);
  };

  const handleAddComment = () => {
    if (!user) {
      alert('Debes iniciar sesión para comentar.');
      return;
    }
    if (!currentTopic) return;
    if (!newCommentContent.trim()) {
      alert('Escribe un comentario antes de enviar.');
      return;
    }

    const newId = comments.length > 0 ? Math.max(...comments.map(c => c.id)) + 1 : 1;
    const newComment: ForumComment = {
      id: newId,
      topicId: currentTopic.id,
      author: user.nombre,
      content: newCommentContent.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...comments, newComment];
    saveForumData(topics, updatedComments);
    setNewCommentContent('');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className='text-3xl sm:text-4xl lg:text-5xl font-semibold text-center mb-8 sm:mb-12'>
          {getPageTitle()}
        </h1>

        {/* Fila de categorías del foro comunitario */}
        <div className="mb-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`px-4 py-2 rounded-full text-sm sm:text-base font-medium border transition-all ${
              !selectedCategoria
                ? 'bg-blue-600 text-white border-blue-600 shadow'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Todas las categorías
          </button>
          {forumCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all text-left ${
                selectedCategoria === cat.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title={cat.description}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Descripción de la categoría seleccionada */}
        {selectedCategoryInfo && (
          <div className="mb-8 max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
              {selectedCategoryInfo.label}
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              {selectedCategoryInfo.description}
            </p>
          </div>
        )}

        {/* Lista de temas y creación de nuevo tema */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna de temas */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
                Temas recientes
              </h3>
              {filteredTopics.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aún no hay temas en este apartado. Sé el primero en crear uno.
                </p>
              ) : (
                <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {filteredTopics
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(topic => (
                      <li
                        key={topic.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTopicId === topic.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTopicId(topic.id)}
                      >
                        <p className="text-sm font-semibold text-gray-800 mb-1 truncate">
                          {topic.title}
                        </p>
                        <p className="text-xs text-gray-500 mb-1">
                          Por {topic.author} · {formatDate(topic.createdAt)}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {topic.content}
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Crear nuevo tema */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
                Crear nuevo tema
              </h3>
              {!user && (
                <p className="text-xs sm:text-sm text-orange-600 mb-3">
                  Debes iniciar sesión para crear un tema en el foro.
                </p>
              )}
              {!selectedCategoria && (
                <p className="text-xs sm:text-sm text-gray-500 mb-3">
                  Selecciona primero una categoría para crear un tema específico.
                </p>
              )}
              <input
                type="text"
                value={newTopicTitle}
                onChange={e => setNewTopicTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Título del tema (ej: Soy mecánico disponible en la torre B)"
              />
              <textarea
                value={newTopicContent}
                onChange={e => setNewTopicContent(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descríbete, indica tus servicios o el tema que quieres tratar..."
              />
              <button
                onClick={handleCreateTopic}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={!user}
              >
                Publicar tema
              </button>
            </div>
          </div>

          {/* Columna de tema seleccionado y comentarios */}
          <div className="lg:col-span-2">
            {!currentTopic ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500 shadow-sm">
                <p className="mb-2 text-sm sm:text-base">
                  Selecciona un tema de la lista o crea uno nuevo para comenzar la conversación.
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Sugerencia: en "Profesionales Disponibles" puedes presentarte (por ejemplo, como mecánico) y ofrecer tus servicios a la comunidad.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Detalle del tema */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {currentTopic.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mb-4">
                    Publicado por <span className="font-semibold">{currentTopic.author}</span> · {formatDate(currentTopic.createdAt)}
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line mb-2">
                    {currentTopic.content}
                  </p>
                </div>

                {/* Comentarios */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
                    Comentarios
                  </h3>
                  {currentComments.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-4">
                      Aún no hay comentarios en este tema. Sé el primero en responder.
                    </p>
                  ) : (
                    <ul className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
                      {currentComments
                        .slice()
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(comment => (
                          <li
                            key={comment.id}
                            className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                          >
                            <p className="text-xs text-gray-500 mb-1">
                              <span className="font-semibold">{comment.author}</span> · {formatDate(comment.createdAt)}
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">
                              {comment.content}
                            </p>
                          </li>
                        ))}
                    </ul>
                  )}

                  {/* Formulario de nuevo comentario */}
                  {!user && (
                    <p className="text-xs sm:text-sm text-orange-600 mb-2">
                      Debes iniciar sesión para participar en la conversación.
                    </p>
                  )}
                  <textarea
                    value={newCommentContent}
                    onChange={e => setNewCommentContent(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Escribe tu comentario o respuesta..."
                  />
                  <button
                    onClick={handleAddComment}
                    className="w-full bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    disabled={!user}
                  >
                    Publicar comentario
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
