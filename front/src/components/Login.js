// src/components/Login.jsx
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import useAppStore from '../stores/useAppStore';
import useCombinationStore from '../stores/useCombinationStore';
import useCompanyStore from '../stores/useCompanyStore';
import '../styles/Login.css';

const Login = () => {
    const [form] = Form.useForm();
    const store = useCombinationStore();
    const companyStore = useCompanyStore();
    const setLoading = useAppStore(state => state.setLoading);
    const loading = useAppStore(state => state.loading);

    const onFinish = async (values) => {
        const { username, password } = values;

        setLoading(true);
        try {
            const result = await store.login({ username, password });
            if (result.success) {
                const companyInfo = await companyStore.CompanyInfo(result.user.company_id)
                if (companyInfo.success) {
                    message.success('登录成功');
                } else {
                    message.error(`登录失败: ${companyInfo.message}`);
                }
            } else {
                message.error(`登录失败: ${result.message}`);
            }
        } catch (error) {
            message.error(`登录出错: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon-box">
                        <LockOutlined className="lock-icon" />
                    </div>
                    <h2 className="login-title">系统登录</h2>
                    <p className="login-subtitle">请输入您的凭据以访问系统平台</p>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                    className="login-form-body"
                >
                    <Form.Item
                        label="用户名"
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input 
                            prefix={<UserOutlined className="input-prefix-icon" />} 
                            placeholder="请输入用户名" 
                            className="custom-login-input"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password 
                            prefix={<LockOutlined className="input-prefix-icon" />} 
                            placeholder="请输入密码" 
                            className="custom-login-input"
                            size="large"
                            iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            className="login-submit-btn" 
                            size="large" 
                            loading={loading}
                            block
                        >
                            <span>登录</span>
                            <ArrowRightOutlined className="arrow-icon" />
                        </Button>
                    </Form.Item>

                    <Form.Item name="remember" valuePropName="checked" noStyle>
                        <Checkbox className="remember-me">记住我</Checkbox>
                    </Form.Item>
                </Form>
            </div>
            <div className="login-bottom-gradient"></div>
        </div>
    );
};

export default Login;