import { diContainer, type DIToken } from '@/global/DIContainer.ts';

export function Inject<T>(token: DIToken<T>) {
	return function (value: undefined, context: ClassFieldDecoratorContext) {
		return () => diContainer.get(token);
	};
}

export function LogReturn(
	options:
		| {
				head?: string;
				color?: string;
				wrapperFn?: Function; // 节流/防抖函数
				wait?: number;
		  }
		| boolean
) {
	if (!options) {
		return function (orgFn: any, context: ClassMethodDecoratorContext | ClassGetterDecoratorContext) {
			return function (this: any, ...args: any[]) {
				return orgFn.apply(this, args);
			};
		};
	}

	const { head = 'LogReturn:', color = '#3f51b5', wrapperFn, wait = 1000 } = options instanceof Object ? options : {};

	return function (orgFn: Function, context: ClassMethodDecoratorContext | ClassGetterDecoratorContext) {
		const logFn = function (value: any) {
			console.log(
				`%c[${head}${context.name.toString()}]%c`,
				`color: #fff; background:${color}; padding:2px 4px; border-radius:4px;`,
				`color:${color}; font-weight:bold`,
				value
			);
		};

		const throttledLog = wrapperFn ? wrapperFn(logFn, wait) : logFn;

		return function (this: any, ...args: any[]) {
			const value = orgFn.apply(this, args);
			throttledLog(value);
			return value;
		};
	};
}
