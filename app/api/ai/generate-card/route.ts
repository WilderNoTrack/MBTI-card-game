import { NextResponse } from 'next/server';
import { deepseekChat } from '@/lib/deepseek';
import { makeFallbackCard } from '@/lib/fallbackCards';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `你是《人格对战卡牌游戏》的卡牌设计师。根据玩家的真实回答，生成一张专属卡牌。

## 你的任务
读取玩家的回答，提取其中的人格特质、情绪、意象，转化为一张游戏卡牌。
卡牌的名称要诗意化、意象化，效果要与玩家回答的内容主题相关。

## 严格输出JSON格式（不要任何额外文字、解释、markdown标记）

{
  "name": "牌名（2-5个汉字，诗意化、意象化）",
  "description": "卡牌描述（一句话，15字以内，体现回答的情感）",
  "effect": "游戏效果描述（30字以内，清晰可执行）",
  "effect_code": "对应的效果代码（从下方列表选择）",
  "cost": 数字（代价槽变化），
  "exposure": 数字（公开度变化），
  "type": "info | attack | defense | resonance | utility | special"
}

## 稀有度规则
- common（普通）: cost +1, exposure +1
- rare（稀有）: cost +2, exposure +2

## 可选 effect_code
draw_2, draw_3, damage_2, damage_3, damage_4, damage_5, heal_2, heal_3,
view_hand_card, view_discard, view_hidden_skill, force_discard,
build_resonance, break_all_resonance, reduce_self_cost_2,
exposure_to_damage, cost_to_damage, resonance_damage,
shield_3, immunity_round, copy_last_card, reflect_last_card, custom

## 约束
1. 牌名必须从玩家回答中提取意象
2. 描述简短有文学性
3. effect 直接说"做什么"
4. 必须输出合法JSON，不含 \`\`\`json 等标记`;

export async function POST(req: Request) {
  const { mbti, question, answer, depth, isPublic } = await req.json();

  if (!answer || answer.trim().length < 2) {
    return NextResponse.json({ card: makeFallbackCard(depth) });
  }

  try {
    const text = await deepseekChat({
      system: SYSTEM_PROMPT,
      user: `玩家信息：
- MBTI类型：${mbti}
- 回答方式：${isPublic ? '公开' : '私密'}
- 稀有度等级：${depth}

问题：${question}

玩家回答：
${answer}

请生成对应卡牌。`,
      maxTokens: 500,
    });

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.name || !parsed.effect || !parsed.effect_code) {
      throw new Error('缺少必要字段');
    }

    const card = {
      ...parsed,
      id: `ai_${uuidv4().slice(0, 8)}`,
      rarity: depth,
      needsTarget: ['damage_2', 'damage_3', 'damage_4', 'damage_5', 'view_hand_card',
        'view_discard', 'view_hidden_skill', 'force_discard', 'build_resonance',
        'copy_last_card', 'reflect_last_card', 'resonance_damage'].includes(parsed.effect_code),
    };

    return NextResponse.json({ card });
  } catch (err) {
    console.error('AI card generation failed:', err);
    return NextResponse.json({ card: makeFallbackCard(depth) });
  }
}
