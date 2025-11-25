import { CanvasCoordinatePanel, type CanvasCoordinatePanelConfig } from './CanvasCoordinatePanel';
import { CoordinateSystemMonitor } from './CoordinateSystemMonitor';

/**
 * Canvas坐标系面板工厂
 * 用于创建和管理Canvas坐标系面板实例
 */
export class CanvasCoordinatePanelFactory {
	private static instance: CanvasCoordinatePanel | null = null;
	private static monitor: CoordinateSystemMonitor | null = null;

	/**
	 * 创建Canvas坐标系面板
	 */
	public static createPanel(config?: Partial<CanvasCoordinatePanelConfig>): CanvasCoordinatePanel {
		if (!this.monitor) {
			this.monitor = new CoordinateSystemMonitor({
				updateInterval: 100,
				precision: 2,
			});
		}

		if (!this.instance) {
			this.instance = new CanvasCoordinatePanel(this.monitor, {
				visible: false,
				position: 'top-left',
				title: '坐标系可视化',
				width: '350px',
				height: 'auto',
				canvasHeight: 300,
				showGrid: true,
				showAxes: true,
				defaultView: '2d',
				toggleKey: 'F2', // 默认切换键
				...config,
			});
		}

		return this.instance;
	}

	/**
	 * 获取现有面板实例
	 */
	public static getInstance(): CanvasCoordinatePanel | null {
		return this.instance;
	}

	/**
	 * 销毁面板实例
	 */
	public static destroyPanel() {
		if (this.instance) {
			this.instance.destroy();
			this.instance = null;
		}
		if (this.monitor) {
			this.monitor.destroy();
			this.monitor = null;
		}
	}

	/**
	 * 切换面板显示状态
	 */
	public static togglePanel() {
		if (!this.instance) {
			this.createPanel();
		}
		this.instance!.toggle();
	}
}
