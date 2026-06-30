# v7 Index: 社区模型浏览器

## 愿景

- PRD: [PRD-0005: 社区模型浏览器](../prd/PRD-0005-community-model-browser.md)
- 本轮交付：用本地精选 LDraw/OMR 砖块级模型包协议提供可审计模型列表；按 `B` 打开右侧浏览器；点击模型放入主场景；挖掘机可撞碎加载进来的模型。

## 里程碑

| Milestone | 范围 | DoD | 验证 | 状态 |
|---|---|---|---|---|
| M1 | 模型包协议 | `public/community-models/manifest.json` 至少 3 个真实 LDraw 模型，字段完整，本地 `.ldr/.mpd` 包含类型 1 零件引用和 `.dat` 数据；procedural sample 被测试拒绝 | `npm test -- src/game/communityModels.test.ts` exit 0 | done |
| M2 | 浏览器 UI | `B` 打开/关闭右侧 panel，显示模型卡片、来源和许可证 | `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "LDraw community model browser"` exit 0 | done |
| M3 | 点击加载场景 | 点击模型后通过 `LDrawLoader` 生成可见 LEGO assembly，debug 暴露 instanceCount、visiblePartCount、sourceKind 和 modelFormat | `npm test -- src/game/communityModels.test.ts src/game/world.test.ts` exit 0；E2E 点击加载通过 | done |
| M4 | 物理破坏集成 | 加载模型完整状态不抖动，撞击后变 detached，Rapier brokenLinkCount 增加，零件连续采样移动 | `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "spawns and breaks"` exit 0 | done |
| M5 | 全量验证与 Review | 单测、构建、桌面 E2E、乱码扫描、Review Loop、提交推送 | `npm test`; `npm run build`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome`; `git diff --check` | done |

## 计划索引

- [v7-community-model-browser.md](./v7-community-model-browser.md)

## 追溯矩阵

| Req ID | PRD | v7 Plan | 单元/集成测试 | E2E 测试 | 证据 | 状态 |
|---|---|---|---|---|---|---|
| REQ-0005-001 | PRD-0005 | v7-community-model-browser | `src/game/communityModels.test.ts` | - | `npm test -- src/game/communityModels.test.ts` passed | done |
| REQ-0005-002 | PRD-0005 | v7-community-model-browser | - | `tests/e2e/game.spec.ts` | `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "LDraw community model browser"` passed | done |
| REQ-0005-003 | PRD-0005 | v7-community-model-browser | `src/game/communityModels.test.ts`, `src/game/world.test.ts` | `tests/e2e/game.spec.ts` | `npm test` and desktop E2E passed | done |
| REQ-0005-004 | PRD-0005 | v7-community-model-browser | `src/game/communityModels.test.ts`, `src/game/physics.test.ts` | `tests/e2e/game.spec.ts` | `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "spawns and breaks"` passed | done |
| REQ-0005-005 | PRD-0005 | v7-community-model-browser | `src/game/communityModels.test.ts` | `tests/e2e/game.spec.ts` | panel license/sourceKind assertions passed | done |

## ECN 索引

- ECN-0007: v7 community models must be brick-level LDraw assets

## DoD 硬度自检

- 每条 DoD 都绑定自动化命令和 exit code。
- 反作弊条款：不能只显示静态 panel；不能用项目自编 procedural sample 或普通 mesh 冒充社区模型；单元测试必须验证本地 `.ldr/.mpd` 砖块级文件存在并包含 LDraw type-1 part references；E2E 必须证明点击模型后场景实例数量增加，且挖掘机撞击后该实例 `status === "detached"`、Rapier `brokenLinkCount > 0`、零件位置连续采样变化。
- 范围边界：v7 不做实时联网下载、不接账号、不处理付费 MOC、不做拖拽摆放；只做本地精选 LDraw 模型包浏览、加载和可破坏玩法。

## Doc QA Gate

- PRD-0005 每条需求都有 Req ID、范围、非目标和验收口径。
- v7 计划追溯到 REQ-0005-001 至 REQ-0005-005。
- v7 验收口径覆盖 LDraw 协议、UI、加载、物理和授权透明。

## Tashan Review - v7 / M1-M5

- reviewer_context: same-model
- round: 1
- cost_profile: standard
- verdict: pass
- blocker_count: 0
- major_count: 0
- stuck_signatures: none
- regression_signatures: none
- commands_checked: `npm test`; `npm run build`; `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome`; `git diff --check`; mojibake scan over changed docs/source files
- residual_risks: LDraw physical breakup uses a capped subset of visible part meshes for stability; exact stud clutch physics remains out of v7 scope.

### Findings

| severity | signature | evidence | disposition |
|---|---|---|---|
| BLOCKER | source-provenance::v7::fake-community-models | Earlier untracked sample data used hand-authored procedural models. | Fixed by ECN-0007, deleting fake catalog, adding real packed LDraw assets, and adding a failing test that rejects procedural samples. |
| NOTE | performance::v7::ldraw-physics-cap | Large LDraw models can contain many meshes. | Physics registration caps community model parts to keep Rapier stable; visual model remains full LDraw. |

## 差异列表

- 已满足：本地模型包为 3 个真实 packed LDraw assets，manifest 记录 sourceUrl/license/attribution/sourceKind。
- 已满足：`B` 打开右侧 LDraw 模型库，展示 3 张模型卡片和许可证文本。
- 已满足：点击 `Mini Construction` 通过 `LDrawLoader` 加入场景，debug 显示 `modelFormat === "ldraw"`、`sourceKinds` 包含 `ldraw-packed`。
- 已满足：驾驶挖掘机撞击加载模型后，实例状态变 `detached`，Rapier `brokenLinkCount > 0`，moving part sample 变化。
- 残余差异：v7 不做在线社区搜索、任意模型下载、精确 LEGO 咬合力或全量 mesh 物理化；这些保持为后续版本范围。

## Tashan Trigger Audit

- expected_review_triggers: 文档完成、M1-M5 完成、v7 完成
- actual_review_runs: 1
- skipped_triggers: 0
- skip_reasons: none
- mitigation: Review 已记录命令、发现和残余风险；完成前执行 commit 和 push。
