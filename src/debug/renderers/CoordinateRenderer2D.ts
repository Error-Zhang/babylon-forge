import { type CoordinateSystemInfo } from '../CoordinateSystemMonitor';

/**
 * 2D坐标系渲染器配置
 */
export interface CoordinateRenderer2DConfig {
	width: number;
	height: number;
	showGrid?: boolean;
	showAxes?: boolean;
	gridSize?: number;
	axisLength?: number;
	scale?: number;
	theme?: 'dark' | 'light';
	panOffsetX?: number;
	panOffsetY?: number;
	invertAxes?: boolean;
	showDistanceLine?: boolean;
	showOriginCoordinates?: boolean;
	origin?: { x: number; y: number; z: number };
}

/**
 * 2D坐标系渲染器
 * 在Canvas上绘制2D坐标系和摄像机位置
 */
export class CoordinateRenderer2D {
	private ctx: CanvasRenderingContext2D;
	private config: Required<CoordinateRenderer2DConfig>;
	private centerX: number;
	private centerY: number;
	private canvas: HTMLCanvasElement;
	
	// 回到原点按钮相关
	private resetButtonArea: { x: number; y: number; width: number; height: number } | null = null;
	private isHoveringResetButton: boolean = false;
	private isHoveringCanvas: boolean = false;
	
	// 摄像机坐标显示
	private cameraCoordinates: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

	constructor(ctx: CanvasRenderingContext2D, config: CoordinateRenderer2DConfig) {
		this.ctx = ctx;
		this.canvas = ctx.canvas;
		this.config = {
			width: config.width,
			height: config.height,
			showGrid: config.showGrid ?? true,
			showAxes: config.showAxes ?? true,
			gridSize: config.gridSize ?? 20,
			axisLength: config.axisLength ?? 100,
			scale: config.scale ?? 1,
			theme: config.theme ?? 'dark',
			panOffsetX: config.panOffsetX ?? 0,
			panOffsetY: config.panOffsetY ?? 0,
			invertAxes: config.invertAxes ?? false,
			showDistanceLine: config.showDistanceLine ?? false,
			showOriginCoordinates: config.showOriginCoordinates ?? false,
			origin: config.origin ?? { x: 0, y: 0, z: 0 },
		};

		this.centerX = this.config.width / 2;
		this.centerY = this.config.height / 2;
	}

	/**
	 * 渲染2D坐标系
	 */
	public render(coordinateInfo: CoordinateSystemInfo, scaleRatio: number = 10) {
		// 清空画布
		this.ctx.clearRect(0, 0, this.config.width, this.config.height);

		// 设置背景
		this.drawBackground();

		// 绘制网格
		if (this.config.showGrid) {
			this.drawGrid();
		}

		// 绘制坐标轴
		if (this.config.showAxes) {
			this.drawAxes();
		}

		// 绘制摄像机位置
		this.drawCamera(coordinateInfo, scaleRatio);

		// 绘制图例
		this.drawLegend(scaleRatio);

		// 绘制回到原点按钮
		this.drawResetButton();
		
		// 绘制当前坐标
		this.drawCurrentCoordinates();
	}

	/**
	 * 绘制背景
	 */
	private drawBackground() {
		const isDark = this.config.theme === 'dark';
		this.ctx.fillStyle = isDark ? 'rgba(20, 20, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)';
		this.ctx.fillRect(0, 0, this.config.width, this.config.height);
	}

	/**
	 * 绘制网格
	 */
	private drawGrid() {
		const isDark = this.config.theme === 'dark';
		this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
		this.ctx.lineWidth = 0.8;
		this.ctx.beginPath();

		// 计算网格偏移
		const offsetX = this.config.panOffsetX % this.config.gridSize;
		const offsetY = this.config.panOffsetY % this.config.gridSize;

		// 垂直线
		for (let x = -this.config.gridSize + offsetX; x <= this.config.width + this.config.gridSize; x += this.config.gridSize) {
			this.ctx.moveTo(x, 0);
			this.ctx.lineTo(x, this.config.height);
		}

		// 水平线
		for (let y = -this.config.gridSize + offsetY; y <= this.config.height + this.config.gridSize; y += this.config.gridSize) {
			this.ctx.moveTo(0, y);
			this.ctx.lineTo(this.config.width, y);
		}

		this.ctx.stroke();
	}

