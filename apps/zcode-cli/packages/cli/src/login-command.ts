import { formatJson } from "@zcode/core";
import type { GlobalOptions, RunContext } from "@zcode/shared-types";
import { loadBootstrapModule } from "./bootstrap-loader.js";
import { loadCliDotenv } from "./env.js";
import type { RunDependencies } from "./cli-types.js";

// JGAgent 去官方化（阶段 3）：OAuth 登录链路（cli-oauth / bigmodel-oauth / loginZCodeCli /
// loginBigmodelCodingPlan）随账号域删除；`zcode login` 仅保留 API Key 途径——
// 从 --api-key 参数或 ZCODE_LOGIN_API_KEY 环境变量读取，写入个人 Provider 配置。

function splitLoginArgs(args: readonly string[]): {
  positionals: string[];
  apiKey: string | null;
  error?: string;
} {
  const positionals: string[] = [];
  let apiKey: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === "--api-key") {
      const value = args[index + 1];
      if (!value || !value.trim()) {
        return { positionals, apiKey: null, error: "--api-key requires a non-empty value" };
      }
      apiKey = value.trim();
      index += 1;
      continue;
    }
    positionals.push(arg);
  }
  return { positionals, apiKey };
}

export async function runLoginCommand(
  ctx: RunContext,
  options: GlobalOptions,
  deps: RunDependencies,
  _noBrowser: boolean,
  args: readonly string[] = [],
): Promise<number> {
  try {
    const parsedArgs = splitLoginArgs(args);
    if (parsedArgs.error) {
      throw new Error(parsedArgs.error);
    }
    const providerId = parsedArgs.positionals[0] ?? "zai";
    if (parsedArgs.positionals.length > 1 || (providerId !== "zai" && providerId !== "bigmodel")) {
      throw new Error("Usage: zcode login [zai|bigmodel] [--api-key <key>]");
    }
    const env = deps.env ?? process.env;
    const workingDirectory = (deps.cwd ?? process.cwd());
    const dotenvResult = (deps.loadDotenv ?? loadCliDotenv)({
      cwd: workingDirectory,
      env,
    });

    if (dotenvResult.error) {
      throw new Error(`Failed to load environment file: ${dotenvResult.path}`, {
        cause: dotenvResult.error,
      });
    }

    // OAuth 登录已删除：API Key 缺省时从环境变量兜底，仍缺则给出指引后失败。
    const apiKey = parsedArgs.apiKey ?? env.ZCODE_LOGIN_API_KEY?.trim() ?? null;
    if (!apiKey) {
      throw new Error(
        "OAuth login was removed in JGAgent. Provide an API key via --api-key <key> or ZCODE_LOGIN_API_KEY.",
      );
    }

    const configure =
      deps.configureCodingPlanApiKey ?? (await loadBootstrapModule()).configureCodingPlanApiKey;
    const result = await configure({
      apiKey,
      env,
      providerId,
    });

    if (options.json) {
      ctx.stdout.write(
        formatJson({
          status: "ready",
          provider: result.providerId,
          model: result.model,
          configPath: result.configPath,
        }),
      );
      return 0;
    }

    ctx.stdout.write(
      ["Login successful (API key).", `Model: ${result.model}`, `Model selection: ${result.configPath}`].join(
        "\n",
      ) + "\n",
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr.write(`Error: ${message}\n`);
    if (options.verbose && error instanceof Error && error.stack) {
      ctx.stderr.write(`${error.stack}\n`);
    }
    return 1;
  }
}

export async function runLogoutCommand(
  ctx: RunContext,
  options: GlobalOptions,
  deps: RunDependencies,
): Promise<number> {
  try {
    const env = deps.env ?? process.env;
    const workingDirectory = (deps.cwd ?? process.cwd());
    const dotenvResult = (deps.loadDotenv ?? loadCliDotenv)({
      cwd: workingDirectory,
      env,
    });

    if (dotenvResult.error) {
      throw new Error(`Failed to load environment file: ${dotenvResult.path}`, {
        cause: dotenvResult.error,
      });
    }

    const logout = deps.logoutZCodeCli ?? (await loadBootstrapModule()).logoutZCodeCli;
    const result = await logout({ env });

    if (options.json) {
      ctx.stdout.write(
        formatJson({
          status: "logged_out",
          provider: "zai",
          credentialsPath: result.credentialsPath,
        }),
      );
      return 0;
    }

    ctx.stdout.write(
      `Logged out from Coding Plan accounts. Credentials: ${result.credentialsPath}\n`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr.write(`Error: ${message}\n`);
    if (options.verbose && error instanceof Error && error.stack) {
      ctx.stderr.write(`${error.stack}\n`);
    }
    return 1;
  }
}
