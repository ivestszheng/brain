# Obsidian 第二大脑完整方案

## 一、背景

你目前在 GitHub 上维护着多个仓库：

- **mine**（私有）：个人资料与日记
- **health**（私有）：健康记录
- **ivestszheng.github.io**（公开）：基于 GitHub Pages + VitePress 搭建的个人博客，包含大量开发笔记

你的核心需求是：

1. **本地统一管理**：希望用 Obsidian 在一个仓库里管理所有内容，享受全局搜索、双向链接等单库优势
2. **云端安全备份**：所有笔记通过 GitHub 同步，防止本地数据丢失
3. **隐私隔离**：日记、健康记录等私密内容绝不能出现在公开仓库中
4. **博客自动发布**：开发笔记中需要公开的部分，能自动同步到 `ivestszheng.github.io` 并自动构建部署

核心矛盾在于：**本地想要"一个库"的无缝体验，但远程必须"一分为二"来保护隐私。**

---

## 二、方案总览

**本地单库 + 远程双仓库 + GitHub Actions 自动同步（VitePress 构建）**

### 本地：一个 Obsidian 仓库管理所有内容

在本地创建一个 `brain` 仓库，所有笔记集中存放，目录结构自由组织：

```
brain/
├── .obsidian/           # Obsidian 配置（主题、插件、快捷键）
├── diary/               # 日记（私有）
├── health/              # 健康记录（私有）
├── dev-notes/           # 开发笔记（部分公开，部分私有）
├── projects/            # 项目笔记
├── blog-manifest.json   # 博客发布清单
└── .gitignore
```

### 远程：拆成两个 GitHub 仓库

| 远程仓库 | 可见性 | 内容 | 用途 |
|---|---|---|---|
| `ivestszheng/brain` | **Private** | 所有内容（完整镜像） | 多设备同步、云端备份 |
| `ivestszheng/ivestszheng.github.io` | **Public** | 仅标记发布的内容 | GitHub Pages 博客部署（VitePress 构建） |

### 同步链路

```
你在 Obsidian 写笔记，放在任意目录
    ↓
Obsidian Git 插件自动 Commit & Push（每 10 分钟）
    ↓
GitHub 私有仓库 brain（完整备份，仅自己可见）
    ↓
GitHub Actions 检测到变更，读取 blog-manifest.json
    ↓
安全检查：确认清单中无私密目录文件
    ↓
将清单中的 Markdown 文件全量同步到 ivestszheng.github.io 的 docs/posts/ 目录
（先清理旧文件，再复制最新内容，确保增删改一致）
    ↓
执行 npm install && npm run build 构建 VitePress 站点
    ↓
将构建产物 dist/ 部署到 GitHub Pages
    ↓
博客自动更新上线
```

---

## 三、详细配置步骤

### 第一段同步：Obsidian -> GitHub 私有仓库

#### 1. 安装 Obsidian Git 插件

1. 打开 Obsidian -> 设置 -> 第三方插件 -> 关闭"安全模式"
2. 在社区插件市场搜索 **Obsidian Git**，安装并启用
3. 进入插件设置页面，配置以下关键项：

| 设置项 | 推荐值 | 说明 |
|---|---|---|
| Auto commit-and-sync interval | `10`（分钟） | 每 10 分钟自动提交并推送 |
| Auto commit-and-sync after stopping file edits | 开启 | 停止编辑后自动同步 |
| Pull on startup | 开启 | 每次打开 Obsidian 自动拉取最新内容 |
| Commit message template | `vault backup: {{date}}` | 避免无意义的 commit 堆积 |

4. 首次使用时，在插件设置中填写 **Commit Author**（你的名字和邮箱），确保提交记录正确

配置完成后，你在 Obsidian 里写的任何内容都会自动备份到 GitHub 私有仓库，完全不需要手动操作 Git 命令。

> **多设备冲突提醒**：如果频繁切换设备编辑，10 分钟间隔可能产生冲突。建议每次切换设备前手动执行一次 commit & sync，并确保 Pull on startup 已开启。

### 第二段同步：GitHub 私有仓库 -> 公开博客（VitePress 构建部署）

#### 1. 认证方式选择（二选一）

跨仓库推送需要认证，推荐以下两种方式：

**方式 A：Deploy Key（推荐，更安全）**

Deploy Key 是专属于单个仓库的 SSH 密钥，权限最小化，即使泄露也只影响目标仓库。

1. 生成密钥对：
   ```bash
   ssh-keygen -t ed25519 -C "blog-deploy" -f blog_deploy_key -N ""
   ```
