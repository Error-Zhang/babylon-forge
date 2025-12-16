import type { Nullable } from '@babylonjs/core';

namespace Chrome {
	export const Query = {
		/** 获取 URL 参数（自动解析 JSON / number / boolean） */
		get<T>(key: string): Nullable<T> {
			const params = new URLSearchParams(window.location.search);
			let v = params.get(key);
			if (v == null) return null as T;

			// JSON
			try {
				if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
					return JSON.parse(v);
				}
			} catch {}

			// boolean
			if (v === 'true') return true as T;
			if (v === 'false') return false as T;

			// number
			if (!isNaN(Number(v))) return Number(v) as T;

			return v as T;
		},
		safeGet<T>(key: string): Nullable<T> {
			Array.from([key, key.toLowerCase(), key.toUpperCase(), key.replace(/^[a-z]/, (c) => c.toUpperCase()), key.toWellFormed()]).forEach(
				(value) => {
					if (this.get(value)) return value as T;
				}
			);
			return null;
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
		getAll(): Record<string, any> {
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
}

export default Chrome;
