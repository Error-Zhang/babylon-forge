# TypeScript 5.x 装饰器详解（含项目实战）

本文将系统讲解 TypeScript 5.x（ECMAScript Stage 3）装饰器：概念、类型、写法与执行顺序，以及在本项目中的真实应用与最佳实践。最后会实现一个只读 accessor 装饰器作为案例。

## 一、演示项目中的装饰器做了哪些事

在本仓库中，主要有以下装饰器：

- `Inject(token)`：依赖注入，用于在字段初始化时从全局 DI 容器中取出实例，避免显式传参与耦合。
- `LogReturn(options?, on?)`：方法/访问器装饰器，打印函数返回值（可配节流/防抖）。适合调试时观察返回值。
- `Sealed`：方法装饰器，禁止被重写；防止子类或实例层误改关键方法导致行为异常。
- `FieldMonitor(config, on?)`：字段装饰器，将类字段注册进“属性面板”，并在运行时拦截读写，实现验证、格式化、onChange 回调、只读/可编辑控制等。用于 Debug 面板与 Demo 场景交互。

它们的源码位置：
- `src/global/Decorators.ts`
- `src/global/FieldMonitorDecorator.ts`

在 Demo 中的使用示例（节选）：

```ts
// src/demos/PropertyDemoScene.ts（节选）
import { FieldMonitor } from '@/global/Decorators';

class PropertyDemoScene {
  @FieldMonitor({ group: '🎮 角色属性', type: 'number', range: { min: 0, max: 10, step: 1 } })
  moveSpeed = 5;

  @FieldMonitor({ group: '⚙️ 游戏设置', type: 'boolean' })
  enableBloom = true;
}
```

## 二、Stage 3 与“实验性传统装饰器”的区别

TypeScript 5.x 采用了 ECMAScript Stage 3 装饰器提案，语义与旧版“实验性装饰器”（legacy）差异较大：

- 参数签名：
  - Stage 3：统一为 `(value, context) => newValue?` 或返回结构体（仅 auto-accessor），其中 `context` 包含 `kind/name/static/private/addInitializer()` 等信息。
  - Legacy：根据位置（类/方法/参数/属性）传入不同数量的参数（如 `target, propertyKey, descriptor`）。
- 返回值语义：
  - Stage 3：可以返回新的函数/访问器或初始化器，直接替换原成员；字段装饰器可返回“初始化器函数”。
  - Legacy：通常通过修改 `descriptor` 或原型链达成效果，返回值没有标准化约束。
- 支持位置：
  - Stage 3：Class、Method、Getter、Setter、Field、Auto-accessor（新增）。
  - Legacy：Class、Method、Accessor（合并）、Property、Parameter。
- 初始化时机：
  - Stage 3：装饰器表达式先“求值”，随后在类定义完成后“应用”，字段的初始化器在“实例化时”执行；可通过 `context.addInitializer()`注册额外初始化逻辑。
  - Legacy：更类似编译期的描述符修改，时序依赖编译器实现。
- 反射与元数据：
  - Stage 3：不内置反射/类型元数据；如需元数据需自行存储（WeakMap 等）或自定义协议。
  - Legacy：常与 `reflect-metadata` 搭配，但这不是标准；TS 5 的 Stage 3 不推荐再依赖它。

建议实践：尽量使用 Stage 3 新语义；只有在必须兼容旧生态时才考虑 legacy 管线。

## 三、装饰器的类型与适用位置

- Class：`(func) => func2`
- Method：`(func) => func2`，`context.kind === 'method'`
- Getter：`(func) => func2`，`{get}`
- Setter：`(func) => func2`，`{set}`
- Auto-accessor：`({ get, set }) => ({ get, set, init })`
- Field：`() => (initValue) => newInitValue`（返回初始化器函数）

备注：`context` 提供 `.access` 能力（例如访问私有状态）以及 `addInitializer()`。

## 四、基本写法、参数与装饰器工厂

- 直接装饰：

```ts
@myDecorator
class C {}
```

- 装饰器工厂（带参数）：

```ts
function myDecoratorFactory(prefix = 'X') {
  return (value: any, context: any) => {
    console.log(prefix, context.name);
    return value; // 或返回替换后的成员
  };
}

@myDecoratorFactory('Demo')
class C {}
```

- 任意表达式：

```ts
@(wrap(dict['prop']))
class C {}
```

- 多个装饰器同时使用（从上到下“求值”，从下到上“应用”）：

```ts
@decA
@decB('arg')
class C {}
```

## 五、装饰器的代码执行顺序（Stage 3）

装饰器的时序分两步：
- Evaluate（求值）：按照源码顺序自上而下对每个 `@expr` 求值，得到装饰器函数。
- Apply（应用）：类完成定义后，按规范的既定顺序应用装饰器。对于同一位置的多个装饰器，通常是“后写的先应用”（栈式）。字段的初始化器在“实例化时”才执行。

多位置综合示例（节选项目里已有类似示例）：

