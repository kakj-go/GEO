// api/assetsLibrary.js
import api from './axios';

// 获取图片库列表
export const getAssetsLibraryList = async (params = {}) => {
  return await api.get('/v1/assets_library', { params });
};

// 获取单个图片详情
export const getAssetsLibraryDetail = async (id) => {
  return await api.get(`/v1/assets_library/${id}`);
};

// 更新图片信息
export const updateAssetsLibrary = async (id, data) => {
  return await api.put(`/v1/assets_library/${id}`, data);
};

// 删除图片
export const deleteAssetsLibrary = async (id) => {
  return await api.delete(`/v1/assets_library/${id}`);
};

// 上传图片
export const uploadAssets = async (formData) => {
  return await api.post('/v1/assets_library', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};
