# v9 Index: Shooter Swarm Feel

## 愿景

- PRD: [PRD-0007: LEGO Shooter Swarm](../prd/PRD-0007-lego-shooter-swarm.md)
- 本轮交付：修正 v8 “看不到枪、子弹像水珠、场景太空、目标无 AI、车辆不动、碎片无限堆”的问题，把玩法推进到可见加特林弹幕、丰富目标场、简单追击怪、巡逻车辆和碎片 TTL 回收。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | 文档与追溯 | PRD-0007、v9-index、v9 plan 存在；每条需求有硬验收和测试映射 | 文档自检 + `rg "REQ-0007" docs/prd docs/plan` | doing |
| M2 | 加特林和弹幕 | 武器在过肩视角可见；projectile 视觉改为 tracer streak；debug 暴露 barrel/tracer 数据 | `npm test -- src/game/weapon.test.ts src/game/world.test.ts src/game/app.test.ts`; E2E weapon assertions | todo |
| M3 | 稳定目标场 | 默认 LDraw `radar-truck` 实例分批生成且不少于 27；用颜色变体区分；距离拉开；不伪造社区资产；避免重型实例导致卡顿 | `npm test -- src/game/app.test.ts src/game/communityModels.test.ts`; E2E default population | todo |
| M4 | AI 预留与车辆巡逻 | enemy 纯逻辑保留给真实社区资产；运行时不生成手捏敌人；默认 radar 车无人驾驶时巡逻且轮子旋转 | `npm test -- src/game/enemies.test.ts src/game/app.test.ts`; E2E vehicle assertions | todo |
| M5 | 碎片回收与性能 | detached 碎片 3 秒后回收；debug 计数可观测；projectile/tracer 上限生效 | `npm test -- src/game/cleanup.test.ts src/game/weapon.test.ts`; E2E cleanup assertions | todo |
| M6 | 全量验证与 Review | 单测、构建、桌面 E2E、乱码扫描、Review Loop、提交推送 | `npm test`; `npm run build`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome`; `git diff --check` | todo |

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

## ECN 索引

- none at start

## DoD 硬度自检

- 每条 DoD 都绑定自动化命令、debug 字段或 E2E 断言。
- 反作弊条款：不能只提高子弹亮度或改名字；必须移除 sphere bead 视觉、默认目标数提升到 27+、不生成手捏 enemy 视觉、有车辆巡逻、有碎片 TTL 回收计数。
- 资产反作弊条款：不能把手搓小人/蜘蛛冒充社区模型；默认新增实例必须来自已记录 sourceUrl/license/attribution 的 LDraw manifest。
- 范围边界：v9 不做联网下载、不做玩家生命值、不做复杂寻路、不做武器系统全套成长、不彻底重构 Rapier 内部资源生命周期。

## Doc QA Gate

- PRD-0007 每条需求都有 Req ID、范围、非目标和验收口径。
- v9 计划追溯到 REQ-0007-001 至 REQ-0007-006。
- v9 验收覆盖可见枪、tracer 弹幕、默认目标密度、enemy AI、车辆巡逻和碎片 TTL。

## Review

- pending

## 差异列表

- pending

## Tashan Trigger Audit

- expected_review_triggers: 文档完成、M2-M6 完成、v9 完成
- actual_review_runs: 0
- skipped_triggers: 0
- skip_reasons: none
- mitigation: 每个里程碑完成前更新本文件状态、证据和 Review 记录。
