const phonePattern = /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const wechatPattern = /(?:微信|wechat|wx|微\s*信)\s*(?:号|id)?\s*[:：]?\s*[A-Za-z][-_A-Za-z0-9]{5,19}/gi;

export interface RedactionResult {
  value: string;
  redacted: boolean;
  categories: string[];
}

export function redactPublicText(input: string): RedactionResult {
  const categories = new Set<string>();
  let value = input;

  value = value.replace(phonePattern, () => {
    categories.add("phone");
    return "[已脱敏手机号]";
  });
  value = value.replace(emailPattern, () => {
    categories.add("email");
    return "[已脱敏邮箱]";
  });
  value = value.replace(wechatPattern, () => {
    categories.add("wechat");
    return "[已脱敏微信号]";
  });

  return {
    value: value.trim(),
    redacted: categories.size > 0,
    categories: [...categories],
  };
}
