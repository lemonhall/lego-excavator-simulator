# v6 Index: Rapier 物理装配体拆毁

## 愿景

- PRD: [PRD-0004: 可拆卸农场物件](../prd/PRD-0004-destructible-farm-props.md)
- ECN: [ECN-0006: Rapier 物理拆毁升级](../ecn/ECN-0006-rapier-physics-destruction.md)
- 本轮交付：用 Rapier 把树、篱笆、小屋改为可断裂物理装配体。挖掘机真实推挤装配体，连接超过阈值后逐步断开，零件散落一地。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | Rapier 物理装配体模块 | `src/game/physics.ts` 能初始化 Rapier world、地面 collider、assembly part bodies、breakable links 和 kinematic excavator colliders；debug 包含 engine/body/link/collider 计数 | `npm test -- src/game/physics.test.ts` exit 0，4 passed | done |
| M2 | Three.js 世界集成 | 树/篱笆/小屋由可同步的物理零件组成；碰撞前不是隐藏整体等待替换；连接断开后零件 transform 由 Rapier body 驱动 | `npm test -- src/game/world.test.ts src/game/physics.test.ts` exit 0，24 passed | done |
| M3 | 用户流程 E2E | 驾驶挖机真实撞击目标后，debug 显示 Rapier 运行、activeLinkCount 下降、brokenLinkCount > 0、零件连续采样位置变化 | `npm run e2e -- tests/e2e/game.spec.ts` exit 0，8 passed | done |

## 计划索引

- [v6-rapier-physics-destruction.md](./v6-rapier-physics-destruction.md)

## 追溯矩阵

| Req ID | PRD | v6 Plan | 单元/集成测试 | E2E 测试 | 证据 | 状态 |
|---|---|---|---|---|---|---|
| REQ-0004-004 | PRD-0004 + ECN-0006 | v6-rapier-physics-destruction | `src/game/world.test.ts`、`src/game/physics.test.ts` | `tests/e2e/game.spec.ts` | world + physics tests passed; E2E 8 passed | done |
| REQ-0004-005 | PRD-0004 + ECN-0006 | v6-rapier-physics-destruction | `src/game/physics.test.ts` | `tests/e2e/game.spec.ts` | assembly/link/broken-link tests passed; moving part E2E passed | done |

## ECN 索引

- ECN-0006：v5 预摆碎块效果不可信，升级为 Rapier 物理碎块。

## DoD 硬度自检

- 每条 DoD 都绑定自动化命令和 exit code。
- 反作弊条款：不能只安装依赖、只改 debug、或碰撞后隐藏整体并生成爆炸碎片；E2E 必须证明 `engine === "rapier"`、`assemblyBodyCount > 0`、`activeLinkCount` 下降、`brokenLinkCount > 0`、`kinematicColliderCount >= 2` 且零件位置连续采样发生变化。
- 范围边界：v6 不重写挖掘机驾驶，不实现真实履带车辆动力学，不做复杂材料断裂；但必须做可断裂装配连接。

## Doc QA Gate

- ECN-0006 已说明 v5 设计偏差和新设计。
- PRD-0004 已新增 REQ-0004-005，并更新 REQ-0004-004 的非目标。
- v6 计划追溯到 REQ-0004-004 和 REQ-0004-005。

## Tashan Review - v6 / M1-M3

- reviewer_context: same-model
- round: 2
- cost_profile: standard
- verdict: pass
- blocker_count: 0
- major_count: 0
- stuck_signatures: none
- regression_signatures: design::v6::triggered-explosion-not-physical-assembly fixed after user feedback
- commands_checked: `npm test -- src/game/physics.test.ts`; `npm test -- src/game/world.test.ts src/game/physics.test.ts`; `npm run e2e -- tests/e2e/game.spec.ts`; `npm test`; `npm run build`
- residual_risks: Rapier compat package prints a deprecated-parameters warning during Vitest init; build and E2E pass. Rapier chunk size is large and recorded as an expected v6 cost. Current breakable-link model is threshold based, not full material fracture.

### Findings

| severity | signature | evidence | disposition |
|---|---|---|---|
| BLOCKER | design::v6::triggered-explosion-not-physical-assembly | 用户指出早期未提交实现是“碰到后炸开、原物体消失”，不符合“建筑和挖机真实物理碰撞、结构破碎成零件并散落” | fixed: v6 改为 assembly parts + breakable links；E2E 验证 brokenLinkCount 和 movingPartSample |
| NOTE | dependency::rapier-compat::deprecated-init-warning | `npm test` prints `using deprecated parameters for the initialization function` | accepted as upstream compat warning; no runtime failure |
| NOTE | bundle::rapier::large-chunk | `npm run build` emits large chunk warning for Rapier asset | accepted for v6; future optimization can lazy-load or manual-chunk |

## 差异列表

- 无阻塞差异。已知边界：当前连接断裂是 threshold model，不是复杂材料断裂；Rapier chunk 较大。

## Tashan Trigger Audit

- expected_review_triggers: 文档完成、M1-M3 完成、v6 完成
- actual_review_runs: 1
- skipped_triggers: 0
- skip_reasons: none
- mitigation: 本文件 Review 段记录检查命令、发现和残余风险。
