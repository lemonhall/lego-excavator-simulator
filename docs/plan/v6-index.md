# v6 Index: Rapier 物理拆毁

## 愿景

- PRD: [PRD-0004: 可拆卸农场物件](../prd/PRD-0004-destructible-farm-props.md)
- ECN: [ECN-0006: Rapier 物理拆毁升级](../ecn/ECN-0006-rapier-physics-destruction.md)
- 本轮交付：用 Rapier 替换 v5 的固定偏移碎块，让拆卸后的乐高碎块有真实重力、碰撞、冲量和落地。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | Rapier 依赖和物理模块 | `src/game/physics.ts` 能初始化 Rapier world、地面 collider、dynamic shard body 和 kinematic collider；debug 包含 engine/body/collider 计数 | `npm test -- src/game/physics.test.ts` exit 0 | todo |
| M2 | Three.js 世界集成 | detached 碎块由 Rapier body 驱动 transform；旧 hash 偏移不再负责 detached 动画；world 仍保留 LEGO shard 标记 | `npm test -- src/game/world.test.ts src/game/physics.test.ts` exit 0 | todo |
| M3 | 用户流程 E2E | 驾驶挖机撞击目标后，debug 显示 Rapier 运行，dynamicBodyCount > 0，kinematicColliderCount >= 2，碎块连续采样位置发生变化 | `npm run e2e -- tests/e2e/game.spec.ts` exit 0 | todo |

## 计划索引

- [v6-rapier-physics-destruction.md](./v6-rapier-physics-destruction.md)

## 追溯矩阵

| Req ID | PRD | v6 Plan | 单元/集成测试 | E2E 测试 | 证据 | 状态 |
|---|---|---|---|---|---|---|
| REQ-0004-004 | PRD-0004 + ECN-0006 | v6-rapier-physics-destruction | `src/game/world.test.ts`、`src/game/physics.test.ts` | `tests/e2e/game.spec.ts` | 待执行 | todo |
| REQ-0004-005 | PRD-0004 + ECN-0006 | v6-rapier-physics-destruction | `src/game/physics.test.ts` | `tests/e2e/game.spec.ts` | 待执行 | todo |

## ECN 索引

- ECN-0006：v5 预摆碎块效果不可信，升级为 Rapier 物理碎块。

## DoD 硬度自检

- 每条 DoD 都绑定自动化命令和 exit code。
- 反作弊条款：不能只安装依赖或只改 debug；E2E 必须证明 `engine === "rapier"`、`dynamicBodyCount > 0`、`kinematicColliderCount >= 2` 且碎块位置连续采样发生变化。
- 范围边界：v6 不重写挖掘机驾驶，不实现真实履带车辆动力学，不做每块未拆卸砖的连接约束。

## Doc QA Gate

- ECN-0006 已说明 v5 设计偏差和新设计。
- PRD-0004 已新增 REQ-0004-005，并更新 REQ-0004-004 的非目标。
- v6 计划追溯到 REQ-0004-004 和 REQ-0004-005。

## Tashan Review - v6 / M1-M3

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

- expected_review_triggers: 文档完成、M1-M3 完成、v6 完成
- actual_review_runs: 0
- skipped_triggers: 0
- skip_reasons: none
- mitigation: 使用本文件 Review 段记录人工触发结果。

