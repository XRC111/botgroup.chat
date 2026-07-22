import { useState, useEffect, useRef, useCallback } from 'react';
import type { Group, AICharacter, Message, UserInfo } from '@/types';
import { initChat, getUserInfo } from '@/services/api';
import { useUserStore } from '@/store/userStore';

interface UseChatInitializationOptions {
  selectedGroupIndex: number;
  isMobile?: boolean;
}

interface UseChatInitializationReturn {
  groups: Group[];
  currentGroup: Group | null;
  groupAiCharacters: AICharacter[];
  users: Array<{ id: string | number; name: string; avatar: string | null }>;
  allNames: string[];
  isInitializing: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  error: string | null;
}

/**
 * 处理聊天初始化的 Hook
 */
export function useChatInitialization({
  selectedGroupIndex,
  isMobile
}: UseChatInitializationOptions): UseChatInitializationReturn {
  const userStore = useUserStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupAiCharacters, setGroupAiCharacters] = useState<AICharacter[]>([]);
  const [users, setUsers] = useState<Array<{ id: string | number; name: string; avatar: string | null }>>([]);
  const [allNames, setAllNames] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      } catch (err) {
        console.error('初始化数据失败:', err);
        setError(err instanceof Error ? err.message : '初始化失败');
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

  return {
    groups,
    currentGroup,
    groupAiCharacters,
    users,
    allNames,
    isInitializing,
    sidebarOpen,
    setSidebarOpen,
    error
  };
}
