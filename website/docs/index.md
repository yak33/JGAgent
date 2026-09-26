---
layout: page
title: JGAgent — 捷关团队 AI 编程工作台
sidebar: false
aside: false
---

<div class="jp-home">

<header class="hero">
  <div class="logo"><span class="mark">JG</span></div>
  <h1>让 <span class="grad">JGAgent</span> 替你写代码</h1>
  <p class="tagline">捷关团队自己的 AI 编程工作台 —— 对话驱动、内置终端与 Git、接入捷关模型网关，开箱即用。</p>
  <div class="cta-row">
    <a class="btn btn-primary" href="/downloads/JGAgent-0.2.0-win-x64.exe" download>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      下载 Windows 版
    </a>
    <a class="btn btn-ghost" href="#install">安装指引</a>
  </div>
  <div class="platforms">
    <a class="platform" href="/downloads/JGAgent-0.2.0-win-x64.exe" download>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
      Windows <span class="ok">x64 · 可下载</span>
    </a>
    <span class="platform soon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>
      macOS <span class="tag">稍后即来</span>
    </span>
    <span class="platform soon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
      Linux <span class="tag">稍后即来</span>
    </span>
  </div>
  <p class="meta-note">v0.2.0 · Windows 10/11 x64 · 约 300MB · 内部预览版</p>
</header>

<section id="features">
  <h2 class="sec-title">为团队日常开发而生</h2>
  <p class="sec-sub">从写代码到跑命令、提交 Git，一个窗口搞定。</p>
  <div class="grid">
    <div class="card"><div class="icon">⚡</div><h3>捷关模型网关</h3><p>开箱直连公司模型网关，GLM / Claude 系列模型即装即用，只需填一次 Key。</p></div>
    <div class="card"><div class="icon">💬</div><h3>对话式任务流</h3><p>描述需求即可建任务，Agent 规划、改码、跑终端、看结果，全程可审可回滚。</p></div>
    <div class="card"><div class="icon">🧰</div><h3>内置终端与 Git</h3><p>集成终端、Git 面板、工作区文件树，不用在工具间来回切换。</p></div>
    <div class="card"><div class="icon">🎨</div><h3>个性化身份</h3><p>左下角设置自己的头像颜色与用户名，掷个骰子随机来一个，问候语专属。</p></div>
    <div class="card"><div class="icon">🔒</div><h3>数据本地隔离</h3><p>所有数据存放在本机 ~/.jgagent，不依赖账号体系，卸载即走。</p></div>
    <div class="card"><div class="icon">🌐</div><h3>中英双语</h3><p>界面与暗色 / 亮色主题随心切换，跟随系统或手动固定。</p></div>
  </div>
</section>

<section id="install">
  <h2 class="sec-title">三步开始</h2>
  <p class="sec-sub">全程约两分钟。</p>
  <div class="steps">
    <div class="step"><h3>下载安装</h3><p>点击上方按钮下载安装包，双击运行，按提示完成安装。</p></div>
    <div class="step"><h3>填写模型 Key</h3><p>首次启动在引导页选择「捷关模型网关」，粘贴你的 API Key。</p></div>
    <div class="step"><h3>打开工作区</h3><p>选择一个项目文件夹，开始第一个任务。数据都在 <code>~/.jgagent</code>。</p></div>
  </div>

  <div class="version-card">
    <div>
      <div class="version-tag">v0.2.0 <span class="pill">Preview</span></div>
      <p class="changelog-date">2026-09-26</p>
    </div>
    <ul class="changelog">
      <li>首个内部预览版：模型供应商页、捷关分组与本地身份</li>
      <li>界面西文字体优化，数据根独立于 ZCode（~/.jgagent）</li>
      <li>暂不支持自动更新，请回本页手动下载新版本</li>
    </ul>
  </div>
</section>

</div>

