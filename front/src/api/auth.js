// api/auth.js
import api from './axios';

/**
 * 用户登录
 * @param {Object} credentials - 登录凭证
 * @param {string} credentials.username - 用户名
 * @param {string} credentials.password - 密码
 * @returns {Promise}
 */
export const login = async (credentials) => {
    return await api.post('/v1/auth/login', credentials);
};

/**
 * 获取初始化状态
 * @returns {Promise}
 */
export const getInitStatus = async () => {
    return await api.get('/v1/auth/init_status');
};

/**
 * 初始化系统
 * @param {Object} data - 初始化数据
 * @returns {Promise}
 */
export const initSystem = async (data) => {
    return await api.post('/v1/auth/init', data);
};