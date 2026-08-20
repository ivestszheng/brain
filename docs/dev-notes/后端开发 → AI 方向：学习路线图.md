# 后端开发 → AI 方向：学习路线图

> 整理自 [@polebug](https://polebug.github.io/) 的分享《保持思考｜等待｜斋戒》—— 从后端开发到 AI 方向的学习经历和工作转变。

---

## 一、Agent Workflow 与 Tool Calling

### 1.1 LangGraph（Agent 流程编排）

**目标：** 理解如何构建 long-running、stateful 的 Agent，把多步骤、有状态、有分支判断的流程串起来。

| 学习资料 | 备注 |
|---|---|
| [LangGraph 官方文档](https://docs.langchain.com/oss/python/langgraph/overview) | 快速建立 Agent Workflow 的整体认知 |
| [deeplearning.ai 教程：AI Agents in LangGraph](https://www.deeplearning.ai/short-courses/ai-agents-in-langgraph/) | 实践教程，串联 workflow、persistence、streaming 等核心能力 |
| [LangChain YouTube: LangGraph Multi-Agent Workflows](https://www.youtube.com/watch?v=hvAPnpSfSGo) | 学习多 Agent 组织方式：supervisor、路由、分工、上下文传递 |

**掌握要点：**
- LangGraph 适合构建 long-running、stateful agents
- 重点学习 persistence、streaming、memory、human-in-the-loop
- 理解多 Agent 模式：supervisor、路由、分工协作、上下文传递

### 1.2 Tool Calling（工具调用与底层执行）

**目标：** 理解函数调用的完整流程——从定义工具到模型发起调用再到执行回传。

| 学习资料 | 备注 |
|---|---|
| [OpenAI Cookbook: How to call functions with chat models](https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models) | 函数调用经典入门，涵盖接口设计、参数结构和执行流程 |
| [Anthropic 官方 Tool use 指南](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) | 偏工程实践，聚焦如何让模型稳定地选择工具、组织输入输出 |

**掌握要点：**
- 定义 Tool：名称、参数结构、功能描述
- 注册到 Agent：让模型知道有哪些工具可用
- 模型发起调用：输出工具名 + 参数 JSON
- 执行并回传结果：代码执行，结果送回上下文

### 1.3 Persistence（会话持久化）

**目标：** 让 Agent 在多步骤、多轮对话中持续工作，支持状态保存、恢复与回放。

| 学习资料 | 备注 |
|---|---|
| [LangGraph 官方文档：Persistence & Time Travel](https://langchain-ai.github.io/langgraph/concepts/persistence/) | 理解为什么 Agent 需要状态持久化，thread 级别状态如何保存 |
| [LangChain YouTube: LangGraph Persistence](https://www.youtube.com/watch?v=YE6A5d8kNp4) | 视频补充，帮助建立 Persistence 的使用直觉 |

**掌握要点：**
- 保存执行状态，避免每次从头开始
- 理解 Thread 级状态管理：保存、恢复、回放

### 1.4 Memory（记忆管理）

**目标：** 区分短期记忆与长期记忆，实现跨会话的信息复用。

| 学习资料 | 备注 |
|---|---|
| [LangGraph Memory 与 Store API 概念指南](https://langchain-ai.github.io/langgraph/concepts/memory/) | 短期记忆、长期记忆和外部存储的分工 |
| [跨 Thread 长期记忆实现指南](https://langchain-ai.github.io/langgraph/how-tos/cross-thread-persistence/) | "跨会话记忆" 的具体实现 |

**掌握要点：**
- 短期记忆服务当前对话，长期记忆保存跨会话可复用信息
- 跨 Thread 持久化：把记忆保存到外部 Store，在不同会话之间复用

---

## 二、AI 与实际工程结合

### 2.1 Prompt 工程

**目标：** 掌握 Prompt 编写最佳实践，让模型稳定、高效地完成任务。

| 学习资料 | 备注 |
|---|---|
| [Anthropic 官方：Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) | Prompt 编写的最佳实践 |
| [OpenAI 官方指南：Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering) | Prompt Engineering 核心策略 |

**掌握要点：**
- 写清楚任务目标和判断好坏的标准
- 提供必要的上下文（业务背景、输入材料、约束条件）
- 拆复杂任务为明确步骤，降低模型一次性处理的难度
- 约束输出格式，用测试样例观察失败 case，持续优化

### 2.2 Skill 工程

**目标：** 把团队经验沉淀成可复用的 Skill，实现按需发现和加载。

| 学习资料 | 备注 |
|---|---|
| [Anthropic 官方：Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | Skill 和 Prompt 的区别、Skill 架构、按需加载机制 |
| [Anthropic 官方：Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Skill 编写规范、命名方式、description 设计 |
| [Anthropic 官方：Get started with Agent Skills in the API](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart) | Skill 在 API 中的接入方式 |
| [Anthropic 官方：Agent Skills in the SDK](https://code.claude.com/docs/en/agent-sdk/skills) | `SKILL.md` 组织方式和 Skill 发现机制 |

**掌握要点：**
- 理解 Skill 和 Prompt 的区别：Skill 是一组可复用能力（知识 + 流程 + 工具）
- 设计 Skill 结构：主文件、reference、脚本、模板
- 设计 Description：通过命名和 description 让系统稳定判断何时加载 Skill
- 组织 SKILL.md：任务说明、流程、参考资料和工具入口
- 理解发现机制：按需发现和加载，而非全部塞进上下文

### 2.3 评测闭环（Evaluation）

**目标：** 建立测试样例和评测机制，持续观察 Prompt / Skill 的失败点并优化。

| 学习资料 | 备注 |
|---|---|
| [OpenAI 官方 Evaluation best practices](https://platform.openai.com/docs/guides/evaluation-best-practices) | Prompt / Skill 的评测方法 |

**掌握要点：**
- 用 Evaluation 检验 Prompt / Skill 在哪些 case 上失败
- 建立持续迭代的评测闭环

### 2.4 MCP Server

**目标：** 把系统能力包装成 AI 可以发现、理解和调用的工具。

| 学习资料 | 备注 |
|---|---|
| [MCP 官方教程](https://modelcontextprotocol.io/docs/getting-started/intro) | 从入门到实作的官方教程，涵盖技术概念、server 接入和 quickstart |
| [YouTube: How to Build Your First MCP Server](https://www.youtube.com/watch?v=k_l_wKz1k1c) | 从零搭建 MCP Server 的实战示例 |
| [GitHub: MCP Servers 官方开源实现合集](https://github.com/modelcontextprotocol/servers) | 官方维护的 reference servers 仓库，展示不同类型的实现方式 |

**掌握要点：**
- 理解 MCP 定位：AI 时代的协议标准，连接模型和外部系统能力
- 包装系统能力：把 API 或业务能力封装为 AI 可调用的工具
- 从零搭建 Server：跟着 quickstart 跑通基本结构
- 参考开源实现：学习不同类型 server 的实现方式

### 2.5 RAG（检索增强生成）

**目标：** 让 AI 能检索内部文档和业务知识，基于资料回答问题。

| 学习资料 | 备注 |
|---|---|
| [LangChain 官方：Build a RAG agent](https://docs.langchain.com/oss/javascript/langchain/rag) | 用 LangChain 搭建 RAG agent 和两步式 RAG 流程 |
| [LangSmith 官方：Evaluate a RAG application](https://docs.langchain.com/langsmith/evaluate-rag-tutorial) | RAG 应用评测方法（回答质量 + 检索效果） |

**掌握要点：**
- 知识库检索：模型本身不知道的内容，需先检索相关资料
- Retrieval 基础流程：文档切分、向量检索、metadata 过滤
- RAG agent：传统两步式 RAG 或将检索作为 tool 交给 Agent 判断
- 效果评测：同时看回答质量和检索效果

---

## 三、企业 AI 工作方向

在企业中，AI 相关工作大体分为三类方向：

### 3.1 AI 基建

模型网关、用量统计、权限控制——让其他团队更低成本、更稳定地使用 AI。

### 3.2 内部 AI 工具

知识库问答、通用 workflow 平台、Skill hub、MCP 管理服务。

### 3.3 团队 AI 提效

深入了解业务，把团队经验沉淀成 Skill，帮助 AI 真正进入日常开发和提效流程。

---

## 四、学习路径建议

```
第一阶段：Agent 基础
  └─ LangGraph → Tool Calling → Persistence → Memory

第二阶段：工程实践
  └─ Prompt 工程 → Skill 工程 → Evaluation 闭环

第三阶段：系统能力扩展
  └─ MCP Server → RAG

第四阶段：持续迭代
  └─ 评测驱动优化 → 落地业务场景
```

---

## 五、核心关键词速查

| 领域 | 核心概念 |
|---|---|
| Agent Workflow | 意图识别、流程编排、Tool Calling、状态持久化、Memory、外部系统集成 |
| Prompt/Skill | 任务目标、上下文管理、任务拆分、输出约束、SKILL.md、按需加载、评测闭环 |
| MCP | 协议标准、Server 搭建、工具注册、AI 能发现和调用外部系统 |
| RAG | 文档切分、向量检索、metadata 过滤、回答质量评测、检索效果评测 |
