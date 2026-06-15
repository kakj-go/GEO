import React, { useState } from 'react';
import { Empty, Tabs } from 'antd';
import Model from './Model';
import CompanySetting from './CompanySetting';
import User from './User';
import '../styles/SystemSetting.css';
import useUserStore from "../stores/useUserStore";
import useCompanyStore from '../stores/useCompanyStore';

const { TabPane } = Tabs;

const SystemSetting = () => {
    const user = useUserStore(state => state.user);
    const company = useCompanyStore(state => state.company);

    const [activeTab, setActiveTab] = useState('models');

    const handleTabChange = (key) => {
        setActiveTab(key);
        // 切换标签时重置滚动位置
        window.scrollTo(0, 0);
    };

    const isManager = company.manager_user_id === user.id;

    return (
        <div className="media-library-container">
            <Tabs activeKey={activeTab} onChange={handleTabChange} size="large">
                <TabPane tab="模型列表" key="models" className="models_tab">
                    <Model />
                </TabPane>
                <TabPane tab="企业设置" key="company" className="company_tab">
                    <CompanySetting />
                </TabPane>
                {/* {isManager && (
                    <TabPane tab="用户设置" key="users" className="users_tab">
                        <User />
                    </TabPane>
                )} */}
            </Tabs>
        </div>
    );
};

export default SystemSetting;