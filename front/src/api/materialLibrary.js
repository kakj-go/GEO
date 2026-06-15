// api/materialLibrary.js
import api from './axios';

// 获取素材库列表
export const getMaterialLibraryList = async (params = {}) => {
  return await api.get('/v1/material_library', { params });
};

// 获取单个素材详情
export const getMaterialLibraryDetail = async (id) => {
  return await api.get(`/v1/material_library/${id}`);
};

// 创建素材
export const createMaterialLibrary = async (data) => {
  return await api.post('/v1/material_library', data);
};

// 更新素材信息
export const updateMaterialLibrary = async (id, data) => {
  return await api.put(`/v1/material_library/${id}`, data);
};

// 删除素材
export const deleteMaterialLibrary = async (id) => {
  return await api.delete(`/v1/material_library/${id}`);
};

// 上传素材文件
export const uploadMaterialFile = async (formData) => {
  return await api.post('/v1/material_library/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};
