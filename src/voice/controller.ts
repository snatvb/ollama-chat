import { random } from '@/lib/random';

type SentenceSequence = string[];

const MAX_SEQUENCE_LENGTH = 100;

class Audios {
	private audios: HTMLAudioElement[] = [];
	private playCursor = 0;
	private resolve!: () => void;
	private reject!: (error: Error) => void;
	private playing = false;
	private destroyed = false;
	public promise: Promise<void>;

	constructor(private targetAmount: number) {
		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}

	add(audio: HTMLAudioElement) {
		this.audios.push(audio);
	}

	play() {
		if (this.playing || this.destroyed) {
			return;
		}
		this.playing = true;
		this.audios[this.playCursor].play();
		this.audios[this.playCursor].onended = () => {
			this.playCursor++;
			if (this.playCursor === this.targetAmount) {
				this.resolve();
				return;
			}
			this.playing = false;
			if (this.playCursor < this.audios.length) {
				this.play();
			}
		};
		this.audios[this.playCursor].onerror = (error) => {
			console.error(error);
			this.reject(new Error('Failed to play audio'));
		};
	}

	destroy() {
		this.destroyed = true;
		this.audios.forEach((audio) => {
			audio.pause();
			audio.src = '';
		});
	}
}

export class VoiceController {
	public promise: Promise<void>;
	private sequence: SentenceSequence = [];
	private active = true;
	private resolve!: () => void;
	private reject!: (error: Error) => void;
	private audios: Audios;
	private seed: number;

	get sentences() {
		return this.sequence as Readonly<SentenceSequence>;
	}

	constructor(content: string) {
		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
		while (true) {
			const nextSequence = this.getNextSequence(content);
			if (nextSequence.length === 0) {
				break;
			}
			this.sequence.push(nextSequence);
			content = content.slice(nextSequence.length);
		}
		this.audios = new Audios(this.sequence.length);
		this.seed = random.int(10, 100000);
	}

	private getNextSequence(content: string): string {
		if (content.length <= MAX_SEQUENCE_LENGTH) {
			return content;
		}
		const sequence = content.slice(0, MAX_SEQUENCE_LENGTH);
		const lastSpaceIndex = sequence.lastIndexOf(' ');
		return lastSpaceIndex > 0 ? sequence.slice(0, lastSpaceIndex) : sequence;
	}

	private preload(url: string) {
		return new Promise<string>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = 'blob';
			request.onload = function () {
				if (this.status == 200) {
					resolve(URL.createObjectURL(this.response));
				}
			};
			request.onerror = reject;
			request.send();
		});
	}

	private async speak(peace: string) {
		const result: { prompt: string; filename: string } = await fetch(
			'http://localhost:55000/bark',
			{
				method: 'POST',
				body: JSON.stringify({ prompt: peace, seed: this.seed }),
				headers: {
					'Content-Type': 'application/json',
				},
			},
		).then((res) => {
			if (res.status !== 200) {
				throw res;
			}
			return res.json();
		});
		const objectUrl = await this.preload(
			`http://localhost:55000/bark-out/${result.filename}`,
		);
		await fetch(`http://localhost:55000/bark-out/${result.filename}`, {
			method: 'DELETE',
		});
		const audio = new Audio(objectUrl);
		audio.onload = () => {
			console.log('loaded');
		};
		if (!this.active) {
			return;
		}
		this.audios.add(audio);
		this.audios.play();
	}

	private async loop() {
		for await (const peace of this.sequence) {
			if (!this.active) {
				return;
			}
			try {
				await this.speak(peace);
			} catch (error) {
				console.error(error);
				this.reject(new Error('Failed to speak'));
				return;
			}
		}
		await this.audios.promise;
		this.resolve();
	}

	start() {
		this.loop();
	}
	stop() {
		this.active = false;
	}
}
