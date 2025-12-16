import { DemoSceneClass } from '@/global/DemoSceneClass.ts';
import {
	Scene,
	MeshBuilder,
	StandardMaterial,
	Color3,
	Vector3,
	HemisphericLight,
	FreeCamera,
	Color4,
	DirectionalLight,
	SpotLight,
	PointLight,
	Mesh,
	Animation,
	AnimationGroup,
} from '@babylonjs/core';
import type { InitConfig } from '@/core/WebGpuStarter.ts';
import { FieldMonitor } from '@/global/FieldMonitorDecorator.ts';
import { CreativeCamera } from '@/demos/player/PlayerCamera.ts';

/**
 * 属性面板完整演示场景
 * 展示所有可用控件类型，每个控件都与场景中的物体关联
 * 创建一个虚拟的游戏世界，包含角色、环境、武器等元素
 */
class PropertyDemoScene extends DemoSceneClass {
	// === 角色属性组 ===
	@FieldMonitor({
		group: '🎮 角色属性',
		displayName: '角色名称',
		description: '控制主角色的名称显示',
		readonly: true,
		onChange: (newValue, oldValue) => {
			console.log(`📝 角色名称已更改为: ${newValue} (从 ${oldValue})`);
		},
	})
	characterName: string = '勇敢的冒险者';

	@FieldMonitor({
		group: '🎮 角色属性',
		displayName: '角色等级',
		description: '影响角色模型的大小和光环效果',
		range: { min: 1, max: 100, step: 1 },
		readonly: false,
		onChange: (self, newValue, oldValue) => {
			self.updateCharacterLevel?.();
			console.log(`⬆️ 角色等级已更改为: ${newValue} (从 ${oldValue})`);
		},
	})
	characterLevel: number = 25;

	@FieldMonitor({
		group: '🎮 角色属性',
		displayName: '生命值',
		description: '控制角色的颜色（红色=低血量，绿色=满血）',
		range: { min: 0, max: 100, step: 1 },
		onChange: (self, newValue, oldValue) => {
			self.updateCharacterAppearance?.();
			console.log(`❤️ 生命值已更改为: ${newValue}% (从 ${oldValue}%)`);
		},
	})
	health: number = 85;

	@FieldMonitor({
		group: '🎮 角色属性',
		displayName: '魔法值',
		description: '控制魔法光球的亮度和大小',
		range: { min: 0, max: 100, step: 1 },
		onChange: (self, newValue, oldValue) => {
			self.updateMagicEffects?.(0);
			console.log(`🔮 魔法值已更改为: ${newValue}% (从 ${oldValue}%)`);
		},
	})
	mana: number = 60;

	@FieldMonitor({
		group: '🎮 角色属性',
		displayName: '角色职业',
		description: '改变角色的外观和武器',
		options: ['战士', '法师', '弓箭手', '盗贼', '圣骑士'],
		control: 'radio',
		onChange: (self, newValue, oldValue) => {
			self.updateCharacterAppearance?.();
			console.log(`👤 职业已切换为: ${newValue} (从 ${oldValue})`);
		},
	})
	characterClass: string = '战士';

	@FieldMonitor({
		group: '🎮 角色属性',
		displayName: '角色状态',
		description: '控制角色是否可见和活跃',
		control: 'toggle',
		onChange: (self, newValue, oldValue) => {
			console.log(`👁️ 角色状态已更改为: ${newValue ? '激活' : '隐藏'} (从 ${oldValue ? '激活' : '隐藏'})`);
			console.log(`🔍 调试: onChange 被调用，调用栈:`, new Error().stack);
			self.updateCharacter?.(0);
		},
	})
	isCharacterActive: boolean = true;

	// === 环境控制组 ===
	@FieldMonitor({
		group: '🌍 环境控制',
		displayName: '时间段',
		description: '控制场景的光照和天空颜色',
		options: ['黎明', '白天', '黄昏', '夜晚'],
		onChange: (self, newValue, oldValue) => {
			self.updateTimeOfDay?.(newValue, oldValue);
		},
	})
	timeOfDay: string = '白天';

	@FieldMonitor({
		group: '🌍 环境控制',
		displayName: '天气',
		description: '影响环境效果和可见度',
		options: ['晴朗', '多云', '雨天', '雪天', '雾天'],
		onChange: (self, newValue, oldValue) => {
			self.updateEnvironment?.(0);
			console.log(`🌤️ 天气已更改为: ${newValue} (从 ${oldValue})`);
		},
	})
	weather: string = '晴朗';

	@FieldMonitor({
		group: '🌍 环境控制',
		displayName: '环境亮度',
		description: '调节整体场景亮度',
		range: { min: 0.1, max: 2.0, step: 0.1 },
		onChange: (self, newValue, oldValue) => {
			self.updateLighting?.(0);
			console.log(`💡 环境亮度已更改为: ${newValue} (从 ${oldValue})`);
		},
	})
	environmentBrightness: number = 1.0;

	@FieldMonitor({
		group: '🌍 环境控制',
		displayName: '雾效强度',
		description: '控制场景雾效的浓度',
		range: { min: 0, max: 1, step: 0.05 },
		onChange: (self, newValue, oldValue) => {
			self.updateEnvironment?.(0);
			console.log(`🌫️ 雾效强度已更改为: ${newValue} (从 ${oldValue})`);
		},
	})
	fogIntensity: number = 0.2;

