interface Props {
	className?: string;
}

export const Separator = ({ className }: Props) => {
	return <div className={`bg-slate-200 h-px my-5 ${className}`} />;
};
