<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

// 版本与下载地址单点维护：发版时只改这里与 latest（需与 changelog.md 最新一节一致）。
const DOWNLOAD_URL = "/downloads/JGAgent-latest-win-x64.exe";
const VERSION = "0.3.3";
const RELEASE_DATE = "2026-09-27";

const latest = [
  "应用内自动更新上线：新版本应用内提示，差分下载只拉变化部分",
  "发版即推送全体客户端；官网始终提供最新安装包",
];

// Hero 规格表：macOS / Linux 与 Windows 并列，仅以"稍后即来"弱化展示。
const specRows = [
  { k: "版本", v: `v${VERSION} Preview`, faint: false },
  { k: "Windows", v: "10 · 11 x64", faint: false },
  { k: "macOS", v: "稍后即来", faint: true },
  { k: "Linux", v: "稍后即来", faint: true },
  { k: "更新", v: "应用内自动更新", faint: false },
];

// 编程模式界面示意里的 diff 片段。放在脚本里插值渲染：
// Vue 模板会压缩静态文本中的连续空格，写死在模板里代码缩进会丢失。
const diffLines: Array<{ no: string; cls: string; code: string }> = [
  { no: "41", cls: "", code: "  } catch (err) {" },
  { no: "42", cls: "is-del", code: "-    if (err instanceof NetworkError) {" },
  { no: "42", cls: "is-add", code: "+    if (isRetryable(err)) {" },
];

// 办公模式示意：摘要卡片行
const summaryItems = [
  "读取 6 场会议纪要，提取 14 条决议",
  "汇总 9 个任务进度，标出 2 个风险点",
  "周报草稿已生成，等你确认后发出",
];

