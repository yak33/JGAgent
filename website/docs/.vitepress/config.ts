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
  // 无后缀 URL（/docs 而非 /docs.html）：需要 nginx try_files $uri.html 配合，见 docs/release 第三节
  cleanUrls: true,
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
      // v-html 渲染：可直接放反馈管理入口（进入后需输入管理密钥登录，30 天免登录）。
      // ⚠️ target="_blank" 不能删：/feedback-admin 是 nginx 反代到反馈服务的另一个应用，
      // 不是 VitePress 的页面。VitePress 的全局 click 处理器对「同源且无扩展名」的链接
      // 会 preventDefault 并走客户端路由（treatAsHtml），找不到页面模块就渲染自带 404，
      // 全程不发 HTTP 请求 —— 表现为「点链接 404、刷新才进得来」。
      // 带 target 的链接会被该处理器直接放行，走真实请求命中 nginx 反代。
      // 同理，以后新增任何指向非 VitePress 路由的站内链接，都必须带 target。
      copyright:
        '基于开源项目 ZCode（Apache-2.0）二次开发 · <a href="/feedback-admin" target="_blank" rel="noopener">反馈管理</a>',
    },
  },
});
