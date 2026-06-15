import React, { useState, useEffect } from 'react';
import { Table, Form, Input, Button, Modal, message, Pagination, Row, Col } from 'antd';
import { getUsersByCompany, updateUser, createUser, deleteUser } from '../api';
import '../styles/User.css';
import useUserStore from "../stores/useUserStore";

const User = () => {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
    const [searchForm] = Form.useForm();

    const userStore = useUserStore(state => state.user);

    // 获取用户列表
    const fetchUsers = async (searchParams = {}) => {
        setLoading(true);
        try {
            // 构建查询参数
            const params = {
                page,
                page_size: pageSize,
                ...searchParams
            };

            const response = await getUsersByCompany(params);
            if (response.success) {
                setUsers(response.data.users || []);
                setTotal(response.data.total || 0);
            } else {
                message.error(response.message || '获取用户列表失败');
            }
        } catch (error) {
            message.error('获取用户列表失败');
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    // 组件挂载时获取用户列表
    useEffect(() => {
        fetchUsers();
    }, [page, pageSize]);

    // 处理查询
    const handleSearch = async (values) => {
        setPage(1); // 重置到第一页
        fetchUsers(values);
    };

    // 处理重置
    const handleReset = () => {
        searchForm.resetFields();
        setPage(1); // 重置到第一页
        fetchUsers();
    };

    // 显示模态框（用于编辑或创建）
    const showModal = (user = null) => {
        setEditingUser(user);
        if (user) {
            form.setFieldsValue({
                nickname: user.nickname,
                avatar: user.avatar,
                phone: user.phone,
                username: user.username, // 编辑时也需要显示用户名
            });
        } else {
            form.resetFields(); // 创建时清空表单
        }
        setIsModalVisible(true);
    };

    // 隐藏模态框
    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingUser(null);
        form.resetFields();
    };

    // 保存用户信息（创建或更新）
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            let response;

            if (editingUser) {
                // 更新用户
                const updateData = {
                    nickname: values.nickname,
                    avatar: values.avatar,
                    phone: values.phone,
                };

                // 如果填写了密码，则添加到更新数据中
                if (values.password) {
                    updateData.passwd = values.password;
                }

                response = await updateUser(editingUser.id, updateData);
            } else {
                // 创建用户
                const createData = {
                    username: values.username,
                    passwd: values.password,
                    nickname: values.nickname,
                    phone: values.phone,
                    avatar: values.avatar,
                };

                response = await createUser(createData);
            }

            if (response.success) {
                message.success(editingUser ? '用户信息更新成功' : '用户创建成功');
                setIsModalVisible(false);
                setEditingUser(null);
                fetchUsers(searchForm.getFieldsValue()); // 重新获取用户列表，保持查询条件
            } else {
                message.error(response.message || (editingUser ? '更新用户信息失败' : '创建用户失败'));
            }
        } catch (error) {
            message.error(editingUser ? '更新用户信息失败： '+error.message : '创建用户失败：'+error.message);
            console.error('Error saving user:', error);
        }
    };

    // 删除用户
    const handleDelete = (id) => {
        Modal.confirm({
            title: '确认删除',
            content: '您确定要删除这个用户吗？',
            onOk: async () => {
                try {
                    const response = await deleteUser(id);
                    if (response.success) {
                        message.success('用户删除成功');
                        fetchUsers(searchForm.getFieldsValue()); // 重新获取用户列表，保持查询条件
                    } else {
                        message.error(response.message || '删除用户失败');
                    }
                } catch (error) {
                    message.error('删除用户失败');
                    console.error('Error deleting user:', error);
                }
            },
        });
    };

    // 表格列配置
    const columns = [
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: '昵称',
            dataIndex: 'nickname',
            key: 'nickname',
        },
        {
            title: '电话',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: '头像',
            dataIndex: 'avatar',
            key: 'avatar',
            render: (avatar) => (
                <img
                    src={avatar}
                    alt="头像"
                    style={{ width: 40, height: 40, borderRadius: '50%' }}
                />
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (timestamp) => new Date(timestamp * 1000).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <>
                    <Button
                        type="primary"
                        onClick={() => showModal(record)}
                        style={{ marginRight: 8 }}
                    >
                        编辑
                    </Button>
                    {/* 只有管理员可以删除用户 */}
                    {userStore.id !== record.id && (
                        <Button danger onClick={() => handleDelete(record.id)}>
                            删除
                        </Button>
                    )}
                </>
            ),
        },
    ];

    return (
        <div className="user-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2>用户管理</h2>
                <Button type="primary" onClick={() => showModal()}>
                    创建用户
                </Button>
            </div>

            {/* 查询表单 */}
            <Form
                form={searchForm}
                layout="inline"
                onFinish={handleSearch}
                style={{ marginBottom: 16 }}
            >
                <Row gutter={16} style={{ width: '100%' }}>
                    <Col>
                        <Form.Item name="name" label="名称">
                            <Input placeholder="名称" />
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item name="phone" label="电话">
                            <Input placeholder="输入电话" />
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
                                查询
                            </Button>
                            <Button onClick={handleReset}>
                                重置
                            </Button>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>

            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                pagination={false}
            />
            <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(newPage, newPageSize) => {
                    setPage(newPage);
                    setPageSize(newPageSize);
                }}
                style={{ marginTop: 16, textAlign: 'right' }}
            />

            {/* 用户模态框（创建和编辑共用） */}
            <Modal
                title={editingUser ? "编辑用户" : "创建用户"}
                visible={isModalVisible}
                onOk={handleSave}
                onCancel={handleCancel}
            >
                <Form form={form} layout="vertical">
                    {/* 创建用户时需要用户名，编辑时不需要 */}
                    {!editingUser && (
                        <Form.Item
                            name="username"
                            label="用户名"
                            rules={[{ required: true, message: '请输入用户名' }]}
                        >
                            <Input placeholder="输入用户名" />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="nickname"
                        label="昵称"
                        rules={[{ required: true, message: '请输入昵称' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="avatar"
                        label="头像URL"
                    >
                        <Input placeholder="输入头像URL" />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label="电话"
                        rules={[{ required: true, message: '请输入电话' }]}
                    >
                        <Input placeholder="输入电话号码" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={editingUser ? "密码（可选）" : "密码"}
                        rules={[
                            {
                                required: !editingUser,
                                message: '请输入密码',
                            },
                            {
                                pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/,
                                message: '密码至少包含字母和数字，长度不少于6位',
                                validateTrigger: 'onBlur',
                            },
                        ]}
                    >
                        <Input.Password placeholder={editingUser ? "输入新密码（可选）" : "输入密码"} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default User;