// 办公模式示意：主动任务推荐 chips
const suggestions = ["整理下载文件夹", "汇总本周周报", "查行业公开数据"];

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
    <!-- ============ Hero：左文案 + 右规格表（非对称） ============ -->
    <header class="hero">
      <div class="hero-copy">
        <p class="kicker reveal"><span class="kicker-dot" />捷关团队·荣誉出品 · v{{ VERSION }}</p>
        <h1 class="reveal" data-reveal-delay="1">
          写代码，办日常，<br />
          都交给 <span class="brand">JGAgent</span>
        </h1>
        <p class="tagline reveal" data-reveal-delay="2">
          捷关团队开发的 AI 工作台。编程模式深入终端、Git 与每一行代码变更；办公模式只看摘要与结果，
          替你处理日常事务。直连捷关模型网关，装好就能用。
        </p>
        <div class="mode-chips reveal" data-reveal-delay="3">
          <span class="chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m4 17 6-5-6-5" /><path d="M12 19h8" />
            </svg>
            编程模式 · 给开发者
          </span>
          <span class="chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
            办公模式 · 给办公人群
          </span>
        </div>
        <div class="cta-row reveal" data-reveal-delay="4">
          <a class="btn-primary" :href="DOWNLOAD_URL" download>
            下载 Windows 版
            <span class="btn-orb" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" />
              </svg>
            </span>
          </a>
          <a class="text-link" href="#modes">
            了解双模式
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>

      <dl class="hero-spec reveal" data-reveal-delay="4">
        <div v-for="row in specRows" :key="row.k" class="spec-row" :class="{ 'is-faint': row.faint }">
          <dt>{{ row.k }}</dt>
          <dd>{{ row.v }}</dd>
        </div>
      </dl>
    </header>

    <!-- ============ 01 双模式：编程 / 办公 并排面板 ============ -->
    <section id="modes" class="section">
      <div class="sec-head">
        <p class="kicker reveal">01 / 双模式</p>
        <h2 class="sec-title reveal" data-reveal-delay="1">两种模式，各就各位</h2>
        <p class="sec-sub reveal" data-reveal-delay="2">
          首次启动按你的角色选择，之后随时一键切换。同一个 JGAgent，两副界面。
        </p>
      </div>

      <div class="mode-panels">
        <!-- 编程模式面板：执行日志 + 代码变更 -->
        <article class="mode-panel reveal">
          <header class="panel-head">
            <span class="panel-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m4 17 6-5-6-5" /><path d="M12 19h8" />
              </svg>
            </span>
            <div>
              <h3>编程模式</h3>
              <p class="panel-who">给开发者 · 完整过程</p>
            </div>
          </header>
          <p class="panel-desc">完整呈现每条命令、输出与代码变更，任务全程可审、可回滚。</p>

          <div class="mock" aria-hidden="true">
            <div class="mock-titlebar">
              <span class="dot" /><span class="dot" /><span class="dot" />
              <span class="mock-title">checkout — 编程模式</span>
            </div>
            <div class="mock-body">
              <div class="bubble-row">
                <span class="bubble">订单超时后没有重试，帮我修一下，顺便补个测试。</span>
              </div>
              <div class="step-log">
                <div class="step-row">
                  <span class="step-key">edit</span>
                  <span class="step-arg">src/order/retry.ts</span>
                  <span class="step-res"><span class="t-add">+24</span> <span class="t-del">−6</span></span>
                </div>
                <div class="step-row">
                  <span class="step-key">run</span>
                  <span class="step-arg">pnpm test -- order</span>
                  <span class="step-res t-ok">通过 18/18</span>
                </div>
                <div class="step-row">
                  <span class="step-key">git</span>
                  <span class="step-arg">commit "fix: 订单超时重试"</span>
                  <span class="step-res t-ok">已提交</span>
                </div>
              </div>
              <div class="diff">
                <div v-for="line in diffLines" :key="line.cls + line.code" class="diff-line"
                  :class="line.cls">
                  <span class="ln">{{ line.no }}</span>{{ line.code }}
                </div>
              </div>
            </div>
          </div>
        </article>

        <!-- 办公模式面板：摘要 + 主动任务推荐 -->
        <article class="mode-panel reveal" data-reveal-delay="1">
          <header class="panel-head">
            <span class="panel-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </span>
            <div>
              <h3>办公模式</h3>
              <p class="panel-who">给办公人群 · 摘要与结果</p>
            </div>
          </header>
          <p class="panel-desc">不碰命令行，只看操作摘要与结果。它主动推荐该做的事，说进展，不说过程。</p>

          <div class="mock" aria-hidden="true">
            <div class="mock-titlebar">
              <span class="dot" /><span class="dot" /><span class="dot" />
              <span class="mock-title">周报素材 — 办公模式</span>
            </div>
            <div class="mock-body">
              <div class="bubble-row">
                <span class="bubble">把这周的会议和任务，整理成一份周报素材。</span>
              </div>
              <div class="summary-card">
                <div v-for="item in summaryItems" :key="item" class="summary-row">
                  <svg class="check" width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m4 12.5 5 5L20 6.5" />
                  </svg>
                  <span>{{ item }}</span>
                </div>
              </div>
              <div class="suggest-row">
                <span v-for="s in suggestions" :key="s" class="suggest-chip">{{ s }}</span>
              </div>
              <p class="suggest-note">主动任务推荐 · 仅办公模式</p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ============ 02 能力：网关主卡 + 四张卡 ============ -->
    <section id="features" class="section">
      <div class="sec-head">
        <p class="kicker reveal">02 / 能力</p>
        <h2 class="sec-title reveal" data-reveal-delay="1">一个窗口，装下整条工作流</h2>
        <p class="sec-sub reveal" data-reveal-delay="2">从模型接入到任务落地，少走弯路。</p>
      </div>

      <article class="lead-card reveal">
        <div class="lead-copy">
          <h3>直连捷关模型网关</h3>
          <p>
            GLM 与 Claude 系列即装即用，模型清单从网关实时拉取。引导页填一次 Key，团队的工作台就就位了。
          </p>
        </div>
        <div class="lead-models" aria-hidden="true">
          <div class="model-row"><span>glm-5.3</span><span class="model-tag">默认</span></div>
          <div class="model-row"><span>glm-5.3-flash</span><span class="model-tag">快速</span></div>
          <div class="model-row"><span>claude-sonnet-5</span><span class="model-tag">编码</span></div>
          <div class="model-row is-more"><span>更多模型</span><span class="model-src">网关 /v1/models 实时同步</span></div>
        </div>
      </article>

      <ul class="feature-grid">
        <li class="feature-card reveal">
          <span class="feature-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
            </svg>
          </span>
          <h3>对话式任务流</h3>
          <p>描述需求即可建任务，Agent 规划、执行、验证，每一步可审可回滚。</p>
        </li>
        <li class="feature-card reveal" data-reveal-delay="1">
          <span class="feature-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l1.7 4.6L18 9.2l-4.3 1.6L12 15.4l-1.7-4.6L6 9.2l4.3-1.6z" />
              <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
            </svg>
          </span>
          <h3 class="has-tag">主动任务推荐 <span class="mode-tag">办公模式</span></h3>
          <p>结合你的工作场景给出可执行的下一步：整理文件、汇总周报、查证数据，不合心意就换一批。</p>
        </li>
        <li class="feature-card reveal">
          <span class="feature-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
            </svg>
          </span>
          <h3>定时与长任务</h3>
          <p>周五傍晚自动汇总一周进展；跑批、巡检交给计划任务，到点自启动，结果回到工作台。</p>
        </li>
        <li class="feature-card reveal" data-reveal-delay="1">
          <span class="feature-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6z" />
              <path d="m9.5 12 2 2 3.5-4" />
            </svg>
          </span>
          <h3>数据本地隔离</h3>
          <p>所有数据都在本机，不依赖账号体系。</p>
        </li>
      </ul>
    </section>

    <!-- ============ 03 三步开始：左侧标题吸顶 + 右侧步骤 ============ -->
    <section id="install" class="section install">
      <div class="sec-head install-head">
        <p class="kicker reveal">03 / 开始</p>
        <h2 class="sec-title reveal" data-reveal-delay="1">三分钟，开工</h2>
        <p class="sec-sub reveal" data-reveal-delay="2">不注册、不登录，装完即用。</p>
      </div>

      <ol class="steps">
        <li class="reveal">
          <span class="step-no">01</span>
          <div>
            <h3>下载安装</h3>
            <p>下载安装包，双击运行。安装包暂未签名：Windows 弹出 SmartScreen 时，点「更多信息」→「仍要运行」。</p>
          </div>
        </li>
        <li class="reveal" data-reveal-delay="1">
          <span class="step-no">02</span>
          <div>
            <h3>填写模型 Key</h3>
            <p>首次启动选「捷关模型网关」，粘贴 API Key，模型清单自动同步就位。</p>
          </div>
        </li>
        <li class="reveal" data-reveal-delay="2">
          <span class="step-no">03</span>
          <div>
            <h3>选模式，开工</h3>
            <p>按你的角色选编程或办公模式，打开项目文件夹，开始第一个任务。</p>
          </div>
        </li>
      </ol>
    </section>

    <!-- ============ 最新版本 ============ -->
    <section class="section last">
      <article class="release reveal">
        <div class="release-info">
          <p class="kicker">最新版本 · {{ RELEASE_DATE }}</p>
          <h2 class="release-version">v{{ VERSION }} <span class="tag">Preview</span></h2>
          <ul class="release-notes">
            <li v-for="item in latest" :key="item">{{ item }}</li>
          </ul>
          <p class="release-more">
            历史版本与完整变更见 <a href="/changelog" class="inline-link">更新日志</a>。
          </p>
        </div>
        <a class="btn-primary" :href="DOWNLOAD_URL" download>
          下载 Windows 版
          <span class="btn-orb" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" />
            </svg>
          </span>
        </a>
      </article>
    </section>
  </div>
