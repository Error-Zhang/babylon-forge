import { Vector3 } from '@babylonjs/core';
const vector3 = (value: { x: number; y: number; z: number } | [number, number, number]) => {
	return Vector3.FromArray(Array.isArray(value) ? value : [value.x, value.y, value.z]);
};
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
const EPSILON = 1e-6;
/**
 * 修正js中浮点数存在的偏差导致的问题
 * @param value
 * @param normal
 */
const correct = (value: number, normal: number): number => {
	if (normal > 0) {
		return Math.floor(value + EPSILON) - 1;
	} else if (normal < 0) {
		return Math.floor(value - EPSILON) + 1;
	} else {
		return Math.floor(value);
	}
};
/**
 * RLE 解压缩算法
 * @param compressed
 * @param decode
 */
const decompressRLE = (compressed: number[], decode?: (value: number, index: number) => number): Uint16Array | Uint8Array => {
	// 先计算解压后数组的长度
	let length = 0;
	for (let i = 1; i < compressed.length; i += 2) {
		length += compressed[i];
	}

	const result = length > 256 ? new Uint16Array(length) : new Uint8Array(length);
	let pos = 0;

	for (let i = 0; i < compressed.length; i += 2) {
		const value = compressed[i];
		const count = compressed[i + 1];
		for (let j = 0; j < count; j++) {
			result[pos++] = decode ? decode(value, pos) : value;
		}
	}

	return result;
};
const urlQuery = {
	/** 获取 URL 参数（自动解析 JSON / number / boolean） */
	get(key: string) {
		const params = new URLSearchParams(window.location.search);
		let v = params.get(key);
		if (v == null) return null;

		// JSON
		try {
			if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
				return JSON.parse(v);
			}
		} catch {}

		// boolean
		if (v === 'true') return true;
		if (v === 'false') return false;

		// number
		if (!isNaN(Number(v))) return Number(v);

		return v;
	},

	/** 设置某个参数（value 为 null 则删除） */
	set(key: string, value: any, options = { replace: false }) {
		const url = new URL(window.location.href);
		const params = url.searchParams;

		if (value === undefined || value === null) {
			params.delete(key);
		} else {
			if (typeof value === 'object') {
				params.set(key, JSON.stringify(value));
			} else {
				params.set(key, value);
			}
		}

		options.replace ? window.history.replaceState({}, '', url.toString()) : window.history.pushState({}, '', url.toString());
	},

	/** 删除某个参数 */
	remove(key: string, options = { replace: false }) {
		const url = new URL(window.location.href);
		url.searchParams.delete(key);

		options.replace ? window.history.replaceState({}, '', url.toString()) : window.history.pushState({}, '', url.toString());
	},

	/** 获取所有参数（带解析） */
	getAll() {
		const params = new URLSearchParams(window.location.search);
		const obj = {} as any;

		for (const [key, v] of params.entries()) {
			obj[key] = this.get(key);
		}
		return obj;
	},

	/** 清空所有参数 */
	clear(options = { replace: false }) {
		const url = new URL(window.location.href);
		url.search = '';

		options.replace ? window.history.replaceState({}, '', url.toString()) : window.history.pushState({}, '', url.toString());
	},
};

const utils = {
	vector3,
	debounce,
	throttle,
	sleep,
	decompressRLE,
	correct,
	urlQuery,
};

export default utils;
