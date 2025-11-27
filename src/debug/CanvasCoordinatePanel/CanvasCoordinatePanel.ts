import {
	BasePanelWrapper,
	type BasePanelConfig,
	type BasePanelConfigRequiredProps,
	type BasePanelExposeKeys,
} from '../components/BasePanelWrapper.ts';
import { CanvasCoordinateMonitor, type CanvasCoordinateMonitorConfig, type CoordinateSystemInfo } from './CanvasCoordinateMonitor.ts';
import { CoordinateRenderer2D } from '@/debug/CanvasCoordinatePanel/renderers/CoordinateRenderer2D.ts';
import { CoordinateRenderer3D } from '@/debug/CanvasCoordinatePanel/renderers/CoordinateRenderer3D.ts';
import { useWatch } from '@/core/reactivity';
import type { OptionalProps } from '@/utils/TypeUtils.ts';

/**
 * Canvas坐标系面板配置接口
 */
export interface CanvasCoordinatePanelOptions {
	canvasHeight?: number;
	showGrid?: boolean;
	showAxes?: boolean;
	showCamera?: boolean;
	defaultView?: '2d' | '3d';
	gridSize?: number;
	axisLength?: number;
	scale?: number; // 缩放比例
	invertAxes?: boolean; // 反转坐标轴
	showDistanceLine?: boolean; // 显示到原点距离线
	showOriginCoordinates?: boolean; // 显示原点坐标
	origin?: { x: number; y: number; z: number }; // 坐标原点位置
	pipSize?: number; // 画中画窗口大小(180~500)
}

export type CanvasCoordinatePanelConfig = BasePanelExposeKeys &
	Partial<BasePanelConfig> &
	CanvasCoordinatePanelOptions &
	CanvasCoordinateMonitorConfig;

const defaultConfig: Required<OptionalProps<CanvasCoordinatePanelOptions> & BasePanelConfigRequiredProps> = {
	title: '坐标系可视化',
	width: '350px',
	canvasHeight: 300,
	showGrid: true,
	showAxes: true,
	showCamera: true,
	defaultView: '2d',
	gridSize: 20,
	axisLength: 100,
	invertAxes: false,
	scale: 1,
	showDistanceLine: false,
	showOriginCoordinates: false,
	origin: { x: 0, y: 0, z: 0 },
	pipSize: 280,
};

/**
 * Canvas坐标系显示面板
 * 使用Canvas可视化显示坐标系和摄像机位置
 */
export class CanvasCoordinatePanel extends BasePanelWrapper {
	private monitor!: CanvasCoordinateMonitor;
	protected config!: Required<BasePanelConfig & CanvasCoordinatePanelOptions>;
	private canvas!: HTMLCanvasElement;
	private ctx!: CanvasRenderingContext2D;
	private renderer2D!: CoordinateRenderer2D;
	private renderer3D!: CoordinateRenderer3D;
	private currentView: '2d' | '3d' = '2d';
	private coordinateInfo: CoordinateSystemInfo | null = null;
	private scaleRatio: number = 10; // 默认比例尺 1:10

	// Canvas拖拽平移相关变量
	private isCanvasDragging: boolean = false;
	private lastCanvasMouseX: number = 0;
	private lastCanvasMouseY: number = 0;
	private panOffsetX2D: number = 0;
	private panOffsetY2D: number = 0;
	private canvasDragEnabled: boolean = true; // 控制Canvas拖拽是否启用

	// 画中画模式相关变量
	private isPipMode: boolean = false;
	private pipContainer: HTMLElement | null = null;
	private originalParent: HTMLElement | null = null;

	constructor(config: CanvasCoordinatePanelConfig) {
		const canvasConfig: any = Object.assign(defaultConfig, config);
		super(canvasConfig);
		this.monitor = new CanvasCoordinateMonitor(config);
		this.currentView = canvasConfig.defaultView;
		useWatch(this.monitor.sceneManager.isLoadingSceneRef, (newValue) => {
			if (newValue) {
				this.stop();
				this.reinitializeRenderers();
			}
		});
		useWatch(this.monitor.sceneManager.isSceneCreatedRef, (newValue) => {
			if (newValue) {
				this.monitor.updateScene();
				this.start();
			}
		});

		this.init();
	}

	protected override init() {
		super.init();
		this.setupCanvas();
		this.setupViewControls();
	}

	private get canvasConfig() {
		return this.config;
	}