</template>

<style scoped>
.jg-home {
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 28px;
  color: var(--jg-text);
  /* 统一定义在根上，子元素（含 .text-link）都能取到 */
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
}

/* 锚点定位时避开固定导航 */
.section {
  scroll-margin-top: 96px;
}

/* ---------- 入场动效 ---------- */
.reveal {
  opacity: 0;
  transform: translateY(24px);
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

/* ---------- 通用小标签：等宽小字 + 琥珀 ---------- */
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  letter-spacing: 0.04em;
  color: var(--jg-amber-text);
}
.kicker-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--jg-amber);
  box-shadow: 0 0 0 4px var(--jg-amber-soft);
}

/* ---------- Hero ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 72px;
  align-items: end;
  padding: 150px 0 0;
}
h1 {
  margin: 26px 0 0;
  font-size: clamp(40px, 5.2vw, 60px);
  font-weight: 700;
  line-height: 1.16;
  letter-spacing: -0.03em;
  color: var(--jg-text);
  text-wrap: balance;
}
.brand {
  color: var(--jg-amber-text);
}
.tagline {
  margin: 24px 0 0;
  max-width: 34em;
  font-size: 16px;
  line-height: 1.8;
  color: var(--jg-text-dim);
  text-wrap: pretty;
}
.mode-chips {
  margin-top: 22px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--jg-hairline);
  background: var(--jg-surface);
  font-size: 13px;
  color: var(--jg-text);
}
.chip svg {
  color: var(--jg-amber-text);
}
.cta-row {
  margin-top: 26px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

/* 主按钮：药丸 + 内嵌圆形图标 */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 22px;
  border-radius: 999px;
  background: var(--jg-amber);
  color: var(--jg-on-amber);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 12px 40px -8px var(--jg-amber-soft);
  transition:
    transform 0.5s var(--ease),
    box-shadow 0.5s var(--ease),
    filter 0.5s var(--ease);
}
.btn-primary:hover {
  transform: translateY(-2px);
  filter: brightness(1.04);
}
.btn-primary:active {
  transform: translateY(0) scale(0.98);
}
.btn-orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: rgba(26, 18, 6, 0.14);
  transition: transform 0.5s var(--ease);
}
.btn-primary:hover .btn-orb {
  transform: translateY(2px);
}

