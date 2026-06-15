import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppStore = create(
    persist(
        (set, get) => ({
            // 状态
            loading: false,

            // Actions - 更新状态的方法
            setLoading: (loading) => set({ loading }),
        }),
        {
            name: 'app-storage', // localStorage的key
        }
    )
);

export default useAppStore;