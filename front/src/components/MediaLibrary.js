import React, { useState } from 'react';
import { Tabs } from 'antd';
import AssetsLibrary from './AssetsLibrary';
import MaterialLibrary from './MaterialLibrary';
import CopywritingLibrary from './CopywritingLibrary';
import '../styles/MediaLibrary.css';

const { TabPane } = Tabs;

const MediaLibrary = () => {
    const [activeTab, setActiveTab] = useState('assets');

    const handleTabChange = (key) => {
        setActiveTab(key);
        // 切换标签时重置滚动位置
        window.scrollTo(0, 0);
    };

    return (
        <div className="media-library-container">
            <Tabs activeKey={activeTab} onChange={handleTabChange} size="large">
                <TabPane tab="资产库" key="assets" className="assets_library_tab">
                    <AssetsLibrary />
                </TabPane>
                <TabPane tab="文案库" key="material">
                    <MaterialLibrary />
                </TabPane>
                <TabPane tab="方案库" key="copywriting">
                    <CopywritingLibrary />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default MediaLibrary;