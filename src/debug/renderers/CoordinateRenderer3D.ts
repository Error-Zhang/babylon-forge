import { type CoordinateSystemInfo } from '../CoordinateSystemMonitor';

/**
 * 3D坐标系渲染器配置
 */
export interface CoordinateRenderer3DConfig {
	width: number;
	height: number;
	showGrid?: boolean;
	showAxes?: boolean;
	gridSize?: number;
	axisLength?: number;
	scale?: number;
	rotationX?: number;
	rotationY?: number;
	perspective?: number;
	theme?: 'dark' | 'light';
	invertAxes?: boolean;
	showDistanceLine?: boolean;
	showOriginCoordinates?: boolean;
	origin?: { x: number; y: number; z: number };
}

/**
 * 3D坐标系渲染器
 * 在Canvas上绘制3D坐标系和摄像机位置（使用简单的透视投影）
 */
export class CoordinateRenderer3D {
	private ctx: CanvasRenderingContext2D;
	private config: Required<CoordinateRenderer3DConfig>;
	private centerX: number;
	private centerY: number;
	private canvas: HTMLCanvasElement;
	private isDragging: boolean = false;
	private lastMouseX: number = 0;
	private lastMouseY: number = 0;

	// 轴标签点击区域
	private axisClickAreas: Map<string, { x: number; y: number; width: number; height: number }> = new Map();

	// 动画相关
	private isAnimating: boolean = false;
	private animationStartTime: number = 0;

	// 摄像机坐标显示
	private cameraCoordinates: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
	private animationDuration: number = 500; // 动画持续时间（毫秒）
	private startRotationX: number = 0;
	private startRotationY: number = 0;
	private targetRotationX: number = 0;
	private targetRotationY: number = 0;

	constructor(ctx: CanvasRenderingContext2D, config: CoordinateRenderer3DConfig) {
		this.ctx = ctx;
		this.canvas = ctx.canvas;
		this.config = {
				width: config.width,
				height: config.height,
				showGrid: config.showGrid ?? true,
				showAxes: config.showAxes ?? true,
				gridSize: config.gridSize ?? 20,
				axisLength: config.axisLength ?? 80,
				scale: config.scale ?? 1,
				rotationX: config.rotationX ?? 0.3, // 绕X轴旋转角度
				rotationY: config.rotationY ?? 0.5, // 绕Y轴旋转角度
				perspective: config.perspective ?? 300, // 透视距离
				theme: config.theme ?? 'dark',
				invertAxes: config.invertAxes ?? false,
				showDistanceLine: config.showDistanceLine ?? false,
				showOriginCoordinates: config.showOriginCoordinates ?? false,
				origin: config.origin ?? { x: 0, y: 0, z: 0 },
			};

		this.centerX = this.config.width / 2;
		this.centerY = this.config.height / 2;

		this.setupMouseEvents();
	}

	/**
	 * 渲染3D坐标系
	 */
	public render(coordinateInfo: CoordinateSystemInfo, scaleRatio: number = 10) {
		// 清空画布
		this.ctx.clearRect(0, 0, this.config.width, this.config.height);

		// 设置背景
		this.drawBackground();

		// 绘制网格
		if (this.config.showGrid) {
			this.draw3DGrid();
		}

		// 绘制坐标轴
		if (this.config.showAxes) {
			this.draw3DAxes();
		}

		// 绘制摄像机位置
		this.draw3DCamera(coordinateInfo, scaleRatio);

		// 绘制图例
		this.draw3DLegend(scaleRatio);

		// 绘制当前坐标
		this.drawCurrentCoordinates();
	}

	/**
	 * 3D到2D投影转换
	 */
	private project3D(x: number, y: number, z: number): { x: number; y: number; depth: number } {
		// 应用旋转变换
		const cosX = Math.cos(this.config.rotationX);
		const sinX = Math.sin(this.config.rotationX);
		const cosY = Math.cos(this.config.rotationY);
		const sinY = Math.sin(this.config.rotationY);

		// 绕Y轴旋转
		const x1 = x * cosY - z * sinY;
		const z1 = x * sinY + z * cosY;

		// 绕X轴旋转
		const y2 = y * cosX - z1 * sinX;
		const z2 = y * sinX + z1 * cosX;

		// 透视投影
		const perspective = this.config.perspective;
		const scale = perspective / (perspective + z2);

		return {
			x: this.centerX + x1 * scale * this.config.scale,
			y: this.centerY - y2 * scale * this.config.scale, // Y轴向上
			depth: z2,
		};
	}

