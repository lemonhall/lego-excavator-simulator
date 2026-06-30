# v7 Index: 社区模型浏览器

## 愿景

- PRD: [PRD-0005: 社区模型浏览器](../prd/PRD-0005-community-model-browser.md)
- 本轮交付：用本地精选模型包协议提供可审计模型列表；按 `B` 打开右侧浏览器；点击模型放入主场景；挖掘机可撞碎加载进来的模型。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | 模型包协议 | `public/community-models/manifest.json` 至少 3 个模型，字段完整，零件可转换为 procedural LEGO | `npm test -- src/game/communityModels.test.ts` exit 0 | todo |
| M2 | 浏览器 UI | `B` 打开/关闭右侧 panel，显示模型卡片、来源和许可证 | `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "community model browser"` exit 0 | todo |
| M3 | 点击加载场景 | 点击模型后生成可见 LEGO assembly，debug 暴露 instanceCount 和 visiblePartCount | `npm test -- src/game/communityModels.test.ts src/game/world.test.ts` exit 0；E2E 点击加载通过 | todo |
| M4 | 物理破坏集成 | 加载模型完整状态不抖动，撞击后变 detached，Rapier brokenLinkCount 增加，零件连续采样移动 | `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "spawned community model"` exit 0 | todo |
| M5 | 全量验证与 Review | 单测、构建、桌面 E2E、乱码扫描、Review Loop、提交推送 | `npm test`; `npm run build`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome`; `git diff --check` | todo |

## 计划索引

- [v7-community-model-browser.md](./v7-community-model-browser.md)

## 追溯矩阵

| Req ID | PRD | v7 Plan | 单元/集成测试 | E2E 测试 | 证据 | 状态 |
|---|---|---|---|---|---|---|
| REQ-0005-001 | PRD-0005 | v7-community-model-browser | `src/game/communityModels.test.ts` | - | pending | todo |
| REQ-0005-002 | PRD-0005 | v7-community-model-browser | - | `tests/e2e/game.spec.ts` | pending | todo |
| REQ-0005-003 | PRD-0005 | v7-community-model-browser | `src/game/communityModels.test.ts`, `src/game/world.test.ts` | `tests/e2e/game.spec.ts` | pending | todo |
| REQ-0005-004 | PRD-0005 | v7-community-model-browser | `src/game/communityModels.test.ts`, `src/game/physics.test.ts` | `tests/e2e/game.spec.ts` | pending | todo |
| REQ-0005-005 | PRD-0005 | v7-community-model-browser | `src/game/communityModels.test.ts` | `tests/e2e/game.spec.ts` | pending | todo |

## ECN 索引

- 无。

## DoD 硬度自检

- 每条 DoD 都绑定自动化命令和 exit code。
- 反作弊条款：不能只显示静态 panel；E2E 必须证明点击模型后场景实例数量增加，且挖掘机撞击后该实例 `status === "detached"`、Rapier `brokenLinkCount > 0`、零件位置连续采样变化。
- 范围边界：v7 不做实时联网下载、不接账号、不处理付费 MOC、不做拖拽摆放；只做本地精选模型包浏览、加载和可破坏玩法。

## Doc QA Gate

- PRD-0005 每条需求都有 Req ID、范围、非目标和验收口径。
- v7 计划追溯到 REQ-0005-001 至 REQ-0005-005。
- v7 验收口径覆盖协议、UI、加载、物理和授权透明。

## Tashan Review - v7 / pending

- reviewer_context: same-model
- round: 0
- cost_profile: standard
- verdict: pending
- blocker_count: pending
- major_count: pending
- stuck_signatures: none
- regression_signatures: none
- commands_checked: pending
- residual_risks: pending

## 差异列表

- 待 v7 执行后记录。

## Tashan Trigger Audit

- expected_review_triggers: 文档完成、M1-M5 完成、v7 完成
- actual_review_runs: 0
- skipped_triggers: 0
- skip_reasons: none
- mitigation: 本文件 Review 段将在收尾时记录检查命令、发现和残余风险。
