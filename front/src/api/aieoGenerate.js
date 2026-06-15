// api/aieoGenerate.js
import api from './axios';

/**
 * 创建AIEO生成任务
 * @param {Object} data - 任务数据
 * @returns {Promise}
 */
export const createAIEOGenerate = async (data) => {
    return await api.post('/v1/aieo_generate', data);
};

/**
 * 更新AIEO生成任务创作内容
 * @param {number} id - 任务ID
 * @param {string} content - 创作内容
 * @returns {Promise}
 */
export const updateAIEOGenerateContent = async (id, content) => {
    return await api.put(`/v1/aieo_generate/${id}/content`, { content });
};

/**
 * 取消AIEO生成任务
 * @param {number} id - 任务ID
 * @param {number} status - 新状态
 * @returns {Promise}
 */
export const cancelAIEOGenerate = async (id) => {
    return await api.put(`/v1/aieo_generate/${id}/status`);
};

/**
 * 删除AIEO生成任务
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export const deleteAIEOGenerate = async (id) => {
    return await api.delete(`/v1/aieo_generate/${id}`);
};

/**
 * 获取AIEO生成任务详情
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export const getAIEOGenerateByID = async (id) => {
    return await api.get(`/v1/aieo_generate/${id}`);
};

/**
 * 分页查询AIEO生成任务列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export const getAIEOGeneratesWithPage = async (params) => {
    return await api.get('/v1/aieo_generate', { params });
};

/**
 * 生成用户可能会问到的问题
 * @param {Object} data - 请求数据
 * @returns {Promise}
 */
export const generateUserQuestions = async (data) => {
    return await api.post('/v1/aieo_generate/generate_user_questions', data);
};

/**
 * 开始发送AIEO生成任务
 * @param {number} id - 任务ID
 * @param websiteLoginContextIDs
 * @returns {Promise}
 */
export const startSendAIEOGenerate = async (id, websiteLoginContextIDs) => {
    return await api.post(`/v1/aieo_generate/${id}/start_send`, { website_login_context_ids: websiteLoginContextIDs });
};

/**
 * 报告AIEO生成任务发送信息
 * @param {number} id - 任务ID
 * @param {Array} sendInfo - 发送信息
 * @returns {Promise}
 */
export const reportSendInfo = async (id, sendInfo) => {
    return await api.put(`/v1/aieo_generate/${id}/report_send_info`, sendInfo);
};

/**
 * 获取任务矩阵统计信息
 * @returns {Promise}
 */
export const getMatrixStats = async () => {
    return await api.get('/v1/aieo_generate/stats');
};