import { atom } from 'jotai';
import { atomPersist } from './persist';
import Immutable from 'immutable';
import { Model } from '@/core';
import { store } from './store';

export type ConnectionStatus = 'connecting' | 'disconnected' | 'connected';

export const lastResponseTime = atom<number | undefined>(undefined);
export type Generate =
	| {
			type: 'text';
			text: string;
	  }
	| {
			type: 'image';
			text: string;
	  };
export const generates = atom(Immutable.Map<string, Generate>());
export const connectionStatus = atom<ConnectionStatus>('connecting');
export const connected = atom((get) => get(connectionStatus) === 'connected');
export const visited = atomPersist(
	'VISITED',
	false,
	String,
	(x) => x === 'true',
);

export type ModelsAtom =
	| {
			status: 'loading';
	  }
	| {
			status: 'loaded';
			value: Immutable.List<Model>;
	  };

export const models = atom<ModelsAtom>({ status: 'loading' });
export const visionModels = atom<ModelsAtom>({ status: 'loading' });

export const model = atomPersist('OLLAMA_MODEL', undefined, String, String);
export const visionModel = atomPersist(
	'OLLAMA_VISION_MODEL',
	undefined,
	String,
	String,
);

export const localAPI = atomPersist(
	'OLLAMA_LOCAL_API',
	'http://127.0.0.1:11435',
	String,
	String,
);

export function takeAPIUrl() {
	return store.get(localAPI);
}

export function updateStatus(status: ConnectionStatus) {
	store.set(connectionStatus, status);
}