	/**
	 * 获取面板内容HTML
	 */
	protected override getPanelContentHTML(): string {
		return `
			<div class="canvas-coordinate-panel">
				<div class="view-controls">
						<div class="view-control-row">
							<div class="view-radio-group">
								<label class="radio-label">
									<input type="radio" name="view-mode" value="2d" checked>
									<div>2D视图</div>
								</label>
								<label class="radio-label">
									<input type="radio" name="view-mode" value="3d">
									<div>3D视图</div>
								</label>
							</div>
							<div class="view-options">
								<label class="checkbox-label">
									<input type="checkbox" id="invert-axes">
									<div>反转坐标轴</div>
								</label>
								<label class="checkbox-label">
									<input type="checkbox" id="show-distance-line">
									<div>显示到原点距离</div>
								</label>
								<label class="checkbox-label">
									<input type="checkbox" id="show-origin-coordinates">
									<div>显示原点坐标</div>
								</label>
							</div>
							<div class="scale-control-row">
								<label class="scale-label">
									<div>比例尺 1:</div>
									<input type="number" id="scale-ratio" value="10" min="1" step="1">
								</label>
							</div>
						</div>
					</div>
				<div class="canvas-container">
						<canvas id="coordinate-canvas" 
							height="${this.canvasConfig.canvasHeight}">
						</canvas>
					<button class="pip-button" id="pip-button" title="画中画模式">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
							<path d="M14 10h5v3h-5z"/>
						</svg>
					</button>
				</div>
				<div class="canvas-info">
					<div class="info-row">
						<span class="label">视图模式:</span>
						<span class="value" id="current-view">${this.currentView.toUpperCase()}</span>
					</div>
					<div class="info-row">
						<span class="label">摄像机位置:</span>
						<span class="value" id="camera-pos">-</span>
					</div>
					<div class="info-row">
						<span class="label">摄像机目标:</span>
						<span class="value" id="camera-target">-</span>
					</div>
					<div class="info-row">
						<span class="label">到原点距离:</span>
						<span class="value" id="distance-to-origin">-</span>
					</div>
				</div>
			</div>
		`;
	}

	/**
	 * 设置Canvas
	 */
	private setupCanvas() {
		// 延迟设置，确保DOM已创建
		setTimeout(() => {
			this.canvas = this.panelElement.querySelector('#coordinate-canvas') as HTMLCanvasElement;
			if (this.canvas) {
				this.ctx = this.canvas.getContext('2d')!;

				// 设置初始视图标记
				this.canvas.dataset.currentView = this.currentView;

				// Canvas准备好后立即设置渲染器
				this.initializeRenderers();

				// 设置滚轮缩放事件
				this.setupWheelZoom();

				// 设置2D专用的拖拽平移事件
				this.setup2DDragPan();

				// 监听渲染请求事件
				this.canvas.addEventListener('request-render', () => {
					this.renderCoordinateSystem();
				});
			}
		}, 0);
	}

	/**
	 * 初始化渲染器
	 */
	private initializeRenderers() {
		if (this.ctx) {
			this.renderer2D = new CoordinateRenderer2D(this.ctx, {
				width: this.canvas.width,
				height: this.canvasConfig.canvasHeight,
				showGrid: this.canvasConfig.showGrid,
				showAxes: this.canvasConfig.showAxes,
				gridSize: this.canvasConfig.gridSize,
				axisLength: this.canvasConfig.axisLength,
				theme: this.config.theme,
			});

			this.renderer3D = new CoordinateRenderer3D(this.ctx, {
				width: this.canvas.width,
				height: this.canvasConfig.canvasHeight,
				showGrid: this.canvasConfig.showGrid,
				showAxes: this.canvasConfig.showAxes,
				gridSize: this.canvasConfig.gridSize,
				axisLength: this.canvasConfig.axisLength,
				theme: this.config.theme,
			});

			// 监听3D旋转变化事件
			this.canvas.addEventListener('3d-rotation-changed', () => {
				if (this.currentView === '3d') {
					this.renderCoordinateSystem();
				}
			});

			// 监听3D轴标签点击事件（通过自定义事件）
			this.canvas.addEventListener<any>('axis-clicked', (e: CustomEvent) => {
				if (this.currentView === '3d' && this.renderer3D) {
					const axis = e.detail.axis;
					// 这里可以添加额外的处理逻辑，比如显示提示信息
				}
			});

			// 渲染器初始化完成后，如果有数据就立即渲染
			if (this.coordinateInfo) {
				this.renderCoordinateSystem();
			} else {
				// 如果没有数据，绘制一个默认的坐标系
				this.renderDefaultCoordinateSystem();
			}
		}
	}

	/**
	 * 设置视图控件
	 */
	private setupViewControls() {
		setTimeout(() => {
			// 视图切换单选框
			const viewRadios = this.panelElement.querySelectorAll('input[name="view-mode"]') as NodeListOf<HTMLInputElement>;
			viewRadios.forEach((radio) => {
				radio.addEventListener('change', (e) => {
					const target = e.target as HTMLInputElement;
					if (target.checked) {
						const view = target.value as '2d' | '3d';
						this.switchView(view);
					}
				});
			});

			// 反转坐标轴选项复选框
			const invertAxesCheckbox = this.panelElement.querySelector('#invert-axes') as HTMLInputElement;

			if (invertAxesCheckbox) {
				invertAxesCheckbox.addEventListener('change', () => {
					this.canvasConfig.invertAxes = invertAxesCheckbox.checked;
					this.updateRendererConfigs();
					this.renderCoordinateSystem();
				});
			}

			// 显示到原点距离复选框
			const showDistanceLineCheckbox = this.panelElement.querySelector('#show-distance-line') as HTMLInputElement;
			if (showDistanceLineCheckbox) {
				showDistanceLineCheckbox.addEventListener('change', () => {
					this.canvasConfig.showDistanceLine = showDistanceLineCheckbox.checked;
					this.updateRendererConfigs();
					this.renderCoordinateSystem();
				});
			}

			// 显示原点坐标复选框
			const showOriginCoordinatesCheckbox = this.panelElement.querySelector('#show-origin-coordinates') as HTMLInputElement;
			if (showOriginCoordinatesCheckbox) {
				showOriginCoordinatesCheckbox.addEventListener('change', () => {
					this.canvasConfig.showOriginCoordinates = showOriginCoordinatesCheckbox.checked;
					this.updateRendererConfigs();
					this.renderCoordinateSystem();
				});
			}

			// 比例尺输入框
			const scaleRatioInput = this.panelElement.querySelector('#scale-ratio') as HTMLInputElement;
			if (scaleRatioInput) {
				scaleRatioInput.addEventListener('input', (e) => {
					const target = e.target as HTMLInputElement;
					let value = parseInt(target.value);

					// 确保只能输入正整数
					if (isNaN(value) || value < 1) {
						value = 1;
						target.value = '1';
					}

					this.scaleRatio = value;
					this.renderCoordinateSystem();
				});

				scaleRatioInput.addEventListener('blur', (e) => {
					const target = e.target as HTMLInputElement;
					if (target.value === '' || parseInt(target.value) < 1) {
						target.value = '1';
						this.scaleRatio = 1;
						this.renderCoordinateSystem();
					}
				});
			}

			// 画中画按钮
			const pipButton = this.panelElement.querySelector('#pip-button') as HTMLButtonElement;
			if (pipButton) {
				pipButton.addEventListener('click', () => {
					this.togglePipMode();
				});
			}

			this.updateViewRadios();
		}, 0);
	}

