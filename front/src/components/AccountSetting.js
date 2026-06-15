import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Upload, message, Divider, Modal, Row, Col } from 'antd';
import { LoadingOutlined, PlusOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import useUserStore from '../stores/useUserStore';
import { updateUser } from '../api/user';
import '../styles/AccountSetting.css';

const AccountSetting = () => {
    const user = useUserStore(state => state.user);
    const updateProfile = useUserStore(state => state.updateProfile);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                username: user.username,
                nickname: user.nickname,
                phone: user.phone,
                avatar: user.avatar,
                id: user.id,
            });
        }
    }, [user, form]);

    const getBase64 = (img, callback) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    };

    const beforeUpload = (file) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('只能上传 JPG/PNG 格式的图片!');
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('图片大小必须小于 2MB!');
        }
        return isJpgOrPng && isLt2M;
    };

    const handleAvatarChange = (info) => {
        if (info.file.status === 'uploading') {
            setUploadLoading(true);
            return;
        }
        if (info.file.status === 'done' || info.file.status === 'error') {
            getBase64(info.file.originFileObj, async (url) => {
                try {
                    // 后端 updateUser 校验 nickname 和 phone 不能为空
                    const res = await updateUser(user.id, { 
                        avatar: url,
                        nickname: user.nickname,
                        phone: user.phone
                    });
                    if (res.success) {
                        updateProfile({ avatar: url });
                        message.success('头像更新成功');
                    }
                } catch (e) {
                    message.error('头像更新失败');
                } finally {
                    setUploadLoading(false);
                }
            });
        }
    };

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const res = await updateUser(user.id, {
                nickname: values.nickname,
                phone: values.phone,
                // avatar is handled separately or can be included
            });
            if (res.success) {
                updateProfile({ nickname: values.nickname, phone: values.phone });
                message.success('账户信息保存成功');
            } else {
                message.error(res.message || '保存失败');
            }
        } catch (error) {
            message.error('保存失败，请检查网络');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (values) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error('两次输入的密码不一致');
            return;
        }
        setPwdLoading(true);
        try {
            const res = await updateUser(user.id, { passwd: values.newPassword });
            if (res.success) {
                message.success('密码修改成功');
                setIsPasswordModalVisible(false);
                passwordForm.resetFields();
            } else {
                message.error(res.message || '修改失败');
            }
        } catch (e) {
            message.error('修改失败，请重试');
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <div className="account-setting-container">
            <div className="account-setting-avatar-card">
                <div className="avatar-section">
                    <div className="avatar-wrapper">
                        <Upload
                            name="avatar"
                            showUploadList={false}
                            action="https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188"
                            beforeUpload={beforeUpload}
                            onChange={handleAvatarChange}
                        >
                            <div className="avatar-image-container">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="avatar" className="avatar-image-preview" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {uploadLoading ? <LoadingOutlined /> : '无'}
                                    </div>
                                )}
                                <div className="avatar-edit-badge">
                                    <EditOutlined />
                                </div>
                            </div>
                        </Upload>
                    </div>
                    <div className="avatar-info">
                        <h3>头像 (Avatar)</h3>
                        <p>点击按钮更换头像。建议图片尺寸为 300x300。</p>
                        <Upload
                            name="avatar"
                            showUploadList={false}
                            action="https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188"
                            beforeUpload={beforeUpload}
                            onChange={handleAvatarChange}
                        >
                            <Button className="edit-image-btn">编辑图片</Button>
                        </Upload>
                    </div>
                </div>
            </div>

            <div className="account-setting-info-card">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    className="account-setting-form"
                >
                    <Row gutter={32}>
                        <Col span={12}>
                            <Form.Item label="ID" name="id">
                                <Input readOnly className="custom-input readonly-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="用户名" name="username">
                                <Input readOnly className="custom-input readonly-input" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={32}>
                        <Col span={12}>
                            <Form.Item
                                label="昵称"
                                name="nickname"
                                rules={[{ required: true, message: '请输入昵称' }]}
                            >
                                <Input suffix={<EditOutlined style={{ color: '#bfbfbf' }} />} className="custom-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="电话"
                                name="phone"
                                rules={[
                                    { required: true, message: '请输入电话' },
                                    { pattern: /^1\d{10}$/, message: '请输入有效的手机号码' }
                                ]}
                            >
                                <Input suffix={<EditOutlined style={{ color: '#bfbfbf' }} />} className="custom-input" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={32}>
                        <Col span={24}>
                            <Form.Item label="密码">
                                <div className="password-input-mock">
                                    <span className="password-dots">●●●●●●</span>
                                    <a className="change-password-link" onClick={() => setIsPasswordModalVisible(true)}>
                                        修改密码 (Change Password)
                                    </a>
                                </div>
                            </Form.Item>
                        </Col>
                    </Row>

                    <div className="form-footer">
                        <Button type="primary" htmlType="submit" loading={loading} className="save-changes-btn">
                            保存修改 (Save Changes)
                        </Button>
                    </div>
                </Form>
            </div>

            <Modal
                title="修改密码"
                open={isPasswordModalVisible}
                onCancel={() => setIsPasswordModalVisible(false)}
                footer={null}
                destroyOnClose
                className="custom-password-modal"
                centered
            >
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handlePasswordChange}
                    className="password-change-form"
                >
                    <Form.Item
                        name="newPassword"
                        label="新密码"
                        rules={[
                            { required: true, message: '请输入新密码' },
                            { pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, message: '密码至少包含字母和数字，长度不少于6位' }
                        ]}
                    >
                        <Input.Password placeholder="请输入新密码" className="custom-input" />
                    </Form.Item>
                    <Form.Item
                        name="confirmPassword"
                        label="确认新密码"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: '请确认新密码' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('两次输入的密码不一致'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password placeholder="请再次输入新密码" className="custom-input" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
                        <Button type="primary" htmlType="submit" loading={pwdLoading} block className="modal-submit-btn">
                            确认修改
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AccountSetting;
