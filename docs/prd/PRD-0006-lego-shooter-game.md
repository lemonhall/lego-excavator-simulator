# PRD-0006: LEGO Shooter Game

## Vision

玩家应能在一个约 10 倍于当前农场的盒型 LEGO 场景里，控制建筑工小人手持加特林一路突突突。射击命中 LEGO/LDraw 目标后目标血量下降，归零时目标调用现有物理拆散链路炸成砖块。v8 的目标不是复杂敌人 AI，而是把“高射速、火光、弹道、命中反馈、连续炸裂、碎片满地”的割草爽感做成可验证的核心循环。

## Requirements

### REQ-0006-001: 默认盒型射击场景

- **动机**：玩家进入游戏后应立即看到可射击目标，而不是先打开模型库手动摆放。
- **范围**：启动后自动加载并放置 `mini-construction`、`lighthouse`、`radar-truck` 三个现有 LDraw 社区模型；场景地面、世界边界、雾、相机远裁剪、模型间距同步扩大到当前约 10 倍；目标分散在玩家前进方向的盒型场地中。
- **非目标**：v8 不做随机地图、程序关卡、在线下载新目标或保存摆放。
- **验收口径**：E2E 进入页面后无需按 `B`，`window.__legoGameDebug.communityModels.instanceCount === 3`；debug 暴露的 world bounds 横向/纵向跨度不小于 300；三个模型之间距离不小于 30。

### REQ-0006-002: 玩家手持加特林

- **动机**：射击游戏的第一视觉信号应是小人手里有武器，而不是只有抽象子弹。
- **范围**：玩家右手或右手附近挂载一个 LEGO 风格加特林模型，包含多管枪口、握把、机匣和枪口节点；模型来源或灵感记录为可追溯社区来源。
- **非目标**：v8 不要求完全复刻任一第三方 MOC，不做换枪，不做装弹动画。
- **验收口径**：单元测试或 world test 能找到 `playerGatlingGun` 和 `playerWeaponMuzzle`；debug 暴露 weapon asset source；画面中 weapon root 跟随玩家移动。

### REQ-0006-003: 左键连续射击

- **动机**：加特林的爽感来自按住鼠标后稳定高射速输出。
- **范围**：按住鼠标左键时，步行状态下以固定射速连续生成 projectile；每发 projectile 从 `playerWeaponMuzzle` 沿当前镜头瞄准方向飞行；projectile 有可见弹道和 TTL，超时或命中后移除；枪口有短暂火光。
- **非目标**：v8 不做弹药、过热、后坐力、精准弹道散布或联网同步。
- **验收口径**：单元测试验证按住 0.5 秒会生成多发 projectile；E2E 按住左键后 debug `shotsFired` 增加且 `activeProjectileCount > 0`，松开并等待后 `activeProjectileCount === 0`。

### REQ-0006-004: 射击扣血并触发 LEGO 炸裂

- **动机**：目标死亡时碎成 LEGO 零件是本游戏的主要爽点。
- **范围**：社区模型和 farm destructibles 都有 shooter health；projectile 命中后扣血并产生命中反馈；health 归零后目标切换到现有 `detached` 状态，Rapier breakable links 断裂并给零件冲量。
- **非目标**：v8 不做部位伤害、护甲、玩家受伤、敌人攻击或记分系统。
- **验收口径**：E2E 连续射击一个默认社区目标后，debug 中该目标 health 降低到 0，状态变为 `detached`，`physics.brokenLinkCount > 0`，连续采样 moving part 位置变化。

### REQ-0006-005: 割草射击反馈与调试可见性

- **动机**：爽感调参需要可观测，否则只能凭截图猜。
- **范围**：debug 暴露 weapon/projectile/target summary，包括 `shotsFired`、`activeProjectileCount`、`hitCount`、`muzzleFlashVisible`、目标 health/status；HUD 以中文提示左键射击。
- **非目标**：v8 不做完整游戏 UI、血条美术、击杀连击 UI 或音效重制。
- **验收口径**：E2E 能读取 debug weapon 数据验证发射、命中、清理；HUD 包含“左键 射击”。

## Source Notes

- BrickLink Studio Gallery exposes traceable minifig-scale minigun models such as “Minigun (Minifig Scale)” and “Minifig scale minigun”.
- Rebrickable exposes minigun MOCs such as MOC-144387 and MOC-133182.
- v8 may use a local brick-built minigun if third-party files cannot be downloaded directly, but the source/inspiration must remain visible in docs/debug.
