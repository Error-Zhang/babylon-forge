function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
	let lastCall = 0;
	return function (this: any, ...args: Parameters<T>) {
		const now = Date.now();
		if (now - lastCall >= limit) {
			lastCall = now;
			return func.apply(this, args);
		}
	};
}

function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return function (this: any, ...args: Parameters<T>) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), delay);
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const utils = {
	debounce,
	throttle,
	sleep,
};

export default utils;
