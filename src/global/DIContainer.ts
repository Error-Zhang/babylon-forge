export type DIToken<T> = any & { __type?: T };

class DIContainer {
	private static _instance: DIContainer;
	static get Instance() {
		return (this._instance ??= new DIContainer());
	}

	private services = new Map<any, any>();

	register<T>(token: DIToken<T>, instance: T) {
		const name = typeof token === 'string' ? token : token.name;
		if (this.services.has(token)) {
			const exist = this.services.get(name);
			if (exist === instance) console.logWarn(`Service '${name}' has already registered.`);
			else console.logError(`Service '${name}' has already registered but instance not same`);
			return;
		}
		this.services.set(token, instance);
	}
	has<T>(token: DIToken<T>): boolean {
		return this.services.has(token);
	}

	get<T>(token: DIToken<T>): T {
		const name = typeof token === 'string' ? token : token.name;
		if (!this.services.has(token)) {
			throw new Error(`Service '${name}' not registered`);
		}
		return this.services.get(token);
	}
}
export const diContainer = DIContainer.Instance;
