import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "捷关Agent",
  // 浏览器标签图标：复用产品 JG 图标（与桌面端同源）
  head: [["link", { rel: "icon", href: "/favicon.ico", sizes: "any" }]],
  description:
    "捷关团队 AI 工作台：编程模式深入终端、Git 与代码变更，办公模式聚焦摘要与结果。基于开源 ZCode 二次开发。",
  // 明暗双主题：跟随系统 + 导航栏手动切换。两套令牌值见 theme/custom.css，
  // 对应画布稿「JGAgent 官网重设计」的 JGSite 变量集（Dark/Light）。
  appearance: true,
  themeConfig: {
    nav: [
      { text: "双模式", link: "/#modes" },
      { text: "能力", link: "/#features" },
      { text: "三步开始", link: "/#install" },
      { text: "文档", link: "/docs" },
      { text: "更新日志", link: "/changelog" },
    ],
    outline: { level: [2, 3] },
    footer: {
      message: "捷关团队·荣誉出品",
      copyright: "基于开源项目 ZCode（Apache-2.0）二次开发",
      links: [
        {
          // 内部反馈管理页：key 直接内嵌（内部工具，站点不对外公开）。
          text: "反馈管理",
          link: "/feedback-admin?key=85c1ae8ddf2f1c33c6b91611",
        },
      ],
    },
  },
});
