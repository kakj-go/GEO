// api/model.js
import api from './axios';

// 设置内置默认模型
export const setBuiltinDefaultModel = async (modelType, modelId) => {
    return await api.post('/v1/model/builtin_default', {
        model_type: modelType,
        model_id: modelId,
    });
};

// 获取单个类型的内置默认模型
export const getBuiltinDefaultModel = async (modelType) => {
    return await api.get('/v1/model/builtin_default', {
        params: { model_type: modelType }
    });
};

// 获取所有类型的内置默认模型
export const getAllBuiltinDefaults = async () => {
    return await api.get('/v1/model/builtin_defaults');
};

// 获取模型计价配置
export const getModelPricing = async () => {
    return await api.get('/v1/model/pricing');
};

// 获取默认模型（保留兼容）
export const getDefaultModel = async (modelType = 'llm') => {
    return await api.get('/v1/model/get_default', {
        params: { model_type: modelType }
    });
};

// 获取 APIMart API Key
export const getApimartKey = async () => {
    return await api.get('/v1/model/apimart_key');
};

// 设置 APIMart API Key
export const setApimartKey = async (apiKey) => {
    return await api.put('/v1/model/apimart_key', { api_key: apiKey });
};