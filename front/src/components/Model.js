import React, { useState, useEffect } from 'react';
import { Tag, message, Typography, Button, Space, Divider, Input } from 'antd';
import { 
    CheckCircleFilled, 
    StarFilled, 
    StarOutlined, 
    PictureOutlined, 
    VideoCameraOutlined, 
    MessageOutlined,
    RightOutlined,
    DownOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import { ALL_BUILTIN_MODELS, IMAGE_MODELS, VIDEO_MODELS, LLM_MODELS, MODEL_TYPE_CONFIG } from '../config/builtinModels';
import * as modelApi from '../api/model';
import '../styles/Model.css';

const { Title } = Typography;

const Model = () => {
    const [defaults, setDefaults] = useState({
        image_generation: '',
        video_generation: '',
        llm: '',
    });
    const [loading, setLoading] = useState(false);
    const [settingId, setSettingId] = useState(null);
    const [expandedSection, setExpandedSection] = useState(null); 
    const [pricing, setPricing] = useState({});
    const [llmModels, setLlmModels] = useState(LLM_MODELS);
    const [apimartKey, setApimartKey] = useState('');
    const [savingKey, setSavingKey] = useState(false);

    const CATEGORY_INFO = {
        image_generation: {
            en: 'IMAGE GENERATION',
            zh: '文生图',
            desc: '通过文字描述快速生成高质量图像。',
            icon: <PictureOutlined />,
            color: '#22c55e',
            bg: '#ecfdf5',
            models: IMAGE_MODELS
        },
        video_generation: {
            en: 'VIDEO GENERATION',
            zh: '文生视频',
            desc: '将创意文字转化为动态精彩视频。',
            icon: <VideoCameraOutlined />,
            color: '#f59e0b',
            bg: '#fff7ed',
            models: VIDEO_MODELS
        },
        llm: {
            en: 'CONVERSATIONAL AI',
            zh: '通用对话',
            desc: '智能交互，为您提供专业的问答与创意支持。',
            icon: <MessageOutlined />,
            color: '#2563eb',
            bg: '#eff6ff',
            models: llmModels
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [defaultsRes, pricingRes, apimartKeyRes] = await Promise.all([
                modelApi.getAllBuiltinDefaults(),
                modelApi.getModelPricing(),
                modelApi.getApimartKey().catch(() => null)
            ]);

            if (defaultsRes.data) {
                setDefaults(defaultsRes.data);
            }

            if (apimartKeyRes && apimartKeyRes.data) {
                setApimartKey(apimartKeyRes.data.api_key || '');
            }
            
            if (pricingRes.success && pricingRes.data) {
                const pricingData = pricingRes.data;
                setPricing(pricingData);
                
                // 根据计价信息动态过滤和丰富模型列表
                const enrichedModels = LLM_MODELS.filter(m => pricingData[m.modelId] || pricingData[m.id])
                    .map(m => {
                        const modelPrice = pricingData[m.modelId] || pricingData[m.id];
                        return {
                            ...m,
                            inputPrice: modelPrice.input_price,
                            outputPrice: modelPrice.output_price
                        };
                    });
                setLlmModels(enrichedModels);
            }
        } catch (error) {
            console.log('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveApimartKey = async () => {
        setSavingKey(true);
        try {
            await modelApi.setApimartKey(apimartKey.trim());
            message.success('APIMart API Key 已保存');
        } catch (error) {
            message.error('保存 APIMart API Key 失败');
            console.error('保存 APIMart API Key 失败:', error);
        } finally {
            setSavingKey(false);
        }
    };

    const handleSetDefault = async (model) => {
        setSettingId(model.id);
        try {
            await modelApi.setBuiltinDefaultModel(model.type, model.modelId);
            setDefaults(prev => ({
                ...prev,
                [model.type]: model.modelId,
            }));
            message.success(`已将 ${model.displayName} 设为默认${MODEL_TYPE_CONFIG[model.type]?.label || ''}模型`);
        } catch (error) {
            message.error('设置默认模型失败');
            console.error('设置默认模型失败:', error);
        } finally {
            setSettingId(null);
        }
    };

    const renderModelCard = (model) => {
        const typeConfig = MODEL_TYPE_CONFIG[model.type] || {};
        const isDefault = defaults[model.type] === model.modelId;
        const isSetting = settingId === model.id;

        return (
            <div
                key={model.id}
                className={`builtin-model-item ${isDefault ? 'is-default' : ''}`}
            >
                <div className="builtin-model-left">
                    <div className="builtin-model-avatar" style={{ background: typeConfig.color || '#1890ff' }}>
                        {model.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="builtin-model-info">
                        <span className="builtin-model-name">{model.displayName}</span>
                        <Tag
                            className={`builtin-model-type-tag type-${model.type}`}
                        >
                            {typeConfig.label || model.type}
                        </Tag>
                    </div>
                </div>
                <div className="builtin-model-right">
                    {isDefault ? (
                        <div className="builtin-model-badge-default">
                            <CheckCircleFilled className="status-icon" />
                            <span>默认</span>
                        </div>
                    ) : (
                        <div
                            className={`builtin-model-action-link ${isSetting ? 'loading' : ''}`}
                            onClick={() => !isSetting && handleSetDefault(model)}
                        >
                            <StarOutlined className="status-icon" />
                            <span>设为默认</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const toggleSection = (key) => {
        setExpandedSection(expandedSection === key ? null : key);
    };

    const renderModelItem = (model) => {
        const isDefault = defaults[model.type] === model.modelId;
        const isSetting = settingId === model.id;

        return (
            <div key={model.id} className={`model-list-item ${isDefault ? 'active' : ''}`}>
                <div className="item-left">
                    <div className="item-avatar" style={{ background: CATEGORY_INFO[model.type]?.color }}>
                        {model.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="item-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="item-name">{model.displayName}</span>
                            <Tag className={`item-tag tag-${model.type}`}>{CATEGORY_INFO[model.type]?.zh}</Tag>
                        </div>
                        {(model.inputPrice || model.outputPrice) && (
                            <div className="item-price-info">
                                {model.inputPrice && (
                                    <span className="price-item">
                                        <span className="price-label">输入:</span>
                                        <span className="price-value">{model.inputPrice} 积分 / 1 百万Token</span>
                                    </span>
                                )}
                                {model.inputPrice && model.outputPrice && <Divider type="vertical" style={{ margin: '0 8px', borderColor: '#e2e8f0' }} />}
                                {model.outputPrice && (
                                    <span className="price-item">
                                        <span className="price-label">输出:</span>
                                        <span className="price-value">{model.outputPrice} 积分 / 1 百万Token</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="item-right">
                    {isDefault ? (
                        <div className="default-badge">
                            <CheckCircleFilled className="icon" />
                            <span>默认</span>
                        </div>
                    ) : (
                        <div 
                            className={`set-default-action ${isSetting ? 'loading' : ''}`}
                            onClick={() => !isSetting && handleSetDefault(model)}
                        >
                            <StarOutlined className="icon" />
                            <span>设为默认</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="models-management-wrapper">
            <div className="page-header">
                <h2 className="page-title">模型管理器</h2>
                <p className="page-desc">浏览并选择适合您创作需求的 AI 模型类别</p>
            </div>

            <div className="apimart-key-section" style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px 24px',
                marginBottom: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>APIMart API Key</span>
                </div>
                <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '13px' }}>
                    内置模型统一通过 APIMart 调用。填写并保存 API Key 后即可直接使用，无需配置任何环境变量。
                    还没有 Key？前往 <a href="https://apimart.ai/" target="_blank" rel="noopener noreferrer">https://apimart.ai/</a> 获取。
                </p>
                <Space.Compact style={{ width: '100%', maxWidth: '560px' }}>
                    <Input.Password
                        value={apimartKey}
                        onChange={(e) => setApimartKey(e.target.value)}
                        placeholder="请输入 APIMart API Key"
                        autoComplete="off"
                    />
                    <Button type="primary" loading={savingKey} onClick={handleSaveApimartKey}>
                        保存
                    </Button>
                </Space.Compact>
            </div>

            <div className="category-cards-container">
                {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                    const defaultModelId = defaults[key];
                    const defaultModel = info.models.find(m => m.modelId === defaultModelId);
                    const isExpanded = expandedSection === key;

                    return (
                        <div key={key} className={`category-card-item ${isExpanded ? 'expanded' : ''}`}>
                            <div className="card-main-content">
                                <div className="card-visual-box" style={{ background: info.bg }}>
                                    <div className="category-icon" style={{ color: info.color }}>
                                        {info.icon}
                                    </div>
                                </div>
                                <div className="card-text-content">
                                    <div className="category-label-en" style={{ color: info.color }}>
                                        <span className="dot" style={{ background: info.color }} />
                                        {info.en}
                                    </div>
                                    <h3 className="category-title-zh">{info.zh}</h3>
                                    <p className="category-description">{info.desc}</p>
                                    <span className="models-count">{info.models.length} 个模型</span>
                                </div>
                            </div>

                            <div className="card-footer-bar">
                                <div className="footer-left-action" onClick={() => toggleSection(key)}>
                                    <span className="action-text">显示模型</span>
                                    {isExpanded ? <DownOutlined className="arrow-icon" /> : <RightOutlined className="arrow-icon" />}
                                </div>
                                {key === 'llm' && (
                                    <div className="billing-rule-tip">
                                        <InfoCircleOutlined style={{ marginRight: '4px', color: '#1890ff' }} />
                                        <span>合计不足1积分按1积分计费</span>
                                    </div>
                                )}
                                {defaultModel && (
                                    <div className="footer-right-badge">
                                        <StarFilled className="star-icon" />
                                        <span className="label">默认:</span>
                                        <span className="name">{defaultModel.displayName}</span>
                                    </div>
                                )}
                            </div>

                            {isExpanded && (
                                <div className="expanded-model-list-wrapper">
                                    <Divider className="list-divider" />
                                    <div className="model-items-list">
                                        {info.models.map(renderModelItem)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Model;