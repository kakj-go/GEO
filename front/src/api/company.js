import api from "./axios";

export const getCompanyInfo = async (company_id) => {
    return await api.get('/v1/company/'+company_id);
};

export const updateCompany = async (company_id, data) => {
    return await api.put('/v1/company/'+company_id, data);
};

export const getTransactions = async (company_id, params) => {
    return await api.get('/v1/company/'+company_id+'/transactions', { params });
};

export const getUsageLogs = async (company_id, params) => {
    return await api.get('/v1/company/'+company_id+'/usage_logs', { params });
};

export const recharge = async (company_id, data) => {
    return await api.post('/v1/company/'+company_id+'/recharge', data);
};