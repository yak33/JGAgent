const CONVERSATION_DRAFT_CONTENT_WIDTH_CLASS_NAME = "max-w-2xl";
// JGHarness Orca 风格：收敛正文最大宽度，提升宽屏长对话阅读聚焦感。
const CONVERSATION_CONTENT_WIDTH_CLASS_NAME = "w-full max-w-4xl";

export function getConversationContentWidthClassName(params: {
  centeredEmptyLayout: boolean;
}): string {
  // 状态胶囊不占消息列侧边空间，不再保留旧摘要面板的布局偏移。
  return params.centeredEmptyLayout
    ? CONVERSATION_DRAFT_CONTENT_WIDTH_CLASS_NAME
    : CONVERSATION_CONTENT_WIDTH_CLASS_NAME;
}
