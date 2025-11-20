(function installConsoleLog() {
	const _style = 'font-weight: 700; padding: 1px 6px; border-radius: 3px;';
	const _extends = {
		logSuccess: function logSuccess(...args) {
			try {
				const prefix = '✔ Success';
				const style = 'color: #0a0;';
				this.log(`%c${prefix}`, style + _style, ...args);
			} catch (e) {
				console.log('Success:', ...args);
			}
		},

		logInfo: function logInfo(...args) {
			try {
				const prefix = 'ℹ Info';
				const style = 'color: #06c; ';
				this.log(`%c${prefix}`, style + _style, ...args);
			} catch (e) {
				console.log('Info:', ...args);
			}
		},

		logWarn: function logWarn(...args) {
			try {
				const prefix = '⚠ Warn';
				const style = 'color: #d9a400; ';
				this.warn(`%c${prefix}`, style + _style, ...args);
			} catch (e) {
				console.warn('Warn:', ...args);
			}
		},

		logError: function logError(...args) {
			try {
				const prefix = '✖ Error';
				const style = 'color: #e33; ';
				this.error(`%c${prefix}`, style + _style, ...args);
			} catch (e) {
				console.error('Error:', ...args);
			}
		},

		logDebug: function logDebug(...args) {
			try {
				const prefix = 'Debug';
				const style = 'color: purple; ';
				this.debug(`%c${prefix}`, style + _style, ...args);
			} catch (e) {
				console.debug('Debug:', ...args);
			}
		},

		logLoading: function logLoading(...args) {
			try {
				const prefix = '⏳ Loading';
				const style = 'color: #000;';
				this.log(`%c${prefix}`, style + _style, ...args);
			} catch (e) {
				console.log('Loading:', ...args);
			}
		},
	};
	const proto = Object.getPrototypeOf(console);

	if (proto == null) return;

	for (const key in _extends) {
		if (proto.hasOwnProperty(key)) return;

		Object.defineProperty(proto, key, {
			configurable: true,
			writable: false,
			enumerable: false,
			value: _extends[key],
		});
	}
})();