	/**
	 * 绘制坐标轴
	 */
	private drawAxes() {
		this.ctx.lineWidth = 2;

		// 应用平移偏移和原点偏移
		const centerX = this.centerX + this.config.panOffsetX + this.config.origin.x;
		const centerY = this.centerY + this.config.panOffsetY + this.config.origin.z; // 2D视图中使用Z作为Y轴

		// 根据反转设置确定轴的方向
		const xDirection = this.config.invertAxes ? -1 : 1;
		const zDirection = this.config.invertAxes ? 1 : -1;

		// X轴 (红色)
		this.ctx.strokeStyle = 'red';
		this.ctx.beginPath();
		this.ctx.moveTo(centerX, centerY);
		this.ctx.lineTo(centerX + this.config.axisLength * xDirection, centerY);
		this.ctx.stroke();

		// X轴箭头
		this.drawArrow(centerX + this.config.axisLength * xDirection, centerY, xDirection > 0 ? 0 : Math.PI, 'red');

		// Z轴 (蓝色) - Z轴向上为正，但Canvas坐标向下为正
		this.ctx.strokeStyle = 'blue';
		this.ctx.beginPath();
		this.ctx.moveTo(centerX, centerY);
		this.ctx.lineTo(centerX, centerY + this.config.axisLength * zDirection);
		this.ctx.stroke();

		// Z轴箭头
		this.drawArrow(centerX, centerY + this.config.axisLength * zDirection, zDirection > 0 ? Math.PI / 2 : -Math.PI / 2, 'blue');

		// 绘制轴标签
		this.drawAxisLabels(centerX, centerY);
	}

	/**
	 * 绘制箭头
	 */
	private drawArrow(x: number, y: number, angle: number, color: string) {
		const arrowSize = 8;
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
		this.ctx.moveTo(x, y);
		this.ctx.lineTo(x - arrowSize * Math.cos(angle - Math.PI / 6), y - arrowSize * Math.sin(angle - Math.PI / 6));
		this.ctx.lineTo(x - arrowSize * Math.cos(angle + Math.PI / 6), y - arrowSize * Math.sin(angle + Math.PI / 6));
		this.ctx.closePath();
		this.ctx.fill();
	}

	/**
	 * 绘制轴标签
	 */
	private drawAxisLabels(centerX?: number, centerY?: number) {
		const isDark = this.config.theme === 'dark';
		this.ctx.font = '12px Arial';
		this.ctx.textAlign = 'center';

		// 使用传入的中心点或默认中心点
		const cx = centerX ?? this.centerX;
		const cy = centerY ?? this.centerY;

		// 根据反转设置确定标签位置
		const xDirection = this.config.invertAxes ? -1 : 1;
		const zDirection = this.config.invertAxes ? 1 : -1;

		// X轴标签背景
		const xLabelX = cx + (this.config.axisLength + 15) * xDirection;
		const xLabelY = cy + 8;
		this.ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
		this.ctx.fillRect(xLabelX - 8, xLabelY - 10, 16, 14);

		// Z轴标签背景
		const zLabelX = cx;
		const zLabelY = cy + (this.config.axisLength + 2) * zDirection + (this.config.invertAxes ? 14 : 0);
		this.ctx.fillRect(zLabelX - 8, zLabelY - 10, 16, 14);

		// 原点标签背景
		const oLabelX = cx - 15;
		const oLabelY = cy + 15;
		this.ctx.fillRect(oLabelX - 8, oLabelY - 10, 16, 14);

		// 绘制标签文字
		this.ctx.fillStyle = isDark ? '#ffffff' : '#000000';
		this.ctx.fillText('X', xLabelX, xLabelY);
		this.ctx.fillText('Z', zLabelX, zLabelY);
		this.ctx.fillText('O', oLabelX, oLabelY);

		// 绘制原点坐标（如果启用）
		if (this.config.showOriginCoordinates) {
			const originCoords = `(${this.config.origin.x}, ${this.config.origin.y}, ${this.config.origin.z})`;
			this.ctx.font = '10px Arial';
			this.ctx.textAlign = 'left';
			
			// 计算坐标文本位置（在O标签旁边）
			const coordX = oLabelX + 20;
			const coordY = oLabelY;
			
			// 绘制坐标文本背景
			const textMetrics = this.ctx.measureText(originCoords);
			const textWidth = textMetrics.width + 4;
			const textHeight = 12;
			this.ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
			this.ctx.fillRect(coordX - 2, coordY - 8, textWidth, textHeight);
			
			// 绘制坐标文本
			this.ctx.fillStyle = isDark ? '#ffffff' : '#000000';
			this.ctx.fillText(originCoords, coordX, coordY);
			
			// 恢复字体和对齐方式
			this.ctx.font = '12px Arial';
			this.ctx.textAlign = 'center';
		}
	}