2. 将公钥（`blog_deploy_key.pub`）添加到 `ivestszheng.github.io` 仓库的 **Settings -> Deploy keys -> Add deploy key**，勾选 **Allow write access**
3. 将私钥（`blog_deploy_key`）内容存入 `brain` 仓库的 **Settings -> Secrets and variables -> Actions**，Name 填 `BLOG_DEPLOY_KEY`

**方式 B：Fine-grained PAT（备选）**

Fine-grained PAT 比 classic token 更安全，可以限定权限范围和有效期。

1. 打开 GitHub -> 头像 -> **Settings** -> **Developer settings** -> **Personal access tokens** -> **Fine-grained tokens**
2. 点击 **Generate new token**
3. **Repository access** 选 `Only select repositories`，选 `ivestszheng.github.io`
4. **Permissions** 中设置 `Contents: Read and write`
5. 建议设置 90 天过期，到期后重新生成并更新 Secret
6. 将 Token 存入 `brain` 仓库的 Secrets，Name 填 `BLOG_DEPLOY_TOKEN`

#### 2. 在私有仓库中创建 Workflow 文件

在 `brain` 仓库的根目录下创建文件 `.github/workflows/deploy-blog.yml`。

> **paths 过滤说明**：只监听 `blog-manifest.json` 和公开内容目录，避免改日记或健康记录时白白触发部署、浪费 Actions 额度。

**如果用 Deploy Key（方式 A）：**

```yaml
name: Deploy Blog to GitHub Pages (VitePress)

on:
  push:
    branches: [main]
    paths:
      - 'blog-manifest.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source repo
        uses: actions/checkout@v4

      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.BLOG_DEPLOY_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan github.com >> ~/.ssh/known_hosts

      - name: Clone target repo
        run: |
          git clone git@github.com:ivestszheng/ivestszheng.github.io.git target-repo

      - name: Verify no private files in manifest
        run: |
          cat blog-manifest.json | jq -r '.posts[].source' | while IFS= read -r file; do
            if [[ "$file" == diary/* ]] || [[ "$file" == health/* ]]; then
              echo "::error::Private file in manifest: $file"
              exit 1
            fi
          done

      - name: Sync posts to target repo
        run: |
          mkdir -p target-repo/docs/posts
          # 清空旧的已发布文章，确保删除操作能同步
          rm -f target-repo/docs/posts/*.md
          # 全量复制清单中的文件
          cat blog-manifest.json | jq -r '.posts[] | "\(.source)\t\(.slug)"' | while IFS=$'\t' read -r source slug; do
            if [ -f "$source" ]; then
              cp "$source" "target-repo/docs/posts/${slug}.md"
              echo "Synced: $source -> docs/posts/${slug}.md"
            else
              echo "::warning::File not found: $source"
            fi
          done

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: 'target-repo/package-lock.json'

      - name: Install dependencies and build VitePress
        run: |
          cd target-repo
          npm ci
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          deploy_key: ${{ secrets.BLOG_DEPLOY_KEY }}
          external_repository: true
          publish_branch: gh-pages
          publish_dir: target-repo/dist
```

**如果用 Fine-grained PAT（方式 B）：**

```yaml
name: Deploy Blog to GitHub Pages (VitePress)

on:
  push:
    branches: [main]
    paths:
      - 'blog-manifest.json'
      - 'dev-notes/**'
      - 'projects/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source repo
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Clone target repo
        run: |
          git clone https://x-access-token:${{ secrets.BLOG_DEPLOY_TOKEN }}@github.com/ivestszheng/ivestszheng.github.io.git target-repo

      - name: Verify no private files in manifest
        run: |
          cat blog-manifest.json | jq -r '.posts[].source' | while IFS= read -r file; do
            if [[ "$file" == diary/* ]] || [[ "$file" == health/* ]]; then
              echo "::error::Private file in manifest: $file"
              exit 1
            fi
          done

      - name: Sync posts to target repo
        run: |
          mkdir -p target-repo/docs/posts
          # 清空旧的已发布文章，确保删除操作能同步
          rm -f target-repo/docs/posts/*.md
          # 全量复制清单中的文件
          cat blog-manifest.json | jq -r '.posts[] | "\(.source)\t\(.slug)"' | while IFS=$'\t' read -r source slug; do
            if [ -f "$source" ]; then
              cp "$source" "target-repo/docs/posts/${slug}.md"
              echo "Synced: $source -> docs/posts/${slug}.md"
            else
              echo "::warning::File not found: $source"
            fi
          done

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: 'target-repo/package-lock.json'

      - name: Install dependencies and build VitePress
        run: |
          cd target-repo
          npm ci
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          personal_token: ${{ secrets.BLOG_DEPLOY_TOKEN }}
          external_repository: true
          publish_branch: gh-pages
          publish_dir: target-repo/dist
```

