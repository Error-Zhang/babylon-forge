namespace Utils {
	export function debounce<T extends (...args: any[]) => any>(func: T, delay: number) {
		let timeout: ReturnType<typeof setTimeout> | null = null;
		return function (this: any, ...args: Parameters<T>) {
			if (timeout) clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), delay);
		};
	}

	export function throttle<T extends (...args: any[]) => any>(func: T, limit: number) {
		let lastCall = 0;
		return function (this: any, ...args: Parameters<T>) {
			const now = Date.now();
			if (now - lastCall >= limit) {
				lastCall = now;
				func.apply(this, args);
			}
		};
	}

	export function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	export function nextTick(mode: 'micro' | 'message' | 'frame' = 'frame') {
		try {
			switch (mode) {
				case 'micro':
					return Promise.resolve();
				case 'message':
					return new Promise<void>((resolve) => {
						const c = new MessageChannel();
						c.port1.onmessage = () => resolve();
						c.port2.postMessage(null);
					});
				case 'frame':
					return new Promise<void>((resolve) => {
						requestAnimationFrame(() => resolve());
					});
			}
		} catch (e) {
			console.warn(e);
			return new Promise((resolve) => setTimeout(resolve));
		}
	}
}

export default Utils;
