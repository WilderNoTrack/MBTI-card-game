# Claude API Prompts｜AI集成指南

> 所有调用都使用模型 `claude-sonnet-4-20250514`
> max_tokens 建议 1000
> temperature 0.7（卡牌生成）/ 0.3（结构化输出）

---

## 一、问题池（不需要AI生成，硬编码即可）

为了减少AI调用次数和延迟，问题池建议直接硬编码在前端。

### `/lib/questions.ts`

```typescript
export type QuestionDepth = 'icebreaker' | 'expansion' | 'deep';

export type Question = {
  id: string;
  text: string;
  depth: QuestionDepth;
};

export const QUESTION_POOL: Question[] = [
  // 第1-2轮 破冰层
  { id: 'q1', text: '你习惯先观察还是主动靠近？', depth: 'icebreaker' },
  { id: 'q2', text: '独处和社交，哪个更让你充电？', depth: 'icebreaker' },
  { id: 'q3', text: '你更怕尴尬还是孤独？', depth: 'icebreaker' },
  { id: 'q4', text: '别人初次见你会觉得你是什么样的人？', depth: 'icebreaker' },
  { id: 'q5', text: '你做决定时更靠逻辑还是直觉？', depth: 'icebreaker' },
  { id: 'q6', text: '让你最快乐的小事是什么？', depth: 'icebreaker' },

  // 第3-4轮 展开层
  { id: 'q7', text: '别人最常误解你什么？', depth: 'expansion' },
  { id: 'q8', text: '你压力大时会沉默还是爆发？', depth: 'expansion' },
  { id: 'q9', text: '你有没有一种情绪很难对人说？', depth: 'expansion' },
  { id: 'q10', text: '你最害怕失去什么？', depth: 'expansion' },
  { id: 'q11', text: '你最擅长隐藏的是什么？', depth: 'expansion' },
  { id: 'q12', text: '你最近一次感到真正被看见，是什么时候？', depth: 'expansion' },

  // 第5轮 深层
  { id: 'q13', text: '一件你始终忘不了的事。', depth: 'deep' },
  { id: 'q14', text: '一次你没有说出口的话。', depth: 'deep' },
  { id: 'q15', text: '一次让你变了的离别。', depth: 'deep' },
  { id: 'q16', text: '你最孤独的一个夜晚。', depth: 'deep' },
  { id: 'q17', text: '你最想隐藏的一面是什么？', depth: 'deep' },
];

export function getRandomQuestion(depth: QuestionDepth): Question {
  const filtered = QUESTION_POOL.filter(q => q.depth === depth);
  return filtered[Math.floor(Math.random() * filtered.length)];
}
```

---

## 二、卡牌生成 Prompt

每轮回答后，调用 Claude API 为每个回答的玩家生成一张卡牌。

### 路由：`POST /api/ai/generate-card`

**请求体：**
```typescript
{
  mbti: string,          // 玩家的MBTI类型
  question: string,      // 本轮问题
  answer: string,        // 玩家回答
  depth: 'common' | 'rare' | 'hidden',
  isPublic: boolean,     // 是否公开回答
}
```

### System Prompt

