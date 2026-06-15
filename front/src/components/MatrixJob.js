import React, { useState, useEffect, useRef } from 'react';
import { message, Button, Tag } from 'antd';
import { 
    SyncOutlined, 
    RocketOutlined, 
    VideoCameraAddOutlined,
    GlobalOutlined,
    CloudSyncOutlined,
    SafetyCertificateOutlined,
    PlayCircleOutlined
} from '@ant-design/icons';
import { 
    getMatrixStats,
    getAIEOSendJob, 
    getWebsideInfos, 
    getVideoJobsWithPage, 
    updateVideoJobSendStatus,
    getWebsideLoginContext
} from '../api';
import { reportSendInfo } from "../api/aieoGenerate";
import useUserStore from "../stores/useUserStore";
import '../styles/MatrixJob.css';

const StatCard = ({ title, value, icon, color }) => (
    <div className="stat-summary-card">
        <div className="stat-content">
            <span className="stat-title">{title}</span>
            <span className="stat-value">{value}</span>
        </div>
        <div className={`stat-icon-wrapper ${color}`}>
            {icon}
        </div>
    </div>
);

const TaskMatrixCard = ({ title, subTitle, status, pending, stats, icon, color, actionText, onAction, actionIcon, disabled }) => (
    <div className="matrix-task-card">
        <div className="card-top">
            <div className={`task-icon ${color}`}>
                {icon}
            </div>
            <div className="task-titles">
                <span className="main-title">{title}</span>
                <span className="sub-title">{subTitle}</span>
            </div>
            <Tag color={status === 'ACTIVE' ? 'processing' : status === 'READY' ? 'success' : 'default'} className="status-tag">
                ● {status === 'ACTIVE' ? '执行中' : '待执行任务：'}{pending}
            </Tag>
        </div>
        
        <div className="task-stats-row">
            {stats.map((stat, idx) => (
                <div key={idx} className="task-stat-item">
                    <span className="task-stat-label">{stat.label}</span>
                    <span className="task-stat-value">{stat.value}</span>
                </div>
            ))}
        </div>

        <div className="card-actions">
            <Button 
                type="primary" 
                block 
                className={`launch-btn ${color} ${disabled ? 'disabled' : ''}`}
                onClick={onAction}
                icon={actionIcon}
                disabled={disabled}
            >
                {actionText}
            </Button>
        </div>
    </div>
);

