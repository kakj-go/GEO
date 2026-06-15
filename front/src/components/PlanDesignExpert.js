import React, { useState, useEffect, useRef } from 'react';
import '../styles/PlanDesignExpert.css';
import PlanDocumentEditor from './PlanDocumentEditor';
import { LLM_MODELS } from '../config/builtinModels';
import * as modelApi from '../api/model';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    createCopywritingSession, getCopywritingSessions, getCopywritingSession,
    deleteCopywritingSession, getCopywritingFilesBySession, updateCopywritingFile,
    deleteCopywritingFile, recoverCopywritingFile,
    copywritingChatStream
} from '../api/copywriting';
import { Modal, message, Tooltip, Input } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import { marked } from 'marked';
import useCompanyStore from '../stores/useCompanyStore';
import { getMaterialLibraryList } from '../api/materialLibrary';

const PlanDesignExpert = ({ setActiveSubMenu }) => {
    const [activeHistoryId, setActiveHistoryId] = useState(1);
    const [mode, setMode] = useState('quick'); // 'quick', 'think', or 'expert'
    const [showFileList, setShowFileList] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState(1);
    const [showReferenceDropdown, setShowReferenceDropdown] = useState(false);
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isDocumentVisible, setIsDocumentVisible] = useState(true);
    const [chatWidth, setChatWidth] = useState(50); // percentage
    const [isResizing, setIsResizing] = useState(false);

    // Model Selection State
    const [selectedModelId, setSelectedModelId] = useState('');
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    // Reference Materials State
    const [referenceItems, setReferenceItems] = useState([]); // { type: 'file'|'clipboard'|'material', name: string, content: string }
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [materialList, setMaterialList] = useState([]);
    const [materialLoading, setMaterialLoading] = useState(false);
    const [showClipboardModal, setShowClipboardModal] = useState(false);
    const [clipboardText, setClipboardText] = useState('');
    const fileInputRef = useRef(null);

    // Company Info from Store
    const company = useCompanyStore(state => state.company);

    const modelDropdownRef = useRef(null);
    const modeDropdownRef = useRef(null);
    const referenceDropdownRef = useRef(null);
    const fileListDropdownRef = useRef(null);
    const downloadDropdownRef = useRef(null);

    useEffect(() => {
        // Fetch default LLM model
        const fetchDefaultModel = async () => {
            try {
                const response = await modelApi.getAllBuiltinDefaults();
                if (response.data && response.data.llm) {
                    setSelectedModelId(response.data.llm);
                } else if (LLM_MODELS.length > 0) {
                    setSelectedModelId(LLM_MODELS[0].modelId);
                }
            } catch (error) {
                if (LLM_MODELS.length > 0) {
                    setSelectedModelId(LLM_MODELS[0].modelId);
                }
            }
        };
        fetchDefaultModel();
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
                setShowModelDropdown(false);
            }
            if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target)) {
                setShowModeDropdown(false);
            }
            if (referenceDropdownRef.current && !referenceDropdownRef.current.contains(event.target)) {
                setShowReferenceDropdown(false);
            }
            if (fileListDropdownRef.current && !fileListDropdownRef.current.contains(event.target)) {
                setShowFileList(false);
            }
            if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
                setShowDownloadDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedModelObj = LLM_MODELS.find(m => m.modelId === selectedModelId);

    // Check if current model supports thinking mode
    const checkSupportsThinking = (model) => {
        if (!model) return false;
        // Basic check for thinking capability based on name/id
        return model.modelId.toLowerCase().includes('think') ||
            model.displayName.toLowerCase().includes('think') ||
            model.description.includes('思考');
    };

    const supportsThinking = checkSupportsThinking(selectedModelObj);

    // If current mode is 'think' but model doesn't support it, switch to 'quick'
    useEffect(() => {
        if (mode === 'think' && !supportsThinking) {
            setMode('quick');
        }
    }, [supportsThinking, mode]);

    // Dynamic State Hooks
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(0);
    const [messages, setMessages] = useState([]);
    const [files, setFiles] = useState([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingGreeting, setStreamingGreeting] = useState('');
    const [streamingDocument, setStreamingDocument] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);

    // Fetch sessions on mount
    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const res = await getCopywritingSessions({ page: 1, page_size: 50 });
            if (res.success && res.data && res.data.sessions) {
                setSessions(res.data.sessions);
                if (res.data.sessions.length > 0) {
                    setCurrentSessionId(res.data.sessions[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to load sessions", error);
            message.error("加载会话列表失败");
        } finally {
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const loadSessionDetails = async (sessionId) => {
        try {
            const sessionRes = await getCopywritingSession(sessionId);
            if (sessionRes.success && sessionRes.data) {
                setMessages(sessionRes.data.messages || []);
                setMode(sessionRes.data.mode || 'quick');
                if (sessionRes.data.model_id) {
                    setSelectedModelId(sessionRes.data.model_id);
                }
            }

            const filesRes = await getCopywritingFilesBySession(sessionId);
            if (filesRes.success && filesRes.data) {
                setFiles(filesRes.data);
                // 自动选中第一个未删除的文件
                const firstActiveFile = filesRes.data.find(f => f.is_deleted !== 1);
                if (firstActiveFile) {
                    setSelectedDocId(firstActiveFile.id);
                } else {
                    setSelectedDocId(0);
                }
            }
        } catch (error) {
            console.error("Failed to load session details", error);
            message.error("加载对话详情失败");
        }
    };

    // Load session details and files when current session changes
    useEffect(() => {
        if (currentSessionId === 0) {
            setMessages([]);
            setFiles([]);
            setSelectedDocId(0);
            return;
        }

        // If we just created this session in handleSendMessage, we already have the state updated
        // and handleSendMessage will trigger the stream and subsequent refresh.
        // We only want to auto-load if we're switching TO an existing session from the sidebar.
        const activeSession = sessions.find(s => s.id === currentSessionId);
        if (activeSession && messages.length > 0 && messages[0].role === 'user' && !isStreaming) {
            // Likely switching back or already have optimistic state, but safe to reload
            loadSessionDetails(currentSessionId);
        } else if (messages.length === 0) {
            loadSessionDetails(currentSessionId);
        }
    }, [currentSessionId]);

    const activeHistory = sessions.find(item => item.id === currentSessionId);
    const currentDoc = files.find(f => f.id === selectedDocId);

    const splitContent = (content) => {
        if (!content) return { greeting: '', document: '' };
        // Split at first heading, ruler (---, ***, ___), or bold list item
        const splitPattern = /(^|\n)(?=#|\s*[-*_]{3,}\s*\n|(\d+\. )|\*\*)/;
        const match = content.match(splitPattern);

        if (match) {
            const splitIndex = match.index;
            const greeting = content.substring(0, splitIndex).trim();
            let document = content.substring(splitIndex).trim();

            // Strip leading rulers (---, ***, ___) if they exist at the beginning of the document part
            // LLM often does \n\n---\n\n# Document
            document = document.replace(/^([\s\n]*[-*_]{3,}\s*\n*)+/, '').trim();
            document = document.replace(/(\n*[-*_]{3,}\s*)+$/, '');

            if (document.length > 0) {
                return { greeting, document };
            }
        }

        let trimmed = content.trim();
        // Fallback for content that doesn't trigger the split regex but starts with doc indicators
        if (trimmed.startsWith('#') || /^[-*_]{3,}/.test(trimmed) || /^\d+\./.test(trimmed)) {
            // Check again for leading ruler in case it was at the very start
            let document = trimmed.replace(/^([\s\n]*[-*_]{3,}\s*\n*)+/, '').trim();
            return { greeting: '', document: document };
        }

        return { greeting: content, document: '' };
    };

    const extractTitleFromDoc = (doc) => {
        if (!doc) return '方案文档';
        const titleMatch = doc.match(/^#+ (.*)/m);
        if (titleMatch) return titleMatch[1].trim();
        const lineMatch = doc.split('\n').find(l => l.trim().length > 0);
        return lineMatch ? lineMatch.trim().substring(0, 50) : '方案文档';
    };

    // Chat input state
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);
    const docEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const scrollDocToBottom = () => {
        docEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    useEffect(() => {
        if (isStreaming && streamingDocument) {
            scrollDocToBottom();
        }
    }, [streamingDocument, isStreaming]);

    // Handle file upload for reference
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            setReferenceItems(prev => [...prev, { type: 'file', name: file.name, content }]);
            message.success(`已添加参考文件: ${file.name}`);
        };
        reader.onerror = () => {
            message.error('读取文件失败');
        };
        reader.readAsText(file);
        // Reset so same file can be selected again
        e.target.value = '';
    };

    // Handle clipboard text confirm
    const handleClipboardConfirm = () => {
        if (!clipboardText.trim()) {
            message.warning('请输入参考文本内容');
            return;
        }
        setReferenceItems(prev => [...prev, { type: 'clipboard', name: '粘贴板', content: clipboardText.trim() }]);
        setClipboardText('');
        setShowClipboardModal(false);
        message.success('已添加粘贴板参考内容');
    };

    // Open material library modal
    const handleOpenMaterialLibrary = async () => {
        setShowMaterialModal(true);
        setMaterialLoading(true);
        try {
            const res = await getMaterialLibraryList({ page: 1, page_size: 50 });
            if (res.success && res.data && res.data.materials) {
                setMaterialList(res.data.materials);
            } else {
                setMaterialList([]);
            }
        } catch (error) {
            console.error('Failed to load material library', error);
            message.error('加载文案库失败');
            setMaterialList([]);
        } finally {
            setMaterialLoading(false);
        }
    };

    // Select a material from library
    const handleSelectMaterial = (material) => {
        setReferenceItems(prev => [...prev, { type: 'material', name: material.title, content: material.content }]);
        setShowMaterialModal(false);
        message.success(`已添加文案参考: ${material.title}`);
    };

    // Remove a reference item
    const handleRemoveReference = (index) => {
        setReferenceItems(prev => prev.filter((_, i) => i !== index));
    };

    // Build company info block
    const buildCompanyInfo = () => {
        if (!company) return '';
        const companyParts = [];
        if (company.industry) {
            const industryMap = { hotel: '民宿/酒店', restaurant: '餐饮' };
            companyParts.push(`所属行业: ${industryMap[company.industry] || company.industry}`);
        }
        if (company.phone) companyParts.push(`联系方式: ${company.phone}`);
        if (company.brand_name) companyParts.push(`品牌名称: ${company.brand_name}`);
        if (company.brand_positioning) companyParts.push(`品牌定位: ${company.brand_positioning}`);
        if (company.region) {
            try {
                const regionArr = JSON.parse(company.region);
                if (Array.isArray(regionArr) && regionArr.length > 0) {
                    companyParts.push(`所在地区: ${regionArr.join(' ')}`);
                }
            } catch (e) {
                if (company.region) companyParts.push(`所在地区: ${company.region}`);
            }
        }
        if (company.address_detail) companyParts.push(`详细地址: ${company.address_detail}`);

        if (companyParts.length > 0) {
            return `【企业信息】\n${companyParts.join('\n')}`;
        }
        return '';
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isStreaming) return;

        const messageText = inputValue.trim();
        const companyInfoStr = buildCompanyInfo();
        // Capture current references to send, before clearing
        const itemsToSend = [...referenceItems];
        setInputValue('');

        // Optimistic UI update - show original message in chat
        const userMsg = { role: 'user', content: messageText, reference_items: itemsToSend };
        setMessages(prev => [...prev, userMsg]);
        setIsStreaming(true);
        setStreamingContent('');
        setStreamingGreeting('');
        setStreamingDocument('');

        // Clear reference items after sending
        setReferenceItems([]);

        let sessionIdToUse = currentSessionId;

        // Create new session if none exists
        if (sessionIdToUse === 0) {
            try {
                const res = await createCopywritingSession({
                    title: messageText.substring(0, 20) + (messageText.length > 20 ? '...' : ''),
                    model_id: selectedModelId,
                    mode: mode
                });
                if (res.success && res.data) {
                    sessionIdToUse = res.data.id;
                    setCurrentSessionId(sessionIdToUse);
                    // Add to local state immediately
                    setSessions(prev => [res.data, ...prev]);
                }
            } catch (error) {
                console.error("Failed to create session", error);
                message.error("创建新对话失败");
                setIsStreaming(false);
                return;
            }
        }

        // Connect to SSE stream
        let aiContent = '';
        let hasSplit = false;

        await copywritingChatStream(
            sessionIdToUse,
            messageText,
            selectedModelId,
            mode,
            companyInfoStr,
            itemsToSend,
            (chunk) => {
                if (chunk.type === 'content') {
                    aiContent += chunk.content;
                    setStreamingContent(aiContent);

                    // Use unified splitContent logic
                    const { greeting, document } = splitContent(aiContent);
                    setStreamingGreeting(greeting);
                    setStreamingDocument(document);

                    if (!hasSplit && document.length > 0) {
                        hasSplit = true;
                        setIsDocumentVisible(true);
                    }
                } else if (chunk.type === 'file_created' || chunk.type === 'file_updated') {
                    // Refresh files list if needed
                }
            },
            () => {
                // Done
                setIsStreaming(false);
                setStreamingContent('');
                setStreamingGreeting('');
                setStreamingDocument('');
                setIsDocumentVisible(true);
                // Refresh to get finalized messages and any new files
                loadSessionDetails(sessionIdToUse);
            },
            (error) => {
                setIsStreaming(false);
                setStreamingDocument('');
                message.error("生成回复失败: " + error.message);
                // Still refresh to get whatever context was saved
                loadSessionDetails(sessionIdToUse);
            }
        );
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleMouseDown = (e) => {
        setIsResizing(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            // Get the container's position and width
            const container = document.querySelector('.expert-workspace-main');
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            const availableWidth = containerRect.width;

            // Calculate relative X from the start of the workspace area
            const relativeX = e.clientX - containerRect.left;
            const newChatWidth = (relativeX / availableWidth) * 100;

            // Constrain width
            if (newChatWidth > 20 && newChatWidth < 80) {
                setChatWidth(newChatWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isSidebarVisible]);

    const handleDownloadMarkdown = () => {
        if (!currentDoc) return;
        const docContent = splitContent(currentDoc.content).document || currentDoc.content;
        const blob = new Blob([docContent], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, `${currentDoc.title || '方案文档'}.md`);
        setShowDownloadDropdown(false);
    };

    const handleDownloadWord = async () => {
        if (!currentDoc) return;
        try {
            const docContent = splitContent(currentDoc.content).document || currentDoc.content;
            const htmlContent = marked.parse(docContent);
            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${currentDoc.title || '方案文档'}</title>
                    <style>
                        body { font-family: 'Songti SC', 'SimSun', serif; }
                        h1, h2, h3 { color: #333; }
                        p { line-height: 1.6; }
                        table { border-collapse: collapse; width: 100%; }
                        th, td { border: 1px solid #ddd; padding: 8px; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `;
            const blob = await asBlob(fullHtml, {
                orientation: 'portrait',
                margins: { top: 720, right: 720, bottom: 720, left: 720 },
            });
            saveAs(blob, `${currentDoc.title || '方案文档'}.docx`);
        } catch (error) {
            console.error('Word download failed:', error);
            message.error('生成 Word 文档失败');
        } finally {
            setShowDownloadDropdown(false);
        }
    };

    return (
        <div className={`plan-design-expert ${isSidebarVisible ? 'sidebar-open' : 'sidebar-closed'} ${isResizing ? 'resizing' : ''}`}>
            {isEditing && (
                <PlanDocumentEditor
                    doc={currentDoc}
                    onBack={() => {
                        setIsEditing(false);
                        if (currentSessionId) {
                            loadSessionDetails(currentSessionId);
                        }
                    }}
                />
            )}
            {/* Left Sidebar */}
            <aside className="expert-sidebar">
                <div className="sidebar-header">
                    <Tooltip title="返回工作台">
                        <button className="back-btn" onClick={() => setActiveSubMenu('')}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                        </button>
                    </Tooltip>
                    <div className="expert-icon-wrapper">
                        <svg className="expert-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                    </div>
                    <span className="expert-title">运营方案专家</span>
                </div>

                <div className="new-chat-btn-container">
                    <button className="new-chat-btn" onClick={() => setCurrentSessionId(0)}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                        <span>新对话</span>
                    </button>
                </div>

                <nav className="history-list custom-scroll">
                    <p className="history-section-title">历史对话</p>
                    {sessions.map((item) => (
                        <div
                            key={item.id}
                            className={`history-item ${currentSessionId === item.id ? 'active' : ''}`}
                            onClick={() => setCurrentSessionId(item.id)}
                        >
                            <svg className="history-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                            <span className="history-text">{item.title}</span>

                            <button
                                className="history-delete-btn"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    Modal.confirm({
                                        title: '确认删除',
                                        icon: <ExclamationCircleOutlined />,
                                        content: '确定要删除这个会话吗？',
                                        okText: '确认',
                                        okType: 'danger',
                                        cancelText: '取消',
                                        onOk: async () => {
                                            try {
                                                await deleteCopywritingSession(item.id);
                                                message.success('已删除会话');
                                                fetchSessions();
                                                if (item.id === currentSessionId) {
                                                    setCurrentSessionId(0);
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                message.error('删除会话失败');
                                            }
                                        }
                                    });
                                }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}
                    {loadingSessions && <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>加载中...</div>}
                </nav>
            </aside>

            {/* Main Workspace Area (Chat + Doc) */}
            <div className="expert-workspace-main">
                {/* Middle Pane (Chat) */}
                <main className="chat-pane" style={{ width: isDocumentVisible ? `${chatWidth}%` : '100%' }}>
                    <header className="pane-header">
                        <div className="header-left-content">
                            <Tooltip title={isSidebarVisible ? "隐藏边栏" : "显示边栏"}>
                                <button
                                    className="sidebar-toggle-btn"
                                    onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                                >
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d={isSidebarVisible ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                    </svg>
                                </button>
                            </Tooltip>
                            <h2 className="header-subtitle">{activeHistory ? activeHistory.title : '新对话'}</h2>
                        </div>
                        <div className="header-right-actions" ref={fileListDropdownRef}>
                            <Tooltip title="会话文件列表">
                                <button
                                    className={`header-btn file-list-btn ${showFileList ? 'active' : ''}`}
                                    onClick={() => setShowFileList(!showFileList)}
                                >
                                    <svg className="file-list-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="2" />
                                        <path d="M7 8h10M7 12h10M7 16h6" strokeLinecap="round" strokeWidth="2" />
                                    </svg>
                                    <span className="file-count">{files.filter(f => f.is_deleted !== 1).length}</span>
                                </button>
                            </Tooltip>

                            {showFileList && (
                                <div className="file-list-dropdown">
                                    {files.map(doc => {
                                        const isDeleted = doc.is_deleted === 1;
                                        return (
                                            <div
                                                key={doc.id}
                                                className={`file-list-item ${selectedDocId === doc.id && !isDeleted ? 'active' : ''} ${isDeleted ? 'deleted' : ''}`}
                                                onClick={() => {
                                                    if (isDeleted) return;
                                                    setSelectedDocId(doc.id);
                                                    setIsDocumentVisible(true);
                                                    setShowFileList(false);
                                                }}
                                            >
                                                <div className="file-item-icon">
                                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="2" />
                                                        <path d="M7 8h10M7 12h10M7 16h6" strokeLinecap="round" strokeWidth="2" />
                                                    </svg>
                                                </div>
                                                <div className="file-item-info">
                                                    <div className="file-item-title">{doc.title}</div>
                                                    <div className="file-item-time">v{doc.version} · 创建时间：{new Date(doc.created_at).toLocaleTimeString()}</div>
                                                </div>
                                                {isDeleted ? (
                                                    <Tooltip title="恢复文件">
                                                        <button
                                                            className="file-item-action-btn recover-btn"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    await recoverCopywritingFile(doc.id);
                                                                    message.success('文件已恢复');
                                                                    loadSessionDetails(currentSessionId);
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    message.error('恢复文件失败');
                                                                }
                                                            }}
                                                        >
                                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.49 9A9 9 0 0 0 5.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 0 1 3.51 15" />
                                                            </svg>
                                                        </button>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="删除文件">
                                                        <button
                                                            className="file-item-action-btn delete-btn"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    await deleteCopywritingFile(doc.id);
                                                                    message.success('文件已删除');
                                                                    // 如果删除的是当前正在查看的文件，关闭右侧面板
                                                                    if (selectedDocId === doc.id) {
                                                                        setIsDocumentVisible(false);
                                                                        setSelectedDocId(0);
                                                                    }
                                                                    loadSessionDetails(currentSessionId);
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    message.error('删除文件失败');
                                                                }
                                                            }}
                                                        >
                                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {files.length === 0 && (
                                        <div style={{ padding: '15px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                                            暂无文件
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </header>

                    <div className="chat-messages custom-scroll">
                        {messages.length === 0 && !streamingContent && !isStreaming && (
                            <div className="chat-empty-state">
                                <svg width="40" height="40" fill="none" stroke="#e0e0e0" viewBox="0 0 24 24" style={{ marginBottom: '16px' }} xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                </svg>
                                <h3>新对话</h3>
                                <p>你好！我是方案设计专家。我可以帮你撰写企业策划、营销方案、商业研究等多种专业文档。请告诉我你的需求吧！</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => {
                            const { greeting, document } = msg.role === 'assistant' ? splitContent(msg.content) : { greeting: msg.content, document: '' };
                            return (
                                <div key={idx} className={msg.role === 'user' ? 'message-user' : 'message-ai-container'}>
                                    {msg.role === 'user' ? (
                                        <div className="user-message-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                            <div className="user-text-content">{msg.content}</div>
                                            {msg.reference_items && msg.reference_items.length > 0 && (
                                                <div className="reference-tags" style={{ padding: 0, justifyContent: 'flex-end', maxWidth: '100%' }}>
                                                    {msg.reference_items.map((item, idx) => (
                                                        <div key={idx} className={`reference-tag reference-tag-${item.type}`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                                                            <span className="tag-label">
                                                                {item.type === 'file' && (
                                                                    <>
                                                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                                                                        {item.name}
                                                                    </>
                                                                )}
                                                                {item.type === 'material' && (
                                                                    <>
                                                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                                                                        {item.name}
                                                                    </>
                                                                )}
                                                                {item.type === 'clipboard' && (
                                                                    <>
                                                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                                                                        粘贴板
                                                                    </>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="ai-bubble-wrapper">
                                                <div className="ai-avatar">
                                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                    </svg>
                                                </div>
                                                <div className="ai-bubble markdown-body">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{greeting || '正在为你撰写方案...'}</ReactMarkdown>
                                                </div>
                                            </div>

                                            {/* Look for linked file in this message response */}
                                            {document && (() => {
                                                const fileId = msg.file_id || msg.FileID;
                                                const linkedFile = files.find(f => f.id === fileId) || (fileId ? null : files.find(f => extractTitleFromDoc(f.content).includes(extractTitleFromDoc(document))));
                                                const isDeleted = linkedFile ? linkedFile.is_deleted === 1 : false;

                                                return (
                                                <div
                                                    className={`doc-preview-card ${isDeleted ? 'deleted' : 'active'}`}
                                                    onClick={() => {
                                                        if (isDeleted) return;
                                                        setIsDocumentVisible(true);
                                                        // If there's an associated file, we should select it
                                                        if (linkedFile) {
                                                            setSelectedDocId(linkedFile.id);
                                                        } else if (msg.file_id || msg.FileID) {
                                                            setSelectedDocId(msg.file_id || msg.FileID);
                                                        }
                                                    }}
                                                >
                                                    <div className="doc-card-content">
                                                        <div className="doc-icon-container">
                                                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                            </svg>
                                                        </div>
                                                        <div className="doc-info">
                                                            <h4 className="doc-name">{extractTitleFromDoc(document)}</h4>
                                                            <p className="doc-time">{idx === messages.length - 1 ? '最新版本' : '历史版本'}</p>
                                                        </div>
                                                    </div>
                                                    {isDeleted && (
                                                        <div className="doc-preview-recover-overlay">
                                                            <button
                                                                className="recover-btn"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        await recoverCopywritingFile(linkedFile.id);
                                                                        message.success('文件已恢复');
                                                                        loadSessionDetails(currentSessionId);
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        message.error('恢复文件失败');
                                                                    }
                                                                }}
                                                            >
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.49 9A9 9 0 0 0 5.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 0 1 3.51 15" />
                                                                </svg>
                                                                <span>恢复文件</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Streaming message */}
                        {isStreaming && (
                            <div className="message-ai-container">
                                <div className="ai-bubble-wrapper">
                                    <div className="ai-avatar">
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                        </svg>
                                    </div>
                                    <div className="ai-bubble markdown-body streaming">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{(streamingGreeting || '正在为你撰写方案...') + ' ▍'}</ReactMarkdown>
                                    </div>
                                </div>
                                {streamingDocument && (
                                    <div
                                        className={`doc-preview-card active`}
                                        onClick={() => setIsDocumentVisible(true)}
                                    >
                                        <div className="doc-card-content">
                                            <div className="doc-icon-container">
                                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                </svg>
                                            </div>
                                            <div className="doc-info">
                                                <h4 className="doc-name">{streamingDocument ? extractTitleFromDoc(streamingDocument) : '正在生成文档...'}</h4>
                                                <p className="doc-time">最新版本</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="input-area">
                        <div className="input-wrapper">
                            {/* Reference Tags */}
                            {referenceItems.length > 0 && (
                                <div className="reference-tags">
                                    {referenceItems.map((item, index) => (
                                        <div key={index} className={`reference-tag reference-tag-${item.type}`}>
                                            <span className="tag-label">
                                                {item.type === 'file' && (
                                                    <>
                                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                                                        文件: {item.name}
                                                    </>
                                                )}
                                                {item.type === 'material' && (
                                                    <>
                                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                                                        文案: {item.name}
                                                    </>
                                                )}
                                                {item.type === 'clipboard' && (
                                                    <>
                                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                                                        粘贴板
                                                    </>
                                                )}
                                            </span>
                                            <button className="tag-remove" onClick={() => handleRemoveReference(index)}>
                                                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <textarea
                                className="chat-input custom-scroll"
                                placeholder="输入主题和写作要求"
                                rows="2"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                                onPaste={(e) => {
                                    // Prevent image pasting
                                    const items = e.clipboardData.items;
                                    for (let i = 0; i < items.length; i++) {
                                        if (items[i].type.indexOf('image') !== -1) {
                                            e.preventDefault();
                                            message.warning("方案设计专家暂不支持图片输入，请使用纯文本留言。");
                                            return;
                                        }
                                    }
                                }}
                                disabled={isStreaming}
                            ></textarea>

                            <div className="input-toolbar">
                                <div className="mode-selector-container">
                                    {/* Model Selector Button */}
                                    <div className="model-selector-wrapper" ref={modelDropdownRef}>
                                        <button
                                            className={`mode-selector-btn ${showModelDropdown ? 'active' : ''}`}
                                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                                        >
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                            </svg>
                                            <span>{selectedModelObj ? selectedModelObj.displayName : '选择模型'}</span>
                                            <svg className={`chevron-icon ${showModelDropdown ? 'rotate-180' : ''}`} width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                            </svg>
                                        </button>

                                        {showModelDropdown && (
                                            <div className="model-dropdown-menu custom-scroll">
                                                {LLM_MODELS.map(model => (
                                                    <div
                                                        key={model.id}
                                                        className={`model-dropdown-item-simple ${selectedModelId === model.modelId ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setSelectedModelId(model.modelId);
                                                            setShowModelDropdown(false);
                                                        }}
                                                    >
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                        </svg>
                                                        <span className="model-name">{model.displayName}</span>
                                                        {selectedModelId === model.modelId && (
                                                            <svg className="check-icon-right" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                            </svg>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mode-selector-wrapper" ref={modeDropdownRef}>
                                        <button
                                            className={`mode-selector-btn ${showModeDropdown ? 'active' : ''}`}
                                            onClick={() => setShowModeDropdown(!showModeDropdown)}
                                        >
                                            {mode === 'quick' ? (
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                </svg>
                                            ) : (
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                </svg>
                                            )}
                                            <span>{mode === 'quick' ? '快速' : '思考'}</span>
                                            <svg className={`chevron-icon ${showModeDropdown ? 'rotate-180' : ''}`} width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                            </svg>
                                        </button>

                                        {showModeDropdown && (
                                            <div className="mode-dropdown">
                                                <div
                                                    className={`mode-dropdown-item ${mode === 'quick' ? 'selected' : ''}`}
                                                    onClick={() => { setMode('quick'); setShowModeDropdown(false); }}
                                                >
                                                    <div className="mode-item-icon">
                                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                        </svg>
                                                    </div>
                                                    <div className="mode-item-info">
                                                        <div className="mode-item-title">
                                                            <span>快速</span>
                                                            {mode === 'quick' && (
                                                                <svg className="check-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="mode-item-desc">适用于大部分情况</div>
                                                    </div>
                                                </div>
                                                <div
                                                    className={`mode-dropdown-item ${mode === 'think' ? 'selected' : ''} ${!supportsThinking ? 'disabled' : ''}`}
                                                    onClick={() => {
                                                        if (supportsThinking) {
                                                            setMode('think');
                                                            setShowModeDropdown(false);
                                                        }
                                                    }}
                                                    title={!supportsThinking ? '当前模型不支持思考模式' : ''}
                                                >
                                                    <div className="mode-item-icon">
                                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                        </svg>
                                                    </div>
                                                    <div className="mode-item-info">
                                                        <div className="mode-item-title">
                                                            <span>思考</span>
                                                            {mode === 'think' && (
                                                                <svg className="check-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="mode-item-desc">擅长解决更难的问题</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="reference-container" ref={referenceDropdownRef}>
                                    <button
                                        className={`toolbar-btn ${showReferenceDropdown ? 'active' : ''}`}
                                        onClick={() => setShowReferenceDropdown(!showReferenceDropdown)}
                                    >
                                        <svg className="rotate-45" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                        </svg>
                                        <span>参考资料</span>
                                    </button>

                                    {showReferenceDropdown && (
                                        <div className="reference-dropdown">
                                            <div className="reference-item" onClick={() => { setShowReferenceDropdown(false); fileInputRef.current?.click(); }}>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                </svg>
                                                <span>上传文件</span>
                                            </div>
                                            <div className="reference-item" onClick={() => { setShowReferenceDropdown(false); setShowClipboardModal(true); }}>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                </svg>
                                                <span>粘贴文本</span>
                                            </div>
                                            <div className="reference-item" onClick={() => { setShowReferenceDropdown(false); handleOpenMaterialLibrary(); }}>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                                </svg>
                                                <span>文案库</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="send-btn-wrapper">
                                <button className="send-btn" onClick={handleSendMessage} disabled={isStreaming || !inputValue.trim()}>
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Resizer Handle */}
                {isDocumentVisible && (
                    <div
                        className={`pane-resizer ${isResizing ? 'resizing' : ''}`}
                        onMouseDown={handleMouseDown}
                    >
                        <div className="resizer-line"></div>
                    </div>
                )}

                {/* Right Pane (Document Editor) */}
                {isDocumentVisible && (
                    <section className="document-pane" style={{ width: `${100 - chatWidth}%` }}>
                        <header className="pane-header">
                            <div className="editor-info">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                </svg>
                                <span>{isStreaming ? '正在生成...' : (currentDoc ? `修改于 ${new Date(currentDoc.updated_at).toLocaleTimeString()}` : '方案设计')}</span>
                            </div>

                            <div className="action-buttons-container">
                                {isStreaming && (
                                    <div className="writing-indicator">
                                        <div className="writing-dot"></div>
                                        <span>撰写中...</span>
                                    </div>
                                )}
                                <div className="action-buttons">
                                    <button
                                        className="action-btn"
                                        disabled={isStreaming || !currentDoc}
                                        onClick={() => {
                                            if (currentDoc) {
                                                const content = splitContent(currentDoc.content).document;
                                                navigator.clipboard.writeText(content)
                                                    .then(() => message.success('已复制到剪贴板'))
                                                    .catch(err => {
                                                        console.error('复制失败:', err);
                                                        message.error('复制失败');
                                                    });
                                            }
                                        }}
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                        </svg>
                                        <span>复制</span>
                                    </button>

                                    <div className="download-container" ref={downloadDropdownRef}>
                                        <button
                                            className={`action-btn ${showDownloadDropdown ? 'active' : ''}`}
                                            disabled={isStreaming || !currentDoc}
                                            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                                        >
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                            </svg>
                                            <span>下载</span>
                                        </button>

                                        {showDownloadDropdown && (
                                            <div className="download-dropdown">
                                                <div className="download-item" onClick={handleDownloadMarkdown}>
                                                    <div className="file-type-icon markdown">M</div>
                                                    <span>Markdown 文件</span>
                                                </div>
                                                <div className="download-item" onClick={handleDownloadWord}>
                                                    <div className="file-type-icon word">W</div>
                                                    <span>Word 文档 (.docx)</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="action-btn primary"
                                        disabled={isStreaming || !currentDoc}
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                        </svg>
                                        <span>快速编辑</span>
                                    </button>
                                    <div className="divider"></div>
                                    <button className="close-btn" onClick={() => setIsDocumentVisible(false)}>
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </header>

                        <article className="document-article custom-scroll">
                            {(isStreaming && streamingDocument) || (!isStreaming && currentDoc) ? (
                                <div className="article-container markdown-body" style={{ padding: '40px' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {(() => {
                                            if (isStreaming) return streamingDocument;
                                            if (!currentDoc) return '';
                                            const parts = splitContent(currentDoc.content);
                                            // If it's a saved file, and splitContent didn't find a document part,
                                            // it's likely already a document or doesn't follow the pattern. 
                                            // We should show the full content.
                                            return parts.document || parts.greeting;
                                        })()}
                                    </ReactMarkdown>
                                    <div ref={docEndRef} />
                                </div>
                            ) : (
                                <div className="article-empty">
                                    {isStreaming ? (
                                        <div className="streaming-loading-state">
                                            <div className="loading-shimmer-title"></div>
                                            <div className="loading-shimmer-line"></div>
                                            <div className="loading-shimmer-line"></div>
                                            <div className="loading-shimmer-line short"></div>
                                            <p>正在努力为您构思方案...</p>
                                        </div>
                                    ) : '请选择左侧文档以预览'}
                                </div>
                            )}
                        </article>
                    </section>
                )}
            </div>

            {/* Hidden file input for reference upload */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".txt,.md,.csv,.json,.xml,.html,.log,.doc,.docx,.pdf"
                onChange={handleFileUpload}
            />

            {/* Clipboard Text Modal */}
            <Modal
                title="粘贴参考文本"
                open={showClipboardModal}
                onOk={handleClipboardConfirm}
                onCancel={() => { setShowClipboardModal(false); setClipboardText(''); }}
                okText="确认添加"
                cancelText="取消"
                width={560}
            >
                <p style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>请粘贴或输入需要作为参考的文本内容：</p>
                <Input.TextArea
                    value={clipboardText}
                    onChange={(e) => setClipboardText(e.target.value)}
                    placeholder="在此粘贴参考文本..."
                    rows={8}
                    style={{ resize: 'vertical' }}
                />
            </Modal>

            {/* Material Library Modal */}
            <Modal
                title="选择参考文案"
                open={showMaterialModal}
                onCancel={() => setShowMaterialModal(false)}
                footer={null}
                width={640}
            >
                {materialLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>加载中...</div>
                ) : materialList.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>暂无文案素材</div>
                ) : (
                    <div className="material-list">
                        {materialList.map((material) => (
                            <div
                                key={material.id}
                                className="material-item"
                                onClick={() => handleSelectMaterial(material)}
                            >
                                <div className="material-item-icon">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                    </svg>
                                </div>
                                <div className="material-item-info">
                                    <div className="material-item-title">{material.title}</div>
                                    <div className="material-item-preview">
                                        {material.content ? material.content.substring(0, 80) + (material.content.length > 80 ? '...' : '') : '无内容'}
                                    </div>
                                    {material.tags && material.tags.length > 0 && (
                                        <div className="material-item-tags">
                                            {material.tags.map((tag, i) => (
                                                <span key={i} className="material-tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div >
    );
};

export default PlanDesignExpert;
