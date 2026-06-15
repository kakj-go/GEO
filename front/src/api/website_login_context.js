// api/user.js
import axios from "./axios";

export const getWebsideInfos = async () => {
    return axios.get('/v1/website_login_context/get_webside_infos');
};

export const getWebsideLoginContexts = async (params) => {
    return axios.get('/v1/website_login_context', { params });
};

export const updateWebsideLoginContexts = async (id, submitData) => {
    return axios.put('/v1/website_login_context/'+id, submitData);
};

export const createWebsideLoginContexts = async (submitData) => {
    return axios.post('/v1/website_login_context', submitData);
};

export const deleteWebsideLoginContexts = async (id) => {
    return axios.delete('/v1/website_login_context/'+id);
};

export const getWebsideLoginContext = async (id) => {
    return axios.get('/v1/website_login_context/'+id);
};
