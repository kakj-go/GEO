import React, { useState, useRef, useEffect } from 'react';
import { Upload, message } from 'antd';
import { 
    HomeOutlined, 
    RobotOutlined, 
    ApiOutlined, 
    FolderOutlined, 
    SettingOutlined,
    RightOutlined,
    DownOutlined
} from '@ant-design/icons';
import useUserStore from '../stores/useUserStore';
import useCompanyStore from '../stores/useCompanyStore';
import { updateCompany } from '../api/company';
import '../styles/MainLayout.css';

import WebsiteLoginContext from './WebsiteLoginContext';
import MatrixJob from './MatrixJob';
import Workbench from "./Workbench";
import MediaLibrary from "./MediaLibrary";
import SystemSetting from "./SystemSetting";
import AIEOGenerate from "./AIEOGenerate";
import PlanDesignExpert from "./PlanDesignExpert";
import AccountSetting from "./AccountSetting";
import AssetsLibrary from './AssetsLibrary';
import CopywritingLibrary from './CopywritingLibrary';
import MaterialLibrary from './MaterialLibrary';
import Model from './Model';
import CompanySetting from './CompanySetting';
import UsageLogModal from './UsageLogModal';

const MainLayout = () => {
    const [activeMenu, setActiveMenu] = useState('工作台');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState(''); // 新增子菜单状态
    const dropdownRef = useRef(null);
    const user = useUserStore(state => state.user);
    const logout = useUserStore(state => state.logout);
    const company = useCompanyStore(state => state.company);
    const updateCompanyAvatar = useCompanyStore(state => state.updateCompanyAvatar);
    const fetchCompanyInfo = useCompanyStore(state => state.CompanyInfo);


    const [consoleEnabled, setConsoleEnabled] = useState(false); // 控制台开关状态
    const [usageLogVisible, setUsageLogVisible] = useState(false);
    
    // balance directly records internal points
    const points = company?.balance || 0;

    const getBase64 = (img, callback) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    };

    const beforeUpload = (file) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('只允许上传 JPG/PNG 格式图片!');
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('图片不能大于 2MB!');
        }
        return isJpgOrPng && isLt2M;
    };

    const handleChangeAvatar = async (info) => {
        if (info.file.status === 'done' || info.file.status === 'error') {
            // 注意：这里实际项目中应该使用服务器返回的真实 URL
            // info.file.response.data.url 之类。
            // 暂时沿用 Base64 模拟更新
            getBase64(info.file.originFileObj, async (url) => {
                try {
                    const res = await updateCompany(company.id, {
                        ...company,
                        avatar: url
                    });
                    if (res.success) {
                        updateCompanyAvatar(url);
                        message.success('企业头像更新成功！');
                    } else {
                        message.error('头像保存到数据库失败');
                    }
                } catch (error) {
                    message.error('网络错误，头像保存失败');
                }
            });
        }
    };

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        logout();
        setDropdownVisible(false);
        // 登出后会自动跳转到登录页面
    };

    const toggleConsole = async () => {
        const { ipcRenderer } = window.require('electron');

        const newState = !consoleEnabled;
        setConsoleEnabled(newState);

        await ipcRenderer.invoke('toggle-devtools', newState);

        setDropdownVisible(false);
    };

    const toggleDropdown = () => {
        const nextVisible = !dropdownVisible;
        setDropdownVisible(nextVisible);
        if (nextVisible && company?.id) {
            fetchCompanyInfo(company.id);
        }
    };

    const getUserInitial = () => {
        const name = user?.nickname || user?.username || '用户';
        return name.charAt(0).toUpperCase();
    };

    const getCompanyInitial = () => {
        const name = company?.name || '公';
        return name.charAt(0).toUpperCase();
    };

    const renderContent = () => {
        if (activeSubMenu === 'AIEO专家') {
            return <AIEOGenerate />;
        }

        switch (activeMenu) {
            case '工作台':
                return (
                    <MatrixJob />
                );
            case '智能体':
                return (
                    <Workbench setActiveSubMenu={setActiveSubMenu} /> // 传递setActiveSubMenu
                );
            case '矩阵授权':
                return <WebsiteLoginContext />;
            case '素材库':
                switch (activeSubMenu) {
                    case 'assets': return <AssetsLibrary />;
                    case 'material': return <MaterialLibrary />;
                    case 'copywriting': return <CopywritingLibrary />;
                    default: return <AssetsLibrary />;
                }
            case '系统设置':
                switch (activeSubMenu) {
                    case 'models': return <Model />;
                    case 'company': return <CompanySetting />;
                    default: return <Model />;
                }
            case '账户设置':
                return <AccountSetting />;
            default:
                return <div>页面内容</div>;
        }
    };

    const menuItems = [
        { name: '工作台', icon: <HomeOutlined /> },
        { name: '智能体', icon: <RobotOutlined /> },
        { name: '矩阵授权', icon: <ApiOutlined /> },
        {
            name: '素材库',
            icon: <FolderOutlined />,
            children: [
                { name: '资产库', key: 'assets' },
                { name: '文案库', key: 'material' },
                { name: '方案库', key: 'copywriting' }
            ]
        },
        {
            name: '系统设置',
            icon: <SettingOutlined />,
            children: [
                { name: '模型列表', key: 'models' },
                { name: '企业设置', key: 'company' }
            ]
        }
    ];

    if (activeSubMenu === '方案设计专家') {
        return <PlanDesignExpert setActiveSubMenu={setActiveSubMenu} />;
    }

    return (
        <div className="main-layout">
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="company-info">
                        <Upload
                            name="avatar"
                            showUploadList={false}
                            action="https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188"
                            beforeUpload={beforeUpload}
                            onChange={handleChangeAvatar}
                        >
                            <div className="company-avatar" style={{ cursor: 'pointer' }} title="点击上传更新企业头像">
                                {company?.avatar ? (
                                    <img
                                        src={company.avatar}
                                        alt="公司头像"
                                        className="avatar-image"
                                    />
                                ) : (
                                    <span className="avatar-initial">
                                        {getCompanyInitial()}
                                    </span>
                                )}
                            </div>
                        </Upload>
                        <h2 className="company-name">{company?.name || "公司名称"}</h2>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <div key={item.name}>
                            <button
                                className={`nav-item ${activeMenu === item.name ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveMenu(item.name);
                                    if (item.children) {
                                        setActiveSubMenu(item.children[0].key);
                                    } else {
                                        setActiveSubMenu('');
                                    }
                                }}
                            >
                                <span className="menu-icon">{item.icon}</span>
                                <span className="menu-text">{item.name}</span>
                                {item.children && (
                                    <span className="submenu-arrow">
                                        {activeMenu === item.name ? <DownOutlined /> : <RightOutlined />}
                                    </span>
                                )}
                            </button>
                            {item.children && activeMenu === item.name && (
                                <div className="sub-menu">
                                    {item.children.map(child => (
                                        <button
                                            key={child.name}
                                            className={`sub-nav-item ${activeSubMenu === child.key ? 'active' : ''}`}
                                            onClick={() => setActiveSubMenu(child.key)}
                                        >
                                            {child.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-avatar-dropdown" ref={dropdownRef}>
                        <div
                            className="avatar-container"
                            onClick={toggleDropdown}
                        >
                            <div className="user-avatar">
                                {user?.avatar ? (
                                    <img
                                        style={{ width: 36, height: 36 }}
                                        src={user.avatar}
                                        alt="用户头像"
                                        className="avatar-image"
                                    />
                                ) : (
                                    <span className="avatar-initial">
                                        {getUserInitial()}
                                    </span>
                                )}
                            </div>
                            <div className="user-info">
                                <span className="user-name">
                                    {user?.nickname || user?.username || "用户"}
                                </span>
                                <span className="user-role">
                                    ADMIN ACCOUNT
                                </span>
                            </div>
                        </div>

                        {dropdownVisible && (
                            <div className="dropdown-menu">
                                <div className="dropdown-item" onClick={toggleConsole}>
                                    <span className="dropdown-icon">🔧</span>
                                    调试
                                    <div className={`toggle-switch ${consoleEnabled ? 'active' : ''}`}>
                                        <div className="toggle-slider"></div>
                                    </div>
                                </div>

                                <div className="dropdown-item" onClick={() => { setActiveMenu('账户设置'); setDropdownVisible(false); }}>
                                    <span className="dropdown-icon">👤</span>
                                    账户设置
                                </div>

                                <div className="points-dropdown-card" onClick={() => { setUsageLogVisible(true); setDropdownVisible(false); }}>
                                    <div className="points-header">
                                        <span className="points-title">积分</span>
                                        <span className="points-value">
                                            {points} <RightOutlined style={{ fontSize: '12px', marginLeft: '4px', color: '#8c8c8c' }} />
                                        </span>
                                    </div>
                                    <div className="points-warning">积分不足请及时补充</div>
                                </div>

                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item logout" onClick={handleLogout}>
                                    <span className="dropdown-icon">🚪</span>
                                    退出登录
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 主内容区域 */}
            <div className="main-content">
                <div className="content-body">
                    {renderContent()}
                </div>
            </div>

            <UsageLogModal 
                visible={usageLogVisible}
                onClose={() => setUsageLogVisible(false)}
                points={points}
                companyId={company?.id}
            />
        </div>
    );
};

export default MainLayout;