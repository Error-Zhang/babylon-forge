import '@/core/extends';
import GameApp from './entry/GameApp.ts';
import { PerformancePanel } from './debug/PerformancePanel.ts';
import { ENV_CONFIG } from './configs';
import { CanvasCoordinatePanel } from '@/debug/CanvasCoordinatePanel/CanvasCoordinatePanel.ts';
import Chrome from '@/misc/chrome.ts';
import { PropertyPanel } from '@/debug/PropertyPanel.ts';
import { panelManager } from '@/debug/PanelManager.ts';

const isDebugMode = ENV_CONFIG.DEBUG;
const useDebugPanel = ENV_CONFIG.USE_DEBUG_PANEL;

const App = () => {
	let app: GameApp;

	// 启动应用
	const start = async () => {
		const scene = Chrome.Query.get<string>('scene');

		app = new GameApp('game-canvas', isDebugMode ? 'debug' : 'high');
		await app.initialize(scene || 'ComponentDemoScene', { enablePhysics: true });

		if (useDebugPanel) {
			// 性能监控面板
			panelManager.create(PerformancePanel, {
				toggleKey: 'F1',
			});
			// Canvas坐标系可视化面板
			panelManager.create(CanvasCoordinatePanel, {
				toggleKey: 'F2',
			});
			// 属性面板
			panelManager.create(PropertyPanel, {
				toggleKey: 'F3',
				theme: 'dark',
				updateInterval: 500,
			});
		}
	};

	const stop = async () => {
		app.destroy();
		panelManager.destroyAll();
	};

	return { start, stop };
};

// 启动
App().start().catch(console.error);
