import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Cascader, Button, message, Spin, Divider } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import '../styles/CompanySetting.css';
import useCompanyStore from '../stores/useCompanyStore';
import { updateCompany } from '../api/company';

const { Option } = Select;

import provinceCityData from '../config/china-division.json';


const CompanySetting = () => {
    const [form] = Form.useForm();
    const company = useCompanyStore(state => state.company);
    const setCompany = useCompanyStore(state => state.setCompany);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (company) {
            let region = [];
            try {
                if (company.region) {
                    region = JSON.parse(company.region);
                }
            } catch (e) {
                console.error("解析地址出错", e);
            }

            form.setFieldsValue({
                industry: company.industry || 'hotel',
                phone: company.phone,
                brandName: company.brand_name || company.name,
                brandPositioning: company.brand_positioning,
                region: region,
                addressDetail: company.address_detail,
            });
        }
    }, [company, form]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const updateData = {
                name: values.brandName, // 同时更新公司基础名称
                industry: values.industry,
                phone: values.phone,
                brand_name: values.brandName,
                brand_positioning: values.brandPositioning,
                region: JSON.stringify(values.region),
                address_detail: values.addressDetail,
                avatar: company.avatar, // 保持现有头像
            };

            const res = await updateCompany(company.id, updateData);
            if (res.success) {
                message.success('企业设置保存成功！');
                // 更新全局 store
                setCompany({
                    ...company,
                    ...updateData
                });
            } else {
                message.error(res.message || '保存失败');
            }
        } catch (error) {
            console.error('保存企业设置失败:', error);
            message.error('保存失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="company-setting-container">
            <div className="page-header-text">
                <h2 className="main-title">企业设置</h2>
                <p className="sub-title">完善企业相关信息，能让 AI 更深入地了解您的业务与定位，从而为您提供更精准的方案和优化策略。</p>
            </div>

            <div className="company-setting-card">
                <div className="card-header">
                    <InfoCircleOutlined className="info-icon" />
                    <span className="card-title">基本信息</span>
                </div>
                <Divider className="card-divider" />
                
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ industry: 'hotel' }}
                    className="company-setting-form"
                    size="large"
                >
                    <div className="form-row-group">
                        <Form.Item
                            label="所属行业"
                            name="industry"
                            rules={[{ required: true, message: '请选择所属行业' }]}
                            className="form-col"
                        >
                            <Select placeholder="请选择您所在的行业" className="custom-select-override">
                                <Option value="hotel">民宿/酒店</Option>
                                <Option value="restaurant">餐饮</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="联系方式"
                            name="phone"
                            rules={[
                                { required: true, message: '请输入联系方式' },
                                { pattern: /^1\d{10}$/, message: '请输入有效的手机号码' }
                            ]}
                            className="form-col"
                        >
                            <Input placeholder="官方联系邮箱或手机号码" className="custom-input" />
                        </Form.Item>
                    </div>

                    <div className="form-row-group">
                        <Form.Item
                            label="品牌名称"
                            name="brandName"
                            rules={[{ required: true, message: '请输入品牌名称' }]}
                            className="form-col"
                        >
                            <Input placeholder="例: 嗨耶民宿" className="custom-input" />
                        </Form.Item>

                        <Form.Item
                            label="品牌定位"
                            name="brandPositioning"
                            rules={[{ required: true, message: '请输入品牌定位' }]}
                            className="form-col"
                        >
                            <Input placeholder="核心价值主张" className="custom-input" />
                        </Form.Item>
                    </div>

                    <div className="form-row-group">
                        <Form.Item
                            label="所在地区"
                            name="region"
                            rules={[{ required: true, message: '请选择省/市/区县' }]}
                            className="form-col"
                        >
                            <Cascader
                                options={provinceCityData}
                                placeholder="选择省 / 市 / 区县"
                                showSearch
                                className="custom-select-override"
                            />
                        </Form.Item>

                        <Form.Item
                            label="详细地址"
                            name="addressDetail"
                            rules={[{ required: true, message: '请输入详细地址' }]}
                            className="form-col"
                        >
                            <Input placeholder="完整的街道地址" className="custom-input" />
                        </Form.Item>
                    </div>

                    <div className="form-submit-row">
                        <Button type="primary" htmlType="submit" className="submit-btn" size="large" loading={loading}>
                            保存设置
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default CompanySetting;
