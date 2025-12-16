import Chrome from '@/misc/chrome.ts';

interface EnvConfig {
	DEBUG: boolean;
	USE_DEBUG_PANEL: boolean;
}

// 开发环境配置
const development: EnvConfig = {
	DEBUG: true,
	USE_DEBUG_PANEL: true,
};

// 生产环境配置
const production: EnvConfig = {
	DEBUG: false,
	USE_DEBUG_PANEL: false,
};

// 根据环境变量选择配置
const getConfig = (): EnvConfig => {
	let config;
	const { debug, debugPanel } = Chrome.Query.getAll();

	if (process.env.NODE_ENV === 'production') config = production;
	else config = development;

	if (debug) production.DEBUG = debug;
	if (debugPanel) production.USE_DEBUG_PANEL = debugPanel;

	return config;
};

// 在index中导出并重新定义了别名
export const config = getConfig();
