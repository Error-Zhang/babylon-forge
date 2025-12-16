import Chrome from '@/misc/chrome.ts';

interface EnvConfig {
	DEBUG: boolean;
}

// 开发环境配置
const development: EnvConfig = {
	DEBUG: true,
};

// 生产环境配置
const production: EnvConfig = {
	DEBUG: false,
};

// 根据环境变量选择配置
const getConfig = (): EnvConfig => {
	let config;
	const isDebug = Chrome.Query.safeGet<boolean>('DEBUG');

	if (process.env.NODE_ENV === 'production') config = production;
	else config = development;

	if (isDebug) production.DEBUG = isDebug;

	return config;
};

// 在index中导出并重新定义了别名
export const config = getConfig();
