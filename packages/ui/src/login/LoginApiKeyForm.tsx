import { useState } from "react";
import { isApiKeyAccess } from "@zcode/provider";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import {
  BIGMODEL_PROVIDER_ID,
  TID_LOGIN_API_KEY_CANCEL_BUTTON,
  TID_LOGIN_API_KEY_CONTINUE_BUTTON,
  TID_LOGIN_API_KEY_ERROR,
  TID_LOGIN_API_KEY_INPUT,
  TID_LOGIN_API_KEY_PROVIDER_ITEM,
  TID_LOGIN_API_KEY_PROVIDER_TRIGGER,
  TID_LOGIN_API_KEY_SKIP_BUTTON,
  ZAI_PROVIDER_ID,
  testId,
} from "@zcode/shared";
import { Alert, AlertDescription } from "@/components/ui/alert.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { usePlatform } from "@/hooks/usePlatform.js";
import { useProviderSettingsView } from "@/hooks/useProviderSettingsView.js";
import { useServices } from "@/hooks/useServices.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import { renderOAuthProviderIcon } from "@/lib/oauthProviderIcon.js";
import {
  buildCustomProviderInitialConfig,
  buildLoginApiKeyDefaultModelPreferenceFromSelection,
  buildLoginApiKeySkipSettings,
  CUSTOM_PROVIDER_BASE_URL_PLACEHOLDER,
  resolveCustomProviderDisplayName,
  resolveLoginApiKeyDefaultProvider,
  resolveLoginApiKeyTemplateId,
  resolveLoginApiKeyProviderLabel,
  shouldShowLoginApiKeyLink,
  validateCustomProviderBaseUrl,
  type ApiKeyProviderChoice,
} from "@/login/LoginApiKeyForm.helpers.js";
import { useZCodeStore } from "@/store/StoreProvider.js";

interface LoginApiKeyFormProps {
  /** JGAgent 去官方化：登录入口仅剩 API Key 表单时无可返回的渠道列表，允许省略并隐藏返回按钮。 */
  onCancel?: () => void;
  onSaved: () => void | Promise<void>;
  onSkipped: () => void | Promise<void>;
}

