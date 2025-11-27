import { AdvancedDynamicTexture, Control, Rectangle } from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
/**
 * 在屏幕中间添加一个准星
 * @param scene
 * @param size
 * @param color
 */
export const addCrossHair = (scene: Scene, size = 8, color = 'white') => {
	const ui = AdvancedDynamicTexture.CreateFullscreenUI('CrosshairUI', true, scene);
	const thickness = 1.5;
	const createLine = (x: number, y: number, width: number, height: number) => {
		const line = new Rectangle();
		line.width = `${width}px`;
		line.height = `${height}px`;
		line.color = color;
		line.thickness = thickness;
		line.background = color;
		line.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		line.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		line.left = `${x}px`;
		line.top = `${y}px`;
		return line;
	};

	const half = size / 2;
	ui.addControl(createLine(0, -half - 2, thickness, size));
	ui.addControl(createLine(0, half + 2, thickness, size));
	ui.addControl(createLine(-half - 2, 0, size, thickness));
	ui.addControl(createLine(half + 2, 0, size, thickness));
};
