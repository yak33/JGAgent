import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import JgHome from "./Home.vue";
import "./custom.css";

// 扩展默认主题：仅注册首页组件与全局样式，changelog 等内容页仍走默认排版。
export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout),
  enhanceApp({ app }: { app: import("vue").App }) {
    app.component("JgHome", JgHome);
  },
};
