// stores/useUserStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login, getUserInfo, getInitStatus, initSystem } from '../api';
import { setCurrentToken } from "../api/axios";

const useUserStore = create(
    persist(
        (set, get) => ({
            user: null,
            isLoggedIn: false,
            token: null,
            isInitialized: true, // Default to true, will check on app load

            checkInitStatus: async () => {
                try {
                    const result = await getInitStatus();
                    if (result.success) {
                        set({ isInitialized: result.data });
                        return result.data;
                    }
                } catch (error) {
                    console.error('Failed to check init status', error);
                }
                return true;
            },

            systemInit: async (data, companyStore) => {
                const initResult = await initSystem(data);
                if (!initResult.success) {
                    return {
                        success: false,
                        message: initResult.message || '初始化失败',
                    };
                }

                const token = initResult.data;
                set({
                    token: token,
                    isLoggedIn: true,
                    isInitialized: true,
                });
                setCurrentToken(token);

                // 获取用户信息
                const userInfoResult = await getUserInfo();
                if (userInfoResult.success) {
                    set({
                        user: userInfoResult.data,
                    });

                    // 获取公司信息
                    if (companyStore && userInfoResult.data.company_id) {
                        await companyStore.CompanyInfo(userInfoResult.data.company_id);
                    }
                }

                return {
                    success: true,
                    message: '初始化成功',
                };
            },

            userLogin: async (credentials) => {
                // 1. 执行登录请求
                const loginResult = await login(credentials);
                console.log('loginResult', loginResult);
                if (!loginResult.success) {
                    return {
                        success: false,
                        message: loginResult.message || '登录失败',
                    };
                }

                const token = loginResult.data;

                set({
                    token: token,
                    isLoggedIn: true,
                });
                setCurrentToken(token)

                // 2. 使用 token 获取用户信息
                const userInfoResult = await getUserInfo();
                if (!userInfoResult.success) {
                    return {
                        success: false,
                        message: userInfoResult.message || '获取用户信息失败',
                    };
                }

                // 3. 更新 store 状态
                set({
                    user: userInfoResult.data,
                    token: token,
                    isLoggedIn: true,
                });

                return {
                    success: true,
                    message: '登录成功',
                    user: userInfoResult.data
                };
            },

            logout: () => set({
                user: null,
                token: null,
                isLoggedIn: false,
            }),

            updateProfile: (userData) => set((state) => ({
                user: { ...state.user, ...userData }
            })),

            getToken: () => get().token,
        }),
        {
            name: 'user-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isLoggedIn: state.isLoggedIn,
            }),
        }
    )
);

export default useUserStore;