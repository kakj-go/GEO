// src/components/Workbench.js
import React from 'react';
import '../styles/Workbench.css';
import { message } from 'antd';
import { 
    GlobalOutlined, 
    RocketOutlined, 
    StarOutlined, 
    RobotOutlined,
    BarChartOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ThunderboltOutlined,
    DatabaseOutlined
} from '@ant-design/icons';

const AgentCard = ({ 
    title, 
    description, 
    icon, 
    color, 
    onAction, 
    actionText = "开始使用", 
    disabled = false 
}) => {
    return (
        <div className={`agent-card ${disabled ? 'disabled' : ''}`}>
            <div className="card-header">
                <div className={`icon-wrapper ${color}`}>
                    {icon}
                </div>
                {!disabled && (
                    <div className="status-indicator">
                        <span className="pulse-dot"></span>
                    </div>
                )}
            </div>

            <div className="card-content">
                <h3 className="agent-title">{title}</h3>
                <p className="agent-desc">{description}</p>
            </div>

            <div className="card-footer">
                <button 
                    className={`main-action-btn ${color} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && onAction()}
                    disabled={disabled}
                >
                    {disabled ? "尽请期待" : actionText}
                </button>
            </div>
        </div>
    );
};

const Workbench = ({ setActiveSubMenu }) => {
    const agents = [
        {
            category: "智能营销",
            items: [
                {
                    title: "AIEO专家",
                    description: "优化全平台数字曝光与神经语义共鸣，提供策略规划和执行指导。",
                    icon: <GlobalOutlined />,
                    color: "blue",
                    action: () => setActiveSubMenu('AIEO专家')
                },
                {
                    title: "方案设计专家",
                    description: "为系统扩展生成架构蓝图，提供全方位的方案设计与执行指导。",
                    icon: <RocketOutlined />,
                    color: "green",
                    action: () => setActiveSubMenu('方案设计专家')
                },
                {
                    title: "产品评论专家",
                    description: "定性分析与反馈循环自动化，智能生成优质产品评论。",
                    icon: <StarOutlined />,
                    color: "orange",
                    disabled: true
                }
            ]
        },
        {
            category: "智能售后",
            items: [
                {
                    title: "销售机器人",
                    description: "24/7智能客服，自动处理常见问题，提供专业的销售咨询服务。",
                    icon: <RobotOutlined />,
                    color: "purple",
                    disabled: true
                }
            ]
        }
    ];

    return (
        <div className="workbench-container">
            {agents.map((section, sIndex) => (
                <div key={sIndex} className="workbench-section">
                    <h2 className="section-title">{section.category}</h2>
                    <div className="agents-grid">
                        {section.items.map((agent, aIndex) => (
                            <AgentCard 
                                key={aIndex}
                                {...agent}
                                onAction={agent.action}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Workbench;