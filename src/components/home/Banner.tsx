import { Link } from 'react-router-dom';

export const Banner = () => {
	return (
		<div className='relative bg-gray-900 text-white'>
			{/* IMAGEN DE FONDO */}
			<div
				className='absolute inset-0 bg-cover bg-center opacity-70 h-full'
				style={{ backgroundImage: 'url(/img/bannerFinalPSM.jpg)' }}
			/>

			{/* OVERLAY */}
			<div className='absolute inset-0 bg-black opacity-30' />

			{/* CONTENIDO */}
			<div className='relative z-10 flex flex-col items-center justify-center py-20 px-4 text-center lg:py-40 lg:px-8'>
				<h1 className='text-4xl font-bold mb-4 lg:text-6xl'>
					Bienvenido a Ciudad Colonial
				</h1>
				<p className='text-xl mb-6 lg:text-2xl text-gray-200'>
					Gestiona tu información y mantente al día con todo lo que necesitas saber
				</p>

				<Link
					to='/anuncios'
					className='bg-gray-900 hover:bg-gray-950 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out'
				>
					Ver Anuncios
				</Link>
			</div>
		</div>
	);
};