/* 次级入口用文字链接，避免"一实一虚"双按钮的模板感 */
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--jg-text);
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
}
.text-link svg {
  color: var(--jg-text-dim);
  transition: transform 0.4s var(--ease);
}
.text-link:hover svg {
  transform: translateX(4px);
}
.btn-primary:focus-visible,
.text-link:focus-visible,
.inline-link:focus-visible {
  outline: 2px solid var(--jg-amber);
  outline-offset: 4px;
  border-radius: 999px;
}

/* 规格表 */
.hero-spec {
  margin: 0 0 6px;
  border-top: 1px solid var(--jg-hairline);
}
.spec-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 0;
  border-bottom: 1px solid var(--jg-hairline);
}
.spec-row dt {
  font-size: 13px;
  color: var(--jg-text-faint);
}
.spec-row dd {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--jg-text);
  font-variant-numeric: tabular-nums;
}
.spec-row.is-faint dd {
  color: var(--jg-text-faint);
}

/* ---------- 区块骨架 ---------- */
.section {
  padding: 104px 0 0;
}
.section.last {
  padding-bottom: 120px;
}
.sec-title {
  margin: 16px 0 0;
  padding: 0;
  border: 0;
  font-size: clamp(30px, 3.6vw, 40px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.025em;
  color: var(--jg-text);
}
.sec-sub {
  margin: 14px 0 0;
  max-width: 34em;
  color: var(--jg-text-dim);
  font-size: 16px;
  line-height: 1.7;
}

/* ---------- 01 双模式：并排面板（grid 拉伸天然等高） ---------- */
.mode-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 56px;
  align-items: stretch;
}
.mode-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 24px 24px;
  border-radius: 20px;
  border: 1px solid var(--jg-hairline);
  background: var(--jg-surface);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.panel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--jg-amber-soft);
  color: var(--jg-amber-text);
}
.panel-head h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--jg-text);
}
.panel-who {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--jg-text-faint);
}
.panel-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--jg-text-dim);
}

/* 界面示意窗：flex:1 撑满剩余高度，两版内容长短不一时底边仍对齐 */
.mock {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid var(--jg-hairline);
  background: var(--jg-bg-deep);
  overflow: hidden;
}
.mock-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--jg-hairline);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--jg-surface-soft);
}
.dark .dot {
  background: rgba(255, 244, 228, 0.12);
}
.mock-title {
  margin-left: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--jg-text-faint);
}
.mock-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
}
.bubble-row {
  display: flex;
  justify-content: flex-end;
}
.bubble {
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 12px 12px 4px 12px;
  background: var(--jg-bubble);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--jg-text);
}
.step-log {
  border: 1px solid var(--jg-hairline);
  border-radius: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}
.step-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 10px;
  padding: 9px 12px;
  align-items: center;
}
.step-row + .step-row {
  border-top: 1px solid var(--jg-hairline);
}
.step-key {
  color: var(--jg-amber-text);
}
.step-arg {
  color: var(--jg-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.t-ok,
.t-add { color: var(--jg-add); }
.t-del { color: var(--jg-del); }

.diff {
  border-radius: 10px;
  background: var(--jg-bg);
  border: 1px solid var(--jg-hairline);
  padding: 8px 0;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  line-height: 1.9;
  color: var(--jg-text-dim);
  white-space: pre;
  overflow: hidden;
}
.diff-line {
  padding: 0 12px;
}
.diff-line.is-del {
  background: var(--jg-del-bg);
  color: var(--jg-del);
}
.diff-line.is-add {
  background: var(--jg-add-bg);
  color: var(--jg-add);
}
.ln {
  display: inline-block;
  width: 26px;
  color: var(--jg-text-faint);
  opacity: 0.7;
}

/* 办公模式示意 */
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--jg-surface-soft);
}
.summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--jg-text-dim);
}
.summary-row .check {
  flex: none;
  color: var(--jg-amber-text);
}
.suggest-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.suggest-chip {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--jg-amber-soft);
  color: var(--jg-amber-text);
  font-size: 11.5px;
}
.suggest-note {
  margin: 2px 0 0;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: var(--jg-text-faint);
}

