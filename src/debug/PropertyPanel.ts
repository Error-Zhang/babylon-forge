import { type BasePanelConfig, type BasePanelExposeKeys, BasePanelWrapper } from '@/debug/components/BasePanelWrapper.ts';
import {
	type PropertyMetadata,
	getAllPropertyMetadata,
	getGroupedPropertyMetadata,
	getAllRegisteredInstances,
	clearAllRegisteredInstances,
} from '@/global/FieldMonitorDecorator.ts';
import { Inject } from '@/global/Decorators.ts';
import { SceneManager } from '@/managers/SceneManager.ts';

const defaultConfig = {
	title: '属性面板',
	width: '350px',
};

/**
 * PropertyPanel 类
 * 继承自 BasePanelWrapper，用于显示和编辑装饰器属性
 */
export class PropertyPanel extends BasePanelWrapper {
	@Inject(SceneManager)
	public readonly sceneManager!: SceneManager;
	private targetInstance: any = null;
	private groupedMetadata: Record<string, PropertyMetadata[]> = {};
	private isInitialized = false;
	private allInstances: any[] = [];
	private currentInstanceIndex = 0;
	private lastValues: Map<string, any> = new Map();
	private needsFullRebuild = false;
	private updateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(config: Partial<BasePanelConfig> & BasePanelExposeKeys) {
		super({ ...defaultConfig, ...config });

		this.sceneManager.onSceneChange((loaded) => {
			if (loaded) {
				this.refreshInstances();
			} else {
				this.dispose();
				this.updateDisplay();
			}
		});
		this.init();
	}

	/**
	 * 刷新实例列表
	 */
	private refreshInstances(): void {
		this.allInstances = getAllRegisteredInstances().filter((instance) => {
			// 过滤掉有属性的实例
			const metadata = getAllPropertyMetadata(instance);
			return metadata.length > 0;
		});

		// 如果当前选中的实例不在列表中，重置选择
		if (this.currentInstanceIndex >= this.allInstances.length) {
			this.currentInstanceIndex = 0;
		}

		// 更新当前目标实例
		this.targetInstance = this.allInstances[this.currentInstanceIndex] || null;
		this.updateGroupedMetadata();
		this.needsFullRebuild = true;
	}

	/**
	 * 更新分组元数据
	 */
	private updateGroupedMetadata(): void {
		if (!this.targetInstance) {
			this.groupedMetadata = {};
			return;
		}

		// 使用实例的构造函数来获取元数据
		this.groupedMetadata = getGroupedPropertyMetadata(this.targetInstance);
	}

	/**
	 * 切换到下一个实例
	 */
	private switchToNextInstance(): void {
		if (this.allInstances.length === 0) return;

		this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.allInstances.length;
		this.targetInstance = this.allInstances[this.currentInstanceIndex];
		this.updateGroupedMetadata();
		this.needsFullRebuild = true;
		this.updateDisplay();
	}

	/**
	 * 切换到上一个实例
	 */
	private switchToPreviousInstance(): void {
		if (this.allInstances.length === 0) return;

		this.currentInstanceIndex = this.currentInstanceIndex === 0 ? this.allInstances.length - 1 : this.currentInstanceIndex - 1;
		this.targetInstance = this.allInstances[this.currentInstanceIndex];
		this.updateGroupedMetadata();
		this.needsFullRebuild = true;
		this.updateDisplay();
	}

	/**
	 * 获取实例显示名称
	 */
	private getInstanceDisplayName(instance: any): string {
		if (!instance) return 'Unknown';

		const constructor = instance.constructor;
		const className = constructor.name || 'Anonymous';

		// 如果实例有 name 属性，使用它
		if (instance.name && typeof instance.name === 'string') {
			return `${className} (${instance.name})`;
		}

		return className;
	}

	/**
	 * 获取面板内容HTML
	 */
	protected getPanelContentHTML(): string {
		// 最外层主容器包装所有内容
		let html = '<div class="inspector-container">';

		// 顶部实例选择器作为主分类标识
		html += this.getInstanceSelectorHTML();

		// 如果没有目标实例，显示提示信息
		if (!this.targetInstance) {
			html += '<div class="no-instance">No instances with FieldMonitor found</div>';
			html += '</div>'; // inspector-container
			return html;
		}

		// 按分组生成HTML - 直接在inspector-container中
		Object.entries(this.groupedMetadata).forEach(([group, properties]) => {
			if (properties.length === 0) return;

			html += `<div class="property-group">`;
			html += `<div class="group-header">${group}</div>`;
			html += `<div class="group-content">`;

			properties.forEach((metadata) => {
				if (!metadata.visible) return;

				html += this.getPropertyHTML(metadata);
			});

			html += `</div>`; // group-content
			html += `</div>`; // property-group
		});

		if (Object.keys(this.groupedMetadata).length === 0) {
			html += '<div class="no-properties">No properties available for this instance</div>';
		}

		html += '</div>'; // inspector-container

		return html;
	}

