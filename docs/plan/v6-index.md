# v6 Index: Rapier 物理装配体拆毁

## 愿景

- PRD: [PRD-0004: 可拆卸农场物件](../prd/PRD-0004-destructible-farm-props.md)
- ECN: [ECN-0006: Rapier 物理拆毁升级](../ecn/ECN-0006-rapier-physics-destruction.md)
- 本轮交付：用 Rapier 把树、篱笆、小屋改为可断裂物理装配体。挖掘机真实推挤装配体，连接超过阈值后逐步断开，零件散落一地。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | Rapier 物理装配体模块 | `src/game/physics.ts` 能初始化 Rapier world、地面 collider、assembly part bodies、breakable links 和 kinematic excavator colliders；debug 包含 engine/body/link/collider 计数；未断开的连接件 idle step 后不漂移 | `npm test -- src/game/physics.test.ts` exit 0，5 passed | done |
| M2 | Three.js 世界集成 | 树/篱笆/小屋由可同步的物理零件组成；完整状态保持 authored transform，不由 Rapier 写回；连接断开后零件 transform 由 Rapier body 驱动 | `npm test -- src/game/world.test.ts src/game/physics.test.ts` exit 0，27 passed | done |
| M3 | 用户流程 E2E | 驾驶挖机真实撞击目标后，debug 显示 Rapier 运行、activeLinkCount 下降、brokenLinkCount > 0、树和屋子可见装配件会破坏；未撞击时树/屋子不抖动漂移 | `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome` exit 0，7 passed | done |

## 计划索引

- [v6-rapier-physics-destruction.md](./v6-rapier-physics-destruction.md)

## 追溯矩阵

| Req ID | PRD | v6 Plan | 单元/集成测试 | E2E 测试 | 证据 | 状态 |
|---|---|---|---|---|---|---|
| REQ-0004-004 | PRD-0004 + ECN-0006 | v6-rapier-physics-destruction | `src/game/world.test.ts`、`src/game/physics.test.ts` | `tests/e2e/game.spec.ts` | world + physics tests passed; desktop E2E 7 passed | done |
| REQ-0004-005 | PRD-0004 + ECN-0006 | v6-rapier-physics-destruction | `src/game/physics.test.ts` | `tests/e2e/game.spec.ts` | idle stability, visible tree break, visible barn break, moving part E2E passed | done |

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
- round: 3
- cost_profile: standard
- verdict: pass
- blocker_count: 0
- major_count: 0
- stuck_signatures: none
- regression_signatures: design::v6::triggered-explosion-not-physical-assembly fixed after user feedback
- commands_checked: `npm test -- src/game/physics.test.ts src/game/world.test.ts src/game/state.test.ts src/game/camera.test.ts`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "keeps intact tree"`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "breaks the visible tree"`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "breaks the visible barn"`; `npm test`; `npm run build`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome`; `git diff --check`
- residual_risks: Rapier compat package prints a deprecated-parameters warning during Vitest init; build and E2E pass. Rapier chunk size is large and recorded as an expected v6 cost. Current breakable-link model is threshold based, not full material fracture.

### Findings

| severity | signature | evidence | disposition |
|---|---|---|---|
| BLOCKER | design::v6::triggered-explosion-not-physical-assembly | 用户指出早期未提交实现是“碰到后炸开、原物体消失”，不符合“建筑和挖机真实物理碰撞、结构破碎成零件并散落” | fixed: v6 改为 assembly parts + breakable links；E2E 验证 brokenLinkCount 和 movingPartSample |
| BLOCKER | behavior::v6::barn-tree-not-breaking | 用户实测“屋子和树木没有被破坏”；旧 E2E 只验证某些碎块变化，未锁定 tree0/barn 可见主体 | fixed: 新增 tree0 和 barn 目标 E2E，均验证对应 status 和 visible physics parts |
| BLOCKER | physics::v6::intact-parts-jitter-and-offset | 用户截图显示未撞击时小屋/树木抽搐并初始化错位；根因是完整状态下可见部件被动态 body 写回，且 collider center 与 Three 组原点不对齐 | fixed: intact 状态保持 authored transform；受损时才同步物理；colliderOffset 对齐几何中心；新增 idle stability E2E |
| MAJOR | controls::v6::driving-wasd-camera-confusion | 用户反馈 E 状态驾驶时 WASD 改朝向/镜头导致失控感 | fixed: WASD 仅做平面移动/底盘朝向；驾驶 heading 和 camera 只跟随 upperRotation/J-L |
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
