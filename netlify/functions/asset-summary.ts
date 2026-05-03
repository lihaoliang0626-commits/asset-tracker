const DEFAULT_BASE_URL = 'https://api.deepseek.com';

export async function handler(event: { httpMethod: string; body: string | null }) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Missing DEEPSEEK_API_KEY' };
  }

  const { prompt } = JSON.parse(event.body || '{}');
  if (!prompt) {
    return { statusCode: 400, body: 'Missing prompt' };
  }

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是资深的个人财务分析助手，擅长从资产数据中发现洞察。' },
        { role: 'user', content: prompt },
      ],
      stream: false,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: `DeepSeek API error: ${response.status}`,
    };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return { statusCode: 502, body: 'DeepSeek API returned empty content' };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  };
}
