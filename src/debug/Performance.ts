import { WebGPUEngine, Scene, type Nullable } from '@babylonjs/core';
import { type Ref, useRef, useWatch } from '@/core/reactivity';
import { Inject } from '@/global/Decorators.ts';
import { SceneManager } from '@/managers/SceneManager.ts';

export interface BabylonPerformanceMetrics {
	// 基础性能
	fps: number;
	deltaTime: number;

	// 渲染统计
	totalVertices: number;
	totalMeshes: number;
	activeMeshes: number;
	activeIndices: number;
	activeParticles: number;

	// 材质和纹理
	totalMaterials: number;
	totalTextures: number;
	activeTextures: number;

	// 灯光和相机
	totalLights: number;
	activeLights: number;
	totalCameras: number;

	// 内存使用
	memoryUsage?: {
		used: number;
		total: number;
		percentage: number;
		memoryRatio: number;
	};

	// WebGPU引擎信息
	engineInfo: GPUDevice;
}

export interface BabylonMonitorConfig {
	sampleSize?: number;
	enableMemoryMonitoring?: boolean;
}

export class PerformanceMonitor {
	@Inject('Engine')
	private readonly engine!: WebGPUEngine;

	@Inject('MineScene')
	private readonly scene!: Scene;

	@Inject('SceneManager')
	private readonly sceneManager!: SceneManager;

	private config: Required<BabylonMonitorConfig>;
	private isRunning: boolean = false;

	// 历史数据
	private fpsHistory: number[] = [];
	private vertexHistory: number[] = [];

	constructor(config: BabylonMonitorConfig = {}) {
		this.config = {
			sampleSize: config.sampleSize || 60,
			enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
		};
	}

	/**
	 * 开始监控
	 */
	public start() {
		if (this.isRunning) {
			console.warn('Babylon performance monitor is already running');
			return;
		}

		this.isRunning = true;

		// 清空历史数据
		this.fpsHistory = [];
		this.vertexHistory = [];

		console.logDebug('Babylon performance monitoring started');
	}

	/**
	 * 停止监控
	 */
	public stop() {
		if (!this.isRunning) {
			console.warn('Babylon performance monitor is not running');
			return;
		}

		this.isRunning = false;
		console.log('Babylon performance monitoring stopped');
	}

	public getCurrentSceneInfo() {
		const availableScenes = this.sceneManager.getAvailableScenes();
		const currentScene = this.sceneManager.currentScene;
		const isLoading = this.sceneManager.isLoadingSceneRef;

		// 尝试从场景名称中提取场景类型
		let currentSceneName = 'Unknown';
		if (currentScene && currentScene.metadata) {
			currentSceneName = currentScene.metadata.sceneName || 'Unknown';
		}

		return {
			currentScene: currentSceneName,
			availableScenes,
			isLoading,
		};
	}

	/**
	 * 切换场景
	 */
	public async switchScene(sceneKey: string): Promise<boolean> {
		return await this.sceneManager.loadScene(sceneKey);
	}

