import React, { useEffect, useState } from 'react';
import { ButtonProps, buttonVariants } from './ui/button';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { CopyIcon } from '@radix-ui/react-icons';
import { toast } from './ui/use-toast';
import { match } from 'ts-pattern';
import { CheckCheck, CircleSlash, LoaderIcon } from 'lucide-react';

const CopyButton = React.forwardRef<
	HTMLButtonElement,
	Omit<ButtonProps, 'children'> & { value: string; successDuration?: number }
>(
	(
		{
			className,
			value,
			successDuration = 2000,
			variant = 'secondary',
			size = 'icon',
			asChild = false,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : 'button';
		const [clipboard, setClipboard] = useState<
			'idle' | 'pending' | 'success' | 'error'
		>('idle');
		useEffect(() => {
			if (clipboard === 'pending') {
				navigator.clipboard.writeText(value).then(() => {
					setClipboard('success');
				});
			} else if (clipboard === 'success') {
				const timeoutId = setTimeout(() => {
					setClipboard('idle');
				}, successDuration);
				return () => clearTimeout(timeoutId);
			} else if (clipboard === 'error') {
				toast({
					variant: 'destructive',
					title: 'Failed to copy',
					description: 'Please try again or connect with support',
				});
				const timeoutId = setTimeout(() => {
					setClipboard('idle');
				}, successDuration);
				return () => clearTimeout(timeoutId);
			}
		}, [value, clipboard, successDuration]);

		const iconClassName = 'w-3 h-3 m-1';

		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }), 'w-6 h-6')}
				ref={ref}
				{...props}
				onClick={(e) => {
					setClipboard('pending');
					props.onClick?.(e as any);
				}}
			>
				{match(clipboard)
					.with('idle', () => <CopyIcon className={iconClassName} />)
					.with('pending', () => <LoaderIcon className={iconClassName} />)
					.with('success', () => (
						<CheckCheck className={cn(iconClassName, 'text-green-400')} />
					))
					.with('error', () => (
						<CircleSlash className={cn(iconClassName, 'text-red-400')} />
					))
					.exhaustive()}
			</Comp>
		);
	},
);
CopyButton.displayName = 'CopyButton';

export { CopyButton };
