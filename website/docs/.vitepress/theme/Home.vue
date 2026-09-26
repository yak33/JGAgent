<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

// 版本与下载地址单点维护：发版时只改这里与 changelog 数组。
const DOWNLOAD_URL = "/downloads/JGAgent-0.3.1-win-x64.exe";
const VERSION = "0.3.1";

const changelog: Array<{ date: string; items: string[] }> = [
  {
    date: "2026-09-26",
    items: [
      "同步上游 ZCode v3.14.3：工作流引擎优化、并发可调与多项修复",
      "模型列表改为从捷关网关动态拉取，引导页填 Key 后自动同步",
      "修复引导页重复创建供应商、模型列表撑开页面等问题",
    ],
  },
];

const root = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  // 入场动效：进入视口时一次性触发 fade-up，只动 transform/opacity/blur，
  // 触发后立即 unobserve，避免滚动期常驻计算。
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer?.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  for (const el of root.value?.querySelectorAll<HTMLElement>(".reveal") ?? []) {
    observer.observe(el);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <div ref="root" class="jg-home">
    <!-- ============ Hero ============ -->
    <header class="hero">
      <span class="eyebrow reveal">内部预览 · v{{ VERSION }}</span>
      <h1 class="reveal" data-reveal-delay="1">
        写代码这件事，<br />
        交给 <em>JGAgent</em>
      </h1>
      <p class="tagline reveal" data-reveal-delay="2">
        捷关团队自己的 AI 编程工作台 —— 对话驱动、内置终端与 Git、
        直连捷关模型网关，开箱即用。
      </p>

      <div class="cta-row reveal" data-reveal-delay="3">
        <a class="btn-primary" :href="DOWNLOAD_URL" download>
          <span class="btn-label">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v12" /><path d="m7 11 5 5 5-5" />
              <path d="M4 19h16" />
            </svg>
            下载 Windows 版
          </span>
          <span class="btn-orb" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17 17 7" /><path d="M8 7h9v9" />
            </svg>
          </span>
        </a>
        <a class="btn-ghost" href="#install">
          安装指引
          <span class="btn-orb ghost-orb" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17 17 7" /><path d="M8 7h9v9" />
            </svg>
          </span>
        </a>
      </div>

      <div class="platforms reveal" data-reveal-delay="4">
        <a class="platform is-ready" :href="DOWNLOAD_URL" download>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8" /><path d="M12 17v4" />
          </svg>
          Windows <span class="platform-note">x64 · 可下载</span>
        </a>
        <span class="platform is-soon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v18" /><path d="M6 7h12l-1.5 8h-9L6 7Z" fill="currentColor" stroke="none" />
            <path d="M6 7 5 4h4l1 3" /><path d="m18 7 1-3h-4l-1 3" />
          </svg>
          macOS <span class="platform-note">稍后即来</span>
        </span>
        <span class="platform is-soon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m4 17 6-6-6-6" /><path d="M12 19h8" />
          </svg>
          Linux <span class="platform-note">稍后即来</span>
        </span>
      </div>
      <p class="meta-note">v{{ VERSION }} · Windows 10/11 x64 · 约 300MB · 内部预览版</p>
    </header>

    <!-- ============ 终端窗（双嵌套玻璃） ============ -->
    <div class="terminal reveal">
      <div class="terminal-shell">
        <div class="terminal-core">
          <div class="terminal-bar">
            <span class="dot" /><span class="dot" /><span class="dot" />
            <span class="terminal-title">JGAgent — 工作区 ~/projects/checkout</span>
          </div>
          <pre class="terminal-body"><code><span class="t-dim">$</span> jgagent
<span class="t-amber">→</span> 工作区已连接 · 数据根 ~/.jgagent
<span class="t-amber">→</span> 模型列表已从捷关网关同步（14 个）
<span class="t-dim">●</span> 任务 <span class="t-text">修复订单超时未重试</span>

  <span class="t-key">edit</span>  src/order/retry.ts        <span class="t-add">+24 −6</span>
  <span class="t-key">test</span>  pnpm test -- order         <span class="t-ok">通过 18/18</span>
  <span class="t-key">git</span>   commit -m "fix: 订单重试"   <span class="t-ok">已提交</span>

<span class="t-ok">✓ 任务完成 · 用时 1 分 12 秒 · 可一键回滚</span></code></pre>
        </div>
      </div>
    </div>

    <!-- ============ 特性 Bento ============ -->
    <section id="features" class="section">
      <span class="eyebrow reveal">能力</span>
      <h2 class="sec-title reveal" data-reveal-delay="1">为团队日常开发而生</h2>
      <p class="sec-sub reveal" data-reveal-delay="2">从写代码到跑命令、提交 Git，一个窗口搞定。</p>

      <div class="bento">
        <article class="bento-card span-4 reveal">
          <div class="card-inner">
            <svg class="card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 19h16" />
            </svg>
            <h3>捷关模型网关</h3>
            <p>
              开箱直连公司模型网关，GLM / Claude 系列即装即用。模型清单从网关实时拉取，
              只需填一次 Key。
            </p>
            <div class="model-chips" aria-hidden="true">
              <code>glm-5.3</code><code>glm-5.3-flash</code><code>claude-sonnet-5</code>
              <code>+11</code>
            </div>
          </div>
        </article>

        <article class="bento-card span-2 reveal" data-reveal-delay="1">
          <div class="card-inner">
            <svg class="card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
              <path d="M9 11h6" /><path d="M13 7 9 11l4 4" />
            </svg>
            <h3>对话式任务流</h3>
            <p>描述需求即可建任务，Agent 规划、改码、跑终端、看结果，全程可审可回滚。</p>
          </div>
        </article>

        <article class="bento-card span-2 reveal">
          <div class="card-inner">
            <svg class="card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m4 17 6-6-6-6" /><path d="M12 19h8" />
            </svg>
            <h3>内置终端与 Git</h3>
            <p>集成终端、Git 面板、工作区文件树，不在工具间来回切换。</p>
          </div>
        </article>

        <article class="bento-card span-2 reveal" data-reveal-delay="1">
          <div class="card-inner">
            <svg class="card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            <h3>个性化身份</h3>
            <p>左下角设置头像颜色与用户名，掷个骰子随机来一个，问候语专属。</p>
          </div>
        </article>

        <article class="bento-card span-2 reveal" data-reveal-delay="2">
          <div class="card-inner">
            <svg class="card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <h3>数据本地隔离</h3>
            <p>所有数据存放在本机 ~/.jgagent，不依赖账号体系，卸载即走。</p>
          </div>
        </article>

        <article class="bento-card span-6 reveal">
          <div class="card-inner row-inner">
            <div>
              <h3>中英双语 · 明暗随心</h3>
              <p>界面中英文切换，暗色 / 亮色主题跟随系统或手动固定。</p>
            </div>
            <div class="locale-switch" aria-hidden="true">
              <span class="locale active">中</span>
              <span class="locale">EN</span>
              <span class="locale-sep" />
              <span class="locale-theme">◐</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ============ 三步开始（编辑式） ============ -->
    <section id="install" class="section">
      <span class="eyebrow reveal">开始</span>
      <h2 class="sec-title reveal" data-reveal-delay="1">三步开始</h2>
      <p class="sec-sub reveal" data-reveal-delay="2">全程约两分钟。</p>

      <ol class="steps">
        <li class="reveal">
          <span class="step-no">01</span>
          <h3>下载安装</h3>
          <p>点击上方按钮下载安装包，双击运行，按提示完成安装。</p>
        </li>
        <li class="reveal" data-reveal-delay="1">
          <span class="step-no">02</span>
          <h3>填写模型 Key</h3>
          <p>首次启动在引导页选择「捷关模型网关」，粘贴你的 API Key，模型自动就位。</p>
        </li>
        <li class="reveal" data-reveal-delay="2">
          <span class="step-no">03</span>
          <h3>打开工作区</h3>
          <p>选择一个项目文件夹，开始第一个任务。数据都在 <code>~/.jgagent</code>。</p>
        </li>
      </ol>
    </section>

    <!-- ============ 版本卡（双嵌套） ============ -->
    <section class="section last">
      <div class="release reveal">
        <div class="release-shell">
          <div class="release-core">
            <div class="release-head">
              <div>
                <div class="release-version">v{{ VERSION }} <span class="pill">Preview</span></div>
                <p v-for="entry in changelog" :key="entry.date" class="release-date">
                  {{ entry.date }}
                </p>
              </div>
              <a class="btn-primary btn-small" :href="DOWNLOAD_URL" download>
                <span class="btn-label">下载 v{{ VERSION }}</span>
                <span class="btn-orb" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 19h16" />
                  </svg>
                </span>
              </a>
            </div>
            <ul class="release-notes">
              <li v-for="item in changelog[0]!.items" :key="item">{{ item }}</li>
            </ul>
            <p class="release-more">
              历史版本与完整变更见
              <a href="/changelog" class="inline-link">更新日志</a>。当前暂不支持自动更新，新版本请回本页手动下载。
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.jg-home {
  --amber: #f5b453;
  --hairline: rgba(255, 255, 255, 0.08);
  --text: #f2f4f8;
  --text-dim: #98a0ad;
  --text-faint: #6b7280;
  --card-bg: rgba(255, 255, 255, 0.028);
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
  color: var(--text);
}

/* ---------- 入场动效 ---------- */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  filter: blur(6px);
  transition:
    opacity 0.9s var(--ease),
    transform 0.9s var(--ease),
    filter 0.9s var(--ease);
  transition-delay: calc(var(--reveal-step, 0) * 90ms);
}
.reveal[data-reveal-delay="1"] { --reveal-step: 1; }
.reveal[data-reveal-delay="2"] { --reveal-step: 2; }
.reveal[data-reveal-delay="3"] { --reveal-step: 3; }
.reveal[data-reveal-delay="4"] { --reveal-step: 4; }
.reveal.in {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

/* ---------- Hero ---------- */
.hero {
  padding: 148px 0 40px;
  text-align: center;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(245, 180, 83, 0.25);
  background: rgba(245, 180, 83, 0.07);
  color: var(--amber);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
h1 {
  margin: 26px 0 0;
  font-size: clamp(40px, 6.4vw, 76px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.025em;
  color: var(--text);
}
h1 em {
  font-style: italic;
  color: var(--amber);
}
.tagline {
  margin: 22px auto 0;
  max-width: 620px;
  font-size: clamp(15px, 1.8vw, 18px);
  line-height: 1.75;
  color: var(--text-dim);
}

/* ---------- CTA：药丸按钮 + 内嵌图标圆 ---------- */
.cta-row {
  margin-top: 38px;
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-primary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 22px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition:
    transform 0.5s var(--ease),
    box-shadow 0.5s var(--ease),
    background-color 0.5s var(--ease),
    border-color 0.5s var(--ease);
}
.btn-label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
.btn-primary {
  background: var(--amber);
  color: #171003;
  box-shadow: 0 10px 40px rgba(245, 180, 83, 0.22);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 52px rgba(245, 180, 83, 0.3);
}
.btn-primary:active,
.btn-ghost:active {
  transform: scale(0.98);
}
.btn-ghost {
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-2px);
}
.btn-orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(23, 16, 3, 0.1);
  transition: transform 0.5s var(--ease);
}
.btn-primary:hover .btn-orb {
  transform: translate(2px, -1px) scale(1.05);
}
.ghost-orb {
  background: rgba(255, 255, 255, 0.08);
}
.btn-ghost:hover .ghost-orb {
  transform: translate(2px, -1px) scale(1.05);
}
.btn-small {
  padding: 6px 6px 6px 18px;
  font-size: 14px;
}
.btn-small .btn-orb {
  width: 28px;
  height: 28px;
}

/* ---------- 平台行 ---------- */
.platforms {
  margin-top: 34px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.platform {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  background: var(--card-bg);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.5s var(--ease), transform 0.5s var(--ease),
    background-color 0.5s var(--ease);
}
a.platform:hover {
  border-color: rgba(245, 180, 83, 0.4);
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
}
.platform.is-soon {
  opacity: 0.5;
  border-style: dashed;
  cursor: default;
}
.platform-note {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-faint);
  letter-spacing: 0.04em;
}
.platform.is-ready .platform-note {
  color: var(--amber);
}
.meta-note {
  margin-top: 18px;
  font-size: 13px;
  color: var(--text-faint);
  letter-spacing: 0.02em;
}

/* ---------- 终端窗：双嵌套（外壳 + 内核同心圆角） ---------- */
.terminal {
  margin: 56px auto 0;
  max-width: 880px;
}
.terminal-shell {
  padding: 7px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--hairline);
}
.terminal-core {
  border-radius: 20px;
  background: #0a0b0f;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.terminal-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 13px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}
.terminal-title {
  margin-left: 10px;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  color: var(--text-faint);
  letter-spacing: 0.03em;
}
.terminal-body {
  margin: 0;
  padding: 22px 24px 26px;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  line-height: 1.95;
  color: var(--text-dim);
  overflow-x: auto;
}
.t-dim { color: var(--text-faint); }
.t-amber { color: var(--amber); }
.t-text { color: var(--text); }
.t-key { color: #c9d4e3; letter-spacing: 0.06em; }
.t-add { color: #7ee787; }
.t-ok { color: #7ee787; }

/* ---------- 区块骨架 ---------- */
.section {
  padding: 104px 0 8px;
}
.section.last {
  padding-bottom: 128px;
}
.sec-title {
  margin: 18px 0 0;
  font-size: clamp(28px, 3.6vw, 40px);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}
.sec-sub {
  margin: 12px 0 0;
  color: var(--text-dim);
  font-size: 16px;
}

/* ---------- Bento ---------- */
.bento {
  margin-top: 44px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}
.span-2 { grid-column: span 2; }
.span-4 { grid-column: span 4; }
.span-6 { grid-column: span 6; }
.bento-card {
  border-radius: 24px;
  padding: 7px;
  background: rgba(255, 255, 255, 0.028);
  border: 1px solid var(--hairline);
  transition: transform 0.6s var(--ease), border-color 0.6s var(--ease),
    background-color 0.6s var(--ease);
}
.bento-card:hover {
  transform: translateY(-4px);
  border-color: rgba(245, 180, 83, 0.28);
  background: rgba(255, 255, 255, 0.045);
}
.card-inner {
  border-radius: 17.5px;
  background: #0b0c11;
  border: 1px solid rgba(255, 255, 255, 0.045);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  padding: 26px 26px 28px;
  height: 100%;
  box-sizing: border-box;
}
.card-icon {
  color: var(--amber);
}
.bento-card h3 {
  margin: 16px 0 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
}
.bento-card p {
  margin: 9px 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-dim);
}
.model-chips {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.model-chips code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  background: rgba(245, 180, 83, 0.05);
  color: var(--amber);
}
.row-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  flex-wrap: wrap;
}
.locale-switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.03);
}
.locale {
  padding: 5px 13px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
}
.locale.active {
  background: rgba(245, 180, 83, 0.14);
  color: var(--amber);
}
.locale-sep {
  width: 1px;
  height: 16px;
  background: var(--hairline);
}
.locale-theme {
  padding: 5px 11px;
  font-size: 13px;
  color: var(--text-dim);
}