/* ---------- 02 能力：主卡（左文右清单，纵向居中） ---------- */
.lead-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: center;
  margin-top: 56px;
  border-radius: 22px;
  border: 1px solid var(--jg-hairline);
  background: var(--jg-surface);
  overflow: hidden;
}
.lead-copy {
  padding: 36px 44px;
}
.lead-copy h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--jg-text);
}
.lead-copy p {
  margin: 14px 0 0;
  max-width: 30em;
  font-size: 15px;
  line-height: 1.8;
  color: var(--jg-text-dim);
}
.lead-models {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 28px;
  border-left: 1px solid var(--jg-hairline);
  background: var(--jg-surface-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
}
.model-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  color: var(--jg-text);
}
.model-row + .model-row {
  border-top: 1px solid var(--jg-hairline);
}
.model-tag {
  font-family: var(--vp-font-family-base);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--jg-amber-soft);
  color: var(--jg-amber-text);
}
.model-row.is-more {
  font-size: 12px;
  color: var(--jg-text-faint);
}
.model-src {
  font-size: 10.5px;
}

/* 能力卡片：grid 行内自动等高 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}
.feature-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px 26px;
  border-radius: 16px;
  border: 1px solid var(--jg-hairline);
  background: var(--jg-surface);
}
.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--jg-amber-soft);
  color: var(--jg-amber-text);
}
.feature-card h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--jg-text);
}
.feature-card h3.has-tag {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mode-tag {
  font-size: 11px;
  font-weight: 400;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--jg-amber-soft);
  color: var(--jg-amber-text);
}
.feature-card p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--jg-text-dim);
}

/* ---------- 03 三步开始 ---------- */
.install {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 72px;
  align-items: start;
}
.install-head {
  position: sticky;
  top: 120px;
}
.steps {
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  padding: 28px 0;
  border-top: 1px solid var(--jg-hairline);
}
.steps li:last-child {
  border-bottom: 1px solid var(--jg-hairline);
}
.step-no {
  font-family: var(--vp-font-family-mono);
  font-size: 26px;
  line-height: 1.2;
  font-weight: 300;
  color: var(--jg-amber-text);
  font-variant-numeric: tabular-nums;
}
.steps h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--jg-text);
}
.steps p {
  margin: 8px 0 0;
  max-width: 36em;
  font-size: 14px;
  line-height: 1.75;
  color: var(--jg-text-dim);
}

/* ---------- 最新版本 ---------- */
.release {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  padding: 40px 48px;
  border-radius: 24px;
  border: 1px solid var(--jg-hairline);
  background: var(--jg-surface);
}
.release-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.release-version {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
  font-size: clamp(28px, 3.4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--jg-text);
  font-variant-numeric: tabular-nums;
}
.tag {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--jg-amber-soft);
  color: var(--jg-amber-text);
}
.release-notes {
  margin: 0;
  padding: 0;
  list-style: none;
}
.release-notes li {
  position: relative;
  padding-left: 20px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--jg-text-dim);
}
.release-notes li::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 0.8em;
  width: 8px;
  height: 1px;
  background: var(--jg-amber);
}
.release-more {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--jg-text-faint);
}
.inline-link {
  color: var(--jg-amber-text);
  text-decoration: none;
  border-bottom: 1px solid var(--jg-amber-soft);
  transition: border-color 0.4s var(--ease);
}
.inline-link:hover {
  border-bottom-color: var(--jg-amber-text);
}

/* ---------- 响应式 ---------- */
@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 48px;
    padding-top: 120px;
  }
  .hero-spec {
    max-width: 420px;
  }
  .install {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .install-head {
    position: static;
  }
}
@media (max-width: 767px) {
  .jg-home {
    padding: 0 20px;
  }
  .mode-panels,
  .feature-grid {
    grid-template-columns: 1fr;
  }
  .lead-card {
    grid-template-columns: 1fr;
  }
  .lead-models {
    border-left: 0;
    border-top: 1px solid var(--jg-hairline);
    padding: 16px 26px;
  }
  .section {
    padding-top: 88px;
  }
  .section.last {
    padding-bottom: 88px;
  }
  .steps li {
    grid-template-columns: 52px minmax(0, 1fr);
  }
  .release {
    flex-direction: column;
    align-items: flex-start;
    padding: 32px 26px;
    gap: 28px;
  }
}

/* 系统开启"减少动态效果"时直接显示终态 */
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }
}
</style>
