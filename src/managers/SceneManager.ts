import { Scene } from '@babylonjs/core';
import { DemoSceneClass } from '@/global/DemoSceneClass.ts';
import { INJECT_TOKENS, SCENE_MAPPINGS } from '@/entry/constants.ts';
import { type Ref, useRef } from '@/core/reactivity';
import { diContainer } from '@/global/DIContainer.ts';
import type { InitConfig } from '@/core/WebGpuStarter.ts';
import utils from '@/utils';

export class SceneManager {
	private sceneMap: Map<string, new () => DemoSceneClass> = new Map();
	private _currentScene?: Scene;

	private _isLoadingRef = useRef(false);

	constructor(private config: InitConfig) {
		diContainer.register(INJECT_TOKENS.IsSceneLoading, this._isLoadingRef);
	}

	get currentScene() {
		return this._currentScene;
	}

	public registerScene(key: string, sceneClass: { new (): DemoSceneClass }) {
		this.sceneMap.set(key, sceneClass);
		return this;
	}

	public registerDemoScenes(sceneMappings: Record<string, () => Promise<any>>) {
		// 注册所有预定义的场景
		Object.entries(sceneMappings).forEach(([key, importFn]) => {
			// 使用一个包装类来实现懒加载场景，以及后续拓展
			class SceneWrapper extends DemoSceneClass {
				async create(config: InitConfig) {
					const SceneClass = await importFn();
					const instance = new SceneClass();
					return instance.create(config);
				}
			}

			this.registerScene(key, SceneWrapper);
		});
		return this;
	}

	public async loadScene(sceneKey: string) {
		if (this._isLoadingRef.value) {
			console.logWarn('Scene is already loading, please wait...');
			return;
		}

		try {
			this._isLoadingRef.value = true;

			if (!this.sceneMap.has(sceneKey)) {
				console.logError(`Scene with key '${sceneKey}' is not registered`);
				return;
			}

			this.disposeCurrentScene();

			const importFn = SCENE_MAPPINGS[sceneKey as keyof typeof SCENE_MAPPINGS];
			if (!importFn) {
				console.logError(`No import function found for scene '${sceneKey}'`);
				return;
			}

			console.logLoading(`waiting for '${sceneKey}'`);

			const SceneClass = await importFn();
			const sceneInstance = new SceneClass() as DemoSceneClass;

			this._currentScene = await sceneInstance.create(this.config);
			this._currentScene.metadata ??= {};
			this._currentScene.metadata.name = sceneKey;

			utils.url_query.set('scene', sceneKey);

			return this._currentScene;
		} catch (error) {
			throw new Error(`Failed to load scene '${sceneKey}' Because ${error}`);
		} finally {
			if (!this._currentScene) this._isLoadingRef.value = false;
			this._currentScene?.executeWhenReady(() => {
				console.logSuccess(`'${sceneKey}' is fully ready, you can execute the next stage.`);
				this._isLoadingRef.value = false;
			});
		}
	}

	public render() {
		this._currentScene?.render();
	}

	public disposeCurrentScene() {
		this._currentScene?.dispose();
	}

	public getAvailableScenes(): string[] {
		return Array.from(this.sceneMap.keys());
	}

	public get isLoadingSceneRef(): Ref<boolean> {
		return this._isLoadingRef;
	}

	public dispose(): void {
		this.disposeCurrentScene();
		this._isLoadingRef.value = false;
	}
}