/* ---------- 三步（编辑式） ---------- */
.steps {
  margin: 48px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  counter-reset: step;
}
.steps li {
  border-top: 1px solid var(--hairline);
  padding-top: 22px;
}
.step-no {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  color: var(--amber);
  letter-spacing: 0.14em;
}
.steps h3 {
  margin: 14px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.steps p {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-dim);
}
.steps code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12.5px;
  color: var(--amber);
  background: rgba(245, 180, 83, 0.08);
  padding: 2px 7px;
  border-radius: 6px;
}

/* ---------- 版本卡：双嵌套 ---------- */
.release {
  margin-top: 48px;
}
.release-shell {
  padding: 7px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--hairline);
}
.release-core {
  border-radius: 20px;
  background: #0b0c11;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  padding: 30px 32px 28px;
}
.release-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.release-version {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
}
.pill {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 11px;
  border-radius: 999px;
  background: rgba(245, 180, 83, 0.12);
  color: var(--amber);
}
.release-date {
  margin: 8px 0 0;
  font-size: 13.5px;
  color: var(--text-faint);
}
.release-notes {
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}
.release-notes li {
  position: relative;
  padding-left: 20px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-dim);
}
.release-notes li::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 0.72em;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(245, 180, 83, 0.55);
}
.release-more {
  margin: 20px 0 0;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 13px;
  color: var(--text-faint);
}
.inline-link {
  color: var(--amber);
  text-decoration: none;
  border-bottom: 1px solid rgba(245, 180, 83, 0.35);
  transition: border-color 0.4s var(--ease);
}
.inline-link:hover {
  border-bottom-color: var(--amber);
}

/* ---------- 移动端 ---------- */
@media (max-width: 900px) {
  .bento {
    grid-template-columns: repeat(2, 1fr);
  }
  .span-2,
  .span-4 {
    grid-column: span 1;
  }
  .span-6 {
    grid-column: span 2;
  }
  .steps {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
@media (max-width: 767px) {
  .jg-home {
    padding: 0 18px;
  }
  .hero {
    padding: 116px 0 24px;
  }
  .bento {
    grid-template-columns: 1fr;
  }
  .span-6 {
    grid-column: span 1;
  }
  .terminal-body {
    font-size: 11.5px;
    padding: 16px 16px 20px;
  }
  .section {
    padding: 72px 0 8px;
  }
  .section.last {
    padding-bottom: 88px;
  }
}
</style>
