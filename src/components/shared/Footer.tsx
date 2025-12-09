import { Link } from 'react-router-dom';
import { socialLinks } from '../../constants/links';
import { FaFacebook } from 'react-icons/fa6';
import React from 'react';

export const Footer = () => {
	return (
		<footer className='py-8 sm:py-12 lg:py-16 bg-primary px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row justify-between gap-6 sm:gap-8 lg:gap-10 text-white text-sm mt-10'>
			<Link
				to='/'
				className={`text-xl sm:text-2xl font-bold tracking-tighter transition-all text-white text-center sm:text-left`}
			>
				Ciudad Colonial
			</Link>

			<div className='flex flex-col gap-3 sm:gap-4 text-center sm:text-left'>
				<p className='font-semibold uppercase tracking-tighter text-sm sm:text-base'>
					Secciones
				</p>

				<nav className='flex flex-col gap-2 text-xs font-medium'>
					<Link to='/libros'>Foro</Link>
					<Link to='/tesis'>Servicios</Link>
				</nav>
			</div>

			<div className='flex flex-col gap-3 sm:gap-4 text-center sm:text-left'>
				<p className='font-semibold uppercase tracking-tighter text-sm sm:text-base'>
					Contacto
				</p>

				<p className='text-xs leading-6 max-w-xs mx-auto sm:mx-0'>
					Mantente informado sobre las últimas noticias y actualizaciones de Ciudad Colonial.
				</p>

				<div className='flex justify-center sm:justify-start'>
					<a
						href='https://www.facebook.com/psmmaturin'
						target='_blank'
						rel='noreferrer'
						className='text-white border border-secondary w-full h-full py-3.5 flex items-center justify-center transition-all hover:bg-secondary hover:text-white mr-2'
						title='Facebook'
					>
						<FaFacebook size={24} />
					</a>
					{socialLinks.map(link => (
						<a
							key={link.id}
							href={link.title === 'Instagram' ? 'https://www.instagram.com/psmmaturin/' : link.href}
							target='_blank'
							rel='noreferrer'
							className='text-white border border-secondary w-full h-full py-3.5 flex items-center justify-center transition-all hover:bg-secondary hover:text-white'
						>
							{link.title === 'Instagram' ? React.cloneElement(link.icon, { size: 32 }) : link.icon}
						</a>
					))}
				</div>
			</div>
		</footer>
	);
};
