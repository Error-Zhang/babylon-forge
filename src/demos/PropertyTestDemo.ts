import { DemoSceneClass } from '@/global/DemoSceneClass.ts';
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, HemisphericLight, FreeCamera, Color4 } from '@babylonjs/core';
import type { InitConfig } from '@/core/WebGpuStarter.ts';
import { FieldMonitor } from '@/global/FieldMonitorDecorator.ts';

/**
 * 属性面板测试演示类
 * 用于测试 PropertyPanel 的各种功能
 */
class PropertyTestDemo extends DemoSceneClass {
	// 文本输入控件测试
	@FieldMonitor({
		group: 'Text Controls',
		displayName: 'Player Name',
		description: 'Simple text input field',
	})
	playerName: string = 'Hero';

	@FieldMonitor({
		group: 'Text Controls',
		displayName: 'Description',
		description: 'Multi-line text area',
	})
	description: string = 'A brave warrior on an epic quest...';

	@FieldMonitor({
		group: 'Text Controls',
		displayName: 'Password',
		description: 'Password input field',
	})
	password: string = 'secret123';

	// 数字输入控件测试
	@FieldMonitor({
		group: 'Number Controls',
		displayName: 'Level (Input)',
		description: 'Number input field',
	})
	level: number = 25;

	@FieldMonitor({
		group: 'Number Controls',
		displayName: 'Health (Slider)',
		description: 'Range slider control',
		range: { min: 0, max: 100, step: 1 },
	})
	health: number = 85;

	@FieldMonitor({
		group: 'Number Controls',
		displayName: 'Experience',
		description: 'Number with custom range',
		range: { min: 0, max: 10000, step: 100 },
	})
	experience: number = 2500;

	@FieldMonitor({
		group: 'Number Controls',
		displayName: 'Precision Test',
		description: 'Decimal number with precision',
		precision: 3,
	})
	precisionValue: number = 3.14159;

	// 布尔控件测试
	@FieldMonitor({
		group: 'Boolean Controls',
		displayName: 'Is Active (Toggle)',
		description: 'Toggle switch control',
	})
	isActive: boolean = true;

	@FieldMonitor({
		group: 'Boolean Controls',
		displayName: 'Auto Save (Checkbox)',
		description: 'Checkbox control',
	})
	autoSave: boolean = false;

	@FieldMonitor({
		group: 'Boolean Controls',
		displayName: 'Debug Mode',
		description: 'Default boolean control',
	})
	debugMode: boolean = true;

	// 选择控件测试
	@FieldMonitor({
		group: 'Select Controls',
		displayName: 'Difficulty (Dropdown)',
		description: 'Dropdown select control',
		options: ['Easy', 'Normal', 'Hard', 'Expert', 'Nightmare'],
		defaultValue: 'Easy',
	})
	difficulty: string = 'Normal';

	@FieldMonitor({
		group: 'Select Controls',
		displayName: 'Class (Radio)',
		description: 'Radio button group',
		options: ['Warrior', 'Mage', 'Archer', 'Rogue'],
		control: 'radio'
	})
	playerClass: string = 'Warrior';

	@FieldMonitor({
		group: 'Select Controls',
		displayName: 'Skills (Checkbox)',
		description: 'Checkbox group control',
		options: ['Sword Mastery', 'Magic Shield', 'Stealth', 'Healing', 'Fire Magic'],
		control: 'checkbox'
	})
	skills: string[] = ['Sword Mastery', 'Magic Shield'];

	@FieldMonitor({
		group: 'Select Controls',
		displayName: 'Weapons (Multi-select)',
		description: 'Multiple selection dropdown',
		options: ['Sword', 'Bow', 'Staff', 'Dagger', 'Shield'],
		multiple: true
	})
	weapons: string[] = ['Sword'];

	// 只读控件测试
	@FieldMonitor({
		group: 'Readonly Controls',
		displayName: 'Version',
		description: 'Readonly text display',
		editable: false,
	})
	version: string = '1.0.0';

	@FieldMonitor({
		group: 'Readonly Controls',
		displayName: 'Build Date',
		description: 'Readonly date display',
		editable: false,
	})
	buildDate: string = new Date().toLocaleDateString();

