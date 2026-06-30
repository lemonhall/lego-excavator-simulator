# v8 Plan: LEGO Shooter Core

## Goal

把现有 LEGO/LDraw 可破坏系统转成一个可玩的割草射击核心循环：玩家手持加特林，左键连续射击，默认目标扣血并炸裂，场景成为更大的盒型射击场。

## PRD Trace

- REQ-0006-001
- REQ-0006-002
- REQ-0006-003
- REQ-0006-004
- REQ-0006-005

## Scope

做：

- 新增 v8 文档、PRD 和追溯矩阵。
- 新增 `src/game/weapon.ts` 和 `src/game/weapon.test.ts`，实现 firing cadence、projectile motion、TTL、hit result 和 debug summary。
- 扩展 `GameInput`，用鼠标左键控制 `fire`。
- 在玩家身上挂载 LEGO 风格加特林和 `playerWeaponMuzzle`。
- 启动后自动加载并放置 3 个现有社区 LDraw 模型。
- 扩大 world bounds、ground、fog/camera/light ranges 和 community placement spacing。
- 给社区模型和 farm destructibles 增加 shooter health，projectile 命中扣血，归零触发现有 detached 物理链路。
- E2E 覆盖默认目标、射击、弹丸清理、扣血和炸裂。

不做：

- 不做敌人 AI、波次、巡逻、玩家生命值或敌人攻击。
- 不做火箭炮、霰弹枪、换枪、弹药、过热、reload。
- 不做联网模型搜索、拖拽摆放、场景保存。
- 不重写 Rapier 物理系统，不追求全量 LDraw mesh 都变 dynamic body。

## Acceptance

1. `npm test -- src/game/weapon.test.ts` exit 0，覆盖：
   - fire cadence：持续 firing 0.5 秒生成多发 projectile。
   - projectile TTL：超过 lifetime 后从 active list 移除。
   - hit detection：projectile 进入目标半径返回 hit event。
2. `npm test -- src/game/world.test.ts src/game/state.test.ts src/game/app.test.ts` exit 0，覆盖：
   - `WORLD_BOUNDS` 跨度不小于 300。
   - world 中存在 `playerGatlingGun` 和 `playerWeaponMuzzle`。
   - 自动社区模型 placement 间距不小于 30。
3. `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "LEGO shooter"` exit 0，覆盖：
   - 启动后默认 `communityModels.instanceCount === 3`。
   - HUD 包含“左键 射击”。
   - 鼠标左键按住后 `weapon.shotsFired` 增加、`weapon.activeProjectileCount > 0`。
   - 松开并等待后 `weapon.activeProjectileCount === 0`。
   - 连续射击目标后目标 health 归零，community status 变 `detached`，Rapier `brokenLinkCount > 0`。
4. `npm test`、`npm run build`、桌面 E2E、`git diff --check`、乱码/NUL 扫描 exit 0。

## Files

- `docs/superpowers/specs/2026-06-30-lego-shooter-game-design.md`
- `docs/prd/PRD-0006-lego-shooter-game.md`
- `docs/plan/v8-index.md`
- `docs/plan/v8-lego-shooter-core.md`
- `src/game/weapon.ts`
- `src/game/weapon.test.ts`
- `src/game/input.ts`
- `src/game/state.ts`
- `src/game/world.ts`
- `src/game/world.test.ts`
- `src/game/app.ts`
- `src/game/app.test.ts`
- `tests/e2e/game.spec.ts`

## Steps

1. 文档 Gate：提交 design doc、PRD-0006、v8-index 和 v8 plan。
2. TDD Red：新增 weapon 单元测试，验证射速、TTL、命中，运行到红。
3. TDD Green：实现 `weapon.ts` 纯逻辑。
4. World Red：新增 world/state/app 测试，验证大场景、加特林节点和默认 placement，运行到红。
5. World Green：扩大场景与 bounds，挂载加特林节点，调整默认 placement。
6. Input Red：新增测试或 E2E，验证左键进入 `fire` 输入，运行到红。
7. Input Green：扩展 `KeyboardInput` 鼠标左键状态。
8. App Red：新增 E2E “LEGO shooter” 流程，验证默认 3 目标、射击、清理、扣血、炸裂，运行到红。
9. App Green：自动生成社区模型，渲染 projectile/muzzle/hit feedback，应用伤害并触发 detached。
10. Refactor：把 app 内新增逻辑压到小函数，保持现有驾驶/破坏路径不回归。
11. Review Loop：检查追溯、DoD、E2E、编码和残余风险。
12. Ship：提交并推送。

## Risks

- **资产来源风险**：第三方 minigun 模型未必可直接自动下载。v8 允许 traceable local brick-built fallback，但必须在 PRD/debug 中记录来源和非官方性质。
- **性能风险**：高射速 projectile 可能拖慢渲染。使用对象池/上限/TTL，debug 验证 projectile 会清理。
- **命中风险**：Three 真实 mesh 射线检测过重。v8 用目标 bounds/sphere 做射击判定，保持爽快感。
- **物理风险**：Rapier 注册社区模型需要加载完成后才有 body。E2E 等待 physics ready 和 target registered 后再射击验证。
