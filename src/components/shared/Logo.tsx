import { Link } from 'react-router-dom';

export const Logo = () => {
	return (
		<Link
			to='/'
			className={`flex items-center gap-2 text-2xl font-bold tracking-tighter transition-all`}
		>
			<img src="/img/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
			<p className='hidden lg:block'>
				Ciudad
				<span className='text-orange-400'>Colonial</span>
			</p>

			<p className='flex text-4xl lg:hidden gap-1.5'>
				<span className='-skew-x-6 text-black' style={{textShadow: '-1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white'}}>C</span>
				<span className='text-orange-400 skew-x-6' style={{textShadow: '-1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white'}}>C</span>
			</p>
		</Link>
	);
};
