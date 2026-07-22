import type { ApiResponse, SchedulerRequest, SchedulerResponse, ChatRequest } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * 获取存储的 token
 */
function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * 统一的请求函数
 */
async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    // 处理 401 未授权
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Request error:', error);
    throw error;
  }
}

/**
 * 初始化数据
 */
export async function initChat() {
  return request<{
    groups: any[];
    characters: any[];
    user?: any;
  }>('/api/init');
}

/**
 * 获取用户信息
 */
export async function getUserInfo() {
  return request<{
    id: number;
    phone: string;
    nickname: string;
    avatar_url: string | null;
    status: number;
  }>('/api/user/info');
}

/**
 * 调用调度器选择 AI
 */
export async function callScheduler(data: SchedulerRequest) {
  return request<SchedulerResponse>('/api/scheduler', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 发送聊天消息
 */
export async function sendChatMessage(data: ChatRequest, useRag: boolean = false) {
  const uri = useRag ? '/rag/query' : '/api/chat';
  return request(uri, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 发送验证码
 */
export async function sendCode(phone: string) {
  return request('/api/sendCode', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

/**
 * 登录
 */
export async function login(phone: string, code: string) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

/**
 * 更新用户信息
 */
export async function updateUserInfo(data: any) {
  return request('/api/user/update', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 上传用户头像
 */
export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const token = getToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/user/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Upload failed');
  }

  return response.json();
}