	/**
	 * 获取完整的性能指标
	 */
	public getMetrics(): BabylonPerformanceMetrics {
		// 渲染统计
		const totalVertices = this.scene.getTotalVertices();
		const totalMeshes = this.scene.meshes.length;
		const activeMeshes = this.scene.getActiveMeshes().length;
		const activeIndices = this.scene.getActiveIndices();
		const activeParticles = this.scene.getActiveParticles();

		// 材质和纹理
		const totalMaterials = this.scene.materials.length;
		const totalTextures = this.scene.textures.length;
		const activeTextures = this.engine.getLoadedTexturesCache().length;

		// 灯光和相机
		const totalLights = this.scene.lights.length;
		const activeLights = this.scene.lights.filter((light) => light.isEnabled()).length;
		const totalCameras = this.scene.cameras.length;

		const fps = this.engine.getFps();
		// 更新历史数据
		this.updateHistoryData(fps, totalVertices);

		const metrics: BabylonPerformanceMetrics = {
			fps: Math.round(fps * 100) / 100,
			deltaTime: this.engine.getDeltaTime(),

			totalVertices,
			totalMeshes,
			activeMeshes,
			activeIndices,
			activeParticles,

			totalMaterials,
			totalTextures,
			activeTextures,

			totalLights,
			activeLights,
			totalCameras,

			engineInfo: this.engine._device,
		};

		// 添加内存信息
		if (this.config.enableMemoryMonitoring && 'memory' in performance) {
			const memory = performance.memory as any;
			metrics.memoryUsage = {
				used: Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100,
				total: Math.round((memory.totalJSHeapSize / 1024 / 1024) * 100) / 100,
				percentage: +((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(2),
				memoryRatio: +((memory.totalJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2),
			};
		}

		return metrics;
	}

	/**
	 * 更新历史数据
	 */
	private updateHistoryData(fps: number, vertices: number) {
		this.fpsHistory.push(fps);
		this.vertexHistory.push(vertices);

		// 保持历史数据大小
		if (this.fpsHistory.length > this.config.sampleSize) {
			this.fpsHistory.shift();
			this.vertexHistory.shift();
		}
	}

	/**
	 * 获取历史数据
	 */
	public getHistoryData() {
		return {
			fps: [...this.fpsHistory],
			vertices: [...this.vertexHistory],
		};
	}

	/**
	 * 重置统计数据
	 */
	public reset() {
		this.fpsHistory = [];
		this.vertexHistory = [];
	}

	/**
	 * 销毁监控器
	 */
	public destroy() {
		this.stop();
	}
}

/**
 * Babylon.js 性能面板配置
 */
interface BabylonPanelConfig {
	visible?: boolean;
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	theme?: 'dark' | 'light';
	updateInterval?: number;
	showGraphs?: boolean;
	showEngineInfo?: boolean;
	minimized?: boolean;
	draggable?: boolean;
	showCurveSelector?: boolean;
	performanceThresholds?: PerformanceThresholds;
}

/**
 * 性能临界值配置接口
 */
interface PerformanceThresholds {
	// FPS 临界值
	criticalFps: number; // 严重警告的FPS阈值
	warningFps: number; // 警告的FPS阈值

	// 顶点数临界值
	criticalVertexCount: number; // 严重警告的顶点数阈值
	warningVertexCount: number; // 警告的顶点数阈值

	// 网格数临界值
	criticalMeshCount: number; // 严重警告的网格数阈值
	warningMeshCount: number; // 警告的网格数阈值
}

/**
 * Babylon.js 完整性能监控面板
 */
export class PerformancePanel {
	private monitor: PerformanceMonitor;
	private config: Required<BabylonPanelConfig>;
	private panelElement: HTMLDivElement;
	private updateTimer: number | null = null;
	private isVisibleRef: Ref<boolean> = useRef(false);
	private isMinimizedRef: Ref<boolean> = useRef(false);

	// 场景管理相关
	private currentSceneInfo = {
		currentScene: 'Unknown',
		availableScenes: [] as string[],
		isLoading: { value: false } as Ref<boolean>,
	};

	// 图表相关
	private canvas?: HTMLCanvasElement;
	private ctx?: CanvasRenderingContext2D;
	private selectedCurves: Set<string> = new Set(['fps']);
	private availableCurves = [
		{ id: 'fps', label: 'FPS', color: '#4CAF50', dataKey: 'fps', minVal: 0, maxVal: 120, offsetY: 0.2 },
		{ id: 'vertices', label: '顶点数', color: '#2196F3', dataKey: 'vertices', minVal: 0, maxVal: 10000, offsetY: 0.4 },
		{ id: 'meshes', label: '网格数', color: '#FF9800', dataKey: 'activeMeshes', minVal: 0, maxVal: 100, offsetY: 0.6 },
		{ id: 'particles', label: '粒子数', color: '#9C27B0', dataKey: 'activeParticles', minVal: 0, maxVal: 1000, offsetY: 0.8 },
		{ id: 'lights', label: '灯光数', color: '#FF5722', dataKey: 'activeLights', minVal: 0, maxVal: 50, offsetY: 0.4 },
	];

	// 事件处理函数引用，用于清理
	private eventHandlers = {
		toggleFun: (event: KeyboardEvent) => this.toggleFun(event),
		minimizeHandler: () => {
			this.isMinimizedRef.value = !this.isMinimizedRef.value;
		},
		closeHandler: () => {
			this.isVisibleRef.value = false;
		},
		dragStartHandler: (e: MouseEvent) => this.handleDragStart(e),
		dragMoveHandler: (e: MouseEvent) => this.handleDragMove(e),
		dragEndHandler: () => this.handleDragEnd(),
		curveCheckboxHandlers: new Map<string, EventListener>(),
		sceneSelectorHandler: (e: Event) => this.handleSceneChange(e),
	};

	// 默认性能阈值配置
	private defaultPerformanceThresholds: PerformanceThresholds = {
		criticalFps: 30,
		warningFps: 45,
		criticalVertexCount: 50000,
		warningVertexCount: 20000,
		criticalMeshCount: 800,
		warningMeshCount: 400,
	};

	constructor(monitor: PerformanceMonitor, config: BabylonPanelConfig = {}) {
		this.monitor = monitor;
		this.config = {
			visible: config.visible ?? false,
			position: config.position || 'top-right',
			theme: config.theme || 'dark',
			updateInterval: config.updateInterval || 500,
			showGraphs: config.showGraphs ?? true,
			showEngineInfo: config.showEngineInfo ?? true,
			minimized: config.minimized || false,
			draggable: config.draggable ?? true,
			showCurveSelector: config.showCurveSelector ?? true,
			performanceThresholds: config.performanceThresholds || this.defaultPerformanceThresholds,
		};

		this.isVisibleRef.value = this.config.visible;
		this.isMinimizedRef.value = this.config.minimized;

		// 初始化场景信息
		this.currentSceneInfo = this.monitor.getCurrentSceneInfo();

		this.panelElement = this.createPanelElement();
		this.setupEventListeners();
		document.body.appendChild(this.panelElement);

		useWatch(
			this.isVisibleRef,
			() => {
				this.toggle();
			},
			{ immediate: true }
		);
		useWatch(
			this.isMinimizedRef,
			() => {
				this.updatePanelLayout();
			},
			{ immediate: true }
		);

		useWatch(this.currentSceneInfo.isLoading, () => {
			this.updateSceneLoading();
		});
	}

	private readonly toggleFun = (event: any) => {
		// F1: 切换性能面板显示/隐藏
		if (event.key === 'F1') {
			event.preventDefault();
			this.isVisibleRef.value = !this.isVisibleRef.value;
		}
	};

	/**
	 * 设置性能面板控制快捷键
	 */
	private setupControls() {
		document.addEventListener('keydown', this.eventHandlers.toggleFun);
	}

	/**
	 * 开始监控
	 */
	public start() {
		this.monitor.start();
		this.startUpdateTimer();
		this.setupControls();
	}

	/**
	 * 停止监控
	 */
	public stop() {
		this.monitor.stop();
		this.stopUpdateTimer();
	}

	/**
	 * 显示/隐藏面板
	 */
	public toggle() {
		this.panelElement.style.display = this.isVisibleRef.value ? 'block' : 'none';
	}

	/**
	 * 获取活跃网格历史数据
	 */
	private getActiveMeshesHistory(): number[] {
		// 从当前metrics中获取活跃网格数
		const metrics = this.monitor.getMetrics();
		return [metrics.activeMeshes];
	}

	/**
	 * 获取活跃粒子历史数据
	 */
	private getActiveParticlesHistory(): number[] {
		const metrics = this.monitor.getMetrics();
		return [metrics.activeParticles];
	}

	/**
	 * 获取活跃灯光历史数据
	 */
	private getActiveLightsHistory(): number[] {
		const metrics = this.monitor.getMetrics();
		return [metrics.activeLights];
	}

	/**
	 * 获取活跃纹理历史数据
	 */
	private getActiveTexturesHistory(): number[] {
		const metrics = this.monitor.getMetrics();
		return [metrics.activeTextures];
	}

	/**
	 * 销毁面板
	 */
	public destroy() {
		this.stop();
		this.cleanupEventListeners();
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
			this.updateTimer = null;
		}
		this.panelElement.parentNode?.removeChild(this.panelElement);
	}

	/**
	 * 清理所有事件监听器
	 */
	private cleanupEventListeners() {
		// 清理键盘快捷键事件
		document.removeEventListener('keydown', this.eventHandlers.toggleFun);

		// 清理按钮事件
		const minimizeBtn = this.panelElement.querySelector('.minimize-btn') as HTMLButtonElement;
		const closeBtn = this.panelElement.querySelector('.close-btn') as HTMLButtonElement;

		minimizeBtn.removeEventListener('click', this.eventHandlers.minimizeHandler);

		closeBtn.removeEventListener('click', this.eventHandlers.closeHandler);

		// 清理场景选择器事件
		const sceneDropdown = this.panelElement.querySelector('.scene-dropdown') as HTMLSelectElement;
		sceneDropdown.removeEventListener('change', this.eventHandlers.sceneSelectorHandler);

		// 清理拖拽事件
		const header = this.panelElement.querySelector('.panel-header') as HTMLElement;
		header.removeEventListener('mousedown', this.eventHandlers.dragStartHandler);

		// 清理曲线选择器事件
		this.cleanupCurveSelectorListeners();

		// 清理可能存在的鼠标移动和释放事件
		document.removeEventListener('mousemove', this.eventHandlers.dragMoveHandler);
		document.removeEventListener('mouseup', this.eventHandlers.dragEndHandler);
	}

	/**
	 * 处理场景切换
	 */
	private async handleSceneChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const selectedScene = target.value;

		if (!selectedScene || selectedScene === this.currentSceneInfo.currentScene) {
			return;
		}

		const success = await this.monitor.switchScene(selectedScene);
		if (success) {
			this.currentSceneInfo.currentScene = selectedScene;
		}
	}

	/**
	 * 清理曲线选择器的事件监听器
	 */
	private cleanupCurveSelectorListeners() {
		const checkboxes = this.panelElement.querySelectorAll('.curve-checkbox input[type="checkbox"]');
		checkboxes.forEach((checkbox: Element) => {
			const inputCheckbox = checkbox as HTMLInputElement;
			const curveId = inputCheckbox.value;

			// 从Map中获取并移除事件处理函数
			const handler = this.eventHandlers.curveCheckboxHandlers.get(curveId);
			if (handler) {
				inputCheckbox.removeEventListener('change', handler);
				this.eventHandlers.curveCheckboxHandlers.delete(curveId);
			}
		});
	}

	/**
	 * 创建面板元素
	 */
	private createPanelElement(): HTMLDivElement {
		const panel = document.createElement('div');
		panel.className = 'babylon-performance-panel';
		panel.innerHTML = this.getPanelHTML();
		this.applyStyles(panel);
		return panel;
	}

	/**
	 * 应用样式
	 */
	private applyStyles(panel: HTMLDivElement) {
		const isDark = this.config.theme === 'dark';

		const baseStyles = `
	      position: fixed;
	      z-index: 10000;
	      font-family: 'Consolas', 'Monaco', monospace;
	      font-size: 11px;
	      background: ${isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
	      color: ${isDark ? '#ffffff' : '#000000'};
	      border: 1px solid ${isDark ? '#333' : '#ccc'};
	      border-radius: 6px;
	      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	      backdrop-filter: blur(10px);
	      min-width: 280px;
	      max-width: 350px;
	      user-select: none;
	      
	      /* 隐藏滚动条 */
	      scrollbar-width: none; /* Firefox */
	      -ms-overflow-style: none; /* IE and Edge */
	    `;

		const positionStyles = this.getPositionStyles();
		panel.style.cssText = baseStyles + positionStyles;
		this.addInternalStyles();
	}

	/**
	 * 获取位置样式
	 */
	private getPositionStyles(): string {
		const margin = '20px';
		switch (this.config.position) {
			case 'top-left':
				return `top: ${margin}; left: ${margin};`;
			case 'top-right':
				return `top: ${margin}; right: ${margin};`;
			case 'bottom-left':
				return `bottom: ${margin}; left: ${margin};`;
			case 'bottom-right':
				return `bottom: ${margin}; right: ${margin};`;
			default:
				return `top: ${margin}; right: ${margin};`;
		}
	}

	/**
	 * 设置事件监听器
	 */
	private setupEventListeners() {
		const header = this.panelElement.querySelector('.panel-header') as HTMLElement;
		const minimizeBtn = this.panelElement.querySelector('.minimize-btn') as HTMLButtonElement;
		const closeBtn = this.panelElement.querySelector('.close-btn') as HTMLButtonElement;
		const sceneDropdown = this.panelElement.querySelector('.scene-dropdown') as HTMLSelectElement;

		// 设置按钮事件
		minimizeBtn.addEventListener('click', this.eventHandlers.minimizeHandler);
		closeBtn.addEventListener('click', this.eventHandlers.closeHandler);

		// 设置场景选择器事件
		sceneDropdown.addEventListener('change', this.eventHandlers.sceneSelectorHandler);

		if (this.config.draggable) {
			this.setupDragFunctionality(header);
		}

		if (this.config.showGraphs) {
			this.canvas = this.panelElement.querySelector('.performance-graph') as HTMLCanvasElement;
			this.ctx = this.canvas?.getContext('2d') || undefined;

			// 设置曲线选择器事件
			this.setupCurveSelector();
		}
	}

	/**
	 * 设置曲线选择器事件
	 */
	private setupCurveSelector() {
		const checkboxes = this.panelElement.querySelectorAll('.curve-checkbox input[type="checkbox"]');
		checkboxes.forEach((checkbox: Element) => {
			const inputCheckbox = checkbox as HTMLInputElement;
			const curveId = inputCheckbox.value;

			// 创建事件处理函数
			const handler = (e: Event) => {
				const target = e.target as HTMLInputElement;
				if (target.checked) {
					this.selectedCurves.add(curveId);
				} else {
					this.selectedCurves.delete(curveId);
				}
			};

			// 存储处理函数引用
			this.eventHandlers.curveCheckboxHandlers.set(curveId, handler);
			inputCheckbox.addEventListener('change', handler);
		});
	}

	// 拖拽状态变量
	private isDragging = false;
	private dragStartX = 0;
	private dragStartY = 0;
	private dragStartLeft = 0;
	private dragStartTop = 0;

	/**
	 * 设置拖拽功能
	 */
	private setupDragFunctionality(header: HTMLElement) {
		header.addEventListener('mousedown', this.eventHandlers.dragStartHandler);
	}

	/**
	 * 处理拖拽开始
	 */
	private handleDragStart(e: MouseEvent) {
		this.isDragging = true;
		this.dragStartX = e.clientX;
		this.dragStartY = e.clientY;
		const rect = this.panelElement.getBoundingClientRect();
		this.dragStartLeft = rect.left;
		this.dragStartTop = rect.top;

		document.addEventListener('mousemove', this.eventHandlers.dragMoveHandler);
		document.addEventListener('mouseup', this.eventHandlers.dragEndHandler);
		e.preventDefault();
	}

	/**
	 * 处理拖拽移动
	 */
	private handleDragMove(e: MouseEvent) {
		if (!this.isDragging) return;

		const deltaX = e.clientX - this.dragStartX;
		const deltaY = e.clientY - this.dragStartY;

		this.panelElement.style.left = `${this.dragStartLeft + deltaX}px`;
		this.panelElement.style.top = `${this.dragStartTop + deltaY}px`;
		this.panelElement.style.right = 'auto';
		this.panelElement.style.bottom = 'auto';
	}

	/**
	 * 处理拖拽结束
	 */
	private handleDragEnd() {
		this.isDragging = false;
		document.removeEventListener('mousemove', this.eventHandlers.dragMoveHandler);
		document.removeEventListener('mouseup', this.eventHandlers.dragEndHandler);
	}

	/**
	 * 开始更新定时器
	 */
	private startUpdateTimer() {
		this.updateTimer = window.setInterval(() => {
			this.updateDisplay();
		}, this.config.updateInterval);
	}

	/**
	 * 停止更新定时器
	 */
	private stopUpdateTimer() {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
			this.updateTimer = null;
		}
		this.cleanupEventListeners();
	}

