export type CardGroup = 'IN' | 'IS' | 'EN' | 'ES';
export type CardType = 'info' | 'attack' | 'defense' | 'resonance' | 'utility' | 'special';
export type CardRarity = 'base' | 'signature' | 'common' | 'rare' | 'hidden';
export type GamePhase = 'question' | 'resonance' | 'card_generation' | 'battle';
export type RoomStatus = 'waiting' | 'setup' | 'playing' | 'finished';
export type QuestionDepth = 'icebreaker' | 'expansion' | 'deep';

export type Card = {
  id: string;
  name: string;
  description: string;
  effect: string;
  effect_code: string;
  cost: number;
  exposure: number;
  rarity: CardRarity;
  type: CardType;
  group?: CardGroup;
  mbti?: string;
  needsTarget?: boolean;
  activation?: string;
};

export type ActiveEffect = {
  type: string;
  value?: number;
  source_player_id?: string;
  target_player_id?: string;
  rounds_remaining?: number;
  condition?: string;
};

export type Player = {
  id: string;
  nickname: string;
  mbti: string;
  group: CardGroup;
  hand: Card[];
  deck: Card[];
  discard: Card[];
  hidden_skill: Card | null;
  hp: number;
  cost: number;
  exposure: number;
  resonance: number;
  resonance_with: string[];
  is_alive: boolean;
  setup_complete: boolean;
  current_answer: string | null;
  answer_visibility: 'public' | 'private' | 'skipped' | null;
  cards_played_this_round: number;
  battle_turn_done: boolean;
  effects: ActiveEffect[];
  is_host: boolean;
};

export type Question = {
  id: string;
  text: string;
  depth: QuestionDepth;
};

export type GameLog = {
  timestamp: number;
  message: string;
  player_id?: string;
  type: 'info' | 'action' | 'system' | 'combat';
};

export type GameRoom = {
  id: string;
  room_code: string;
  status: RoomStatus;
  current_round: number;
  current_phase: GamePhase | null;
  current_turn_player_id: string | null;
  current_question: Question | null;
  players: Player[];
  game_log: GameLog[];
  created_at: string;
  updated_at: string;
};

export type WinResult = {
  playerId: string;
  condition: string;
};
