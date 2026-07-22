import { create } from 'zustand'
import type { UserInfo } from '@/types'

interface UserStore {
  userInfo: UserInfo;
  setUserInfo: (userInfo: UserInfo) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  userInfo: {
    id: 0,
    phone: '',
    nickname: '',
    avatar_url: null,
    status: 0
  },
  setUserInfo: (userInfo: UserInfo) => set({ userInfo })
})); 