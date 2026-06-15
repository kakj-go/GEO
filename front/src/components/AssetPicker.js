import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Tabs, Input, Tag, Spin, Empty, message, Checkbox } from 'antd';
import { SearchOutlined, CheckCircleFilled } from '@ant-design/icons';
import { getAssetsLibraryList } from '../api/assetsLibrary';
import '../styles/AssetPicker.css';

const AssetPicker = ({ visible, onCancel, onSelect, type = 'image', multiple = false }) => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [activeTab, setActiveTab] = useState(type); // 'image' or 'video'
    const [subTab, setSubTab] = useState('all'); // 'all' or 'favorite'
    const [searchKeyword, setSearchKeyword] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [hasMore, setHasMore] = useState(true);
    const scrollContainerRef = useRef(null);

    const fetchAssets = async (pageNum = 1, append = false) => {
        setLoading(true);
        try {
            const params = {
                page: pageNum,
                page_size: pageSize,
                type: activeTab,
                description: searchKeyword,
                // favorites support depends on backend, for now let's just use all
                // if (subTab === 'favorite') params.tags = 'favorite'; 
            };
            const response = await getAssetsLibraryList(params);
            if (response.success) {
                const newAssets = response.data.assets || [];
                setAssets(prev => append ? [...prev, ...newAssets] : newAssets);
                setHasMore(newAssets.length >= pageSize);
                setPage(pageNum);
            }
        } catch (error) {
            message.error('加载资产失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchAssets(1, false);
            setSelectedIds([]);
        }
    }, [visible, activeTab, subTab, searchKeyword]);

    const handleScroll = useCallback(() => {
        if (loading || !hasMore) return;
        const container = scrollContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 50) {
                fetchAssets(page + 1, true);
            }
        }
    }, [loading, hasMore, page]);

    const toggleSelect = (asset) => {
        if (multiple) {
            if (selectedIds.includes(asset.id)) {
                setSelectedIds(selectedIds.filter(id => id !== asset.id));
            } else {
                setSelectedIds([...selectedIds, asset.id]);
            }
        } else {
            setSelectedIds([asset.id]);
        }
    };

    const handleConfirm = () => {
        const selectedAssets = assets.filter(a => selectedIds.includes(a.id));
        if (selectedAssets.length > 0) {
            onSelect(multiple ? selectedAssets : selectedAssets[0]);
            onCancel();
        } else {
            message.warning('请选择至少一个资产');
        }
    };

    return (
        <Modal
            title="资产选取"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={900}
            className="asset-picker-modal"
            centered
        >
            <div className="asset-picker-container">
                <div className="asset-picker-header">
                    <div className="type-tabs">
                        <div 
                            className={`type-tab ${activeTab === 'image' ? 'active' : ''}`}
                            onClick={() => setActiveTab('image')}
                        >
                            图片
                        </div>
                        <div 
                            className={`type-tab ${activeTab === 'video' ? 'active' : ''}`}
                            onClick={() => setActiveTab('video')}
                        >
                            视频
                        </div>
                    </div>
                </div>

                <div className="asset-picker-filters">
                    <div className="sub-tabs">
                        <div 
                            className={`sub-tab ${subTab === 'all' ? 'active' : ''}`}
                            onClick={() => setSubTab('all')}
                        >
                            所有{activeTab === 'image' ? '图片' : '视频'}
                        </div>
                        <div 
                            className={`sub-tab ${subTab === 'favorite' ? 'active' : ''}`}
                            onClick={() => setSubTab('favorite')}
                        >
                            收藏
                        </div>
                    </div>
                    <Input
                        placeholder="搜索标题或描述"
                        prefix={<SearchOutlined />}
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        className="search-input"
                        allowClear
                    />
                </div>

                <div 
                    className="asset-grid-container custom-scroll" 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                >
                    {assets.length > 0 ? (
                        <div className="asset-picker-grid">
                            {assets.map(asset => (
                                <div 
                                    key={asset.id} 
                                    className={`asset-picker-item ${selectedIds.includes(asset.id) ? 'selected' : ''}`}
                                    onClick={() => toggleSelect(asset)}
                                >
                                    <div className="asset-thumb-container">
                                        {asset.type === 'image' ? (
                                            <img src={asset.path} alt={asset.title} className="asset-thumb" />
                                        ) : (
                                            <video src={asset.path} className="asset-thumb" />
                                        )}
                                        <div className="selection-indicator">
                                            {selectedIds.includes(asset.id) ? (
                                                <CheckCircleFilled className="check-icon" />
                                            ) : (
                                                <div className="uncheck-circle" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="asset-info">
                                        <div className="asset-title" title={asset.title}>{asset.title || '未命名'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-container">
                            {loading ? <Spin size="large" /> : <Empty description="暂无资产" />}
                        </div>
                    )}
                    {loading && assets.length > 0 && (
                        <div className="loading-more">
                            <Spin />
                        </div>
                    )}
                </div>

                <div className="asset-picker-footer">
                    <div className="selection-info">
                        已选 {selectedIds.length} 张{activeTab === 'image' ? '图片' : '视频'}
                    </div>
                    <div className="footer-actions">
                        <Button onClick={onCancel}>取消</Button>
                        <Button 
                            type="primary" 
                            onClick={handleConfirm}
                            disabled={selectedIds.length === 0}
                            className="confirm-btn"
                        >
                            确认
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AssetPicker;