	/**
	 * 生成实例选择器HTML
	 */
	private getInstanceSelectorHTML(): string {
		if (this.allInstances.length === 0) {
			return '';
		}

		if (this.allInstances.length === 1) {
			// 紧凑的单行显示，类似Unity的组件标题
			return `
                <div class="instance-header">
                    <span class="instance-icon">🎯</span>
                    <span class="instance-title">${this.getInstanceDisplayName(this.targetInstance)}</span>
                </div>
            `;
		}

		return `
            <div class="instance-selector">
                <button class="instance-nav-btn" data-action="prev">‹</button>
                <div class="instance-info">
                    <div class="instance-name">${this.getInstanceDisplayName(this.targetInstance)}</div>
                    <div class="instance-counter">${this.currentInstanceIndex + 1} / ${this.allInstances.length}</div>
                </div>
                <button class="instance-nav-btn" data-action="next">›</button>
            </div>
        `;
	}

	/**
	 * 生成单个属性的HTML
	 */
	private getPropertyHTML(metadata: PropertyMetadata): string {
		const value = this.getPropertyValue(metadata);
		const formattedValue = this.formatValue(value, metadata);
		const fieldId = `property-${metadata.propertyKey.toString()}`;
		const fieldName = `property_${metadata.propertyKey.toString()}`;

		let controlHTML = '';

		switch (metadata.control) {
			case 'toggle':
				controlHTML = `
          <label class="switch ${metadata.readonly ? 'readonly-control' : ''}">
            <input type="checkbox" 
                   id="${fieldId}"
                   name="${fieldName}"
                   ${value ? 'checked' : ''} 
                   ${metadata.readonly ? 'disabled' : ''}
                   data-property="${metadata.propertyKey.toString()}">
            <span class="slider ${metadata.readonly ? 'disabled' : ''}"></span>
          </label>
        `;
				break;

			case 'slider':
				const range = metadata.range || { min: 0, max: 100, step: 1 };
				controlHTML = `
          <input type="range" 
                 id="${fieldId}"
                 name="${fieldName}"
                 min="${range.min}" 
                 max="${range.max}" 
                 step="${range.step}" 
                 value="${value}" 
                 ${metadata.readonly ? 'disabled' : ''}
                 class="${metadata.readonly ? 'readonly-control' : ''}"
                 data-property="${metadata.propertyKey.toString()}">
          <span class="slider-value ${metadata.readonly ? 'readonly-control' : ''}">${formattedValue}</span>
        `;
				break;

			case 'select':
				if (metadata.options) {
					// 单选控件
					controlHTML = `
              <select id="${fieldId}"
                      name="${fieldName}"
                      ${metadata.readonly ? 'disabled' : ''}
                      class="${metadata.readonly ? 'readonly-control' : ''}"
                      data-property="${metadata.propertyKey.toString()}">
                ${metadata.options
					.map((option) => `<option value="${option.value}" ${option.value === value ? 'selected' : ''}>${option.label}</option>`)
					.join('')}
              </select>
            `;
				}
				break;

			case 'multiselect':
				if (metadata.options) {
					// 多选控件
					const selectedValues = Array.isArray(value) ? value : [];
					controlHTML = `
              <select id="${fieldId}"
                      name="${fieldName}"
                      multiple
                      ${metadata.readonly ? 'disabled' : ''}
                      class="${metadata.readonly ? 'readonly-control' : ''}"
                      data-property="${metadata.propertyKey.toString()}">
                ${metadata.options
					.map((option) => {
						const isSelected = selectedValues.includes(option.value);
						return `<option value="${option.value}" ${isSelected ? 'selected' : ''}>${option.label}</option>`;
					})
					.join('')}
              </select>
            `;
				}
				break;

			case 'radio':
				if (metadata.options) {
					// 单选按钮组
					controlHTML = `
              <div class="radio-group ${metadata.readonly ? 'readonly-control' : ''}" data-property="${metadata.propertyKey.toString()}">
                ${metadata.options
					.map(
						(option, index) => `
                        <label class="radio-item">
                          <input type="radio" 
                                 name="${fieldName}" 
                                 value="${option.value}" 
                                 ${option.value === value ? 'checked' : ''}
                                 ${metadata.readonly ? 'disabled' : ''}
                                 data-property="${metadata.propertyKey.toString()}">
                          <span class="radio-label">${option.label}</span>
                        </label>
                      `
					)
					.join('')}
              </div>
            `;
				}
				break;

			case 'checkbox':
				if (metadata.options) {
					// 复选框组
					const selectedValues = Array.isArray(value) ? value : [];
					controlHTML = `
              <div class="checkbox-group ${metadata.readonly ? 'readonly-control' : ''}" data-property="${metadata.propertyKey.toString()}">
                ${metadata.options
					.map(
						(option, index) => `
                        <label class="checkbox-item">
                          <input type="checkbox" 
                                 name="${fieldName}_${index}" 
                                 value="${option.value}" 
                                 ${selectedValues.includes(option.value) ? 'checked' : ''}
                                 ${metadata.readonly ? 'disabled' : ''}
                                 data-property="${metadata.propertyKey.toString()}"
                                 data-multi-select="true">
                          <span class="checkbox-label">${option.label}</span>
                        </label>
                      `
					)
					.join('')}
              </div>
            `;
				}
				break;
			default:
				if (!metadata.readonly) {
					// 可编辑：使用输入框
					controlHTML = `
              <input type="text" 
                     id="${fieldId}"
                     name="${fieldName}"
                     value="${formattedValue}" 
                     data-property="${metadata.propertyKey.toString()}">
            `;
				} else {
					// 只读：使用只读文本显示
					controlHTML = `
              <span class="property-readonly-value readonly-control" 
                    id="${fieldId}"
                    title="${metadata.description}">
                ${formattedValue}
              </span>
            `;
				}
				break;
		}

		const labelHTML = `<span title="${metadata.description}">${metadata.displayName}</span>`;

		return `
      <div class="property-item" data-property="${metadata.propertyKey.toString()}">
        <div class="property-label">
          ${labelHTML}
        </div>
        <div class="property-control">
          ${controlHTML}
        </div>
      </div>
    `;
	}

