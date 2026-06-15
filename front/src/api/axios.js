// api/axios.js
import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
    baseURL: process.env.REACT_APP_API_HOST || 'http://localhost:8080',
    timeout: 100000,
});

let currentToken = null;

export const setCurrentToken = (token) => {
    currentToken = token;
};

export const getTokenFromStore = () => {
    return currentToken || getTokenFromStorage();
};

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        // 从 localStorage 获取 token（因为 Zustand persist 存到 localStorage）
        const token = getTokenFromStorage() || getTokenFromStore();

        if (token) {
            config.headers.Authorization = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        // 2xx 范围内的状态码都会触发该函数。
        // 如果业务代码需要，这里可以统一判断 response.data.success
        return response.data;
    },
    (error) => {
        // 超出 2xx 范围的状态码都会触发该函数。
        console.error('API Error:', error);

        // 401 未授权，清除 token 并触发全局登出事件
        if (error.response?.status === 401) {
            clearTokenFromStorage();
            window.dispatchEvent(new Event('logout'));
        }

        return Promise.reject({
            success: false,
            message: error.response?.data?.message || error.message || '网络错误',
            data: error.response?.data?.data || null,
            status: error.response?.status,
        });
    }
);

// 从 localStorage 获取 token 的辅助函数
function getTokenFromStorage() {
    try {
        const userStorage = localStorage.getItem('user-storage');
        if (userStorage) {
            const parsed = JSON.parse(userStorage);
            return parsed.state?.token;
        }
    } catch (error) {
        console.warn('Failed to parse token from storage');
    }
    return null;
}

// 清除 token 的辅助函数
function clearTokenFromStorage() {
    try {
        const userStorage = localStorage.getItem('user-storage');
        if (userStorage) {
            const parsed = JSON.parse(userStorage);
            parsed.state.token = null;
            parsed.state.isLoggedIn = false;
            localStorage.setItem('user-storage', JSON.stringify(parsed));
        }
        setCurrentToken(null)
    } catch (error) {
        console.warn('Failed to clear token from storage');
    }
}

export default api;