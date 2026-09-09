# 第三方资源

## Chromium 小恐龙精灵图

- 本地文件：`public/assets/dino/chromium-sprite.png`
- 来源：[Chromium 官方镜像](https://github.com/chromium/chromium/blob/main/components/neterror/resources/images/default_100_percent/offline/100-offline-sprite.png)
- 精灵位置参考：[offline_sprite_definitions.ts](https://github.com/chromium/chromium/blob/main/components/neterror/resources/dino_game/offline_sprite_definitions.ts)
- 动画位置参考：[trex.ts](https://github.com/chromium/chromium/blob/main/components/neterror/resources/dino_game/trex.ts)
- 上游完整许可：[Chromium LICENSE](https://github.com/chromium/chromium/blob/main/LICENSE)
- 随站发布的许可副本：`public/licenses/chromium.txt`

采用 Chromium 的 BSD 许可素材与部分精灵/碰撞坐标。游戏引擎、页面布局及输入组织在本项目中独立实现，并非 Chromium 游戏源码的完整移植。

素材从本项目自身域名加载，不依赖第三方图片外链。`public/` 内的许可会随构建复制到发布目录，游戏页面也提供许可入口。
