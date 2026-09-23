import {
  BUILTIN_PROVIDER_TEMPLATE_IDS,
  type AppSettings,
  type Locale,
  type ProviderFamilyDomain,
} from "@zcode/shared";
import type { ModelSelectionView } from "@zcode/services";
import { encodeCustomModelValue } from "@/lib/zcodeCustomModelValue.js";

export type ApiKeyProviderChoice = "jgagent" | "custom";

export const CUSTOM_PROVIDER_BASE_URL_PLACEHOLDER = "https://your-gateway.example.com/v1";

export function resolveLoginApiKeyDefaultProvider(locale: Locale): ApiKeyProviderChoice {
  return "jgagent";
}

// 自定义供应商不基于目录模板创建，返回 null 表示没有 templateId 可查。
export function resolveLoginApiKeyTemplateId(
  choice: ApiKeyProviderChoice,
): string | null {
  return choice === "jgagent" ? "jgagent-gateway" : null;
}

export function resolveLoginApiKeyProviderLabel(choice: ApiKeyProviderChoice): string {
  if (choice === "jgagent") {
    // Welcome Screen API Key 错误提示需要使用 BigModel 品牌固定写法。
    return "捷关模型网关";
  }
  return "自定义供应商";
}

// 校验自定义供应商 API 地址：必须是可以被 URL 解析且协议为 http/https 的完整地址。
// 返回 null 表示通过，否则返回硬编码中文错误文案（本文件已有固定中文先例）。
export function validateCustomProviderBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "请输入 API 地址。";
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "API 地址格式不正确，请输入以 http/https 开头的完整 URL。";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "API 地址仅支持 http 或 https 协议。";
  }
  return null;
}

// 自定义供应商显示名优先取 URL host，方便用户在设置页分辨多个自定义接入点。
export function resolveCustomProviderDisplayName(baseUrl: string): string {
  try {
    const host = new URL(baseUrl.trim()).host;
    return host || "自定义供应商";
  } catch {
    return "自定义供应商";
  }
}

// 与设置页"添加自定义供应商"共用 createPersonalProvider 服务：
// 通过 initialConfig 直接落 OpenAI 兼容协议与 baseUrl，模型列表留空待设置页补充。
export function buildCustomProviderInitialConfig(baseUrl: string, apiKey: string) {
  // 去掉尾部斜杠，与设置页 ProviderDraftSave 的 normalizeConfiguredBaseUrl 保持一致。
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  return {
    access: { type: "api-key" as const, apiKey },
    api: { type: "openai-chat-completions" as const, baseUrl: normalizedBaseUrl },
  };
}



export function buildLoginApiKeySkipSettings(
  _choice: ApiKeyProviderChoice,
  _now: number,
): Partial<AppSettings> {
  // JGAgent 去官方化：providerFamilyDomain 仅服务 OAuth 家族选择，已随账号域删除。
  return {};
}

export function shouldShowLoginApiKeyLink(
  apiKeyValue: string,
  apiKeyUrl: string | undefined,
): boolean {
  return Boolean(apiKeyUrl) && apiKeyValue.trim().length === 0;
}

export function buildLoginApiKeyDefaultModelPreferenceFromSelection(
  view: ModelSelectionView,
  providerId: string,
): string | null {
  const firstModel = view.providers.find((provider) => provider.providerId === providerId)
    ?.models[0]?.modelId;
  return firstModel ? encodeCustomModelValue(providerId, firstModel) : null;
}
