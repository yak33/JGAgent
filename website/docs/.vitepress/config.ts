import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "JGAgent",
  description: "捷关团队 AI 编程工作台，基于开源 ZCode 二次开发。",
  // 首页为整版暗色设计，站点统一强制暗色，避免浅色模式下顶栏与首页割裂。
  appearance: "dark",
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "更新日志", link: "/changelog" },
    ],
    outline: { level: [2, 3] },
    footer: {
      message: "捷关公司内部工具 · 仅限内部员工使用",
      copyright: "基于开源项目 ZCode（Apache-2.0）二次开发",
    },
  },
});
