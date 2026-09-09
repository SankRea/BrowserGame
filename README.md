# Playroom 游间

一个以白色为主的单人网页游戏网站，当前包含数独、Chrome 风格的小恐龙跑酷和路线推理游戏「唯一的路」。

项目使用 **Vite + JavaScript ES Modules + Canvas / SVG**。页面、游戏算法、交互、样式和资源分开组织，并提供统一的开发、格式化、代码检查与静态发布流程。

## 本地开发

建议使用 Node.js 24 LTS；最低版本为 22.12。首次下载项目后，在项目根目录执行：

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run dev
```

在浏览器打开 `http://127.0.0.1:5173/`。

- 游戏大厅：`/`
- 数独：`/pages/sudoku.html`
- 小恐龙：`/pages/dino.html`
- 唯一的路：`/pages/only-path.html`

工程已切换为模块化开发，使用开发服务器访问，不再直接双击 HTML 文件。PowerShell 下使用 `npm.cmd` 可以避免系统拦截 `npm.ps1`，无需修改系统执行策略。

## 常用命令

| 命令                       | 用途                               |
| -------------------------- | ---------------------------------- |
| `npm.cmd run dev`          | 启动本地开发服务器，修改后更新页面 |
| `npm.cmd run build`        | 构建静态网站到 `dist/`             |
| `npm.cmd run preview`      | 预览已经构建的 `dist/`             |
| `npm.cmd run lint`         | 执行 ESLint 代码检查               |
| `npm.cmd run format`       | 使用 Prettier 统一项目格式         |
| `npm.cmd run format:check` | 只检查格式，不写入文件             |

构建、预览与检查命令需要按任务授权执行。开发依赖版本由 `package-lock.json` 锁定，生成目录、依赖目录与 npm 缓存不提交到 Git。

## 文件结构

```text
playroom/
├── index.html                  # 大厅页面入口
├── pages/
│   ├── sudoku.html             # 数独页面入口
│   ├── dino.html               # 小恐龙页面入口
│   └── only-path.html          # 唯一的路页面入口
├── src/
│   ├── app/
│   │   ├── catalog.js          # 游戏目录与推荐项
│   │   └── home.js             # 大厅渲染
│   ├── shared/
│   │   ├── site.js             # 公共导航、页脚、路径
│   │   └── storage.js          # 浏览器存储
│   ├── styles/
│   │   ├── base.css            # 全站基础样式
│   │   └── home.css            # 大厅样式
│   └── games/
│       ├── sudoku/
│       │   ├── config.js       # 难度与保存配置
│       │   ├── engine.js       # 出题与求解
│       │   ├── index.js        # 游戏交互与状态
│       │   └── styles.css
│       ├── only-path/          # 关卡、路线检查、SVG 棋盘、进度与界面
│       └── dino/
│           ├── config.js       # 手感、速度、精灵与碰撞配置
│           ├── engine.js       # 运动、生成、碰撞与分数
│           ├── renderer.js     # Canvas 渲染
│           ├── input.js        # 键盘与触屏
│           ├── index.js        # 页面与游戏模块连接
│           └── styles.css
├── public/
│   ├── assets/dino/            # 本地精灵图
│   ├── licenses/               # 随站发布的资源许可
│   ├── favicon.svg
│   └── .nojekyll
├── docs/
│   ├── architecture.md         # 模块职责与新增游戏步骤
│   └── third-party-assets.md   # 素材来源
├── .github/workflows/pages.yml # 手动发布 GitHub Pages
├── package.json
├── package-lock.json
├── vite.config.js
├── eslint.config.js
├── .prettierrc.json
├── .editorconfig
└── README.md
```

具体修改入口见 [工程说明](docs/architecture.md)。

## 游戏功能

### 唯一的路

- 13 个手工关卡：8 关入门 + 5 关挑战；用有限的墙，保留指定蓝线并排除所有其他起终点路线。
- 挑战关加入可通行但不能筑墙的圆圈格，以及每行、每列的墙数上限；需要统筹多个岔口和交错环路。
- 点击白色空地放墙或移除；蓝色路线和固定障碍不可编辑。
- 路线只能上下左右移动，不重复经过格子；死胡同里的往返不算新路线。
- 检查后用橙色虚线显示一条真实反例；修改布局会清除旧反例，重新检查后判定。
- 支持撤销、重做、可撤销的清空、关卡切换、思路提示、通过方案恢复和本地存档。
- 鼠标及触屏点按；方向键选格，空格放墙，C 检查，Z / Y 撤销与重做，R 清空。
- 页面可直接进入挑战，关卡选择分为入门与挑战；小屏幕可放大棋盘并横向滑动。
- 第一挑战关直达：`/pages/only-path.html?level=challenge-crossroads`，也可替换为其他关卡 ID。
- 关卡数据和纯路线检查逻辑独立，说明见 [唯一的路设计与关卡编辑](docs/only-path.md)。

### 小恐龙

- 自动奔跑、短跳与长跳、下蹲、空中快速下落。
- 不同大小和组合的仙人掌、不同高度的飞鸟、逐渐加速和昼夜变化。
- 固定时间步的运动与碰撞计算，键盘及触屏输入。
- 暂停、离开页面自动暂停、失败重新开始、本地最高分。
- 空格 / ↑ / W 跳跃，↓ / S 下蹲，P / Esc 暂停，R 重开。
- 仅保存最高分，不保存当前跑酷局。游戏资源使用本地文件，首次打开页面仍需要正常加载资源。

精灵图及部分坐标来自 Chromium，完整来源与 BSD 许可见 [素材说明](docs/third-party-assets.md)。

### 数独

- 标准 9 × 9 棋盘，唯一解检查与简单、中等、困难三档出题。
- 笔记、擦除、最多 200 步撤销、冲突标记、答案检查、提示和完成判定。
- 计时、暂停、重玩、本地进度恢复；支持键盘与触屏。
- 三档目标为保留 42、34、28 个数字；无法继续安全挖空时会保留更多数字。档位按线索数量区分，并非专业解题技巧评级。

存档仅在同一浏览器来源中有效，原先通过本地文件打开的进度不会自动迁移到开发服务器或 GitHub Pages；清理浏览器存储会清除记录。

## 发布到 GitHub Pages

1. 将项目源文件和锁文件上传到 GitHub 仓库，保留 `.github/workflows/pages.yml`。
2. 在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
3. 在 **Actions → Publish to GitHub Pages → Run workflow** 手动启动发布。
4. 工作流会安装依赖、执行代码检查、构建 `dist/`，然后部署静态网站。

工作流仅手动触发。Vite 使用相对资源路径，页面链接也考虑了仓库子路径，可以用于 `https://用户名.github.io/仓库名/`。没有配置后端或联机服务。

参考：[Vite 部署文档](https://vite.dev/guide/static-deploy.html)。

「唯一的路」及新增挑战关尚未进行构建、游戏运行或浏览器验证。GitHub Pages 使用上面的手动发布流程，上传源码后需重新运行工作流。
