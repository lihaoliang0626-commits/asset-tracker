type AssetChangeInput = {
  absoluteChange: number;
  percentageChange: number;
  totalCurrent: number;
  totalPrevious: number;
};

type ContributionInput = {
  assetType: string;
  change: number;
  changePercentage: number;
  currentValue: number;
  previousValue: number;
};

export type AssetSummaryResult = {
  title: string;
  highlight: string;
  reason: string;
};

type GenerateAssetSummaryInput = {
  baseCurrency: string;
  assetChange: AssetChangeInput;
  contributions: ContributionInput[];
  notes?: { date: string; note: string }[];
};

function buildPrompt(input: GenerateAssetSummaryInput) {
  return `
请根据以下资产变化数据，生成本期总结。

输出格式：纯 JSON，包含以下字段（必须全部提供）：
- title：简短标题，概括本期核心变化。
- highlight：1-2 句描述本期资产变化情况，包含关键数字，语调自然。
- reason：综合数据和用户备注，分析本期变化的主要原因。如果备注中有与数据相关的信息（如操作记录、市场事件等），请引用并结合数据做解读。可以提及多个因素。

只输出 JSON，不要 markdown 格式，不要其他解释。

数据：
基准货币：${input.baseCurrency}
资产变化：
- 本期总资产：${input.assetChange.totalCurrent}
- 上期总资产：${input.assetChange.totalPrevious}
- 绝对变化：${input.assetChange.absoluteChange}
- 变化百分比：${input.assetChange.percentageChange}
贡献明细（按资产类型）：
${input.contributions
  .map((c) => `- ${c.assetType}: change=${c.change}, current=${c.currentValue}, previous=${c.previousValue}, changePct=${c.changePercentage}`)
  .join('\n')}
${input.notes && input.notes.length > 0
  ? `用户备注：\n${input.notes.map((n) => `- ${n.date}: ${n.note}`).join('\n')}`
  : ''}
`.trim();
}

function safeJsonParse(text: string): AssetSummaryResult | null {
  const extractJson = (raw: string) => {
    const cleaned = raw
      .replace(/```json/g, '```')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return cleaned.slice(start, end + 1);
    }
    return cleaned;
  };

  const tryParse = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.title) {
        return null;
      }
      const title = String(parsed.title);
      const highlight = parsed.highlight ? String(parsed.highlight) : title;
      const reason = parsed.reason ? String(parsed.reason) : '';
      return { title, highlight, reason };
    } catch {
      return null;
    }
  };

  const extracted = extractJson(text);
  const parsed = tryParse(extracted);
  if (parsed) {
    return parsed;
  }

  const partialMatch = extracted.match(/"title"\s*:\s*"([^"]+)"/);
  const highlightMatch = extracted.match(/"highlight"\s*:\s*"([^"]+)"/);
  const reasonMatch = extracted.match(/"reason"\s*:\s*"([^"]+)"/);
  if (partialMatch) {
    const title = partialMatch[1];
    return {
      title,
      highlight: highlightMatch?.[1] || title,
      reason: reasonMatch?.[1] || '',
    };
  }

  return null;
}

export async function generateAssetSummary(
  input: GenerateAssetSummaryInput,
  signal?: AbortSignal
): Promise<AssetSummaryResult> {
  const response = await fetch('/api/asset-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: buildPrompt(input),
    }),
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `AI summary error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.content?.trim();
  if (!content) {
    throw new Error('DeepSeek API returned empty content');
  }

  const parsed = safeJsonParse(content);
  if (parsed) {
    return parsed;
  }

  throw new Error('AI 输出格式错误，请重试');
}
