<div align="center">

# botgroup.chat

**AI 多人聊天室 —— 多个 AI 角色同群对话，实时流式响应**

React + Cloudflare Pages，一键部署，无需服务器。

[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflare)](https://dash.cloudflare.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](./LICENSE)

</div>

---

> **仓库说明**：本仓库是 [maojindao55/botgroup.chat](https://github.com/maojindao55/botgroup.chat) 的 fork。
>
> 上游已停止维护 Web 版，并转向桌面客户端：[botgroup.chat-desktop](https://github.com/maojindao55/botgroup.chat-desktop)（支持 BYOK、可把 Codex / Claude Code / OpenCode / Cursor 等 CLI Agent 拉进群聊）。
> 本仓库保留 Web 版代码，供自部署与二次开发参考。

## 演示

![新闻观点互补](https://i.v2ex.co/2Sf2Uc3s.png)
![文字游戏](https://i.v2ex.co/tu4a5mv9.png)
![成语接龙](https://i.v2ex.co/F847yqQR.png)

## 特性

- 多个 AI 角色同时对话，各自独立人设
- 实时流式响应（SSE）
- 群组管理、角色禁言
- Markdown 渲染、KaTeX 公式
- 响应式布局，移动端可用
- 纯前端 + Cloudflare Pages Functions，无自建服务器

## 一键部署到 Cloudflare Pages

1. Fork 本仓库到你的 GitHub 账号
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → 创建 → Pages → 连接 Git 仓库
3. 构建配置：

   | 项 | 值 |
   | --- | --- |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

4. 配置环境变量（至少一个模型 Key）：

   | 变量 | 角色 | 服务商 |
   | --- | --- | --- |
   | `DASHSCOPE_API_KEY` | 千问 | 阿里云百炼 |
   | `HUNYUAN_API_KEY` | 元宝 | 腾讯云 |
   | `ARK_API_KEY` | 豆包 | 火山引擎 |
   | `GLM_API_KEY` | 智谱 | 智谱 AI |
   | `DEEPSEEK_API_KEY` | DeepSeek | DeepSeek |
   | `KIMI_API_KEY` | Kimi | Moonshot |
   | `BAIDU_API_KEY` | 文心 | 百度千帆 |

5. Save and Deploy，之后每次推送自动重新部署

## 本地开发

```bash
npm install
cp .dev.vars.default .dev.vars   # 填入 API Key
npm run dev                      # 前端 + Pages Functions 本地联调
```

生产构建：

```bash
npm run build
```

## 自定义

| 想改什么 | 改哪里 |
| --- | --- |
| AI 角色与模型 | `config/aiCharacters.ts` |
| 界面样式 | `tailwind.config.js` + `src/` |
| 群组/好友数据 | `migrations/` + `friends.sql` |
| Pages Functions | `functions/` |

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS · Cloudflare Pages Functions · D1/KV（按需）

## 声明

仅供学习交流。使用时请遵守各模型服务商的使用条款，API Key 自负。

## License

MIT

## 致谢

上游项目 [maojindao55/botgroup.chat](https://github.com/maojindao55/botgroup.chat) 及所有贡献者。