	@FieldMonitor({
		group: '🌍 环境控制',
		displayName: '启用动态光照',
		description: '开启/关闭动态光照效果',
		onChange: (self, newValue, oldValue) => {
			self.updateLighting?.(0);
			console.log(`⚡ 动态光照已${newValue ? '启用' : '禁用'} (从 ${oldValue ? '启用' : '禁用'})`);
		},
	})
	enableDynamicLighting: boolean = true;

	// === 武器装备组 ===
	@FieldMonitor({
		group: '⚔️ 武器装备',
		displayName: '主武器',
		description: '选择角色的主要武器',
		options: ['长剑', '法杖', '弓箭', '匕首', '战锤', '盾牌'],
		onChange: (self, newValue, oldValue) => {
			self.updateWeaponModel?.();
			console.log(`🗡️ 武器已切换为: ${newValue} (从 ${oldValue})`);
		},
	})
	primaryWeapon: string = '长剑';

	@FieldMonitor({
		group: '⚔️ 武器装备',
		displayName: '武器强化等级',
		description: '控制武器的光效和大小',
		range: { min: 0, max: 15, step: 1 },
		onChange: (self, newValue, oldValue) => {
			self.updateWeapon?.(0);
			console.log(`⚡ 武器强化等级已更改为: +${newValue} (从 +${oldValue})`);
		},
	})
	weaponEnhancement: number = 5;

	@FieldMonitor({
		group: '⚔️ 武器装备',
		displayName: '装备技能',
		description: '选择装备的特殊技能效果',
		options: ['火焰附魔', '冰霜附魔', '雷电附魔', '毒素附魔', '神圣附魔'],
		control: 'checkbox',
		onChange: (self, newValue, oldValue) => {
			self.updateWeaponEffects?.();
			console.log(`🔥 装备技能已更改为: [${newValue.join(', ')}] (从 [${oldValue.join(', ')}])`);
		},
	})
	equipmentSkills: string[] = ['火焰附魔'];

	@FieldMonitor({
		group: '⚔️ 武器装备',
		displayName: '装备套装',
		description: '选择多件套装装备',
		options: ['战士套装', '法师长袍', '刺客套装', '圣骑士铠甲', '弓箭手装备'],
		multiple: true,
		onChange: (self, newValue, oldValue) => {
			console.log(`👕 装备套装已更改为: [${newValue.join(', ')}] (从 [${oldValue.join(', ')}])`);
		},
	})
	equipmentSets: string[] = ['战士套装'];

	@FieldMonitor({
		group: '⚔️ 武器装备',
		displayName: '武器发光',
		description: '控制武器是否发光',
		onChange: (self, newValue, oldValue) => {
			self.updateWeapon?.(0);
			console.log(`✨ 武器发光已${newValue ? '启用' : '禁用'} (从 ${oldValue ? '启用' : '禁用'})`);
		},
	})
	weaponGlow: boolean = true;

	// === 游戏设置组 ===
	@FieldMonitor({
		group: '⚙️ 游戏设置',
		displayName: '游戏难度',
		description: '影响敌人数量和环境危险度',
		options: ['简单', '普通', '困难', '专家', '噩梦'],
		onChange: (self, newValue, oldValue) => {
			console.log(`🎯 游戏难度已更改为: ${newValue} (从 ${oldValue})`);
		},
	})
	gameDifficulty: string = '普通';

	@FieldMonitor({
		group: '⚙️ 游戏设置',
		displayName: '音效音量',
		description: '控制环境音效的音量大小',
		range: { min: 0, max: 1, step: 0.1 },
		onChange: (self, newValue, oldValue) => {
			console.log(`🔊 音效音量已更改为: ${Math.round(newValue * 100)}% (从 ${Math.round(oldValue * 100)}%)`);
		},
	})
	soundVolume: number = 0.8;

	@FieldMonitor({
		group: '⚙️ 游戏设置',
		displayName: '背景音乐音量',
		description: '控制背景音乐的音量',
		range: { min: 0, max: 1, step: 0.1 },
		onChange: (self, newValue, oldValue) => {
			console.log(`🎵 背景音乐音量已更改为: ${Math.round(newValue * 100)}% (从 ${Math.round(oldValue * 100)}%)`);
		},
	})
	musicVolume: number = 0.6;

	@FieldMonitor({
		group: '⚙️ 游戏设置',
		displayName: '自动保存',
		description: '启用自动保存功能',
		onChange: (self, newValue, oldValue) => {
			console.log(`💾 自动保存已${newValue ? '启用' : '禁用'} (从 ${oldValue ? '启用' : '禁用'})`);
		},
	})
	autoSave: boolean = true;

	@FieldMonitor({
		group: '⚙️ 游戏设置',
		displayName: '显示FPS',
		description: '在屏幕上显示帧率信息',
		onChange: (self, newValue, oldValue) => {
			console.log(`📊 FPS显示已${newValue ? '启用' : '禁用'} (从 ${oldValue ? '启用' : '禁用'})`);
		},
	})
	showFPS: boolean = false;

