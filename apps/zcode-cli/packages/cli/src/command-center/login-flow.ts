import type { TuiSelection, TuiSubmitPrompt } from "@zcode/tui";
import { getZCodeCopy } from "@zcode/i18n";
// JGAgent 去官方化（阶段 3）：OAuth 登录类型与 randomUUID 引用随登录域删除。

export function buildLoginSelection(locale?: string): TuiSelection {
  const copy = getZCodeCopy(locale).tui.loginSetup;
  return {
    emptyMessage: copy.emptyMessage,
    filterable: false,
    help: copy.help,
    items: [
      // JGAgent 去官方化（阶段 3）：zai/bigmodel OAuth 登录项删除，仅保留 API Key 登录。
      {
        command: "/login zai-coding-plan-api-key",
        id: "zai-coding-plan-api-key",
        input: {
          cancelStatus: copy.input.cancelStatus,
          clearStatus: copy.input.clearStatus,
          emptyStatus: copy.input.emptyStatus,
          help: copy.input.help,
          mask: true,
          placeholder: copy.input.placeholder,
          primary: copy.options.zaiApiKey.inputPrimary,
          secondary: copy.options.zaiApiKey.inputSecondary,
          status: copy.input.status,
          submitStatus: copy.input.submitStatus,
        },
        keywords: ["zai", "api", "key", "manual"],
        primary: copy.options.zaiApiKey.primary,
        secondary: copy.options.zaiApiKey.secondary,
      },
      {
        command: "/login bigmodel-coding-plan-api-key",
        id: "bigmodel-coding-plan-api-key",
        input: {
          cancelStatus: copy.input.cancelStatus,
          clearStatus: copy.input.clearStatus,
          emptyStatus: copy.input.emptyStatus,
          help: copy.input.help,
          mask: true,
          placeholder: copy.input.placeholder,
          primary: copy.options.bigmodelApiKey.inputPrimary,
          secondary: copy.options.bigmodelApiKey.inputSecondary,
          status: copy.input.status,
          submitStatus: copy.input.submitStatus,
        },
        keywords: ["bigmodel", "api", "key", "manual"],
        primary: copy.options.bigmodelApiKey.primary,
        secondary: copy.options.bigmodelApiKey.secondary,
      },
    ],
    prompt: copy.prompt,
    title: copy.title,
  };
}

export function loginSetupResponse(locale?: string): string {
  return getZCodeCopy(locale).tui.loginSetup.response;
}

// JGAgent 去官方化（阶段 3）：formatLoginResult 随 OAuth 登录域删除。
export function formatProviderSetupResult(result: {
  configPath: string;
  model: string;
  providerId: "bigmodel" | "zai";
}): string {
  const provider = result.providerId === "bigmodel" ? "BigModel" : "Z.AI";
  return [
    `Configured ${provider} Coding Plan.`,
    `Model: ${result.model}`,
    `Model selection: ${result.configPath}`,
  ].join("\n");
}

// JGAgent 去官方化（阶段 3）：emitLoginAuthorizeMessage 随 OAuth 登录域删除。
export function parseApiKeyLoginArgs(args: string): {
  apiKey: string;
  kind: "bigmodel-coding-plan-api-key" | "zai-coding-plan-api-key";
  providerId: "bigmodel" | "zai";
} | null {
  const [kind, ...rest] = args.split(/\s+/u);
  if (kind !== "zai-coding-plan-api-key" && kind !== "bigmodel-coding-plan-api-key") {
    return null;
  }
  return {
    apiKey: rest.join(" ").trim(),
    kind,
    providerId: kind.startsWith("bigmodel") ? "bigmodel" : "zai",
  };
}
