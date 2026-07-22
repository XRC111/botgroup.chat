import { useState, useCallback, useRef } from 'react';

interface UseChatMessageOptions {
  onError?: (error: Error) => void;
}

/**
 * 处理聊天消息发送的 Hook
 */
export function useChatMessage(options?: UseChatMessageOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    chatParams: any,
    onProgress?: (content: string) => void
  ) => {
    if (isLoading) return;

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      // 这里将调用 API 服务
      // 实际实现将在后续步骤中完成
      console.log('Sending message:', message, chatParams);
    } catch (error) {
      if (options?.onError && error instanceof Error) {
        options.onError(error);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, options]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    isLoading,
    sendMessage,
    cancel,
  };
}
