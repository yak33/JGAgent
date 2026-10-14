import type {
  ProviderEndpointRoutingDecision,
  ProviderEndpointRoutingPort,
} from "@zcode/contracts";

/**
 * 官方 Coding Plan 网关转发（JGAgent 去官方化：已禁用）。
 *
 * 上游 ZCode 在此把 Z.ai / BigModel 官方订阅端点的模型请求改发到自有平台网关。
 * JGAgent 无官方订阅体系，路由表清空后本模块不再改写任何请求 URL，
 * 全部模型请求按用户配置的 provider 端点直连；机制保留，若公司自建网关可重新填表启用。
 */
export interface OfficialCodingPlanGatewayRoute {
  /** 官方模型端点（含路径），仅 https。 */
  readonly providerEndpoint: string;
  /** 对应的网关端点路径，相对 JGAgent 平台 origin。 */
  readonly gatewayPath: string;
}

export const OFFICIAL_CODING_PLAN_GATEWAY_ROUTES: readonly OfficialCodingPlanGatewayRoute[] = [];

export interface OfficialCodingPlanGatewayDecision {
  /** 是否命中官方端点并改为经网关发送。 */
  readonly viaGateway: boolean;
  /** 实际发送的 URL；未命中时与入参一致。 */
  readonly url: string;
}

export type OfficialCodingPlanGatewayFetch = typeof globalThis.fetch;

const ROOT_PATH = "/";
const HOST_HEADER = "host";
const HTTPS_DEFAULT_PORT = "443";
// JGAgent 去官方化：官方端点 → 平台网关的映射表清空（键占位化保证永不命中），
// 模型请求按用户配置的 provider 端点直连；公司自建网关时重新填表启用。
const GATEWAY_PATH_BY_ENDPOINT: ReadonlyMap<string, string> = new Map([
  ["https://open.bigmodel.invalid:443/api/anthropic/v1/messages", "/api/v1/ultra/anthropic/v1/messages"],
  ["https://api.zai-gateway.invalid:443/api/anthropic/v1/messages", "/api/v1/ultra-zai/anthropic/v1/messages"],
]);

/** 静态实现只提供 URL 决策；Host 清理、请求与响应透传由公共 fetch wrapper 负责。 */
export function createStaticProviderEndpointRoutingPort(
  endpointOrigin: string,
): ProviderEndpointRoutingPort {
  return {
    async resolve(requestUrl): Promise<ProviderEndpointRoutingDecision> {
      let parsed: URL;
      try {
        parsed = new URL(requestUrl);
      } catch {
        return { routed: false, url: requestUrl };
      }
      if (parsed.protocol !== "https:") return { routed: false, url: requestUrl };
      const path =
        parsed.pathname === ROOT_PATH
          ? ROOT_PATH
          : parsed.pathname.replace(/\/+$/u, "") || ROOT_PATH;
      const key = `${parsed.protocol}//${parsed.hostname.toLowerCase()}:${parsed.port || HTTPS_DEFAULT_PORT}${path}`;
      const targetPath = GATEWAY_PATH_BY_ENDPOINT.get(key);
      if (!targetPath) return { routed: false, url: requestUrl };
      const target = new URL(targetPath, endpointOrigin);
      target.search = parsed.search;
      return { routed: true, url: target.href };
    },
  };
}
