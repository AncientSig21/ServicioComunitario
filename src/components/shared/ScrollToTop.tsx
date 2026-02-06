import { useState, useEffect } from 'react';
import { FaArrowUp } from 'react-icons/fa';

export const ScrollToTop = () => {
	const [isVisible, setIsVisible] = useState(false);

	// Mostrar el botón cuando el usuario haga scroll más de 300px
	useEffect(() => {
		const toggleVisibility = () => {
			if (window.pageYOffset > 300) {
				setIsVisible(true);
			} else {
				setIsVisible(false);
			}
		};

		window.addEventListener('scroll', toggleVisibility);

		return () => window.removeEventListener('scroll', toggleVisibility);
	}, []);

	// Función para hacer scroll al inicio
	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	};

	return (
		<>
			{isVisible && (
				<button
					onClick={scrollToTop}
					className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
					aria-label="Ir al inicio de la página"
					title="Ir al inicio"
				>
					<FaArrowUp size={18} className="group-hover:animate-bounce" />
				</button>
			)}
		</>
	);
}; 