	/**
	 * 切换视图
	 */
	private switchView(view: '2d' | '3d') {
		this.currentView = view;
		this.updateViewRadios();
		this.updateElement('#current-view', view.toUpperCase());

		// 切换视图时重置拖拽状态
		this.isCanvasDragging = false;
		this.canvas.style.cursor = 'grab';

		// 更新canvas的data属性，让3D渲染器知道当前视图
		if (this.canvas) {
			this.canvas.dataset.currentView = view;
		}

		// 切换到3D视图时，重置2D的平移偏移对3D的影响
		if (view === '3d') {
			// 更新渲染器配置，确保3D不受2D平移影响
			this.updateRendererConfigs();
		}

		this.renderCoordinateSystem();
		// 重新计算距离显示
		this.updateInfoDisplay();
	}

	/**
	 * 更新视图单选框状态
	 */
	private updateViewRadios() {
		const viewRadios = this.panelElement.querySelectorAll('input[name="view-mode"]') as NodeListOf<HTMLInputElement>;
		viewRadios.forEach((radio) => {
			radio.checked = radio.value === this.currentView;
		});
	}

	/**
	 * 更新显示内容
	 */
	protected updateDisplay() {
		try {
			this.coordinateInfo = this.monitor.getCoordinateSystemInfo();
			this.updateInfoDisplay();
			this.renderCoordinateSystem();
		} catch (error) {
			console.warn('Failed to update canvas coordinate display:', error);
			this.updateErrorDisplay();
		}
	}

	/**
	 * 更新信息显示
	 */
	private updateInfoDisplay() {
		if (!this.coordinateInfo) return;

		this.updateElement('#camera-pos', this.monitor.formatVector3(this.coordinateInfo.camera.position));
		this.updateElement('#camera-target', this.monitor.formatVector3(this.coordinateInfo.camera.target));

		// 计算摄像机到原点的距离
		const cameraPos = this.coordinateInfo.camera.position;
		let distanceToOrigin: number;

		if (this.currentView === '2d') {
			// 2D视图只计算XZ平面的距离
			distanceToOrigin = Math.sqrt(cameraPos.x * cameraPos.x + cameraPos.z * cameraPos.z);
		} else {
			// 3D视图计算完整的3D距离
			distanceToOrigin = Math.sqrt(cameraPos.x * cameraPos.x + cameraPos.y * cameraPos.y + cameraPos.z * cameraPos.z);
		}

		this.updateElement('#distance-to-origin', distanceToOrigin.toFixed(2));
	}

	/**
	 * 设置滚轮缩放
	 */
	private setupWheelZoom() {
		if (!this.canvas) return;

		this.canvas.addEventListener(
			'wheel',
			(e) => {
				e.preventDefault();

				// 计算缩放因子
				const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

				// 更新渲染器的缩放
				if (this.currentView === '2d' && this.renderer2D) {
					this.updateRenderer2DScale(zoomFactor);
				} else if (this.currentView === '3d' && this.renderer3D) {
					this.updateRenderer3DScale(zoomFactor);
				}

				// 重新渲染
				this.renderCoordinateSystem();
			},
			{ passive: false }
		);
	}

	/**
	 * 更新2D渲染器缩放
	 */
	private updateRenderer2DScale(zoomFactor: number) {
		if (!this.renderer2D) return;

		// 获取当前配置并更新缩放
		const currentConfig = (this.renderer2D as any).config;
		// 只缩放网格大小，坐标轴长度保持不变
		currentConfig.gridSize = Math.max(5, Math.min(100, currentConfig.gridSize * zoomFactor));
	}

	/**
	 * 更新3D渲染器缩放
	 */
	private updateRenderer3DScale(zoomFactor: number) {
		if (!this.renderer3D) return;

		// 获取当前配置并更新缩放
		const currentConfig = (this.renderer3D as any).config;
		// 只缩放网格大小，坐标轴长度保持不变
		currentConfig.gridSize = Math.max(5, Math.min(100, currentConfig.gridSize * zoomFactor));
	}

