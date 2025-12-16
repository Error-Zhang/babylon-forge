import type { ConstructorOf } from '@/misc/type-utils.ts';
export interface IPanel {
	destroy: () => void;
	start: () => void;
}

class PanelManager {
	#panels: IPanel[] = [];

	create<T>(clazz: ConstructorOf<T>, ...args: ConstructorParameters<ConstructorOf<T>>): T {
		const panel = Reflect.construct(clazz, args);
		this.#panels.push(panel);
		panel.start();
		return panel;
	}

	destroyAll(): void {
		this.#panels.forEach((panel) => panel.destroy());
	}
}

export const panelManager = new PanelManager();
