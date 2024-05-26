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

function fitSize(
	width: number,
	height: number,
	maxWidth: number,
	maxHeight: number,
): { width: number; height: number } {
	const ratio = Math.min(maxWidth / width, maxHeight / height);
	if (ratio >= 1) {
		return { width, height };
	}
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
			const size = fitSize(img.width, img.height, width, height);
			if (img.width <= size.width && img.height <= size.height) {
				resolve(file);
				return;
			}
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			canvas.width = size.width;
			canvas.height = size.height;
			ctx.drawImage(img, 0, 0, size.width, size.height);
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
