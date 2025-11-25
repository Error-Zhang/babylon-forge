import GameApp from './entry/GameApp.ts';
import { PerformanceMonitor, PerformancePanel } from './debug/Performance.ts';
import { CanvasCoordinatePanelFactory } from './debug/CanvasCoordinatePanelFactory.ts';
import { ENV_CONFIG } from './configs';
import { diContainer } from '@/global/DIContainer.ts';
import utils from '@/utils';
import { SceneManager } from '@/managers/SceneManager.ts';
import type { CanvasCoordinatePanel } from '@/debug/CanvasCoordinatePanel.ts';

const isDebugMode = ENV_CONFIG.DEBUG;

const App = () => {
	let app: GameApp;
	let performancePanel: PerformancePanel;
	let canvasCoordinatePanel: CanvasCoordinatePanel;

	// 启动应用
	const start = async () => {
		const demoSceneName = utils.urlQuery.get('scene');

		app = new GameApp('game-canvas', isDebugMode ? 'debug' : 'high');
		await app.initialize(demoSceneName || 'TestSceneComponentDemo', { enablePhysics: true });

		if (isDebugMode) {
			diContainer.register(SceneManager, app.sceneManager);

			// 性能监控面板
			performancePanel = new PerformancePanel({ theme: 'light', position: 'top-right' });
			performancePanel.start();

			// Canvas坐标系可视化面板
			canvasCoordinatePanel = CanvasCoordinatePanelFactory.createPanel({
				theme: 'light',
				position: 'top-left',
				canvasHeight: 300,
				pipSize: 100,
				updateInterval: 100,
			});
			canvasCoordinatePanel.start();
		}
	};

	const stop = async () => {
		app?.dispose();
		performancePanel?.destroy();
		canvasCoordinatePanel?.destroy();
	};

	return { start, stop };
};

// 启动
App().start().catch(console.error);
