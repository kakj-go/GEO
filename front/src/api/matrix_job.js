// api/matrix_job.js
import axios from "./axios";

export const getAIEOSendJob = async () => {
    return axios.post('/v1/aieo_generate/get_send_job');
};