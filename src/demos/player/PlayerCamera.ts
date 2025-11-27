import { FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { PlayerInputSystem } from './PlayerInputSystem.ts';
import { PlayerPhysics } from './PlayerPhysics.ts';
import { INJECT_TOKENS } from '@/entry/constants.ts';
import { LogReturn, Inject, FieldMonitor } from '@/global/Decorators.ts';
import utils from '@/utils';

export abstract class BasePlayerCamera {
	@Inject(INJECT_TOKENS.CurrentScene)
	protected scene!: Scene;
	protected readonly camera: FreeCamera;
	protected readonly inputSystem: PlayerInputSystem;
	protected readonly moveValue = Vector3.Zero();

	@FieldMonitor()
	protected readonly speed: number = 1;

	private cameraState = {
		pre_position: new Vector3(),
		pre_rotation: new Vector3(),
	};

	constructor(position: Vector3 = Vector3.Zero()) {
		this.camera = new FreeCamera('PlayerCamera', position, this.scene);
		this.inputSystem = new PlayerInputSystem(this.scene);

		this.initCamera();
		this.bindInput();

		const canvas = this.scene.getEngine().getRenderingCanvas()!;
		canvas.addEventListener('click', () => {
			canvas.requestPointerLock().then(() => {
				this.camera.attachControl();
			});
		});

		this.scene.onBeforeRenderObservable.add(() => {
			this.update();
		});
		this.scene.onAfterRenderObservable.add(() => {
			this.moveValue.set(0, 0, 0);
		});
		this.scene.onDisposeObservable.add(() => {
			this.dispose();
		});
	}

	dispose() {
		this.camera.detachControl();
		this.camera.dispose();
	}

	private detectCameraChanges() {
		const cur_position = this.camera.position;
		const cur_rotation = this.camera.rotation;

		const moved = !cur_position.equalsWithEpsilon(this.cameraState.pre_position, 0.01);
		const turned = !cur_rotation.equalsWithEpsilon(this.cameraState.pre_rotation, 0.01);

		if (moved) {
			this.cameraState.pre_position.copyFrom(cur_position);
		}
		if (turned) {
			this.cameraState.pre_rotation.copyFrom(cur_rotation);
		}
	}

	setTarget(x: number, y: number, z: number) {
		this.camera.target.set(x, y, z);
	}

	setPosition(x: number, y: number, z: number) {
		this.camera.position.set(x, y, z);
	}

	// 射线拾取选中的方块信息
	getPickInfo(maxPlaceDistance: number) {
		const ray = this.camera!.getForwardRay();
		const pick = this.scene.pickWithRay(ray, (mesh) => {
			return mesh.isPickable;
		});

		if (pick?.hit && pick.pickedPoint && pick.distance <= maxPlaceDistance) {
			return pick;
		}

		return null;
	}

	protected update() {
		this.inputSystem.update();
		this.applyMovement();
		this.detectCameraChanges();
	}

	abstract applyMovement(): void;

	protected initCamera() {
		this.camera.inertia = 0.6;
		this.camera.minZ = 0.1;
		this.camera.ellipsoid = new Vector3(0.4, 0.9, 0.2); // 碰撞半径
		this.camera.ellipsoidOffset = new Vector3(0, 0, 0); // 默认在顶部，向下偏移
	}

	protected bindInput() {
		// 移动控制
		this.inputSystem.onActionUpdate('moveForward', () => this.moveFront());
		this.inputSystem.onActionUpdate('moveBackward', () => this.moveBack());
		this.inputSystem.onActionUpdate('moveLeft', () => this.moveLeft());
		this.inputSystem.onActionUpdate('moveRight', () => this.moveRight());
	}

	@LogReturn({ wrapperFn: utils.throttle }, false)
	protected get dtPercent() {
		return this.scene.getEngine().getDeltaTime() / 16.67;
	}

	protected get moveSpeed(): number {
		return this.speed;
	}

	protected moveFront() {
		this.moveByDirection(this.camera.getDirection(Vector3.Forward()));
	}

	protected moveBack() {
		this.moveByDirection(this.camera.getDirection(Vector3.Forward().scale(-1)));
	}

	protected moveLeft() {
		this.moveByDirection(this.camera.getDirection(Vector3.Right().scale(-1)));
	}

	protected moveRight() {
		this.moveByDirection(this.camera.getDirection(Vector3.Right()));
	}

	protected moveByDirection(direction: Vector3) {
		const speedMultiplier = this.inputSystem.isActionActive('sprint') ? 1.25 : 1;
		const move = this.moveSpeed * speedMultiplier;
		direction.normalize();
		this.moveValue.x += direction.x * move;
		this.moveValue.z += direction.z * move;
	}
}

// 生存模式相机
export class SurvivalCamera extends BasePlayerCamera {
	/** 物理系统 */
	private physics: PlayerPhysics;

	constructor(position: Vector3) {
		super(position);
		this.physics = new PlayerPhysics(this.scene, position);
	}

	override applyMovement() {
		this.physics.direction.copyFrom(this.moveValue);
		this.camera.position.copyFrom(this.physics.position);
	}

	protected bindInput() {
		super.bindInput();

		this.inputSystem.onAction(
			'jump',
			() => {
				this.physics.jump = true;
			},
			() => {
				this.physics.jump = false;
			}
		);
	}
}

// 创造模式相机
export class CreativeCamera extends BasePlayerCamera {
	protected override initCamera() {
		super.initCamera();
		this.camera.checkCollisions = false;
	}

	override applyMovement() {
		this.camera.cameraDirection.addInPlace(this.moveValue.scale(this.dtPercent));
	}

	protected override bindInput() {
		super.bindInput();

		// 垂直移动
		this.inputSystem.onActionUpdate('fly', () => {
			this.moveValue.y += this.moveSpeed * this.dtPercent;
		});

		this.inputSystem.onActionUpdate('sneak', () => {
			this.moveValue.y -= this.moveSpeed * this.dtPercent;
		});
	}
	override get moveSpeed() {
		return this.speed * 0.1;
	}
}
