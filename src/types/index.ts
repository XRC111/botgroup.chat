// 用户相关类型
export interface UserInfo {
  id: number;
  phone: string;
  nickname: string;
  avatar_url: string | null;
  status: number;
}

// AI 角色相关类型
export interface AICharacter {
  id: string;
  name: string;
  personality: string;
  model: string; // 改为 string，因为不同模型有不同的配置
  avatar?: string;
  custom_prompt?: string;
  tags?: string[];
  stages?: {
    name: string;
    prompt: string;
  }[];
  rag?: boolean;
  knowledge?: string;
}

// 模型类型
export type ModelType = 
  | 'qwen-plus' 
  | 'deepseek-v3-250324' 
  | 'hunyuan-turbos-latest' 
  | 'doubao-1-5-lite-32k-250115' 
  | 'ep-20250306223646-szzkw' 
  | 'glm-4-air' 
  | 'qwen-turbo' 
  | 'deepseek-chat' 
  | 'moonshot-v1-8k' 
  | 'ernie-3.5-128k';

// 群组相关类型
export interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  isGroupDiscussionMode: boolean;
}

// 消息发送者类型
export interface MessageSender {
  id: string | number;
  name: string;
  avatar?: string | null;
}

// 消息相关类型
export interface Message {
  id: number;
  sender: MessageSender;
  content: string;
  isAI: boolean;
  isError?: boolean;
}

// 历史消息项类型
export interface HistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name: string;
}

// ChatUI 组件相关类型
export interface ChatState {
  groups: Group[];
  selectedGroupIndex: number;
  currentGroup: Group | null;
  groupAiCharacters: AICharacter[];
  isLoading: boolean;
  isInitializing: boolean;
  isGroupDiscussionMode: boolean;
  users: Array<{
    id: string | number;
    name: string;
    avatar: string | null;
  }>;
  messages: Message[];
  inputMessage: string;
  mutedUsers: string[];
  showPoster: boolean;
  sidebarOpen: boolean;
  showAd: boolean;
}

// API 响应类型
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
}

// 调度器请求参数
export interface SchedulerRequest {
  message: string;
  history: HistoryMessage[];
  availableAIs: AICharacter[];
}

// 调度器响应
export interface SchedulerResponse {
  selectedAIs: string[];
}

// Chat 请求参数
export interface ChatRequest {
  model: string;
  message: string;
  query: string;
  personality: string;
  history: HistoryMessage[];
  index: number;
  aiName: string;
  rag?: boolean;
  knowledge?: string;
  custom_prompt: string;
}

// 初始化聊天响应类型
export interface InitChatResponse {
  groups: Group[];
  characters: AICharacter[];
  user?: any;
}

// 流式响应数据块类型
export interface StreamDataChunk {
  content?: string;
}
