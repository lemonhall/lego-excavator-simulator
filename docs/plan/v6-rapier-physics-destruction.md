# v6 Plan: Rapier Breakable Assembly Destruction

## Goal

用 Rapier 把树、篱笆和小屋改造成可断裂物理装配体。挖掘机车身/履带/铲斗真实推挤这些装配体，连接超过阈值后断开，零件被碰撞、挤压、撞飞、滚落，最后散落一地。

## PRD Trace

- REQ-0004-004
- REQ-0004-005
- ECN-0006

## Scope

做：

- 安装并使用 `@dimforge/rapier3d-compat`。
- 新建 `src/game/physics.ts`，封装 Rapier 初始化、固定地面、kinematic 挖机 collider、assembly part body、breakable link、step 和 debug。
- 树、篱笆、小屋的 LEGO 零件从初始状态就登记为 assembly part，不允许碰撞后才替换出碎片。
- 装配连接用 fixed impulse joint 或等效的断裂阈值模型表示；连接断开后零件成为自由 dynamic body。
- 挖掘机车身/履带/铲斗创建 kinematic collider，跟随现有状态移动。
- E2E 断言 Rapier 引擎运行、装配体零件存在、连接数量下降、断裂数量增加、零件连续采样位移。

不做：

- 不把整台挖掘机变成 Rapier 车辆。
- 不做真实履带动力学。
- 不做复杂材料断裂求解；但必须做装配连接断开。
- 不引入粒子烟尘。

## Acceptance

1. `npm test -- src/game/physics.test.ts` exit 0，并覆盖：
   - Rapier world 初始化后 debug engine 为 `rapier`。
   - 创建 assembly part 后 `assemblyBodyCount > 0`。
   - 创建 breakable link 后 `activeLinkCount > 0`。
   - 施加足够冲量或位移后 `brokenLinkCount > 0` 且 `activeLinkCount` 下降。
   - 创建 kinematic collider 后 `kinematicColliderCount >= 2`。
   - step 后断开连接的零件受重力和碰撞影响。
2. `npm test -- src/game/world.test.ts src/game/physics.test.ts` exit 0，并覆盖：
   - destructible part 标记存在，且可映射到 physics assembly part。
   - world 集成不破坏 v5 场景命名。
3. `npm run e2e -- tests/e2e/game.spec.ts` exit 0，并覆盖：
   - 驾驶挖机撞击可拆物。
   - `window.__legoGameDebug.physics.engine === "rapier"`。
   - `assemblyBodyCount > 0`。
   - `activeLinkCount` 下降。
   - `brokenLinkCount > 0`。
   - `kinematicColliderCount >= 2`。
   - 连续采样的 `movingPartSample.y` 或 `movingPartSample.z` 发生变化。
4. `npm test` 和 `npm run build` exit 0。

## Files

- `package.json`
- `package-lock.json`
- `docs/ecn/ECN-0006-rapier-physics-destruction.md`
- `docs/prd/PRD-0004-destructible-farm-props.md`
- `docs/plan/v6-index.md`
- `docs/plan/v6-rapier-physics-destruction.md`
- `src/game/physics.ts`
- `src/game/physics.test.ts`
- `src/game/app.ts`
- `src/game/world.ts`
- `src/game/world.test.ts`
- `tests/e2e/game.spec.ts`

## Steps

1. 文档 Gate：提交 ECN、PRD 更新、v6-index 和 v6 计划。
2. TDD Red：新增 `physics.test.ts` 和 E2E physics debug 断言，要求 assembly body、breakable link 和 broken link，运行到红。
3. 依赖 slice：安装 `@dimforge/rapier3d-compat`。
4. TDD Green：实现 `PhysicsWorldController`，支持 assembly part、breakable link、link threshold 和 kinematic collider。
5. 集成：在 `app.ts` 初始化物理控制器，同步挖机 kinematic collider 和可破坏装配体零件。
6. 视觉：物理零件 transform 由 physics 控制；连接未断时保持结构形状，断开后自然散落。
7. E2E：验证浏览器用户流程里的物理 debug 和碎块运动。
8. Review Loop：检查追溯、测试、E2E、残余风险。
9. Ship：提交并推送。

## Risks

- **WASM 初始化异步**：`@dimforge/rapier3d-compat` 需要 async init；app 必须在未 ready 时保留 v5 视觉，不阻塞首帧。
- **E2E 时间不稳定**：用 debug 连续采样而非像素判断，降低 flake。
- **性能风险**：v6 只给 detached 后碎块创建 dynamic body，避免整场景全物理化。
