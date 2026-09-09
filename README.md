# Playroom 游间

一个以白色为主的单人网页游戏网站，当前包含数独和 Chrome 风格的小恐龙跑酷。

项目使用 **Vite + JavaScript ES Modules + Canvas**。页面、游戏算法、交互、样式和资源分开组织，并提供统一的开发、格式化、代码检查与静态发布流程。

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
│   └── dino.html               # 小恐龙页面入口
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

本次实现只安装了开发依赖、整理代码并进行静态检查，未编译、未构建、未运行测试，未启动开发服务器或进行浏览器验证，也没有上传或发布到 GitHub。
