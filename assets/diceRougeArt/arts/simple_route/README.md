# Simple Route Assets

这里是“主路 + 最多 2 条分支”的轻量爬塔路线图资源，全部是拆分 PNG。

## 背景

- `route_bg_720x1280.png`
- `route_bg_720x1600.png`

## 路线段

已解锁路线：

- `route_vertical_yellow.png`
- `route_left_yellow.png`
- `route_right_yellow.png`
- `route_merge_left_yellow.png`
- `route_merge_right_yellow.png`

未解锁路线：

- `route_vertical_dark.png`
- `route_left_dark.png`
- `route_right_dark.png`
- `route_merge_left_dark.png`
- `route_merge_right_dark.png`

## 节点底座

- `node_current.png`：当前节点。
- `node_active.png`：可选择节点。
- `node_done.png`：已完成节点。
- `node_normal.png`：普通节点。
- `node_locked.png`：锁定节点。
- `node_boss.png`：Boss 节点。

## 节点图标

- `icon_start.png`
- `icon_battle.png`
- `icon_elite.png`
- `icon_shop.png`
- `icon_rest.png`
- `icon_event.png`
- `icon_treasure.png`
- `icon_boss.png`

## 状态和标签

- `state_check.png`：已完成勾。
- `state_lock.png`：锁定标记。
- `label_blue.png`
- `label_purple.png`
- `label_gold.png`
- `label_green.png`
- `label_red.png`
- `arrow_left.png`
- `arrow_right.png`

## 推荐结构

第一版建议路线：

```text
Boss
  |
休息 / 宝箱
 \   /
精英 / 事件
 \   /
商店
  |
普通战斗
  |
起点
```

这样每次最多只给玩家 2 个选择，不会变成复杂多分支地图。

## 预览

- `art_assets/phase1_2d/preview/simple_route_mockup.png`
- `art_assets/phase1_2d/preview/simple_route_assets_contact_sheet.png`

## 重新生成

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate_simple_route_assets.ps1
```
