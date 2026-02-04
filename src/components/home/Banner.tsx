import { Link } from 'react-router-dom';

export const Banner = () => {
	return (
		<div className='relative bg-slate-800 text-white min-h-[28rem] lg:min-h-[32rem]'>
			{/* IMAGEN DE FONDO - cartel Ciudad Colonial */}
			<div
				className='absolute inset-0 bg-cover bg-center bg-no-repeat'
				style={{
					backgroundImage: 'url(/img/bannerCiudadColonial.png)',
					backgroundPosition: 'center center',
				}}
			/>

			{/* Overlay para legibilidad del texto (imagen clara) */}
			<div className='absolute inset-0 bg-black/50' />

			{/* CONTENIDO */}
			<div className='relative z-10 flex flex-col items-center justify-center py-20 px-4 text-center lg:py-40 lg:px-8'>
				<h1 className='text-4xl font-bold mb-4 lg:text-6xl drop-shadow-lg text-white'>
					Bienvenido a Ciudad Colonial
				</h1>
				<p className='text-xl mb-6 lg:text-2xl text-gray-100 drop-shadow-md max-w-2xl'>
					Gestiona tu información y mantente al día con todo lo que necesitas saber
				</p>

				<Link
					to='/anuncios'
					className='bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out border border-white/20'
				>
					Ver Anuncios
				</Link>
			</div>
		</div>
	);
};
