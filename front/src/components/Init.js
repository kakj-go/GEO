import React from 'react';
import { message, Form, Input, Button } from 'antd';
import { HomeOutlined, UserOutlined, LockOutlined, RocketOutlined } from '@ant-design/icons';
import useUserStore from '../stores/useUserStore';
import useAppStore from '../stores/useAppStore';
import useCompanyStore from '../stores/useCompanyStore';
import '../styles/Init.css';

const Init = () => {
    const [form] = Form.useForm();
    const systemInit = useUserStore(state => state.systemInit);
    const companyStore = useCompanyStore();
    const setLoading = useAppStore(state => state.setLoading);
    const loading = useAppStore(state => state.loading);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const result = await systemInit({
                company_name: values.companyName,
                username: values.username,
                password: values.password
            }, companyStore);

            if (result.success) {
                message.success('系统初始化成功！');
            } else {
                message.error(`初始化失败: ${result.message}`);
            }
        } catch (error) {
            message.error(`初始化出错: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="init-wrapper">
            <div className="init-card">
                <div className="init-header">
                    <div className="init-icon-box">
                        <RocketOutlined className="rocket-icon" />
                    </div>
                    <h2 className="init-title">系统初始化</h2>
                    <p className="init-subtitle">管理员账户与公司信息设置</p>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                    className="init-form-body"
                >
                    <Form.Item
                        label="公司名称"
                        name="companyName"
                        rules={[{ required: true, message: '请输入公司名称' }]}
                    >
                        <Input 
                            prefix={<HomeOutlined className="input-prefix-icon" />} 
                            placeholder="输入公司或组织名称" 
                            size="large" 
                            className="custom-init-input"
                        />
                    </Form.Item>

                    <Form.Item
                        label="管理员账号"
                        name="username"
                        rules={[
                            { required: true, message: '请输入管理员账号' },
                            { min: 6, message: '账号至少需6位' }
                        ]}
                    >
                        <Input 
                            prefix={<UserOutlined className="input-prefix-icon" />} 
                            placeholder="设置主管理员账号" 
                            size="large" 
                            className="custom-init-input"
                        />
                    </Form.Item>

                    <Form.Item
                        label="管理员密码"
                        name="password"
                        rules={[
                            { required: true, message: '请输入登录密码' },
                            { min: 6, message: '密码至少需6位' }
                        ]}
                    >
                        <Input.Password 
                            prefix={<LockOutlined className="input-prefix-icon" />} 
                            placeholder="设置高强度管理员密码" 
                            size="large" 
                            className="custom-init-input"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginTop: '32px' }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            block
                            loading={loading}
                            className="init-submit-btn"
                        >
                            完成初始化并登录
                        </Button>
                    </Form.Item>
                </Form>
            </div>
            <div className="init-bottom-gradient"></div>
        </div>
    );
};

export default Init;