```
你是《人格对战卡牌游戏》的卡牌设计师。根据玩家的真实回答，生成一张专属卡牌。

## 你的任务
读取玩家的回答，提取其中的人格特质、情绪、意象，转化为一张游戏卡牌。
卡牌的名称要诗意化、意象化，效果要与玩家回答的内容主题相关。

## 严格输出JSON格式（不要任何额外文字、解释、markdown标记）

{
  "name": "牌名（2-5个汉字，诗意化、意象化）",
  "description": "卡牌描述（一句话，15字以内，体现回答的情感）",
  "effect": "游戏效果描述（30字以内，清晰可执行）",
  "effect_code": "对应的效果代码（从下方列表选择）",
  "cost": 数字（代价槽变化，按稀有度规则）,
  "exposure": 数字（公开度变化，按稀有度规则）,
  "type": "info | attack | defense | resonance | utility | special"
}

## 稀有度规则
- common（普通）: cost +1, exposure +1, 效果中等强度
- rare（稀有）: cost +2, exposure +2, 效果较强且有独特机制
- hidden（隐藏）: cost +3, exposure +3, 效果强大且与回答深度绑定

## 可选 effect_code 列表

| effect_code | 含义 |
|------|------|
| draw_2 | 摸2张牌 |
| draw_3 | 摸3张牌 |
| damage_2 | 造成2伤 |
| damage_3 | 造成3伤 |
| damage_5 | 造成5伤 |
| heal_2 | 回复2血 |
| heal_3 | 回复3血 |
| view_hand_card | 查看一名玩家手牌一张 |
| view_all_hand | 查看一名玩家全部手牌 |
| view_hidden_skill | 查看一名玩家的隐藏技能 |
| force_discard | 强制一名玩家弃1张牌 |
| build_resonance | 建立共鸣链接 |
| break_all_resonance | 断开所有共鸣链接 |
| reduce_self_cost_2 | 自己代价-2 |
| reduce_target_cost_2 | 目标代价-2 |
| exposure_to_damage | 公开度转化伤害 |
| cost_to_damage | 代价转化伤害 |
| resonance_damage | 共鸣值转化伤害 |
| shield_3 | 抵挡3点伤害 |
| immunity_round | 本回合免疫所有伤害 |
| copy_last_card | 复制对手上一张牌 |
| reflect_last_card | 反弹对手上一张牌 |
| swap_resource | 与目标交换某个资源数值 |
| custom | 自定义效果（仅 hidden 稀有度可用，需详细描述） |

## 重要约束
1. 牌名必须从玩家回答中提取意象，不要生硬命名
2. 描述要简短、有文学性，避免说教
3. effect 描述要直接说"做什么"，不要解释为什么
4. 若 depth=hidden，使用 custom 时要给出可执行的具体规则
5. 必须输出合法 JSON，不要包含 ```json 等标记
```

### User Prompt 模板

```
玩家信息：
- MBTI类型：{{mbti}}
- 回答方式：{{isPublic ? '公开' : '私密'}}
- 稀有度等级：{{depth}}

问题：{{question}}

玩家回答：
{{answer}}

请生成对应卡牌。
```

### 示例

**输入：**
```
MBTI: INFJ
isPublic: true
depth: rare
question: 你有没有一种情绪很难对人说？
answer: 我经常觉得自己像旁观者，看着大家热闹但说不出口
```

**期望输出：**
```json
{
  "name": "旁观席",
  "description": "看着，却始终在外面。",
  "effect": "本回合不出牌，查看所有玩家本回合的出牌意图",
  "effect_code": "custom",
  "cost": 2,
  "exposure": 2,
  "type": "info"
}
```

---

## 三、隐藏技能牌生成 Prompt（特殊版本）

第5轮使用，是单独的更强版本。

### 路由：`POST /api/ai/generate-hidden-skill`

### System Prompt

```
你是《人格对战卡牌游戏》的隐藏技能设计师。这是游戏最关键的一张牌。

玩家在第5轮回答了一个深层问题，分享了一段真实经历。
你要把这段经历转化为一张专属的"隐藏技能牌"，玩家整局游戏只能用一次。

## 设计原则
1. 这张牌应该有强烈的个人色彩，能让玩家觉得"这就是我"
2. 效果必须强大，能改变战局
3. 牌名要诗意、富有意象，避免使用直白词语
4. 激活条件固定：公开度≥7

## 严格输出JSON格式

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

## 效果设计参考（从这些类型中变体，不要直接照抄）
- 时间型：跳过/重置某些时间相关的效果
- 切换型：交换两个玩家的某个资源
- 揭示型：强制公开/查看
- 转化型：将某种资源转化为另一种
- 中断型：完全打断某个进行中的效果
- 联结型：建立/断开多个共鸣链接
- 反转型：将一个负面效果转化为正面

## 严格遵守
- 不要让效果太弱（这是终极牌）
- 不要让效果完全破坏游戏平衡（不能直接秒杀）
- 必须从玩家回答中提取核心意象作为牌名
- 输出纯JSON，不要markdown
```

### User Prompt 模板

```
玩家信息：
- MBTI：{{mbti}}
- MBTI组别：{{group}}

