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

const chrome = {
	urlQuery,
};

export default chrome;
