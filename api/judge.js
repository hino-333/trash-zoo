/* Trash zoo — 飼育員の目。
   投稿された切り抜き画像を Claude に渡し、食べ物のゴミかどうかの判定と記録を書かせる。
   Vercel の Node ランタイムで動く。API キーはここ（サーバー側の環境変数）にだけ置く。 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const Keeper = z.object({
  is_food_waste: z.boolean(),
  name: z.string(),
  category: z.enum(['袋', '容器', '缶', '箱', '瓶', 'その他']),
  weight_class: z.enum(['light', 'medium', 'heavy']),
  keeper_note: z.string(),
  confidence: z.number()
});

const SYSTEM = `あなたは Trash zoo の飼育員です。来園者が放した食べ物のゴミを観察し、記録を書きます。

- 一人称は使わない。
- 「おいしそう」「人気です」などの評価語は使わない。観察だけを書く。
- 味・香り・食感・その国での食べられ方に触れる。読んだ人がその食べ物の解像度を得られるように書く。
- keeper_note は日本語で60〜90字。感嘆符は使わない。急かさない。
- name は日本語で、何のゴミかが分かる短い名前（例: ココナッツ味のビスケットの袋）。
- 食べ物のゴミ以外（人物、書類、食品と無関係なもの、判別できないもの）は is_food_waste を false にする。
- weight_class は放飼場での跳ね方に使う。袋や包み紙は light、箱やカップは medium、缶や瓶は heavy。
- confidence は 0.0〜1.0 で、判定の確からしさ。`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set' });
  }

  const image = req.body && req.body.image;
  const m = typeof image === 'string' && image.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'image must be a data URL (png/jpeg/webp/gif)' });
  const [, mediaType, data] = m;
  if (data.length > 6_000_000) return res.status(413).json({ error: 'image too large' });

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4000,
      system: SYSTEM,
      output_config: { format: zodOutputFormat(Keeper), effort: 'low' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: '背景を切り抜いた、来園者が今日出したゴミの写真です。観察して記録してください。' }
        ]
      }]
    });

    if (!response.parsed_output) {
      return res.status(502).json({ error: 'could not parse the keeper response' });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(response.parsed_output);
  } catch (err) {
    const status = err && err.status;
    if (status === 429) return res.status(429).json({ error: 'rate limited' });
    console.error('judge failed:', err);
    return res.status(502).json({ error: 'judge failed' });
  }
}
