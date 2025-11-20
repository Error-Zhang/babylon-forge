import GameApp from './entry/GameApp.ts';
import { PerformanceMonitor, PerformancePanel } from './debug/Performance.ts';
import { EnvConfig } from './configs';
import { SCENE_NAMES } from '@/entry/constants.ts';
import { diContainer } from '@/global/DIContainer.ts';

const App = () => {
	let app: GameApp | undefined;
	let performancePanel: PerformancePanel | undefined;
	let sceneSwitcher: any;

	// 启动应用
	const start = async () => {
		const isDebugMode = EnvConfig.DEBUG;
		app = new GameApp('game-canvas', isDebugMode ? 'debug' : 'high');
		await app.initialize(SCENE_NAMES.PhysicsDemoScene, { enablePhysics: true });

		if (isDebugMode) {
			diContainer.register('SceneManager', app.sceneManager);
			const performanceMonitor = new PerformanceMonitor();
			performancePanel = new PerformancePanel(performanceMonitor, { visible: true });
			performancePanel.start();
		}
	};

	const stop = async () => {
		app?.dispose();
		performancePanel?.destroy();
		sceneSwitcher?.dispose();
	};
	return { start, stop };
};

// 启动
App().start().catch(console.error);
