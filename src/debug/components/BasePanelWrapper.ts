import { type Ref, useRef, useWatch } from '@/core/reactivity';
import type { OptionalKeys, OptionalProps, RequiredProps } from '@/misc/type-utils.ts';

/**
 * 基础面板配置接口
 */
export interface BasePanelConfig {
	visible?: boolean;
	toggleKey: string;
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	theme?: 'dark' | 'light';
	updateInterval?: number;
	minimized?: boolean;
	draggable?: boolean;
	title: string;
	width: string;
}

/**
 * 对外界暴露的key
 */
export type BasePanelExposeKeys = Pick<BasePanelConfig, 'toggleKey'>;

/**
 * 对要继承的面板所必须实现的key
 */
export type BasePanelConfigRequiredProps = Omit<RequiredProps<BasePanelConfig>, keyof BasePanelExposeKeys>;

const defaultConfig: OptionalProps<BasePanelConfig> = {
	theme: 'light',
	position: 'top-right',
	visible: false,
	minimized: false,
	draggable: true,
	updateInterval: 100,
};
/**
 * 基础面板包装器类
 * 提供通用的面板功能：拖拽、最小化、位置管理等
 */
export abstract class BasePanelWrapper {
	protected config: Required<BasePanelConfig>;
	protected panelElement!: HTMLDivElement;
	protected updateTimer: number | null = null;
	protected isVisibleRef: Ref<boolean> = useRef(false);
	protected isMinimizedRef: Ref<boolean> = useRef(false);

	// 拖拽状态变量
	private isDragging = false;
	private dragStartX = 0;
	private dragStartY = 0;
	private dragStartLeft = 0;
	private dragStartTop = 0;

	// 事件处理函数引用，用于清理
	protected eventHandlers = {
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
	};

	protected constructor(config: BasePanelConfig) {
		this.config = { ...defaultConfig, ...config } as Required<BasePanelConfig>;
		this.isVisibleRef.value = this.config.visible;
		this.isMinimizedRef.value = this.config.minimized;
	}

	protected init(...args: any[]) {
		this.panelElement = this.createPanelElement();
		this.setupEventListeners();
		document.body.appendChild(this.panelElement);

		this.setupReactivity();
	}

	/**
	 * 设置响应式监听
	 */
	private setupReactivity() {
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
	}

	/**
	 * 抽象方法：获取面板内容HTML
	 */
	protected abstract getPanelContentHTML(): string;

	/**
	 * 抽象方法：更新显示内容
	 */
	protected abstract updateDisplay(): void;

	/**
	 * 创建面板元素
	 */
	private createPanelElement(): HTMLDivElement {
		const panel = document.createElement('div');
		panel.className = 'debug-panel';
		panel.setAttribute('data-theme', this.config.theme);
		this.applyStyles(panel);
		panel.innerHTML = this.getPanelHTML();
		this.addInternalStyles();
		return panel;
	}

	/**
	 * 应用面板样式
	 */
	private applyStyles(panel: HTMLDivElement) {
		panel.style.cssText = `
			position: fixed;
			${this.getPositionStyles()}
			width: ${this.config.width};
			background: ${this.config.theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)'};
			color: ${this.config.theme === 'dark' ? '#ffffff' : '#000000'};
			font-family: 'Courier New', monospace;
			font-size: 12px;
			border: 1px solid ${this.config.theme === 'dark' ? '#444' : '#ccc'};
			border-radius: 8px;
			z-index: 1;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
			backdrop-filter: blur(10px);
			display: ${this.isVisibleRef.value ? 'block' : 'none'};
		`;
	}

	/**
	 * 获取位置样式
	 */
	private getPositionStyles(): string {
		switch (this.config.position) {
			case 'top-left':
				return 'top: 20px; left: 20px;';
			case 'top-right':
				return 'top: 20px; right: 20px;';
			case 'bottom-left':
				return 'bottom: 20px; left: 20px;';
			case 'bottom-right':
				return 'bottom: 20px; right: 20px;';
			default:
				return 'top: 20px; right: 20px;';
		}
	}

	/**
	 * 获取面板HTML结构
	 */
	private getPanelHTML(): string {
		return `
			<div class="panel-header">
				<div class="panel-title">${this.config.title}(${this.config.toggleKey})</div>
				<div class="panel-controls">
					<button class="panel-btn minimize-btn" title="最小化">−</button>
					<button class="panel-btn close-btn" title="关闭">×</button>
				</div>
			</div>
			<div class="panel-content">
				${this.getPanelContentHTML()}
			</div>
		`;
	}

