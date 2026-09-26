import type { ProviderId } from "@zcode/provider";

/** 从 Registry 解析出的、发起模型列表请求所需的最小端点信息。 */
export interface RemoteModelsProviderEndpoint {
  readonly baseUrl: string;
  readonly apiKey: string;
}

/** 按 providerId 解析端点；解析不出（供应商不存在 / 非 api-key / 缺 baseUrl）返回 null。 */
export type RemoteModelsEndpointResolver = (
  providerId: ProviderId,
) => Promise<RemoteModelsProviderEndpoint | null>;

export type RemoteModelsFetchImpl = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * 构造"从供应商端点拉取模型列表"的执行函数。
 *
 * OpenAI 兼容与 Anthropic Messages 两种 API 的模型列表端点一致：GET {站点根}/v1/models，
 * 响应形如 { data: [{ id }] }。这里只做一次只读请求，不落盘、不改动 Provider 配置；
 * 拉取结果由 UI 侧决定如何入库（批量 addPersonalModel）。
 *
 * @author ZHANGCHAO 2026/09/26
 */
export function createRemoteModelsFetcher(
  resolveEndpoint: RemoteModelsEndpointResolver,
  fetchImpl: RemoteModelsFetchImpl,
): (providerId: ProviderId) => Promise<string[]> {
  return async (providerId) => {
    const endpoint = await resolveEndpoint(providerId);
    if (!endpoint) {
      throw new Error(
        `无法解析该供应商的 API 地址或密钥，无法拉取模型列表：providerId=${providerId}`,
      );
    }
    const url = buildModelsUrl(endpoint.baseUrl);
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${endpoint.apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`拉取模型列表失败：HTTP ${response.status}（${url}）`);
    }
    const payload = (await response.json()) as { data?: Array<{ id?: unknown }> };
    // 无法解析出 id 的条目直接跳过；去重后按字典序返回，保证展示稳定。
    const ids = (payload.data ?? [])
      .map((item) => (typeof item?.id === "string" ? item.id.trim() : ""))
      .filter((id) => id.length > 0);
    return [...new Set(ids)].sort();
  };
}

/**
 * 把配置里的 baseUrl 规范化为模型列表端点。
 * 配置值可能带 /v1、/chat/completions 等后缀（运行时 SDK 会自行追加请求路径），
 * 统一剥到站点根再拼 /v1/models，与 legacyModelProviderSerialized 的规范化语义一致。
 */
function buildModelsUrl(baseUrl: string): string {
  let base = baseUrl.trim().replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) {
    base = base.slice(0, -"/chat/completions".length);
  }
  if (base.endsWith("/v1")) {
    base = base.slice(0, -"/v1".length);
  }
  return `${base}/v1/models`;
}
