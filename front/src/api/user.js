// api/user.js
import api from './axios';

/**
 * 获取用户信息
 * @returns {Promise}
 */
export const getUserInfo = async () => {
    return await api.get('/v1/user/user_info');
};

/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @returns {Promise}
 */
export const getUsersByCompany = async (params) => {
    return await api.get('/v1/user/company/1', { params });
};

/**
 * 更新用户信息
 * @param {number} id - 用户ID
 * @param {Object} data - 更新数据
 * @param {string} [data.nickname] - 昵称
 * @param {string} [data.avatar] - 头像URL
 * @param {string} [data.phone] - 电话
 * @param {string} [data.passwd] - 密码
 * @returns {Promise}
 */
export const updateUser = async (id, data) => {
    return await api.put(`/v1/user/${id}`, data);
};

/**
 * 创建用户
 * @param {Object} data - 用户数据
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @param {string} data.nickname - 昵称
 * @param {string} data.phone - 电话
 * @param {string} [data.avatar] - 头像URL
 * @param {number} data.company_id - 公司ID
 * @returns {Promise}
 */
export const createUser = async (data) => {
    return await api.post('/v1/user', data);
};

/**
 * 删除用户
 * @param {number} id - 用户ID
 * @returns {Promise}
 */
export const deleteUser = async (id) => {
    return await api.delete(`/v1/user/${id}`);
};
