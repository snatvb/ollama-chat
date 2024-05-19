import { atom } from 'jotai';
import { model, models } from './app';
import { record as conversationsAtom } from './conversation';

export type Element = 'new-conversation' | 'model' | 'none';

export const element = atom<Element>((get) => {
	if (get(models).status === 'loading') {
		return 'none';
	}
	if (get(model) === undefined) {
		return 'model';
	}
	const conversations = get(conversationsAtom);
	if (conversations.status === 'loaded' && conversations.value.size === 0) {
		return 'new-conversation';
	}
	return 'none';
});