	@FieldMonitor({
		group: '⚙️ 游戏设置',
		displayName: '调试模式',
		description: '启用调试信息显示',
		onChange: (self, newValue, oldValue) => {
			console.log(`🐛 调试模式已${newValue ? '启用' : '禁用'} (从 ${oldValue ? '启用' : '禁用'})`);
		},
	})
	debugMode: boolean = false;

	// === 特效控制组 ===
	@FieldMonitor({
		group: '✨ 特效控制',
		displayName: '粒子效果强度',
		description: '控制所有粒子特效的强度',
		range: { min: 0, max: 2, step: 0.1 },
		onChange: (self, newValue, oldValue) => {
			self.updateMagicEffects?.(0);
			console.log(`✨ 粒子效果强度已更改为: ${newValue} (从 ${oldValue})`);
		},
	})
	particleIntensity: number = 1.0;

	@FieldMonitor({
		group: '✨ 特效控制',
		displayName: '动画速度',
		description: '控制所有动画的播放速度',
		range: { min: 0.1, max: 3.0, step: 0.1 },
		onChange: (self, newValue, oldValue) => {
			self.updateCharacter?.(0);
			console.log(`🏃 动画速度已更改为: ${newValue}x (从 ${oldValue}x)`);
		},
	})
	animationSpeed: number = 1.0;

	@FieldMonitor({
		group: '✨ 特效控制',
		displayName: '启用特效',
		description: '总开关控制所有视觉特效',
		onChange: (self, newValue, oldValue) => {
			self.updateMagicEffects?.(0);
			console.log(`🎆 特效已${newValue ? '启用' : '禁用'} (从 ${oldValue ? '启用' : '禁用'})`);
		},
	})
	enableEffects: boolean = true;

	@FieldMonitor({
		group: '✨ 特效控制',
		displayName: '特效质量',
		description: '选择特效渲染质量',
		options: ['低', '中', '高', '极高'],
		onChange: (self, newValue, oldValue) => {
			console.log(`🎨 特效质量已更改为: ${newValue} (从 ${oldValue})`);
		},
	})
	effectQuality: string = '高';

	// === 状态信息组（只读） ===
	@FieldMonitor({
		group: '📊 状态信息',
		displayName: '当前FPS',
		description: '实时显示帧率',
		readonly: true,
	})
	currentFPS: number = 60;

	@FieldMonitor({
		group: '📊 状态信息',
		displayName: '游戏时间',
		description: '显示游戏运行时间',
		readonly: true,
	})
	gameTime: string = '00:00:00';

	@FieldMonitor({
		group: '📊 状态信息',
		displayName: '场景物体数量',
		description: '当前场景中的物体总数',
		readonly: true,
	})
	objectCount: number = 0;

	@FieldMonitor({
		group: '📊 状态信息',
		displayName: '内存使用',
		description: '显示内存使用情况',
		readonly: true,
	})
	memoryUsage: string = '0 MB';

	@FieldMonitor({
		group: '📊 状态信息',
		displayName: '在线状态',
		description: '显示网络连接状态',
		readonly: true,
	})
	isOnline: boolean = true;

	// === 高级设置组 ===
	@FieldMonitor({
		group: '🔧 高级设置',
		displayName: '渲染精度',
		description: '控制渲染的精确度',
		precision: 4,
	})
	renderPrecision: number = 1.0;

	@FieldMonitor({
		group: '🔧 高级设置',
		displayName: '物理模拟精度',
		description: '物理引擎的计算精度',
		range: { min: 0.001, max: 0.1, step: 0.001 },
		precision: 3,
	})
	physicsAccuracy: number = 0.016;

	@FieldMonitor({
		group: '🔧 高级设置',
		displayName: '启用高级渲染',
		description: '启用高级渲染特性',
	})
	enableAdvancedRendering: boolean = false;

	// 场景对象
	private character?: Mesh;
	private weapon?: Mesh;
	private magicOrb?: Mesh;
	private environment?: Mesh[];
	private lights?: {
		sun?: DirectionalLight;
		ambient?: HemisphericLight;
		magic?: PointLight;
		weapon?: SpotLight;
	};
	private materials?: Map<string, StandardMaterial>;
	private animations?: AnimationGroup[];

	// 运行时状态
	private startTime: number = Date.now();
	private frameCount: number = 0;

	/**
	 * 创建场景的异步生成器方法
	 */
	async *create(config: InitConfig): AsyncGenerator<Scene> {
		// 创建场景
		const scene = new Scene(this.engine);
		yield scene;

		// 初始化场景
		this.initializeScene(scene);

		// 创建光照系统
		this.createLightingSystem();

		// 创建环境
		this.createEnvironment();

		// 创建角色
		this.createCharacter();

		// 创建武器
		this.createWeapon();

		// 创建魔法效果
		this.createMagicEffects();

		// 设置相机
		this.setupCamera();

		// 创建动画
		this.createAnimations();

		// 设置更新循环
		this.setupUpdateLoop();

		console.log('🎮 PropertyDemoScene: 完整演示场景创建完成');
		console.log('📋 可以按 F3 打开属性面板，体验所有控件类型');
		console.log('🎯 每个控件都会实时影响场景中的对应元素');
	}

