import { Model, ollamaRequest } from '@/core';
import { useSetAtom } from 'jotai';
import { state } from './state';
import { useCallback } from 'react';
import { ResultAsync } from 'neverthrow';
import Immutable from 'immutable';
import { toast } from '@/components/ui/use-toast';
import { visionModels } from '@/core/config';

export async function tryConnect() {
	try {
		state.app.updateStatus('connecting');
		await ollamaRequest('GET', '');
		state.app.updateStatus('connected');
	} catch (error) {
		toast({
			variant: 'destructive',
			title: 'Error',
			description: 'Failed to connect to the server',
		});
	}
}

export async function isRunningUpdate() {
	try {
		await ollamaRequest('GET', '');
		return true;
	} catch (error) {
		return false;
	}
}

export function useRequestUpdateModels() {
	const setModels = useSetAtom(state.app.models);
	const setVisionModels = useSetAtom(state.app.visionModels);
	return useCallback(async () => {
		const res = await ResultAsync.fromPromise(
			ollamaRequest<{
				models: Model[];
			}>('GET', 'api/tags'),
			(e) => {
				console.error(e);
				return 'Failed to fetch models';
			},
		);
		res.match(
			({ data }) => {
				const [models, visions] = Immutable.List(data.models).partition(
					(model) => visionModels.some((name) => model.name.startsWith(name)),
				);
				setModels({
					status: 'loaded',
					value: Immutable.List(models),
				});
				setVisionModels({
					status: 'loaded',
					value: visions,
				});
			},
			(error) => {
				setModels({ status: 'loaded', value: Immutable.List() });
				setVisionModels({ status: 'loaded', value: Immutable.List() });
				toast({
					variant: 'destructive',
					title: 'Error',
					description: error,
				});
			},
		);
	}, [setModels]);
}

export function identity<A>(a: A): A {
	return a;
}
