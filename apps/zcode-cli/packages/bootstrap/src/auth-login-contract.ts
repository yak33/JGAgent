import type {
  createCodingPlanApiKeyResolver,
  SharedZCodeCredentialStore,
} from "@zcode/adapters";
import type { EnvRecord } from "@zcode/adapters/model";

// JGAgent 去官方化（阶段 3）：OAuth 登录客户端（cli-oauth.js）与浏览器轮询登录类型
// （CliOAuthInitData/PollData/User、createCliOAuthClient）已随账号域移除；
// 本契约只保留 API Key 配置、登出与共享凭据存储的类型面。

export type CodingPlanProviderId = "bigmodel" | "zai";

export interface LoginZCodeCliOptions {
  providerId?: CodingPlanProviderId;
  abortSignal?: AbortSignal;
  apiKeyResolver?: ReturnType<typeof createCodingPlanApiKeyResolver>;
  baseUrl?: string;
  credentialStore?: SharedZCodeCredentialStore;
  env?: EnvRecord;
  noBrowser?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  personalProviderConfigPath?: string;
}

export interface LoginZCodeCliResult {
  configPath: string;
  credentialsPath: string;
  model: string;
  providerId: CodingPlanProviderId;
}

export type LoginBigmodelCodingPlanOptions = Omit<LoginZCodeCliOptions, "providerId">;
export type LoginBigmodelCodingPlanResult = LoginZCodeCliResult & { providerId: "bigmodel" };

export interface ConfigureCodingPlanApiKeyOptions {
  apiKey: string;
  credentialStore?: SharedZCodeCredentialStore;
  env?: EnvRecord;
  personalProviderConfigPath?: string;
  providerId: CodingPlanProviderId;
}

export interface ConfigureCodingPlanApiKeyResult {
  configPath: string;
  model: string;
  providerId: CodingPlanProviderId;
}

export interface LogoutZCodeCliOptions {
  credentialStore?: SharedZCodeCredentialStore;
  env?: EnvRecord;
}

export interface LogoutZCodeCliResult {
  credentialsPath: string;
}

export class ZCodeCliLoginError extends Error {
  readonly code:
    | "auth_failed"
    | "auth_timeout"
    | "config_update_failed"
    | "credential_write_failed";

  constructor(
    code: ZCodeCliLoginError["code"],
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, options);
    this.name = "ZCodeCliLoginError";
    this.code = code;
  }
}
