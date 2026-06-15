import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Button, Modal, Form, Input, Select, Tag, message,
    Row, Col, Card, Typography, Space, Divider, Spin,
    Upload, InputNumber, Empty, Popconfirm, Drawer, Table, Avatar, Tooltip
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined,
    SearchOutlined, FilterOutlined, UploadOutlined, ReloadOutlined,
    FileImageOutlined, VideoCameraOutlined, HistoryOutlined, UserOutlined
} from '@ant-design/icons';
import {
    getAssetsLibraryList,
    updateAssetsLibrary,
    deleteAssetsLibrary,
    uploadAssets
} from '../api/assetsLibrary';
import {
    getVideoJobsWithPage,
    createVideoJob,
    cancelVideoJob
} from '../api/videoJob';
import { getWebsideLoginContexts } from '../api/website_login_context';
import '../styles/AssetsLibrary.css';
import { getWebsideInfos } from "../api";
import { startSendAIEOGenerate } from "../api/aieoGenerate";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AssetsLibrary = () => {
    // 状态管理
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // 筛选和搜索
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedTags, setSelectedTags] = useState([]);
    const [allTags, setAllTags] = useState([]);

    // 模态框和抽屉状态
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isPreviewDrawerVisible, setIsPreviewDrawerVisible] = useState(false);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
    const [currentAsset, setCurrentAsset] = useState(null);

    // 发布历史数据
    const [videoJobs, setVideoJobs] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);

    // 表单实例
    const [uploadForm] = Form.useForm();
    const [editForm] = Form.useForm();

    // 滚动容器引用
    const scrollContainerRef = useRef(null);

    // 文件上传状态
    const [selectedFile, setSelectedFile] = useState(null);

    const [websiteInfos, setWebsiteInfos] = useState([]);

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

    // 提交收录
    const handleSubmitRecord = (taskId) => {
        setCurrentTaskId(taskId);
        setSelectedWebsiteContexts([]);
        setWebsiteContextOptions([]);
        setWebsiteContextPage(1);
        setWebsiteContextHasMore(true);
        loadWebsiteContexts(1);
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
            const response = await createVideoJob({
                "assets_id": currentTaskId,
                "website_login_context_ids": selectedWebsiteContexts
            });
            if (response.success) {
                message.success('提交发布成功');
                handleCloseWebsiteContextModal();
            } else {
                message.error('提交发布失败: ' + (response.message || '未知错误'));
            }
        } catch (error) {
            console.error('提交发布失败:', error);
            message.error('提交发布失败，请重试');
        }
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
                purpose: "video",
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
            console.log(error)
            message.error('加载网站登录上下文失败');
        } finally {
            setWebsiteContextLoading(false);
        }
    };

    // 处理筛选变化
    const handleWebsiteContextFilterChange = () => {
        const values = websiteContextForm.getFieldsValue();
        setWebsiteContextFilters(values);
        // 重置页码并重新加载数据
        loadWebsiteContexts(1, false, values);
    };

    // 处理网站登录上下文滚动加载更多
    const handleWebsiteContextScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 100 && websiteContextHasMore && !websiteContextLoading) {
            loadWebsiteContexts(websiteContextPage + 1, true);
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
            // 判定 info.Purposes 这个数组中存在 video 字段则是返回禁用状态，否返回正常状态
            <Select.Option key={info.platform} value={info.platform} disabled={!info.purposes.includes('video')}>{info.platformName}</Select.Option>
        ));
    };


    // 获取资产列表
    const fetchAssets = async (pageNum = 1, loadMore = false) => {
        if (loadMore && loadingMore) return;
        if (!loadMore) setLoading(true);
        if (loadMore) setLoadingMore(true);

        try {
            const params = {
                page: pageNum,
                page_size: pageSize,
                description: searchKeyword,
                type: selectedType === 'all' ? undefined : selectedType,
                tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined
            };

            const response = await getAssetsLibraryList(params);

            if (response.success) {
                // 确保response.data.assets始终是数组
                const newAssets = Array.isArray(response.data.assets) ? response.data.assets : [];

                if (loadMore) {
                    // 确保prev始终是数组
                    setAssets(prev => [...(Array.isArray(prev) ? prev : []), ...newAssets]);
                } else {
                    setAssets(newAssets);
                }

                if (newAssets.length > 0) {
                    // 更新是否还有更多数据
                    setHasMore(newAssets.length >= pageSize);

                    // 提取所有标签
                    const tagsSet = new Set(allTags);
                    newAssets.forEach(asset => {
                        if (asset && asset.tags && asset.tags.length > 0) {
                            asset.tags.forEach(tag => tagsSet.add(tag));
                        }
                    });
                    setAllTags(Array.from(tagsSet));
                }
            } else {
                message.error('获取资产列表失败');
            }
        } catch (error) {
            console.error('获取资产列表错误:', error);
            message.error('获取资产列表失败，请稍后重试');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // 获取视频发布历史
    const fetchVideoJobs = async (assetId) => {
        setJobsLoading(true);
        try {
            const params = {
                asset_id: assetId,
                page: 1,
                page_size: 100 // 获取所有历史记录
            };

            const response = await getVideoJobsWithPage(params);

            if (response.success) {
                setVideoJobs(response.data.video_jobs || []);
            } else {
                message.error('获取发布历史失败');
            }
        } catch (error) {
            console.error('获取发布历史错误:', error);
            message.error('获取发布历史失败，请稍后重试');
        } finally {
            setJobsLoading(false);
        }
    };

    // 初始加载
    useEffect(() => {
        fetchAssets(1, false);
        fetchWebsiteInfos()
    }, [searchKeyword, selectedType, selectedTags]);

    // 滚动加载更多
    const handleScroll = useCallback(() => {
        if (loadingMore || !hasMore || loading) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;

        // 当滚动到底部200px时加载更多
        if (scrollHeight - scrollTop - clientHeight < 200) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchAssets(nextPage, true);
        }
    }, [loading, loadingMore, hasMore, page]);

    // 添加滚动事件监听
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    // 上传资产
    const handleUpload = async (values) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', values.title || (selectedFile ? selectedFile.name : ''));
            formData.append('description', values.description || '');
            if (values.tags && Array.isArray(values.tags) && values.tags.length > 0) {
                formData.append('tags', JSON.stringify(values.tags));
            }

            // 使用selectedFile状态而不是formValues.file
            if (!selectedFile) {
                message.error('请选择要上传的文件');
                return;
            }
            formData.append('file', selectedFile);

            const response = await uploadAssets(formData);

            if (response.success) {
                message.success('资产上传成功');
                setIsUploadModalVisible(false);
                uploadForm.resetFields();
                setSelectedFile(null); // 重置文件状态
                fetchAssets(1, false); // 重新加载第一页
                setPage(1);
            } else {
                message.error('资产上传失败');
            }
        } catch (error) {
            console.error('上传资产错误:', error);
            message.error('资产上传失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 编辑资产
    const handleEdit = async (values) => {
        setLoading(true);
        try {
            const response = await updateAssetsLibrary(currentAsset.id, {
                title: values.title && values.title !== 'undefined' ? values.title : '',
                description: values.description || '',
                tags: Array.isArray(values.tags) ? values.tags : []
            });

            if (response.success) {
                message.success('资产更新成功');
                setIsEditModalVisible(false);
                editForm.resetFields();
                fetchAssets(1, false); // 重新加载第一页
                setPage(1);
            } else {
                message.error('资产更新失败');
            }
        } catch (error) {
            console.error('更新资产错误:', error);
            message.error('资产更新失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 删除资产
    const handleDelete = async (id) => {
        try {
            const response = await deleteAssetsLibrary(id);

            if (response.success) {
                message.success('资产删除成功');
                fetchAssets(1, false); // 重新加载第一页
                setPage(1);
            } else {
                message.error('资产删除失败');
            }
        } catch (error) {
            console.error('删除资产错误:', error);
            message.error('资产删除失败，请稍后重试');
        }
    };

    // 打开编辑模态框
    const openEditModal = (asset) => {
        setCurrentAsset(asset);
        editForm.setFieldsValue({
            title: asset.title && asset.title !== 'undefined' ? asset.title : '',
            description: asset.description,
            tags: asset.tags
        });
        setIsEditModalVisible(true);
    };

    // 打开预览抽屉
    const openPreviewDrawer = (asset) => {
        setCurrentAsset(asset);
        setIsPreviewDrawerVisible(true);
    };

    // 打开发布历史弹窗
    const openHistoryModal = (asset) => {
        setCurrentAsset(asset);
        fetchVideoJobs(asset.id);
        setIsHistoryModalVisible(true);
    };

    // 格式化文件大小
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 获取资产展示标题
    const getAssetTitle = (title) => {
        return title && title !== 'undefined' ? title : '未命名';
    };

    const handleCancelVideoJob = async (id) => {
        try {
            const response = await cancelVideoJob(id);
            if (response.success) {
                message.success('任务取消成功');
                // 重新获取发布历史
                fetchVideoJobs(currentAsset.id);
            } else {
                message.error('任务取消失败');
            }
        } catch (error) {
            console.error('取消任务错误:', error);
            message.error('任务取消失败，请稍后重试');
        }
    };

    // 渲染资产卡片
    const renderAssetCard = (asset) => {
        const updateTime = asset.createdAt ? new Date(asset.createdAt * 1000).toLocaleDateString() : '未知';

        return (
            <Card
                key={asset.id}
                className="asset-card"
                onClick={() => openPreviewDrawer(asset)}
                cover={
                    <div className="asset-media-container">
                        {asset.type === 'image' ? (
                            <div className="asset-image-wrapper">
                                <img
                                    src={asset.path}
                                    alt={getAssetTitle(asset.title)}
                                    className="asset-image"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                                    }}
                                />
                                <div className="asset-type-badge image-badge">
                                    图片
                                </div>
                            </div>
                        ) : (
                            <div className="asset-video-wrapper">
                                <video
                                    src={asset.path}
                                    className="asset-video"
                                    controls={false}
                                />
                                <div className="asset-type-badge video-badge">
                                    视频
                                </div>
                            </div>
                        )}
                    </div>
                }
            >
                <div style={{ padding: '4px 0' }}>
                    <div className="asset-title" title={getAssetTitle(asset.title)}>
                        {getAssetTitle(asset.title)}
                    </div>
                    <div className="asset-meta">
                        <span className="asset-size">{formatFileSize(asset.size)}</span>
                        <div className="asset-meta-dot" />
                        <span className="asset-updated">更新于 {updateTime}</span>
                    </div>

                    {asset.tags && asset.tags.length > 0 && (
                        <div className="asset-tags">
                            {asset.tags.map(tag => (
                                <Tag key={tag} size="small">{tag}</Tag>
                            ))}
                        </div>
                    )}
                </div>

                <div className="asset-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="asset-action-icons">
                        <EditOutlined onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(asset);
                        }} />

                        {asset.type === 'video' && (
                            <HistoryOutlined onClick={(e) => {
                                e.stopPropagation();
                                openHistoryModal(asset);
                            }} />
                        )}

                        <Popconfirm
                            title="确定要删除这个资产吗？"
                            onConfirm={(e) => {
                                e.stopPropagation();
                                handleDelete(asset.id);
                            }}
                            onCancel={(e) => e.stopPropagation()}
                            okText="确定"
                            cancelText="取消"
                        >
                            <DeleteOutlined className="delete-icon" onClick={(e) => e.stopPropagation()} />
                        </Popconfirm>
                    </div>

                    {asset.type === 'video' && (
                        <Button
                            className="publish-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSubmitRecord(asset.id);
                            }}
                        >
                            发布
                        </Button>
                    )}
                </div>
            </Card>
        );
    };

    // 发布历史表格列配置
    const jobColumns = [
        {
            title: '视频标题',
            dataIndex: 'title',
            key: 'title',
            width: 200,
            render: (title) => <Text>{getAssetTitle(title)}</Text>,
        },
        {
            title: '视频描述',
            dataIndex: 'description',
            key: 'description',
            render: (description) => <Text>{description}</Text>,
        },
        {
            title: '任务状态',
            dataIndex: 'send_status',
            key: 'send_status',
            width: 100,
            render: (status, record) => {
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
            title: '收录用户',
            dataIndex: 'send_infos',
            key: 'send_infos',
            render: (send_infos) => {
                if (!send_infos || send_infos.length === 0) {
                    return <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>暂无收录信息</div>;
                }

                return (
                    <Row gutter={[16, 16]}>
                        {send_infos.map((info, index) => {
                            // 状态标签配置
                            const statusConfig = {
                                'Waiting': { color: 'blue', text: '等待中' },
                                'Cancel': { color: 'red', text: '取消' },
                                'Success': { color: 'green', text: '成功' },
                                'Failed': { color: 'red', text: '失败' }
                            };

                            let status = statusConfig[info.status] || { color: 'gray', text: "未知" };
                            let tag = <Tag color={status.color} style={{ marginTop: 8 }}>{status.text}</Tag>

                            return (
                                <Col key={index} xs={24} sm={12} md={8} lg={8}>
                                    <Card
                                        hoverable
                                        className="platform-card"
                                        cover={<img alt={info.username} src={info.avatar} style={{ height: 100, objectFit: 'cover' }} />}
                                    >
                                        <Card.Meta
                                            title={getPlatformName(info.platform)}
                                            description={
                                                <div>
                                                    <p>账号：{info.username}</p>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        <span style={{ marginRight: 8, marginTop: 6, fontWeight: 'bold' }}>发送状态: </span>
                                                        {tag}
                                                    </div>
                                                </div>
                                            }
                                        />
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                );
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 160,
            render: (time) => <Text>{new Date(time * 1000).toLocaleString()}</Text>,
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_, record) => {
                // 只有 Sending 状态的数据才能取消
                if (record.send_status === 'Sending') {
                    return (
                        <Popconfirm
                            title="确定要取消该任务吗？"
                            onConfirm={() => handleCancelVideoJob(record.id)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Button
                                type="text"
                                danger
                                size="small"
                                className="premium-btn-text-danger"
                            >
                                取消
                            </Button>
                        </Popconfirm>
                    );
                }
                return null;
            },
        }
    ];

    return (
        <div className="page-container" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            {/* 头部已去除 */}

            <div className="page-content-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* 筛选和搜索 */}
                <div className="filter-row">
                    <Form layout="inline" style={{ width: '100%' }}>
                        <Row gutter={[16, 16]} style={{ width: '100%', alignItems: 'center' }}>
                            <Col>
                                <Form.Item label="类型" className="filter-item-type">
                                    <Select
                                        placeholder="资产类型"
                                        value={selectedType}
                                        onChange={setSelectedType}
                                        allowClear
                                        style={{ width: 140, paddingBottom: 8 }}
                                        className="custom-select-override"
                                    >
                                        <Option value="all">全部类型</Option>
                                        <Option value="image">图片</Option>
                                        <Option value="video">视频</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col>
                                <Form.Item label="搜索" className="filter-item">
                                    <Input
                                        placeholder="搜索标题或描述"
                                        value={searchKeyword}
                                        onChange={(e) => setSearchKeyword(e.target.value)}
                                        style={{ width: 220 }}
                                        allowClear
                                        className="custom-input"
                                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col>
                                <Form.Item label="标签" className="filter-item">
                                    <Select
                                        mode="multiple"
                                        placeholder="选择标签"
                                        value={selectedTags}
                                        onChange={setSelectedTags}
                                        allowClear
                                        style={{ width: 240 }}
                                        className="custom-select-override"
                                    >
                                        {(allTags || []).map(tag => (
                                            <Option key={tag} value={tag}>
                                                {tag}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col>
                                <Button
                                    className="premium-btn premium-btn-outline"
                                    icon={<ReloadOutlined />}
                                    onClick={() => {
                                        setSearchKeyword('');
                                        setSelectedType('all');
                                        setSelectedTags([]);
                                    }}
                                >
                                    重置
                                </Button>
                            </Col>
                            <Col style={{ flex: 1, textAlign: 'right' }}>
                                <Button
                                    type="primary"
                                    className="premium-btn premium-btn-primary"
                                    icon={<UploadOutlined />}
                                    onClick={() => setIsUploadModalVisible(true)}
                                >
                                    上传资产
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </div>

                {/* 资产列表 */}
                <div className="assets-container" ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', paddingRight: '12px' }}>
                    <div className="assets-grid">
                        {(assets || []).map(asset => renderAssetCard(asset))}
                    </div>

                    {/* 加载更多 */}
                    {loadingMore && (
                        <div className="loading-more">
                            <Spin tip="加载中..." />
                        </div>
                    )}

                    {/* 没有更多数据 */}
                    {!loading && !loadingMore && (assets || []).length > 0 && !hasMore && (
                        <div className="no-more">
                            <Text type="secondary">没有更多资产了</Text>
                        </div>
                    )}

                    {/* 空状态 */}
                    {!loading && (assets || []).length === 0 && (
                        <div className="empty-state">
                            <Empty
                                description="暂无资产"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        </div>
                    )}
                </div>

                {/* 上传模态框 */}
                <Modal
                    title="上传资产"
                    open={isUploadModalVisible}
                    onCancel={() => {
                        setIsUploadModalVisible(false);
                        uploadForm.resetFields();
                        setSelectedFile(null); // 重置文件状态
                    }}
                    footer={null}
                    width={600}
                    className="premium-modal"
                >
                    <Form
                        form={uploadForm}
                        layout="vertical"
                        onFinish={handleUpload}
                    >
                        <Form.Item
                            name="file"
                            label="选择文件"
                            rules={[{ required: true, message: '请选择要上传的文件' }]}
                            valuePropName="fileList"
                            getValueFromEvent={(e) => {
                                // 确保只上传单个文件
                                if (Array.isArray(e)) {
                                    return e.slice(-1);
                                }
                                if (e.file.status === 'removed') {
                                    setSelectedFile(null);
                                    return [];
                                }
                                // 直接使用file.originFileObj或file（取决于Ant Design版本）
                                setSelectedFile(e.file.originFileObj || e.file);
                                return [e.file];
                            }}
                        >
                            <Upload.Dragger
                                name="file"
                                multiple={false}
                                accept="image/*,video/*"
                                beforeUpload={(file) => {
                                    // 限制文件大小为2000MB
                                    const isLt2000M = file.size / 1024 / 1024 < 2000;
                                    if (!isLt2000M) {
                                        message.error('文件大小不能超过2000MB');
                                    }
                                    return false; // 手动上传
                                }}
                            >
                                <p className="ant-upload-drag-icon">
                                    <UploadOutlined />
                                </p>
                                <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
                                <p className="ant-upload-hint">
                                    支持上传图片和视频文件，大小不超过100MB
                                </p>
                            </Upload.Dragger>
                        </Form.Item>

                        <Form.Item
                            name="title"
                            label="标题"
                        >
                            <Input placeholder="请输入资产标题" className="custom-input" />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="描述"
                            rules={[{ required: true, message: '请输入资产描述' }]}
                        >
                            <TextArea placeholder="请输入资产描述" rows={3} className="custom-textarea" />
                        </Form.Item>

                        <Form.Item
                            name="tags"
                            label="标签"
                        >
                            <Select
                                mode="tags"
                                placeholder="请输入标签，按回车确认"
                                style={{ width: '100%' }}
                                className="custom-select-override"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginBottom: 0, textAlign: 'right' }}>
                            <Space size="middle">
                                <Button className="premium-btn premium-btn-outline" onClick={() => setIsUploadModalVisible(false)}>
                                    取消
                                </Button>
                                <Button type="primary" htmlType="submit" className="premium-btn premium-btn-primary" loading={loading}>
                                    上传资产
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* 编辑模态框 */}
                <Modal
                    title="编辑资产"
                    open={isEditModalVisible}
                    onCancel={() => setIsEditModalVisible(false)}
                    footer={null}
                    width={600}
                    className="premium-modal"
                >
                    <Form
                        form={editForm}
                        layout="vertical"
                        onFinish={handleEdit}
                    >
                        <Form.Item
                            name="title"
                            label="标题"
                        >
                            <Input placeholder="请输入资产标题" className="custom-input" />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="描述"
                            rules={[{ required: true, message: '请输入资产描述' }]}
                        >
                            <TextArea placeholder="请输入资产描述" rows={3} className="custom-textarea" />
                        </Form.Item>

                        <Form.Item
                            name="tags"
                            label="标签"
                        >
                            <Select
                                mode="tags"
                                placeholder="请输入标签，按回车确认"
                                style={{ width: '100%' }}
                                className="custom-select-override"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginBottom: 0, textAlign: 'right' }}>
                            <Space size="middle">
                                <Button className="premium-btn premium-btn-outline" onClick={() => setIsEditModalVisible(false)}>
                                    取消
                                </Button>
                                <Button type="primary" htmlType="submit" className="premium-btn premium-btn-primary" loading={loading}>
                                    保存修改
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* 发布历史模态框 */}
                <Modal
                    title={`${getAssetTitle(currentAsset?.title)} - 发布历史`}
                    open={isHistoryModalVisible}
                    onCancel={() => setIsHistoryModalVisible(false)}
                    footer={[
                        <Button
                            key="close"
                            className="premium-btn premium-btn-outline"
                            onClick={() => setIsHistoryModalVisible(false)}
                        >
                            关闭
                        </Button>
                    ]}
                    width={1200}
                    className="premium-modal"
                >
                    <Spin spinning={jobsLoading}>
                        <Table
                            columns={jobColumns}
                            dataSource={videoJobs}
                            rowKey="id"
                            pagination={false}
                            bordered
                        />
                        {!jobsLoading && videoJobs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <Empty description="暂无发布历史" />
                            </div>
                        )}
                    </Spin>
                </Modal>

                <Modal
                    title="选择要收录的平台"
                    open={websiteContextModalVisible}
                    onCancel={handleCloseWebsiteContextModal}
                    footer={[
                        <Button
                            key="back"
                            className="premium-btn premium-btn-outline"
                            onClick={handleCloseWebsiteContextModal}
                        >
                            取消
                        </Button>,
                        <Button
                            key="submit"
                            type="primary"
                            className="premium-btn premium-btn-primary"
                            onClick={handleConfirmSubmitRecord}
                        >
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
                        style={{ marginBottom: 16 }}
                        onValuesChange={handleWebsiteContextFilterChange}
                    >
                        <Row gutter={24}>
                            <Col span={6} style={{ minWidth: 250 }}>
                                <Form.Item name="platform" label="平台" className="filter-item">
                                    <Select
                                        placeholder="请选择平台"
                                        allowClear
                                        style={{ width: '100%' }}
                                        className="custom-select-override"
                                    >
                                        {getPlatformOptions()}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={6} style={{ minWidth: 320 }}>
                                <Form.Item name="username" label="用户名" className="filter-item">
                                    <Input
                                        placeholder="用户名"
                                        allowClear
                                        style={{ width: '100%' }}
                                        className="custom-input"
                                    />
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
                                    title: '今日发送',
                                    key: 'daily_send',
                                    width: 120,
                                    render: (_, record) => {
                                        const remaining = record.daily_limit - record.today_count;
                                        const color = remaining <= 0 ? 'error' : (remaining < 3 ? 'warning' : 'success');
                                        return (
                                            <Tooltip title={`今日已发送 ${record.today_count} 次，上限 ${record.daily_limit} 次`}>
                                                <Tag color={color}>
                                                    {record.today_count} / {record.daily_limit}
                                                </Tag>
                                            </Tooltip>
                                        );
                                    }
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

                {/* 预览抽屉 */}
                <Drawer
                    title={getAssetTitle(currentAsset?.title)}
                    placement="right"
                    onClose={() => setIsPreviewDrawerVisible(false)}
                    open={isPreviewDrawerVisible}
                    width={800}
                >
                    {currentAsset && (
                        <div className="preview-content">
                            <div className="preview-media">
                                {currentAsset.type === 'image' ? (
                                    <img
                                        src={currentAsset.path}
                                        alt={getAssetTitle(currentAsset.title)}
                                        className="preview-image"
                                    />
                                ) : (
                                    <video
                                        src={currentAsset.path}
                                        className="preview-video"
                                        controls
                                    />
                                )}
                            </div>

                            <Divider />

                            <div className="preview-info">
                                <Title level={4}>资产信息</Title>
                                <div className="preview-meta">
                                    <p><strong>标题：</strong>{getAssetTitle(currentAsset.title)}</p>
                                    <p><strong>描述：</strong>{currentAsset.description}</p>
                                    <p><strong>类型：</strong>{currentAsset.type === 'image' ? '图片' : '视频'}</p>
                                    <p><strong>大小：</strong>{formatFileSize(currentAsset.size)}</p>
                                    <p><strong>创建时间：</strong>{new Date(currentAsset.createdAt * 1000).toLocaleString()}</p>
                                    {currentAsset.tags && currentAsset.tags.length > 0 && (
                                        <p>
                                            <strong>标签：</strong>
                                            {currentAsset.tags.map(tag => (
                                                <Tag key={tag}>{tag}</Tag>
                                            ))}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Drawer>
            </div>
        </div>
    );
};

export default AssetsLibrary;