export function LoginApiKeyForm({ onCancel, onSaved, onSkipped }: LoginApiKeyFormProps) {
  const { intl, locale } = useZCodeIntl();
  const platform = usePlatform();
  const { modelSelectionService, providerSettingsService, settingService } = useServices();
  const markApiKeyLoginSuccess = useZCodeStore((state) => state.markApiKeyLoginSuccess);
  const [providerChoice, setProviderChoice] = useState<ApiKeyProviderChoice>(() =>
    resolveLoginApiKeyDefaultProvider(locale),
  );
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerSettingsRead = useProviderSettingsView();
  const providerSettingsView =
    providerSettingsRead.state.status === "ready" ? providerSettingsRead.state.view : null;

  const isCustomProvider = providerChoice === "custom";
  const providerLabel = resolveLoginApiKeyProviderLabel(providerChoice);
  const templateId = resolveLoginApiKeyTemplateId(providerChoice);
  const templateAccess = providerSettingsView?.providerTemplates.find(
    (template) => template.templateId === templateId,
  )?.config.access;
  const apiKeyUrl = isApiKeyAccess(templateAccess) ? templateAccess.apiKeyManagementUrl : undefined;
  // 用户已经输入或回填 API Key 后，右侧获取入口会挤占密码输入区域。
  const showApiKeyLink = shouldShowLoginApiKeyLink(apiKeyValue, apiKeyUrl ?? undefined);

  const saveApiKeyProvider = async () => {
    const apiKey = apiKeyValue.trim();
    if (!apiKey) {
      setError(intl.formatMessage({ id: "login.apiKey.emptyError" }));
      return;
    }
    const baseUrlError = isCustomProvider
      ? validateCustomProviderBaseUrl(customBaseUrl)
      : null;
    if (baseUrlError) {
      setError(baseUrlError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let created: Awaited<ReturnType<typeof providerSettingsService.createPersonalProvider>>;
      if (isCustomProvider) {
        // 自定义供应商与设置页"添加自定义供应商"同一条 createPersonalProvider 服务路径，
        // 仅不传 templateId，改用 initialConfig 直接写入 OpenAI 兼容地址与 Key；
        // 模型列表留空，由用户后续在设置页补充。
        created = await providerSettingsService.createPersonalProvider({
          providerName: resolveCustomProviderDisplayName(customBaseUrl),
          initialConfig: buildCustomProviderInitialConfig(customBaseUrl, apiKey),
        });
      } else {
        const view = await providerSettingsService.getView();
        const template = view.providerTemplates.find((item) => item.templateId === templateId);
        if (!template || !isApiKeyAccess(template.config.access)) {
          setError(
            intl.formatMessage(
              { id: "login.apiKey.providerMissingError" },
              { provider: providerLabel },
            ),
          );
          return;
        }

        // 同一模板重复走引导页时复用已有供应商、只更新 Key，
        // 避免堆出"捷关模型网关2"这类重复条目。
        const existingProvider = view.providers.find((item) => item.templateId === templateId);
        if (existingProvider) {
          const updatedView = await providerSettingsService.savePersonalProviderOverlay(
            existingProvider.providerId,
            {
              access: { type: template.config.access.type, apiKey },
            },
          );
          created = { providerId: existingProvider.providerId, view: updatedView };
        } else {
          created = await providerSettingsService.createPersonalProvider({
            templateId: template.templateId,
            // 不传 locale 会按 en-US 把模板英文名固化进 providerName；与设置页创建路径保持一致。
            locale,
            initialConfig: { access: { type: template.config.access.type, apiKey } },
          });
        }

        // 引导页完成后自动从网关拉取模型清单（过滤已有模型），省去用户再进设置页手动获取；
        // 拉取失败不阻塞进入应用，仍可在设置页用"从端点获取模型"补齐。
        try {
          const existingModelIds = new Set(
            (existingProvider?.models ?? []).map((model) => model.modelId),
          );
          const remoteModelIds = await providerSettingsService.fetchRemoteModels(
            created.providerId,
          );
          const newModelIds = remoteModelIds.filter((modelId) => !existingModelIds.has(modelId));
          for (const modelId of newModelIds) {
            await providerSettingsService.addPersonalModel(created.providerId, modelId, {});
          }
        } catch (fetchError) {
          logger.warn("[LoginEntry] 引导页自动拉取模型列表失败", {
            providerId: created.providerId,
            error: fetchError,
          });
        }
      }
      const defaultModelPreference = buildLoginApiKeyDefaultModelPreferenceFromSelection(
        await modelSelectionService.getView(),
        created.providerId,
      );
      markApiKeyLoginSuccess(defaultModelPreference);
      await onSaved();
    } catch (saveError) {
      logger.error("[LoginEntry] 保存 API Key provider 失败", {
        providerChoice,
        templateId,
        error: saveError,
      });
      setError(
        intl.formatMessage(
          { id: "login.apiKey.saveError" },
          {
            error: saveError instanceof Error ? saveError.message : String(saveError),
          },
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const skipApiKeyProvider = async () => {
    setSkipping(true);
    setError(null);
    try {
      // 跳过只表示用户确认当前 provider family 运行域，不能写入空 API Key
      // 或触发 API Key 登录成功事件，否则后续模型选择会误以为已有可用凭据。
      await settingService.update(buildLoginApiKeySkipSettings(providerChoice, Date.now()));
      await onSkipped();
    } catch (skipError) {
      logger.error("[LoginEntry] 跳过 API Key 登录失败", {
        providerChoice,
        error: skipError,
      });
      setError(
        intl.formatMessage(
          { id: "login.apiKey.skipError" },
          {
            error: skipError instanceof Error ? skipError.message : String(skipError),
          },
        ),
      );
    } finally {
      setSkipping(false);
    }
  };

  const busy = saving || skipping;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-ui-base font-medium text-foreground">
          {intl.formatMessage({ id: "login.apiKey.title" })}
        </h2>
        <div className="space-y-2">
          <div>
            <Select
              value={providerChoice}
              onValueChange={(value) => setProviderChoice(value as ApiKeyProviderChoice)}
              disabled={busy}
            >
              <SelectTrigger
                id="login-api-key-provider"
                size="lg"
                className="h-10 w-full text-ui-base"
                data-testid={TID_LOGIN_API_KEY_PROVIDER_TRIGGER}
                aria-label={intl.formatMessage({
                  id: "login.apiKey.providerLabel",
                })}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-lg">
                {/* JGAgent 去官方化：捷关为默认渠道；自定义供应商面向 OpenAI 兼容私有网关 */}
                <SelectItem
                  value="jgagent"
                  className="rounded-md"
                  data-testid={testId(TID_LOGIN_API_KEY_PROVIDER_ITEM, "jgagent")}
                >
                  捷关模型网关
                </SelectItem>
                <SelectItem
                  value="custom"
                  className="rounded-md"
                  data-testid={testId(TID_LOGIN_API_KEY_PROVIDER_ITEM, "custom")}
                >
                  自定义供应商
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isCustomProvider ? (
            <div>
              <Input
                id="login-api-key-custom-url"
                type="text"
                size="lg"
                className="h-10 w-full text-ui-base"
                data-testid={testId(TID_LOGIN_API_KEY_INPUT, "custom-url")}
                aria-label="API 地址"
                value={customBaseUrl}
                placeholder={CUSTOM_PROVIDER_BASE_URL_PLACEHOLDER}
                autoComplete="off"
                onChange={(event) => {
                  setCustomBaseUrl(event.target.value);
                  setError(null);
                }}
              />
            </div>
          ) : null}
          <div className="relative">
            <Input
              id="login-api-key"
              type="password"
              size="lg"
              className={`h-10 w-full text-ui-base ${showApiKeyLink ? "pr-28" : ""}`}
              data-testid={TID_LOGIN_API_KEY_INPUT}
              aria-label={intl.formatMessage({
                id: "login.apiKey.placeholder",
              })}
              value={apiKeyValue}
              placeholder={intl.formatMessage({
                id: "login.apiKey.placeholder",
              })}
              autoComplete="off"
              onChange={(event) => {
                setApiKeyValue(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && apiKeyValue.trim() && !busy) {
                  void saveApiKeyProvider();
                }
              }}
            />
            {showApiKeyLink ? (
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ui-base font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  if (apiKeyUrl) {
                    platform.openExternal(apiKeyUrl);
                  }
                }}
              >
                {intl.formatMessage({ id: "login.apiKey.getApiKey" })}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" data-testid={TID_LOGIN_API_KEY_ERROR}>
          <TriangleAlertIcon className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Button
          type="button"
          className="h-10 w-full text-ui-base"
          size="lg"
          data-testid={TID_LOGIN_API_KEY_CONTINUE_BUTTON}
          disabled={!apiKeyValue.trim() || busy}
          onClick={() => void saveApiKeyProvider()}
        >
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {intl.formatMessage({ id: "login.apiKey.continue" })}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full text-ui-base"
            size="lg"
            data-testid={TID_LOGIN_API_KEY_CANCEL_BUTTON}
            disabled={busy}
            onClick={onCancel}
          >
            {intl.formatMessage({ id: "login.apiKey.cancel" })}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="link"
          className="h-7 w-full text-ui-base text-foreground-subtle hover:text-foreground"
          data-testid={TID_LOGIN_API_KEY_SKIP_BUTTON}
          disabled={busy}
          onClick={() => void skipApiKeyProvider()}
        >
          {skipping ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {intl.formatMessage({ id: "login.skip" })}
        </Button>
      </div>
    </div>
  );
}
