import { Button } from '@/components/ui/button';
import { Headphones, Loader2 } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';
import { VoiceController } from '../controller';
import { StopIcon } from '@radix-ui/react-icons';

export type Props = {
	content: string;
};

export function VoiceIt({ content }: Props) {
	const [voiceController, setController] = useState<VoiceController>();

	useLayoutEffect(() => {
		if (voiceController) {
			return () => {
				voiceController?.stop();
			};
		}
	}, [voiceController]);

	function handleClick() {
		if (voiceController) {
			setController(undefined);
			return;
		}
		const controller = new VoiceController(content);
		setController(controller);
		controller.start();
		controller.promise.finally(() => {
			setController(undefined);
		});
	}

	return (
		<Button
			onClick={handleClick}
			variant="secondary"
			size="icon"
			className="p-1 w-auto h-auto"
		>
			{voiceController ? (
				<>
					<StopIcon className="w-4 h-4" />
					<Loader2 className="w-4 h-4 animate-spin" />
				</>
			) : (
				<Headphones className="w-4 h-4" />
			)}
		</Button>
	);
}
