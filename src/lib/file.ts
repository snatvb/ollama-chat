export function readAs64(file: File | Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve(reader.result as string);
		};
		reader.onerror = () => {
			reject(reader.error);
		};
		reader.readAsDataURL(file);
	});
}

export function fitSize(
	width: number,
	height: number,
	maxWidth: number,
	maxHeight: number,
): { width: number; height: number } {
	const ratio = Math.min(maxWidth / width, maxHeight / height);
	return { width: width * ratio, height: height * ratio };
}

export function resizeImage(
	file: File,
	width: number,
	height: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			if (img.width === width && img.height === height) {
				resolve(file);
				return;
			}
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			canvas.width = width;
			canvas.height = height;
			ctx.drawImage(img, 0, 0, width, height);
			canvas.toBlob((blob) => {
				if (!blob) {
					reject(new Error('Failed to resize image'));
					return;
				}
				resolve(blob);
			});
		};
		img.onerror = () => {
			reject(new Error('Failed to load image'));
		};
		img.src = URL.createObjectURL(file);
	});
}
