import { atom } from 'jotai';
import { atomPersist } from './persist';
import Immutable from 'immutable';
import { Model } from '@/core';

export const lastResponseTime = atom<number | undefined>(undefined);
export const generates = atom(Immutable.Set<string>());
export const connected = atom<boolean>(false);
export const visited = atomPersist(
	'VISITED',
	false,
	String,
	(x) => x === 'true',
);
export const models = atom<
	{ status: 'loading' } | { status: 'loaded'; value: Immutable.List<Model> }
>({ status: 'loading' });
export const model = atomPersist('OLLAMA_MODEL', undefined, String, String);
export const localAPI = atomPersist(
	'OLLAMA_LOCAL_API',
	'http://127.0.0.1:11435',
	String,
	String,
);