import { memo, useEffect, useRef } from 'react';
import { P, match } from 'ts-pattern';
import {
	ConversationBlock,
	OllamaAvatarPrerender,
} from './parts/ConversationBlock';
import { convertTextToJson, ollamaGenerate } from '@/core';
import dayjs from 'dayjs';
import { useAtom, useAtomValue } from 'jotai';
import { state } from './state';
import { Conversation, updateConversation } from './state/conversation';
import { ReloadIcon } from '@radix-ui/react-icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { EyesLookingFor } from '@/components/eyes-looking-for';
import { useEvent } from '@/hooks/use-event';

const states: Record<string, { state: 'loading' }> = {};

async function requestName(conversation: Conversation) {
	const res = await ollamaGenerate(
		"Please give name for the dialogue. Don't use markdown. Without prefix.",
		conversation.model,
		conversation.ctx,
	);

	const convertedToJson = convertTextToJson(res);
	const txtMsg = convertedToJson.map((item) => item.response).join('');
	return txtMsg;
}

export default memo(function Chat() {
	const chatRef = useRef<HTMLDivElement>(null);
	const [currentConversationId, setCurrentConversationId] = useAtom(
		state.conversation.current.id,
	);
	const currentConversation = useAtomValue(state.conversation.current.chat);
	const generating = useAtomValue(state.conversation.current.generating);

	const scroll = useEvent(() =>
		chatRef.current?.scrollTo({
			top: chatRef.current.scrollHeight,
		}),
	);

	useEffect(() => {
		scroll();
	}, [currentConversationId, currentConversation.value?.chatHistory.length]);

	useEffect(() => {
		function handleEcs(event: KeyboardEvent) {
			if (event.code === 'Escape') {
				setCurrentConversationId(undefined);
			}
		}
		document.addEventListener('keydown', handleEcs);
		return () => {
			document.removeEventListener('keydown', handleEcs);
		};
	}, []);

	useEffect(() => {
		if (
			currentConversation.status === 'loading' ||
			!currentConversation.value ||
			!currentConversationId
		) {
			return;
		}
		const current = currentConversation.value;
		if (
			current.name === undefined &&
			states[currentConversationId]?.state !== 'loading' &&
			current.chatHistory.length > 1
		) {
			states[currentConversationId] = { state: 'loading' };
			requestName(current)
				.then((updatedName) => {
					updateConversation(currentConversationId, (chat) => ({
						...chat,
						name: updatedName,
					}));
				})
				.finally(() => {
					delete states[currentConversationId];
				});
		}
	}, [currentConversationId, currentConversation]);

	return (
		<div className="w-full h-full relative">
			<div className="flex flex-col justify-end absolute left-0 top-0 w-full h-full">
				<ScrollArea viewPortRef={chatRef} className="w-full px-4">
					{match(currentConversation)
						.with(
							{
								status: 'loaded',
								value: P.when((v) => (v?.chatHistory.length ?? 0) > 0),
							},
							({ value }) => {
								return <ConversationBlock conversation={value!} />;
							},
						)
						.with(
							{
								status: 'loaded',
								value: P.when((v) => v === undefined),
							},
							() => {
								return (
									<div className="flex w-full justify-center">
										<p className="text-neutral-600 dark:text-neutral-400 text-center text-xl p-16 max-w-lg flex self-center">
											Chat is not selected. Please select a chat from the
											sidebar, or create a new one.
										</p>
									</div>
								);
							},
						)
						.with(
							{
								status: 'loading',
							},
							() => {
								return (
									<p>
										<ReloadIcon className="h-16 w-16 animate-spin" />
									</p>
								);
							},
						)
						.when(
							() => generating,
							() => null,
						)
						.otherwise(() => (
							<p className="text-neutral-400 dark:text-neutral-600 text-center mt-10">
								No message
							</p>
						))}
					<Generating onGenerate={scroll} />
				</ScrollArea>
			</div>
		</div>
	);
});

const Generating = memo(function Generating({
	onGenerate,
}: {
	onGenerate?: () => void;
}) {
	const generating = useAtomValue(state.conversation.current.generatingText);

	useEffect(() => {
		if (generating !== undefined) {
			onGenerate?.();
		}
	}, [generating, onGenerate]);

	if (generating === undefined) {
		return null;
	}

	return (
		<div className={`relative w-full flex dark:text-white`}>
			<p className="mt-2.5 text-neutral-400">{OllamaAvatarPrerender}</p>
			<div
				className={`flex flex-col mb-10 bg-zinc-100 dark:bg-zinc-900 border-solid border-neutral-200 dark:border-neutral-800 border rounded-xl p-2 w-[80%]`}
			>
				{match(generating)
					.with(
						{
							type: P.union('text', 'image'),
							text: P.when((v) => v.length > 0),
						},
						({ text }) => {
							return text;
						},
					)
					.with({ type: 'image', text: P.when((v) => v.length === 0) }, () => {
						return (
							<div className="flex text-xl items-center space-x-2">
								<EyesLookingFor />
								<span className="text-lg">Recognizing...</span>
							</div>
						);
					})
					.otherwise(() => {
						return <Skeleton className="w-full h-10 animate-pulse" />;
					})}

				<p className="absolute bottom-[20px] text-xs text-neutral-500">
					{dayjs(Date.now()).format('HH:MM:ss')}
				</p>
			</div>
		</div>
	);
});
