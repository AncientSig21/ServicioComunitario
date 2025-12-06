import { Separator } from '../shared/Separator';

interface Props {
	selectedSpecialities: string[];
	onChange: (specialities: string[]) => void;
	specialities: string[]; // Lista de especialidades únicas
	title?: string; // Título personalizable del filtro
}

export const ContainerFilter = ({ selectedSpecialities, onChange, specialities, title = 'Tipos' }: Props) => {
	const handleCheckbox = (brand: string) => {
		if (selectedSpecialities.includes(brand)) {
			onChange(selectedSpecialities.filter(s => s !== brand));
		} else {
			onChange([...selectedSpecialities, brand]);
		}
	};

	return (
		<div className='p-3 sm:p-4 lg:p-5 border border-slate-200 rounded-lg h-fit col-span-2 lg:col-span-1'>
			<h3 className='font-semibold text-lg sm:text-xl mb-3 sm:mb-4'>Filtros</h3>

			{/* Separador  */}
			<Separator />

			<div className='flex flex-col gap-2 sm:gap-3'>
				<h3 className='text-base sm:text-lg font-medium text-black'>{title}</h3>

				<div className='flex flex-col gap-1 sm:gap-2'>
					{specialities.map(brand => (
						<label key={brand} className='inline-flex items-center'>
							<input
								type='checkbox'
								className='text-black border-black focus:ring-black accent-black'
								checked={selectedSpecialities.includes(brand)}
								onChange={() => handleCheckbox(brand)}
							/>
							<span className='ml-2 text-black text-xs sm:text-sm cursor-pointer'>
								{brand}
							</span>
						</label>
					))}
				</div>
			</div>
		</div>
	);
};
