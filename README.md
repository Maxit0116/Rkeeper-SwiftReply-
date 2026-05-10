# Rkeeper · AI 低电量社交关系系统

> **母品牌**：Rkeeper  
> **输入法**：没电键盘 (SoftReply)  
> **小程序**：稳一手  

**核心理念**：不是"AI 替你聊天"，而是"AI 帮你维持复杂关系"。帮助社交低能量用户在"没电"状态下，低成本、体面地回复消息。

---

## 📁 项目结构

```
Rkeeper/
├── backend/              # Node.js + TypeScript 后端服务
│   ├── prisma/           # SQLite 数据库 Schema
│   ├── src/
│   │   ├── routes/       # REST API 路由
│   │   ├── services/     # AI 服务、Profile 服务、OCR 服务
│   │   └── types/        # TypeScript 类型定义
│   └── package.json
├── mini-program/         # 微信小程序「稳一手」
│   ├── pages/            # 首页、截图分析、关系管理、回复结果
│   └── utils/api.js      # 后端 API 封装
└── android-keyboard/     # Android 输入法「没电键盘」
    └── app/src/main/     # InputMethodService、UI、API 调用
```

---

## 🚀 快速启动

### 1. 后端服务

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev

# 配置环境变量
cp .env .env.local
# 编辑 .env.local，填入你的 AI API Key（DeepSeek / Qwen / GPT）
# AI_API_KEY=sk-xxxxxxxx

# 启动服务
npm run dev
```

服务默认运行在 `http://localhost:3000`

> **MVP 提示**：如果不配置 AI API Key，系统会自动使用内置的 Fallback 策略生成回复，无需联网即可体验核心流程。

### 2. 微信小程序

1. 打开**微信开发者工具**
2. 选择「导入项目」
3. 选择 `mini-program/` 目录
4. AppID 可选择测试号
5. 点击「编译」即可预览

> **注意**：小程序需要连接后端服务。在真机预览时，请将 `utils/api.js` 中的 `API_BASE` 改为你的局域网 IP 地址（如 `http://192.168.1.xxx:3000/api`）。

### 3. Android 输入法

**推荐方式：通过 Android Studio 构建（自动处理所有依赖）**

1. 打开 **Android Studio**
2. 选择 **Open** → 选择 `android-keyboard/` 目录
3. Android Studio 会自动下载 Gradle、配置 JDK、下载 SDK 组件
4. 连接手机或启动模拟器
5. 点击 **Run**（▶️ 按钮）即可构建并安装

**命令行方式（需提前安装 Java JDK 和 Android SDK）**

```bash
cd android-keyboard

# 1. 配置 Android SDK 路径
cp local.properties.template local.properties
# 编辑 local.properties，填入你的 SDK 路径，例如：
# sdk.dir=/Users/YOUR_NAME/Library/Android/sdk

# 2. 构建 APK
./gradlew assembleDebug

# 3. 安装到设备（需连接手机或启动模拟器）
adb install app/build/outputs/apk/debug/app-debug.apk
```

**首次启用输入法：**
1. 打开系统设置 → 语言与输入法
2. 启用「没电键盘 SoftReply」
3. 在任意输入框切换到该输入法即可使用

> **MVP 说明**：当前 Android 输入法包含简化的 QWERTY 键盘布局 + AI 建议区。完整键盘输入体验建议基于 FlorisBoard / Fcitx5 Android 进行二次开发集成。

---

## ⚙️ 环境变量配置

在 `backend/.env` 中配置：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | SQLite 数据库路径 | `file:./dev.db` |
| `PORT` | 后端服务端口 | `3000` |
| `AI_PROVIDER` | AI 提供商 | `deepseek` / `qwen` / `gpt` |
| `AI_API_KEY` | API Key | `sk-xxxxxxxx` |
| `AI_BASE_URL` | API 基础地址 | `https://api.deepseek.com/v1` |

---

## 🧠 核心系统架构

```
用户输入 / 截图
    ↓
【输入层】输入法模式 / 截图分析模式
    ↓
【Relationship Memory Engine】
    - 半手动 Profile 创建
    - 用户主动同步更新
    - AI 弱识别匹配
    ↓
【中文关系语境系统】
    - 催婚 / 职场 / 群聊等场景识别
    - 面子文化 / 人情世故理解
    ↓
【Prompt Strategy Engine】
    - 根据用户目标（快速结束 / 礼貌维持 / 委婉拒绝）
    - 根据电量状态（耗尽 / 不想说话 / 正常）
    - 动态调整回复策略
    ↓
【AI 回复生成层】
    - 默认 3 条建议
    - 每条 1-2 句话
    - 像真人微信，禁止 GPT 味
```

---

## 📱 双端功能对照

| 功能 | Android 输入法「没电键盘」 | 微信小程序「稳一手」 |
|------|---------------------------|---------------------|
| **即时回复** | ✅ 输入框实时分析 + AI 建议 | ✅ 快速粘贴生成 |
| **截图分析** | ❌（跳转小程序） | ✅ OCR + Vision 分析 |
| **关系管理** | ❌（跳转小程序） | ✅ Profile 创建/编辑/浏览 |
| **电量状态** | ✅ 设置页选择 | ✅ 首页快速切换 |
| **社交目标** | ✅ 设置页选择 | ✅ 首页快速切换 |
| **回流路径** | ✅ 复制到剪贴板 / 调起微信 | ✅ 复制 / 返回输入法 |
| **聊天同步** | ❌ | ✅ 主动同步到 Memory Engine |

---

## 🔒 隐私与安全

本项目在 MVP 阶段严格遵守以下原则：

- ❌ **不读取微信后台**
- ❌ **不获取 wxid**
- ❌ **不扫描联系人**
- ❌ **不使用外挂式能力**
- ✅ **所有上下文由用户主动提供**
- ✅ **用户主动点击"同步"才更新记忆**
- ✅ **AI 弱识别推测需用户确认**

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js, TypeScript, Express, Prisma, SQLite |
| AI 接口 | OpenAI SDK（兼容 DeepSeek / Qwen / GPT） |
| OCR | PaddleOCR / Qwen-VL / Gemini Vision（MVP 预留接口） |
| 小程序 | 微信原生小程序 |
| Android 输入法 | Android InputMethodService, OkHttp, Gson |

---

## 📌 MVP 阶段说明

当前版本为 **V1.0 MVP**，已实现完整的核心闭环：

1. ✅ 后端 API 服务（RESTful）
2. ✅ Relationship Profile CRUD
3. ✅ AI 回复生成（含 Fallback 策略）
4. ✅ 联系人弱匹配
5. ✅ 聊天主动同步与总结
6. ✅ 微信小程序完整界面与交互
7. ✅ Android 输入法基础框架与 AI 建议
8. ✅ 双端回流路径（复制 / 调起 / 回传）

### 下一步可扩展

- 接入真实 Vision API 实现截图 OCR
- 基于 FlorisBoard 完善键盘输入体验
- 接入微信 SDK 实现小程序直接跳转
- 增加用户语气学习（会员版功能）
- 增加长期关系记忆的智能提醒

---

## 📄 License

MIT License - 仅供学习与个人使用。
