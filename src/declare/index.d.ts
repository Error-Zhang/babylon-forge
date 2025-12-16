import HK from '@babylonjs/havok';
declare global {
	interface Window {
		HK?: HK;
	}
	interface Console {
		logSuccess(...args: any[]): void;
		logInfo(...args: any[]): void;
		logWarn(...args: any[]): void;
		logError(...args: any[]): void;
		logDebug(...args: any[]): void;
		logLoading(...args: any[]): void;
		logCustom(options: { prefix: string; color: string; method?: string }, ...args: any[]): void;
	}
}
