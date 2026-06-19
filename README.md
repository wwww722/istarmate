# 心情小驿站 — 接入说明

## 这套代码做了什么
登录/注册（谷歌/苹果/微信占位 + 邮箱密码）→ 首页双入口（心理咨询AI可用，AI素养课程"开发中"）
→ 填称呼/年龄/性别 → 15题心情自评（含自伤信号安全提醒）→ 每日小剧场对话（按问卷结果调整主题，
真实调用 Anthropic API）。

## 怎么跑起来

1. 把这个文件夹的内容合并进你现有的 Next.js 项目（或者直接用这个项目）。
2. 复制 `.env.local.example` 为 `.env.local`，按里面的注释填好：
   - `ANTHROPIC_API_KEY`：去 console.anthropic.com 申请，**必填**，没有这个聊天功能跑不起来。
   - `NEXTAUTH_SECRET`：随便生成一个随机字符串。
   - 谷歌/苹果/微信的 Client ID & Secret：没有的渠道可以先不填，对应的登录按钮点击会报错，
     不影响邮箱密码登录先跑通整体流程。
3. `npm install`
4. `npm run dev` 本地跑通，确认登录、问卷、聊天流程都没问题。
5. 部署到 Vercel：在项目的 Settings → Environment Variables 里，把 `.env.local` 里的所有变量
   原样填进去（`ANTHROPIC_API_KEY` 这种敏感值记得勾选 "Sensitive"）。

## 三个登录渠道分别要做什么（这部分我没法代办，需要你自己注册账号申请）

- **谷歌**：console.cloud.google.com → 新建项目 → APIs & Services → Credentials →
  创建 OAuth 客户端 ID（类型选 Web application），把 Vercel 域名加到授权重定向 URI：
  `https://你的域名/api/auth/callback/google`
- **苹果**：developer.apple.com（需要付费的 Apple Developer 账号，$99/年）→
  Certificates, Identifiers & Profiles → 创建 Service ID，配置 Sign in with Apple。
  苹果这边流程比谷歌复杂不少，建议先跳过，等其他功能跑通再接。
- **微信**：open.weixin.qq.com → 注册"网站应用"，需要营业执照和已备案的域名，
  个人开发者通常无法直接申请网站应用的微信登录（这是微信的限制，不是技术问题）。
  如果你是个人开发者，这里可能需要换成"扫码登录小程序"之类的变通方案，我可以再帮你设计。

## 关于数据存储（重要，现在是临时方案）

现在的问卷结果和用户信息存在浏览器的 `localStorage` 里，**换设备或清缓存就会丢失**，
而且没有真正跟"账号"绑定。正式上线前你需要：
1. 接一个数据库（推荐 Supabase 或 Vercel Postgres，跟 Vercel 集成最简单）。
2. 把 `pages/api/chat.js` 和问卷提交逻辑改成读写数据库，而不是 localStorage。
3. 把对话历史也存到数据库，这样"每日"剧场才能真正按天连续、且换设备也能看到历史。

这部分如果你需要，我可以下一步帮你把数据库接进来。

## 安全机制说明

问卷里有一题专门覆盖"伤害自己"的信号，一旦触发：
- 立刻弹出热线资源页（目前是示例号码 400-161-9995，你需要换成你们产品实际能提供的资源）。
- 这个标记会一直带入之后的每日聊天，AI 在 system prompt 里会被提醒：如果再次出现类似信号，
  暂停剧情，先关心人本身，并引导联系信任的成年人或专业资源。
- **这不是完整的危机干预机制**，只是兜底提醒。正式上线前，建议有真人（心理老师/客服）
  能收到这类高风险信号的通知，而不是完全交给 AI 处理。这部分我建议你们团队和有资质的
  心理咨询师一起设计流程。
