import { useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { ToastType } from '../../contexts/ToastContext';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const toastStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500',
    iconComponent: FaCheckCircle,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
    iconComponent: FaExclamationCircle,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-500',
    iconComponent: FaExclamationTriangle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
    iconComponent: FaInfoCircle,
  },
};

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
  const styles = toastStyles[type];
  const Icon = styles.iconComponent;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} border-2 rounded-lg shadow-lg p-4 
        flex items-start gap-3 animate-slide-in-right
        min-w-[300px] max-w-md
      `}
      role="alert"
    >
      <Icon className={`${styles.icon} flex-shrink-0 mt-0.5`} size={20} />
      
      <div className="flex-1">
        <p className={`${styles.text} text-sm font-medium`}>{message}</p>
      </div>
      
      <button
        onClick={onClose}
        className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Cerrar notificación"
      >
        <FaTimes size={14} />
      </button>
    </div>
  );
};

