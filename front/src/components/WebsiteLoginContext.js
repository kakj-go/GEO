import React, { useState, useEffect, useRef } from 'react';
import {
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Select,
    Tag,
    message,
    Popconfirm,
    Card,
    Row,
    Col,
    Divider,
    Tooltip,
    Switch,
    Avatar,
    InputNumber
} from 'antd';
import { getWebsideInfos, getWebsideLoginContexts, updateWebsideLoginContexts, createWebsideLoginContexts, deleteWebsideLoginContexts } from "../api";
import useUserStore from "../stores/useUserStore";
import { PlusOutlined, PlayCircleOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import '../styles/WebsiteLoginContext.css';

const { Option } = Select;

const WebsiteLoginContext = () => {
    const user = useUserStore(state => state.user);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [filters, setFilters] = useState({
        platform: '',
        tag: ''
    });
    const [websiteInfos, setWebsiteInfos] = useState([]);


    const [browserStatus, setBrowserStatus] = useState({
        isRunning: false,
        isMonitoring: false,
    });

    const isProcessingRef = useRef(false);

    useEffect(() => {
        const handleLoginSuccess = async (event, data) => {
            // 使用 ref 来防止重复处理
            if (isProcessingRef.current) return;

            isProcessingRef.current = true;
            console.log("login data: " + JSON.stringify(data, null, 2));

            try {
                if (data.launchType === "login") {
                    message.success('授权成功');
                    form.setFieldValue("browser_context", data.storageStateJson);
                    form.setFieldValue("username", data.username);
                    form.setFieldValue("avatar", data.avatarUrl);
                } else if (data.launchType === "reauthorize") {
                    let sendData = {
                        browser_context: data.storageStateJson,
                        tags: data.record.tags,
                        username: data.username,
                        avatar: data.avatarUrl,
                        fingerprint: data.record.fingerprint,
                    }
                    if (data.record.proxy) {
                        sendData.proxy = {
                            host: data.record.proxy?.host,
                            port: data.record.proxy?.port,
                            username: data.record.proxy?.username,
                            password: data.record.proxy?.password,
                            protocol: data.record.proxy?.protocol
                        }
                    }
                    await updateWebsideLoginContexts(data.record.id, sendData);
                    message.success('重新授权成功');
                } else if (data.launchType === "authTest") {
                    let sendData = {
                        tags: data.record.tags,
                        username: data.record.username,
                        avatar: data.record.avatar,
                        fingerprint: data.record.fingerprint,
                        status: data.record.status,
                    }
                    if (data.record.proxy) {
                        sendData.proxy = {
                            host: data.record.proxy?.host,
                            port: data.record.proxy?.port,
                            username: data.record.proxy?.username,
                            password: data.record.proxy?.password,
                            protocol: data.record.proxy?.protocol
                        }
                    }
                    await updateWebsideLoginContexts(data.record.id, sendData);
                    message.success('登陆测试成功');
                }
                await fetchData();
            } catch (error) {
                console.error('处理登录成功事件失败:', error);
                message.error('操作失败');
            } finally {
                isProcessingRef.current = false;
            }
        };

        const handleBrowserClose = (event, data) => {
            setBrowserStatus(prev => ({
                isRunning: false,
                isMonitoring: false
            }));
        };

        if (!window || !window.require) return () => {
        };

        const { ipcRenderer } = window.require('electron');

        ipcRenderer.on('event-browser-login-success', handleLoginSuccess);
        ipcRenderer.on('event-browser-close', handleBrowserClose);

        return () => {
            ipcRenderer.removeAllListeners('event-browser-login-success');
            ipcRenderer.removeAllListeners('event-browser-close');
        };
    }, []);

    // 获取网站信息
    const fetchWebsiteInfos = async () => {
        try {
            const response = await getWebsideInfos();
            if (response.success) {
                setWebsiteInfos(response.data || []);
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

    // 获取平台选项（去重）
    const getPlatformOptions = () => {
        return websiteInfos.map(info => (
            <Select.Option key={info.platform} value={info.platform}>{info.platformName}</Select.Option>
        ));
    };

    const getPlatformInfo = (platform) => {
        for (const info of websiteInfos) {
            if (info.platform === platform) {
                return info
            }
        }
        return null
    }

    const handleButtonClick = async () => {
        const { ipcRenderer } = window.require('electron');

        const platform = form.getFieldValue("platform")
        if (!platform) {
            message.error("请选择授权平台")
            return
        }

        let websiteInfo = null
        for (const info of websiteInfos) {
            if (info.platform === platform) {
                websiteInfo = info
                break
            }
        }
        if (websiteInfo == null) {
            message.error("未找到该平台的授权网页")
            return
        }

        // 获取指纹和代理配置
        const fingerprint = form.getFieldValue("fingerprint") || false;
        const useProxy = form.getFieldValue("useProxy") || false;
        const proxyConfig = useProxy ? {
            host: form.getFieldValue("proxyHost"),
            port: form.getFieldValue("proxyPort") || 0,
            username: form.getFieldValue("proxyUsername"),
            password: form.getFieldValue("proxyPassword"),
            protocol: form.getFieldValue("proxyProtocol") || "http"
        } : null;

        let browserLaunch = {
            launchType: "login",
            userId: "" + user.id,
            websiteInfo: websiteInfo,
            fingerprint: fingerprint,
            platform: platform,
            proxy: proxyConfig
        }
        const result = await ipcRenderer.invoke('launch-chrome', browserLaunch);
        if (result.success) {
            await updateBrowserStatus();
        } else {
            message.error(`浏览器启动失败: ${result.message}`);
        }
    };

    const updateBrowserStatus = async () => {
        const { ipcRenderer } = window.require('electron');

        try {
            const status = await ipcRenderer.invoke('get-browser-status');
            setBrowserStatus(status);
        } catch (error) {
            message.error('获取浏览器状态失败:', error);
        }
    };

    // 获取数据列表
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current,
                page_size: pagination.pageSize,
                ...filters
            };
            const response = await getWebsideLoginContexts(params)
            if (response.success) {
                setData(response.data.contexts || []);
                setPagination({
                    ...pagination,
                    total: response.data.total || 0
                });
            } else {
                message.error(response.message || '获取数据失败');
            }
        } catch (error) {
            console.error('获取数据失败:', error);
            message.error('获取数据失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWebsiteInfos();
    }, []);

    useEffect(() => {
        fetchData();
    }, [pagination.current, pagination.pageSize, filters]);

    // 处理表格变化
    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    // 处理筛选
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        setPagination(prev => ({
            ...prev,
            current: 1
        }));
    };

    // 重置筛选
    const handleResetFilters = () => {
        setFilters({
            platform: '',
            tag: ''
        });
        setPagination(prev => ({
            ...prev,
            current: 1
        }));
    };

    // 打开新增模态框
    const handleAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleAuthTest = async (record) => {
        const { ipcRenderer } = window.require('electron');

        let websiteInfo = null
        for (const info of websiteInfos) {
            if (info.platform === record.platform) {
                websiteInfo = info
                break
            }
        }
        if (websiteInfo == null) {
            message.error("未找到该平台的授权网页")
            return
        }

        let browserLaunch = {
            launchType: "authTest",
            userId: "" + user.id,
            websiteInfo: websiteInfo,
            browserContext: record.browser_context,
            record: record,

            fingerprint: record.fingerprint,
            proxy: record.proxy
        }
        const result = await ipcRenderer.invoke('launch-chrome', browserLaunch);
        if (result.success) {
            await updateBrowserStatus();
        } else {
            message.error(`浏览器启动失败: ${result.message}`);
        }
    }

    const handleReauthorize = async (record) => {
        const { ipcRenderer } = window.require('electron');

        let websiteInfo = null
        for (const info of websiteInfos) {
            if (info.platform === record.platform) {
                websiteInfo = info
                break
            }
        }
        if (websiteInfo == null) {
            message.error("未找到该平台的授权网页")
            return
        }

        let browserLaunch = {
            launchType: "reauthorize",
            userId: "" + user.id,
            websiteInfo: websiteInfo,
            platform: record.platform,
            record: record,

            fingerprint: record.fingerprint,
            proxy: record.proxy
        }

        const result = await ipcRenderer.invoke('launch-chrome', browserLaunch);
        if (result.success) {
            await updateBrowserStatus();
        } else {
            message.error(`浏览器启动失败: ${result.message}`);
        }
    };

    // 打开编辑模态框
    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue({
            platform: record.platform,
            browser_context: record.browser_context,
            tags: record.tags,
            username: record.username,
            avatar: record.avatar,
            fingerprint: record.fingerprint,
            useProxy: !!record.proxy,
            proxyHost: record.proxy?.host,
            proxyPort: record.proxy?.port,
            proxyUsername: record.proxy?.username,
            proxyPassword: record.proxy?.password,
            proxyProtocol: record.proxy?.protocol || "http"
        });
        setModalVisible(true);
    };

    // 提交表单
    const handleSubmit = async (values) => {
        try {
            // 构建指纹和代理数据
            const fingerprint = values.fingerprint || false;
            const proxy = values.useProxy ? {
                host: values.proxyHost || "",
                port: parseInt(values.proxyPort) || 0,
                username: values.proxyUsername || "",
                password: values.proxyPassword || "",
                protocol: values.proxyProtocol || "http"
            } : null;

            const submitData = {
                platform: values.platform,
                browser_context: values.browser_context,
                tags: values.tags,
                username: values.username,
                avatar: values.avatar || "",
                status: 1,
                fingerprint: fingerprint,
                proxy: proxy
            };

            if (editingRecord) {
                // 更新
                await updateWebsideLoginContexts(editingRecord.id, submitData)
                message.success('更新成功');
            } else {
                // 新增
                await createWebsideLoginContexts(submitData)
                message.success('创建成功');
            }

            setModalVisible(false);
            fetchData();
        } catch (error) {
            console.error('提交失败:', error);
            message.error(error.response?.data?.message || '操作失败');
        }
    };

    // 删除记录
    const handleDelete = async (id) => {
        try {
            await deleteWebsideLoginContexts(id)
            message.success('删除成功');
            fetchData();
        } catch (error) {
            console.error('删除失败:', error);
            message.error('删除失败');
        }
    };

    // 表格列定义
    const columns = [
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
            width: 150, // 增加宽度以容纳头像
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
            render: (platform) => (
                <Tag color="blue">{getPlatformName(platform)}</Tag>
            )
        },
        {
            title: '用途',
            dataIndex: 'purpose',
            key: 'purpose',
            width: 300,
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
            width: 80,
            render: (status) => (
                <Tag color={status === 1 ? 'success' : 'error'}>
                    {status === 1 ? '有效' : '失效'}
                </Tag>
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
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (time) => time ? new Date(time * 1000).toLocaleString() : '-'
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="登陆测试">
                        <Button
                            type="text"
                            icon={<PlayCircleOutlined />}
                            onClick={() => handleAuthTest(record)}
                        />
                    </Tooltip>

                    <Tooltip title="重新授权">
                        <Button
                            type="text"
                            icon={<ReloadOutlined />}
                            onClick={() => handleReauthorize(record)}
                        />
                    </Tooltip>

                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>

                    <Popconfirm
                        title="确定删除这条记录吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Tooltip title="删除">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="page-container">
            <div className="page-content-card">
                {/* 筛选区域 */}
                <div className="filter-row">
                    <Form layout="inline" style={{ width: '100%' }}>
                        <Row gutter={[16, 16]} style={{ width: '100%', alignItems: 'center' }}>
                            <Col>
                                <Form.Item label="平台">
                                    <Select
                                        value={filters.platform}
                                        onChange={(value) => handleFilterChange('platform', value)}
                                        style={{ width: 140 }}
                                        allowClear
                                        placeholder="选择平台"
                                        className="custom-select-override"
                                    >
                                        {getPlatformOptions()}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col>
                                <Form.Item label="标签">
                                    <Input
                                        value={filters.tag}
                                        onChange={(e) => handleFilterChange('tag', e.target.value)}
                                        style={{ width: 150 }}
                                        placeholder="输入标签"
                                        className="custom-input"
                                    />
                                </Form.Item>
                            </Col>
                            <Col>
                                <Form.Item label="用户名">
                                    <Input
                                        value={filters.username}
                                        onChange={(e) => handleFilterChange('username', e.target.value)}
                                        style={{ width: 150 }}
                                        placeholder="输入用户名"
                                        className="custom-input"
                                    />
                                </Form.Item>
                            </Col>
                            <Col>
                                <Button
                                    className="premium-btn premium-btn-outline"
                                    icon={<ReloadOutlined />}
                                    onClick={handleResetFilters}
                                >
                                    重置
                                </Button>
                            </Col>
                            <Col style={{ flex: 1, textAlign: 'right' }}>
                                <Button
                                    type="primary"
                                    className="premium-btn premium-btn-primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAdd}
                                >
                                    新增授权
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </div>

                {/* 数据表格 */}
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                        pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    onChange={handleTableChange}
                />
            </div>

            {/* 新增/编辑模态框 */}
            <Modal
                title={editingRecord ? '编辑授权' : '新增授权'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={600}
                destroyOnClose
                className="premium-modal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="平台"
                                name="platform"
                                rules={[{ required: true, message: '请选择平台' }]}
                            >
                                <Select
                                    placeholder="选择平台"
                                    className="custom-select-override"
                                >
                                    {getPlatformOptions()}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="开启指纹"
                                name="fingerprint"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="开启代理"
                                name="useProxy"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.useProxy !== currentValues.useProxy}>
                        {({ getFieldValue }) => getFieldValue('useProxy') && (
                            <div>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label="代理主机"
                                            name="proxyHost"
                                            rules={[{ required: true, message: '请输入代理主机' }]}
                                        >
                                            <Input placeholder="请输入代理主机" className="custom-input" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label="代理端口"
                                            name="proxyPort"
                                            rules={[{ required: true, message: '请输入代理端口' }]}
                                            getValueFromEvent={(e) => parseInt(e.target.value, 10)}
                                        >
                                            <Input type="number" placeholder="请输入代理端口" className="custom-input" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label="用户名"
                                            name="proxyUsername"
                                        >
                                            <Input placeholder="请输入用户名" className="custom-input" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label="密码"
                                            name="proxyPassword"
                                        >
                                            <Input.Password placeholder="请输入密码" className="custom-input" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item
                                    label="协议"
                                    name="proxyProtocol"
                                >
                                    <Select defaultValue="https" placeholder="选择协议" className="custom-select-override">
                                        <Option value="http">HTTP</Option>
                                        <Option value="https">HTTPS</Option>
                                    </Select>
                                </Form.Item>
                            </div>
                        )}
                    </Form.Item>

                    <Form.Item
                        label="授权"
                        name="browser_context"
                        rules={[{ required: true, message: '授权' }]}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Button
                                type="primary"
                                onClick={handleButtonClick}
                                className="premium-btn premium-btn-primary"
                            >
                                浏览器授权
                            </Button>
                            <Form.Item noStyle shouldUpdate>
                                {({ getFieldValue }) => {
                                    const contextValue = getFieldValue('browser_context');
                                    const hasValue = contextValue && contextValue.trim() !== '';

                                    return (
                                        <span
                                            style={{
                                                color: hasValue ? '#52c41a' : '#ff4d4f',
                                                fontWeight: 'normal',
                                                fontSize: '14px'
                                            }}
                                        >
                                            {hasValue ? '已授权' : '暂未授权'}
                                        </span>
                                    );
                                }}
                            </Form.Item>
                        </div>
                    </Form.Item>

                    <Form.Item
                        hidden={true}
                        label="用户名"
                        name="username"
                        tooltip="username"
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        hidden={true}
                        label="头像"
                        name="avatar"
                        tooltip="avatar"
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="标签"
                        name="tags"
                        className={"label-btn"}
                        tooltip="输入文字后按回车添加标签，多个标签用逗号分隔"
                    >
                        <Select
                            mode="tags"
                            placeholder="例如：测试,生产,重要"
                            style={{ width: '100%' }}
                            // 标签字段不禁用，可以修改
                            className="custom-select-override"
                        />
                    </Form.Item>

                    {/* 移除每日发送次数限制表单项 */}
                    <Form.Item style={{ marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginBottom: 0, textAlign: 'right' }}>
                        <Space size="middle">
                            <Button className="premium-btn premium-btn-outline" onClick={() => setModalVisible(false)}>
                                取消
                            </Button>
                            <Button type="primary" htmlType="submit" className="premium-btn premium-btn-primary">
                                {editingRecord ? '更新' : '创建'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default WebsiteLoginContext;