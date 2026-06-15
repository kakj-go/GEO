// api/videoJob.js
import api from './axios';

/**
 * 创建视频任务
 * @param {Object} data - 视频任务数据
 * @returns {Promise}
 */
export const createVideoJob = async (data) => {
    return await api.post('/v1/video_job', data);
};

/**
 * 根据ID获取视频任务详情
 * @param {number} id - 视频任务ID
 * @returns {Promise}
 */
export const getVideoJobByID = async (id) => {
    return await api.get(`/v1/video_job/${id}`);
};

/**
 * 更新视频任务收录状态
 * @param {number} id - 视频任务ID
 * @param {Object} data - 收录状态信息
 * @returns {Promise}
 */
export const updateVideoJobSendStatus = async (id, data) => {
    return await api.put(`/v1/video_job/${id}/status`, data);
};

/**
 * 分页查询视频任务列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export const getVideoJobsWithPage = async (params) => {
    return await api.get('/v1/video_job', { params });
};

/**
 * 取消视频任务
 * @param {number} id - 视频任务ID
 * @returns {Promise}
 */
export const cancelVideoJob = async (id) => {
    return await api.put(`/v1/video_job/${id}/cancel`);
};