	/**
	 * 更新显示
	 */
	private updateDisplay() {
		const metrics = this.monitor.getMetrics();
		this.updateMetricsDisplay(metrics);

		if (this.config.showGraphs) {
			this.updateGraph(metrics);
		}

		this.updateStatusIndicator(metrics);
	}

	/**
	 * 更新指标显示
	 */
	private updateMetricsDisplay(metrics: BabylonPerformanceMetrics) {
		// 基础性能
		this.updateElement('.fps-value', metrics.fps.toFixed(1));
		this.updateElement('.deltatime-value', `${metrics.deltaTime.toFixed(1)}ms`);

		// 渲染统计
		this.updateElement('.vertices-value', this.formatNumber(metrics.totalVertices));
		this.updateElement('.meshes-value', `${metrics.activeMeshes}/${metrics.totalMeshes}`);
		this.updateElement('.particles-value', metrics.activeParticles.toString());
		this.updateElement('.indices-value', this.formatNumber(metrics.activeIndices));

		// 材质和纹理
		this.updateElement('.materials-value', metrics.totalMaterials.toString());
		this.updateElement('.textures-value', `${metrics.activeTextures}/${metrics.totalTextures}`);

		// 灯光和相机
		this.updateElement('.lights-value', `${metrics.activeLights}/${metrics.totalLights}`);
		this.updateElement('.cameras-value', metrics.totalCameras.toString());

		// 内存使用
		if (metrics.memoryUsage) {
			this.updateElement('.memory-value', `${metrics.memoryUsage.used.toFixed(2)}MB`);
			this.updateElement('.memory-total-value', `${metrics.memoryUsage.total.toFixed(2)}MB`);
			this.updateElement('.memory-percent-value', `${metrics.memoryUsage.percentage}%`);
			this.updateElement('.memory-ratio-value', `${metrics.memoryUsage.memoryRatio}%`);
		}

		// WebGPU引擎信息
		if (this.config.showEngineInfo) {
			this.updateWebGPUInfo(metrics);
		}

		// 更新FPS颜色
		const fpsElement = this.panelElement.querySelector('.fps-value') as HTMLElement;
		if (fpsElement) {
			fpsElement.className = 'metric-value fps-value';
			const thresholds = this.config.performanceThresholds;
			if (metrics.fps < thresholds.criticalFps) {
				fpsElement.classList.add('critical');
			} else if (metrics.fps < thresholds.warningFps) {
				fpsElement.classList.add('warning');
			}
		}
	}