	@FieldMonitor({
		group: 'Readonly Controls',
		displayName: 'Frame Count',
		description: 'Readonly number display',
		editable: false,
	})
	frameCount: number = 0;

	@FieldMonitor({
		group: 'Readonly Controls',
		displayName: 'Is Online',
		description: 'Readonly boolean display',
		editable: false,
	})
	isOnline: boolean = true;

	// 特殊控件测试
	@FieldMonitor({
		group: 'Special Controls',
		displayName: 'Sound Volume',
		description: 'Volume slider with icon',
		range: { min: 0, max: 1, step: 0.1 },
	})
	soundVolume: number = 0.8;

	@FieldMonitor({
		group: 'Special Controls',
		displayName: 'Progress',
		description: 'Progress indicator',
		range: { min: 0, max: 100 },
	})
	progress: number = 65;

	@FieldMonitor({
		group: 'Special Controls',
		displayName: 'Rating',
		description: 'Star rating',
		range: { min: 1, max: 5 },
	})
	rating: number = 4;

	// 私有属性
	private cube?: any;
	private material?: StandardMaterial;
	private light?: HemisphericLight;

	/**
	 * 创建场景的异步生成器方法
	 */
	async *create(config: InitConfig): AsyncGenerator<Scene> {
		// 创建场景
		const scene = new Scene(this.engine);
		yield scene;

		scene.clearColor = new Color4(0.1, 0.1, 0.2, 1.0);

		// 设置相机
		const camera = new FreeCamera('camera', new Vector3(0, 5, -10), scene);

		// 添加光源
		this.light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
		this.light.intensity = 0.7;

		// 创建测试立方体
		this.createTestObjects();

		// 设置更新循环
		this.setupUpdateLoop();

		console.log('🎮 PropertyTestDemo: 场景创建完成');
		console.log('📋 可以按 F3 打开属性面板进行测试');
	}

