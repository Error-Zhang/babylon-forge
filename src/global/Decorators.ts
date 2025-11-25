import { diContainer, type DIToken } from '@/global/DIContainer.ts';
import { INJECT_TOKENS } from '@/entry/constants.ts';
import { ENV_CONFIG } from '@/configs';

export function Inject<T>(token: DIToken<T>) {
	return function (value: undefined, context: ClassFieldDecoratorContext) {
		if (token === INJECT_TOKENS.CurrentScene && !diContainer.has(token)) {
			console.logError(`please use '${INJECT_TOKENS.CurrentScene}' Inject in SceneComponent 'onCreated' hook or use 'yield scene' before. `);
		}
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
	off: boolean = !ENV_CONFIG.DEBUG
) {
	const { head = 'LogReturn:', color = '#3f51b5', wrapperFn, wait = 1000 } = options ?? {};

	return function (orgFn: Function, context: ClassMethodDecoratorContext | ClassGetterDecoratorContext) {
		const logFn = !off
			? function (value: any) {
					console.log(
						`%c[${head}${context.name.toString()}]%c`,
						`color: #fff; background:${color}; padding:2px 4px; border-radius:4px;`,
						`color:${color}; font-weight:bold`,
						value
					);
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
