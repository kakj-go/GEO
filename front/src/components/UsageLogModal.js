import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Tabs, Table, Tag, Input, DatePicker, Select, Button, Space, Row, Col, Card, Collapse, InputNumber, message, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, InfoCircleOutlined, BellOutlined, WalletOutlined, AlipayOutlined, WechatOutlined, CheckCircleFilled, CopyOutlined, GiftOutlined } from '@ant-design/icons';
import { getTransactions, getUsageLogs, recharge } from '../api/company';
import useCompanyStore from '../stores/useCompanyStore';
import useUserStore from '../stores/useUserStore';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

const UsageLogModal = ({ visible, onClose, points = 0, companyId }) => {
    const [activeTab, setActiveTab] = useState('usage');
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [customAmount, setCustomAmount] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('alipay');
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailData, setDetailData] = useState(null);
    
    const [usageLogs, setUsageLogs] = useState([]);
    const [usageTotal, setUsageTotal] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [transactionTotal, setTransactionTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [usageParams, setUsageParams] = useState({ page: 1, pageSize: 10 });
    const [transactionParams, setTransactionParams] = useState({ page: 1, pageSize: 10 });

    const fetchCompanyInfo = useCompanyStore(state => state.CompanyInfo);
    const user = useUserStore(state => state.user);

    const fetchUsageLogs = useCallback(async () => {
        if (!companyId || !visible) return;
        setLoading(true);
        try {
            const res = await getUsageLogs(companyId, usageParams);
            if (res.success) {
                setUsageLogs(res.data.logs || []);
                setUsageTotal(res.data.total || 0);
            }
        } catch (error) {
            message.error('获取用量记录失败');
        } finally {
            setLoading(false);
        }
    }, [companyId, visible, usageParams]);

    const fetchTransactions = useCallback(async () => {
        if (!companyId || !visible) return;
        setLoading(true);
        try {
            const res = await getTransactions(companyId, transactionParams);
            if (res.success) {
                setTransactions(res.data.transactions || []);
                setTransactionTotal(res.data.total || 0);
            }
        } catch (error) {
            message.error('获取交易历史失败');
        } finally {
            setLoading(false);
        }
    }, [companyId, visible, transactionParams]);

    useEffect(() => {
        if (visible && companyId) {
            if (activeTab === 'usage') {
                fetchUsageLogs();
            } else if (activeTab === 'recharge') {
                fetchTransactions();
                // 每次进入充值界面都重新加载公司信息以更新积分
                fetchCompanyInfo(companyId);
            }
        }
    }, [activeTab, visible, companyId, fetchUsageLogs, fetchTransactions, fetchCompanyInfo]);

    const handleRecharge = async () => {
        if (!companyId || !user?.id) {
            message.error('无法获取企业或用户信息');
            return;
        }
        
        setLoading(true);
        try {
            const res = await recharge(companyId, {
                amount: customAmount * 100,
                user_id: user.id,
                payment_method: paymentMethod === 'alipay' ? '支付宝' : '微信支付',
                remark: '用户自主充值'
            });
            
            if (res.success) {
                message.success('充值成功');
                // 刷新余额
                await fetchCompanyInfo(companyId);
                // 刷新交易记录
                fetchTransactions();
            } else {
                message.error(res.message || '充值失败');
            }
        } catch (error) {
            message.error('支付请求失败');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    const transactionColumns = [
        {
            title: '订单号',
            dataIndex: 'orderId',
            key: 'orderId',
            render: (text) => (
                <Space>
                    <span style={{ color: '#8c8c8c', fontSize: '12px' }}>{text}</span>
                    <CopyOutlined 
                        style={{ cursor: 'pointer', color: '#bfbfbf' }} 
                        onClick={() => handleCopy(text)}
                    />
                </Space>
            )
        },
        {
            title: '支付方式',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            align: 'center',
            render: (text) => <span>{text}</span>
        },
        {
            title: '充值积分',
            dataIndex: 'rechargeAmount',
            key: 'rechargeAmount',
            align: 'center',
            render: (val) => (
                <Space size={4}>
                    <GiftOutlined style={{ color: '#8c8c8c' }} />
                    <span>{val}</span>
                </Space>
            )
        },
        {
            title: '支付金额',
            dataIndex: 'paidAmount',
            key: 'paidAmount',
            align: 'center',
            render: (val) => <span style={{ color: '#52c41a', fontWeight: '500' }}>￥{val}</span>
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => (
                <Tag color="success" style={{ borderRadius: '12px', padding: '0 12px', border: 'none', background: '#52c41a', color: '#fff' }}>
                    {status}
                </Tag>
            )
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            align: 'right',
            render: (text) => <span style={{ color: '#8c8c8c' }}>{text}</span>
        }
    ];

    const transactionData = transactions.map(t => ({
        key: t.id,
        orderId: t.order_id,
        paymentMethod: t.payment_method,
        rechargeAmount: t.amount,
        paidAmount: (t.amount / 100).toFixed(2), 
        status: t.status === 'success' ? '成功' : t.status,
        createdAt: new Date(t.created_at * 1000).toLocaleString()
    }));

    const handleShowDetail = (record) => {
        setDetailData({
            ...record,
            duration: `${record.duration_ms} ms`,
            throughput: `${record.throughput?.toFixed(2)} tokens/s`,
            reason: record.finish_reason || '-',
            inputTokens: record.prompt_tokens,
            outputTokens: record.completion_tokens,
            cacheTokens: 0,
            inputCost: `${record.prompt_points} 积分`,
            outputCost: `${record.completion_points} 积分`,
            totalCost: `${record.points} 积分`
        });
        setDetailVisible(true);
    };

    const columns = [
        { 
            title: '时间', 
            dataIndex: 'time', 
            key: 'time',
            width: 180,
        },
        { 
            title: '模型', 
            dataIndex: 'model', 
            key: 'model',
            width: 200,
            render: (model) => (
                <Tag style={{ background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                    {model}
                </Tag>
            )
        },
        { 
            title: '状态', 
            dataIndex: 'finish_reason', 
            key: 'status',
            width: 100,
            render: (reason) => (
                <Tag color={reason ? 'error' : 'success'} style={{ borderRadius: '4px' }}>
                    {reason ? '失败' : '成功'}
                </Tag>
            )
        },
        { 
            title: '输入 Tokens', 
            dataIndex: 'prompt', 
            key: 'prompt',
            width: 120,
        },
        { 
            title: '输出 Tokens', 
            dataIndex: 'completion', 
            key: 'completion',
            width: 120,
        },
        { 
            title: '价格', 
            dataIndex: 'price', 
            key: 'price',
            width: 140,
            render: (price) => (
                <Space size={4}>
                    <span style={{ fontWeight: '500' }}>{price.replace('$', '￥')}</span>
                    {price === '1 积分' && (
                        <Tooltip title="合计不足1积分按1积分计费">
                            <InfoCircleOutlined style={{ color: '#bfbfbf', fontSize: '13px' }} />
                        </Tooltip>
                    )}
                </Space>
            )
        },
        { 
            title: '内容', 
            dataIndex: 'content', 
            key: 'content',
            ellipsis: true,
            render: (text) => (
                <Tooltip title={text} overlayStyle={{ maxWidth: '400px' }}>
                    <span>{text}</span>
                </Tooltip>
            )
        },
        { 
            title: '操作', 
            key: 'action',
            width: 80,
            fixed: 'right',
            render: (_, record) => (
                <Button 
                    type="link" 
                    size="small" 
                    onClick={() => handleShowDetail(record)}
                >
                    详情
                </Button>
            )
        },
    ];

    const usageTableData = usageLogs.map(log => ({
        key: log.id,
        time: new Date(log.created_at * 1000).toLocaleString(),
        model: log.model_id,
        prompt: log.prompt_tokens,
        completion: log.completion_tokens,
        price: log.points + ' 积分',
        content: log.content_preview || '-',
        ...log
    }));

    const packages = [
        { id: 1, amount: 10 },
        { id: 2, amount: 50 },
        { id: 3, amount: 100 },
        { id: 4, amount: 500 },
        { id: 5, amount: 1000 },
        { id: 6, amount: 5000 },
    ];

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            width={1100}
            footer={null}
            centered
            bodyStyle={{ padding: '0 24px 24px 24px', overflowX: 'hidden' }}
            title={
                <div style={{ padding: '16px 0 8px 0' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#000' }}>账单与充值</div>
                    <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '400', marginTop: '4px' }}>
                        管理您的积分和交易记录
                    </div>
                </div>
            }
        >
            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                className="custom-main-tabs"
            >
                <TabPane tab="用量" key="usage">
                    <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        marginBottom: '20px',
                        marginTop: '16px'
                    }}>
                        <Input 
                            placeholder="按模型名称搜索" 
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
                            style={{ width: 220, borderRadius: '8px' }}
                        />
                        <RangePicker 
                            style={{ borderRadius: '8px' }} 
                            placeholder={['开始日期', '结束日期']}
                        />
                        <Button 
                            icon={<ReloadOutlined />} 
                            style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        />
                    </div>
                    
                    <Table 
                        columns={columns} 
                        dataSource={usageTableData} 
                        loading={loading}
                        pagination={{ 
                            current: usageParams.page,
                            pageSize: usageParams.pageSize,
                            total: usageTotal,
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条记录`,
                            onChange: (page, pageSize) => setUsageParams({ page, pageSize })
                        }}
                        size="middle"
                        className="usage-table"
                        scroll={{ x: 1000 }}
                    />
                </TabPane>

                <TabPane tab="充值" key="recharge">
                    <Row gutter={24} style={{ marginTop: '20px', width: '100%', marginInline: 0, overflowX: 'hidden' }}>
                        {/* 左侧区域 */}
                        <Col span={8}>
                            <Card className="balance-card">
                                <div className="balance-header">
                                    <div className="balance-title">
                                        <WalletOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                        当前积分
                                    </div>
                                    <BellOutlined className="notice-icon" />
                                </div>
                                <div className="balance-amount">{points}</div>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px', fontWeight: '500' }}>
                                    换算比例：1元 = 100积分
                                </div>
                            </Card>

                            <Collapse ghost className="faq-collapse" expandIconPosition="right">
                                <div style={{ fontSize: '16px', fontWeight: '600', margin: '24px 0 16px 0', display: 'flex', alignItems: 'center' }}>
                                    <InfoCircleOutlined style={{ marginRight: '8px' }} /> 常见问题
                                </div>
                                <Panel header="余额可以用于网站上的所有模型吗？" key="1">
                                    <p>是的，您可以根据不同的模型价格使用余额进行消费。</p>
                                </Panel>
                                <Panel header="余额是否长期有效？" key="2">
                                    <p>余额长期有效，无过期时间。</p>
                                </Panel>
                            </Collapse>
                        </Col>

                        {/* 右侧区域 */}
                        <Col span={16}>
                            <div className="section-title">充值套餐</div>
                            <div className="section-subtitle">选择适合您的套餐，享受更多优惠</div>

                            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                                {packages.map((pkg) => (
                                    <Col span={8} key={pkg.id}>
                                        <div
                                            className={`package-card ${selectedPackage === pkg.id ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedPackage(pkg.id);
                                                setCustomAmount(pkg.amount);
                                            }}
                                        >
                                            <div className="package-amount">￥{pkg.amount}.00</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            <div className="section-title" style={{ marginTop: '32px' }}>自定义金额 (CNY)</div>
                            <InputNumber
                                prefix="￥"
                                min={1}
                                value={customAmount}
                                onChange={(val) => {
                                    setCustomAmount(val);
                                    // 如果输入的值不匹配任何预设套餐，取消选中状态
                                    const matchedPkg = packages.find(p => p.amount === val);
                                    setSelectedPackage(matchedPkg ? matchedPkg.id : null);
                                }}
                                className="custom-amount-input"
                                style={{ width: '100%', marginTop: '8px' }}
                            />
                            <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '8px' }}>最低 ￥1.00</div>

                            <div className="section-title" style={{ marginTop: '32px' }}>选择支付方式</div>
                            <Row gutter={16} style={{ marginTop: '16px' }}>
                                <Col span={12}>
                                    <Button 
                                        className={`payment-btn alipay ${paymentMethod === 'alipay' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('alipay')}
                                        icon={<AlipayOutlined />}
                                        block
                                    >
                                        支付宝
                                    </Button>
                                </Col>
                                <Col span={12}>
                                    <Button 
                                        className={`payment-btn wechat ${paymentMethod === 'wechat' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('wechat')}
                                        icon={<WechatOutlined />}
                                        block
                                    >
                                        微信支付
                                    </Button>
                                </Col>
                            </Row>
                            
                            <Button 
                                type="primary" 
                                size="large" 
                                block 
                                loading={loading}
                                onClick={handleRecharge}
                                style={{ marginTop: '40px', height: '48px', borderRadius: '12px', fontWeight: '600', fontSize: '16px' }}
                            >
                                立即支付
                            </Button>
                        </Col>
                    </Row>

                    {/* 交易历史区域 */}
                    <div style={{ marginTop: '64px', padding: '32px', border: '1px solid #f0f0f0', borderRadius: '16px', background: '#fff' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#000' }}>交易历史</div>
                        <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px' }}>查看您的所有交易记录</div>
                        
                        <div style={{ marginTop: '24px', fontSize: '14px', color: '#8c8c8c' }}>
                            共 {transactionTotal} 条记录
                        </div>

                        <Table 
                            columns={transactionColumns} 
                            dataSource={transactionData}
                            loading={loading}
                            pagination={{
                                current: transactionParams.page,
                                pageSize: transactionParams.pageSize,
                                total: transactionTotal,
                                onChange: (page, pageSize) => setTransactionParams({ page, pageSize })
                            }}
                            size="middle"
                            style={{ marginTop: '16px' }}
                            className="transaction-table"
                        />
                    </div>
                </TabPane>
            </Tabs>

            {/* 详情弹窗 */}
            <Modal
                title={null}
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={700}
                centered
                bodyStyle={{ padding: '24px' }}
                closeIcon={<div className="custom-detail-close"><Space><span>×</span></Space></div>}
            >
                <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#000' }}>详情</div>
                
                {detailData && (
                    <>
                        <div className="detail-section">
                            <div className="detail-section-title">调用信息</div>
                            <Row gutter={[32, 16]}>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">模型：</span>
                                        <span className="detail-value">{detailData.model}</span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">响应时间：</span>
                                        <span className="detail-value">{detailData.duration}</span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">吞吐量：</span>
                                        <span className="detail-value">{detailData.throughput}</span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">结束原因：</span>
                                        <span className="detail-value">{detailData.reason}</span>
                                    </div>
                                </Col>
                            </Row>
                        </div>

                        <div className="detail-section" style={{ marginTop: '32px' }}>
                            <div className="detail-section-title">消费信息</div>
                            <Row gutter={[32, 16]}>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">输入 Tokens：</span>
                                        <span className="detail-value">{detailData.inputTokens}</span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">输出 Tokens：</span>
                                        <span className="detail-value">{detailData.outputTokens}</span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">输入消费：</span>
                                        <span className="detail-value">{detailData.inputCost}</span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">输出消费：</span>
                                        <span className="detail-value">{detailData.outputCost}</span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="detail-item">
                                        <span className="detail-label">消费合计：</span>
                                        <span className="detail-value" style={{ fontWeight: '700' }}>{detailData.totalCost}</span>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </>
                )}
            </Modal>

            <style>{`
                .ant-modal-body {
                    overflow-x: hidden !important;
                }
                .ant-tabs-content-holder {
                    overflow-x: hidden !important;
                    width: 100%;
                }
                .custom-main-tabs .ant-tabs-nav::before {
                    border-bottom: 1px solid #f0f0f0;
                }
                /* ... rest of existing styles ... */
                .detail-section-title {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 20px;
                    padding-left: 12px;
                    border-left: 4px solid #1890ff;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                }
                .detail-item {
                    display: flex;
                    font-size: 14px;
                    line-height: 1.5;
                }
                .detail-label {
                    color: #8c8c8c;
                    white-space: nowrap;
                }
                .detail-value {
                    color: #262626;
                }
                .custom-detail-close {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: #f5f5f5;
                    color: #8c8c8c;
                    font-size: 20px;
                    transition: all 0.3s;
                }
                .custom-detail-close:hover {
                    background: #e8e8e8;
                    color: #595959;
                }
                
                .custom-main-tabs .ant-tabs-tab {
                    padding: 12px 0;
                    margin-right: 32px;
                    font-size: 16px;
                }
                .custom-main-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
                    font-weight: 700;
                    color: #000;
                }
                .custom-main-tabs .ant-tabs-ink-bar {
                    background: #1890ff;
                }
                
                /* Balance Card */
                .balance-card {
                    background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
                    border-radius: 16px;
                    border: 1px solid #e6f7ff;
                    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.05);
                }
                .balance-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .balance-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: #262626;
                }
                .balance-amount {
                    font-size: 32px;
                    font-weight: 800;
                    margin-top: 16px;
                    color: #000;
                }
                .notice-icon {
                    color: #bfbfbf;
                    cursor: pointer;
                }

                /* Section Styles */
                .section-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #262626;
                }
                .section-subtitle {
                    font-size: 13px;
                    color: #8c8c8c;
                    margin: 4px 0 20px 0;
                }

                /* Package Cards */
                .package-card {
                    position: relative;
                    padding: 24px 16px;
                    border: 1px solid #f0f0f0;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: center;
                    overflow: hidden;
                    background: #fff;
                }
                .package-card:hover {
                    border-color: #1890ff;
                    box-shadow: 0 4px 10px rgba(24, 144, 255, 0.1);
                }
                .package-card.active {
                    border-color: #1890ff;
                    background: #f0f7ff;
                    box-shadow: 0 0 0 1px #1890ff;
                }
                .package-amount {
                    font-size: 24px;
                    font-weight: 700;
                    color: #000;
                }
                .package-badge {
                    position: absolute;
                    top: 0;
                    right: 0;
                    background: #52c41a;
                    color: white;
                    font-size: 10px;
                    padding: 2px 20px;
                    transform: rotate(45deg) translate(20px, -15px);
                    font-weight: 700;
                    width: 100px;
                }

                /* Payment Buttons */
                .payment-btn {
                    height: 54px;
                    border-radius: 10px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    border: 1px solid #f0f0f0;
                }
                .payment-btn.active {
                    border-color: #1890ff;
                    box-shadow: 0 0 0 1px #1890ff;
                }
                .payment-btn.alipay.active {
                    background: #1890ff;
                    color: white;
                }
                .payment-btn.wechat.active {
                    background: #52c41a;
                    color: white;
                }
                .payment-btn.alipay .anticon {
                    font-size: 18px;
                }
                .payment-btn.wechat .anticon {
                    font-size: 18px;
                }

                /* FAQ */
                .faq-collapse .ant-collapse-header {
                    padding: 12px 0 !important;
                    font-weight: 500;
                    color: #595959;
                }

                /* Table Styles */
                .usage-table .ant-table-thead > tr > th {
                    background: transparent;
                    color: #8c8c8c;
                    font-weight: 400;
                }
                .custom-rounded-select .ant-select-selector {
                    border-radius: 8px !important;
                }
                .custom-amount-input {
                    height: 50px;
                    display: flex;
                    align-items: center;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: 600;
                }
                .custom-amount-input .ant-input-number-input {
                    height: 48px;
                }
            `}</style>
        </Modal>
    );
};

export default UsageLogModal;