	/**
	 * 鼠标按下事件处理
	 */
	private onMouseDown = (e: MouseEvent) => {
		// 只在2D视图下处理拖拽平移
		if (this.currentView === '2d') {
			this.isCanvasDragging = true;
			this.lastCanvasMouseX = e.clientX;
			this.lastCanvasMouseY = e.clientY;
			this.canvas.style.cursor = 'grabbing';
		}
	};

	/**
	 * 鼠标移动事件处理
	 */
	private onMouseMove = (e: MouseEvent) => {
		// 只在2D视图下处理拖拽平移
		if (!this.isCanvasDragging || this.currentView !== '2d') return;

		const deltaX = e.clientX - this.lastCanvasMouseX;
		const deltaY = e.clientY - this.lastCanvasMouseY;

		this.panOffsetX2D += deltaX;
		this.panOffsetY2D += deltaY;

		this.lastCanvasMouseX = e.clientX;
		this.lastCanvasMouseY = e.clientY;

		// 更新摄像机坐标（因为视图发生了平移）
		this.updateCameraCoordinates();

		// 重新渲染
		this.renderCoordinateSystem();
	};

	/**
	 * 鼠标释放事件处理
	 */
	private onMouseUp = (e: MouseEvent) => {
		this.isCanvasDragging = false;
		this.canvas.style.cursor = 'grab';
	};

	/**
	 * 鼠标离开Canvas事件处理
	 */
	private onMouseLeave = (e: MouseEvent) => {
		this.isCanvasDragging = false;
		this.canvas.style.cursor = 'grab';
	};

	/**
	 * 处理2D视图点击事件
	 */
	private handle2DClick = (e: MouseEvent) => {
		if (!this.renderer2D) return;

		const rect = this.canvas.getBoundingClientRect();
		// 考虑Canvas缩放比例进行坐标转换
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		// 检查是否点击了回到原点按钮
		if (this.renderer2D.isClickOnResetButton(x, y)) {
			this.resetToOrigin();
		}
	};

	/**
	 * 处理2D视图鼠标悬浮事件
	 */
	private handle2DMouseHover = (e: MouseEvent) => {
		if (!this.renderer2D) return;

		const rect = this.canvas.getBoundingClientRect();
		// 考虑Canvas缩放比例进行坐标转换
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		// 检查是否悬浮在回到原点按钮上
		const isHovering = this.renderer2D.checkHoveringResetButton(x, y);
		this.renderer2D.setHoveringResetButton(isHovering);

		// 更新摄像机坐标显示
		this.updateCameraCoordinates();

		// 更新鼠标样式
		if (isHovering) {
			this.canvas.style.cursor = 'pointer';
		} else if (!this.isCanvasDragging) {
			this.canvas.style.cursor = 'grab';
		}
	};

	/**
	 * 处理2D视图鼠标进入Canvas事件
	 */
	private handle2DMouseEnterCanvas = (e: MouseEvent) => {
		if (!this.renderer2D) return;
		this.renderer2D.setHoveringCanvas(true);

		// 初始化摄像机坐标显示
		this.updateCameraCoordinates();
	};

	/**
	 * 处理2D视图鼠标离开Canvas事件
	 */
	private handle2DMouseLeaveCanvas = (e: MouseEvent) => {
		if (!this.renderer2D) return;
		this.renderer2D.setHoveringCanvas(false);
		this.renderer2D.setHoveringResetButton(false);
	};

	/**
	 * 更新摄像机坐标显示
	 */
	private updateCameraCoordinates() {
		// 从坐标系信息中获取摄像机位置
		if (this.coordinateInfo && this.coordinateInfo.camera) {
			const camera = this.coordinateInfo.camera;

			if (this.currentView === '2d' && this.renderer2D) {
				// 2D视图：显示摄像机的X和Z坐标
				this.renderer2D.setCameraCoordinates(camera.position.x, camera.position.y, camera.position.z);
			} else if (this.currentView === '3d' && this.renderer3D) {
				// 3D视图：显示完整的摄像机坐标
				this.renderer3D.setCameraCoordinates(camera.position.x, camera.position.y, camera.position.z);
			}
		} else {
			// 如果没有坐标信息，使用默认值
			if (this.currentView === '2d' && this.renderer2D) {
				// 2D视图：基于平移偏移计算视图中心
				const scale = this.canvasConfig.scale || 1;
				const worldX = -this.panOffsetX2D / scale;
				const worldZ = this.panOffsetY2D / scale;
				this.renderer2D.setCameraCoordinates(worldX, 0, worldZ);
			} else if (this.currentView === '3d' && this.renderer3D) {
				// 3D视图：使用默认摄像机位置
				this.renderer3D.setCameraCoordinates(5, 3, 5);
			}
		}
	}

	/**
	 * 重置到原点
	 */
	private resetToOrigin() {
		this.panOffsetX2D = 0;
		this.panOffsetY2D = 0;
		this.updateRendererConfigs();
		this.updateCameraCoordinates(); // 更新摄像机坐标
		this.renderCoordinateSystem();
	}

