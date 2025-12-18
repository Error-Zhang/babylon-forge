import { ENV_CONFIG } from '@/configs';

/**
 * 支持的数据类型
 */
export type PropertyType = 'number' | 'string' | 'boolean' | 'vector2' | 'vector3' | 'color' | 'enum';

/**
 * 控件类型
 */
export type ControlType = 'input' | 'slider' | 'toggle' | 'color-picker' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'readonly';

/**
 * 枚举选项接口
 */
export interface EnumOption {
	label: string;
	value: any;
}

/**
 * 数值范围配置
 */
export interface ValueRange {
	min?: number;
	max?: number;
	step?: number;
}

/**
 * PropertyPanel 装饰器配置接口
 */
export interface PropertyPanelConfig {
	// 基础配置
	name?: string; // 显示名称，默认使用属性名
	displayName?: string; // 显示名称别名，兼容旧版本
	group?: string; // 分组名称，默认为 'Default'
	description?: string; // 描述信息
	defaultValue?: any; // 默认值

	// 控制配置
	editable?: boolean; // 是否可编辑，默认为 true（实际值是否可更改）
	readonly?: boolean; // 是否只读，默认为 false（控件展示效果）
	visible?: boolean; // 是否可见，默认为 true
	order?: number; // 显示顺序，默认为 0

	// 类型配置
	type?: PropertyType; // 属性类型，自动推断
	control?: ControlType; // 控件类型，自动推断

	// 数值范围（适用于数字类型）
	range?: ValueRange;

	// 枚举选项（适用于枚举类型）
	options?: string[] | EnumOption[]; // 支持简单字符串数组
	multiple?: boolean; // 是否多选，默认为 false

	// 格式化
	format?: (value: any) => string; // 自定义格式化函数
	precision?: number; // 数字精度，默认为 2

	// 验证
	validator?: (value: any) => boolean | string; // 验证函数，返回 true 或错误信息

	// 变化回调
	onChange?: (self: any, newValue: any, oldValue: any) => void; // 属性变化时调用的回调函数
}

/**
 * 装饰器元数据接口
 */
export interface PropertyMetadata {
	name: string;
	displayName: string;
	group: string;
	description: string;
	editable: boolean;
	readonly: boolean;
	visible: boolean;
	order: number;
	type: PropertyType;
	control: ControlType;
	range?: ValueRange;
	options?: EnumOption[];
	multiple?: boolean;
	format?: (value: any) => string;
	precision: number;
	validator?: (value: any) => boolean | string;
	onChange?: (self: any, newValue: any, oldValue: any) => void;
	target: any;
	propertyKey: string | symbol;
	getter?: () => any;
	setter?: (value: any) => void;
}

/**
 * 装饰器存储的元数据映射
 */
const propertyMetadataMap = new WeakMap<any, Map<string | symbol, PropertyMetadata>>();

/**
 * 全局实例注册表，存储所有使用了 FieldMonitor 装饰器的实例
 */
const globalInstanceRegistry = new Set<any>();

/**
 * 获取所有注册的实例
 */
export function getAllRegisteredInstances(): any[] {
	return Array.from(globalInstanceRegistry);
}

/**
 * 	清除所有注册的实例
 */
export function clearAllRegisteredInstances() {
	globalInstanceRegistry.clear();
}

/**
 * 注册实例到全局注册表
 */
function registerInstance(instance: any): void {
	globalInstanceRegistry.add(instance);
}

/**
 * 从全局注册表移除实例
 */
export function unregisterInstance(instance: any): void {
	globalInstanceRegistry.delete(instance);
}

/**
 * 获取或创建目标对象的元数据映射
 */
function getOrCreateMetadataMap(target: any): Map<string | symbol, PropertyMetadata> {
	if (!propertyMetadataMap.has(target)) {
		propertyMetadataMap.set(target, new Map());
	}
	return propertyMetadataMap.get(target)!;
}

/**
 * 字段监测，可以把字段推送到属性面板中
 * @param config
 * @param on
 * @constructor
 */
