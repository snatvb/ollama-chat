import { cn } from '@/lib/utils';
import styles from './eyes-looking-for.module.scss';

export function EyesLookingFor({ className }: { className?: string }) {
	return (
		<div className={cn(styles.eyes, className)}>
			<div className={styles.eye}></div>
			<div className={styles.eye}></div>
		</div>
	);
}
