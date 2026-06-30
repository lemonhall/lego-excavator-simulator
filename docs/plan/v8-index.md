# v8 Index: LEGO Shooter Core

## 愿景

- PRD: [PRD-0006: LEGO Shooter Game](../prd/PRD-0006-lego-shooter-game.md)
- 本轮交付：把现有 LEGO 农场/社区模型破坏能力转成“加特林割草射击”核心循环。玩家默认手持加特林，左键连续射击，默认场景中已有 3 个 LDraw 目标，命中扣血，归零炸裂，场景扩大到盒型射击场。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | 文档与追溯 | PRD-0006、v8-index、v8-shooter-core 计划存在；每条需求有硬验收和测试映射 | 文档自检 + `rg "REQ-0006" docs/plan docs/prd` | done |
| M2 | 默认大盒型目标场 | 启动默认生成 3 个社区模型；world bounds 跨度不小于 300；模型距离不小于 30 | `npm test -- src/game/app.test.ts src/game/state.test.ts`; E2E 默认实例断言 | done |
| M3 | 加特林与射击弹丸 | 玩家有 `playerGatlingGun`/`playerWeaponMuzzle`；左键按住持续生成 projectile；TTL 清理 | `npm test -- src/game/weapon.test.ts src/game/world.test.ts`; E2E weapon debug | done |
| M4 | 射击扣血与炸裂 | projectile 命中目标扣血；health 归零后目标 detached，Rapier brokenLinkCount 增加 | `npm test -- src/game/weapon.test.ts src/game/app.test.ts`; E2E shooting destruction | done |
| M5 | 全量验证与 Review | 单测、构建、桌面 E2E、乱码扫描、Review Loop、提交推送 | `npm test`; `npm run build`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome`; `git diff --check` | done |

## 计划索引

- [v8-lego-shooter-core.md](./v8-lego-shooter-core.md)

## 追溯矩阵

| Req ID | PRD | v8 Plan | 单元/集成测试 | E2E 测试 | 证据 | 状态 |
|---|---|---|---|---|---|---|
| REQ-0006-001 | PRD-0006 | v8-lego-shooter-core | `src/game/app.test.ts`, `src/game/state.test.ts` | `tests/e2e/game.spec.ts` | `npm test`; desktop E2E passed | done |
| REQ-0006-002 | PRD-0006 | v8-lego-shooter-core | `src/game/world.test.ts` | `tests/e2e/game.spec.ts` | `npm test`; debug weapon source asserted | done |
| REQ-0006-003 | PRD-0006 | v8-lego-shooter-core | `src/game/weapon.test.ts` | `tests/e2e/game.spec.ts` | weapon tests and desktop E2E passed | done |
| REQ-0006-004 | PRD-0006 | v8-lego-shooter-core | `src/game/weapon.test.ts`, `src/game/app.test.ts` | `tests/e2e/game.spec.ts` | shooting destruction E2E passed | done |
| REQ-0006-005 | PRD-0006 | v8-lego-shooter-core | `src/game/weapon.test.ts` | `tests/e2e/game.spec.ts` | weapon debug and HUD assertions passed | done |

## ECN 索引

- none at start

## DoD 硬度自检

- 每条 DoD 都绑定自动化命令、debug 字段或 E2E 断言。
- 反作弊条款：不能只添加静态枪模型；必须有左键输入、projectile 生成、TTL 清理、命中扣血、health 归零触发现有 detached 物理炸裂；默认 3 个 LDraw 目标必须无需手动点击 panel 即可出现。
- 范围边界：v8 不做敌人 AI、波次、玩家受伤、多武器、在线模型搜索、完整关卡系统或得分 UI。

## Doc QA Gate

- PRD-0006 每条需求都有 Req ID、范围、非目标和验收口径。
- v8 计划追溯到 REQ-0006-001 至 REQ-0006-005。
- v8 验收口径覆盖默认目标、地图扩大、武器可见、射击、弹丸生命周期、命中扣血、炸裂和 debug 可观测性。

## Tashan Review - v8 / M1-M5

- reviewer_context: same-model
- round: 1
- cost_profile: standard
- verdict: pass
- blocker_count: 0
- major_count: 0
- stuck_signatures: none
- regression_signatures: none
- commands_checked: `npm test`; `npm run build`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome`; `git diff --check`; mojibake scan; NUL scan
- residual_risks: v8 uses local brick-built gatling geometry inspired by traceable community minigun sources, not a downloaded third-party LDraw minigun file; enemy AI and weapon variety remain out of scope.

### Findings

| severity | signature | evidence | disposition |
|---|---|---|---|
| NOTE | scope::v8::no-enemy-ai | PRD-0006 explicitly scopes v8 to core shooting/destruction loop. | Enemy waves and enemy models are planned for later versions. |
| NOTE | asset::v8::gatling-fallback | Direct third-party minigun file download was not used. | Debug and PRD identify the gatling as BrickLink/Rebrickable-inspired local brick-built fallback. |

## 差异列表

- 已满足：启动后默认加载 3 个社区 LDraw 模型，无需手动打开 panel。
- 已满足：场景 bounds 扩大到 360x360，社区模型间距不小于 30。
- 已满足：玩家挂载 `playerGatlingGun` 和 `playerWeaponMuzzle`，HUD 显示“左键 射击”。
- 已满足：左键按住生成多发 projectile，松开后 projectile TTL 清理到 0。
- 已满足：射击命中默认社区目标后 health 归零，状态变 detached，Rapier brokenLinkCount 增加。
- 残余差异：v8 尚未实现敌人 AI、波次、火箭炮、连击 UI、音效重制和完整关卡推进；这些进入后续版本。

## Tashan Trigger Audit

- expected_review_triggers: 文档完成、M1-M5 完成、v8 完成
- actual_review_runs: 1
- skipped_triggers: 0
- skip_reasons: none
- mitigation: 每个里程碑完成前更新本文件状态、证据和 Review 记录。
