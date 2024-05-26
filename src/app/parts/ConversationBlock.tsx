import { memo } from 'react';
import dayjs from 'dayjs';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { Markdown } from '@/components/markdown';
import { Conversation } from '../state/conversation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ollamaAvatar from '../assets/ollama_avatar.png';
import { CopyButton } from '@/components/copy-button';

export interface Props {
	conversation: Conversation;
}

export const OllamaAvatarPrerender = (
	<div className="p-2">
		<Avatar>
			<AvatarImage src={ollamaAvatar} />
			<AvatarFallback>OL</AvatarFallback>
		</Avatar>
	</div>
);

export const ConversationBlock = memo(function ConversationBlock(props: Props) {
	return (
		<>
			{props.conversation.chatHistory.map((item, index) => (
				<div
					key={index}
					className={` relative w-full flex ${
						item.who === 'me' ? 'justify-end' : ''
					}`}
				>
					{item.who === 'ollama' && OllamaAvatarPrerender}
					<div
						className={`right-0 flex flex-col mb-10 bg-zinc-100 dark:bg-zinc-900 border-solid border-neutral-200 dark:border-neutral-800  border rounded-xl p-2 w-[80%]`}
					>
						{item.txt?.map((txtItem, txtIndex) => {
							if (txtItem.type === 'text') {
								return <Text key={txtIndex} content={txtItem.content} />;
							} else if (txtItem.type === 'image') {
								return (
									<div key={txtIndex} className="relative group">
										<img
											src={txtItem.image}
											alt="attachment"
											className="max-w-full rounded-md ml-auto mr-auto"
										/>
										<div className="mt-2">
											<Text content={txtItem.content} />
										</div>
									</div>
								);
							}
						})}

						<div className="absolute bottom-[20px] text-xs text-neutral-500">
							{dayjs(item.created_at).format('HH:MM:ss')}
						</div>
					</div>
					{item.who === 'me' && (
						<div className="ml-2 mt-2.5 text-neutral-400">You</div>
					)}
				</div>
			))}
		</>
	);
});

const Text = memo(function Text({ content }: { content: string }) {
	return (
		<div className="relative group">
			<CopyButton
				className="absolute right-0 top-0 group-hover:opacity-100 opacity-0 transition-opacity"
				value={content}
			/>
			<Markdown
				className="text-left text-neutral-700 dark:text-neutral-300"
				components={{
					code(props) {
						const { children, className } = props;
						const match = /language-(\w+)/.exec(className || '');
						return (
							<div className="relative group/code">
								<CodeEditor
									disabled={true}
									contentEditable={false}
									className="bg-neutral-800 dark:bg-black rounded-md my-2"
									language={match?.[1] ?? 'text'}
									value={String(children)}
									data-color-mode="dark"
									style={{
										fontSize: 12,
										fontFamily:
											'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
									}}
								/>
								<CopyButton
									className="absolute right-2 top-2 group-hover/code:opacity-100 opacity-0 transition-opacity"
									value={content}
								/>
							</div>
						);
					},
				}}
			>
				{content}
			</Markdown>
		</div>
	);
});
