export type DIToken<T> = string & { __type?: T };

class DIContainer {
	private static _instance: DIContainer;
	static get Instance() {
		return (this._instance ??= new DIContainer());
	}

	private services = new Map<string, any>();

	register<T>(token: DIToken<T>, instance: T) {
		this.services.set(token, instance);
	}

	get<T>(token: DIToken<T>): T {
		if (!this.services.has(token)) {
			throw new Error(`Service '${token}' not registered`);
		}
		return this.services.get(token);
	}
}
export const diContainer = DIContainer.Instance;
