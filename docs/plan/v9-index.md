# v9 Index: Shooter Swarm Feel

## 愿景

- PRD: [PRD-0007: LEGO Shooter Swarm](../prd/PRD-0007-lego-shooter-swarm.md)
- 本轮交付：修正 v8 “看不到枪、子弹像水珠、场景太空、目标无 AI、车辆不动、碎片无限堆”的问题，把玩法推进到可见加特林弹幕、丰富目标场、简单追击怪、巡逻车辆和碎片 TTL 回收。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | 文档与追溯 | PRD-0007、v9-index、v9 plan 存在；每条需求有硬验收和测试映射 | 文档自检 + `rg "REQ-0007" docs/prd docs/plan` | doing |
| M2 | 加特林和弹幕 | 武器在过肩视角可见；projectile 视觉改为 tracer streak；debug 暴露 barrel/tracer 数据 | `npm test -- src/game/weapon.test.ts src/game/world.test.ts src/game/app.test.ts`; E2E weapon assertions | todo |
| M3 | 稳定目标场 | 默认 LDraw `radar-truck` 实例分批生成且不少于 27；用颜色变体区分；完整未驾驶时用同源合并代理；距离拉开；不伪造社区资产；避免重型实例导致卡顿 | `npm test -- src/game/app.test.ts src/game/communityModels.test.ts`; E2E default population | todo |
| M4 | AI 预留与车辆巡逻 | enemy 纯逻辑保留给真实社区资产；运行时不生成手捏敌人；默认 radar 车无人驾驶时巡逻且轮子旋转 | `npm test -- src/game/enemies.test.ts src/game/app.test.ts`; E2E vehicle assertions | todo |
| M5 | 碎片回收与性能 | detached 碎片 3 秒后回收；community 物理懒注册；debug 计数可观测；projectile/tracer 上限生效 | `npm test -- src/game/cleanup.test.ts src/game/weapon.test.ts`; E2E cleanup assertions | todo |
| M6 | 27 目标稳态性能 | 缓存射击 bounds/轮子/代理状态；稳态 community 树遍历为 0；DPR 上限 1.5；关闭 preserved buffer；debug 暴露真实 FPS、renderer 和缓存统计 | `npm test -- src/game/communityRuntime.test.ts src/game/performance.test.ts src/game/app.test.ts`; E2E performance debug assertions；用户机器五秒 55+ FPS | doing |
| M7 | 全量验证与 Review | 单测、构建、桌面 E2E、乱码扫描、Review Loop、提交推送 | `npm test`; `npm run build`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome`; `git diff --check` | todo |

## 计划索引

- [v9-shooter-swarm-feel.md](./v9-shooter-swarm-feel.md)

## 追溯矩阵

| Req ID | PRD | v9 Plan | 单元/集成测试 | E2E 测试 | 证据 | 状态 |
|---|---|---|---|---|---|---|
| REQ-0007-001 | PRD-0007 | v9-shooter-swarm-feel | `src/game/world.test.ts`, `src/game/app.test.ts` | `tests/e2e/game.spec.ts` | pending | doing |
| REQ-0007-002 | PRD-0007 | v9-shooter-swarm-feel | `src/game/weapon.test.ts`, `src/game/app.test.ts` | `tests/e2e/game.spec.ts` | pending | todo |
| REQ-0007-003 | PRD-0007 | v9-shooter-swarm-feel | `src/game/app.test.ts`, `src/game/communityModels.test.ts` | `tests/e2e/game.spec.ts` | pending | todo |
| REQ-0007-004 | PRD-0007 | v9-shooter-swarm-feel | `src/game/enemies.test.ts` | `tests/e2e/game.spec.ts` | pending | todo |
| REQ-0007-005 | PRD-0007 | v9-shooter-swarm-feel | `src/game/app.test.ts` | `tests/e2e/game.spec.ts` | pending | todo |
| REQ-0007-006 | PRD-0007 | v9-shooter-swarm-feel | `src/game/cleanup.test.ts` | `tests/e2e/game.spec.ts` | pending | todo |
| REQ-0007-007 | PRD-0007 + ECN-0008 | v9-shooter-swarm-feel | `src/game/communityRuntime.test.ts`, `src/game/performance.test.ts`, `src/game/app.test.ts` | `tests/e2e/game.spec.ts` | pending | doing |

## ECN 索引

- [ECN-0008: Swarm Performance Budget](../ecn/ECN-0008-swarm-performance-budget.md)

## DoD 硬度自检

- 每条 DoD 都绑定自动化命令、debug 字段或 E2E 断言。
- 反作弊条款：不能只提高子弹亮度或改名字；必须移除 sphere bead 视觉、默认目标数提升到 27+、不生成手捏 enemy 视觉、有车辆巡逻、有碎片 TTL 回收计数。
- 资产反作弊条款：不能把手搓小人/蜘蛛冒充社区模型；默认新增实例必须来自已记录 sourceUrl/license/attribution 的 LDraw manifest。
- 性能反作弊条款：不能靠减少 27 个目标、停掉巡逻/破坏或伪造 FPS debug 达标；真实 rAF 时间窗、renderer 统计、缓存数量和稳态遍历计数必须同时可观测。
- 范围边界：v9 不做联网下载、不做玩家生命值、不做复杂寻路、不做武器系统全套成长、不彻底重构 Rapier 内部资源生命周期。

## Doc QA Gate

- PRD-0007 每条需求都有 Req ID、范围、非目标和验收口径。
- v9 计划追溯到 REQ-0007-001 至 REQ-0007-007，并记录 ECN-0008。
- v9 验收覆盖可见枪、tracer 弹幕、默认目标密度、enemy AI、车辆巡逻和碎片 TTL。

## Review

### Tashan Review - v9 / M6

- reviewer_context: same-model fresh-context（本轮未授权 sub-agent）
- round: 1
- cost_profile: standard
- verdict: pass（自动化 Gate）；M6 等待用户机器 55+ FPS 验收
- blocker_count: 0
- major_count: 0
- stuck_signatures: none
- regression_signatures: none
- commands_checked: `npm test`（110 passed）；`npm run build`；desktop E2E（14 passed）；`git diff --check`；乱码/NUL 扫描
- residual_risks: 浏览器控制策略阻止 agent 直接读取本地页面性能值；必须由用户读取五秒窗口 FPS 后才能关闭 M6。

### Findings

| severity | signature | evidence | disposition |
|---|---|---|---|
| BLOCKER | e2e::canvas::preserved-buffer-dependency | 关闭 preserved buffer 后旧 `drawImage(gameCanvas)` 返回空像素 | fixed：改为 Playwright 合成器 canvas screenshot 后做 2D 像素检查 |
| MAJOR | performance::debug::full-scene-traversal | `getDestructibleDebug` 从 `world.scene` 扫描，连带遍历 27 个 LDraw root | fixed：只扫描 `world.destructibleRoots`，并为 community root 安装稳态 traversal 探针 |
| NOTE | tooling::doc-hygiene::req-id-format | 塔山脚本只识别 `REQ-###`，误报仓库统一的 `REQ-0007-007` | 人工 `rg` 追溯检查通过；不改变仓库 Req ID 协议 |

## 差异列表

- 未满足：用户当前机器全部 27 个目标加载后，尚需读取五秒窗口并确认 `performance.fps >= 55`。
- 已满足：自动化证明 cache entry >= 27、community 稳态 traversal 为 0、DPR 上限 1.5、preserved buffer 关闭、renderer calls/triangles 可观测。

## Tashan Trigger Audit

- expected_review_triggers: 文档完成、M2-M6 完成、v9 完成
- actual_review_runs: 1
- skipped_triggers: 0
- skip_reasons: none
- mitigation: 每个里程碑完成前更新本文件状态、证据和 Review 记录。
