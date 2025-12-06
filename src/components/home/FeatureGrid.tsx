import { FaHome, FaFileAlt, FaBell } from 'react-icons/fa';
import { GrWorkshop } from 'react-icons/gr';

export const FeatureGrid = () => {
	return (
		<div className='grid grid-cols-2 gap-8 mt-6 mb-16 lg:grid-cols-4 lg:gap-5'>
			<div className='flex items-center gap-6'>
				<FaHome size={40} className='text-slate-600' />

				<div className='space-y-1'>
					<p className='font-semibold'>Gestión de Unidades</p>
					<p className='text-sm'>Administra tu apartamento o casa</p>
				</div>
			</div>

			<div className='flex items-center gap-6'>
				<FaFileAlt size={40} className='text-slate-600' />

				<div className='space-y-1'>
					<p className='font-semibold'>Documentos</p>
					<p className='text-sm'>
						Accede a documentos y normativas de Ciudad Colonial
					</p>
				</div>
			</div>

			<div className='flex items-center gap-6'>
				<FaBell size={40} className='text-slate-600' />

				<div className='space-y-1'>
					<p className='font-semibold'>Anuncios</p>
					<p className='text-sm'>
						Mantente informado de las últimas noticias
					</p>
				</div>
			</div>

			<div className='flex items-center gap-6'>
				<GrWorkshop size={40} className='text-slate-600' />

				<div className='space-y-1'>
					<p className='font-semibold'>Reportes</p>
					<p className='text-sm'>
						Consulta el estado de tus pagos y servicios
					</p>
				</div>
			</div>
		</div>
	);
};
