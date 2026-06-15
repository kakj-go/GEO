// src/stores/useCombinedStore.js
import userStore from './useUserStore';
import appStore from './useAppStore';

// 创建自定义组合 Hook
export const useCombinedStore = () => {
    const user = userStore();
    const app = appStore();

    // 组合方法
    const loginWithLoading = async (credentials) => {
        app.setLoading(true);
        try {
            const result = await user.userLogin(credentials);
            return result;
        } finally {
            app.setLoading(false);
        }
    };

    return {
        login: loginWithLoading,
    };
};

export default useCombinedStore;