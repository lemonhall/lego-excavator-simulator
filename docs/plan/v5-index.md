# v5 Index: 可拆卸农场物件

## 愿景

- PRD: [PRD-0004: 可拆卸农场物件](../prd/PRD-0004-destructible-farm-props.md)
- 本轮交付：树木、篱笆、小屋可被挖掘机履带/车身或大臂/铲斗拆卸，并以乐高碎块状态展示。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | 状态层拆卸模型 | `destructibles` 覆盖 barn/tree/fence；撞击和铲斗触碰能改变状态；小屋多次命中后 detached | `npm test -- src/game/state.test.ts` exit 0 | todo |
| M2 | 世界层乐高拆卸视觉 | 树、篱笆、小屋以 group 暴露；detached 后存在可见碎块；debug 暴露 detachedCount 和 shardCount | `npm test -- src/game/world.test.ts` exit 0 | todo |
| M3 | 用户流程 E2E | 驾驶挖掘机撞击目标后 debug detachedCount > 0，HUD 显示拆卸计数 | `npm run e2e -- tests/e2e/game.spec.ts` exit 0 | todo |

## 计划索引

- [v5-destructible-farm-props.md](./v5-destructible-farm-props.md)

## 追溯矩阵

| Req ID | PRD | v5 Plan | 单元/集成测试 | E2E 测试 | 证据 | 状态 |
|---|---|---|---|---|---|---|
| REQ-0004-001 | PRD-0004 | v5-destructible-farm-props | `src/game/state.test.ts` | `tests/e2e/game.spec.ts` | 待执行 | todo |
| REQ-0004-002 | PRD-0004 | v5-destructible-farm-props | `src/game/state.test.ts` | `tests/e2e/game.spec.ts` | 待执行 | todo |
| REQ-0004-003 | PRD-0004 | v5-destructible-farm-props | `src/game/state.test.ts` | `tests/e2e/game.spec.ts` | 待执行 | todo |
| REQ-0004-004 | PRD-0004 | v5-destructible-farm-props | `src/game/world.test.ts` | `tests/e2e/game.spec.ts` | 待执行 | todo |

## ECN 索引

- 本轮暂无 ECN。

## DoD 硬度自检

- 每条 DoD 都绑定自动化命令和 exit code。
- 反作弊条款：不能只隐藏物件或只改 HUD；E2E 必须证明 `detachedCount > 0` 且 `shardCount > 0`。
- 范围边界：v5 不做真实物理引擎、不做庄稼/路径/零散圆点积木拆卸、不做每块砖的持久刚体模拟。

## Doc QA Gate

- PRD-0004 的 4 条 Req 均有范围、非目标、验收口径。
- v5 计划均追溯到 REQ-0004-001 到 REQ-0004-004。
- 术语统一使用 `destructible`、`damaged`、`detached`、`shard`。

## Tashan Review - v5 / M1-M3

- reviewer_context: pending
- round: pending
- cost_profile: standard
- verdict: pending
- blocker_count: pending
- major_count: pending
- stuck_signatures: pending
- regression_signatures: pending
- commands_checked: pending
- residual_risks: pending

## 差异列表

- 待本轮结束后填写。

## Tashan Trigger Audit

- expected_review_triggers: 文档完成、M1-M3 完成、v5 完成
- actual_review_runs: 0
- skipped_triggers: 0
- skip_reasons: none
- mitigation: 使用本文件 Review 段记录人工触发结果。