	/**
	 * 设置事件监听器
	 */
	private setupEventListeners() {
		// 最小化按钮
		const minimizeBtn = this.panelElement.querySelector('.minimize-btn');
		if (minimizeBtn) {
			minimizeBtn.addEventListener('click', this.eventHandlers.minimizeHandler);
		}

		// 关闭按钮
		const closeBtn = this.panelElement.querySelector('.close-btn');
		if (closeBtn) {
			closeBtn.addEventListener('click', this.eventHandlers.closeHandler);
		}

		// 拖拽功能
		if (this.config.draggable) {
			const header = this.panelElement.querySelector('.panel-header') as HTMLElement;
			if (header) {
				this.setupDragFunctionality(header);
			}
		}

		// 键盘快捷键
		document.addEventListener('keydown', this.eventHandlers.toggleFun);
	}

	/**
	 * 设置拖拽功能
	 */
	private setupDragFunctionality(header: HTMLElement) {
		header.style.cursor = 'move';
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
	 * 切换面板显示
	 */
	private readonly toggleFun = (event: KeyboardEvent) => {
		if (event.key === this.config.toggleKey) {
			this.isVisibleRef.value = !this.isVisibleRef.value;
		}
	};

	/**
	 * 切换面板显示状态
	 */
	public toggle() {
		this.panelElement.style.display = this.isVisibleRef.value ? 'block' : 'none';
	}

	/**
	 * 更新面板布局
	 */
	private updatePanelLayout() {
		const content = this.panelElement.querySelector('.panel-content') as HTMLElement;
		if (content) {
			content.style.display = this.isMinimizedRef.value ? 'none' : 'block';
		}

		const minimizeBtn = this.panelElement.querySelector('.minimize-btn') as HTMLElement;
		if (minimizeBtn) {
			minimizeBtn.textContent = this.isMinimizedRef.value ? '+' : '−';
		}
	}

	/**
	 * 开始更新定时器
	 */
	protected startUpdateTimer() {
		this.updateTimer = window.setInterval(() => {
			this.updateDisplay();
		}, this.config.updateInterval);
	}

	/**
	 * 停止更新定时器
	 */
	protected stopUpdateTimer() {
		if (this.updateTimer !== null) {
			clearInterval(this.updateTimer);
			this.updateTimer = null;
		}
	}

	/**
	 * 更新元素内容
	 */
	protected updateElement(selector: string, value: string) {
		const element = this.panelElement.querySelector(selector);
		if (element) {
			element.textContent = value;
		}
	}

	/**
	 * 启动面板
	 */
	public start() {
		this.startUpdateTimer();
	}

	/**
	 * 停止面板
	 */
	public stop() {
		this.stopUpdateTimer();
	}

	/**
	 * 销毁面板
	 */
	public destroy() {
		this.stop();
		this.cleanupEventListeners();
		if (this.panelElement && this.panelElement.parentNode) {
			this.panelElement.parentNode.removeChild(this.panelElement);
		}
	}

	/**
	 * 清理事件监听器
	 */
	private cleanupEventListeners() {
		document.removeEventListener('keydown', this.eventHandlers.toggleFun);

		const minimizeBtn = this.panelElement.querySelector('.minimize-btn');
		if (minimizeBtn) {
			minimizeBtn.removeEventListener('click', this.eventHandlers.minimizeHandler);
		}

		const closeBtn = this.panelElement.querySelector('.close-btn');
		if (closeBtn) {
			closeBtn.removeEventListener('click', this.eventHandlers.closeHandler);
		}

		if (this.isDragging) {
			document.removeEventListener('mousemove', this.eventHandlers.dragMoveHandler);
			document.removeEventListener('mouseup', this.eventHandlers.dragEndHandler);
		}
	}

	/**
	 * 添加内部样式
	 */
	protected addInternalStyles() {
		const styleId = 'base-panel-styles';
		if (document.getElementById(styleId)) return;

		const style = document.createElement('style');
		style.id = styleId;
		style.textContent = `
			.debug-panel {
				font-family: 'Courier New', monospace;
				user-select: none;
			}

			.debug-panel[data-theme="dark"] .panel-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 8px 12px;
				background: rgba(255, 255, 255, 0.1);
				border-bottom: 1px solid #333;
				border-radius: 8px 8px 0 0;
			}

			.debug-panel[data-theme="light"] .panel-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 8px 12px;
				background: rgba(0, 0, 0, 0.1);
				border-bottom: 1px solid #ddd;
				border-radius: 8px 8px 0 0;
			}

			.panel-title {
				font-weight: bold;
				font-size: 14px;
			}

			.panel-controls {
				display: flex;
				gap: 4px;
			}

			.panel-btn {
				background: none;
				border: none;
				color: inherit;
				cursor: pointer;
				padding: 2px 6px;
				border-radius: 3px;
				font-size: 14px;
				line-height: 1;
			}

			.debug-panel[data-theme="dark"] .panel-btn:hover {
				background: rgba(255, 255, 255, 0.2);
			}

			.debug-panel[data-theme="light"] .panel-btn:hover {
				background: rgba(0, 0, 0, 0.2);
			}

			.panel-content {
					padding: 12px;
					max-height: 400px;
					overflow-y: auto;
				}

				.panel-content::-webkit-scrollbar {
					display: none;
				}

				.panel-content {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
		`;
		document.head.appendChild(style);
	}
}