第5轮深层问题：{{question}}

玩家回答：
{{answer}}

请为这位玩家生成专属隐藏技能牌。
```

### 示例

**输入：**
```
MBTI: ISFP
group: IS
question: 一件你始终忘不了的事。
answer: 高中毕业那天，我没有跟最好的朋友说再见，
       她在车上挥手，我假装没看见
```

**期望输出：**
```json
{
  "name": "未挥的手",
  "description": "有些再见，永远停在那个车窗里。",
  "activation": "讲述这段经历后发动",
  "effect": "立即断开场上所有共鸣链接，每断开一条则对相关玩家造成2伤",
  "effect_code": "custom",
  "cost": 3,
  "exposure": 3,
  "type": "special"
}
```

---

## 四、错误处理 + Fallback

### Fallback 卡牌（当API失败时使用）

放在 `/lib/fallbackCards.ts`：

```typescript
export const FALLBACK_CARDS = {
  common: {
    name: '微光',
    description: '微小但真实的力量。',
    effect: '摸1张牌，回复1点生命',
    effect_code: 'draw_1_heal_1',
    cost: 1,
    exposure: 1,
    type: 'utility' as const,
  },
  rare: {
    name: '深井',
    description: '看得越深，越能找到力量。',
    effect: '查看一名玩家的手牌一张，造成2点伤害',
    effect_code: 'view_hand_card',
    cost: 2,
    exposure: 2,
    type: 'info' as const,
  },
  hidden: {
    name: '无名之物',
    description: '存在于无法命名的地方。',
    activation: '讲述任意一段真实经历后发动',
    effect: '强制一名玩家公开其手牌中所有信息类牌',
    effect_code: 'custom',
    cost: 3,
    exposure: 3,
    type: 'special' as const,
  },
};
```

### API 调用代码模板

```typescript
// /api/ai/generate-card/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { FALLBACK_CARDS } from '@/lib/fallbackCards';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { mbti, question, answer, depth, isPublic } = await req.json();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.7,
      system: SYSTEM_PROMPT_CARD_GEN, // 上面定义的 system prompt
      messages: [{
        role: 'user',
        content: `玩家信息：
- MBTI类型：${mbti}
- 回答方式：${isPublic ? '公开' : '私密'}
- 稀有度等级：${depth}

问题：${question}

玩家回答：
${answer}

请生成对应卡牌。`
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const card = JSON.parse(text.trim());

    // 验证字段
    if (!card.name || !card.effect || !card.effect_code) {
      throw new Error('Invalid card structure');
    }

    // 加上必要的字段
    card.id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    card.rarity = depth;

    return NextResponse.json({ card });
  } catch (error) {
    console.error('AI generation failed:', error);
    // 返回 fallback 卡牌
    const fallback = FALLBACK_CARDS[depth as keyof typeof FALLBACK_CARDS];
    return NextResponse.json({
      card: {
        ...fallback,
        id: `fallback_${Date.now()}`,
        rarity: depth,
      }
    });
  }
}
```

---

## 五、生成速度优化建议

48小时内要做完，速度很重要：

1. **并发调用**：每轮所有玩家的卡牌生成可以并发发起，用 `Promise.all`
2. **流式响应**：可以用 Claude API 的 streaming 模式，让前端有更好的反馈
3. **超时机制**：单次API调用设置15秒超时，超时直接用 fallback
4. **缓存**：相同的问题+MBTI组合可以缓存（同一局内可能不太需要，但可以加）

---

## 六、测试用例

开发完成后，确认以下场景能正常工作：

| 场景 | 输入 | 期望 |
|------|------|------|
| 普通回答 | "我习惯先观察" | 生成普通牌 |
| 跳过回答 | depth=skipped | 不调用API |
| 私密回答 | isPublic=false | 生成牌强度-1档 |
| 深层回答 | depth=hidden | 生成专属隐藏技能牌 |
| API超时 | 模拟网络问题 | 返回fallback卡牌 |
| 非法JSON | 模拟API返回错误格式 | 返回fallback卡牌 |
| 空回答 | answer="" | 应当跳过生成 |
