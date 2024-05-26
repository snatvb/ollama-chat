import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import Immutable from 'immutable';
import { atomPersist, atomWithAsyncStorage, db } from './persist';
import { store } from './store';
import { generates } from './app';
import { identity } from '../helper';

export type Message = {
	created_at: Date;
	txt: {
		content: string;
		type: 'text';
	}[];
	who: 'ollama' | 'me';
	name?: string;
};

export interface Conversation {
	id: string;
	model: string;
	ctx: number[];
	chatHistory: Message[];
	name?: string;
	createdAt: number;
}

export type Conversations = Immutable.Map<string, Conversation>;

export function emptyConversations(): Conversations {
	return Immutable.Map();
}

export async function loadConversationsFromDB(): Promise<Conversations> {
	try {
		const storedConversations = await db.load('conversations');
		if (!storedConversations) {
			return emptyConversations();
		}
		return Immutable.Map(JSON.parse(storedConversations ?? '[]'));
	} catch (error) {
		console.error(error);
		return emptyConversations();
	}
}
export const migrated = atomPersist('MIGRATED_FROM_LS', false, String, Boolean);

const currentId = atomPersist<string | undefined>(
	'CURRENT_CHAT_ID',
	undefined,
	identity,
	identity,
);
export const record = atomWithAsyncStorage(
	async () => loadConversationsFromDB(),
	async (value) => {
		await db.save('conversations', JSON.stringify(value.toJSON()));
	},
);

const currentChat = atom((get) => {
	const id = get(currentId);
	const recordResult = get(record);
	if (!id) {
		return { status: 'loaded' as const, value: undefined };
	}
	if (recordResult.status === 'loading') {
		return { status: 'loading' as const };
	}
	if (recordResult.status === 'loaded') {
		return {
			status: 'loaded' as const,
			value: recordResult.value.get(id),
		};
	}
	return { status: 'loaded' as const, value: undefined };
});

export const current = {
	id: currentId,
	generating: atom((get) => {
		const id = get(currentId);
		if (!id) {
			return false;
		}
		return get(generates).has(id);
	}),
	generatingText: atom((get) => {
		const id = get(currentId);
		if (!id) {
			return undefined;
		}
		return get(generates).get(id);
	}),
	model: selectAtom(currentChat, (chat) => chat.value?.model),
	chat: currentChat,
};

export function updateConversation(
	id: string,
	onUpdateItem: (item: Conversation) => Conversation,
) {
	store.set(record, (rec) => {
		const item = rec.get(id);
		if (!item) {
			return rec;
		}

		return rec.set(id, onUpdateItem(item));
	});
}

export function appendHistoryConversation(id: string, msg: Message) {
	store.set(record, (rec) => {
		const item = rec.get(id);
		if (!item) {
			console.error(`No conversation found ${id}`);
			return rec;
		}

		return rec.set(id, {
			...item,
			chatHistory: [...item.chatHistory, msg],
		});
	});
}
