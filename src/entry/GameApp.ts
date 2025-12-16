import { type InitConfig, WebGPUApplication } from '../core/WebGpuStarter.ts';
import { SceneManager } from '../managers/SceneManager.ts';
import { SCENE_MAPPINGS } from '@/entry/constants.ts';
import { Singleton } from '@/global/Singleton.ts';
import { diContainer } from '@/global/DIContainer.ts';

class GameApp extends WebGPUApplication {
	protected override async onInitialize(sceneKey: string, config: InitConfig) {
		await this.initSceneManager(sceneKey, config);
	}

	private async initSceneManager(sceneKey: string, config: InitConfig) {
		return Singleton.createPromise(SceneManager, config)
			.then((instance) => {
				instance.registerDemoScenes(SCENE_MAPPINGS);
				return instance;
			})
			.finally(() => {
				diContainer.register(SceneManager, SceneManager.Instance);
			})
			.then(async (instance) => {
				await instance.loadScene(sceneKey);
				this.addRenderLoop(instance.render);
			});
	}

	protected override onRender(dt: number) {}

	public dispose() {
		Singleton.disposeAll();
	}
}

export default GameApp;
