import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    message,
    Space,
    Tag,
    Row,
    Col,
    Select,
    Tooltip,
    Tabs, Avatar
} from 'antd';
import {
    PlusOutlined,
    DeleteOutlined,
    SearchOutlined,
    ReloadOutlined,
    ArrowLeftOutlined, UserOutlined
} from '@ant-design/icons';
import { getAIEOGeneratesWithPage, deleteAIEOGenerate, generateUserQuestions, createAIEOGenerate, cancelAIEOGenerate, startSendAIEOGenerate, getAIEOGenerateByID, updateAIEOGenerateContent } from '../api/aieoGenerate';
import { getWebsideLoginContexts } from '../api/website_login_context';
import { getWebsideInfos } from '../api/website_login_context';
import '../styles/AIEOGenerate.css';
import { getAssetsLibraryList } from '../api/assetsLibrary';
import { getMaterialLibraryList } from '../api/materialLibrary';
import { Spin, Card } from 'antd';

import AIEOTiptapEditor from './AIEOTiptapEditor';

const { Option } = Select;
const { TabPane } = Tabs;

const AIEOGenerate = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    const [websiteInfos, setWebsiteInfos] = useState([]);

    // 模态框相关状态
    const [modalVisible, setModalVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [form] = Form.useForm();
    const [generating, setGenerating] = useState(false);
    const [creating, setCreating] = useState(false);

    // 在组件内部添加資產选择相关的状态
    const [imageOptions, setImageOptions] = useState([]);
    const [imageLoading, setImageLoading] = useState(false);
    const [imagePage, setImagePage] = useState(1);
    const [imageHasMore, setImageHasMore] = useState(true);
    const [selectedImages, setSelectedImages] = useState([]);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [imageValidationError, setImageValidationError] = useState('');

    // 知识库选择相关的状态
    const [knowledgeBaseOptions, setKnowledgeBaseOptions] = useState([]);
    const [knowledgeBaseLoading, setKnowledgeBaseLoading] = useState(false);
    const [knowledgeBasePage, setKnowledgeBasePage] = useState(1);
    const [knowledgeBaseHasMore, setKnowledgeBaseHasMore] = useState(true);
    const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState([]);
    const [knowledgeBaseModalVisible, setKnowledgeBaseModalVisible] = useState(false);

    // 网站登录上下文选择相关的状态
    const [websiteContextModalVisible, setWebsiteContextModalVisible] = useState(false);
    const [websiteContextOptions, setWebsiteContextOptions] = useState([]);
    const [websiteContextLoading, setWebsiteContextLoading] = useState(false);
    const [websiteContextPage, setWebsiteContextPage] = useState(1);
    const [websiteContextHasMore, setWebsiteContextHasMore] = useState(true);
    const [selectedWebsiteContexts, setSelectedWebsiteContexts] = useState([]);
    const [currentTaskId, setCurrentTaskId] = useState(null);
    const [websiteContextFilters, setWebsiteContextFilters] = useState({
        platform: '',
        username: ''
    });
    const [websiteContextForm] = Form.useForm();

    // 详情页相关状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [activeTabKey, setActiveTabKey] = useState('1');

    // 在详情页相关状态后添加
    // 语料管理相关状态
    const [selectedContentIndex, setSelectedContentIndex] = useState(0);
    const [editedContents, setEditedContents] = useState([]);

    useEffect(() => {
        if (currentTask && currentTask.contents) {
            setEditedContents(currentTask.contents);
            setSelectedContentIndex(0);
        }
    }, [currentTask]);

    // 处理内容编辑
    const handleContentChange = (value) => {
        const updatedContents = [...editedContents];
        updatedContents[selectedContentIndex].content = value || '';
        setEditedContents(updatedContents);
    };

    // 处理保存
    const handleSaveContents = async () => {
        if (!currentTask) return;

        // 校验快手或抖音平台任务是否有图片
        const isPlatformWithImage = currentTask.platform && (currentTask.platform.toString().trim().toLowerCase() === 'kuai_shou' || currentTask.platform.toString().trim().toLowerCase() === 'dou_yin');
        if (isPlatformWithImage) {
            const platformName = getPlatformName(currentTask.platform);
            if (!currentTask.image_library_list || currentTask.image_library_list.length === 0) {
                message.error(`${platformName}平台必须包含至少一张参考图片`);
                return;
            }
            // 校验 Markdown 内容中是否有图片 (使用正则增强校验)
            const hasMissingImage = editedContents.some(item => !/!\[.*?\]\(.*?\)/.test(item.content || ''));
            if (hasMissingImage) {
                message.error(`${platformName}平台每条语料内容必须包含至少一张图片`);
                return;
            }
        }

        try {
            const response = await updateAIEOGenerateContent(currentTask.id, editedContents);
            if (response.success) {
                message.success('保存成功');
            } else {
                message.error('保存失败');
            }
        } catch (error) {
            message.error('保存失败');
        }
    };

    // 获取网站信息
    const fetchWebsiteInfos = async () => {
        try {
            const response = await getWebsideInfos();
            if (response.success) {
                setWebsiteInfos(response.data);
            }
        } catch (error) {
            console.error('获取网站信息失败:', error);
            message.error('获取可授权网站信息失败');
        }
    };

    const getPlatformName = (platform) => {
        for (const info of websiteInfos) {
            if (info.platform === platform) {
                return info.platformName
            }
        }
        return platform
    }

    const getPlatformInfo = (platform) => {
        for (const info of websiteInfos) {
            if (info.platform === platform) {
                return info
            }
        }
        return null
    }

    // 获取平台选项
    const getPlatformOptions = () => {
        return websiteInfos.map(info => (
            // 判定 info.Purposes 这个数组中存在 article 字段则是返回禁用状态，否返回正常状态
            <Select.Option key={info.platform} value={info.platform} disabled={!info.purposes.includes('article')}>{info.platformName}</Select.Option>
        ));
    };

    // 处理筛选变化
    const handleWebsiteContextFilterChange = () => {
        const values = websiteContextForm.getFieldsValue();
        const newFilters = { ...websiteContextFilters, ...values };
        setWebsiteContextFilters(newFilters);
        // 重置页码并重新加载数据
        loadWebsiteContexts(1, false, newFilters);
    };


    const handleDeleteTask = async (id) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除此任务吗？此操作不可恢复。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const response = await deleteAIEOGenerate(id);
                    if (response.success) {
                        message.success('任务删除成功');
                        handleRefresh(); // 刷新任务列表
                    } else {
                        message.error('任务删除失败: ' + (response.message || '未知错误'));
                    }
                } catch (error) {
                    console.error('删除任务失败:', error);
                    message.error('删除任务失败，请重试');
                }
            }
        });
    };

    // 加载网站登录上下文列表的函数
    const loadWebsiteContexts = async (pageNum = 1, append = false, filters = websiteContextFilters) => {
        if (websiteContextLoading || (!websiteContextHasMore && pageNum > 1)) return;

        setWebsiteContextLoading(true);

        try {
            const params = {
                page: pageNum,
                pageSize: 12,
                // 添加筛选参数
                purpose: "article",
                platform: filters.platform,
                username: filters.username
            };

            const response = await getWebsideLoginContexts(params);

            if (response.success) {
                var newContexts = response.data.contexts;

                setWebsiteContextOptions(prev => append ? [...prev, ...newContexts] : newContexts);
                setWebsiteContextHasMore(newContexts.length === params.pageSize);
                setWebsiteContextPage(pageNum);
            }
        } catch (error) {
            message.error('加载网站登录上下文失败');
        } finally {
            setWebsiteContextLoading(false);
        }
    };

    // 处理网站登录上下文滚动加载更多
    const handleWebsiteContextScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 100 && websiteContextHasMore && !websiteContextLoading) {
            loadWebsiteContexts(websiteContextPage + 1, true);
        }
    };

    // 表格列配置
    const columns = [
        {
            title: '任务名称',
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
            render: (text) => text || '任务名称',
        },
        {
            title: '目标平台',
            dataIndex: 'platform',
            key: 'platform',
            width: 120,
            render: (platform) => getPlatformName(platform),
        },
        {
            title: '关键词',
            dataIndex: 'keyword',
            key: 'keyword',
            ellipsis: true,
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (status) => {
                const statusMap = {
                    'article': { color: 'blue', text: '文章' },
                };
                const currentStatus = statusMap[status] || { color: 'blue', text: '文章' };
                return <Tag color={currentStatus.color}>{currentStatus.text}</Tag>;
            },
        },
        {
            title: '蒸馏状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status, record) => {
                const statusMap = {
                    'Success': { color: 'green', text: '蒸馏完成' },
                    'Running': { color: 'blue', text: '蒸馏中' },
                    'Cancel': { color: 'red', text: '已取消' },
                    'Failed': { color: 'red', text: '蒸馏失败' },
                };
                const currentStatus = statusMap[status] || { color: 'gray', text: status || '蒸馏中' };
                return <Tag color={currentStatus.color} title={record.error_info || ''}>{currentStatus.text}</Tag>;
            },
        },
        {
            title: '收录状态',
            dataIndex: 'send_status',
            key: 'send_status',
            width: 100,
            render: (status, record) => {  // 添加 record 参数
                const statusMap = {
                    'Success': { color: 'green', text: '已收录' },
                    'Sending': { color: 'yellow', text: '收录中' },
                    'Failed': { color: 'red', text: '收录失败' },
                    'Cancel': { color: 'red', text: '已取消' },
                    'NotSent': { color: 'blue', text: '待收录' },
                };
                const currentStatus = statusMap[status] || { color: 'blue', text: status || '收录中' };

                if (status === 'Failed') {
                    return (
                        <Tag color={currentStatus.color}>
                            {currentStatus.text}
                            <Tooltip title={record.error_info || '未知错误'}>
                                <span style={{ marginLeft: 4, cursor: 'help' }}>!</span>
                            </Tooltip>
                        </Tag>
                    );
                }

                return <Tag color={currentStatus.color}>{currentStatus.text}</Tag>;
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 200,
            render: (timestamp) => {
                if (!timestamp) return '-';
                return new Date(timestamp * 1000).toLocaleString();
            },
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => {
                // 判断是否显示取消按钮
                const showCancelBtn = record.send_status === 'Sending';
                const hideSendBtn = (record.status !== 'Success' || record.send_status === 'Sending' || record.send_status === 'Success');

                // 处理取消任务
                const handleCancelTask = async () => {
                    Modal.confirm({
                        title: '确认取消',
                        content: '确定要取消此任务吗？',
                        okText: '确认',
                        okType: 'danger',
                        cancelText: '取消',
                        onOk: async () => {
                            try {
                                // 根据当前状态设置新状态
                                const response = await cancelAIEOGenerate(record.id);
                                if (response.success) {
                                    message.success('任务取消成功');
                                    handleRefresh(); // 刷新任务列表
                                } else {
                                    message.error('任务取消失败: ' + (response.message || '未知错误'));
                                }
                            } catch (error) {
                                console.error('取消任务失败:', error);
                                message.error('取消任务失败，请重试');
                            }
                        }
                    });
                };

                return (
                    <Space size="middle">
                        <Button
                            type="link"
                            onClick={() => handleViewDetail(record)}
                        >
                            查看详情
                        </Button>
                        {
                            !hideSendBtn &&
                            <Button
                                type="link"
                                onClick={() => handleSubmitRecord(record)}
                            >
                                提交收录
                            </Button>
                        }
                        {showCancelBtn && (
                            <Button
                                type="link"
                                danger
                                onClick={handleCancelTask}
                            >
                                取消
                            </Button>
                        )}
                        <Button
                            type="link"
                            danger
                            onClick={() => handleDeleteTask(record.id)}
                        >
                            删除
                        </Button>
                    </Space>
                );
            },
        },
    ];

    // 加载图片列表的函数
    const loadImages = async (pageNum = 1, append = false) => {
        if (imageLoading || (!imageHasMore && pageNum > 1)) return;

        setImageLoading(true);

        try {
            const params = {
                page: pageNum,
                pageSize: 12,
                type: 'image'
            };

            const response = await getAssetsLibraryList(params);

            if (response.success) {
                const newImages = response.data.assets || [];
                setImageOptions(prev => append ? [...prev, ...newImages] : newImages);
                setImageHasMore(newImages.length === params.pageSize);
                setImagePage(pageNum);
            }
        } catch (error) {
            message.error('加载图片失败');
        } finally {
            setImageLoading(false);
        }
    };

    // 加载任务列表
    const loadTasks = async () => {
        setLoading(true);
        try {
            const response = await getAIEOGeneratesWithPage({
                keyword: searchKeyword,
                page: pagination.current,
                page_size: pagination.pageSize
            });
            if (response.success) {
                setTasks(response.data.aieo_generates || []);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.total || 0
                }));
            } else {
                message.error(response.message || '加载任务列表失败');
            }
        } catch (error) {
            console.error('加载任务列表失败:', error);
            message.error('加载任务列表失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 加载知识库列表的函数
    const loadKnowledgeBases = async (pageNum = 1, append = false) => {
        if (knowledgeBaseLoading || (!knowledgeBaseHasMore && pageNum > 1)) return;

        setKnowledgeBaseLoading(true);

        try {
            const params = {
                page: pageNum,
                pageSize: 12
            };

            const response = await getMaterialLibraryList(params);

            if (response.success) {
                const newKnowledgeBases = response.data.materials || [];
                setKnowledgeBaseOptions(prev => append ? [...prev, ...newKnowledgeBases] : newKnowledgeBases);
                setKnowledgeBaseHasMore(newKnowledgeBases.length === params.pageSize);
                setKnowledgeBasePage(pageNum);
            }
        } catch (error) {
            message.error('加载知识库失败');
        } finally {
            setKnowledgeBaseLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        loadTasks();
    }, [pagination.current, pagination.pageSize, searchKeyword]);

    useEffect(() => {
        loadImages(1);
        loadKnowledgeBases(1);
        fetchWebsiteInfos()
    }, []);

    // 处理滚动加载更多
    const handleDropdownScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 100 && imageHasMore && !imageLoading) {
            loadImages(imagePage + 1, true);
        }
    };

    // 处理知识库滚动加载更多
    const handleKnowledgeBaseScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 100 && knowledgeBaseHasMore && !knowledgeBaseLoading) {
            loadKnowledgeBases(knowledgeBasePage + 1, true);
        }
    };

    // 搜索
    const handleSearch = () => {
        setPagination(prev => ({
            ...prev,
            current: 1
        }));
    };

    // 刷新
    const handleRefresh = () => {
        loadTasks();
    };

    // 新建任务
    const handleNewTask = () => {
        form.resetFields();
        setCurrentStep(1);
        setModalVisible(true);
    };

    // 关闭模态框
    const handleCloseModal = () => {
        setModalVisible(false);
    };

    // 下一步
    const handleNextStep = () => {
        form.validateFields(['taskName', 'keyword', 'targetWord', 'userQuestions', 'articleCount', 'platform']).then(() => {
            setCurrentStep(2);
        }).catch(() => {
            message.error('请填写完整的任务信息');
        });
    };

    // 上一步
    const handlePrevStep = () => {
        setCurrentStep(1);
    };

    // 生成用户问题
    const handleGenerateQuestions = async () => {
        const values = form.getFieldsValue();
        if (!values.keyword || !values.targetWord) {
            message.error('请先填写关键词和目标词');
            return;
        }

        setGenerating(true);
        try {
            const response = await generateUserQuestions({
                keyword: values.keyword,
                target_word: values.targetWord,
                history_questions: values.userQuestions || []
            }
            );
            if (response.success) {
                form.setFieldsValue({
                    userQuestions: [...values.userQuestions || [], ...response.data || []]
                });
            } else {
                message.error('生成问题失败: ' + (response.message || '未知错误'));
            }
        } catch (error) {
            console.error('生成问题失败:', error);
            message.error('生成问题失败: ' + (error.message || '请重试'));
        } finally {
            setGenerating(false);
        }
    };

    // 查看详情
    const handleViewDetail = (task) => {
        // 获取任务详情
        getAIEOGenerateByID(task.id).then((response) => {
            if (response.success) {
                console.log(response)
                setCurrentTask({ ...task, ...response.data });
                setDetailVisible(true);
                setActiveTabKey('1');
            } else {
                message.error('获取任务详情失败: ' + (response.message || '未知错误'));
            }
        }).catch((error) => {
            console.error('获取任务详情失败:', error);
            message.error('获取任务详情失败，请重试');
        });
    };

    // 返回任务列表
    const handleBackToList = () => {
        setDetailVisible(false);
        setCurrentTask(null);
    };

    // 提交收录
    const handleSubmitRecord = (task) => {
        setCurrentTaskId(task.id);
        setSelectedWebsiteContexts([]);
        setWebsiteContextOptions([]);
        setWebsiteContextPage(1);
        setWebsiteContextHasMore(true);
        websiteContextForm.resetFields();
        const filters = { platform: task.platform, username: '' };
        setWebsiteContextFilters(filters);
        loadWebsiteContexts(1, false, filters);
        setWebsiteContextModalVisible(true);
    };

    // 关闭提交收录弹出框
    const handleCloseWebsiteContextModal = () => {
        setWebsiteContextModalVisible(false);
        setCurrentTaskId(null);
    };

    const handleConfirmSubmitRecord = async () => {
        if (selectedWebsiteContexts.length === 0) {
            message.error('请至少选择一个网站登录上下文');
            return;
        }

        try {
            const response = await startSendAIEOGenerate(currentTaskId, selectedWebsiteContexts);
            if (response.success) {
                message.success('提交收录成功');
                handleCloseWebsiteContextModal();
                handleRefresh(); // 刷新任务列表
            } else {
                message.error('提交收录失败: ' + (response.message || '未知错误'));
            }
        } catch (error) {
            console.error('提交收录失败:', error);
            message.error('提交收录失败，请重试');
        }
    };

    // 创建任务
    const handleCreateTask = async () => {
        form.validateFields().then(async (values) => {
            // 打印 values 的内容到控制台
            console.log(values);
            // 验证用户问题
            if (!values.userQuestions || values.userQuestions.length === 0) {
                message.error('请确保所有问题都已填写');
                return;
            }

            // 校验平台是否选择了参考图片
            if ((values.platform === 'kuai_shou' || values.platform === 'dou_yin') && selectedImages.length === 0) {
                message.error(`${getPlatformName(values.platform)}平台必须选择至少一张参考图片`);
                return;
            }

            setCreating(true);
            try {
                const response = await createAIEOGenerate({
                    name: values.taskName,
                    keyword: values.keyword,
                    target_word: values.targetWord,
                    user_questions: values.userQuestions,
                    image_library_id_list: selectedImages.map(k => k.id),
                    material_library_id_list: selectedKnowledgeBases.map(k => k.id),
                    create_num: parseInt(values.articleCount),
                    type: "Article",
                    platform: values.platform
                });

                if (response.success) {
                    message.success('任务创建成功');
                    setModalVisible(false);
                    form.resetFields();
                    setCurrentStep(1);
                    setSelectedImages([]);
                    setSelectedKnowledgeBases([]);
                    loadTasks(); // 重新加载任务列表
                } else {
                    message.error('任务创建失败: ' + (response.message || '未知错误'));
                }
            } catch (error) {
                console.error('任务创建失败:', error);
                message.error('任务创建失败，请重试');
            } finally {
                setCreating(false);
            }
        }).catch(error => {
            message.error('请填写完整的任务信息');
        });
    };

    // custom commands have been removed as we use AIEOTiptapEditor now

    // 渲染详情页面
    const renderDetailPage = () => {
        if (!currentTask) return null;

        return (
            <div className="task-detail">
                <div className="detail-header">
                    <Button
                        type="link"
                        icon={<ArrowLeftOutlined />}
                        onClick={handleBackToList}
                    >
                        返回
                    </Button>
                </div>

                <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} className="detail-tabs">
                    <TabPane tab="基础信息" key="1">
                        <div className="basic-info">
                            <div className="detail-section-card">
                                <h4 className="detail-section-title">总体概述</h4>
                                <Row gutter={[24, 24]}>
                                    <Col span={6}>
                                        <div className="info-item">
                                            <span className="info-label">任务名称：</span>
                                            <span className="info-value">{currentTask.name}</span>
                                        </div>
                                    </Col>
                                    <Col span={6}>
                                        <div className="info-item">
                                            <span className="info-label">关键词：</span>
                                            <span className="info-value">{currentTask.keyword}</span>
                                        </div>
                                    </Col>
                                    <Col span={6}>
                                        <div className="info-item">
                                            <span className="info-label">目标词：</span>
                                            <span className="info-value">{currentTask.target_word}</span>
                                        </div>
                                    </Col>
                                    <Col span={6}>
                                        <div className="info-item">
                                            <span className="info-label">类型：</span>
                                            <span className="info-value">
                                                {currentTask.type === 'image' ? '图文' : '文章'}
                                            </span>
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            <div className="detail-section-card user-questions">
                                <h4 className="detail-section-title">用户问题</h4>
                                <Table
                                    dataSource={currentTask.user_questions?.map((q, index) => ({ id: index + 1, question: q })) || []}
                                    rowKey="id"
                                    columns={[
                                        {
                                            title: '序号',
                                            dataIndex: 'id',
                                            key: 'id',
                                            width: 90
                                        },
                                        {
                                            title: '用户问题',
                                            dataIndex: 'question',
                                            key: 'question'
                                        }
                                    ]}
                                    pagination={false}
                                    bordered
                                />
                            </div>

                            <div className="detail-section-card">
                                <h4 className="detail-section-title">配图</h4>
                                <div className="image-list">
                                    {currentTask.image_library_list?.map((value, index) => (
                                        <div key={index} className="image-item">
                                            <img style={{ width: 150 }} src={value.path} alt={`配图${index + 1}`} className="detail-image" />
                                        </div>
                                    )) || <span>无配图</span>}
                                </div>
                            </div>

                            <div className="detail-section-card">
                                <h4 className="detail-section-title">知识库</h4>
                                <div className="knowledge-list">
                                    {currentTask.material_library_list?.map((value, index) => (
                                        <div key={index} className="knowledge-item">
                                            <span className="knowledge-name">{value.title}</span>
                                        </div>
                                    )) || <span>无知识库</span>}
                                </div>
                            </div>
                        </div>
                    </TabPane>

                    <TabPane tab="语料管理" key="2">
                        <div className="corpus-management">
                            <Row gutter={[16, 16]}>
                                <Col span={6}>
                                    <div className="title-list">
                                        {editedContents.map((item, index) => (
                                            <div
                                                key={index}
                                                className={`title-item ${selectedContentIndex === index ? 'active' : ''}`}
                                                onClick={() => setSelectedContentIndex(index)}
                                            >
                                                {item.title}
                                            </div>
                                        ))}
                                    </div>
                                </Col>
                                <Col span={18}>
                                    <div className="content-editor">
                                        <AIEOTiptapEditor
                                            value={editedContents[selectedContentIndex]?.content || ''}
                                            onChange={handleContentChange}
                                        />
                                    </div>
                                </Col>
                            </Row>
                            <div className="save-button-container">
                                <Button type="primary" onClick={handleSaveContents}>
                                    保存
                                </Button>
                            </div>
                        </div>
                    </TabPane>

                    <TabPane tab="收录状态" key="3">
                        <div className="record-status">
                            <Row gutter={[16, 16]} style={{ width: "100%" }}>
                                {currentTask.send_infos && currentTask.send_infos.length > 0 ? (
                                    currentTask.send_infos.map((item, index) => {
                                        // 状态标签配置
                                        const statusConfig = {
                                            'Waiting': { color: 'blue', text: '等待中' },
                                            'Success': { color: 'green', text: '成功' },
                                            'Failed': { color: 'red', text: '失败' }
                                        };

                                        let tags = []
                                        for (let i = 0; i < item.send_status.length; i++) {
                                            const s = item.send_status[i]
                                            const status = statusConfig[s.status] || { color: 'gray', text: "未知" };
                                            tags.push(
                                                <Tag color={status.color} style={{ marginTop: 8 }}>{status.text}</Tag>
                                            )
                                        }

                                        return (
                                            <Col key={index} xs={24} sm={12} md={8} lg={6}>
                                                <Card
                                                    hoverable
                                                    className="platform-card"
                                                    cover={<img alt={item.username} src={item.avatar} style={{ height: 150, objectFit: 'cover' }} />}
                                                >
                                                    <Card.Meta
                                                        title={getPlatformName(item.platform)}
                                                        description={
                                                            <div>
                                                                <p>账号：{item.username}</p>
                                                                <h3>语料发送状态: </h3>
                                                                {tags}
                                                            </div>
                                                        }
                                                    />
                                                </Card>
                                            </Col>
                                        );
                                    })
                                ) : (
                                    <Col span={24}>
                                        <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
                                            暂无收录信息
                                        </div>
                                    </Col>
                                )}
                            </Row>
                        </div>
                    </TabPane>
                </Tabs>
            </div>
        );
    };

    return (
        <div className="page-container">
            {detailVisible ? (
                renderDetailPage()
            ) : (
                <>
                    <div className="page-content-card">
                        <div className="filter-row">
                            <Form layout="inline" style={{ width: '100%' }}>
                                <Row gutter={24} style={{ width: '100%', alignItems: 'center' }}>
                                    <Col>
                                        <Space size="middle">
                                            <Input
                                                placeholder="请输入关键词"
                                                value={searchKeyword}
                                                onChange={(e) => setSearchKeyword(e.target.value)}
                                                prefix={<SearchOutlined />}
                                                style={{ width: 240 }}
                                                className="custom-input"
                                                onPressEnter={handleSearch}
                                            />
                                            <Button
                                                className="premium-btn premium-btn-outline"
                                                onClick={handleSearch}
                                                icon={<SearchOutlined />}
                                            >
                                                搜索
                                            </Button>
                                            <Button
                                                icon={<ReloadOutlined />}
                                                onClick={handleRefresh}
                                                className="premium-btn premium-btn-outline"
                                            >
                                                刷新
                                            </Button>
                                        </Space>
                                    </Col>
                                    <Col style={{ flex: 1, textAlign: 'right' }}>
                                        <Button
                                            type="primary"
                                            className="premium-btn premium-btn-primary"
                                            onClick={handleNewTask}
                                            icon={<PlusOutlined />}
                                        >
                                            新增任务
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={tasks}
                            rowKey="id"
                            loading={loading}
                            pagination={pagination}
                            onChange={setPagination}
                            bordered
                        />
                    </div>

                    {/* 新增任务模态框 */}
                    <Modal
                        title="新增AIEO任务"
                        visible={modalVisible}
                        onCancel={handleCloseModal}
                        footer={null}
                        width={800}
                        className="premium-modal"
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={{
                                userQuestions: [],
                                articleCount: 1,
                                type: 'article'
                            }}
                        >
                            <div className="step-content" hidden={currentStep !== 1}>
                                <Form.Item
                                    name="taskName"
                                    label="任务名称"
                                    rules={[{ required: true, message: '请输入任务名称' }]}
                                >
                                    <Input placeholder="请输入任务名称" className="custom-input" />
                                </Form.Item>

                                <Form.Item
                                    name="platform"
                                    label="目标平台"
                                    rules={[{ required: true, message: '请选择目标平台' }]}
                                >
                                    <Select placeholder="请选择目标平台" className="custom-select-override">
                                        {getPlatformOptions()}
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    name="keyword"
                                    label="关键词"
                                    rules={[{ required: true, message: '请输入关键词' }]}
                                >
                                    <Input placeholder="请输入关键词" className="custom-input" />
                                </Form.Item>

                                <Form.Item
                                    name="targetWord"
                                    label="目标词"
                                    rules={[{ required: true, message: '请输入目标词' }]}
                                >
                                    <Input placeholder="请输入目标词" className="custom-input" />
                                </Form.Item>

                                <Button
                                    className="premium-btn premium-btn-primary"
                                    onClick={handleGenerateQuestions}
                                    loading={generating}
                                    style={{ marginBottom: 20 }}
                                >
                                    AI一键生成
                                </Button>

                                <div style={{ marginBottom: 16 }}>
                                    <label className="ant-form-item-required">用户问题</label>
                                </div>
                                <div className="questions-container">
                                    <Form.List name="userQuestions">
                                        {(fields, { add, remove }) => (
                                            <>
                                                                {fields.map((field, index) => (
                                                                    <Space key={field.key} style={{ display: 'flex', marginBottom: 12 }} align="center">
                                                                        <span style={{ width: 24, textAlign: 'left', fontWeight: 'bold', color: '#64748b' }}>{index + 1}.</span>
                                                                        <Form.Item
                                                                            {...field}
                                                                            name={[field.name]}
                                                                            noStyle
                                                                        >
                                                                            <Input placeholder={`问题 ${index + 1}`} style={{ width: 500 }} className="custom-input" />
                                                                        </Form.Item>
                                                                        <Button 
                                                                            type="text" 
                                                                            danger 
                                                                            icon={<DeleteOutlined />} 
                                                                            onClick={() => remove(field.name)}
                                                                            className="premium-btn-text-danger"
                                                                        >
                                                                            删除
                                                                        </Button>
                                                                    </Space>
                                                                ))}
                                                                <Form.Item>
                                                                    <Button 
                                                                        type="dashed" 
                                                                        onClick={() => add('')} 
                                                                        block 
                                                                        icon={<PlusOutlined />}
                                                                        className="premium-btn-outline"
                                                                        style={{ height: 44, borderRadius: 12 }}
                                                                    >
                                                                        添加问题
                                                                    </Button>
                                                                </Form.Item>
                                            </>
                                        )}
                                    </Form.List>
                                </div>

                                <div className="modal-footer">
                                    <Space size="middle">
                                        <Button className="premium-btn premium-btn-outline" onClick={handleCloseModal}>取消</Button>
                                        <Button className="premium-btn premium-btn-primary" onClick={handleNextStep}>下一步</Button>
                                    </Space>
                                </div>
                            </div>

                            <div className="step-content" hidden={currentStep !== 2}>
                                <Form.Item
                                    name="articleCount"
                                    label="生成数量"
                                    rules={[{ required: true, message: '请输入生成数量' }]}
                                >
                                    <Input type="number" min={1} max={10} placeholder="请输入生成数量" className="custom-input" />
                                </Form.Item>

                                <Form.Item
                                    label="选择图片"
                                >
                                    <div className="premium-selected-list">
                                        {selectedImages.map((image) => (
                                            <div key={image.id} className="selected-item-card image-item-card" title={image.description}>
                                                <img src={image.path} alt={image.description} />
                                                <div className="remove-overlay" onClick={() => setSelectedImages(selectedImages.filter(img => img.id !== image.id))}>
                                                    <DeleteOutlined />
                                                </div>
                                            </div>
                                        ))}
                                        <div className="add-item-trigger" onClick={() => setImageModalVisible(true)}>
                                            <PlusOutlined style={{ fontSize: 20 }} />
                                            <span style={{ fontSize: 11, marginTop: 4 }}>添加</span>
                                        </div>
                                    </div>
                                </Form.Item>

                                <Form.Item
                                    label="选择知识库"
                                >
                                    <div className="premium-selected-list block-list">
                                        {selectedKnowledgeBases.map((kb) => (
                                            <div key={kb.id} className="selected-item-card kb-item-card">
                                                <span className="kb-icon">📚</span>
                                                <span className="kb-name">{kb.title}</span>
                                                <DeleteOutlined className="remove-icon" onClick={() => setSelectedKnowledgeBases(selectedKnowledgeBases.filter(item => item.id !== kb.id))} />
                                            </div>
                                        ))}
                                        {selectedKnowledgeBases.length < 5 && (
                                            <Button 
                                                type="dashed" 
                                                onClick={() => setKnowledgeBaseModalVisible(true)} 
                                                icon={<PlusOutlined />}
                                                className="premium-btn-outline add-kb-btn"
                                            >
                                                添加知识库
                                            </Button>
                                        )}
                                    </div>
                                </Form.Item>

                                <div className="modal-footer">
                                    <Space size="middle">
                                        <Button className="premium-btn premium-btn-outline" onClick={handlePrevStep}>上一步</Button>
                                        <Button className="premium-btn premium-btn-outline" onClick={handleCloseModal}>取消</Button>
                                        <Button className="premium-btn premium-btn-primary" onClick={handleCreateTask} loading={creating}>
                                            创建任务
                                        </Button>
                                    </Space>
                                </div>
                            </div>
                        </Form>
                    </Modal>

                    {/* 选择图片模态框 */}
                    <Modal
                        title="选择图片"
                        visible={imageModalVisible}
                        onCancel={() => {
                            setImageModalVisible(false);
                            setImageValidationError('');
                        }}
                        footer={[
                            <Button key="cancel" className="premium-btn premium-btn-outline" onClick={() => {
                                setImageModalVisible(false);
                                setImageValidationError('');
                            }}>
                                取消
                            </Button>,
                            <Button key="ok" className="premium-btn premium-btn-primary" onClick={() => {
                                setImageModalVisible(false);
                                setImageValidationError('');
                            }}>
                                确认选择
                            </Button>,
                        ]}
                        width={800}
                        className="premium-modal"
                    >
                        {imageValidationError && (
                            <div style={{ 
                                margin: '0 8px 16px', 
                                padding: '8px 16px', 
                                backgroundColor: '#fff1f0', 
                                border: '1px solid #ffa39e', 
                                borderRadius: '8px',
                                color: '#cf1322',
                                fontSize: '14px'
                            }}>
                                {imageValidationError}
                            </div>
                        )}
                        {form.getFieldValue('platform') === 'dou_yin' && !imageValidationError && (
                            <div style={{ margin: '0 8px 16px', padding: '8px 16px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '8px', color: '#0050b3', fontSize: '14px' }}>
                                抖音平台提示：图片大小建议不超过 2000*2000px
                            </div>
                        )}
                        <div style={{ maxHeight: 500, overflowY: 'auto', padding: 8 }} onScroll={handleDropdownScroll}>
                            <div className="image-list">
                                {imageOptions.map((image) => (
                                    <Card
                                        key={image.id}
                                        hoverable
                                        className="image-card"
                                        style={{ width: 180, margin: 8 }}
                                    >
                                        <div className="image-cover" style={{ cursor: 'pointer', height: 120, overflow: 'hidden' }}>
                                            <img alt={'图片'} src={image.path} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ fontSize: 12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {image.description || '未命名图片'}
                                        </div>
                                        <Button
                                            className={`premium-btn ${selectedImages.some(img => img.id === image.id) ? 'premium-btn-primary' : 'premium-btn-outline'}`}
                                            size="small"
                                            style={{ height: 32, padding: '0 12px' }}
                                            onClick={() => {
                                                if (selectedImages.some(img => img.id === image.id)) {
                                                    setSelectedImages(selectedImages.filter(img => img.id !== image.id));
                                                    setImageValidationError('');
                                                } else {
                                                    const platform = form.getFieldValue('platform');
                                                    if (platform === 'dou_yin') {
                                                        const img = new Image();
                                                        img.src = image.path;
                                                        img.onload = () => {
                                                            const width = img.width;
                                                            const height = img.height;
                                                            
                                                            // 校验图片大小不超过 2000*2000
                                                            const isSizeValid = width <= 2000 && height <= 2000;
                                                            
                                                            if (!isSizeValid) {
                                                                setImageValidationError(`图片不符合抖音要求：大小不超过2000*2000px，当前大小${width}*${height}px`);
                                                                return;
                                                            }
                                                            
                                                            setSelectedImages([...selectedImages, image]);
                                                            setImageValidationError('');
                                                        };
                                                        img.onerror = () => {
                                                            message.error('无法加载图片以进行校验');
                                                        };
                                                    } else {
                                                        setSelectedImages([...selectedImages, image]);
                                                        setImageValidationError('');
                                                    }
                                                }
                                            }}
                                        >
                                            {selectedImages.some(img => img.id === image.id) ? '已选择' : '选择'}
                                        </Button>
                                    </Card>
                                ))}
                            </div>
                            {imageLoading && (
                                <div style={{ textAlign: 'center', padding: 16 }}>
                                    <Spin size="small" tip="加载更多..." />
                                </div>
                            )}
                            {!imageHasMore && imageOptions.length > 0 && (
                                <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 12 }}>
                                    没有更多图片了
                                </div>
                            )}
                        </div>
                    </Modal>

                    <Modal
                        title="选择知识库"
                        visible={knowledgeBaseModalVisible}
                        onCancel={() => setKnowledgeBaseModalVisible(false)}
                        footer={[
                            <Button key="cancel" className="premium-btn premium-btn-outline" onClick={() => setKnowledgeBaseModalVisible(false)}>
                                取消
                            </Button>,
                            <Button key="ok" className="premium-btn premium-btn-primary" onClick={() => setKnowledgeBaseModalVisible(false)}>
                                确认选择
                            </Button>,
                        ]}
                        width={800}
                        className="premium-modal"
                    >
                        <div style={{ maxHeight: 500, overflowY: 'auto', padding: 8 }} onScroll={handleKnowledgeBaseScroll}>
                            <div className="knowledge-base-list">
                                {knowledgeBaseOptions.map((kb) => (
                                    <Card
                                        key={kb.id}
                                        hoverable
                                        className="knowledge-base-card"
                                        style={{ marginBottom: 12 }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{kb.title}</div>
                                                {kb.tags && kb.tags.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {kb.tags.map((tag, index) => (
                                                            <Tag key={index} size="small">{tag}</Tag>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                className={`premium-btn ${selectedKnowledgeBases.some(item => item.id === kb.id) ? 'premium-btn-primary' : 'premium-btn-outline'}`}
                                                size="small"
                                                style={{ height: 32, padding: '0 12px' }}
                                                onClick={() => {
                                                    if (selectedKnowledgeBases.some(item => item.id === kb.id)) {
                                                        setSelectedKnowledgeBases(selectedKnowledgeBases.filter(item => item.id !== kb.id));
                                                    } else {
                                                        setSelectedKnowledgeBases([...selectedKnowledgeBases, kb]);
                                                    }
                                                }}
                                            >
                                                {selectedKnowledgeBases.some(item => item.id === kb.id) ? '已选择' : '选择'}
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            {knowledgeBaseLoading && (
                                <div style={{ textAlign: 'center', padding: 16 }}>
                                    <Spin size="small" tip="加载更多..." />
                                </div>
                            )}
                            {!knowledgeBaseHasMore && knowledgeBaseOptions.length > 0 && (
                                <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 12 }}>
                                    没有更多知识库了
                                </div>
                            )}
                        </div>
                    </Modal>

                    <Modal
                        title="选择要收录的帐号"
                        open={websiteContextModalVisible}
                        onCancel={handleCloseWebsiteContextModal}
                        footer={[
                            <Button key="back" className="premium-btn premium-btn-outline" onClick={handleCloseWebsiteContextModal}>取消</Button>,
                            <Button key="submit" className="premium-btn premium-btn-primary" onClick={handleConfirmSubmitRecord}>
                                确认选择
                            </Button>
                        ]}
                        width={1200}
                        className="premium-modal"
                    >
                        {/* 添加筛选表单 */}
                        <Form
                            form={websiteContextForm}
                            layout="inline"
                            style={{ marginBottom: 16, marginTop: 16 }}
                            onValuesChange={handleWebsiteContextFilterChange}
                        >
                            <Row gutter={24}>
                                <Col span={6} style={{ minWidth: 320 }}>
                                    <Form.Item name="username" label="用户名">
                                        <Input
                                            placeholder="请输入用户名以过滤"
                                            allowClear
                                            style={{ width: '100%' }}
                                        >
                                        </Input>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>

                        {/* 原有的表格内容 */}
                        <div style={{ height: 400, overflowY: 'auto' }} onScroll={handleWebsiteContextScroll}>
                            <Table
                                dataSource={websiteContextOptions}
                                rowKey="id"
                                columns={[
                                    {
                                        title: '用户名',
                                        dataIndex: 'username',
                                        key: 'username',
                                        width: 150,
                                        render: (_, record) => (
                                            <Space align="center">
                                                <Avatar src={record.avatar} icon={<UserOutlined />} size="small" />
                                                <Tag color="blue">{record.username}</Tag>
                                            </Space>
                                        )
                                    },
                                    {
                                        title: '平台',
                                        dataIndex: 'platform',
                                        key: 'platform',
                                        width: 120,
                                        render: (platform) => getPlatformName(platform)
                                    },
                                    {
                                        title: '用途',
                                        dataIndex: 'purpose',
                                        key: 'purpose',
                                        width: 120,
                                        render: (purpose, record) => (
                                            <span>
                                                {getPlatformInfo(record.platform)?.purposeNames?.map((name, index) => (
                                                    <Tag key={index} color="blue">{name}</Tag>
                                                ))}
                                            </span>
                                        )
                                    },
                                    {
                                        title: '标签',
                                        dataIndex: 'tags',
                                        key: 'tags',
                                        width: 100,
                                        render: (tags) => (
                                            <span>
                                                {tags?.map((tag, index) => (
                                                    <Tag key={index} color="orange">{tag}</Tag>
                                                ))}
                                            </span>
                                        )
                                    },
                                    {
                                        title: '状态',
                                        dataIndex: 'status',
                                        key: 'status',
                                        width: 100,
                                        render: (status) => (
                                            <Tag color={status === 1 ? 'success' : 'error'}>
                                                {status === 1 ? '有效' : '失效'}
                                            </Tag>
                                        )
                                    },
                                    {
                                        title: '创建时间',
                                        dataIndex: 'created_at',
                                        key: 'created_at',
                                        width: 180,
                                        render: (timestamp) => {
                                            if (!timestamp) return '-';
                                            return new Date(timestamp * 1000).toLocaleString();
                                        }
                                    }
                                ]}
                                rowSelection={{
                                    type: 'checkbox',
                                    selectedRowKeys: selectedWebsiteContexts,
                                    onChange: (keys) => setSelectedWebsiteContexts(keys)
                                }}
                                loading={websiteContextLoading}
                                pagination={false}
                                locale={{ emptyText: '暂无数据' }}
                            />
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
};

export default AIEOGenerate;