	/**
	 * 设置2D专用的拖拽平移事件
	 */
	private setup2DDragPan() {
		if (!this.canvas) return;

		// 创建2D专用的事件处理器
		const handle2DMouseDown = (e: MouseEvent) => {
			if (this.currentView === '2d' && this.canvasDragEnabled) {
				this.onMouseDown(e);
			}
		};

		const handle2DMouseMove = (e: MouseEvent) => {
			if (this.currentView === '2d' && this.canvasDragEnabled) {
				this.onMouseMove(e);
				this.handle2DMouseHover(e);
			}
		};

		const handle2DMouseUp = (e: MouseEvent) => {
			if (this.currentView === '2d' && this.canvasDragEnabled) {
				this.onMouseUp(e);
			}
		};

		const handle2DMouseLeave = (e: MouseEvent) => {
			if (this.currentView === '2d' && this.canvasDragEnabled) {
				this.onMouseLeave(e);
				this.handle2DMouseLeaveCanvas(e);
			}
		};

		const handle2DMouseEnter = (e: MouseEvent) => {
			if (this.currentView === '2d' && this.canvasDragEnabled) {
				this.handle2DMouseEnterCanvas(e);
			}
		};

		const handle2DClick = (e: MouseEvent) => {
			if (this.currentView === '2d' && this.canvasDragEnabled) {
				this.handle2DClick(e);
			}
		};

		// 添加2D专用的事件监听器
		this.canvas.addEventListener('mousedown', handle2DMouseDown);
		this.canvas.addEventListener('mousemove', handle2DMouseMove);
		this.canvas.addEventListener('mouseup', handle2DMouseUp);
		this.canvas.addEventListener('mouseleave', handle2DMouseLeave);
		this.canvas.addEventListener('mouseenter', handle2DMouseEnter);
		this.canvas.addEventListener('click', handle2DClick);
	}

	/**
	 * 更新错误显示
	 */
	private updateErrorDisplay() {
		this.updateElement('#camera-pos', '数据获取失败');
		this.updateElement('#camera-target', '数据获取失败');
		this.updateElement('#distance-to-origin', '数据获取失败');

		// 清空canvas
		if (this.ctx) {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvasConfig.canvasHeight);
			this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvasConfig.canvasHeight);