	/**
	 * 绘制背景
	 */
	private drawBackground() {
		const isDark = this.config.theme === 'dark';
		this.ctx.fillStyle = isDark ? 'rgba(15, 15, 25, 0.9)' : 'rgba(255, 255, 255, 0.9)';
		this.ctx.fillRect(0, 0, this.config.width, this.config.height);
	}

	/**
	 * 绘制3D网格
	 */
	private draw3DGrid() {
		const isDark = this.config.theme === 'dark';
		this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
		this.ctx.lineWidth = 0.8;

		// 使用配置中的网格大小，但保持足够的覆盖范围
		const gridRange = Math.max(200, this.config.gridSize * 10); // 确保全屏覆盖
		const gridStep = this.config.gridSize;

		// XY平面网格 (Z=0)
		this.ctx.beginPath();
		for (let i = -gridRange; i <= gridRange; i += gridStep) {
			// X方向线
			const start = this.project3D(i, -gridRange, 0);
			const end = this.project3D(i, gridRange, 0);
			this.ctx.moveTo(start.x, start.y);
			this.ctx.lineTo(end.x, end.y);

			// Y方向线
			const start2 = this.project3D(-gridRange, i, 0);
			const end2 = this.project3D(gridRange, i, 0);
			this.ctx.moveTo(start2.x, start2.y);
			this.ctx.lineTo(end2.x, end2.y);
		}
		this.ctx.stroke();

		// XZ平面网格 (Y=0)
		this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
		this.ctx.beginPath();
		for (let i = -gridRange; i <= gridRange; i += gridStep) {
			// X方向线
			const start = this.project3D(i, 0, -gridRange);
			const end = this.project3D(i, 0, gridRange);
			this.ctx.moveTo(start.x, start.y);
			this.ctx.lineTo(end.x, end.y);

			// Z方向线
			const start2 = this.project3D(-gridRange, 0, i);
			const end2 = this.project3D(gridRange, 0, i);
			this.ctx.moveTo(start2.x, start2.y);
			this.ctx.lineTo(end2.x, end2.y);
		}
		this.ctx.stroke();
	}

	/**
	 * 绘制3D到原点距离线
	 */
	private draw3DDistanceLineToOrigin(cameraPos: { x: number; y: number; depth: number }, camera: any, displayScale: number) {
		const isDark = this.config.theme === 'dark';

		// 投影配置的原点位置
		const origin = this.project3D(this.config.origin.x, this.config.origin.y, this.config.origin.z);

		// 绘制距离线
		this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 165, 0, 0.6)';
		this.ctx.lineWidth = 1;
		this.ctx.setLineDash([4, 4]);
		this.ctx.beginPath();
		this.ctx.moveTo(cameraPos.x, cameraPos.y);
		this.ctx.lineTo(origin.x, origin.y);
		this.ctx.stroke();
		this.ctx.setLineDash([]);

		// 计算实际距离（3D空间中相对于配置原点的距离）
		const distance = Math.sqrt(
			(camera.position.x - this.config.origin.x) * (camera.position.x - this.config.origin.x) +
			(camera.position.y - this.config.origin.y) * (camera.position.y - this.config.origin.y) +
			(camera.position.z - this.config.origin.z) * (camera.position.z - this.config.origin.z)
		);

