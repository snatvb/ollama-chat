import { state } from '@/app/state';
import axios, { AxiosResponse } from 'axios';

export type Model = {
	digest: string;
	model: string;
	modified_at: string;
	name: string;
	size: number;
	details: {
		families: string[];
		family: string;
		format: string;
		parameter_size: string;
		parent_model: string;
		quantization_level: string;
	};
};

export async function ollamaRequest<R = any>(
	method: 'GET' | 'POST',
	path: string,
	c?: { data?: any },
): Promise<AxiosResponse<R, any>> {
	try {
		const res = await axios({
			method,
			url: `${state.app.takeAPIUrl()}/${path}`,
			data: c?.data,
			headers: {
				'Content-Type': 'application/json',
			},
		});

		return res;
	} catch (error) {
		state.app.updateStatus('connecting');
		throw error;
	}
}

export async function ollamaGenerate(
	prompt: string,
	model: string,
	context?: number[],
) {
	try {
		const res = await ollamaRequest('POST', 'api/generate', {
			data: {
				model,
				prompt,
				context,
			},
		});

		return res.data;
	} catch (error) {
		throw error;
	}
}

function fetchOllama(body: string, onProgress: (chunk: string) => void) {
	return fetch(`${state.app.takeAPIUrl()}/api/generate`, {
		body,
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
	}).then((response) => {
		if (response.ok && response.body) {
			const reader = response.body
				.pipeThrough(new TextDecoderStream())
				.getReader();

			function readStream(): Promise<string | undefined> {
				return reader.read().then(({ value, done }) => {
					if (done) {
						reader.cancel();
						return Promise.resolve(value);
					}

					// parse the data
					const data = /{.*}/.exec(value);
					if (!data || !data[0]) {
						return readStream();
					}

					onProgress(data[0]);

					// do something if success
					// and cancel the stream
					// reader.cancel().catch(() => null);
					return readStream();
				});
			}
			return readStream();
		} else {
			return Promise.reject(response);
		}
	});
}

export type Peace = {
	model: string;
	created_at: string;
	response: string;
	done: false;
};
export type Done = {
	model: string;
	created_at: string;
	response: '';
	done: true;
	context: number[];
	total_duration: number;
	load_duration: number;
	prompt_eval_duration: number;
	eval_count: number;
	eval_duration: number;
};

type Chunk = Peace | Done;

export const ollama = {
	generate(
		params: {
			model: string;
			prompt: string;
			context?: number[];
		},
		onProgress: (peace: Peace) => void,
	) {
		return new Promise<Done>((resolve, reject) => {
			fetchOllama(JSON.stringify(params), (chunk) => {
				const item: Chunk = JSON.parse(chunk);
				if (item.done) {
					resolve(item);
				} else {
					onProgress(item);
				}
			}).catch(reject);
		});
	},
};

export async function ollamaRecognize(
	prompt: string,
	model: string,
	images: string[],
	context?: number[],
) {
	try {
		// const res = await ollamaRequest('POST', 'api/generate', {
		// 	data: {
		// 		model,
		// 		prompt,
		// 		images,
		// 		context,
		// 	},
		// });

		const res = await axios({
			method: 'POST',
			url: `${state.app.takeAPIUrl()}/api/generate`,
			data: {
				model,
				prompt,
				images,
				context,
				stream: true,
			},
			// headers: {
			// 	'Content-Type': 'application/json',
			// },
			responseType: 'stream',
		});

		return res.data;
	} catch (error) {
		throw error;
	}
}

export interface OllamaResult {
	model: string;
	created_at: string;
	response: string;
	context?: number[];
	done: boolean;
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	prompt_eval_duration?: number;
	eval_count?: number;
	eval_duration?: number;
}

export function convertTextToJson(inputText: string): OllamaResult[] {
	const lines = inputText.trim().split('\n');
	const jsonArray = [];

	for (const line of lines) {
		const jsonObject = JSON.parse(line);
		jsonArray.push(jsonObject);
	}

	return jsonArray;
}

export const formatBytes = (bytes: number, decimals = 2) => {
	if (!+bytes) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
export function trimWhitespace(str: string): string {
	return str.replace(/^[\s\xA0]+|[\s\xA0]+$/g, '');
}
