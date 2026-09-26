import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCAL_PROFILE_NAME_MAX_LENGTH,
  generateRandomUsername,
  normalizeLocalProfileName,
} from "../src/lib/randomUsername.js";

test("generateRandomUsername 按词表生成非空短名", () => {
  for (const locale of ["zh-CN", "en-US"]) {
    for (let index = 0; index < 50; index += 1) {
      const name = generateRandomUsername(locale);
      assert.ok(name.length > 0 && name.length <= LOCAL_PROFILE_NAME_MAX_LENGTH, `${locale}: ${name}`);
    }
  }
});

test("generateRandomUsername 未知 locale 回退英文词表", () => {
  const name = generateRandomUsername("fr-FR");
  assert.match(name, /^[A-Za-z ]+$/);
});

test("normalizeLocalProfileName 去空白并拒绝空/超长", () => {
  assert.equal(normalizeLocalProfileName("  张三  "), "张三");
  assert.equal(normalizeLocalProfileName("   "), null);
  assert.equal(normalizeLocalProfileName(""), null);
  assert.equal(normalizeLocalProfileName("a".repeat(LOCAL_PROFILE_NAME_MAX_LENGTH + 1)), null);
  assert.equal(normalizeLocalProfileName("a".repeat(LOCAL_PROFILE_NAME_MAX_LENGTH)), "a".repeat(LOCAL_PROFILE_NAME_MAX_LENGTH));
});
