export const random = {
	int: (min: number, max: number) =>
		Math.floor(Math.random() * (max - min + 1)) + min,
	float: (min: number, max: number) => Math.random() * (max - min) + min,
	bool: () => Math.random() < 0.5,
	item: <T>(array: T[] | string) => array[random.int(0, array.length - 1)],
	chance: (percent: number) => Math.random() < percent,
	shuffle: <T>(array: T[]) => {
		const shuffled = array.slice();
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	},
	date: (start: Date, end: Date) =>
		new Date(random.int(start.getTime(), end.getTime())),
	key: (length: number) =>
		Array.from({ length }, () =>
			random.item(
				'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
			),
		).join(''),
	uuid: () => [8, 4, 4, 4, 12].map((length) => random.key(length)).join('-'),
	color: () => `#${random.key(6)}`,
	hex: (length: number) => random.key(length),
	rgb: () => Array.from({ length: 3 }, () => random.int(0, 255)),
	rgba: () => [...random.rgb(), random.float(0, 1)],
	hsl: () => [random.int(0, 360), random.int(0, 100), random.int(0, 100)],
	hsla: () => [...random.hsl(), random.float(0, 1)],
};
