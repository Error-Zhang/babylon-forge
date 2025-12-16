import GameApp from './entry/GameApp.ts';
import { PerformancePanel } from './debug/PerformancePanel.ts';
import { ENV_CONFIG } from './configs';
import { CanvasCoordinatePanel } from '@/debug/CanvasCoordinatePanel/CanvasCoordinatePanel.ts';
import Chrome from '@/misc/chrome.ts';
import { PropertyPanel } from '@/debug/PropertyPanel.ts';

const isDebugMode = ENV_CONFIG.DEBUG;

const App = () => {
	let app: GameApp;
	let performancePanel: PerformancePanel;
	let canvasCoordinatePanel: CanvasCoordinatePanel;
	let propertyPanel: PropertyPanel;

	// 启动应用
	const start = async () => {
		const demoSceneName = Chrome.Query.get<string>('scene');

		app = new GameApp('game-canvas', isDebugMode ? 'debug' : 'high');
		await app.initialize(demoSceneName || 'PropertyTestDemo', { enablePhysics: true });

		if (isDebugMode) {
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

			// 属性面板
			propertyPanel = new PropertyPanel({
				toggleKey: 'F3',
				theme: 'dark',
				updateInterval: 500,
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