const MatrixJob = () => {
    const user = useUserStore(state => state.user);
    const [stats, setStats] = useState({
        totalTasks: 0,
        totalSuccess: 0,
        totalRate: 0,
        imageStats: { total: 0, success: 0, rate: 0, pending: 0 },
        videoStats: { total: 0, success: 0, rate: 0, pending: 0 }
    });

    const [runningType, setRunningType] = useState(null); // 'image', 'video' or null
    const [taskInProgress, setTaskInProgress] = useState(false);
    const [websiteInfos, setWebsiteInfos] = useState([]);
    const [browserStatus, setBrowserStatus] = useState({
        isRunning: false,
        isMonitoring: false,
    });

    const abortControllerRef = useRef(null);
    const isProcessingRef = useRef(false);

    const SendCallback = async (event, data) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        try {
            console.log("data", data);
            let id = data["job_id"];
            await reportSendInfo(id, data);
            await fetchData();
        } catch (error) {
            console.error('发送失败:', error);
            message.error('发送失败');
        } finally {
            isProcessingRef.current = false;
        }
    };

    const SendVideoCallback = async (event, data) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        try {
            console.log("data", data);
            let id = data["job_id"];
            await updateVideoJobSendStatus(id, data);
            await fetchData();
        } catch (error) {
            console.error('发送失败:', error);
            message.error('发送失败');
        } finally {
            isProcessingRef.current = false;
        }
    };

    useEffect(() => {
        if (window && window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('send-event-browser-callback', SendCallback);
            ipcRenderer.on('send-video-event-browser-callback', SendVideoCallback);
            return () => {
                ipcRenderer.removeAllListeners('send-event-browser-callback');
                ipcRenderer.removeAllListeners('send-video-event-browser-callback');
            };
        }
    }, []);

    const updateBrowserStatus = async () => {
        try {
            if (window && window.require) {
                const { ipcRenderer } = window.require('electron');
                const status = await ipcRenderer.invoke('get-browser-status');
                setBrowserStatus(status);
            }
        } catch (error) {
            console.error('获取浏览器状态失败:', error);
        }
    };

    const fetchWebsiteInfos = async () => {
        try {
            const response = await getWebsideInfos();
            if (response.success) {
                setWebsiteInfos(response.data || []);
            }
        } catch (error) {
            console.error('获取网站信息失败:', error);
            message.error('获取可授权网站信息失败');
        }
    };

    const aieoJobProcess = async () => {
        if (!window || !window.require) return;
        const { ipcRenderer } = window.require('electron');
        const response = await getAIEOSendJob();

        if (abortControllerRef.current?.signal.aborted) return;
        if (!Array.isArray(response.data?.send_job_infos)) return;

        for (const item of response.data.send_job_infos) {
            for (const sendUserInfo of item.send_user_infos) {
                if (abortControllerRef.current?.signal.aborted) return;

                let allDone = true;
                for (const sendStatus of sendUserInfo.send_status) {
                    if (sendStatus.status === "Waiting" || sendStatus.status === "Failed") {
                        allDone = false;
                        break;
                    }
                }
                if (allDone) continue;

                const loginContext = await getWebsideLoginContext(sendUserInfo.website_login_context_id);
                const record = loginContext.data;

                let websiteInfo = websiteInfos.find(info => info.purpose === record.purpose && info.platform === record.platform);
                
                if (!websiteInfo) {
                    message.error(`未找到该平台的授权网页. purpose: ${record.purpose}, platform: ${record.platform}`);
                    return;
                }

                const type = (item.type || "article").toLowerCase();
                const normalizedType = type === "image" ? "article" : type;
                let launchType = `send_${normalizedType}`;

                console.log(`Launching task: ${launchType} for item ${item.id}`);

                let browserLaunch = {
                    launchType: launchType,
                    userId: "" + user.id,
                    websiteInfo,
                    browserContext: record.browser_context,
                    record,
                    sendItem: item,
                    sendUserInfo,
                    fingerprint: record.fingerprint,
                    proxy: record.proxy
                };

                const result = await ipcRenderer.invoke('launch-chrome', browserLaunch);
                if (result.success) {
                    await updateBrowserStatus();
                } else {
                    message.error(`浏览器启动失败: ${result.message}`);
                }
            }
        }
        await fetchData();
    };

    const videoJobProcess = async () => {
        if (!window || !window.require) return;
        const { ipcRenderer } = window.require('electron');
        const response = await getVideoJobsWithPage({
            page: 1,
            page_size: 1000,
            send_status: "Sending"
        });

        if (abortControllerRef.current?.signal.aborted) return;
        if (!Array.isArray(response.data?.video_jobs)) return;

        for (const item of response.data.video_jobs) {
            for (const sendUserInfo of item.send_infos) {
                if (abortControllerRef.current?.signal.aborted) return;
                if (sendUserInfo.status !== "Waiting" && sendUserInfo.status !== "Failed") continue;

                const loginContext = await getWebsideLoginContext(sendUserInfo.website_login_context_id);
                const record = loginContext.data;

                let websiteInfo = websiteInfos.find(info => info.purpose === record.purpose && info.platform === record.platform);

                if (!websiteInfo) {
                    message.error(`未找到该平台的授权网页. purpose: ${record.purpose}, platform: ${record.platform}`);
                    return;
                }

                let browserLaunch = {
                    launchType: "send_video",
                    userId: "" + user.id,
                    websiteInfo,
                    browserContext: record.browser_context,
                    record,
                    sendItem: item,
                    sendUserInfo,
                    fingerprint: record.fingerprint,
                    proxy: record.proxy
                };

                const result = await ipcRenderer.invoke('launch-chrome', browserLaunch);
                if (result.success) {
                    await updateBrowserStatus();
                } else {
                    message.error(`浏览器启动失败: ${result.message}`);
                }
            }
        }
        await fetchData();
    };

    const backgroundTask = async (type) => {
        if (taskInProgress) return;
        setTaskInProgress(true);
        abortControllerRef.current = new AbortController();

        try {
            message.info('后台任务正在执行...');
            if (type === "image") {
                await aieoJobProcess();
            } else if (type === "video") {
                await videoJobProcess();
            }
            message.info('后台任务执行完成');
        } catch (error) {
            if (error.name === 'AbortError') {
                message.info('后台任务已被取消');
            } else {
                console.error('后台任务执行失败:', error);
                message.error('后台任务执行失败');
            }
        } finally {
            setTaskInProgress(false);
            setRunningType(null);
        }
    };

    const fetchData = async () => {
        try {
            const res = await getMatrixStats();
            if (res.success) {
                const data = res.data;
                setStats({
                    totalTasks: data.total_tasks,
                    totalSuccess: data.total_success,
                    totalRate: data.total_rate.toFixed(1),
                    imageStats: { 
                        total: data.image_stats.total, 
                        success: data.image_stats.success, 
                        pending: data.image_stats.pending,
                        rate: data.image_stats.rate.toFixed(1) 
                    },
                    videoStats: { 
                        total: data.video_stats.total, 
                        success: data.video_stats.success, 
                        pending: data.video_stats.pending,
                        rate: data.video_stats.rate.toFixed(1) 
                    }
                });
            }
        } catch (error) {
            console.error('Fetch stats failed:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchWebsiteInfos();
        const timer = setInterval(fetchData, 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (runningType) {
            backgroundTask(runningType);
        } else {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [runningType]);

    const handleAction = (type) => {
        if (runningType === type) {
            setRunningType(null);
            message.success(`${type === 'image' ? '图文' : '视频'}任务已停止`);
        } else {
            setRunningType(type);
            message.success(`${type === 'image' ? '图文' : '视频'}任务已启动`);
        }
    };

    const getImageStatus = () => {
        if (runningType === 'image') return 'ACTIVE';
        return stats.imageStats.pending > 0 ? 'READY' : 'PAUSED';
    };

    const getVideoStatus = () => {
        if (runningType === 'video') return 'ACTIVE';
        return stats.videoStats.pending > 0 ? 'READY' : 'PAUSED';
    };

    return (
        <div className="workbench-dashboard">
            <div className="stats-summary-grid">
                <StatCard 
                    title="总任务数" 
                    value={stats.totalTasks} 
                    icon={<RocketOutlined />} 
                    color="orange"
                />
                <StatCard 
                    title="执行成功数" 
                    value={stats.totalSuccess.toLocaleString()} 
                    icon={<CloudSyncOutlined />} 
                    color="blue"
                />
                <StatCard 
                    title="成功率" 
                    value={`${stats.totalRate}%`} 
                    icon={<SafetyCertificateOutlined />} 
                    color="green"
                />
            </div>

            <div className="matrix-section">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">活跃任务矩阵</h2>
                        <p className="section-subtitle">管理并监控您的自动化 GEO 任务集群</p>
                    </div>
                </div>

                <div className="matrix-grid">
                    <TaskMatrixCard 
                        title="图文矩阵任务"
                        subTitle="Image Matrix Task"
                        status={getImageStatus()}
                        pending={stats.imageStats.pending}
                        icon={<GlobalOutlined />}
                        color="blue"
                        actionText={runningType === 'image' ? "停止任务" : "启动任务"}
                        actionIcon={runningType === 'image' ? <SyncOutlined spin /> : <PlayCircleOutlined />}
                        disabled={(runningType !== null && runningType !== 'image') || (runningType === null && stats.imageStats.pending === 0)}
                        stats={[
                            { label: '总任务数', value: stats.imageStats.total },
                            { label: '执行成功数', value: stats.imageStats.success },
                            { label: '成功率', value: `${stats.imageStats.rate}%` }
                        ]}
                        onAction={() => handleAction('image')}
                    />
                    <TaskMatrixCard 
                        title="短视频矩阵任务"
                        subTitle="Video Matrix Task"
                        status={getVideoStatus()}
                        pending={stats.videoStats.pending}
                        icon={<VideoCameraAddOutlined />}
                        color="orange"
                        actionText={runningType === 'video' ? "停止任务" : "启动任务"}
                        actionIcon={runningType === 'video' ? <SyncOutlined spin /> : <PlayCircleOutlined />}
                        disabled={(runningType !== null && runningType !== 'video') || (runningType === null && stats.videoStats.pending === 0)}
                        stats={[
                            { label: '总任务数', value: stats.videoStats.total },
                            { label: '执行成功数', value: stats.videoStats.success },
                            { label: '成功率', value: `${stats.videoStats.rate}%` }
                        ]}
                        onAction={() => handleAction('video')}
                    />
                </div>
            </div>
        </div>
    );
};

export default MatrixJob;