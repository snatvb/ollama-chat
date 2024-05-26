import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReloadIcon } from '@radix-ui/react-icons';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, SendIcon, X } from 'lucide-react';
import { GenerateParams, ollama } from '@/core';
import { toast } from '@/components/ui/use-toast';
import { state } from './state';
import { useAtomValue, useSetAtom } from 'jotai';
import {
	appendHistoryConversation,
	updateConversation,
} from './state/conversation';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { readAs64, resizeImage } from '@/lib/file';
import { P, match } from 'ts-pattern';

const drafts = new Map<string, string>();

type Attach = {
	type: 'image';
	data: string;
};

export default memo(function InputPrompt() {
	const promptRef = useRef<HTMLTextAreaElement>(null);
	const [fileHandle, setFileHandle] = useState(false);
	const visionModel = useAtomValue(state.app.visionModel);
	const [attach, setAttach] = useState<Attach>();
	const connected = useAtomValue(state.app.connected);
	const setLastResponseTime = useSetAtom(state.app.lastResponseTime);
	const currentChat = useAtomValue(state.conversation.current.chat);
	const currentConversationId = useAtomValue(state.conversation.current.id);
	const [txt, setTxt] = useState(
		() => drafts.get(currentConversationId ?? '') ?? '',
	);
	const setGenerates = useSetAtom(state.app.generates);
	const generating = useAtomValue(state.conversation.current.generating);
	const disabled = !connected || generating;

	useLayoutEffect(() => {
		if (currentConversationId) {
			drafts.set(currentConversationId, txt);
		}
	}, [txt]);

	useEffect(() => {
		if (currentConversationId === undefined) {
			return;
		}
		setTxt(drafts.get(currentConversationId) ?? '');
		promptRef.current?.focus();
	}, [currentConversationId]);

	async function submitPrompt() {
		const startTime = Date.now();
		const chat = currentChat.value;
		if (!chat || currentChat.status !== 'loaded' || txt === '' || generating) {
			return;
		}

		try {
			setTxt('');
			setFileHandle(false);
			setAttach(undefined);

			type MsgContent = state.conversation.MsgContent;
			type Generate = state.app.Generate;
			const [params, mineMessage, generateItem, type] = match([
				attach,
				visionModel,
			])
				.returnType<[GenerateParams, MsgContent, Generate, 'text' | 'image']>()
				.with(
					[
						{ type: 'image', data: P.select('image') },
						P.nonNullable.select('model'),
					],
					({ image, model }) => [
						{
							model,
							prompt: txt,
							images: [image.replace(/^data:image\/\w+;base64,/, '')],
						},
						{
							content: txt,
							type: 'image',
							image,
						},
						{ type: 'image', text: '' },
						'image',
					],
				)
				.otherwise(() => [
					{
						model: chat.model,
						prompt: txt,
						context: chat.ctx,
					},
					{ content: txt, type: 'text' },
					{ type: 'text', text: '' },
					'text',
				]);

			setGenerates((g) => g.set(chat.id, generateItem));

			appendHistoryConversation(chat.id, {
				created_at: new Date(),
				txt: [mineMessage],
				who: 'me',
			});

			let response = '';
			const result = await ollama.generate(params, (chunk) => {
				setGenerates((g) => {
					response += chunk.response;
					return g.set(chat.id, { type: 'text', text: response });
				});
			});

			const updatedCtx = result.context;
			if (!updatedCtx) {
				throw new Error('No context found');
			}

			updateConversation(chat.id, (chat) => ({
				...chat,
				ctx: type === 'image' ? chat.ctx : chat.ctx.concat(updatedCtx),
				chatHistory: [
					...chat.chatHistory,
					{
						txt: [{ content: response, type: 'text' }],
						who: 'ollama',
						created_at: new Date(),
					},
				],
			}));
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Failed',
				description:
					'Something went wrong sending the promt, Check Info & Help',
			});
		} finally {
			setGenerates((g) => g.delete(chat.id));
		}

		// After its done, we need to auto focus since we disable the input whole its processing the request.
		setTimeout(() => {
			if (promptRef?.current) {
				promptRef.current.focus();
			}
		}, 0);

		const endTime = Date.now();

		setLastResponseTime(endTime - startTime);
	}

	if (!currentChat.value) {
		return null;
	}

	function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
		if (!visionModel) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		setFileHandle(true);
	}

	function handleFile(file: File) {
		const extensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
		if (extensions.some((ext) => file.name.endsWith(ext))) {
			resizeImage(file, 1280, 720)
				.then(readAs64)
				.then((data) => {
					setAttach({
						type: 'image',
						data,
					});
				})
				.catch((e) => {
					toast({
						variant: 'destructive',
						title: 'Failed',
						description: e?.message,
					});
				});
		} else {
			toast({
				variant: 'destructive',
				title: 'Failed',
				description: 'Invalid file format',
			});
		}
	}

	function handleDrop(e: React.DragEvent<HTMLDivElement>) {
		if (!visionModel) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		const { files } = e.dataTransfer;
		const file = files[0];
		handleFile(file);

		setFileHandle(false);
	}

	async function handleAttach() {
		const [picker] = await window.showOpenFilePicker({
			types: [
				{
					description: 'Images',
					accept: {
						'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
					},
				},
			],
		});
		handleFile(await picker.getFile());
	}

	return (
		<div
			className="flex flex-row w-full p-4 relative dark:text-white space-x-2"
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onDragLeave={() => setFileHandle(false)}
		>
			{visionModel && (
				<div>
					{match(attach)
						.with({ type: 'image' }, ({ data }) => (
							<div className="relative">
								<Button
									variant="destructive"
									onClick={() => setAttach(undefined)}
									className="absolute -right-1 -top-1 w-4 h-4"
									size="icon"
								>
									<X className="w-3 h-3" />
								</Button>
								<img src={data} width={64} />
							</div>
						))
						.otherwise(() => (
							<Button variant="secondary" size="icon" onClick={handleAttach}>
								<Paperclip className="w-4 h-4" />
							</Button>
						))}
				</div>
			)}
			<Textarea
				ref={promptRef}
				autoFocus
				rows={4}
				disabled={!connected}
				placeholder="Your message... (Ctrl+Enter to send)"
				value={txt}
				onChange={(e) => {
					setTxt(e.currentTarget.value);
				}}
				className={
					'dark:bg-black dark:text-zinc-300 p-1 px-2 max-h-[300px] flex-grow flex border dark:border-neutral-800'
				}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && e.ctrlKey) {
						submitPrompt();
					}
				}}
			/>

			<Button
				variant="secondary"
				disabled={txt === '' || disabled}
				onClick={() => submitPrompt()}
				className="flex-shrink-0 h-full w-20"
			>
				{generating ? (
					<ReloadIcon className="h-4 w-4 animate-spin" />
				) : (
					<SendIcon className="h-4 w-4" />
				)}
			</Button>

			<Card
				className={cn(
					`absolute left-0 top-0 w-full h-full pointer-events-none border-2 border-dashed bg-muted hover:cursor-pointer hover:border-muted-foreground/50`,
					'opacity-0 transition-opacity',
					fileHandle && 'opacity-1',
				)}
			>
				<CardContent className="flex flex-col w-full h-full items-center justify-center space-y-2 px-2 py-4 text-xs">
					<div className="flex items-center justify-center text-muted-foreground">
						<span className="font-medium">Drag File to handle</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
});
