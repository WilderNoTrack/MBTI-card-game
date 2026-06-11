import { Question, QuestionDepth } from './types';

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

export function getDepthForRound(round: number): QuestionDepth {
  if (round <= 2) return 'icebreaker';
  if (round <= 4) return 'expansion';
  return 'deep';
}

export function getCardDepthForRound(round: number): 'common' | 'rare' | 'hidden' {
  if (round <= 2) return 'common';
  if (round <= 4) return 'rare';
  return 'hidden';
}
