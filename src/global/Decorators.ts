import { diContainer, type DIToken } from '@/global/DIContainer.ts';
import { INJECT_TOKENS } from '@/entry/constants.ts';
import { ENV_CONFIG } from '@/configs';

export function Inject<T>(token: DIToken<T>) {
	return function (value: undefined, context: ClassFieldDecoratorContext) {
		return () => diContainer.get(token) as any;
	};
}

export function LogReturn(
	options?: {
		head?: string;
		color?: string;
		wrapperFn?: Function; // 节流/防抖函数
		wait?: number;
	},
	on: boolean = ENV_CONFIG.DEBUG
) {
	const { head = 'LogReturn:', color = '#3f51b5', wrapperFn, wait = 1000 } = options ?? {};

	return function (orgFn: Function, context: ClassMethodDecoratorContext | ClassGetterDecoratorContext) {
		const logFn = on
			? function (value: any) {
					console.logDebug(`[${head}${context.name.toString()}]`, value);
				}
			: () => {};

		const throttledLog = wrapperFn ? wrapperFn(logFn, wait) : logFn;

		return function (this: any, ...args: any[]) {
			const value = orgFn.apply(this, args);
			throttledLog(value);
			return value;
		};
	};
}
export { FieldMonitor } from './FieldMonitorDecorator';