<style scoped>
.jp-home {
  --bg: var(--vp-c-bg, #0a0c10);
  --card: #121722;
  --border: rgba(255, 255, 255, 0.08);
  --text: var(--vp-c-text-1, #e8ecf2);
  --text-dim: var(--vp-c-text-2, #9aa6b5);
  --accent: #3b82f6;
  --accent-2: #22d3ee;
  --gradient: linear-gradient(120deg, #3b82f6, #22d3ee);
}

.jp-home .hero {
  position: relative;
  padding: 64px 0 72px;
  text-align: center;
  overflow: hidden;
}
.jp-home .hero::before {
  content: "";
  position: absolute;
  inset: -40% 0 auto;
  height: 80%;
  background:
    radial-gradient(600px 300px at 30% 30%, rgba(59, 130, 246, 0.18), transparent 70%),
    radial-gradient(600px 300px at 70% 30%, rgba(34, 211, 238, 0.14), transparent 70%);
  pointer-events: none;
}
.jp-home .logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(180deg, #000, #171a21);
  border: 1px solid var(--border);
  font-style: italic;
  font-weight: 800;
  font-size: 34px;
}
.jp-home .logo .mark {
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.jp-home h1 {
  margin-top: 28px;
  font-size: 44px;
  letter-spacing: -0.02em;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text);
  padding: 0;
  border: 0;
}
.jp-home h1 .grad {
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.jp-home .tagline {
  margin-top: 14px;
  font-size: 18px;
  color: var(--text-dim);
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}
.jp-home .cta-row { margin-top: 32px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.jp-home .btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.jp-home .btn-primary {
  background: var(--gradient);
  color: #04121f;
  box-shadow: 0 8px 30px rgba(34, 211, 238, 0.25);
}
.jp-home .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(34, 211, 238, 0.35); }
.jp-home .btn-ghost {
  border: 1px solid var(--border);
  color: var(--text);
  background: rgba(255, 255, 255, 0.03);
}
.jp-home .btn-ghost:hover { background: rgba(255, 255, 255, 0.07); transform: translateY(-2px); }
.jp-home .platforms { margin-top: 28px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.jp-home .platform {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  text-decoration: none;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
  transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
}
.jp-home a.platform:hover { border-color: rgba(59, 130, 246, 0.5); background: rgba(255, 255, 255, 0.06); transform: translateY(-2px); }
.jp-home .platform.soon { opacity: 0.55; border-style: dashed; cursor: default; }
.jp-home .platform .tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.12);
  color: #fde047;
}
.jp-home .platform .ok {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.12);
  color: var(--accent-2);
}
.jp-home .meta-note { margin-top: 16px; font-size: 13px; color: var(--vp-c-text-3, #6b7684); }

.jp-home section { padding: 48px 0; }
.jp-home .sec-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
  padding: 0;
  border: 0;
  margin: 0;
}
.jp-home .sec-sub { margin-top: 8px; color: var(--text-dim); }

.jp-home .grid {
  margin-top: 32px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.jp-home .card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.jp-home .card:hover { border-color: rgba(59, 130, 246, 0.4); transform: translateY(-3px); }
.jp-home .card .icon { font-size: 24px; }
.jp-home .card h3 { margin-top: 12px; font-size: 17px; font-weight: 700; color: var(--text); padding: 0; border: 0; }
.jp-home .card p { margin-top: 8px; font-size: 14px; color: var(--text-dim); }

.jp-home .steps {
  margin-top: 32px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  counter-reset: step;
}
.jp-home .step {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  counter-increment: step;
}
.jp-home .step::before {
  content: counter(step);
  display: inline-flex;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #04121f;
  background: var(--gradient);
}
.jp-home .step h3 { margin-top: 12px; font-size: 16px; font-weight: 700; color: var(--text); padding: 0; border: 0; }
.jp-home .step p { margin-top: 6px; font-size: 14px; color: var(--text-dim); }
.jp-home .step code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
  color: var(--accent-2);
  background: rgba(34, 211, 238, 0.08);
  padding: 1px 6px;
  border-radius: 6px;
}

.jp-home .version-card {
  margin-top: 32px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
}
.jp-home .version-tag { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 18px; color: var(--text); }
.jp-home .pill {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.15);
  color: #7cb0ff;
}
.jp-home .changelog-date { margin-top: 6px; font-size: 14px; color: var(--text-dim); }
.jp-home .changelog { font-size: 14px; color: var(--text-dim); list-style: disc; padding-left: 0; }
.jp-home .changelog li { margin-left: 18px; margin-top: 4px; }
</style>
