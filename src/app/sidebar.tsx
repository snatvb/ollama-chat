import { Button } from '@/components/ui/button';
import { generateRandomString } from '@/core';
import { useAtom, useAtomValue } from 'jotai';
import { memo, useState } from 'react';
import { state } from './state';
import { match, P } from 'ts-pattern';
import { ReloadIcon } from '@radix-ui/react-icons';
import { Message, updateConversation } from './state/conversation';
import { toast } from '@/components/ui/use-toast';

function takeLastTime(chatHistory: Message[]) {
	const lastCreatedAt = chatHistory.at(-1)?.created_at;
	return lastCreatedAt ? new Date(lastCreatedAt).getTime() : undefined;
}

export default memo(function Sidebar() {
	const [currentEdit, setCurrentEdit] = useState('');
	const [conversations, setConversations] = useAtom(state.conversation.record);
	const [currentId, setCurrentId] = useAtom(state.conversation.current.id);
	const tutorial = useAtomValue(state.tutorial.element);
	const model = useAtomValue(state.app.model);

	function newConversation() {
		if (conversations.status !== 'loaded') {
			return;
		}

		if (!model) {
			toast({
				title: 'Please select a model first',
				description: 'You need open Settings & Info and select a model first',
				variant: 'destructive',
				duration: 15000,
			});
			return;
		}

		let id = generateRandomString(8);
		let iters = 0;
		while (conversations.value.has(id)) {
			id = generateRandomString(8);
			iters++;
			if (iters > 100) {
				throw new Error('Too many iterations');
			}
		}
		setConversations((c) =>
			c.set(id, {
				id,
				chatHistory: [],
				ctx: [],
				model,
				createdAt: Date.now(),
			}),
		);
		setCurrentId(id);
	}

	return (
		<div className="flex flex-col shrink-0 p-4 pt-3 w-[280px] dark:text-white bg-neutral-50 dark:bg-stone-950">
			<Button
				className="w-full dark:text-white relative"
				variant="outline"
				onClick={newConversation}
			>
				{tutorial === 'new-conversation' && (
					<span className="animate-ping absolute inline-flex w-1/2 h-1/2 rounded-sm bg-sky-400 opacity-75" />
				)}
				Create new conversation
			</Button>
			<div className="mt-2 overflow-y-auto h-[calc(100%-30px)]">
				<div className="flex flex-col items-center">
					{match(conversations)
						.with(
							{ status: 'loaded', value: P.when((x) => x.count() > 0) },
							(result) =>
								result.value
									.valueSeq()
									.sort((a, b) => {
										const aTime = takeLastTime(a.chatHistory) ?? a.createdAt;
										const bTime = takeLastTime(b.chatHistory) ?? b.createdAt;
										return bTime - aTime;
									})
									.map((conversation) => {
										const id = conversation.id;
										const name = conversation.name ?? id;
										return (
											<div
												className={`
											${
												currentId === id
													? 'bg-neutral-200 dark:bg-neutral-800'
													: 'bg-neutral-100 dark:bg-neutral-900'
											} flex-1 w-full p-2 hover:bg-neutral-200 mb-2 rounded-md select-none cursor-pointer text-black dark:text-white`}
												onClick={() => {
													setCurrentId(id);
												}}
												onDoubleClick={() => {
													setCurrentEdit(id);
												}}
												key={id}
											>
												{currentEdit !== id ? (
													<p className="truncate">{name}</p>
												) : (
													<RenameInput
														initialName={name}
														onFinish={(newName) => {
															updateConversation(id, (prev) => ({
																...prev,
																name: newName.length > 0 ? newName : undefined,
															}));
															setCurrentEdit('');
														}}
													/>
												)}
											</div>
										);
									}),
						)
						.with({ status: 'loading' }, () => (
							<ReloadIcon className="h-8 w-8 animate-spin" />
						))
						.with(
							{ status: 'loaded', value: P.when((x) => x.count() === 0) },
							() => <p>No conversations</p>,
						)
						.otherwise(() => (
							<p>Error</p>
						))}
				</div>
			</div>
		</div>
	);
});

function RenameInput({
	onFinish,
	initialName,
}: {
	initialName: string;
	onFinish: (name: string) => void;
}) {
	return (
		<input
			onKeyDown={(e) => {
				if (e.code === 'Escape' || e.code === 'Enter') {
					e.currentTarget.blur();
				}
			}}
			autoFocus
			onBlur={(e) => onFinish(e.currentTarget.value)}
			className="bg-transparent"
			defaultValue={initialName}
		/>
	);
}
