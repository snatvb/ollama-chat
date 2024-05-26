import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReloadIcon } from '@radix-ui/react-icons';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, SendIcon, X } from 'lucide-react';
import { ollama } from '@/core';
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
import { match } from 'ts-pattern';

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

		// if (attach?.type === 'image' && visionModel) {
		// 	console.log(attach.data);
		// 	console.log(visionModel);
		// 	const res = await ollamaRecognize(txt, visionModel, [
		// 		attach.data.replace('data:image/png;base64,', ''),
		// 	]);

		// 	const stream = res;
		// 	console.log(stream);

		// 	stream.on('data', (data) => {
		// 		console.log(data);
		// 	});

		// 	stream.on('end', () => {
		// 		console.log('stream done');
		// 	});
		// 	setTxt('');
		// 	return;
		// }

		try {
			// fetch(`${state.app.takeAPIUrl()}/api/generate`, {
			// 	body: JSON.stringify({
			// 		model: chat.model,
			// 		prompt: txt,
			// 		context: chat.ctx,
			// 		stream: true,
			// 	}),
			// 	headers: {
			// 		'Content-Type': 'application/json',
			// 	},
			// 	method: 'POST',
			// })
			// 	.then((response) => {
			// 		if (response.ok && response.body) {
			// 			const reader = response.body
			// 				.pipeThrough(new TextDecoderStream())
			// 				.getReader();

			// 			function readStream() {
			// 				return reader.read().then(({ value, done }) => {
			// 					if (done) {
			// 						reader.cancel();
			// 						return Promise.resolve();
			// 					}

			// 					// parse the data
			// 					const data = /{.*}/.exec(value);
			// 					if (!data || !data[0]) {
			// 						return readStream();
			// 					}

			// 					console.log(data[0]);

			// 					// do something if success
			// 					// and cancel the stream
			// 					// reader.cancel().catch(() => null);
			// 					return readStream();
			// 				});
			// 			}
			// 			return readStream();
			// 		} else {
			// 			return Promise.reject(response);
			// 		}
			// 	})
			// 	.then(() => {
			// 		console.log('done');
			// 	});
			// axios({
			// 	method: 'POST',
			// 	url: `${state.app.takeAPIUrl()}/api/generate`,
			// 	data: {
			// 		model: chat.model,
			// 		prompt: txt,
			// 		context: chat.ctx,
			// 		stream: true,
			// 	},
			// 	// headers: {
			// 	// 	'Content-Type': 'application/json',
			// 	// },
			// 	responseType: 'stream',
			// }).then((res) => {
			// 	console.log(res);
			// });

			setTxt('');
			setGenerates((g) => g.set(chat.id, ''));

			appendHistoryConversation(chat.id, {
				created_at: new Date(),
				txt: [{ content: txt, type: 'text' }],
				who: 'me',
			});

			let response = '';
			const result = await ollama.generate(
				{
					model: chat.model,
					prompt: txt,
					context: chat.ctx,
				},
				(chunk) => {
					setGenerates((g) => {
						response += chunk.response;
						return g.set(chat.id, response);
					});
				},
			);

			// const res = await ollamaGenerate(txt, chat.model, chat.ctx);
			// const convertedToJson = convertTextToJson(res);
			// const txtMsg = convertedToJson.map((item) => item.response).join('');

			const updatedCtx = result.context;
			if (!updatedCtx) {
				throw new Error('No context found');
			}

			updateConversation(chat.id, (chat) => ({
				...chat,
				ctx: chat.ctx.concat(updatedCtx),
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

	// Function to handle drop event
	function handleDrop(e: React.DragEvent<HTMLDivElement>) {
		if (!visionModel) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		const { files } = e.dataTransfer;
		const file = files[0];
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

		// const reader = new FileReader();
		// reader.onload = () => {
		// 	const content = reader.result as string;
		// 	// console.log(content);
		// };
		// reader.readAsDataURL(file);
		setFileHandle(false);
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
							<Button variant="secondary" size="icon">
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