	/**
	 * 获取属性值
	 */
	private getPropertyValue(metadata: PropertyMetadata): any {
		if (!this.targetInstance) return undefined;

		try {
			// 直接访问属性，因为装饰器已经设置了getter/setter
			return this.targetInstance[metadata.propertyKey];
		} catch (error) {
			console.warn(`Failed to get property value for ${metadata.displayName}:`, error);
			return undefined;
		}
	}

	/**
	 * 格式化值
	 */
	private formatValue(value: any, metadata: PropertyMetadata): string {
		if (metadata.format) {
			return metadata.format(value);
		}

		switch (metadata.type) {
			case 'number':
				return value?.toFixed?.(metadata.precision) || String(value);
			case 'vector2':
				return value ? `(${value.x?.toFixed?.(metadata.precision) || 0}, ${value.y?.toFixed?.(metadata.precision) || 0})` : '(0, 0)';
			case 'vector3':
				return value
					? `(${value.x?.toFixed?.(metadata.precision) || 0}, ${value.y?.toFixed?.(metadata.precision) || 0}, ${value.z?.toFixed?.(metadata.precision) || 0})`
					: '(0, 0, 0)';
			case 'color':
				return value ? `RGB(${value.r || 0}, ${value.g || 0}, ${value.b || 0})` : 'RGB(0, 0, 0)';
			default:
				return String(value);
		}
	}

	/**
	 * 更新显示
	 */
	protected updateDisplay(): void {
		if (!this.isInitialized) return;

		const contentElement = this.panelElement.querySelector('.panel-content');
		if (!contentElement) return;

		// 检查是否需要完全重建
		if (this.needsFullRebuild) {
			contentElement.innerHTML = this.getPanelContentHTML();
			this.setupPropertyEventListeners();
			this.needsFullRebuild = false;
			this.updateLastValues();
			return;
		}

		// 只更新变化的值
		this.updateChangedValues();
	}

	/**
	 * 更新变化的值
	 */
	private updateChangedValues(): void {
		if (!this.targetInstance) return;

		Object.entries(this.groupedMetadata).forEach(([group, properties]) => {
			properties.forEach((metadata) => {
				if (!metadata.visible) return;

				const propertyKey = metadata.propertyKey.toString();
				const currentValue = this.getPropertyValue(metadata);
				const lastValue = this.lastValues.get(propertyKey);

				// 只有值发生变化时才更新
				if (currentValue !== lastValue) {
					this.updatePropertyValue(metadata, currentValue);
					this.lastValues.set(propertyKey, currentValue);
				}
			});
		});
	}