			this.ctx.fillStyle = '#ff6b6b';
			this.ctx.font = '14px Arial';
			this.ctx.textAlign = 'center';
			this.ctx.fillText('数据获取失败', this.canvas.width / 2, this.canvasConfig.canvasHeight / 2);
		}
	}

	/**
	 * 更新渲染器配置
	 */
	private updateRendererConfigs() {
		if (this.renderer2D) {
			this.renderer2D.updateConfig({
				showGrid: this.canvasConfig.showGrid,
				showAxes: this.canvasConfig.showAxes,
				theme: this.config.theme,
				invertAxes: this.canvasConfig.invertAxes,
				showDistanceLine: this.canvasConfig.showDistanceLine,
				showOriginCoordinates: this.canvasConfig.showOriginCoordinates,
				origin: this.canvasConfig.origin,
				// 只在2D视图时传递2D专用的平移偏移
				panOffsetX: this.currentView === '2d' ? this.panOffsetX2D : 0,
				panOffsetY: this.currentView === '2d' ? this.panOffsetY2D : 0,
			});
		}

		if (this.renderer3D) {
			this.renderer3D.updateConfig({
				showGrid: this.canvasConfig.showGrid,
				showAxes: this.canvasConfig.showAxes,
				theme: this.config.theme,
				invertAxes: this.canvasConfig.invertAxes,
				showDistanceLine: this.canvasConfig.showDistanceLine,
				showOriginCoordinates: this.canvasConfig.showOriginCoordinates,
				origin: this.canvasConfig.origin,
			});
		}
	}

	/**
	 * 渲染默认坐标系（当没有数据时）
	 */
	private renderDefaultCoordinateSystem() {
		if (!this.ctx) return;

		// 创建默认的坐标系信息
		const defaultInfo: CoordinateSystemInfo = {
			worldOrigin: { x: 0, y: 0, z: 0 } as any,
			worldAxes: {
				x: { x: 1, y: 0, z: 0 } as any,
				y: { x: 0, y: 1, z: 0 } as any,
				z: { x: 0, y: 0, z: 1 } as any,
			},
			camera: {
				position: { x: 5, y: 3, z: 5 } as any,
				target: { x: 0, y: 0, z: 0 } as any,
				rotation: { x: 0, y: 0, z: 0 } as any,
				fov: 45,
				near: 0.1,
				far: 100,
				mode: 'Perspective',
			},
		};

		const renderer = this.currentView === '2d' ? this.renderer2D : this.renderer3D;
		if (renderer) {
			renderer.render(defaultInfo, this.scaleRatio);
			// 更新摄像机坐标显示
			this.updateCameraCoordinates();
		}
	}

	/**
	 * 渲染坐标系
	 */
	private renderCoordinateSystem() {
		if (!this.ctx) return;

		// 更新渲染器配置（包括平移偏移）
		this.updateRendererConfigs();

		// 清空canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvasConfig.canvasHeight);

		// 如果没有坐标信息，渲染默认坐标系
		if (!this.coordinateInfo) {
			this.renderDefaultCoordinateSystem();
			return;
		}

		// 根据当前视图选择渲染器
		const renderer = this.currentView === '2d' ? this.renderer2D : this.renderer3D;
		if (renderer) {
			renderer.render(this.coordinateInfo, this.scaleRatio);
			// 更新摄像机坐标显示
			this.updateCameraCoordinates();
		}
	}

	/**
	 * 切换画中画模式
	 */
	private togglePipMode() {
		if (this.isPipMode) {
			this.exitPipMode();
		} else {
			this.enterPipMode();
		}
	}

	/**
	 * 进入画中画模式
	 */
	private enterPipMode() {
		if (this.isPipMode || !this.panelElement || !this.canvas) return;

		// 保存原始状态
		this.originalParent = this.panelElement.parentElement;
		const computedStyle = window.getComputedStyle(this.panelElement);

		// 创建画中画容器
		this.createPipContainer();

		// 只移动Canvas到画中画容器，不移动整个面板
		if (this.pipContainer) {
			// 克隆Canvas并添加到画中画容器
			const canvasContainer = document.createElement('div');
			canvasContainer.className = 'pip-canvas-container';

			// 移动原始Canvas到画中画容器
			canvasContainer.appendChild(this.canvas);
			this.pipContainer.appendChild(canvasContainer);
		}

		this.updateRendererConfigs();
		this.renderCoordinateSystem();

		// 禁用Canvas拖拽和所有交互
		this.canvasDragEnabled = false;
		this.canvas.style.cursor = 'default';
		this.canvas.style.pointerEvents = 'none';

		// 隐藏画中画按钮
		const pipButton = this.panelElement.querySelector('#pip-button') as HTMLButtonElement;
		if (pipButton) {
			pipButton.style.display = 'none';
		}

		// 隐藏整个面板
		if (this.panelElement) {
			this.panelElement.style.display = 'none';
		}

		this.isPipMode = true;
	}

	/**
	 * 退出画中画模式
	 */
	private exitPipMode() {
		if (!this.isPipMode || !this.originalParent || !this.canvas) return;

		// 将Canvas移回原始的canvas-container
		const originalCanvasContainer = this.panelElement.querySelector('.canvas-container') as HTMLElement;
		if (originalCanvasContainer) {
			// 移除画中画按钮后面的Canvas，将原Canvas移回
			const pipButton = originalCanvasContainer.querySelector('.pip-button');
			originalCanvasContainer.appendChild(this.canvas);
			// 确保按钮在Canvas之后
			if (pipButton) {
				originalCanvasContainer.appendChild(pipButton);
			}
		}

		this.updateRendererConfigs();
		this.renderCoordinateSystem();

		// 重新启用Canvas拖拽和交互
		this.canvasDragEnabled = true;
		this.canvas.style.cursor = 'grab';
		this.canvas.style.pointerEvents = '';

		// 显示画中画按钮
		const pipButton = this.panelElement.querySelector('#pip-button') as HTMLButtonElement;
		if (pipButton) {
			pipButton.style.display = '';
		}

		// 显示整个面板
		if (this.panelElement) {
			this.panelElement.style.display = '';
		}

		// 移除画中画容器
		if (this.pipContainer) {
			document.body.removeChild(this.pipContainer);
			this.pipContainer = null;
		}

		this.isPipMode = false;
		this.originalParent = null;
	}

	/**
	 * 创建画中画容器
	 */
	private createPipContainer() {
		this.pipContainer = document.createElement('div');
		this.pipContainer.className = 'coordinate-pip-container';

		// 设置画中画容器样式 - 默认显示在左上角
		const pipSize = this.canvasConfig.pipSize;
		this.pipContainer.style.cssText = `
			position: fixed;
			top: 20px;
			left: 20px;
			width: ${pipSize}px;
			height: ${pipSize}px;
			z-index: 10000;
			resize: both;
			overflow: hidden;
			min-width: 180px;
			min-height: 180px;
			max-width: 500px;
			max-height: 500px;
			box-sizing: border-box;
		`;

		// 添加拖拽功能
		this.addPipDragFunctionality();

		// 添加关闭按钮
		const closeButton = document.createElement('button');
		closeButton.innerHTML = '×';
		closeButton.style.cssText = `
			position: absolute;
			top: 5px;
			right: 5px;
			width: 20px;
			height: 20px;
			border: none;
			background: rgba(255, 255, 255, 0.1);
			color: ${this.canvasConfig.theme === 'light' ? 'black' : 'white'};
			border-radius: 50%;
			cursor: pointer;
			font-size: 14px;
			line-height: 1;
			z-index: 1;
			display: flex;
			align-items: center;
			justify-content: center;
		`;
		closeButton.addEventListener('click', () => this.exitPipMode());
		this.pipContainer.appendChild(closeButton);

		document.body.appendChild(this.pipContainer);
	}

	/**
	 * 添加画中画拖拽功能
	 */
	private addPipDragFunctionality() {
		if (!this.pipContainer) return;

		let isDragging = false;
		let dragOffset = { x: 0, y: 0 };

		const onMouseDown = (e: MouseEvent) => {
			// 只有点击容器本身或Canvas容器时才能拖拽，避免点击关闭按钮时触发拖拽
			const target = e.target as HTMLElement;
			if (target === this.pipContainer || target.closest('.pip-canvas-container')) {
				isDragging = true;
				const rect = this.pipContainer!.getBoundingClientRect();
				dragOffset.x = e.clientX - rect.left;
				dragOffset.y = e.clientY - rect.top;
				this.pipContainer!.style.cursor = 'grabbing';
				e.preventDefault();
			}
		};

		const onMouseMove = (e: MouseEvent) => {
			if (isDragging && this.pipContainer) {
				const x = e.clientX - dragOffset.x;
				const y = e.clientY - dragOffset.y;

				// 限制在视窗内
				const maxX = window.innerWidth - this.pipContainer.offsetWidth;
				const maxY = window.innerHeight - this.pipContainer.offsetHeight;

				this.pipContainer.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
				this.pipContainer.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
				this.pipContainer.style.right = 'auto';
				this.pipContainer.style.bottom = 'auto';
			}
		};

		const onMouseUp = () => {
			isDragging = false;
			if (this.pipContainer) {
				this.pipContainer.style.cursor = 'grab';
			}
		};

		this.pipContainer.addEventListener('mousedown', onMouseDown);
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);

		// 设置初始光标
		this.pipContainer.style.cursor = 'grab';
	}

	/**
	 * 启动面板
	 */
	public start() {
		this.monitor.start();
		super.start();
		this.addCanvasCoordinatePanelStyles();
	}

	/**
	 * 停止面板
	 */
	public stop() {
		this.monitor.stop();
		super.stop();
	}

	/**
	 * 重新初始化渲染器
	 */
	private reinitializeRenderers() {
		try {
			this.initializeRenderers();

			// 重置视图状态
			this.panOffsetX2D = 0;
			this.panOffsetY2D = 0;
			this.scaleRatio = 10;

			console.log('Renderers reinitialized for new scene');
		} catch (error) {
			console.error('Failed to reinitialize renderers:', error);
		}
	}

	/**
	 * 销毁面板
	 */
	public destroy() {
		// 如果在画中画模式，先退出
		if (this.isPipMode) {
			this.exitPipMode();
		}
		this.monitor.destroy();
		super.destroy();
	}

	/**
	 * 添加Canvas坐标系面板专用样式
	 */
	private addCanvasCoordinatePanelStyles() {
		const styleId = 'canvas-coordinate-panel-styles';
		if (document.getElementById(styleId)) return;

		const style = document.createElement('style');
		style.id = styleId;
		style.textContent = `
				.canvas-coordinate-panel {
					font-size: 11px;
					line-height: 1.4;
				}

				.view-controls {
						margin-bottom: 12px;
					}

					.view-control-row {
						display: flex;
						justify-content: flex-start;
						align-items: center;
						gap: 16px;
						flex-wrap: wrap;
					}

					.view-radio-group {
						display: flex;
						gap: 12px;
					}

					.radio-label {
						display: flex;
						align-items: center;
						gap: 4px;
						font-size: 10px;
						cursor: pointer;
					}

					.debug-panel[data-theme="dark"] .radio-label {
						color: rgba(255, 255, 255, 0.8);
					}

					.debug-panel[data-theme="light"] .radio-label {
						color: rgba(0, 0, 0, 0.8);
					}

					.radio-label div {
						line-height: 1;
						vertical-align: middle;
					}

					.radio-label input[type="radio"] {
						width: 12px;
						height: 12px;
						accent-color: #4CAF50;
						margin: 0;
						vertical-align: middle;
						appearance: none;
						-webkit-appearance: none;
						border: 2px solid #4CAF50;
						border-radius: 50%;
						background: transparent;
						position: relative;
					}

					.radio-label input[type="radio"]:checked {
						background: #4CAF50;
					}

					.debug-panel[data-theme="dark"] .radio-label input[type="radio"]:checked::after {
						content: '';
						position: absolute;
						top: 50%;
						left: 50%;
						transform: translate(-50%, -50%);
						width: 4px;
						height: 4px;
						border-radius: 50%;
						background: black;
					}

					.debug-panel[data-theme="light"] .radio-label input[type="radio"]:checked::after {
						content: '';
						position: absolute;
						top: 50%;
						left: 50%;
						transform: translate(-50%, -50%);
						width: 4px;
						height: 4px;
						border-radius: 50%;
						background: white;
					}

					.debug-panel[data-theme="dark"] .radio-label:hover {
						color: #ffffff;
					}

					.debug-panel[data-theme="light"] .radio-label:hover {
						color: #000000;
					}

					.view-options {
						display: flex;
						gap: 12px;
					}

				.checkbox-label {
					display: flex;
					align-items: center;
					gap: 4px;
					font-size: 10px;
					cursor: pointer;
				}

				.debug-panel[data-theme="dark"] .checkbox-label {
					color: rgba(255, 255, 255, 0.8);
				}

				.debug-panel[data-theme="light"] .checkbox-label {
					color: rgba(0, 0, 0, 0.8);
				}

				.checkbox-label input[type="checkbox"] {
						width: 12px;
						height: 12px;
						accent-color: #4CAF50;
						margin: 0;
						vertical-align: middle;
						appearance: none;
						-webkit-appearance: none;
						border: 2px solid #4CAF50;
						border-radius: 2px;
						background: transparent;
						position: relative;
					}

				.checkbox-label input[type="checkbox"]:checked {
					background: #4CAF50;
				}

				.debug-panel[data-theme="dark"] .checkbox-label input[type="checkbox"]:checked::after {
					content: '';
					position: absolute;
					top: 50%;
					left: 50%;
					width: 4px;
					height: 7px;
					border: solid black;
					border-width: 0 2px 2px 0;
					transform: translate(-50%, -50%) rotate(45deg);
				}

				.debug-panel[data-theme="light"] .checkbox-label input[type="checkbox"]:checked::after {
					content: '';
					position: absolute;
					top: 50%;
					left: 50%;
					width: 4px;
					height: 7px;
					border: solid white;
					border-width: 0 2px 2px 0;
					transform: translate(-50%, -50%) rotate(45deg);
				}

				.debug-panel[data-theme="dark"] .checkbox-label:hover {
						color: #ffffff;
					}

				.debug-panel[data-theme="light"] .checkbox-label:hover {
						color: #000000;
					}

					.scale-control-row {
						display: flex;
						justify-content: flex-start;
						align-items: center;
					}

					.scale-label {
						display: flex;
						align-items: center;
						gap: 4px;
						font-size: 10px;
						cursor: pointer;
					}

					.debug-panel[data-theme="dark"] .scale-label {
						color: rgba(255, 255, 255, 0.8);
					}

					.debug-panel[data-theme="light"] .scale-label {
						color: rgba(0, 0, 0, 0.8);
					}

					.scale-label div {
						line-height: 1;
						vertical-align: middle;
					}

					.scale-label input[type="number"] {
						width: 40px;
						height: 16px;
						padding: 2px 4px;
						border-radius: 2px;
						font-size: 10px;
						font-family: inherit;
						text-align: center;
						-webkit-appearance: none;
						-moz-appearance: textfield;
					}

					.debug-panel[data-theme="dark"] .scale-label input[type="number"] {
						background: rgba(255, 255, 255, 0.1);
						border: 1px solid rgba(255, 255, 255, 0.2);
						color: #ffffff;
					}

					.debug-panel[data-theme="light"] .scale-label input[type="number"] {
						background: rgba(0, 0, 0, 0.1);
						border: 1px solid rgba(0, 0, 0, 0.2);
						color: #000000;
					}

					.scale-label input[type="number"]::-webkit-outer-spin-button,
					.scale-label input[type="number"]::-webkit-inner-spin-button {
						-webkit-appearance: none;
						margin: 0;
					}

					.debug-panel[data-theme="dark"] .scale-label input[type="number"]:focus {
						outline: none;
						border-color: #4CAF50;
						background: rgba(255, 255, 255, 0.15);
					}

					.debug-panel[data-theme="light"] .scale-label input[type="number"]:focus {
						outline: none;
						border-color: #4CAF50;
						background: rgba(0, 0, 0, 0.15);
					}

					.debug-panel[data-theme="dark"] .scale-label:hover {
						color: #ffffff;
					}

					.debug-panel[data-theme="light"] .scale-label:hover {
						color: #000000;
					}

				.canvas-container {
					margin-bottom: 12px;
					text-align: center;
				}

				#coordinate-canvas {
					display: block;
					margin: 0 auto;
					width: 100%;
					max-width: 100%;
				}

				.canvas-info {
					padding-top: 8px;
				}

				.debug-panel[data-theme="dark"] .canvas-info {
					border-top: 1px solid rgba(255, 255, 255, 0.1);
				}

				.debug-panel[data-theme="light"] .canvas-info {
					border-top: 1px solid rgba(0, 0, 0, 0.1);
				}

				.canvas-info .info-row {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 4px;
					padding: 2px 0;
				}

				.canvas-info .label {
					font-weight: 500;
					min-width: 80px;
					flex-shrink: 0;
				}

				.debug-panel[data-theme="dark"] .canvas-info .label {
					color: rgba(255, 255, 255, 0.8);
				}

				.debug-panel[data-theme="light"] .canvas-info .label {
					color: rgba(0, 0, 0, 0.8);
				}

				.canvas-info .value {
					font-family: 'Courier New', monospace;
					text-align: right;
					word-break: break-all;
					max-width: 200px;
				}

				.debug-panel[data-theme="dark"] .canvas-info .value {
					color: #ffffff;
				}

				.debug-panel[data-theme="light"] .canvas-info .value {
					color: #000000;
				}

				/* 画中画按钮样式 */
					.canvas-container {
						position: relative;
					}

					.pip-button {
						position: absolute;
						top: 8px;
						right: 8px;
						width: 32px;
						height: 32px;
						border: none;
						border-radius: 6px;
						background: rgba(0, 0, 0, 0.6);
						color: white;
						cursor: pointer;
						display: flex;
						align-items: center;
						justify-content: center;
						transition: all 0.2s ease;
						z-index: 10;
					}

					.pip-button:hover {
						background: rgba(0, 0, 0, 0.8);
						transform: scale(1.05);
					}

					.pip-button svg {
						width: 16px;
						height: 16px;
					}

					/* 画中画容器样式 */
					.coordinate-pip-container {
						font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
					}

					.pip-canvas-container {
						padding: 0;
						margin: 0;
						box-sizing: border-box;
						overflow: hidden;
					}

					.pip-canvas-container canvas {
						width: 100%;
						height: 100%;
						display: block;
						pointer-events: none;
						cursor: default;
						box-sizing: border-box;
					}

					/* 响应式调整 */
					@media (max-width: 450px) {
						.canvas-coordinate-panel {
							font-size: 10px;
						}
						
						.canvas-info .value {
							max-width: 150px;
						}
					}
				`;
		document.head.appendChild(style);
	}
}