	/**
	 * 更新WebGPU信息
	 */
	private updateWebGPUInfo(metrics: BabylonPerformanceMetrics) {
		const engineInfo = metrics.engineInfo;

		// 渲染类型
		this.updateElement('.render-type-value', engineInfo.label || '');

		// 设备信息
		this.updateElement('.device-vendor-value', engineInfo.adapterInfo.vendor || 'Unknown');
		this.updateElement('.device-architecture-value', engineInfo.adapterInfo.architecture || 'Unknown');
	}

	/**
	 * 更新元素内容
	 */
	private updateElement(selector: string, value: string) {
		const element = this.panelElement.querySelector(selector) as HTMLElement;
		if (element) {
			element.textContent = value;
		}
	}

	/**
	 * 格式化数字
	 */
	private formatNumber(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toString();
	}

	/**
	 * 更新图表
	 */
	private updateGraph(metrics: BabylonPerformanceMetrics) {
		if (!this.canvas || !this.ctx) return;

		const historyData = this.monitor.getHistoryData();
		this.drawBabylonGraph(historyData);
	}

	/**
	 * 绘制曲线
	 */
	private drawCurve(data: number[], color: string, minVal: number, maxVal: number, offsetY: number) {
		if (!this.ctx || !this.canvas) return;

		const ctx = this.ctx;
		const { width, height } = this.canvas;
		const graphHeight = height * 0.25;

		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5;
		ctx.beginPath();

		data.forEach((value, index) => {
			const x = (index / (data.length - 1)) * width;
			const normalizedValue = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
			const y = offsetY + (1 - normalizedValue) * graphHeight;

			if (index === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});

		ctx.stroke();
	}

	/**
	 * 绘制Babylon.js特有的多曲线图表
	 */
	private drawBabylonGraph(historyData: any) {
		if (!this.canvas || !this.ctx) return;

		const { width, height } = this.canvas;
		const ctx = this.ctx;

		ctx.clearRect(0, 0, width, height);

		if (historyData.fps.length < 2) return;

		// 根据选择的曲线绘制
		this.availableCurves.forEach((curve) => {
			if (this.selectedCurves.has(curve.id)) {
				const data = this.getCurveData(curve, historyData);
				if (data && data.length > 1) {
					this.drawCurve(data, curve.color, curve.minVal, curve.maxVal, height * curve.offsetY);
				}
			}
		});
	}

	/**
	 * 获取指定曲线的数据
	 */
	private getCurveData(curve: any, historyData: any): number[] | null {
		switch (curve.id) {
			case 'fps':
				return historyData.fps;
			case 'vertices':
				return historyData.vertices || [];
			case 'meshes':
				return this.getActiveMeshesHistory();
			case 'particles':
				return this.getActiveParticlesHistory();
			case 'lights':
				return this.getActiveLightsHistory();
			case 'textures':
				return this.getActiveTexturesHistory();
			default:
				return null;
		}
	}

	/**
	 * 更新状态指示器
	 */
	private updateStatusIndicator(metrics: BabylonPerformanceMetrics) {
		const statusElement = this.panelElement.querySelector('.status-indicator') as HTMLElement;
		const statusText = this.panelElement.querySelector('.status-text') as HTMLElement;

		if (!statusElement || !statusText) return;

		statusElement.className = 'status-indicator';

		// Babylon.js 性能评估 - 基于FPS和渲染复杂度
		const vertexCount = metrics.totalVertices;
		const meshCount = metrics.totalMeshes;
		const activeMeshCount = metrics.activeMeshes;
		const thresholds = this.config.performanceThresholds;

		if (metrics.fps < thresholds.criticalFps || vertexCount > thresholds.criticalVertexCount || activeMeshCount > thresholds.criticalMeshCount) {
			statusElement.classList.add('critical');
			statusText.textContent = '性能严重不足';
		} else if (
			metrics.fps < thresholds.warningFps ||
			vertexCount > thresholds.warningVertexCount ||
			activeMeshCount > thresholds.warningMeshCount
		) {
			statusElement.classList.add('warning');
			statusText.textContent = '性能需要优化';
		} else {
			statusElement.classList.add('good');
			statusText.textContent = '性能良好';
		}
	}

	private updateSceneLoading() {
		const loadingIndicator = this.panelElement.querySelector('.loading-indicator');
		const sceneDropdown = this.panelElement.querySelector<HTMLSelectElement>('.scene-dropdown')!;
		const isLoading = this.currentSceneInfo.isLoading.value;
		sceneDropdown.style.cursor = isLoading ? 'not-allowed' : 'pointer';
		sceneDropdown.style.opacity = isLoading ? '0.6' : '1';
		sceneDropdown.disabled = isLoading;
		loadingIndicator?.setAttribute('style', isLoading ? '' : 'display:none');
	}

	/**
	 * 更新面板布局
	 */
	private updatePanelLayout() {
		const minimizeBtn = this.panelElement.querySelector('.minimize-btn') as HTMLButtonElement;

		if (this.isMinimizedRef.value) {
			this.panelElement.classList.add('minimized');
			minimizeBtn.textContent = '+';
			minimizeBtn.title = '展开';
		} else {
			this.panelElement.classList.remove('minimized');
			minimizeBtn.textContent = '−';
			minimizeBtn.title = '最小化';
		}
	}

	/**
	 * 获取面板HTML结构
	 */
	private getPanelHTML(): string {
		const sceneOptions = this.currentSceneInfo.availableScenes
			.map((scene) => `<option value="${scene}" ${scene === this.currentSceneInfo.currentScene ? 'selected' : ''}>${scene}</option>`)
			.join('');

		return `
      <div class="panel-header">
        <span class="panel-title">性能监控</span>
        <div class="panel-controls">
          <button class="minimize-btn" title="最小化">−</button>
          <button class="close-btn" title="关闭">×</button>
        </div>
      </div>
      <div class="scene-section">
        <div class="scene-selector">
          <label for="scene-selector" class="scene-label">当前场景:</label>
          <select id="scene-selector" name="scene-selector" class="scene-dropdown" ${this.currentSceneInfo.isLoading ? 'disabled' : ''}>
            ${sceneOptions}
          </select>
          <span class="loading-indicator">加载中...</span>
        </div>
      </div>
      <div class="status-section">
          <div class="status-indicator good">
            <span class="status-text">性能良好</span>
          </div>
        </div>
      <div class="panel-content">
        <div class="metrics-section">
          <div class="metric-group">
            <h4>基础性能</h4>
            <div class="metric-item">
              <span class="metric-label">FPS:</span>
              <span class="metric-value fps-value">0</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Delta时间:</span>
              <span class="metric-value deltatime-value">0ms</span>
            </div>
          </div>
          
          <div class="metric-group">
            <h4>渲染统计</h4>
            <div class="metric-item">
              <span class="metric-label">顶点数:</span>
              <span class="metric-value vertices-value">0</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">活跃网格:</span>
              <span class="metric-value meshes-value">0</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">活跃粒子:</span>
              <span class="metric-value particles-value">0</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">活跃索引:</span>
              <span class="metric-value indices-value">0</span>
            </div>
          </div>
          
          <div class="metric-group">
            <h4>资源统计</h4>
            <div class="metric-item">
              <span class="metric-label">材质:</span>
              <span class="metric-value materials-value">0</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">纹理:</span>
              <span class="metric-value textures-value">0</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">灯光:</span>
              <span class="metric-value lights-value">0</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">相机:</span>
              <span class="metric-value cameras-value">0</span>
            </div>
          </div>
          
          <div class="metric-group memory-group">
            <h4>内存使用</h4>
            <div class="metric-item">
              <span class="metric-label">已使用:</span>
              <span class="metric-value memory-value">0MB</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">已分配:</span>
              <span class="metric-value memory-total-value">0MB</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">使用率:</span>
              <span class="metric-value memory-percent-value">0%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">占可用内存:</span>
              <span class="metric-value memory-ratio-value">0%</span>
            </div>
          </div>
        </div>
        ${
			this.config.showGraphs
				? `
        <div class="graph-section">
          ${
				this.config.showCurveSelector
					? `
          <div class="curve-selector">
            <label>显示曲线:</label>
            <div class="curve-checkboxes">
              ${this.availableCurves
					.map(
						(curve) => `
                <label class="curve-checkbox">
                  <input type="checkbox" value="${curve.id}" ${this.selectedCurves.has(curve.id) ? 'checked' : ''}>
                  <span class="curve-color" style="background-color: ${curve.color}"></span>
                  ${curve.label}
                </label>
              `
					)
					.join('')}
            </div>
          </div>`
					: ''
			}
          <canvas class="performance-graph" width="300" height="120"></canvas>
        </div>
        `
				: ''
		}
        ${
			this.config.showEngineInfo
				? `
        <div class="engine-info-section">
          <h4>设备信息</h4>
          <div class="engine-info">
            <div class="info-item">
              <span class="info-label">渲染器:</span>
              <span class="info-value render-type-value">WebGPU</span>
            </div>
            <div class="info-item">
              <span class="info-label">厂商:</span>
              <span class="info-value device-vendor-value">-</span>
            </div>
            <div class="info-item">
              <span class="info-label">API:</span>
              <span class="info-value device-architecture-value">-</span>
            </div>
          </div>
        </div>
        `
				: ''
		}
      </div>
    `;
	}

	/**
	 * 添加内部样式
	 */
	private addInternalStyles() {
		if (document.getElementById('babylon-performance-panel-styles')) return;

		const isDark = this.config.theme === 'dark';
		const style = document.createElement('style');
		style.id = 'babylon-performance-panel-styles';
		style.textContent = `
	      .babylon-performance-panel::-webkit-scrollbar {
	        display: none; /* Chrome, Safari, Opera */
	      }
	      
	      .babylon-performance-panel .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
        border-bottom: 1px solid ${isDark ? '#333' : '#ddd'};
        cursor: ${this.config.draggable ? 'move' : 'default'};
      }
      
      .babylon-performance-panel .panel-title {
        font-weight: bold;
        font-size: 12px;
      }
      
      .babylon-performance-panel .panel-controls {
        display: flex;
        gap: 4px;
      }
      
      .babylon-performance-panel .panel-controls button {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 14px;
        line-height: 1;
      }
      
      .babylon-performance-panel .panel-controls button:hover {
        background: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
      }
      
      .babylon-performance-panel .panel-content {
        padding: 12px;
        max-height: 70vh;
        overflow-y: auto;
        
        /* 隐藏滚动条 */
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE and Edge */
      }
      
      .babylon-performance-panel .panel-content::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
      }
      
      .babylon-performance-panel .metric-group {
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
      }
      
      .babylon-performance-panel .metric-group:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      .babylon-performance-panel .metric-group h4 {
        margin: 0 0 6px 0;
        font-size: 10px;
        color: ${isDark ? '#aaa' : '#666'};
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .babylon-performance-panel .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3px;
      }
      
      .babylon-performance-panel .metric-label {
        color: ${isDark ? '#ccc' : '#666'};
        font-size: 10px;
      }
      
      .babylon-performance-panel .metric-value {
        font-weight: bold;
        font-size: 10px;
        min-width: 50px;
        text-align: right;
      }
      
      .babylon-performance-panel .fps-value {
        color: #4CAF50;
      }
      
      .babylon-performance-panel .fps-value.warning {
        color: #FF9800;
      }
      
      .babylon-performance-panel .fps-value.critical {
        color: #F44336;
      }
      
      .babylon-performance-panel .graph-section {
        margin: 8px 0;
      }
      
      .babylon-performance-panel .curve-selector {
        margin-bottom: 6px;
        padding: 6px 8px;
        background: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        border-radius: 4px;
        border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
      }
      
      .babylon-performance-panel .curve-selector label {
        display: block;
        font-size: 10px;
        color: ${isDark ? '#ccc' : '#666'};
        margin-bottom: 4px;
      }
      
      .babylon-performance-panel .curve-checkboxes {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .babylon-performance-panel .curve-checkbox {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 9px;
        cursor: pointer;
      }
      
      .babylon-performance-panel .curve-checkbox input[type="checkbox"] {
        width: 10px;
        height: 10px;
        margin: 0;
      }
      
      .babylon-performance-panel .curve-color {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 2px;
      }
      
      .babylon-performance-panel .performance-graph {
        width: 100%;
        height: 120px;
        background: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        border-radius: 4px;
      }
      
      .babylon-performance-panel .scene-section {
        margin: 8px 12px;
        background: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
      }
      
      .babylon-performance-panel .scene-selector {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .babylon-performance-panel .scene-label {
        font-size: 10px;
        color: ${isDark ? '#ccc' : '#666'};
        white-space: nowrap;
      }
      
      .babylon-performance-panel .scene-dropdown {
        flex: 1;
        padding: 2px 6px;
        background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
        border: 1px solid ${isDark ? '#555' : '#aaa'};
        border-radius: 3px;
        color: ${isDark ? '#fff' : '#000'};
        font-size: 10px;
        cursor: ${this.currentSceneInfo.isLoading.value ? 'not-allowed' : 'pointer'};
        opacity: ${this.currentSceneInfo.isLoading.value ? '0.6' : '1'};
      }
      
      .babylon-performance-panel .scene-dropdown:hover:not([disabled]) {
        background: ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'};
      }
      
      .babylon-performance-panel .scene-dropdown option {
        background: ${isDark ? '#333' : '#fff'};
        color: ${isDark ? '#fff' : '#000'};
      }
      
      .babylon-performance-panel .loading-indicator {
        font-size: 9px;
        color: #FF9800;
        white-space: nowrap;
      }
      
      .babylon-performance-panel .status-section {
        margin-top: 0;
      }
      
      .babylon-performance-panel .status-indicator {
        padding: 4px 8px;
        border-radius: 4px;
        text-align: center;
        font-size: 10px;
      }
      
      .babylon-performance-panel .status-indicator.good {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
      }
      
      .babylon-performance-panel .status-indicator.warning {
        background: rgba(255, 152, 0, 0.2);
        color: #FF9800;
      }
      
      .babylon-performance-panel .status-indicator.critical {
        background: rgba(244, 67, 54, 0.2);
        color: #F44336;
      }
      
      .babylon-performance-panel.minimized .panel-content {
        display: none;
      }
      
      .babylon-performance-panel .engine-info-section {
        margin-top: 8px;
        padding: 8px;
        background: ${isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'};
        border-radius: 4px;
        border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
      }
      
      .babylon-performance-panel .engine-info-section h4 {
        margin: 0 0 6px 0;
        font-size: 10px;
        color: ${isDark ? '#aaa' : '#666'};
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .babylon-performance-panel .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        font-size: 9px;
      }
      
      .babylon-performance-panel .info-label {
        color: ${isDark ? '#ccc' : '#666'};
        flex: 0 0 80px;
      }
      
      .babylon-performance-panel .info-value {
        font-size: 9px;
        color: ${isDark ? '#fff' : '#000'};
        flex: 1;
        text-align: right;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-left: 8px;
      }
    `;

		document.head.appendChild(style);
	}
}
