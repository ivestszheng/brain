# AGENTS.md - Obsidian 第二大脑仓库

## 项目概述

本仓库是一个基于 Obsidian 的个人第二大脑知识管理系统，用于集中管理日记、健康记录、开发笔记和项目笔记等内容。

## 仓库结构

```
brain/
├── .obsidian/           # Obsidian 配置（主题、插件、快捷键）
├── .github/workflows/   # CI 工作流（同步文章到博客）
├── docs/
│   ├── career/          # 职业总结（可同步到博客）
│   ├── dev-notes/       # 开发笔记（可同步到博客）
│   ├── diary/           # 日记（不同步）
│   ├── finance/         # 财务管理（可同步到博客）
│   ├── health/          # 健康记录（不同步）
│   ├── informal-essay/  # 杂文（可同步到博客）
│   ├── jottings/        # 随手记（不同步）
│   └── projects/        # 项目复盘（不同步）
├── scripts/             # 同步脚本
│   ├── generate-blog-manifest.mjs  # 清单生成器
│   └── sync-to-blog.mjs           # 同步执行器
├── templates/           # 模板
├── assets/              # 静态资源
├── .gitignore
├── AGENTS.md            # 本文件
└── README.md
```

## 博客同步机制

通过 GitHub Actions 将白名单目录中标记了 `publish: true` 的文章增量同步到公开博客仓库 `ivestszheng/ivestszheng.github.io` 的 `docs/post/` 目录。

- **白名单目录**：`career/`、`dev-notes/`、`finance/`、`informal-essay/`（修改 `scripts/generate-blog-manifest.mjs` 中的 `WHITELIST_DIRS` 调整）
- **发布标记**：文章 frontmatter 中加 `publish: true`
- **同步方式**：CI 手动触发（`workflow_dispatch`），增量同步
- **变更追踪**：内容哈希对比，输出新增/修改/移除/未变化
- **脱敏检查**：自动扫描内网 IP、语雀链接、手机号等敏感信息
- **详细方案**：见 `docs/dev-notes/Obsidian第二大脑完整方案.md`

## 内容脱敏规范

所有笔记内容必须注意脱敏：

- **公司信息**：不得出现公司名称、内部项目代号、内部系统名称等
- **敏感数据**：不得包含真实域名、IP 地址、账号密码、API Key 等
- **内部流程**：不得泄露公司内部业务流程、架构细节、未公开技术方案
- **个人隐私**：日记和健康记录目录（`diary/`、`health/`）不会被同步到博客，但仍应避免在其他目录中暴露个人隐私信息
- AI 协助编写笔记时，应自觉遵守以上脱敏规范，对涉及公司的内容进行模糊化处理

## Git 规范

- **禁止自动提交 Git**：不要在未经用户明确指示的情况下执行 `git add`、`git commit`、`git push` 等操作
- 提交信息使用中文
- 仅在用户明确要求时才进行 Git 操作