		// 在距离线中点显示距离文本
		const midX = (cameraPos.x + origin.x) / 2;
		const midY = (cameraPos.y + origin.y) / 2;

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
	 * 绘制3D坐标轴
	 */
	private draw3DAxes() {
		const axisLength = this.config.axisLength;

		// 根据反转设置确定轴的方向
		const xDirection = this.config.invertAxes ? -1 : 1;
		const yDirection = this.config.invertAxes ? -1 : 1;
		const zDirection = this.config.invertAxes ? -1 : 1;

		// 配置的原点
		const origin = this.project3D(this.config.origin.x, this.config.origin.y, this.config.origin.z);

		// X轴 (红色)
		const xEnd = this.project3D(this.config.origin.x + axisLength * xDirection, this.config.origin.y, this.config.origin.z);
		this.ctx.strokeStyle = 'red';
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();
		this.ctx.moveTo(origin.x, origin.y);
		this.ctx.lineTo(xEnd.x, xEnd.y);
		this.ctx.stroke();
		this.draw3DArrow(xEnd, 'red', origin);

		// Y轴 (绿色)
		const yEnd = this.project3D(this.config.origin.x, this.config.origin.y + axisLength * yDirection, this.config.origin.z);
		this.ctx.strokeStyle = 'green';
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();
		this.ctx.moveTo(origin.x, origin.y);
		this.ctx.lineTo(yEnd.x, yEnd.y);
		this.ctx.stroke();
		this.draw3DArrow(yEnd, 'green', origin);

		// Z轴 (蓝色)
		const zEnd = this.project3D(this.config.origin.x, this.config.origin.y, this.config.origin.z + axisLength * zDirection);
		this.ctx.strokeStyle = 'blue';
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();
		this.ctx.moveTo(origin.x, origin.y);
		this.ctx.lineTo(zEnd.x, zEnd.y);
		this.ctx.stroke();
		this.draw3DArrow(zEnd, 'blue', origin);

		// 绘制轴标签
		this.draw3DAxisLabels();
	}

	/**
	 * 绘制3D箭头
	 */
	private draw3DArrow(point: { x: number; y: number }, color: string, fromPoint?: { x: number; y: number }) {
		if (!fromPoint) {
			// 如果没有起点，绘制简单的圆点
			this.ctx.fillStyle = color;
			this.ctx.beginPath();
			this.ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
			this.ctx.fill();
			return;
		}

		// 计算箭头方向
		const dx = point.x - fromPoint.x;
		const dy = point.y - fromPoint.y;
		const angle = Math.atan2(dy, dx);

		// 箭头参数
		const arrowLength = 12;
		const arrowWidth = 6;

		// 绘制箭头
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
		this.ctx.moveTo(point.x, point.y);
		this.ctx.lineTo(point.x - arrowLength * Math.cos(angle - Math.PI / 6), point.y - arrowLength * Math.sin(angle - Math.PI / 6));
		this.ctx.lineTo(point.x - arrowLength * Math.cos(angle + Math.PI / 6), point.y - arrowLength * Math.sin(angle + Math.PI / 6));
		this.ctx.closePath();
		this.ctx.fill();

		// 在箭头末端绘制一个小圆点作为强调
		this.ctx.beginPath();
		this.ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
		this.ctx.fill();
	}

