import React, { useState, useRef, useEffect } from 'react';
import { Send, Share2, Settings2, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import type { Group, AICharacter, Message } from '@/types';
import { useUserStore } from '@/store/userStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { getAvatarData } from '@/utils/avatar';
import { initChat, getUserInfo } from '@/services/api';
import { SharePoster } from '@/pages/chat/components/SharePoster';
import { MembersManagement } from '@/pages/chat/components/MembersManagement';
import Sidebar from './Sidebar';
import { AdBanner, AdBannerMobile } from './AdSection';

// KaTeX 样式组件
const KaTeXStyle = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .chat-message .katex-html { display: none; }
    .chat-message .katex { font: normal 1.1em KaTeX_Main, Times New Roman, serif; line-height: 1.2; text-indent: 0; white-space: nowrap; text-rendering: auto; }
    .chat-message .katex-display { display: block; margin: 1em 0; text-align: center; }
    @import "katex/dist/katex.min.css";
  `}} />
);

interface ChatUIProps {
  // 可以添加一些配置项
}

export const ChatUI: React.FC<ChatUIProps> = () => {
  const userStore = useUserStore();
  const isMobile = useIsMobile();

  // URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const selectedGroupIndex = urlParams.get('id') ? parseInt(urlParams.get('id')!) : 0;

  // State 管理
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupAiCharacters, setGroupAiCharacters] = useState<AICharacter[]>([]);
  const [users, setUsers] = useState<Array<{ id: string | number; name: string; avatar: string | null }>>([]);
  const [allNames, setAllNames] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGroupDiscussionMode, setIsGroupDiscussionMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAd, setShowAd] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedContentRef = useRef("");
  const currentMessageRef = useRef<number | null>(null);
  const isTyping = useRef(false);
  const abortController = useRef<AbortController | null>(null);
  const isInitialized = useRef(false);

  // 根据设备类型设置侧边栏默认状态
  useEffect(() => {
    if (isMobile !== undefined) {
      setSidebarOpen(!isMobile);
    }
  }, [isMobile]);

  // 初始化数据
  useEffect(() => {
    if (isInitialized.current) return;

    const initData = async () => {
      try {
        const response = await initChat();
        if (!response.ok || !response.data) {
          throw new Error('初始化数据失败');
        }

        const { data } = response;
        const group = data.groups[selectedGroupIndex];
        const characters = data.characters;

        setGroups(data.groups);
        setCurrentGroup(group);
        setIsGroupDiscussionMode(group.isGroupDiscussionMode);

        // 过滤并排序 AI 角色
        const filteredCharacters = characters
          .filter((character: AICharacter) => group.members.includes(character.id))
          .filter((character: AICharacter) => character.personality !== 'sheduler')
          .sort((a: AICharacter, b: AICharacter) => {
            return group.members.indexOf(a.id) - group.members.indexOf(b.id);
          });

        setGroupAiCharacters(filteredCharacters);

        // 构建所有名称列表
        const names = filteredCharacters.map((c: AICharacter) => c.name);
        names.push('user');
        setAllNames(names);

        // 处理用户信息
        let avatarUrl: string | null = null;
        let nickname = '我';

        if (data.user) {
          const userInfoResponse = await getUserInfo();
          if (userInfoResponse.data) {
            userStore.setUserInfo(userInfoResponse.data);
            avatarUrl = userInfoResponse.data.avatar_url;
            nickname = userInfoResponse.data.nickname;
          }
        } else {
          userStore.setUserInfo({
            id: 0,
            phone: '',
            nickname,
            avatar_url: null,
            status: 0
          });
        }

        setUsers([
          { id: 1, name: nickname, avatar: avatarUrl },
          ...filteredCharacters.map(c => ({
            id: c.id,
            name: c.name,
            avatar: c.avatar || null
          }))
        ]);
      } catch (error) {
        console.error('初始化数据失败:', error);
        setIsInitializing(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initData();
    isInitialized.current = true;
  }, [selectedGroupIndex, userStore]);

  // 监听用户信息变化
  useEffect(() => {
    if (userStore.userInfo && users.length > 0) {
      setUsers(prev => [
        {
          id: 1,
          name: userStore.userInfo.nickname,
          avatar: userStore.userInfo.avatar_url || null
        },
        ...prev.slice(1)
      ]);
    }
  }, [userStore.userInfo]);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 消息变化时隐藏广告
  useEffect(() => {
    if (messages.length > 0) {
      setShowAd(false);
    }
  }, [messages]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, []);

  // 工具函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleShareChat = () => {
    setShowPoster(true);
  };

  const handleToggleMute = (userId: string) => {
    setMutedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectGroup = (index: number) => {
    window.location.href = `?id=${index}`;
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (isLoading || !inputMessage.trim() || !currentGroup) return;

    // 添加用户消息
    const userMessage: Message = {
      id: messages.length + 1,
      sender: users[0],
      content: inputMessage,
      isAI: false
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // 构建历史消息
    const messageHistory = messages.map(msg => ({
      role: 'user' as const,
      content: msg.sender.name === userStore.userInfo.nickname 
        ? 'user：' + msg.content 
        : msg.sender.name + ':' + msg.content,
      name: msg.sender.name
    }));

    // 选择 AI 角色
    let selectedAIs = groupAiCharacters;
    if (!isGroupDiscussionMode) {
      try {
        const schedulerResponse = await fetch('/api/scheduler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputMessage,
            history: messageHistory,
            availableAIs: groupAiCharacters
          })
        });
        
        if (schedulerResponse.ok) {
          const schedulerData = await schedulerResponse.json();
          selectedAIs = schedulerData.selectedAIs
            .map((aiId: string) => groupAiCharacters.find(c => c.id === aiId))
            .filter(Boolean);
        }
      } catch (error) {
        console.error('调度器调用失败:', error);
      }
    }

    // 依次调用每个 AI
    for (let i = 0; i < selectedAIs.length; i++) {
      const ai = selectedAIs[i];
      if (mutedUsers.includes(ai.id)) continue;

      const aiMessage: Message = {
        id: messages.length + 2 + i,
        sender: { id: ai.id, name: ai.name, avatar: ai.avatar || null },
        content: "",
        isAI: true
      };

      setMessages(prev => [...prev, aiMessage]);

      try {
        const uri = ai.rag ? '/rag/query' : '/api/chat';
        const response = await fetch(uri, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ai.model,
            message: inputMessage,
            query: inputMessage,
            personality: ai.personality,
            history: messageHistory,
            index: i,
            aiName: ai.name,
            rag: ai.rag,
            knowledge: ai.knowledge,
            custom_prompt: ai.custom_prompt?.replace('#groupName#', currentGroup.name) + "\n" + currentGroup.description
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('请求失败');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completeResponse = '';
        const timeout = 10000;

        while (true) {
          const startTime = Date.now();
          const { done, value } = await Promise.race([
            reader.read(),
            new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) =>
              setTimeout(() => reject(new Error('响应超时')), timeout - (Date.now() - startTime))
            )
          ]);

          if (Date.now() - startTime > timeout) {
            reader.cancel();
            if (!completeResponse.trim()) {
              throw new Error('响应超时');
            }
            break;
          }

          if (done) {
            if (!completeResponse.trim()) {
              completeResponse = "对不起，我还不够智能，服务又断开了。";
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  completeResponse += data.content;
                  // 移除 AI 名称前缀
                  completeResponse = completeResponse.replace(
                    new RegExp(`^(${allNames.join('|')}):`, 'i'),
                    ''
                  );
                  
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessage.id
                      ? { ...msg, content: completeResponse }
                      : msg
                  ));
                }
              } catch (e) {
                console.error('解析响应数据失败:', e);
              }
            }
          }
        }

        // 将 AI 回复添加到历史消息
        messageHistory.push({
          role: 'user' as const,
          content: `${ai.name}:${completeResponse}`,
          name: ai.name
        });

        // 等待一段时间再开始下一个 AI
        if (i < selectedAIs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error("发送消息失败:", error);
        const errorMessage = `对不起，我还不够智能，服务又断开了 (错误：${error instanceof Error ? error.message : '未知错误'})。`;
        
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessage.id
            ? { ...msg, content: errorMessage, isError: true }
            : msg
        ));

        messageHistory.push({
          role: 'user' as const,
          content: `${ai.name}${errorMessage}`,
          name: ai.name
        });
      }
    }

    setIsLoading(false);
  };

  // 加载检查
  if (isInitializing || !currentGroup) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-orange-50/70 to-orange-100 flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <KaTeXStyle />
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-orange-50/70 to-orange-100 flex items-start md:items-center justify-center overflow-hidden">
        <div className="h-full flex bg-white w-full mx-auto relative shadow-xl md:max-w-5xl md:h-[96dvh] md:my-auto md:rounded-lg">
          {/* Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            selectedGroupIndex={selectedGroupIndex}
            onSelectGroup={handleSelectGroup}
            groups={groups}
          />

          {/* Main Chat Area */}
          <div className="flex flex-col flex-1">
            {/* Header */}
            <header className="bg-white shadow flex-none md:rounded-t-lg">
              <div className="flex items-center justify-between px-0 py-1.5">
                {/* Left: Group Info */}
                <div className="flex items-center md:px-2.5">
                  <div
                    className="md:hidden flex items-center justify-center m-1 cursor-pointer"
                    onClick={toggleSidebar}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </div>
                  <h1 className="font-medium text-base -ml-1">{currentGroup.name}({users.length})</h1>
                </div>

                {/* Right: Avatars & Actions */}
                <div className="flex items-center">
                  {/* Ad Banner (Desktop only) */}
                  <div className="hidden md:block">
                    <AdBanner show={showAd} closeAd={() => setShowAd(false)} />
                  </div>

                  {/* User Avatars */}
                  <div className="flex -space-x-2">
                    {users.slice(0, 4).map((user) => {
                      const avatarData = getAvatarData(user.name);
                      return (
                        <TooltipProvider key={user.id}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Avatar className="w-7 h-7 border-2 border-white">
                                {user.avatar ? (
                                  <AvatarImage src={user.avatar} />
                                ) : (
                                  <AvatarFallback style={{ backgroundColor: avatarData.backgroundColor, color: 'white' }}>
                                    {avatarData.text}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{user.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                    {users.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs border-2 border-white">
                        +{users.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Settings Button */}
                  <Button variant="ghost" size="icon" onClick={() => setShowMembers(true)}>
                    <Settings2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden bg-gray-100">
              <ScrollArea className={`h-full ${!showAd ? 'px-2 py-1' : 'px-2 py-1'} md:px-2 md:py-1`} ref={chatAreaRef}>
                {/* Mobile Ad */}
                <div className="md:hidden">
                  <AdBannerMobile show={showAd} closeAd={() => setShowAd(false)} />
                </div>

                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-2 ${message.sender.name === userStore.userInfo.nickname ? "justify-end" : ""}`}
                    >
                      {/* Sender Avatar (left) */}
                      {message.sender.name !== userStore.userInfo.nickname && (
                        <Avatar>
                          {message.sender.avatar ? (
                            <AvatarImage src={message.sender.avatar} className="w-10 h-10" />
                          ) : (
                            <AvatarFallback style={{ backgroundColor: getAvatarData(message.sender.name).backgroundColor, color: 'white' }}>
                              {message.sender.name[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}

                      {/* Message Content */}
                      <div className={message.sender.name === userStore.userInfo.nickname ? "text-right" : ""}>
                        <div className="text-sm text-gray-500">{message.sender.name}</div>
                        <div
                          className={`mt-1 p-3 rounded-lg shadow-sm chat-message ${
                            message.sender.name === userStore.userInfo.nickname
                              ? "bg-blue-500 text-white text-left"
                              : "bg-white"
                          }`}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            className={`prose dark:prose-invert max-w-none ${
                              message.sender.name === userStore.userInfo.nickname ? "text-white [&_*]:text-white" : ""
                            }
                            [&_h2]:py-1 [&_h2]:m-0
                            [&_h3]:py-1.5 [&_h3]:m-0
                            [&_p]:m-0
                            [&_pre]:bg-gray-900 [&_pre]:p-2 [&_pre]:m-0 [&_pre]:rounded-lg [&_pre]:text-gray-100 [&_pre]:whitespace-pre-wrap [&_pre]:break-words
                            [&_pre_code]:whitespace-pre-wrap [&_pre_code]:break-words
                            [&_code]:text-sm [&_code]:text-gray-400
                            [&_code:not(:where([class~="language-"]))]:text-pink-500 [&_code:not(:where([class~="language-"]))]:bg-transparent
                            [&_a]:text-blue-500 [&_a]:no-underline
                            [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1
                            [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:italic`}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Sender Avatar (right) */}
                      {message.sender.name === userStore.userInfo.nickname && (
                        <Avatar>
                          {message.sender.avatar ? (
                            <AvatarImage src={message.sender.avatar} className="w-10 h-10" />
                          ) : (
                            <AvatarFallback style={{ backgroundColor: getAvatarData(message.sender.name).backgroundColor, color: 'white' }}>
                              {message.sender.name[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />

                  {/* QR Code (hidden by default) */}
                  <div id="qrcode" className="flex flex-col items-center hidden">
                    <img src="/img/qr.png" alt="QR Code" className="w-24 h-24" />
                    <p className="text-sm text-gray-500 mt-2 font-medium tracking-tight bg-gray-50 px-3 py-1 rounded-full">
                      扫码体验 AI 群聊
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="bg-white border-t py-3 px-2 md:rounded-b-lg">
              <div className="flex gap-1 pb-[env(safe-area-inset-bottom)]">
                {/* Share Button */}
                {messages.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handleShareChat} className="px-3">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>分享聊天记录</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Input Field */}
                <Input
                  placeholder="输入消息..."
                  className="flex-1"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />

                {/* Send Button */}
                <Button onClick={handleSendMessage} disabled={isLoading}>
                  {isLoading ? (
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Members Management Dialog */}
        <MembersManagement
          showMembers={showMembers}
          setShowMembers={setShowMembers}
          users={users}
          mutedUsers={mutedUsers}
          handleToggleMute={handleToggleMute}
          isGroupDiscussionMode={isGroupDiscussionMode}
          onToggleGroupDiscussion={() => setIsGroupDiscussionMode(!isGroupDiscussionMode)}
          getAvatarData={getAvatarData}
        />
      </div>

      {/* Share Poster */}
      <SharePoster
        isOpen={showPoster}
        onClose={() => setShowPoster(false)}
        chatAreaRef={chatAreaRef}
      />
    </>
  );
};

export default ChatUI;
