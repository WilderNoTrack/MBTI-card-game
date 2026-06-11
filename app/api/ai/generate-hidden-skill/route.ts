import { NextResponse } from 'next/server';
import { deepseekChat } from '@/lib/deepseek';
import { makeFallbackCard } from '@/lib/fallbackCards';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `你是《人格对战卡牌游戏》的隐藏技能设计师。这是游戏最关键的一张牌。

玩家在第5轮回答了一个深层问题，分享了一段真实经历。
你要把这段经历转化为一张专属的"隐藏技能牌"，玩家整局游戏只能用一次。

## 设计原则
1. 这张牌应该有强烈的个人色彩，能让玩家觉得"这就是我"
2. 效果必须强大，能改变战局
3. 牌名要诗意、富有意象，避免使用直白词语
4. 激活条件固定：公开度≥7

## 严格输出JSON格式（不含markdown）

{
  "name": "牌名（2-6个汉字，意象化）",
  "description": "卡牌描述（一句话，与玩家经历相关，20字以内）",
  "activation": "发动方式（玩家需要做什么仪式化动作）",
  "effect": "游戏效果（清晰可执行，40字以内）",
  "effect_code": "custom",
  "cost": 3,
  "exposure": 3,
  "type": "special"
}

## 效果设计参考（从这些类型中变体）
- 转化型：将某资源转化为另一种（如代价→伤害、公开度→治疗）
- 揭示型：强制公开/查看所有人信息
- 断链型：断开所有共鸣链接并造成伤害
- 交换型：与目标交换HP或代价
- 反转型：将所有负面效果转化为正面
- 联结型：与所有存活玩家建立共鸣

## 严格遵守
- 不要让效果太弱（这是终极牌）
- 不要让效果直接秒杀（保持平衡）
- 必须从玩家回答中提取核心意象作为牌名`;

export async function POST(req: Request) {
  const { mbti, group, question, answer } = await req.json();

  if (!answer || answer.trim().length < 2) {
    return NextResponse.json({ card: makeFallbackCard('hidden') });
  }

  try {
    const text = await deepseekChat({
      system: SYSTEM_PROMPT,
      user: `玩家信息：
- MBTI：${mbti}
- MBTI组别：${group}

第5轮深层问题：${question}

玩家回答：
${answer}

请为这位玩家生成专属隐藏技能牌。`,
      maxTokens: 600,
    });

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.name || !parsed.effect) throw new Error('缺少必要字段');

    return NextResponse.json({
      card: {
        ...parsed,
        id: `hidden_${uuidv4().slice(0, 8)}`,
        rarity: 'hidden',
        effect_code: 'custom',
        cost: 3,
        exposure: 3,
        type: 'special',
        needsTarget: false,
      },
    });
  } catch (err) {
    console.error('Hidden skill generation failed:', err);
    return NextResponse.json({ card: makeFallbackCard('hidden') });
  }
}