	/**
	 * 绘制摄像机位置
	 */
	private drawCamera(coordinateInfo: CoordinateSystemInfo, scaleRatio: number = 10) {
		const camera = coordinateInfo.camera;

		// 使用网格倍数和比例尺来计算摄像机显示位置
		const gridMultiplier = this.config.gridSize / 20; // 基准网格大小为20
		const displayScale = gridMultiplier / scaleRatio; // 除以比例尺

		// 应用平移偏移和原点偏移
		const centerX = this.centerX + this.config.panOffsetX + this.config.origin.x;
		const centerY = this.centerY + this.config.panOffsetY + this.config.origin.z; // 2D视图中使用Z作为Y轴

		// 将3D坐标投影到2D平面 (使用XZ平面)
		const cameraX = centerX + camera.position.x * displayScale;
		const cameraZ = centerY - camera.position.z * displayScale; // Z轴向前，在2D中向上

		const targetX = centerX + camera.target.x * displayScale;
		const targetZ = centerY - camera.target.z * displayScale;

		// 绘制摄像机位置
		this.ctx.fillStyle = 'green';
		this.ctx.beginPath();
		this.ctx.arc(cameraX, cameraZ, 4, 0, 2 * Math.PI);
		this.ctx.fill();

		// 绘制摄像机方向箭头
		this.drawDirectionArrow(cameraX, cameraZ, targetX, targetZ, 'green');

		// 绘制到原点距离线（如果启用）
		if (this.config.showDistanceLine) {
			this.drawDistanceLineToOrigin(cameraX, cameraZ, centerX, centerY, camera, displayScale);
		}
	}

	/**
	 * 绘制方向箭头
	 */
	private drawDirectionArrow(fromX: number, fromY: number, toX: number, toY: number, color: string) {
		// console.log('Drawing arrow from', { fromX, fromY }, 'to', { toX, toY });

		// 计算方向和距离
		const dx = toX - fromX;
		const dy = toY - fromY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// console.log('Arrow distance:', distance);

		// 确保箭头有足够的长度来显示
		if (distance < 20) {
			// console.log('Distance too short, extending arrow');
			// 计算方向并延长箭头
			const angle = Math.atan2(dy, dx);
			const minLength = 25;
			toX = fromX + Math.cos(angle) * minLength;
			toY = fromY + Math.sin(angle) * minLength;
		}

		// 重新计算
		const newDx = toX - fromX;
		const newDy = toY - fromY;
		const angle = Math.atan2(newDy, newDx);

		// 绘制线条
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = 2;
		this.ctx.setLineDash([6, 3]);
		this.ctx.beginPath();
		this.ctx.moveTo(fromX, fromY);
		this.ctx.lineTo(toX, toY);
		this.ctx.stroke();
		this.ctx.setLineDash([]);

		// 绘制箭头头部
		const arrowSize = 10;
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
		this.ctx.moveTo(toX, toY);
		this.ctx.lineTo(toX - arrowSize * Math.cos(angle - Math.PI / 6), toY - arrowSize * Math.sin(angle - Math.PI / 6));
		this.ctx.lineTo(toX - arrowSize * Math.cos(angle + Math.PI / 6), toY - arrowSize * Math.sin(angle + Math.PI / 6));
		this.ctx.closePath();
		this.ctx.fill();

		// console.log('Arrow drawn successfully');
	}

	/**
	 * 绘制到原点距离线
	 */
	private drawDistanceLineToOrigin(cameraX: number, cameraZ: number, originX: number, originY: number, camera: any, displayScale: number) {
		const isDark = this.config.theme === 'dark';
		
		// 绘制距离线
		this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 165, 0, 0.6)';
		this.ctx.lineWidth = 1;
		this.ctx.setLineDash([4, 4]);
		this.ctx.beginPath();
		this.ctx.moveTo(cameraX, cameraZ);
		this.ctx.lineTo(originX, originY);
		this.ctx.stroke();
		this.ctx.setLineDash([]);

