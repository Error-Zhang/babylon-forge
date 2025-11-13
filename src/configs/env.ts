interface EnvConfig {
	API_BASE_URL: string;
	DEBUG: boolean;
	TIMEOUT: number;
}

// 开发环境配置
const development: EnvConfig = {
	API_BASE_URL: 'http://localhost:3000/api',
	DEBUG: true,
	TIMEOUT: 5000,
};

// 生产环境配置
const production: EnvConfig = {
	API_BASE_URL: 'https://api.example.com/api',
	DEBUG: false,
	TIMEOUT: 100000,
};

// 根据环境变量选择配置
const getConfig = (): EnvConfig => {
	switch (process.env.NODE_ENV) {
		case 'production':
			return production;
		case 'development':
		default:
			return development;
	}
};

export const config = getConfig();
