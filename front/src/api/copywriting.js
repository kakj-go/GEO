import api, { getTokenFromStore } from './axios';

// ======================== Session 接口 ========================

// 创建新会话
export const createCopywritingSession = (data) => {
    return api.post('/v1/copywriting/session', data);
};

// 获取会话列表
export const getCopywritingSessions = (params) => {
    return api.get('/v1/copywriting/session', { params });
};

// 获取单个会话 (包含所有历史记录)
export const getCopywritingSession = (id) => {
    return api.get(`/v1/copywriting/session/${id}`);
};

// 删除会话
export const deleteCopywritingSession = (id) => {
    return api.delete(`/v1/copywriting/session/${id}`);
};

// 获取会话的文件列表
export const getCopywritingFilesBySession = (id) => {
    return api.get(`/v1/copywriting/session/${id}/files`);
};

// 获取所有文件 (分页)
export const getCopywritingFiles = (params) => {
    return api.get('/v1/copywriting/files', { params });
};

// 获取单个文件
export const getCopywritingFile = (id) => {
    return api.get(`/v1/copywriting/file/${id}`);
};

// 更新文件内容
export const updateCopywritingFile = (id, data) => {
    return api.put(`/v1/copywriting/file/${id}`, data);
};

// 删除文件 (软删除)
export const deleteCopywritingFile = (id) => {
    return api.delete(`/v1/copywriting/file/${id}`);
};

// 恢复文件
export const recoverCopywritingFile = (id) => {
    return api.post(`/v1/copywriting/file/${id}/recover`);
};

// 获取可用的文案技能模板模板
export const getCopywritingSkills = () => {
    return api.get('/v1/copywriting/skills');
};

// ======================== 流式对话 接口 ========================

/**
 * 流式对话 (Server-Sent Events)
 * @param {number|string} sessionId 会话ID (0表示新建)
 * @param {string} message 用户消息
 * @param {string} modelId 选择的模型
 * @param {string} mode 模式 (quick/think)
 * @param {function} onMessage 收到消息 delta 的回调
 * @param {function} onDone 流结束的回调
 * @param {function} onError 出错的回调
 */
export const copywritingChatStream = async (sessionId, message, modelId, mode, companyInfo, references, onMessage, onDone, onError) => {
    try {
        const token = getTokenFromStore();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const url = `${process.env.REACT_APP_API_HOST || 'http://localhost:8080'}/v1/copywriting/session/${sessionId}/chat`;

        // 使用 fetch 发起流式请求
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: JSON.stringify({
                message,
                model_id: modelId,
                mode,
                company_info: companyInfo,
                references: references || [],
            }),
        });

        if (!response.ok) {
            // 解析错误信息
            let errorMsg = `Server error: ${response.status}`;
            try {
                const errData = await response.json();
                errorMsg = errData.message || errorMsg;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            // 处理 SSE 格式
            const lines = buffer.split('\n');
            // 最后一行可能不完整，保留在 buffer 中
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '') continue;
                if (!line.startsWith('data: ')) continue;

                const dataStr = line.replace('data: ', '').trim();

                if (dataStr === '[DONE]') {
                    if (onDone) onDone();
                    return;
                }

                try {
                    const data = JSON.parse(dataStr);
                    if (data.type === 'error') {
                        if (onError) onError(new Error(data.content));
                        return;
                    }
                    if (data.type === 'done') {
                        if (onDone) onDone();
                        return;
                    }
                    if (data.type === 'content' || data.type === 'file_created' || data.type === 'file_updated') {
                        if (onMessage) onMessage(data);
                    }
                } catch (e) {
                    console.warn('Failed to parse SSE data:', dataStr, e);
                }
            }
        }

    } catch (error) {
        if (onError) onError(error);
    }
};