	/**
	 * 创建测试对象
	 */
	private createTestObjects() {
		if (!this.scene) return;

		// 创建立方体
		this.cube = MeshBuilder.CreateBox('testCube', { size: 2 }, this.scene);
		this.cube.position = new Vector3(0, 1, 0);

		// 创建材质
		this.material = new StandardMaterial('testMaterial', this.scene);
		this.updateMaterial();

		// 应用材质
		this.cube.material = this.material;

		// 创建地面
		const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, this.scene);
		const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
		groundMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
		ground.material = groundMaterial;
	}

	/**
	 * 设置更新循环
	 */
	private setupUpdateLoop() {
		this.onBeforeUpdate((deltaTime: number) => {
			this.frameCount++;

			// 根据属性更新场景
			this.updateScene(deltaTime);
		});
	}

	/**
	 * 更新场景
	 */
	private updateScene(deltaTime: number) {
		if (!this.cube || !this.material || !this.light) return;

		// 根据 level 旋转立方体
		this.cube.rotation.y += this.level * 0.1 * deltaTime;

		// 根据 health 改变立方体颜色
		const healthRatio = this.health / 100;
		this.material.diffuseColor = new Color3(
			1 - healthRatio, // 血量低时偏红
			healthRatio, // 血量高时偏绿
			0.2
		);

		// 根据 soundVolume 调整光照强度
		this.light.intensity = 0.3 + this.soundVolume * 0.7;

		// 根据 isActive 控制立方体可见性
		this.cube.setEnabled(this.isActive);

		// 调试模式下显示额外信息
		if (this.debugMode && this.frameCount % 60 === 0) {
			console.log(`🔍 Debug Info - Level: ${this.level}, Health: ${this.health}, Active: ${this.isActive}`);
		}
	}

	/**
	 * 更新材质
	 */
	private updateMaterial() {
		if (!this.material) return;

		// 简单的材质更新
		this.material.specularColor = new Color3(0.7, 0.7, 0.7);
	}

	/**
	 * 重置所有属性到默认值
	 */
	public resetToDefaults() {
		// 文本控件
		this.playerName = 'Hero';
		this.description = 'A brave warrior on an epic quest...';
		this.password = 'secret123';

		// 数字控件
		this.level = 25;
		this.health = 85;
		this.experience = 2500;
		this.precisionValue = 3.14159;

		// 布尔控件
		this.isActive = true;
		this.autoSave = false;
		this.debugMode = true;

		// 选择控件
		this.difficulty = 'Normal';
		this.playerClass = 'Warrior';
		this.skills = ['Sword Mastery', 'Magic Shield'];
		this.weapons = ['Sword'];

		// 特殊控件
		this.progress = 65;
		this.rating = 4;
		this.soundVolume = 0.8;

		// 只读属性
		this.frameCount = 0;
		this.isOnline = true;

		console.log('🔄 PropertyTestDemo: 所有控件属性已重置为默认值');
	}

	/**
	 * 随机化属性值
	 */
	public randomizeProperties() {
		const names = ['Hero', 'Warrior', 'Mage', 'Archer', 'Rogue', 'Paladin', 'Assassin'];
		const descriptions = [
			'A brave warrior on an epic quest...',
			'A mysterious figure shrouded in darkness...',
			'A wise mage seeking ancient knowledge...',
			'A skilled archer with perfect aim...',
		];
		const difficulties = ['Easy', 'Normal', 'Hard', 'Expert', 'Nightmare'];
		const classes = ['Warrior', 'Mage', 'Archer', 'Rogue'];
		const skills = ['Sword Mastery', 'Magic Shield', 'Stealth', 'Healing', 'Fire Magic'];
		const weapons = ['Sword', 'Bow', 'Staff', 'Dagger', 'Shield'];

		// 文本控件
		this.playerName = names[Math.floor(Math.random() * names.length)];
		this.description = descriptions[Math.floor(Math.random() * descriptions.length)];
		this.password = 'secret' + Math.floor(Math.random() * 1000);

		// 数字控件
		this.level = Math.floor(Math.random() * 100) + 1;
		this.health = Math.floor(Math.random() * 101);
		this.experience = Math.floor(Math.random() * 10000);
		this.precisionValue = Math.round(Math.random() * 10 * 1000) / 1000;

		// 布尔控件
		this.isActive = Math.random() > 0.5;
		this.autoSave = Math.random() > 0.5;
		this.debugMode = Math.random() > 0.7;

		// 选择控件
		this.difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
		this.playerClass = classes[Math.floor(Math.random() * classes.length)];

		// 随机选择1-3个技能
		const skillCount = Math.floor(Math.random() * 3) + 1;
		const shuffledSkills = [...skills].sort(() => 0.5 - Math.random());
		this.skills = shuffledSkills.slice(0, skillCount);

		// 随机选择1-2个武器
		const weaponCount = Math.floor(Math.random() * 2) + 1;
		const shuffledWeapons = [...weapons].sort(() => 0.5 - Math.random());
		this.weapons = shuffledWeapons.slice(0, weaponCount);

		// 特殊控件
		this.progress = Math.floor(Math.random() * 101);
		this.rating = Math.floor(Math.random() * 5) + 1;
		this.soundVolume = Math.round(Math.random() * 10) / 10;

		// 只读属性会自动更新
		this.frameCount = Math.floor(Math.random() * 10000);
		this.isOnline = Math.random() > 0.3;

		this.updateMaterial();

		console.log('🎲 PropertyTestDemo: 所有控件属性已随机化');
	}

	/**
	 * 获取当前状态
	 */
	public getStatus() {
		return {
			playerName: this.playerName,
			level: this.level,
			isActive: this.isActive,
			health: this.health,
			difficulty: this.difficulty,
			soundVolume: this.soundVolume,
			autoSave: this.autoSave,
			debugMode: this.debugMode,
			frameCount: this.frameCount,
			version: this.version,
			buildDate: this.buildDate,
		};
	}

	/**
	 * 清理资源
	 */
	public dispose() {
		if (this.cube) {
			this.cube.dispose();
			this.cube = undefined;
		}

		if (this.material) {
			this.material.dispose();
			this.material = undefined;
		}

		if (this.light) {
			this.light.dispose();
			this.light = undefined;
		}

		console.log('🗑️ PropertyTestDemo: 资源已清理');
	}
}

export default PropertyTestDemo;
