import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

export const BackToHome = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/')}
      className="fixed top-20 right-4 z-50 bg-secondary text-white p-3 rounded-full shadow-lg hover:bg-secondary-dark transition-all duration-300 hover:scale-110"
      title="Volver al inicio"
    >
      <FaHome size={20} />
    </button>
  );
}; 