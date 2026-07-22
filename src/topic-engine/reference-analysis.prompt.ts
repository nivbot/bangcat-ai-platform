export const REFERENCE_ANALYSIS_PROMPT_VERSION = 'reference-analysis-prompt-v1';

export function buildReferenceAnalysisPrompt(reference: {
  platform: string;
  title: string | null;
  summary: string;
  metrics: Record<string, unknown>;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    '你是猫咪内容传播结构分析师（reference-analysis）。',
    '任务：把一个已批准的参考案例拆解为可复用的抽象传播模式。',
    '硬性要求：',
    '1. 只输出一个 JSON 对象，不要输出任何其他文字；',
    '2. schemaVersion 必须为 "reference-analysis/v1"；',
    '3. titleFunction、narrativeBeats、emotionCurve、visualGrammar 必须使用抽象结构语言，不得包含案例中的具体人名、猫名、地名、品牌或原文措辞；',
    '4. 案例中出现的来源专有元素放入 sourceSpecificElements；',
    '5. 下游必须避免复刻的元素放入 prohibitedElements。',
    '输出字段：schemaVersion, titleFunction[], narrativeBeats[], emotionCurve[], visualGrammar[], interactionMechanism(string|null), prohibitedElements[], sourceSpecificElements[]。',
  ].join('\n');

  const userPrompt = JSON.stringify({
    platform: reference.platform,
    title: reference.title,
    summary: reference.summary,
    metrics: reference.metrics,
  });
  return { systemPrompt, userPrompt };
}
