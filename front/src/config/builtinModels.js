// 内置模型列表配置
// 所有模型数据来源于 APImart API 文档 https://docs.apimart.ai/cn/api-reference

// ============ 文生图模型（Image Generation） ============
export const IMAGE_MODELS = [
    {
        id: 'gemini-3.1-flash-image-preview',
        displayName: 'NanoBanana2',
        modelId: 'gemini-3.1-flash-image-preview',
        type: 'image_generation',
        description: '支持文生图、图生图，最高 4K 分辨率',
    },
    {
        id: 'gemini-3-pro-image-preview',
        displayName: 'NanoBanana Pro',
        modelId: 'gemini-3-pro-image-preview',
        type: 'image_generation',
        description: '高质量图像生成，专业级',
    },
    {
        id: 'doubao-seedream-5-0-lite',
        displayName: 'Seedream 5.0 Lite',
        modelId: 'doubao-seedream-5-0-lite',
        type: 'image_generation',
        description: '支持文生图、图生图、组图，最高 3K 分辨率',
    },
    {
        id: 'flux-2-flex',
        displayName: 'Flux 2.0 Flex',
        modelId: 'flux-2-flex',
        type: 'image_generation',
        description: 'Flux 灵活版图像生成',
    },
    {
        id: 'flux-2-pro',
        displayName: 'Flux 2.0 Pro',
        modelId: 'flux-2-pro',
        type: 'image_generation',
        description: 'Flux 专业版图像生成',
    },
    {
        id: 'gpt-4o-image',
        displayName: 'GPT-4o Image',
        modelId: 'gpt-4o-image',
        type: 'image_generation',
        description: 'OpenAI 图像生成模型',
    },
    {
        id: 'gemini-2.5-flash-image-preview',
        displayName: 'Nano Banana',
        modelId: 'gemini-2.5-flash-image-preview',
        type: 'image_generation',
        description: '快速图像生成（Nano Banana）',
    },
    {
        id: 'doubao-seedance-4-0',
        displayName: 'Seedream 4.0',
        modelId: 'doubao-seedance-4-0',
        type: 'image_generation',
        description: 'Seedream 4.0 经典版',
    },
    {
        id: 'doubao-seedance-4-5',
        displayName: 'Seedream 4.5',
        modelId: 'doubao-seedance-4-5',
        type: 'image_generation',
        description: 'Seedream 4.5 升级版',
    },
    {
        id: 'flux-kontext-pro',
        displayName: 'Flux Kontext Pro',
        modelId: 'flux-kontext-pro',
        type: 'image_generation',
        description: 'Flux 上下文理解专业版',
    },
    {
        id: 'flux-kontext-max',
        displayName: 'Flux Kontext Max',
        modelId: 'flux-kontext-max',
        type: 'image_generation',
        description: 'Flux 上下文理解极致版',
    },
];

// ============ 文生视频模型（Video Generation） ============
export const VIDEO_MODELS = [
    {
        id: 'sora-2',
        displayName: 'Sora2',
        modelId: 'sora-2',
        type: 'video_generation',
        description: 'Sora-2 标准版',
    },
    {
        id: 'sora-2-vip',
        displayName: 'Sora2 VIP',
        modelId: 'sora-2-vip',
        type: 'video_generation',
        description: 'Sora-2 升级版',
    },
    {
        id: 'sora-2-pro',
        displayName: 'Sora2 Pro',
        modelId: 'sora-2-pro',
        type: 'video_generation',
        description: 'Sora-2 专业版，支持更长时长',
    },
    {
        id: 'veo3.1-fast',
        displayName: 'VEO 3.1 Fast',
        modelId: 'veo3.1-fast',
        type: 'video_generation',
        description: 'VEO3 快速生成，适合快速预览',
    },
    {
        id: 'veo3.1-quality',
        displayName: 'VEO 3.1 Quality',
        modelId: 'veo3.1-quality',
        type: 'video_generation',
        description: 'VEO3 高质量生成，支持4K',
    },
    {
        id: 'kling-2.6',
        displayName: 'Kling 2.6',
        modelId: 'kling-2.6',
        type: 'video_generation',
        description: '可灵 2.6 视频生成',
    },
    {
        id: 'doubao-seedance-1-5-pro',
        displayName: 'Seedance 1.5 Pro',
        modelId: 'doubao-seedance-1-5-pro',
        type: 'video_generation',
        description: 'Seedance 1.5 Pro，支持音频和首尾帧',
    },
    {
        id: 'MiniMax-Hailuo-02',
        displayName: 'MiniMax-Hailuo-02',
        modelId: 'MiniMax-Hailuo-02',
        type: 'video_generation',
        description: 'MiniMax 海螺视频生成',
    },
    {
        id: 'MiniMax-Hailuo-2.3',
        displayName: 'MiniMax-Hailuo-2.3',
        modelId: 'MiniMax-Hailuo-2.3',
        type: 'video_generation',
        description: '海螺视频 2.3 升级版',
    },
    {
        id: 'sora-2-preview',
        displayName: 'Sora 2 Preview',
        modelId: 'sora-2-preview',
        type: 'video_generation',
        description: 'Sora 2 预览版',
    },
    {
        id: 'sora-2-pro-preview',
        displayName: 'Sora 2 Pro Preview',
        modelId: 'sora-2-pro-preview',
        type: 'video_generation',
        description: 'Sora 2 专业预览版',
    },
    {
        id: 'viduq3-pro',
        displayName: 'Vidu Q3 Pro',
        modelId: 'viduq3-pro',
        type: 'video_generation',
        description: 'Vidu Q3 专业版',
    },
    {
        id: 'wan2.6',
        displayName: 'Wan 2.6',
        modelId: 'wan2.6',
        type: 'video_generation',
        description: '阿里云万相 2.6',
    },
    {
        id: 'doubao-seedance-1-0-pro-fast',
        displayName: 'Seedance 1.0 Pro Fast',
        modelId: 'doubao-seedance-1-0-pro-fast',
        type: 'video_generation',
        description: 'Seedance 1.0 Pro 快速版',
    },
    {
        id: 'doubao-seedance-1-0-pro-quality',
        displayName: 'Seedance 1.0 Pro Quality',
        modelId: 'doubao-seedance-1-0-pro-quality',
        type: 'video_generation',
        description: 'Seedance 1.0 Pro 高质量版',
    },
];