	/**
	 * 初始化场景基础设置
	 */
	private initializeScene(scene: Scene) {
		// 设置背景颜色（根据时间段调整）
		this.updateSceneBackground();

		// 初始化材质集合
		this.materials = new Map();
		this.environment = [];
		this.animations = [];
		this.lights = {};
	}

	/**
	 * 创建光照系统
	 */
	private createLightingSystem() {
		if (!this.scene) return;

		// 主光源 - 太阳光
		this.lights!.sun = new DirectionalLight('sunLight', new Vector3(-1, -1, -1), this.scene);
		this.lights!.sun.intensity = 1.0;
		this.lights!.sun.diffuse = new Color3(1, 0.9, 0.8);

		// 环境光
		this.lights!.ambient = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene);
		this.lights!.ambient.intensity = 0.3;

		// 魔法光源
		this.lights!.magic = new PointLight('magicLight', new Vector3(2, 3, 0), this.scene);
		this.lights!.magic.diffuse = new Color3(0.5, 0.8, 1.0);
		this.lights!.magic.intensity = 0.5;

		// 武器光源
		this.lights!.weapon = new SpotLight('weaponLight', new Vector3(-2, 3, 0), new Vector3(0, -1, 0), Math.PI / 4, 2, this.scene);
		this.lights!.weapon.diffuse = new Color3(1.0, 0.5, 0.2);
		this.lights!.weapon.intensity = 0.8;
	}

	/**
	 * 创建环境
	 */
	private createEnvironment() {
		if (!this.scene) return;

		// 创建地面
		const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, this.scene);
		const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
		groundMaterial.diffuseColor = new Color3(0.4, 0.6, 0.3);
		ground.material = groundMaterial;
		this.environment!.push(ground);

		// 创建天空盒
		const skybox = MeshBuilder.CreateSphere('skybox', { diameter: 50 }, this.scene);
		const skyboxMaterial = new StandardMaterial('skyboxMaterial', this.scene);
		skyboxMaterial.diffuseColor = new Color3(0.5, 0.8, 1.0);
		skyboxMaterial.backFaceCulling = false;
		skybox.material = skyboxMaterial;
		this.environment!.push(skybox);

		// 创建一些装饰性建筑
		for (let i = 0; i < 5; i++) {
			const building = MeshBuilder.CreateBox(
				`building${i}`,
				{
					width: 1 + Math.random() * 2,
					height: 2 + Math.random() * 3,
					depth: 1 + Math.random() * 2,
				},
				this.scene
			);

			building.position = new Vector3((Math.random() - 0.5) * 15, building.scaling.y / 2, (Math.random() - 0.5) * 15);

			const buildingMaterial = new StandardMaterial(`buildingMaterial${i}`, this.scene);
			buildingMaterial.diffuseColor = new Color3(0.7, 0.7, 0.8);
			building.material = buildingMaterial;
			this.environment!.push(building);
		}

		this.materials!.set('ground', groundMaterial);
		this.materials!.set('skybox', skyboxMaterial);
	}

	/**
	 * 创建角色
	 */
	private createCharacter() {
		if (!this.scene) return;

		// 创建角色主体
		this.character = MeshBuilder.CreateCapsule(
			'character',
			{
				radius: 0.5,
				height: 2,
			},
			this.scene
		);
		this.character.position = new Vector3(0, 1, 0);

		// 创建角色材质
		const characterMaterial = new StandardMaterial('characterMaterial', this.scene);
		this.updateCharacterAppearance();
		this.character.material = characterMaterial;
		this.materials!.set('character', characterMaterial);
	}

	/**
	 * 创建武器
	 */
	private createWeapon() {
		if (!this.scene) return;

		// 根据武器类型创建不同形状
		this.updateWeaponModel();
	}

	/**
	 * 创建魔法效果
	 */
	private createMagicEffects() {
		if (!this.scene) return;

		// 创建魔法光球
		this.magicOrb = MeshBuilder.CreateSphere('magicOrb', { diameter: 0.5 }, this.scene);
		this.magicOrb.position = new Vector3(1.5, 2, 0);

		const orbMaterial = new StandardMaterial('orbMaterial', this.scene);
		orbMaterial.diffuseColor = new Color3(0.3, 0.6, 1.0);
		orbMaterial.emissiveColor = new Color3(0.2, 0.4, 0.8);
		this.magicOrb.material = orbMaterial;
		this.materials!.set('magicOrb', orbMaterial);
	}

	/**
	 * 设置相机
	 */
	private setupCamera() {
		if (!this.scene) return;

		new CreativeCamera(new Vector3(0, 8, -12));
	}

	/**
	 * 创建动画
	 */
	private createAnimations() {
		if (!this.scene) return;

		// 角色旋转动画
		if (this.character) {
			const rotationAnimation = Animation.CreateAndStartAnimation(
				'characterRotation',
				this.character,
				'rotation.y',
				30,
				120,
				0,
				Math.PI * 2,
				Animation.ANIMATIONLOOPMODE_CYCLE
			);
		}

		// 魔法光球浮动动画
		if (this.magicOrb) {
			const floatAnimation = Animation.CreateAndStartAnimation(
				'orbFloat',
				this.magicOrb,
				'position.y',
				30,
				60,
				2,
				3,
				Animation.ANIMATIONLOOPMODE_YOYO
			);
		}
	}

	/**
	 * 设置更新循环
	 */
	private setupUpdateLoop() {
		this.onBeforeUpdate((deltaTime: number) => {
			this.frameCount++;

			// 更新状态信息
			this.updateStatusInfo();

			// 根据属性更新场景
			this.updateScene(deltaTime);
		});
	}

	/**
	 * 更新状态信息（只读字段）
	 */
	private updateStatusInfo() {
		// 更新FPS
		this.currentFPS = Math.round(this.engine.getFps());

		// 更新游戏时间
		const elapsed = Date.now() - this.startTime;
		const hours = Math.floor(elapsed / 3600000);
		const minutes = Math.floor((elapsed % 3600000) / 60000);
		const seconds = Math.floor((elapsed % 60000) / 1000);
		this.gameTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

		// 更新物体数量
		this.objectCount = this.scene?.meshes.length || 0;

		// 更新内存使用（模拟）
		this.memoryUsage = `${Math.round(this.objectCount * 0.5 + Math.random() * 10)} MB`;

		// 随机更新在线状态
		if (this.frameCount % 300 === 0) {
			this.isOnline = Math.random() > 0.1;
		}
	}

	/**
	 * 更新场景
	 */
	private updateScene(deltaTime: number) {
		// 更新角色
		this.updateCharacter(deltaTime);

		// 更新武器
		this.updateWeapon(deltaTime);

		// 更新魔法效果
		this.updateMagicEffects(deltaTime);

		// 更新环境
		this.updateEnvironment(deltaTime);

		// 更新光照
		this.updateLighting(deltaTime);

		// 调试模式下显示额外信息
		if (this.debugMode && this.frameCount % 60 === 0) {
			console.log(
				`🔍 调试信息 - 角色: ${this.characterName}, 等级: ${this.characterLevel}, 血量: ${this.health}%, 职业: ${this.characterClass}`
			);
			console.log(`🌍 环境信息 - 时间: ${this.timeOfDay}, 天气: ${this.weather}, 亮度: ${this.environmentBrightness}`);
		}
	}

	/**
	 * 更新角色状态
	 */
	private updateCharacter(deltaTime: number) {
		if (!this.character) return;

		// 根据角色状态控制可见性
		this.character.setEnabled(this.isCharacterActive);

		if (!this.isCharacterActive) return;

		// 根据等级调整角色大小
		const scale = 0.8 + (this.characterLevel / 100) * 0.4;
		this.character.scaling = new Vector3(scale, scale, scale);

		// 根据血量改变角色颜色（只在血量变化时更新）
		// this.updateCharacterAppearance(); // 移除这里的调用，避免重复更新

		// 根据动画速度调整旋转
		if (this.character.animations && this.character.animations.length > 0) {
			this.scene!.beginAnimation(this.character, 0, 120, true, this.animationSpeed);
		}
	}

	/**
	 * 更新角色外观
	 */
	private updateCharacterAppearance() {
		const characterMaterial = this.materials?.get('character');
		if (!characterMaterial) {
			console.warn('⚠️ Character material not found');
			return;
		}

		console.log(`🎨 Updating character appearance for class: ${this.characterClass}, health: ${this.health}`);

		// 重置所有颜色属性
		characterMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
		characterMaterial.emissiveColor = new Color3(0, 0, 0);
		characterMaterial.specularColor = new Color3(0.2, 0.2, 0.2);

		// 根据职业设置基础颜色
		switch (this.characterClass) {
			case '战士':
				characterMaterial.diffuseColor = new Color3(0.8, 0.6, 0.4);
				characterMaterial.specularColor = new Color3(0.8, 0.8, 0.8);
				break;
			case '法师':
				characterMaterial.diffuseColor = new Color3(0.4, 0.4, 0.8);
				characterMaterial.emissiveColor = new Color3(0.2, 0.2, 0.8);
				break;
			case '弓箭手':
				characterMaterial.diffuseColor = new Color3(0.4, 0.8, 0.4);
				characterMaterial.specularColor = new Color3(0.3, 0.6, 0.3);
				break;
			case '盗贼':
				characterMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
				characterMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
				break;
			case '圣骑士':
				characterMaterial.diffuseColor = new Color3(0.9, 0.9, 0.7);
				characterMaterial.emissiveColor = new Color3(1.0, 1.0, 0.8);
				characterMaterial.specularColor = new Color3(1.0, 1.0, 1.0);
				break;
			default:
				characterMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
		}

		// 根据血量调整颜色强度（保持职业特色的同时反映血量）
		const healthRatio = this.health / 100;
		const healthModifier = 0.5 + healthRatio * 0.5; // 0.5 到 1.0 的范围

		// 应用血量修饰符到漫反射颜色
		characterMaterial.diffuseColor.scaleInPlace(healthModifier);

		// 低血量时添加红色调
		if (healthRatio < 0.3) {
			const redIntensity = (0.3 - healthRatio) / 0.3; // 0 到 1 的红色强度
			characterMaterial.diffuseColor.r += redIntensity * 0.5;
			characterMaterial.emissiveColor.r += redIntensity * 0.3;
		}

		console.log(`✅ Character appearance updated - Class: ${this.characterClass}, Health: ${this.health}%, Colors applied`);
	}

	/**
	 * 更新武器
	 */
	private updateWeapon(deltaTime: number) {
		if (!this.weapon) return;

		// 根据强化等级调整武器大小和光效
		const enhancement = this.weaponEnhancement / 15;
		this.weapon.scaling = new Vector3(1 + enhancement * 0.3, 1 + enhancement * 0.3, 1 + enhancement * 0.3);

		// 武器发光效果
		const weaponMaterial = this.materials?.get('weapon');
		if (weaponMaterial && this.weaponGlow) {
			weaponMaterial.emissiveColor = new Color3(enhancement * 0.8, enhancement * 0.6, enhancement * 0.4);
		}

		// 根据装备技能添加特效
		this.updateWeaponEffects();
	}

	/**
	 * 更新武器模型
	 */
	private updateWeaponModel() {
		if (!this.scene) return;

		// 移除旧武器
		if (this.weapon) {
			this.weapon.dispose();
		}

		// 根据武器类型创建新武器
		switch (this.primaryWeapon) {
			case '长剑':
				this.weapon = MeshBuilder.CreateBox('sword', { width: 0.1, height: 2, depth: 0.1 }, this.scene);
				break;
			case '法杖':
				this.weapon = MeshBuilder.CreateCylinder('staff', { height: 2.5, diameterTop: 0.05, diameterBottom: 0.1 }, this.scene);
				break;
			case '弓箭':
				this.weapon = MeshBuilder.CreateTorus('bow', { diameter: 1.5, thickness: 0.05 }, this.scene);
				break;
			case '匕首':
				this.weapon = MeshBuilder.CreateBox('dagger', { width: 0.05, height: 1, depth: 0.05 }, this.scene);
				break;
			case '战锤':
				this.weapon = MeshBuilder.CreateCylinder('hammer', { height: 1.5, diameterTop: 0.5, diameterBottom: 0.1 }, this.scene);
				break;
			case '盾牌':
				this.weapon = MeshBuilder.CreateCylinder('shield', { height: 0.1, diameter: 1.5 }, this.scene);
				break;
		}

		if (this.weapon) {
			this.weapon.position = new Vector3(-1.5, 1.5, 0);

			// 创建武器材质
			const weaponMaterial = new StandardMaterial('weaponMaterial', this.scene);
			weaponMaterial.diffuseColor = new Color3(0.7, 0.7, 0.8);
			this.weapon.material = weaponMaterial;
			this.materials!.set('weapon', weaponMaterial);
		}
	}

	/**
	 * 更新武器特效
	 */
	private updateWeaponEffects() {
		const weaponMaterial = this.materials?.get('weapon');
		if (!weaponMaterial) return;

		// 重置特效
		weaponMaterial.emissiveColor = new Color3(0, 0, 0);

		// 根据装备技能添加特效
		this.equipmentSkills.forEach((skill) => {
			switch (skill) {
				case '火焰附魔':
					weaponMaterial.emissiveColor.addInPlace(new Color3(0.8, 0.3, 0.1));
					break;
				case '冰霜附魔':
					weaponMaterial.emissiveColor.addInPlace(new Color3(0.1, 0.3, 0.8));
					break;
				case '雷电附魔':
					weaponMaterial.emissiveColor.addInPlace(new Color3(0.8, 0.8, 0.2));
					break;
				case '毒素附魔':
					weaponMaterial.emissiveColor.addInPlace(new Color3(0.2, 0.8, 0.2));
					break;
				case '神圣附魔':
					weaponMaterial.emissiveColor.addInPlace(new Color3(1.0, 1.0, 0.8));
					break;
			}
		});
	}

	/**
	 * 更新魔法效果
	 */
	private updateMagicEffects(deltaTime: number) {
		if (!this.magicOrb) return;

		// 根据魔法值调整光球大小和亮度
		const manaRatio = this.mana / 100;
		this.magicOrb.scaling = new Vector3(manaRatio, manaRatio, manaRatio);

		const orbMaterial = this.materials?.get('magicOrb');
		if (orbMaterial) {
			orbMaterial.emissiveColor = new Color3(0.2 * manaRatio, 0.4 * manaRatio, 0.8 * manaRatio);
		}

		// 根据特效强度调整效果
		if (this.enableEffects) {
			this.magicOrb.setEnabled(true);
			const intensity = this.particleIntensity;
			if (orbMaterial) {
				orbMaterial.emissiveColor.scaleInPlace(intensity);
			}
		} else {
			this.magicOrb.setEnabled(false);
		}
	}

	/**
	 * 更新环境
	 */
	private updateEnvironment(deltaTime: number) {
		// 更新场景背景
		this.updateSceneBackground();

		// 更新雾效
		if (this.scene) {
			this.scene.fogMode = this.fogIntensity > 0 ? Scene.FOGMODE_EXP : Scene.FOGMODE_NONE;
			this.scene.fogDensity = this.fogIntensity * 0.1;
			this.scene.fogColor = new Color3(0.8, 0.8, 0.9);
		}
	}

	/**
	 * 更新场景背景
	 */
	private updateSceneBackground() {
		if (!this.scene) return;

		// 根据时间段设置背景色
		let bgColor: Color4;
		switch (this.timeOfDay) {
			case '黎明':
				bgColor = new Color4(0.8, 0.6, 0.4, 1.0);
				break;
			case '白天':
				bgColor = new Color4(0.5, 0.8, 1.0, 1.0);
				break;
			case '黄昏':
				bgColor = new Color4(1.0, 0.6, 0.3, 1.0);
				break;
			case '夜晚':
				bgColor = new Color4(0.1, 0.1, 0.3, 1.0);
				break;
			default:
				bgColor = new Color4(0.5, 0.8, 1.0, 1.0);
		}

		// 根据天气调整
		switch (this.weather) {
			case '多云':
				bgColor.r *= 0.8;
				bgColor.g *= 0.8;
				bgColor.b *= 0.8;
				break;
			case '雨天':
				bgColor.r *= 0.6;
				bgColor.g *= 0.6;
				bgColor.b *= 0.7;
				break;
			case '雪天':
				bgColor.r *= 0.9;
				bgColor.g *= 0.9;
				bgColor.b *= 1.0;
				break;
			case '雾天':
				bgColor.r *= 0.7;
				bgColor.g *= 0.7;
				bgColor.b *= 0.7;
				break;
		}

		this.scene.clearColor = bgColor;
	}

	/**
	 * 更新光照
	 */
	private updateLighting(deltaTime: number) {
		if (!this.lights) return;

		// 根据环境亮度调整主光源
		if (this.lights.sun) {
			this.lights.sun.intensity = this.environmentBrightness;
		}

		// 根据时间段调整光照颜色
		if (this.lights.sun) {
			switch (this.timeOfDay) {
				case '黎明':
					this.lights.sun.diffuse = new Color3(1.0, 0.8, 0.6);
					break;
				case '白天':
					this.lights.sun.diffuse = new Color3(1.0, 1.0, 0.9);
					break;
				case '黄昏':
					this.lights.sun.diffuse = new Color3(1.0, 0.6, 0.3);
					break;
				case '夜晚':
					this.lights.sun.diffuse = new Color3(0.3, 0.3, 0.5);
					break;
			}
		}

		// 动态光照效果
		if (this.enableDynamicLighting && this.lights.magic) {
			this.lights.magic.intensity = 0.5 + Math.sin(this.frameCount * 0.1) * 0.3;
		}
	}

	/**
	 * 时间段变化回调 - 更新环境光照和背景
	 */
	public updateTimeOfDay(newValue?: string, oldValue?: string) {
		this.updateSceneBackground();
		this.updateLighting(0);
		console.log(`🌅 时间已切换为: ${this.timeOfDay} (从 ${oldValue} 到 ${newValue})`);
	}

	/**
	 * 重置所有属性到默认值
	 */
	public resetToDefaults() {
		// 角色属性
		this.characterName = '勇敢的冒险者';
		this.characterLevel = 25;
		this.health = 85;
		this.mana = 60;
		this.characterClass = '战士';
		this.isCharacterActive = true;

		// 环境控制
		this.timeOfDay = '白天';
		this.weather = '晴朗';
		this.environmentBrightness = 1.0;
		this.fogIntensity = 0.2;
		this.enableDynamicLighting = true;

		// 武器装备
		this.primaryWeapon = '长剑';
		this.weaponEnhancement = 5;
		this.equipmentSkills = ['火焰附魔'];
		this.equipmentSets = ['战士套装'];
		this.weaponGlow = true;

		// 游戏设置
		this.gameDifficulty = '普通';
		this.soundVolume = 0.8;
		this.musicVolume = 0.6;
		this.autoSave = true;
		this.showFPS = false;
		this.debugMode = false;

		// 特效控制
		this.particleIntensity = 1.0;
		this.animationSpeed = 1.0;
		this.enableEffects = true;
		this.effectQuality = '高';

		// 高级设置
		this.renderPrecision = 1.0;
		this.physicsAccuracy = 0.016;
		this.enableAdvancedRendering = false;

		// 重新创建武器和更新外观
		this.updateWeaponModel();
		this.updateCharacterAppearance();
		this.updateSceneBackground();

		console.log('🔄 PropertyDemoScene: 所有属性已重置为默认值');
	}

	/**
	 * 随机化属性值 - 演示所有控件的动态变化
	 */
	public randomizeProperties() {
		const names = ['勇敢的冒险者', '神秘法师', '精灵射手', '暗影刺客', '圣光骑士', '野蛮战士'];
		const timeOptions = ['黎明', '白天', '黄昏', '夜晚'];
		const weatherOptions = ['晴朗', '多云', '雨天', '雪天', '雾天'];
		const classOptions = ['战士', '法师', '弓箭手', '盗贼', '圣骑士'];
		const weaponOptions = ['长剑', '法杖', '弓箭', '匕首', '战锤', '盾牌'];
		const skillOptions = ['火焰附魔', '冰霜附魔', '雷电附魔', '毒素附魔', '神圣附魔'];
		const equipmentOptions = ['战士套装', '法师长袍', '刺客套装', '圣骑士铠甲', '弓箭手装备'];
		const difficultyOptions = ['简单', '普通', '困难', '专家', '噩梦'];
		const qualityOptions = ['低', '中', '高', '极高'];

		// 角色属性
		this.characterName = names[Math.floor(Math.random() * names.length)];
		this.characterLevel = Math.floor(Math.random() * 100) + 1;
		this.health = Math.floor(Math.random() * 101);
		this.mana = Math.floor(Math.random() * 101);
		this.characterClass = classOptions[Math.floor(Math.random() * classOptions.length)];
		this.isCharacterActive = Math.random() > 0.2;

		// 环境控制
		this.timeOfDay = timeOptions[Math.floor(Math.random() * timeOptions.length)];
		this.weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
		this.environmentBrightness = Math.round((0.5 + Math.random() * 1.5) * 10) / 10;
		this.fogIntensity = Math.round(Math.random() * 100) / 100;
		this.enableDynamicLighting = Math.random() > 0.3;

		// 武器装备
		this.primaryWeapon = weaponOptions[Math.floor(Math.random() * weaponOptions.length)];
		this.weaponEnhancement = Math.floor(Math.random() * 16);

		// 随机选择1-3个技能
		const skillCount = Math.floor(Math.random() * 3) + 1;
		const shuffledSkills = [...skillOptions].sort(() => 0.5 - Math.random());
		this.equipmentSkills = shuffledSkills.slice(0, skillCount);

		// 随机选择1-2个装备套装
		const equipmentCount = Math.floor(Math.random() * 2) + 1;
		const shuffledEquipment = [...equipmentOptions].sort(() => 0.5 - Math.random());
		this.equipmentSets = shuffledEquipment.slice(0, equipmentCount);

		this.weaponGlow = Math.random() > 0.3;

		// 游戏设置
		this.gameDifficulty = difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)];
		this.soundVolume = Math.round(Math.random() * 10) / 10;
		this.musicVolume = Math.round(Math.random() * 10) / 10;
		this.autoSave = Math.random() > 0.3;
		this.showFPS = Math.random() > 0.7;
		this.debugMode = Math.random() > 0.8;

		// 特效控制
		this.particleIntensity = Math.round(Math.random() * 2 * 10) / 10;
		this.animationSpeed = Math.round((0.1 + Math.random() * 2.9) * 10) / 10;
		this.enableEffects = Math.random() > 0.2;
		this.effectQuality = qualityOptions[Math.floor(Math.random() * qualityOptions.length)];

		// 高级设置
		this.renderPrecision = Math.round((0.5 + Math.random() * 1.5) * 10000) / 10000;
		this.physicsAccuracy = Math.round((0.001 + Math.random() * 0.099) * 1000) / 1000;
		this.enableAdvancedRendering = Math.random() > 0.7;

		// 应用更改
		this.updateWeaponModel();
		this.updateCharacterAppearance();
		this.updateSceneBackground();
		this.updateLighting(0);

		console.log('🎲 PropertyDemoScene: 所有属性已随机化，观察场景变化！');
	}

	/**
	 * 获取当前完整状态
	 */
	public getStatus() {
		return {
			// 角色信息
			character: {
				name: this.characterName,
				level: this.characterLevel,
				health: this.health,
				mana: this.mana,
				class: this.characterClass,
				active: this.isCharacterActive,
			},
			// 环境信息
			environment: {
				timeOfDay: this.timeOfDay,
				weather: this.weather,
				brightness: this.environmentBrightness,
				fog: this.fogIntensity,
				dynamicLighting: this.enableDynamicLighting,
			},
			// 装备信息
			equipment: {
				weapon: this.primaryWeapon,
				enhancement: this.weaponEnhancement,
				skills: this.equipmentSkills,
				sets: this.equipmentSets,
				glow: this.weaponGlow,
			},
			// 游戏设置
			settings: {
				difficulty: this.gameDifficulty,
				soundVolume: this.soundVolume,
				musicVolume: this.musicVolume,
				autoSave: this.autoSave,
				showFPS: this.showFPS,
				debug: this.debugMode,
			},
			// 特效设置
			effects: {
				particleIntensity: this.particleIntensity,
				animationSpeed: this.animationSpeed,
				enabled: this.enableEffects,
				quality: this.effectQuality,
			},
			// 状态信息
			status: {
				fps: this.currentFPS,
				gameTime: this.gameTime,
				objects: this.objectCount,
				memory: this.memoryUsage,
				online: this.isOnline,
			},
		};
	}

	/**
	 * 清理资源
	 */
	public dispose() {
		// 清理角色
		if (this.character) {
			this.character.dispose();
			this.character = undefined;
		}

		// 清理武器
		if (this.weapon) {
			this.weapon.dispose();
			this.weapon = undefined;
		}

		// 清理魔法光球
		if (this.magicOrb) {
			this.magicOrb.dispose();
			this.magicOrb = undefined;
		}

		// 清理环境对象
		if (this.environment) {
			this.environment.forEach((obj) => obj.dispose());
			this.environment = undefined;
		}

		// 清理光源
		if (this.lights) {
			Object.values(this.lights).forEach((light) => light?.dispose());
			this.lights = undefined;
		}

		// 清理材质
		if (this.materials) {
			this.materials.forEach((material) => material.dispose());
			this.materials = undefined;
		}

		// 清理动画
		if (this.animations) {
			this.animations.forEach((anim) => anim.dispose());
			this.animations = undefined;
		}

		console.log('🗑️ PropertyDemoScene: 所有资源已清理完毕');
	}
}

export default PropertyDemoScene;
