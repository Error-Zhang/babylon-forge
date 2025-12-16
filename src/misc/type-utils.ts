export type ConstructorOf<T> = abstract new (...args: any[]) => T;
export type OptionalKeys<T> = {
	[K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type RequiredKeys<T> = {
	[K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalProps<T> = Pick<T, OptionalKeys<T>>;

export type RequiredProps<T> = Pick<T, RequiredKeys<T>>;
