import { isRunningUpdate } from '@/app/helper';
import { state } from '@/app/state';
import { useSetAtom } from 'jotai';
import * as React from 'react';

/**
 * @description This hook will make sure that it will check every 30 seconds if the ollama server is running.
 */
export function useRunningPoll() {
	const setConnectionStatus = useSetAtom(state.app.connectionStatus);
	React.useEffect(() => {
		const timeoutID = setInterval(async () => {
			setConnectionStatus(
				(await isRunningUpdate()) ? 'connected' : 'connecting',
			);
		}, 1500);
		return () => {
			clearInterval(timeoutID);
		};
	}, []);
}