		// 计算实际距离（3D空间中相对于配置原点的距离）
		const distance = Math.sqrt(
			(camera.position.x - this.config.origin.x) * (camera.position.x - this.config.origin.x) +
			(camera.position.y - this.config.origin.y) * (camera.position.y - this.config.origin.y) +
			(camera.position.z - this.config.origin.z) * (camera.position.z - this.config.origin.z)
		);

		// 在距离线中点显示距离文本
		const midX = (cameraX + originX) / 2;
		const midY = (cameraZ + originY) / 2;

		// 绘制距离文本背景
		this.ctx.font = '10px Arial';
		this.ctx.textAlign = 'center';
		const distanceText = distance.toFixed(2);
		const textMetrics = this.ctx.measureText(distanceText);
		const textWidth = textMetrics.width + 4;
		const textHeight = 12;

		this.ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
		this.ctx.fillRect(midX - textWidth / 2, midY - textHeight / 2, textWidth, textHeight);

		// 绘制距离文本
		this.ctx.fillStyle = isDark ? '#ffff00' : '#ff6500';
		this.ctx.fillText(distanceText, midX, midY + 3);
	}

	/**
	 * 绘制比例尺
	 */
	private drawScale(scaleRatio: number = 10) {
		const isDark = this.config.theme === 'dark';
		const scaleX = 10;
		const scaleY = 10;

		// 计算网格倍数
		const baseGridSize = 20; // 基准网格大小
		const currentGridSize = this.config.gridSize;
		const multiplier = currentGridSize / baseGridSize;

		// 直接显示倍数
		const scaleText = `倍数: ${multiplier.toFixed(1)}x`;
		const ratioText = `比例: 1:${scaleRatio}`;

		// 绘制比例尺文字（无背景）
		this.ctx.fillStyle = isDark ? '#ffffff' : '#000000';
		this.ctx.font = '12px Arial';
		this.ctx.textAlign = 'left';
		this.ctx.fillText(scaleText, scaleX, scaleY + 15);
		this.ctx.fillText(ratioText, scaleX, scaleY + 30);
	}

	/**
	 * 绘制图例
	 */
	private drawLegend(scaleRatio: number = 10) {
		this.drawScale(scaleRatio);
	}

	/**
	 * 绘制回到原点按钮
	 */
	private drawResetButton() {
		const isDark = this.config.theme === 'dark';
		const buttonSize = 40;
		const margin = 15;
		
		// 按钮位置（左下角）
		const buttonX = margin;
		const buttonY = this.config.height - buttonSize - margin;
		
		// 记录按钮区域用于点击检测
		this.resetButtonArea = {
			x: buttonX,
			y: buttonY,
			width: buttonSize,
			height: buttonSize
		};
		
		// 只在悬浮Canvas且原点不在中心位置时显示按钮
		const isOriginAtCenter = (this.config.panOffsetX === 0 && this.config.panOffsetY === 0);
		if (!this.isHoveringCanvas || isOriginAtCenter) return;
		
		const centerX = buttonX + buttonSize / 2;
		const centerY = buttonY + buttonSize / 2;
		
		// 绘制悬浮背景（圆形，半透明）
		this.ctx.fillStyle = isDark ? 'rgba(40, 40, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)';
		this.ctx.beginPath();
		this.ctx.arc(centerX, centerY, buttonSize / 2, 0, Math.PI * 2);
		this.ctx.fill();
		
		// 绘制边框
		this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.2)';
		this.ctx.lineWidth = 1;
		this.ctx.beginPath();
		this.ctx.arc(centerX, centerY, buttonSize / 2, 0, Math.PI * 2);
		this.ctx.stroke();
		
		// 绘制"回到原点"图标（房子形状）
		this.ctx.strokeStyle = isDark ? '#ffffff' : '#333333';
		this.ctx.fillStyle = isDark ? '#ffffff' : '#333333';
		this.ctx.lineWidth = 2;
		
		// 绘制房子底部
		const houseSize = 12;
		this.ctx.strokeRect(centerX - houseSize/2, centerY - 2, houseSize, houseSize * 0.7);
		
		// 绘制房子屋顶
		this.ctx.beginPath();
		this.ctx.moveTo(centerX - houseSize/2, centerY - 2);
		this.ctx.lineTo(centerX, centerY - houseSize/2);
		this.ctx.lineTo(centerX + houseSize/2, centerY - 2);
		this.ctx.stroke();
		
		// 绘制门
		const doorWidth = 3;
		const doorHeight = 6;
		this.ctx.fillRect(centerX - doorWidth/2, centerY + houseSize * 0.7 - 2 - doorHeight, doorWidth, doorHeight);
	}
	
	/**
	 * 检查点击是否在回到原点按钮上
	 */
	public isClickOnResetButton(x: number, y: number): boolean {
		if (!this.resetButtonArea) return false;
		
		// 检查是否在圆形按钮区域内
		const centerX = this.resetButtonArea.x + this.resetButtonArea.width / 2;
		const centerY = this.resetButtonArea.y + this.resetButtonArea.height / 2;
		const radius = this.resetButtonArea.width / 2;
		const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
		
		return distance <= radius;
	}
	
	/**
	 * 检查鼠标是否悬浮在回到原点按钮上
	 */
	public checkHoveringResetButton(x: number, y: number): boolean {
		if (!this.resetButtonArea) return false;
		
		// 检查是否在圆形按钮区域内
		const centerX = this.resetButtonArea.x + this.resetButtonArea.width / 2;
		const centerY = this.resetButtonArea.y + this.resetButtonArea.height / 2;
		const radius = this.resetButtonArea.width / 2;
		const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
		
		return distance <= radius;
	}
	
	/**
	 * 设置按钮悬浮状态
	 */
	public setHoveringResetButton(isHovering: boolean): void {
		if (this.isHoveringResetButton !== isHovering) {
			this.isHoveringResetButton = isHovering;
		}
	}
	
	/**
	 * 设置Canvas悬浮状态
	 */
	public setHoveringCanvas(isHovering: boolean): void {
		if (this.isHoveringCanvas !== isHovering) {
			this.isHoveringCanvas = isHovering;
			// 触发重新渲染
			const event = new CustomEvent('request-render');
			this.canvas.dispatchEvent(event);
		}
	}
	
	/**
	 * 获取按钮悬浮状态
	 */
	public getHoveringResetButton(): boolean {
		return this.isHoveringResetButton;
	}
	
	/**
	 * 获取Canvas悬浮状态
	 */
	public getHoveringCanvas(): boolean {
		return this.isHoveringCanvas;
	}
	
	/**
	 * 设置摄像机坐标
	 */
	public setCameraCoordinates(x: number, y: number, z: number): void {
		this.cameraCoordinates = { x, y, z };
	}
	
	/**
	 * 绘制摄像机坐标显示
	 */
	private drawCurrentCoordinates(): void {
		const isDark = this.config.theme === 'dark';
		const margin = 10;
		const padding = 4;
		
		// 设置字体 - 缩小字体
		this.ctx.font = '10px monospace';
		this.ctx.textAlign = 'right';
		this.ctx.textBaseline = 'bottom';
		
		// 格式化坐标文本 - 去掉Camera文字
		const coordText = `X: ${this.cameraCoordinates.x.toFixed(2)}, Z: ${this.cameraCoordinates.z.toFixed(2)}`;
		
		// 测量文本尺寸
		const textMetrics = this.ctx.measureText(coordText);
		const textWidth = textMetrics.width;
		const textHeight = 10; // 字体大小
		
		// 计算位置（右下角）
		const textX = this.config.width - margin - padding;
		const textY = this.config.height - margin - padding;
		
		// 绘制坐标文本（无背景）
		this.ctx.fillStyle = isDark ? '#ffffff' : '#333333';
		this.ctx.fillText(coordText, textX, textY);
	}
	
	/**
	 * 重置到原点
	 */
	public resetToOrigin(): void {
		// 触发自定义事件通知面板重置平移偏移
		const event = new CustomEvent('reset-to-origin');
		this.canvas.dispatchEvent(event);
	}

	/**
	 * 更新配置
	 */
	public updateConfig(config: Partial<CoordinateRenderer2DConfig>) {
		Object.assign(this.config, config);
		this.centerX = this.config.width / 2;
		this.centerY = this.config.height / 2;
	}
}