	/**
	 * 更新单个属性的值
	 */
	private updatePropertyValue(metadata: PropertyMetadata, value: any): void {
		const propertyKey = metadata.propertyKey.toString();
		const fieldId = `property-${propertyKey}`;
		const element = this.panelElement.querySelector(`#${fieldId}`) as HTMLInputElement | HTMLSelectElement;

		if (!element) return;

		// 如果元素正在被用户交互，跳过更新
		if (document.activeElement === element || element.matches(':focus-within') || element.hasAttribute('data-interacting')) {
			return;
		}

		const formattedValue = this.formatValue(value, metadata);

		switch (metadata.control) {
			case 'toggle':
				if (element instanceof HTMLInputElement && element.type === 'checkbox') {
					if (element.checked !== Boolean(value)) {
						element.checked = Boolean(value);
					}
				}
				break;

			case 'slider':
				if (element instanceof HTMLInputElement && element.type === 'range') {
					if (element.value !== String(value)) {
						element.value = String(value);
						// 更新显示值
						const valueSpan = element.nextElementSibling;
						if (valueSpan) {
							valueSpan.textContent = formattedValue;
						}
					}
				}
				break;

			case 'select':
				if (element instanceof HTMLSelectElement) {
					// 单选控件 - 只有值不同时才更新
					if (element.value !== String(value)) {
						element.value = String(value);
					}
				}
				break;

			case 'multiselect':
				if (element instanceof HTMLSelectElement) {
					// 多选控件：比较当前选择和目标值
					const selectedValues = Array.isArray(value) ? value : [];
					const currentSelected = Array.from(element.selectedOptions).map((opt) => opt.value);

					// 只有选择真的不同时才更新
					const isDifferent =
						selectedValues.length !== currentSelected.length || !selectedValues.every((val) => currentSelected.includes(val));

					if (isDifferent) {
						Array.from(element.options).forEach((option) => {
							option.selected = selectedValues.includes(option.value);
						});
					}
				}
				break;

			case 'radio':
				// 单选按钮组 - 查找所有相关的radio按钮
				const radioButtons = this.panelElement.querySelectorAll(`input[type="radio"][data-property="${propertyKey}"]`);
				radioButtons.forEach((radio) => {
					const radioElement = radio as HTMLInputElement;
					const shouldBeChecked = radioElement.value === String(value);
					if (radioElement.checked !== shouldBeChecked) {
						radioElement.checked = shouldBeChecked;
					}
				});
				break;

			case 'checkbox':
				// 复选框组 - 查找所有相关的checkbox
				const checkboxes = this.panelElement.querySelectorAll(`input[type="checkbox"][data-property="${propertyKey}"]`);
				const selectedValues = Array.isArray(value) ? value : [];
				checkboxes.forEach((checkbox) => {
					const checkboxElement = checkbox as HTMLInputElement;
					const shouldBeChecked = selectedValues.includes(checkboxElement.value);
					if (checkboxElement.checked !== shouldBeChecked) {
						checkboxElement.checked = shouldBeChecked;
					}
				});
				break;

			default:
				if (element instanceof HTMLInputElement && element.type === 'text') {
					// 只有在元素没有焦点且值确实不同时才更新
					if (document.activeElement !== element && element.value !== formattedValue) {
						element.value = formattedValue;
					}
				} else if (element.classList.contains('property-readonly-value')) {
					// 更新只读文本显示
					if (element.textContent !== formattedValue) {
						element.textContent = formattedValue;
					}
				}
				break;
		}
	}

	/**
	 * 更新最后的值缓存
	 */
	private updateLastValues(): void {
		if (!this.targetInstance) return;

		this.lastValues.clear();
		Object.entries(this.groupedMetadata).forEach(([group, properties]) => {
			properties.forEach((metadata) => {
				if (!metadata.visible) return;

				const propertyKey = metadata.propertyKey.toString();
				const currentValue = this.getPropertyValue(metadata);
				this.lastValues.set(propertyKey, currentValue);
			});
		});
	}

	/**
	 * 设置事件监听器
	 */
	protected init(...args: any[]): void {
		super.init(...args);
		this.isInitialized = true;
		this.refreshInstances();
		this.needsFullRebuild = true;
		this.startUpdateTimer();
	}

	/**
	 * 设置属性事件监听器
	 */
	private setupPropertyEventListeners(): void {
		const contentElement = this.panelElement.querySelector('.panel-content');
		if (!contentElement) return;

		// 设置实例导航按钮事件
		contentElement.querySelectorAll('.instance-nav-btn').forEach((button) => {
			const element = <HTMLButtonElement>button;
			const action = element.dataset.action;
			if (action) {
				element.addEventListener('click', (e) => {
					e.preventDefault();
					if (action === 'next') {
						this.switchToNextInstance();
					} else if (action === 'prev') {
						this.switchToPreviousInstance();
					}
				});
			}
		});

		if (!this.targetInstance) return;

		// 处理输入框变更
		contentElement.querySelectorAll('input[type="text"]').forEach((value) => {
			const element = <HTMLInputElement>value;
			const propertyKey = element.dataset.property;
			if (propertyKey) {
				// 使用 input 事件而不是 change 事件，提供更好的实时反馈
				element.addEventListener('input', (e) => {
					this.handlePropertyChange(propertyKey, element.value);
				});

				// 同时保留 change 事件作为备用
				element.addEventListener('change', (e) => {
					this.handlePropertyChange(propertyKey, element.value);
				});
			}
		});

		// 处理单选按钮变更
		contentElement.querySelectorAll('input[type="radio"]').forEach((element) => {
			const radioElement = element as HTMLInputElement;
			const propertyKey = radioElement.dataset.property;
			if (propertyKey) {
				// 使用更简单直接的事件处理
				radioElement.addEventListener('change', (e) => {
					// 只处理被选中的单选按钮
					if (radioElement.checked) {
						console.log(`🔄 Radio button changed: ${propertyKey} = ${radioElement.value}`);
						this.handlePropertyChange(propertyKey, radioElement.value);
					}
				});
			}
		});
		// 处理单选按钮变更 - 使用事件委托方式
		contentElement.addEventListener('change', (e) => {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'radio') {
				const radioElement = target as HTMLInputElement;
				const propertyKey = radioElement.dataset.property;
				if (propertyKey && radioElement.checked) {
					console.log(`🔄 Radio button changed via delegation: ${propertyKey} = ${radioElement.value}`);
					this.handlePropertyChange(propertyKey, radioElement.value);
				}
			}
		});