// ============ 多模态/通用对话模型（LLM - Chat Completions） ============
export const LLM_MODELS = [
    // Google 系列
    {
        id: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        modelId: 'gemini-2.5-pro',
        type: 'llm',
        series: 'Google',
        description: 'Gemini 2.5 专业版',
    },
    {
        id: 'gemini-2.5-pro-thinking',
        displayName: 'Gemini 2.5 Pro Thinking',
        modelId: 'gemini-2.5-pro-thinking',
        type: 'llm',
        series: 'Google',
        description: 'Gemini 2.5 Pro 深度思考版',
    },
    {
        id: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        modelId: 'gemini-2.5-flash',
        type: 'llm',
        series: 'Google',
        description: 'Gemini 2.5 快速版',
    },
    {
        id: 'gemini-2.5-flash-lite',
        displayName: 'Gemini 2.5 Flash Lite',
        modelId: 'gemini-2.5-flash-lite',
        type: 'llm',
        series: 'Google',
        description: 'Gemini 2.5 超轻量版',
    },
    // OpenAI 系列
    {
        id: 'gpt-5',
        displayName: 'GPT-5',
        modelId: 'gpt-5',
        type: 'llm',
        series: 'OpenAI',
        description: 'GPT-5 基础模型',
    },
    {
        id: 'gpt-5-mini',
        displayName: 'GPT-5 Mini',
        modelId: 'gpt-5-mini',
        type: 'llm',
        series: 'OpenAI',
        description: 'GPT-5 轻量级版本',
    },
    {
        id: 'gpt-5-nano',
        displayName: 'GPT-5 Nano',
        modelId: 'gpt-5-nano',
        type: 'llm',
        series: 'OpenAI',
        description: 'GPT-5 极致轻量版',
    },
    {
        id: 'gpt-5-pro',
        displayName: 'GPT-5 Pro',
        modelId: 'gpt-5-pro',
        type: 'llm',
        series: 'OpenAI',
        description: 'GPT-5 专业增强版',
    },
    {
        id: 'gpt-5-chat-latest',
        displayName: 'GPT-5 Chat Latest',
        modelId: 'gpt-5-chat-latest',
        type: 'llm',
        series: 'OpenAI',
        description: 'GPT-5 最新对话版',
    },
    // Anthropic 系列
    {
        id: 'claude-haiku-4-5-20251001',
        displayName: 'Claude Haiku 4.5',
        modelId: 'claude-haiku-4-5-20251001',
        type: 'llm',
        series: 'Anthropic',
        description: 'Claude 4.5 快速响应版',
    },
    {
        id: 'claude-sonnet-4-5-20250929',
        displayName: 'Claude Sonnet 4.5',
        modelId: 'claude-sonnet-4-5-20250929',
        type: 'llm',
        series: 'Anthropic',
        description: 'Claude 4.5 平衡版',
    },
    {
        id: 'claude-sonnet-4-5-20250929-thinking',
        displayName: 'Claude Sonnet 4.5 Thinking',
        modelId: 'claude-sonnet-4-5-20250929-thinking',
        type: 'llm',
        series: 'Anthropic',
        description: 'Claude 4.5 Sonnet 深度思考版',
    },
    {
        id: 'claude-opus-4-1-20250805',
        displayName: 'Claude Opus 4.1',
        modelId: 'claude-opus-4-1-20250805',
        type: 'llm',
        series: 'Anthropic',
        description: '最强大的 Claude 4.1 旗舰模型',
    },
    // DeepSeek 系列
    {
        id: 'deepseek-v3-0324',
        displayName: 'DeepSeek V3 0324',
        modelId: 'deepseek-v3-0324',
        type: 'llm',
        series: 'DeepSeek',
        description: 'DeepSeek V3 定制版',
    },
    {
        id: 'deepseek-v3.1-250821',
        displayName: 'DeepSeek V3.1',
        modelId: 'deepseek-v3.1-250821',
        type: 'llm',
        series: 'DeepSeek',
        description: 'DeepSeek V3.1 基础版',
    },
];

// 所有模型合并
export const ALL_BUILTIN_MODELS = [...IMAGE_MODELS, ...VIDEO_MODELS, ...LLM_MODELS];

// 模型类型配置
export const MODEL_TYPE_CONFIG = {
    image_generation: { label: '文生图', color: '#52c41a', tagColor: 'green' },
    video_generation: { label: '文生视频', color: '#fa8c16', tagColor: 'orange' },
    llm: { label: '多模态', color: '#1890ff', tagColor: 'blue' },
};

// 获取模型类型标签
export const getModelTypeLabel = (type) => {
    return MODEL_TYPE_CONFIG[type]?.label || type;
};

// 获取模型类型颜色
export const getModelTypeColor = (type) => {
    return MODEL_TYPE_CONFIG[type]?.tagColor || 'default';
};
