import GameApp from './entry/GameApp.ts';
import { PerformancePanel } from './debug/Performance.ts';
import { ENV_CONFIG } from './configs';
import { diContainer } from '@/global/DIContainer.ts';
import { SceneManager } from '@/managers/SceneManager.ts';
import { CanvasCoordinatePanel } from '@/debug/CanvasCoordinatePanel/CanvasCoordinatePanel.ts';
import chrome from '@/utils/chrome.ts';
import { PropertyPanel } from '@/debug/PropertyPanel.ts';

const isDebugMode = ENV_CONFIG.DEBUG;

const App = () => {
	let app: GameApp;
	let performancePanel: PerformancePanel;
	let canvasCoordinatePanel: CanvasCoordinatePanel;
	let propertyPanel: PropertyPanel;

	// 启动应用
	const start = async () => {
		const demoSceneName = chrome.urlQuery.get('scene');

		app = new GameApp('game-canvas', isDebugMode ? 'debug' : 'high');
		await app.initialize(demoSceneName || 'PropertyTestDemo', { enablePhysics: true });

		if (isDebugMode) {
			diContainer.register(SceneManager, app.sceneManager);

			// 性能监控面板
			performancePanel = new PerformancePanel({
				toggleKey: 'F1',
			});
			performancePanel.start();

			// Canvas坐标系可视化面板
			canvasCoordinatePanel = new CanvasCoordinatePanel({
				toggleKey: 'F2',
			});
			canvasCoordinatePanel.start();

			propertyPanel = new PropertyPanel({
				toggleKey: 'F3',
				theme: 'dark',
			});
			propertyPanel.start();
		}
	};

	const stop = async () => {
		app?.dispose();
		performancePanel?.destroy();
		canvasCoordinatePanel?.destroy();
		propertyPanel?.destroy();
	};

	return { start, stop };
};

// 启动
App().start().catch(console.error);