		// 处理复选框变更（多选类型）
		contentElement.querySelectorAll('input[type="checkbox"]').forEach((element) => {
			const checkboxElement = element as HTMLInputElement;
			const propertyKey = checkboxElement.dataset.property;
			if (propertyKey) {
				// 检查是否是多选类型的复选框
				const isMultiSelect = checkboxElement.dataset.multiSelect === 'true';
				if (isMultiSelect) {
					checkboxElement.addEventListener('change', (e) => {
						// 获取同组的所有复选框
						const checkboxes = contentElement.querySelectorAll(`input[type="checkbox"][data-property="${propertyKey}"]`);
						const selectedValues: string[] = [];

						checkboxes.forEach((cb: Element) => {
							const checkbox = cb as HTMLInputElement;
							if (checkbox.checked) {
								selectedValues.push(checkbox.value);
							}
						});

						this.handlePropertyChange(propertyKey, selectedValues);
					});
				} else {
					// 单个开关类型的复选框
					checkboxElement.addEventListener('change', (e) => {
						this.handlePropertyChange(propertyKey, checkboxElement.checked);
					});
				}
			}
		});

		// 处理滑块变更
		contentElement.querySelectorAll('input[type="range"]').forEach((value) => {
			const element = <HTMLInputElement>value;
			const propertyKey = element.dataset.property;
			if (propertyKey) {
				element.addEventListener('input', (e) => {
					this.handlePropertyChange(propertyKey, parseFloat(element.value));
					// 实时更新显示值
					const valueSpan = element.nextElementSibling;
					if (valueSpan) {
						valueSpan.textContent = element.value;
					}
				});
			}
		});

