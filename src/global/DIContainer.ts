export type DIToken<T> = any & { __type?: T };

class DIContainer {
	private static _instance: DIContainer;
	static get Instance() {
		return (this._instance ??= new DIContainer());
	}

	private services = new Map<string, any>();

	replace<T>(token: DIToken<T>, instance: T) {
		this.services.set(this.keyOf(token), instance);
	}

	remove<T>(token: DIToken<T>) {
		this.services.delete(this.keyOf(token));
	}

	keyOf<T>(token: DIToken<T>): string {
		if (typeof token === 'function') {
			if (token.name) return token.name;
			return token().name;
		}
		return token;
	}

	register<T>(token: DIToken<T>, instance: T) {
		const key = this.keyOf(token);
		if (this.services.has(key)) {
			const exist = this.services.get(key);
			if (exist === instance) console.logWarn(`Service '${key}' has already registered.`);
			else console.logError(`Service '${key}' has already registered but instance not same`);
			return;
		}
		this.services.set(key, instance);
	}

	has<T>(token: DIToken<T>): boolean {
		return this.services.has(this.keyOf(token));
	}

	get<T>(token: DIToken<T>): T {
		const key = this.keyOf(token);
		if (!this.services.has(key)) {
			throw new Error(`Service '${key}' not registered`);
		}
		return this.services.get(key);
	}
}
export const diContainer = DIContainer.Instance;
