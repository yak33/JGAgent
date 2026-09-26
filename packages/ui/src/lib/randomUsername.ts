/**
 * 本地身份随机用户名与校验，纯展示用（spec：docs/specs/local-profile.md）。
 * 词表是常量，改动不影响已存储的名字；随机重掷按当前 locale 取词。
 */

export const LOCAL_PROFILE_NAME_MAX_LENGTH = 16;

/** 形容词 x 名词组合，中文用「的」连接，英文用空格。 */
const WORDS: Record<"zh-CN" | "en-US", { adjectives: string[]; nouns: string[]; joiner: string }> = {
  "zh-CN": {
    adjectives: [
      "快乐的",
      "冷静的",
      "认真的",
      "悠闲的",
      "勇敢的",
      "温柔的",
      "专注的",
      "可靠的",
      "灵巧的",
      "元气满满的",
      "深夜里的",
      "清晨赶路的",
      "好奇的",
      "沉稳的",
      "机敏的",
      "自由自在的",
    ],
    nouns: [
      "企鹅",
      "水豚",
      "海獭",
      "柴犬",
      "猫头鹰",
      "狐獴",
      "雪豹",
      "仓鼠",
      "熊猫",
      "考拉",
      "海豚",
      "章鱼",
      "灯塔看守",
      "路由器",
      "咖啡师",
      "园艺师",
    ],
    joiner: "",
  },
  "en-US": {
    adjectives: [
      "Happy",
      "Calm",
      "Brave",
      "Cozy",
      "Clever",
      "Swift",
      "Sunny",
      "Quiet",
      "Bold",
      "Gentle",
      "Steady",
      "Lucky",
      "Frosty",
      "Curious",
      "Mighty",
      "Amber",
    ],
    nouns: [
      "Penguin",
      "Capybara",
      "Otter",
      "Shiba",
      "Owl",
      "Meerkat",
      "Hamster",
      "Panda",
      "Koala",
      "Dolphin",
      "Octopus",
      "Fox",
      "Beacon",
      "Router",
      "Barista",
      "Gardener",
    ],
    joiner: " ",
  },
};

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function generateRandomUsername(locale: string): string {
  const words = locale.toLowerCase().startsWith("zh") ? WORDS["zh-CN"]! : WORDS["en-US"]!;
  return `${pick(words.adjectives)}${words.joiner}${pick(words.nouns)}`;
}

/** 去首尾空白并校验长度；非法（空或超长）返回 null，调用方决定回退。 */
export function normalizeLocalProfileName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LOCAL_PROFILE_NAME_MAX_LENGTH) {
    return null;
  }
  return trimmed;
}