		// 处理选择框变更
		contentElement.querySelectorAll('select').forEach((value) => {
			const element = <HTMLSelectElement>value;
			const propertyKey = element.dataset.property;
			if (propertyKey) {
				if (element.multiple) {
					// 多选控件：使用change事件，并添加交互状态标记
					let isInteracting = false;

					element.addEventListener('mousedown', (e) => {
						isInteracting = true;
						// 标记元素正在交互中
						element.setAttribute('data-interacting', 'true');
					});

					element.addEventListener('mouseup', (e) => {
						// 延迟一点再移除交互标记，确保change事件能正常处理
						setTimeout(() => {
							isInteracting = false;
							element.removeAttribute('data-interacting');
						}, 50);
					});

					element.addEventListener('change', (e) => {
						if (isInteracting) {
							const selectedValues = Array.from(element.selectedOptions).map((opt) => opt.value);
							this.handlePropertyChange(propertyKey, selectedValues);
						}
					});

					// 处理键盘操作
					element.addEventListener('keyup', (e) => {
						if (e.key === ' ' || e.key === 'Enter') {
							const selectedValues = Array.from(element.selectedOptions).map((opt) => opt.value);
							this.handlePropertyChange(propertyKey, selectedValues);
						}
					});
				} else {
					// 单选控件：正常的change事件
					element.addEventListener('change', (e) => {
						this.handlePropertyChange(propertyKey, element.value);
					});
				}
			}
		});
	}

	/**
	 * 处理属性变更
	 */
	private handlePropertyChange(propertyKey: string, newValue: any): void {
		if (!this.targetInstance) return;

		try {
			// 更新缓存值，避免立即触发更新
			this.lastValues.set(propertyKey, newValue);

			// 直接设置属性，装饰器的setter会处理验证和通知
			this.targetInstance[propertyKey] = newValue;
		} catch (error) {
			console.warn(`Failed to set property value for ${propertyKey}:`, error);
		}
	}

	/**
	 * 检查面板是否可见
	 */
	public isVisible(): boolean {
		return this.isVisibleRef.value;
	}

	/**
	 * 添加内部样式
	 */
	protected addInternalStyles(): void {
		super.addInternalStyles();

		const styleId = 'property-panel-styles';
		if (document.getElementById(styleId)) return;

		const style = document.createElement('style');
		style.id = styleId;
		style.textContent = this.getThemeStyles();
		document.head.appendChild(style);
	}

	/**
	 * 获取主题样式
	 */
	private getThemeStyles(): string {
		const isDark = this.config.theme === 'dark';

		return `
			/* Inspector 最外层容器 */
			.debug-panel[data-theme="${this.config.theme}"] .inspector-container {
				background: ${isDark ? 'rgba(37, 37, 38, 0.95)' : 'rgba(245, 245, 245, 0.95)'};
				border-radius: 3px;
			}

			/* Unity风格的实例选择器 - 作为主分类标识 */
			.debug-panel[data-theme="${this.config.theme}"] .instance-selector {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 6px;
				padding: 6px 10px;
				background: ${isDark ? 'linear-gradient(180deg, #4a4a4a 0%, #404040 100%)' : 'linear-gradient(180deg, #f0f0f0 0%, #e0e0e0 100%)'};
				border: 1px solid ${isDark ? '#555555' : '#b0b0b0'};
				border-radius: 3px;
				font-size: 12px;
				font-weight: bold;
				box-shadow: ${isDark ? 'inset 0 1px 0 rgba(255,255,255,0.1)' : 'inset 0 1px 0 rgba(255,255,255,0.8)'};
			}
			
			/* 紧凑的实例标题 - 类似Unity组件标题 */
			.debug-panel[data-theme="${this.config.theme}"] .instance-header {
				display: flex;
				align-items: center;
				margin-bottom: 4px;
				padding: 3px 6px;
				background: ${isDark ? 'rgba(85, 85, 85, 0.8)' : 'rgba(0, 0, 0, 0)'};
				border-left: 3px solid ${isDark ? '#ffa500' : '#ff6600'};
				border-radius: 1px;
				font-size: 11px;
				font-weight: bold;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .instance-icon {
				margin-right: 5px;
				font-size: 11px;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .instance-title {
				color: ${isDark ? '#ffffff' : '#000000'};
				flex: 1;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .instance-nav-btn {
				background: ${isDark ? '#484848' : '#c2c2c2'};
				border: 1px solid ${isDark ? '#5a5a5a' : '#999'};
				color: ${isDark ? '#ffffff' : '#000000'};
				width: 20px;
				height: 20px;
				border-radius: 2px;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 12px;
				font-weight: normal;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .instance-nav-btn:hover {
				background: ${isDark ? '#5a5a5a' : '#d4d4d4'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .instance-name {
				font-size: 12px;
				font-weight: bold;
				color: ${isDark ? '#ffffff' : '#000000'};
				margin-bottom: 1px;
				text-shadow: ${isDark ? '0 1px 0 rgba(0,0,0,0.5)' : '0 1px 0 rgba(255,255,255,0.8)'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .instance-counter {
				font-size: 10px;
				color: ${isDark ? '#cccccc' : '#555555'};
				font-weight: normal;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			
			
			
			/* Unity风格的属性组 */
			.debug-panel[data-theme="${this.config.theme}"] .property-group {
				margin-bottom: 6px;
				background: ${isDark ? 'rgba(56, 56, 56, 0.6)' : 'rgba(255, 255, 255, 0.8)'};
				border-radius: 2px;
				overflow: hidden;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-group:last-child {
				margin-bottom: 0;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .group-header {
				font-weight: bold;
				font-size: 11px;
				color: ${isDark ? '#ffffff' : '#000000'};
				margin: 0;
				padding: 5px 8px;
				background: ${isDark ? 'rgba(70, 70, 70, 0.9)' : 'rgba(230, 230, 230, 0)'};
				border-bottom: 1px solid ${isDark ? '#484848' : '#c0c0c0'};
				border-left: 3px solid ${isDark ? '#569cd6' : '#0078d4'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .group-content {
				background: ${isDark ? 'rgba(56, 56, 56, 0.3)' : 'rgba(255, 255, 255, 0.5)'};
			}
			
			/* Unity风格的属性项 */
			.debug-panel[data-theme="${this.config.theme}"] .property-item {
				display: flex;
				align-items: center;
				margin-bottom: 2px;
				padding: 2px 4px;
				background: ${isDark ? 'rgba(64, 64, 64, 0.4)' : 'rgba(250, 250, 250, 0.8)'};
				border: 1px solid ${isDark ? 'rgba(80, 80, 80, 0.6)' : 'rgba(220, 220, 220, 0.8)'};
				border-radius: 1px;
				min-height: 18px;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-item:last-child {
				margin-bottom: 0;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-item:hover {
				background: ${isDark ? 'rgba(70, 70, 70, 0.6)' : 'rgba(240, 240, 240, 0.9)'};
				border-color: ${isDark ? 'rgba(90, 90, 90, 0.8)' : 'rgba(200, 200, 200, 0.9)'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-label {
				flex: 0 0 40%;
				font-size: 10px;
				font-weight: normal;
				color: ${isDark ? '#cccccc' : '#333333'};
				margin-right: 6px;
				margin-bottom: 0;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control {
				flex: 1;
				display: flex;
				align-items: center;
			}
			
			/* Unity风格的输入框 */
			.debug-panel[data-theme="${this.config.theme}"] .property-control input[type="text"] {
				background: ${isDark ? '#393939' : '#ffffff'};
				border: 1px solid ${isDark ? '#5a5a5a' : '#a0a0a0'};
				color: ${isDark ? '#ffffff' : '#000000'};
				padding: 2px 5px;
				border-radius: 1px;
				font-size: 10px;
				font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
				width: 100%;
				height: 16px;
				box-sizing: border-box;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control input[type="text"]:focus {
				background: ${isDark ? '#464646' : '#ffffff'};
				border-color: ${isDark ? '#007acc' : '#0078d4'};
				outline: none;
				box-shadow: 0 0 0 1px ${isDark ? '#007acc' : '#0078d4'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control input[type="text"]:readonly {
				background: ${isDark ? 'rgba(57, 57, 57, 0.5)' : 'rgba(240, 240, 240, 0.8)'};
				color: ${isDark ? '#999999' : '#666666'};
				cursor: not-allowed;
			}
			
			/* Unity风格的滑块 */
			.debug-panel[data-theme="${this.config.theme}"] .property-control input[type="range"] {
				flex: 1;
				margin-right: 4px;
				height: 14px;
				-webkit-appearance: none;
				background: ${isDark ? '#2d2d30' : '#e1e1e1'};
				border-radius: 1px;
				outline: none;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control input[type="range"]::-webkit-slider-thumb {
				-webkit-appearance: none;
				width: 10px;
				height: 14px;
				background: ${isDark ? '#007acc' : '#0078d4'};
				border-radius: 1px;
				cursor: pointer;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .slider-value {
				font-size: 10px;
				color: ${isDark ? '#ffffff' : '#000000'};
				min-width: 32px;
				text-align: right;
				font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
				background: ${isDark ? '#393939' : '#ffffff'};
				padding: 2px 4px;
				border-radius: 1px;
				border: 1px solid ${isDark ? '#5a5a5a' : '#a0a0a0'};
				height: 16px;
				line-height: 12px;
				box-sizing: border-box;
			}
			
			/* Unity风格的开关 */
			.debug-panel[data-theme="${this.config.theme}"] .switch {
				position: relative;
				display: inline-block;
				width: 24px;
				height: 14px;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .switch input {
				opacity: 0;
				width: 0;
				height: 0;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .slider {
				position: absolute;
				cursor: pointer;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background-color: ${isDark ? '#2d2d30' : '#cccccc'};
				transition: .2s;
				border-radius: 1px;
				border: 1px solid ${isDark ? '#5a5a5a' : '#a0a0a0'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .slider:before {
				position: absolute;
				content: "";
				height: 10px;
				width: 10px;
				left: 1px;
				bottom: 1px;
				background-color: ${isDark ? '#ffffff' : '#ffffff'};
				transition: .2s;
				border-radius: 1px;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] input:checked + .slider {
				background-color: ${isDark ? '#007acc' : '#0078d4'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] input:checked + .slider:before {
				transform: translateX(10px);
			}
			
			/* Unity风格的选择框 */
			.debug-panel[data-theme="${this.config.theme}"] .property-control select {
				background: ${isDark ? '#393939' : '#ffffff'};
				border: 1px solid ${isDark ? '#5a5a5a' : '#a0a0a0'};
				color: ${isDark ? '#ffffff' : '#000000'};
				border-radius: 1px;
				font-size: 10px;
				font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
				width: 100%;
				height: 16px;
				box-sizing: border-box;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control select:focus {
				border-color: ${isDark ? '#007acc' : '#0078d4'};
				outline: none;
				box-shadow: 0 0 0 1px ${isDark ? '#007acc' : '#0078d4'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control select option {
				background: ${isDark ? '#2d2d30' : '#ffffff'};
				color: ${isDark ? '#ffffff' : '#000000'};
			}
			
			/* 多选框样式 */
				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] {
					height: auto !important;
					min-height: 80px;
					max-height: 120px;
					padding: 4px !important;
					overflow-y: auto;
					border: 2px solid ${isDark ? '#5a5a5a' : '#a0a0a0'};
					border-radius: 4px;
					background: ${isDark ? '#393939' : '#ffffff'};
					-webkit-appearance: none;
					-moz-appearance: none;
					appearance: none;
					box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
					transition: border-color 0.2s ease, box-shadow 0.2s ease;
				}

				/* 多选框滚动条样式 */
				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple]::-webkit-scrollbar {
					width: 8px;
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple]::-webkit-scrollbar-track {
					background: ${isDark ? '#2a2a2a' : '#f1f1f1'};
					border-radius: 4px;
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple]::-webkit-scrollbar-thumb {
					background: ${isDark ? '#5a5a5a' : '#c1c1c1'};
					border-radius: 4px;
					border: 1px solid ${isDark ? '#393939' : '#ffffff'};
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple]::-webkit-scrollbar-thumb:hover {
					background: ${isDark ? '#6a6a6a' : '#a8a8a8'};
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple]::-webkit-scrollbar-thumb:active {
					background: ${isDark ? '#7a7a7a' : '#909090'};
				}

				/* Firefox 滚动条样式 */
				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] {
					scrollbar-width: thin;
					scrollbar-color: ${isDark ? '#5a5a5a #2a2a2a' : '#c1c1c1 #f1f1f1'};
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple]:focus {
					border-color: ${isDark ? '#007acc' : '#0078d4'};
					outline: none;
					box-shadow: 0 0 0 2px ${isDark ? 'rgba(0, 122, 204, 0.3)' : 'rgba(0, 120, 212, 0.3)'}, 
					            inset 0 1px 3px rgba(0, 0, 0, 0.1);
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] option {
					padding: 4px 6px;
					margin: 1px 0;
					border-radius: 2px;
					background: ${isDark ? '#393939' : '#ffffff'};
					color: ${isDark ? '#ffffff' : '#000000'};
					border: none;
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] option:checked {
					background: ${isDark ? '#007acc' : '#0078d4'} !important;
					color: #ffffff !important;
					font-weight: 500;
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] option:hover {
					background: ${isDark ? '#4a4a4a' : '#f0f0f0'} !important;
				}

				.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] option:checked:hover {
					background: ${isDark ? '#1e8dd6' : '#106ebe'} !important;
				}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] option {
				padding: 3px 6px !important;
				margin: 0 !important;
				border: none !important;
				background: transparent !important;
				color: ${isDark ? '#ffffff' : '#000000'} !important;
				font-size: 10px !important;
				line-height: 1.2 !important;
				cursor: pointer !important;
				display: block !important;
				width: 100% !important;
				box-sizing: border-box !important;
				user-select: none;
				-webkit-user-select: none;
				-moz-user-select: none;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] option:hover {
				background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'} !important;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] option:checked {
				background: ${isDark ? '#0078d4' : '#0078d4'} !important;
				color: white !important;
				font-weight: bold !important;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .property-control select[multiple] option:checked:hover {
				background: ${isDark ? '#106ebe' : '#106ebe'} !important;
			}
			
			/* 单选按钮组样式 */
			.debug-panel[data-theme="${this.config.theme}"] .radio-group {
				display: flex;
				flex-direction: column;
				gap: 4px;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .radio-item {
				display: flex;
				align-items: center;
				cursor: pointer;
				padding: 2px 0;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .radio-item input[type="radio"] {
				margin: 0 6px 0 0;
				width: 12px;
				height: 12px;
				accent-color: ${isDark ? '#0078d4' : '#0078d4'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .radio-label {
				font-size: 10px;
				color: ${isDark ? '#ffffff' : '#000000'};
				user-select: none;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .radio-item:hover .radio-label {
				color: ${isDark ? '#ffffff' : '#333333'};
			}
			
			/* 复选框组样式 */
			.debug-panel[data-theme="${this.config.theme}"] .checkbox-group {
				display: flex;
				flex-direction: column;
				gap: 4px;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .checkbox-item {
				display: flex;
				align-items: center;
				cursor: pointer;
				padding: 2px 0;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .checkbox-item input[type="checkbox"] {
				margin: 0 6px 0 0;
				width: 12px;
				height: 12px;
				accent-color: ${isDark ? '#0078d4' : '#0078d4'};
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .checkbox-label {
				font-size: 10px;
				color: ${isDark ? '#ffffff' : '#000000'};
				user-select: none;
			}
			
			.debug-panel[data-theme="${this.config.theme}"] .checkbox-item:hover .checkbox-label {
				color: ${isDark ? '#ffffff' : '#333333'};
			}
			
			
			
			/* 只读属性值样式 */
				.debug-panel[data-theme="${this.config.theme}"] .property-readonly-value {
					display: inline-block;
					padding: 2px 5px;
					background: ${isDark ? 'rgba(70, 70, 70, 0.3)' : 'rgba(240, 240, 240, 0.6)'};
					border: 1px solid ${isDark ? 'rgba(80, 80, 80, 0.4)' : 'rgba(200, 200, 200, 0.6)'};
					border-radius: 1px;
					font-size: 10px;
					color: ${isDark ? '#cccccc' : '#666666'};
					font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
					min-height: 16px;
					line-height: 12px;
					box-sizing: border-box;
					width: 100%;
					cursor: not-allowed;
					user-select: text;
					opacity: 0.7;
				}

				/* 禁用状态的控件样式 */
				.debug-panel[data-theme="${this.config.theme}"] input:disabled,
				.debug-panel[data-theme="${this.config.theme}"] select:disabled,
				.debug-panel[data-theme="${this.config.theme}"] .slider.disabled {
					cursor: not-allowed !important;
					opacity: 0.6 !important;
					pointer-events: none;
				}

				.debug-panel[data-theme="${this.config.theme}"] .switch input:disabled + .slider {
					cursor: not-allowed !important;
					opacity: 0.6 !important;
				}

				.debug-panel[data-theme="${this.config.theme}"] .radio-item input:disabled,
				.debug-panel[data-theme="${this.config.theme}"] .checkbox-item input:disabled {
					cursor: not-allowed !important;
				}

				.debug-panel[data-theme="${this.config.theme}"] .radio-item input:disabled + .radio-label,
				.debug-panel[data-theme="${this.config.theme}"] .checkbox-item input:disabled + .checkbox-label {
					cursor: not-allowed !important;
					opacity: 0.6 !important;
					color: ${isDark ? '#888888' : '#999999'} !important;
				}

				/* 只读控件容器统一样式 */
				.debug-panel[data-theme="${this.config.theme}"] .readonly-control {
					cursor: not-allowed !important;
					opacity: 0.7 !important;
				}

				.debug-panel[data-theme="${this.config.theme}"] .readonly-control * {
					cursor: not-allowed !important;
				}
			
			/* 提示信息 */
			.debug-panel[data-theme="${this.config.theme}"] .no-instance,
			.debug-panel[data-theme="${this.config.theme}"] .no-properties {
				text-align: center;
				color: ${isDark ? '#999999' : '#666666'};
				font-size: 11px;
				padding: 16px;
				font-style: italic;
			}=
		`;
	}

	/**
	 * 卸载当前场景资源
	 */
	public dispose(): void {
		this.targetInstance = null;
		this.allInstances = [];
		this.groupedMetadata = {};
		this.needsFullRebuild = true;
		clearAllRegisteredInstances();
	}

	/**
	 * 清理资源
	 */
	public destroy(): void {
		// 清理防抖定时器
		if (this.updateDebounceTimer !== null) {
			clearTimeout(this.updateDebounceTimer);
			this.updateDebounceTimer = null;
		}

		// 调用父类的销毁方法
		super.destroy?.();
	}
}