export function FieldMonitor(config: PropertyPanelConfig = {}, on: boolean = ENV_CONFIG.DEBUG && ENV_CONFIG.USE_DEBUG_PANEL) {
	return function (_: undefined, context: ClassFieldDecoratorContext) {
		const { name, static: isStatic } = context;
		// 如果 on = false，什么也不做，直接返回原始字段
		if (!on) return;

		// 延迟到实例创建时(constructor执行完毕时)再注册元数据与拦截器
		context.addInitializer(function (this: any) {
			const host: any = this;
			const ctor = isStatic ? this : this.constructor;

			const privateKey = Symbol(`__${String(name)}__`);

			// 获取当前字段的值作为初始值
			const currentValue = host[name];

			// 存入私有 key
			host[privateKey] = config.defaultValue ?? currentValue;

			// 注册实例到全局注册表
			registerInstance(host);

			// 推断类型/控件
			const inferredType: PropertyType = config.type ?? inferType(currentValue, config);
			const inferredControl: ControlType = config.control ?? inferControl(inferredType, config);

			// 组装并注册元数据（按构造函数分类存储）
			const propertyMeta: PropertyMetadata = {
				name: name.toString(),
				displayName: config.displayName ?? config.name ?? name.toString(),
				group: config.group ?? 'Default',
				description: config.description ?? '',
				editable: config.editable ?? true,
				readonly: config.readonly ?? false,
				visible: config.visible ?? true,
				order: config.order ?? 0,
				type: inferredType,
				control: inferredControl,
				range: config.range,
				options:
					Array.isArray(config.options) && config.options.length > 0 && typeof config.options[0] === 'string'
						? (config.options as string[]).map((opt) => ({ label: opt, value: opt }))
						: (config.options as EnumOption[] | undefined),
				multiple: config.multiple ?? false,
				format: config.format,
				precision: config.precision ?? 2,
				validator: config.validator,
				onChange: config.onChange,
				target: ctor,
				propertyKey: name,
				getter: undefined,
				setter: undefined,
			};
			const metaMap = getOrCreateMetadataMap(ctor);
			metaMap.set(name, propertyMeta);

			// 用访问器替换该字段，实现运行时读/改并触发通知
			Object.defineProperty(host, name, {
				configurable: true,
				enumerable: true,
				get() {
					return this[privateKey];
				},
				set(raw: any) {
					// 不可编辑直接忽略
					if (!propertyMeta.editable) return;

					// 校验
					if (propertyMeta.validator) {
						const res = propertyMeta.validator(raw);
						if (res !== true) {
							console.warn(`Property validation failed for ${propertyMeta.displayName}: ${res}`);
							return;
						}
					}

					// 转换类型 + 赋值
					const oldValue = this[privateKey];
					const newValue = convertValue(raw, propertyMeta.type);

					// 只有值真正改变时才更新
					if (oldValue !== newValue) {
						this[privateKey] = newValue;

						// 调用属性变化回调方法
						if (propertyMeta.onChange) {
							try {
								propertyMeta.onChange(this, newValue, oldValue);
							} catch (error) {
								console.error(`Error calling property change callback function:`, error);
							}
						}
					}
				},
			});
		});
	};
}

/**
 * 推断属性类型
 */
function inferType(value: any, config?: PropertyPanelConfig): PropertyType {
	// 如果有选项配置，推断为枚举类型
	if (config?.options && Array.isArray(config.options) && config.options.length > 0) {
		return 'enum';
	}

	if (value === null || value === undefined) return 'string';

	if (typeof value === 'boolean') return 'boolean';
	if (typeof value === 'number') return 'number';
	if (typeof value === 'string') return 'string';
	if (Array.isArray(value)) return 'enum'; // 数组类型也当作枚举处理

	if (typeof value === 'object') {
		if (value.x !== undefined && value.y !== undefined && value.z === undefined) return 'vector2';
		if (value.x !== undefined && value.y !== undefined && value.z !== undefined) return 'vector3';
		if (value.r !== undefined && value.g !== undefined && value.b !== undefined) return 'color';
	}

	return 'string';
}

/**
 * 推断控件类型
 */
function inferControl(type: PropertyType, config: PropertyPanelConfig): ControlType {
	if (config.control) return config.control;

	switch (type) {
		case 'boolean':
			return 'toggle';
		case 'number':
			return config.range ? 'slider' : 'input';
		case 'vector2':
		case 'vector3':
		case 'color':
			return 'input';
		case 'enum':
			// 根据配置决定控件类型
			if (config.multiple) {
				return 'multiselect';
			}
			return 'select';
		default:
			return 'input';
	}
}

/**
 * 转换值到正确的类型
 */
function convertValue(value: any, type: PropertyType): any {
	switch (type) {
		case 'number':
			return Number(value);
		case 'boolean':
			return Boolean(value);
		case 'string':
			return String(value);
		default:
			return value;
	}
}

/**
 * 获取目标对象的所有属性元数据
 */
export function getAllPropertyMetadata(target: any): PropertyMetadata[] {
	const constructor = typeof target === 'function' ? target : target.constructor;
	const metadataMap = propertyMetadataMap.get(constructor);

	if (!metadataMap) return [];

	const metadataList = Array.from(metadataMap.values());
	return metadataList.sort((a, b) => a.order - b.order);
}

/**
 * 获取目标对象的分组属性元数据
 */
export function getGroupedPropertyMetadata(target: any): Record<string, PropertyMetadata[]> {
	const allMetadata = getAllPropertyMetadata(target);
	const grouped: Record<string, PropertyMetadata[]> = {};

	allMetadata.forEach((metadata) => {
		if (!grouped[metadata.group]) {
			grouped[metadata.group] = [];
		}
		grouped[metadata.group].push(metadata);
	});

	// 对每个分组内的属性进行排序
	Object.keys(grouped).forEach((group) => {
		grouped[group].sort((a, b) => a.order - b.order);
	});

	return grouped;
}
