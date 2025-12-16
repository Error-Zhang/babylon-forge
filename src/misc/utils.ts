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

	export function nextTick(mode: 'micro' | 'message' | 'frame' | 'default' = 'default') {
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
				default:
					return new Promise((resolve) => setTimeout(resolve));
			}
		} catch (e) {
			console.warn(e);
			return new Promise((resolve) => setTimeout(resolve));
		}
	}

	type ImmediateTask = {
		action: () => void;
		order: number;
		seq: number; // 保证稳定排序
	};

	let ImmediateQueue: ImmediateTask[] = [];
	let seqCounter = 0;

	/**
	 * Execute a function after the current execution block
	 * @param action defines the action to execute
	 * @param order lower value = higher priority
	 */
	export function setImmediate(action: () => void, order = 0) {
		if (ImmediateQueue.length === 0) {
			setTimeout(() => {
				const tasks = ImmediateQueue;
				ImmediateQueue = [];

				// 排序：order → seq（稳定）
				tasks.sort((a, b) => a.order - b.order || a.seq - b.seq).forEach((task) => task.action());
			}, 1);
		}

		ImmediateQueue.push({
			action,
			order,
			seq: seqCounter++,
		});
	}

	async function measureTime(fn: Function, prefix?: string) {
		const t0 = performance.now();
		await fn();
		const t1 = performance.now();
		console.logCustom({ prefix: prefix ?? fn.name }, `Execution time: ${(t1 - t0).toFixed(3)} ms`);
	}
}

export default Utils;
