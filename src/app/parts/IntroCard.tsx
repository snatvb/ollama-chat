import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { OLLAMA_COMMAND } from '@/core';
import { useEffect, useRef } from 'react';
import { tryConnect } from '../helper';
import { useAtomValue } from 'jotai';
import { state } from '../state';

export type Props = {
	onClose: () => void;
};

export function IntroCard(props: Props) {
	const { toast } = useToast();
	const ref = useRef<HTMLButtonElement>(null);
	const serverConnected = useAtomValue(state.app.connected);

	useEffect(() => {
		if (ref.current) {
			ref.current.click();
		}
	}, []);

	useEffect(() => {
		if (serverConnected) {
			props.onClose();
		}
	}, [serverConnected]);

	return (
		<Dialog
			onOpenChange={(opened) => {
				if (!opened) {
					props.onClose();
				}
			}}
		>
			<DialogTrigger className="hidden" ref={ref}></DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="mb-2 dark:text-white">
						Welcome to Ollama Chat Interface
					</DialogTitle>
					<DialogDescription className="pt-2">
						1. Install Ollama on your mac or pc,
					</DialogDescription>
					<div>
						<a href="https://ollama.ai" target="_blank">
							<Button size="sm">open</Button>
						</a>
					</div>

					<DialogDescription className="pt-2">
						2. Start your server with
					</DialogDescription>
					<code className="bg-neutral-800 text-white">{OLLAMA_COMMAND}</code>
					<div>
						<Button
							size="sm"
							onClick={() => {
								toast({
									title: 'Command copied',
									description: 'Pase this commend somewhere in your terminal',
								});
								navigator.clipboard.writeText(OLLAMA_COMMAND);
							}}
						>
							Copy
						</Button>
					</div>

					<DialogDescription className="pt-2">
						3. Start connecting to your server
					</DialogDescription>
					<div>
						<Button onClick={tryConnect} size="sm" disabled={serverConnected}>
							Connect
						</Button>
						{serverConnected && (
							<Badge
								className="ml-2 bg-green-200 hover:bg-green-200 text-green-700"
								variant="secondary"
							>
								Connected
							</Badge>
						)}
					</div>
				</DialogHeader>
				<Button className="mt-6" onClick={props.onClose}>
					Close and don't show
				</Button>
			</DialogContent>
		</Dialog>
	);
}