	/**
	 * 绘制3D轴标签
	 */
	private draw3DAxisLabels() {
		const isDark = this.config.theme === 'dark';
		this.ctx.font = '12px Arial';
		this.ctx.textAlign = 'center';

		const axisLength = this.config.axisLength;

		// 根据反转设置确定标签位置
		const xDirection = this.config.invertAxes ? -1 : 1;
		const yDirection = this.config.invertAxes ? -1 : 1;
		const zDirection = this.config.invertAxes ? -1 : 1;

		// 清空之前的点击区域
		this.axisClickAreas.clear();

		// X轴标签
		const xLabel = this.project3D(this.config.origin.x + (axisLength + 10) * xDirection, this.config.origin.y, this.config.origin.z);
		this.drawAxisLabel('X', xLabel.x, xLabel.y + 4, 'red', isDark);
		this.axisClickAreas.set('X', { x: xLabel.x - 8, y: xLabel.y -8, width: 24, height: 24 });

		// Y轴标签
		const yLabel = this.project3D(this.config.origin.x, this.config.origin.y + (axisLength + 10) * yDirection, this.config.origin.z);
		this.drawAxisLabel('Y', yLabel.x, yLabel.y, 'green', isDark);
		this.axisClickAreas.set('Y', { x: yLabel.x - 12, y: yLabel.y - 12, width: 24, height: 24 });

		// Z轴标签 - 稍微往下调整
		const zLabel = this.project3D(this.config.origin.x, this.config.origin.y, this.config.origin.z + (axisLength + 10) * zDirection);
		this.drawAxisLabel('Z', zLabel.x, zLabel.y + 4, 'blue', isDark);
		this.axisClickAreas.set('Z', { x: zLabel.x - 8, y: zLabel.y -8, width: 24, height: 24 });

		// 原点标签
        const origin = this.project3D(this.config.origin.x - 10, this.config.origin.y - 10, this.config.origin.z);
        this.drawAxisLabel('O', origin.x, origin.y, '#666', isDark);
        this.axisClickAreas.set('O', { x: origin.x - 12, y: origin.y - 12, width: 24, height: 24 });

        // 绘制原点坐标（如果启用）
        if (this.config.showOriginCoordinates) {
            const originCoords = `(${this.config.origin.x}, ${this.config.origin.y}, ${this.config.origin.z})`;
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'left';
            
            // 计算坐标文本位置（在O标签旁边）
            const coordX = origin.x + 15;
            const coordY = origin.y + 3;
            
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
	 * 绘制单个轴标签
	 */
	private drawAxisLabel(text: string, x: number, y: number, color: string, isDark: boolean) {
		// 绘制背景
		this.ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
		this.ctx.fillRect(x - 10, y - 12, 20, 16);

		// 绘制边框（高亮可点击区域）
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = 1;
		this.ctx.strokeRect(x - 10, y - 12, 20, 16);

		// 绘制文字
		this.ctx.fillStyle = color;
		this.ctx.fillText(text, x, y + 3);
	}

	/**
	 * 绘制3D摄像机位置
	 */
	private draw3DCamera(coordinateInfo: CoordinateSystemInfo, scaleRatio: number = 10) {
		const camera = coordinateInfo.camera;

		// 使用网格倍数和比例尺来计算摄像机显示位置
		const gridMultiplier = this.config.gridSize / 20; // 基准网格大小为20
		const displayScale = gridMultiplier / scaleRatio; // 除以比例尺

		// 投影摄像机位置和目标点
		const cameraPos = this.project3D(camera.position.x * displayScale, camera.position.y * displayScale, camera.position.z * displayScale);

		const targetPos = this.project3D(camera.target.x * displayScale, camera.target.y * displayScale, camera.target.z * displayScale);

		// 绘制摄像机位置
		this.ctx.fillStyle = '#ffaa00';
		this.ctx.beginPath();
		this.ctx.arc(cameraPos.x, cameraPos.y, 5, 0, 2 * Math.PI);
		this.ctx.fill();

		// 绘制摄像机方向箭头
		this.draw3DDirectionArrow(cameraPos.x, cameraPos.y, targetPos.x, targetPos.y, '#ffaa00');

		// 绘制摄像机视锥体（简化版）
		this.draw3DCameraFrustum(camera, cameraPos, targetPos);

		// 绘制到原点距离线（如果启用）
		if (this.config.showDistanceLine) {
			this.draw3DDistanceLineToOrigin(cameraPos, camera, displayScale);
		}
	}

	/**
	 * 绘制3D方向箭头
	 */
	private draw3DDirectionArrow(fromX: number, fromY: number, toX: number, toY: number, color: string) {
		// console.log('Drawing 3D arrow from', { fromX, fromY }, 'to', { toX, toY });

		// 计算方向和距离
		const dx = toX - fromX;
		const dy = toY - fromY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// console.log('3D Arrow distance:', distance);

		// 确保箭头有足够的长度来显示
		if (distance < 20) {
			// console.log('3D Distance too short, extending arrow');
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

		// console.log('3D Arrow drawn successfully');
	}

	/**
	 * 绘制摄像机视锥体
	 */
	private draw3DCameraFrustum(camera: any, cameraPos: { x: number; y: number }, targetPos: { x: number; y: number }) {
		// 简化的视锥体绘制
		const fovRad = ((camera.fov || 45) * Math.PI) / 180;
		const distance = 30; // 视锥体长度

		// 计算视锥体的四个角点（简化为2D投影）
		const halfWidth = Math.tan(fovRad / 2) * distance;

		this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
		this.ctx.lineWidth = 1;
		this.ctx.beginPath();

		// 绘制视锥体边缘线
		const angle = Math.atan2(targetPos.y - cameraPos.y, targetPos.x - cameraPos.x);
		const perpAngle1 = angle + Math.PI / 2;
		const perpAngle2 = angle - Math.PI / 2;

		const corner1X = targetPos.x + Math.cos(perpAngle1) * halfWidth;
		const corner1Y = targetPos.y + Math.sin(perpAngle1) * halfWidth;
		const corner2X = targetPos.x + Math.cos(perpAngle2) * halfWidth;
		const corner2Y = targetPos.y + Math.sin(perpAngle2) * halfWidth;

		this.ctx.moveTo(cameraPos.x, cameraPos.y);
		this.ctx.lineTo(corner1X, corner1Y);
		this.ctx.moveTo(cameraPos.x, cameraPos.y);
		this.ctx.lineTo(corner2X, corner2Y);
		this.ctx.moveTo(corner1X, corner1Y);
		this.ctx.lineTo(corner2X, corner2Y);

		this.ctx.stroke();
	}

	/**
	 * 绘制比例尺
	 */
	private draw3DScale(scaleRatio: number = 10) {
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
	 * 绘制3D图例
	 */
	private draw3DLegend(scaleRatio: number = 10) {
		this.draw3DScale(scaleRatio);
	}

	/**
	 * 更新配置
	 */
	public updateConfig(config: Partial<CoordinateRenderer3DConfig>) {
		Object.assign(this.config, config);
		this.centerX = this.config.width / 2;
		this.centerY = this.config.height / 2;
	}

	/**
	 * 设置旋转角度
	 */
	public setRotation(rotationX: number, rotationY: number) {
		this.config.rotationX = rotationX;
		this.config.rotationY = rotationY;
	}

	/**
	 * 预设视角角度
	 */
	private getPresetAngles(axis: string): { rotationX: number; rotationY: number } {
		switch (axis) {
			case 'X':
				// 点击X轴，显示YZ平面（从X轴正方向看向原点）
				return { rotationX: 0, rotationY: -Math.PI / 2 };
			case 'Y':
				// 点击Y轴，显示XZ平面（从Y轴正方向看向原点）
				return { rotationX: -Math.PI / 2, rotationY: 0 };
			case 'Z':
				// 点击Z轴，显示XY平面（从Z轴正方向看向原点）
				return { rotationX: 0, rotationY: Math.PI };
			case 'O':
				// 等距视角（默认视角）
				return { rotationX: 0.3, rotationY: 0.5 };
			default:
				return { rotationX: this.config.rotationX, rotationY: this.config.rotationY };
		}
	}

	/**
	 * 设置预设视角
	 */
	public setPresetView(axis: string) {
		if (this.isAnimating) return; // 如果正在动画中，忽略新的请求

		const targetAngles = this.getPresetAngles(axis);
		this.animateToRotation(targetAngles.rotationX, targetAngles.rotationY);
	}

	/**
	 * 动画到指定旋转角度
	 */
	private animateToRotation(targetX: number, targetY: number) {
		this.isAnimating = true;
		this.animationStartTime = performance.now();
		this.startRotationX = this.config.rotationX;
		this.startRotationY = this.config.rotationY;

		// 计算最短路径
		this.targetRotationX = targetX;
		this.targetRotationY = this.normalizeAngle(targetY, this.config.rotationY);

		this.animateFrame();
	}

	/**
	 * 标准化角度，选择最短路径
	 */
	private normalizeAngle(targetAngle: number, currentAngle: number): number {
		// 计算角度差
		let diff = targetAngle - currentAngle;

		// 将差值标准化到 [-π, π] 范围内
		while (diff > Math.PI) {
			diff -= 2 * Math.PI;
		}
		while (diff < -Math.PI) {
			diff += 2 * Math.PI;
		}

		return currentAngle + diff;
	}

	/**
	 * 动画帧
	 */
	private animateFrame() {
		if (!this.isAnimating) return;

		const currentTime = performance.now();
		const elapsed = currentTime - this.animationStartTime;
		const progress = Math.min(elapsed / this.animationDuration, 1);

		// 使用缓动函数（ease-out）
		const easeProgress = 1 - Math.pow(1 - progress, 3);

		// 插值计算当前角度
		this.config.rotationX = this.startRotationX + (this.targetRotationX - this.startRotationX) * easeProgress;
		this.config.rotationY = this.startRotationY + (this.targetRotationY - this.startRotationY) * easeProgress;

		// 触发重新渲染
		this.requestRender();

		if (progress < 1) {
			requestAnimationFrame(() => this.animateFrame());
		} else {
			this.isAnimating = false;
		}
	}

	/**
	 * 设置鼠标事件
	 */
	private setupMouseEvents() {
		// 创建3D专用的事件处理器
		const handle3DMouseDown = (e: MouseEvent) => {
			// 检查当前是否为3D视图
			const currentView = this.getCurrentView();
			if (currentView !== '3d' || this.isAnimating) return;

			this.isDragging = true;
			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;
			this.canvas.style.cursor = 'grabbing';
		};

		const handle3DMouseMove = (e: MouseEvent) => {
			// 检查当前是否为3D视图
			const currentView = this.getCurrentView();
			if (currentView !== '3d') return;

			// 更新当前坐标显示已在单独的事件监听器中处理

			if (!this.isDragging || this.isAnimating) return;

			const deltaX = e.clientX - this.lastMouseX;
			const deltaY = e.clientY - this.lastMouseY;

			// 更新旋转角度
			this.config.rotationY += deltaX * 0.01; // 水平拖拽控制Y轴旋转
			this.config.rotationX += deltaY * 0.01; // 垂直拖拽控制X轴旋转

			// 限制X轴旋转角度，避免翻转过度
			this.config.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.config.rotationX));

			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;

			// 触发重新渲染
			this.requestRender();
		};

		const handle3DMouseUp = () => {
			this.isDragging = false;
			this.canvas.style.cursor = 'grab';
		};

		const handle3DMouseLeave = () => {
			this.isDragging = false;
			this.canvas.style.cursor = 'default';
		};

		const handle3DMouseEnter = () => {
			if (!this.isDragging) {
				this.canvas.style.cursor = 'grab';
			}
		};

		const handle3DClick = (e: MouseEvent) => {
			// 检查当前是否为3D视图
			const currentView = this.getCurrentView();
			if (this.isAnimating || currentView !== '3d') return;

			this.handleAxisClick(e);
		};

		// 添加3D专用的事件监听器
		this.canvas.addEventListener('mousedown', handle3DMouseDown);
		this.canvas.addEventListener('mousemove', handle3DMouseMove);
		this.canvas.addEventListener('mouseup', handle3DMouseUp);
		this.canvas.addEventListener('mouseleave', handle3DMouseLeave);
		this.canvas.addEventListener('mouseenter', handle3DMouseEnter);
		this.canvas.addEventListener('click', handle3DClick);

		// 添加3D摄像机坐标更新事件监听和鼠标悬浮检测
		this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
			const currentView = this.getCurrentView();
			if (currentView === '3d') {
				// 检查鼠标是否悬浮在轴标签上
				const rect = this.canvas.getBoundingClientRect();
				const scaleX = this.canvas.width / rect.width;
				const scaleY = this.canvas.height / rect.height;
				const x = (e.clientX - rect.left) * scaleX;
				const y = (e.clientY - rect.top) * scaleY;

				const hoveredAxis = this.isPointInAxisArea(x, y);
				if (hoveredAxis) {
					this.canvas.style.cursor = 'pointer';
				} else {
					this.canvas.style.cursor = 'grab';
				}
			}
		});

		// 设置初始光标样式
		this.canvas.style.cursor = 'grab';
	}