#### 3. Workflow 说明

| 步骤 | 说明 |
|---|---|
| Checkout source repo | 拉取 `brain` 私有仓库的代码 |
| Clone target repo | 拉取 `ivestszheng.github.io` 公开仓库的代码（带认证，防止目标仓库改为私有后失败） |
| Verify no private files | 安全检查：确认清单中不含 `diary/` 或 `health/` 路径，防止误发布私密内容 |
| Sync posts to target repo | 全量同步：先清空 `docs/posts/` 旧文件，再按清单复制最新内容到 `docs/posts/{slug}.md`，确保新增、修改、删除都能同步 |
| Setup Node + Install and build | 缓存 npm 依赖，执行 `npm ci` 和 `npm run build`，由 VitePress 构建静态站点 |
| Deploy | 使用 `peaceiris/actions-gh-pages` 部署构建产物到 `gh-pages` 分支 |

---

## 四、博客发布控制：清单方案

在仓库根目录维护一个 `blog-manifest.json`，记录需要发布到博客的文章：

```json
{
  "posts": [
    {
      "source": "dev-notes/Turborepo笔记.md",
      "slug": "turborepo-notes",
      "title": "Turborepo 笔记"
    },
    {
      "source": "dev-notes/Docker学习.md",
      "slug": "docker-learning",
      "title": "Docker 学习"
    },
    {
      "source": "projects/面试复盘/前端2025年6月找工作总结.md",
      "slug": "frontend-job-hunting-2025-06",
      "title": "前端2025年6月找工作总结"
    }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `source` | 在 brain 仓库中的源文件路径 |
| `slug` | 博客 URL 路径（如 `turborepo-notes` 对应 `/posts/turborepo-notes`），需用英文短横线 |
| `title` | 博客页面标题，可与源文件标题不同 |

**全量同步机制：**

每次部署时，Workflow 会先清空 `docs/posts/` 目录下的所有 `.md` 文件，再按清单重新复制。这样三种操作都能正确同步：

- **新增文章** -> 加入清单即可，下次部署自动发布
- **修改文章** -> brain 仓库改完后，下次部署自动用最新内容覆盖
- **删除文章** -> 从清单中移除即可，下次部署自动从博客删除

> **安全提醒**：Workflow 中内置了安全检查步骤，如果误将 `diary/` 或 `health/` 路径加入清单，构建会立即失败并报错，防止私密内容泄露到公开仓库。

**VitePress 侧的配置建议：**

在 `ivestszheng.github.io` 仓库的 `.vitepress/config.ts` 中，将 `docs/posts/` 配置为文章内容源，通过 `sidebar` 或 `nav` 组织导航。slug 即为文章的 URL 路径。

---

## 五、方案优势总结

| 需求 | 如何解决 |
|---|---|
| 统一管理 | 本地单库，全局搜索、双向链接、一套插件配置 |
| 安全备份 | 完整内容自动同步到 GitHub 私有仓库 |
| 隐私隔离 | 私有内容永远不会出现在公开仓库中（双重保障：清单 + 安全检查） |
| 灵活发布 | 通过清单控制，笔记放哪都行，不受目录限制 |
| VitePress 构建 | 自动安装依赖、执行构建、部署静态产物到 GitHub Pages |
| 自动化 | 写作 -> 备份 -> 构建 -> 发布，全链路自动，无需手动操作 |

---

## 六、注意事项

1. **认证安全**：推荐使用 Deploy Key（方式 A），权限最小化，只对目标仓库有写权限。如使用 PAT，建议选 Fine-grained PAT 并限定权限范围，设置 90 天过期
2. **Actions 额度**：私有仓库每月有 2000 分钟免费额度。Workflow 的 paths 过滤已排除 `diary/` 和 `health/`，避免改日记时白白触发部署
3. **首次部署**：建议先在 `blog-manifest.json` 中添加一个测试文件路径，push 后去 Actions 页面查看是否成功
4. **VitePress 构建依赖**：确保 `ivestszheng.github.io` 仓库的 `package.json` 中已配置 VitePress 相关依赖和 `build` 脚本
5. **分支策略**：Workflow 使用 `peaceiris/actions-gh-pages` 将构建产物部署到 `gh-pages` 分支。在 GitHub Pages 设置中将 Source 设为 `gh-pages` 分支
6. **`.gitignore` 建议**：在 `brain` 仓库中，确保 `.obsidian/plugins/` 被忽略，只保留 `community-plugins.json` 用于跨设备恢复插件列表
7. **多设备冲突**：频繁切换设备编辑时，Obsidian Git 的自动提交可能产生冲突。建议切换设备前手动执行一次 commit & sync
