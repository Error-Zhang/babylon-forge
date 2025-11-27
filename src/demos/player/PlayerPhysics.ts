import { Scene, Vector3, Quaternion, PhysicsCharacterController, CharacterSupportedState, HavokPlugin, MeshBuilder } from '@babylonjs/core';
import '@babylonjs/loaders';

export class PlayerPhysics {
	/** 当前状态 */
	private state: 'IN_AIR' | 'ON_GROUND' | 'START_JUMP' = 'ON_GROUND';

	/** 输入方向 */
	private inputDirection: Vector3 = Vector3.Zero();
	get direction() {
		return this.inputDirection;
	}

	/** 本地前进方向 */
	private localForward: Vector3 = new Vector3(0, 0, 1);

	/** 重力向量 */
	private gravity: Vector3 = new Vector3(0, -9.8, 0);

	/** 角度朝向 */
	private orientation: Quaternion = Quaternion.Identity();

	/** 是否想要跳跃 */
	private wantJump: boolean = false;

	set jump(value: boolean) {
		this.wantJump = value;
	}

	/** 物理角色控制器 */
	private controller: PhysicsCharacterController;

	/** 角色胶囊体参数 */
	private readonly capsuleHeight: number = 1.8;
	private readonly capsuleRadius: number = 0.4;

	/** 移动速度参数 */
	private readonly inAirSpeed: number = 8.0;
	private readonly onGroundSpeed: number = 10.0;
	private readonly jumpHeight: number = 1.5;

	get position(): Vector3 {
		return this.controller.getPosition();
	}

	constructor(
		private readonly scene: Scene,
		position: Vector3
	) {
		// 创建物理角色控制器
		this.controller = new PhysicsCharacterController(
			position,
			{
				capsuleHeight: this.capsuleHeight,
				capsuleRadius: this.capsuleRadius,
			},
			this.scene
		);

		this.scene.onAfterPhysicsObservable.add(() => {
			const dt = this.scene.deltaTime / 1000;
			if (!dt) return;
			this.updatePhysics(dt);
		});
	}

	/**
	 * 物理更新
	 */
	private updatePhysics(dt: number) {
		// 检查支持状态
		const down = new Vector3(0, -1, 0);
		const support = this.controller.checkSupport(dt, down);

		// 获取期望的速度
		const desiredVelocity = this.getDesiredVelocity(dt, support);

		// 设置速度并积分
		this.controller.setVelocity(desiredVelocity);
		this.controller.integrate(dt, support, this.gravity);
	}

	/**
	 * 获取期望的速度
	 */
	private getDesiredVelocity(dt: number, support: any): Vector3 {
		// 更新状态
		const nextState = this.getNextState(support);
		if (nextState !== this.state) {
			this.state = nextState;
		}

		const up = this.gravity.normalizeToNew().scale(-1);
		const forward = this.localForward.applyRotationQuaternion(this.orientation);

		if (this.state === 'IN_AIR') {
			// 空中移动
			let desired = this.inputDirection.scale(this.inAirSpeed).applyRotationQuaternion(this.orientation);
			let output = this.controller.calculateMovement(dt, forward, up, this.controller.getVelocity(), Vector3.ZeroReadOnly, desired, up);

			// output.dot(up) = 看看速度有多少是向上的
			// up.scale(-output.dot(up)) = 创建一个相反的向上力
			// 相加后 = 把向上的部分抵消掉，只留水平移动
			output.addInPlace(up.scale(-output.dot(up)));
			// 把角色原来的上下移动速度加回来
			output.addInPlace(up.scale(this.controller.getVelocity().dot(up)));
			// 每一帧都让角色受重力影响，往下掉一点
			output.addInPlace(this.gravity.scale(dt));

			return output;
		}

		if (this.state === 'ON_GROUND') {
			// 地面移动
			let desired = this.inputDirection.scale(this.onGroundSpeed).applyRotationQuaternion(this.orientation);

			let output = this.controller.calculateMovement(
				dt,
				forward,
				support.averageSurfaceNormal,
				this.controller.getVelocity(),
				support.averageSurfaceVelocity,
				desired,
				up
			);

			// 投影水平速度
			output.subtractInPlace(support.averageSurfaceVelocity);

			const small = 1e-3;
			if (output.dot(up) > small) {
				const len = output.length();
				output.normalizeFromLength(len);

				const horiz = len / support.averageSurfaceNormal.dot(up);
				const c = support.averageSurfaceNormal.cross(output);
				output = c.cross(up);
				output.scaleInPlace(horiz);
			}

			output.addInPlace(support.averageSurfaceVelocity);
			return output;
		}

		// START_JUMP
		if (this.state === 'START_JUMP') {
			const jumpVelocity = Math.sqrt(2 * this.gravity.length() * this.jumpHeight);
			const currentRelativeVel = this.controller.getVelocity().dot(up);
			return this.controller.getVelocity().add(up.scale(jumpVelocity - currentRelativeVel));
		}

		return Vector3.Zero();
	}

	/**
	 * 获取下一个状态
	 */
	private getNextState(support: any): 'IN_AIR' | 'ON_GROUND' | 'START_JUMP' {
		if (this.state === 'IN_AIR') {
			if (support.supportedState === CharacterSupportedState.SUPPORTED) {
				return 'ON_GROUND';
			}
			return 'IN_AIR';
		}

		if (this.state === 'ON_GROUND') {
			if (support.supportedState !== CharacterSupportedState.SUPPORTED) {
				return 'IN_AIR';
			}
			if (this.wantJump) {
				return 'START_JUMP';
			}
			return 'ON_GROUND';
		}

		if (this.state === 'START_JUMP') {
			return 'IN_AIR';
		}

		return this.state;
	}
}