	/**
	 * 获取当前视图模式
	 */
	private getCurrentView(): '2d' | '3d' {
		// 通过自定义事件获取当前视图
		const event = new CustomEvent('get-current-view');
		this.canvas.dispatchEvent(event);

		// 从canvas的data属性中读取当前视图
		return (this.canvas.dataset.currentView as '2d' | '3d') || '3d';
	}

	/**
     * 处理轴标签点击
     */
    private handleAxisClick(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        // 考虑Canvas缩放比例进行坐标转换
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // 检查是否点击了轴标签
        for (const [axis, area] of this.axisClickAreas) {
            if (x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height) {
                this.setPresetView(axis);

                // 触发自定义事件，通知面板
                const event = new CustomEvent('axis-clicked', { detail: { axis } });
                this.canvas.dispatchEvent(event);
                break;
            }
        }
    }

	/**
	 * 检查点击位置是否在轴标签区域内
	 */
	private isPointInAxisArea(x: number, y: number): string | null {
		for (const [axis, area] of this.axisClickAreas) {
			if (x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height) {
				return axis;
			}
		}
		return null;
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
		const coordText = `X: ${this.cameraCoordinates.x.toFixed(2)}, Y: ${this.cameraCoordinates.y.toFixed(2)}, Z: ${this.cameraCoordinates.z.toFixed(2)}`;

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
	 * 请求重新渲染
	 */
	private requestRender() {
		// 通过自定义事件通知需要重新渲染
		const event = new CustomEvent('3d-rotation-changed');
		this.canvas.dispatchEvent(event);
	}
}
