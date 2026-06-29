# v5 Plan: Destructible Farm Props

## Goal

让玩家驾驶挖掘机时可以拆卸树木、篱笆和小屋，并以乐高碎块反馈破坏结果。

## PRD Trace

- REQ-0004-001
- REQ-0004-002
- REQ-0004-003
- REQ-0004-004

## Scope

做：

- 在状态层新增 `destructibles`，包含 barn/tree/fence 三类目标。
- 驾驶模式下检测挖掘机底盘中心与铲斗触点对目标的命中。
- 目标支持 `intact`、`damaged`、`detached` 三种状态。
- 世界层创建稳定命名的 destructible groups 和碎块，并根据状态同步视觉。
- HUD/debug 暴露拆卸计数，E2E 验证用户流程。

不做：

- 不引入 cannon/rapier 等物理引擎。
- 不做真实砖块级持久物理模拟。
- 不让步行玩家拆卸农场物件。
- 不拆庄稼、路径、零散圆点积木。

## Acceptance

1. `npm test -- src/game/state.test.ts` exit 0，并覆盖：
   - 初始状态包含 barn/tree/fence。
   - 驾驶挖掘机撞篱笆后目标状态改变。
   - 铲斗触点碰树后目标状态改变。
   - 小屋多次命中后进入 `detached`。
2. `npm test -- src/game/world.test.ts` exit 0，并覆盖：
   - 世界里有稳定命名的 `destructibleBarn`、`destructibleTree0`、`destructibleFence0`。
   - 场景中存在 `destructibleShard` 标记。
3. `npm run e2e -- tests/e2e/game.spec.ts` exit 0，并覆盖：
   - 上车、驾驶撞击可拆卸目标。
   - `window.__legoGameDebug.destructibles.detachedCount > 0`。
   - `window.__legoGameDebug.destructibles.shardCount > 0`。
4. `npm test` 和 `npm run build` exit 0。

## Files

- `docs/prd/PRD-0004-destructible-farm-props.md`
- `docs/plan/v5-index.md`
- `docs/plan/v5-destructible-farm-props.md`
- `src/game/state.ts`
- `src/game/state.test.ts`
- `src/game/world.ts`
- `src/game/world.test.ts`
- `src/game/app.ts`
- `tests/e2e/game.spec.ts`

## Steps

1. TDD Red：在 `state.test.ts` 和 `world.test.ts` 添加失败测试。
2. TDD Red：运行 `npm test -- src/game/state.test.ts src/game/world.test.ts`，预期因缺少 `destructibles` 和 destructible groups 失败。
3. TDD Green：实现状态层 destructible 模型、命中检测、耐久和状态转换。
4. TDD Green：实现世界层 destructible groups、碎块、同步函数和 debug。
5. TDD Green：运行 `npm test -- src/game/state.test.ts src/game/world.test.ts`，预期通过。
6. E2E：扩展 Playwright 驾驶流程，验证拆卸 debug 与 HUD。
7. Refactor：清理命名、debug 结构和重复逻辑，保持相关测试通过。
8. Review Loop：检查 PRD/计划/测试/代码追溯链和验证证据。
9. Ship：提交并推送 v5 文档和实现。

## Risks

- **铲斗触点近似不精确**：v5 明确只做玩具式触点估算；通过单元测试固定触发口径。
- **视觉反馈不明显**：使用碎块位移、旋转、倾倒和 HUD 计数共同反馈。
- **状态与世界不同步**：状态层保留纯数据，世界层只消费状态；E2E 检查 debug 防止断链。