```ts
function decorate(str: string) {
  console.log(`EVALUATE @decorate(): ${str}`);
  return () => console.log(`APPLY @decorate(): ${str}`);
}

@decorate('class')
class TheClass {
  @decorate('static field')
  static staticField = 'value';

  @decorate('prototype method')
  method() {}

  @decorate('instance field')
  instanceField = 'init';
}
```

结论：
- 所有 `@decorate()` 的表达式先依次“打印 EVALUATE”。
- 类完成定义后，再按规范顺序“APPLY”。
- 字段初始化器只在构造实例时执行（不是在类定义阶段）。

对于“同一成员上的多个装饰器”，求值从上到下，应用从下到上。

## 六、实现一个 accessor 只读装饰器（Stage 3）

利用 auto-accessor 装饰器可以无侵入地将访问器置为只读：

```ts
// 将 auto-accessor 置为只读：保留 get，但在 set 时抛错；init 原样返回
export function ReadonlyAccessor() {
  return function (accessor: { get: () => any; set: (v: any) => void }, context: ClassAccessorDecoratorContext) {
    const { get, set } = accessor;
    return {
      get,
      set(value: any) {
        throw new Error(`Property ${String(context.name)} is readonly`);
      },
      init(initialValue: any) {
        return initialValue;
      },
    };
  };
}

class Player {
  @ReadonlyAccessor()
  accessor hp = 100; // TS 5 支持 auto-accessor 语法
}
```

如果项目暂不使用 auto-accessor，也可通过字段装饰器与 `Object.defineProperty` 拦截 set 实现只读效果，或在配置中设置 `editable: false`（见下文 `FieldMonitor`）。

## 七、项目装饰器实现解读

- `Inject<T>(token)`（字段装饰器）：
  - 签名：`Inject(token) => (undefined, context: ClassFieldDecoratorContext) => initializer`
  - 行为：返回一个字段初始化器，在构造时从 `diContainer` 获取实例作为该字段的初始化值。
  - 用途：避免显式 new/传参，降低耦合；如遇隐式循环依赖，提示改为传惰性函数 `() => token`。

- `LogReturn(options, on?)`（方法/访问器装饰器）：
  - 在返回值计算后打印（可带前缀与颜色），支持以 `wrapperFn` 包装打印函数实现防抖/节流。
  - 当 `on` 为 `false` 时不打印（通常由 `ENV_CONFIG.DEBUG` 控制）。

- `Sealed`（方法装饰器）：
  - 在方法执行前检查原型链是否已出现同名自有属性，若是则抛错，阻止对该方法的“重写”。

- `FieldMonitor(config, on?)`（字段装饰器，核心）：
  - 在 `addInitializer()` 中：
    - 为字段建立私有存储（`Symbol`），用访问器替换字段，实现运行时拦截读写。
    - 推断 `type` 与 `control`，注册 `PropertyMetadata` 到 `WeakMap`，并将实例加入全局注册表。
    - 写入时进行 `validator` 校验、类型转换（`convertValue`），并只在值真正改变时触发 `onChange(self, newValue, oldValue)` 回调。
  - 公开 API：
    - `getAllPropertyMetadata(target)`：获取并按 `order` 排序的字段元数据。
    - `getGroupedPropertyMetadata(target)`：按 `group` 分组返回元数据。
    - `getAllRegisteredInstances()` / `clearAllRegisteredInstances()` / `unregisterInstance(instance)`：管理已注册实例集合。
  - 使用建议：
    - 在 Debug 面板开启时（`ENV_CONFIG.USE_DEBUG_PANEL`）启用；生产环境可关闭以减少开销。
    - 通过 `editable/readonly/visible/order/options/range/multiple/precision/format/validator/onChange` 等配置达到丰富的展示与交互效果。

示例（只读展示 vs 可编辑）：

```ts
class Demo {
  // 只读展示：不允许修改，但在面板可见
  @FieldMonitor({ displayName: '版本号', readonly: true, editable: false })
  version = '1.0.0';

  // 可编辑，带范围与精度
  @FieldMonitor({ displayName: '移动速度', type: 'number', range: { min: 0, max: 10, step: 0.5 }, precision: 2 })
  moveSpeed = 5;
}
```

## 八、最佳实践与注意事项

- 装饰器应保持纯粹与可预测，避免在“求值阶段”做副作用操作（如访问环境、改全局状态）。
- 字段装饰器的初始化器只在实例化时执行；如需要类级别逻辑，请使用 `context.addInitializer()`。
- 避免循环依赖：DI 注入建议使用 token 或惰性函数；复杂场景拆分模块。
- Stage 3 不内置类型元数据，如需元数据请自行维护 WeakMap/Map。
- 调试输出（如 `LogReturn`）在生产环境关闭。
- 与 TS 配置：确保使用 TS 5.x 的新装饰器语义（不要启用 legacy 管线），以获得 `ClassFieldDecoratorContext/addInitializer/auto-accessor` 等能力。

## 九、参考资料

- TypeScript 5.0 发布说明（装饰器）：https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators
- 2ality（深入解析 ES 装饰器）：https://2ality.com/2022/10/javascript-decorators.html
- 提案仓库：https://github.com/tc39/proposal-decorators
