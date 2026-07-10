# v9 Plan: Shooter Swarm Feel

## Goal

把 v8 的射击核心升级成更接近“乐高割草爽游”的第一版：可见加特林、真实弹幕感、稳定 LDraw 目标场、真实资产优先的 AI 预留、巡逻车辆和碎片 TTL 回收。

## PRD Trace

- REQ-0007-001
- REQ-0007-002
- REQ-0007-003
- REQ-0007-004
- REQ-0007-005
- REQ-0007-006
- REQ-0007-007

## Scope

做：

- 重做玩家加特林挂载和命名节点，使枪和枪口在过肩视角可见。
- 扩展 `weapon.ts`，支持 barrel lane、spread、tracer 起止点和 debug。
- 把 projectile 视觉从小球改成 tracer streak，并保留枪口火光。
- 默认分批自动生成不少于 27 个真实 manifest LDraw `radar-truck` 实例，用颜色变体区分并分散成靶场路线；完整未驾驶时用同一 LDraw 几何合并出的渲染代理，驾驶或击毁时切回真实砖块。
- 新增简单 enemy 纯逻辑模块作为后续真实社区敌人资产接入基础；本轮运行时不生成手捏 enemy 视觉。
- 为社区车辆增加无人驾驶巡逻和 wheel spin。
- 新增碎片 TTL cleanup，暴露 debug 计数。
- 缓存 community 射击 bounds、代理模式和轮子列表，移除稳态模型树遍历；增加真实帧时、renderer 和缓存 debug；renderer DPR 上限为 1.5 并关闭 preserved buffer。
- 用单元测试和 E2E 覆盖 v9 核心用户路径。

不做：

- 不在线下载新社区模型，不把本地手搓几何体冒充社区模型。
- 不做手捏怪物、不做复杂寻路、玩家生命值、敌人攻击、波次 UI 或完整关卡系统。
- 不做真实枪械模拟、弹药、过热、换枪、火箭炮。
- 不承诺本轮完全移除 Rapier 内部刚体；若 remove API 不足，先隐藏视觉并停止同步。
- 不减少默认 27 个目标，不取消巡逻/驾驶/破坏，不在本轮切换到 `InstancedMesh` 或通用动态分辨率。

## Acceptance

1. `npm test -- src/game/weapon.test.ts` exit 0，覆盖：
   - firing 后 projectile 使用多个 barrel lane。
   - projectile direction 存在轻微 spread。
   - debug `projectileVisualKind === "tracer-streak"`。
2. `npm test -- src/game/world.test.ts src/game/app.test.ts` exit 0，覆盖：
   - `playerGatlingBarrelCluster` 存在，barrel count 为 6，muzzle 局部 z 小于 -0.8。
   - 默认 community placement 支持 27+ radar 车实例、颜色变体、不小于 28 的最小间距，并分批加载、合并代理和物理懒注册以保护启动与运行性能。
   - patrol vehicle delta 会改变位置和 heading。
3. `npm test -- src/game/enemies.test.ts src/game/cleanup.test.ts` exit 0，覆盖：
   - enemy 纯逻辑更新后靠近玩家。
   - enemy 纯逻辑受击死亡后 destroyed count 增加。
   - detached debris 超过 TTL 后 removed count 增加。
4. `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "v9 shooter swarm"` exit 0，覆盖：
   - 默认 `communityModels.instanceCount >= 27`。
   - `weapon.projectileVisualKind === "tracer-streak"`、`weapon.tracerVisualCount > 0`。
   - 运行时不生成手捏 enemy 视觉；射击 LDraw 目标后 community status 变 detached。
   - `vehicles.patrolCount >= 2` 且无人驾驶车辆位置变化。
   - 目标击毁后 cleanup removed count 增加。
5. `npm test -- src/game/communityRuntime.test.ts src/game/performance.test.ts src/game/app.test.ts` exit 0，覆盖：
   - 缓存本地 bounds 经 root 平移/旋转后生成正确世界目标，重复读取不遍历模型树。
   - 未变化代理模式只读缓存，轮子动画只访问缓存轮子。
   - renderer DPR 上限为 1.5，帧率来自有界真实 timestamp 样本。
   - debug 在 27 个目标加载后包含 `communitySteadyStateTraversalCount === 0`、`targetCacheEntryCount >= 27`、renderer calls/triangles、DPR 和 preserved-buffer 状态。
   - 用户当前机器全部目标加载后的五秒稳态窗口达到 55 FPS 或更高。
6. 全量 `npm test`、`npm run build`、桌面 E2E、`git diff --check`、乱码/NUL 扫描 exit 0。

## Files

- `docs/prd/PRD-0007-lego-shooter-swarm.md`
- `docs/plan/v9-index.md`
- `docs/plan/v9-shooter-swarm-feel.md`
- `src/game/weapon.ts`
- `src/game/weapon.test.ts`
- `src/game/enemies.ts`
- `src/game/enemies.test.ts`
- `src/game/cleanup.ts`
- `src/game/cleanup.test.ts`
- `src/game/world.ts`
- `src/game/world.test.ts`
- `src/game/app.ts`
- `src/game/app.test.ts`
- `src/game/communityRuntime.ts`
- `src/game/communityRuntime.test.ts`
- `src/game/performance.ts`
- `src/game/performance.test.ts`
- `tests/e2e/game.spec.ts`

## Steps

1. 文档 Gate：提交 PRD-0007、v9-index 和 v9 plan。
2. TDD Red：新增 weapon/world/app/enemy/cleanup 测试，运行到红，确认失败来自缺少 v9 行为。
3. TDD Green：实现 weapon barrel lane、spread 和 tracer debug。
4. TDD Green：重做 player gatling geometry 和挂载位置。
5. TDD Green：默认 27+ LDraw radar 车实例摆放、颜色变体和 spacing。
6. TDD Green：实现 enemy 纯逻辑和 app 集成。
7. TDD Green：实现 vehicle patrol 和 wheel spin。
8. TDD Green：实现 detached debris TTL cleanup。
9. TDD Red：新增 community runtime cache、renderer policy 和真实帧时监控测试，确认失败来自缺少 REQ-0007-007 行为。
10. TDD Green：抽出 `communityRuntime.ts` 和 `performance.ts`，接入 app 编排层并移除稳态模型树扫描。
11. E2E：新增 v9 shooter swarm 与 performance debug 断言并跑到绿。
12. Refactor：收敛 app 内新增逻辑，保留现有驾驶、模型库和破坏测试。
13. Review Loop：检查追溯、DoD、E2E、编码和残余风险。
14. Ship：提交并推送。

## Risks

- **性能风险**：27+ LDraw radar 车实例和高射速可能拖慢浏览器。使用分批生成、同源合并渲染代理、edge line 默认隐藏、community 物理懒注册、projectile/tracer 上限、目标 health 较低、碎片 3 秒 TTL 回收。
- **资产风险**：在线社区模型下载不稳定。本轮只复用现有 manifest 中的真实 LDraw 模型多实例，不伪造来源。
- **物理风险**：Rapier remove API 可能不足。本轮至少隐藏视觉碎片并停止同步，后续版本再做物理 body 真删除。
- **E2E 稳定性风险**：大量异步 LDraw 加载可能导致测试等待变长。E2E 使用 debug 条件等待，不使用固定截图判定。
- **缓存陈旧风险**：车辆持续移动时世界目标可能与视觉脱节。缓存只保存本地中心/半径，每帧用最新 root matrix 变换到世界坐标；实例生命周期结束时删除缓存。
