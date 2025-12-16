(function installConsoleLog() {
	const baseStyle = 'font-weight: 700; padding: 1px 3px';

	const createLogger = (method, prefix, color) => {
		return function (...args) {
			console[method](`%c${prefix}`, `color:${color};${baseStyle}`, ...args);
		};
	};

	const proto = Object.getPrototypeOf(console);
	if (!proto) return;

	// Only define if not already defined
	if (!proto.logSuccess) proto.logSuccess = createLogger('log', '✔ Success', '#0a0');
	if (!proto.logInfo) proto.logInfo = createLogger('log', 'ℹ Info', '#06c');
	if (!proto.logWarn) proto.logWarn = createLogger('trace', '⚠ Warn', '#d9a400');
	if (!proto.logError) proto.logError = createLogger('trace', '✖ Error', '#e33');
	if (!proto.logDebug) proto.logDebug = createLogger('trace', 'Debug', '#000');
	if (!proto.logLoading) proto.logLoading = createLogger('log', 'Loading', 'purple');
	if (!proto.logCustom) {
		proto.logCustom = function ({ prefix, color, method }, ...args) {
			console[method || 'log'](`%c${prefix || ''}`, `color:${color || '#000'};${baseStyle}`, ...args);
		};
	}
})();
