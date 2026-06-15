import React, { useState, useEffect } from 'react';
import {
    getCopywritingFiles,
    getCopywritingFile
} from '../api/copywriting';
import { message, Tooltip, Tag, Input } from 'antd';
import {
    CopyOutlined,
    DownloadOutlined,
    EditOutlined,
    MoreOutlined,
    ShareAltOutlined,
    FileTextOutlined,
    SearchOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PlanDocumentEditor from './PlanDocumentEditor';
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import { marked } from 'marked';
import '../styles/CopywritingLibrary.css'; // Reusing premium styles

const PlanLibrary = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [currentFile, setCurrentFile] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
    const downloadDropdownRef = React.useRef(null);

    // Fetch list with search
    useEffect(() => {
        fetchFiles();
    }, [searchText]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
                setShowDownloadDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await getCopywritingFiles({
                page: 1,
                page_size: 100,
                title: searchText
            });
            if (res.success) {
                const list = res.data.files || [];
                setFiles(list);
                if (list.length > 0 && !selectedId) {
                    setSelectedId(list[0].id);
                }
            } else {
                message.error('获取方案列表失败');
            }
        } catch (error) {
            console.error('Fetch files error:', error);
            message.error('获取方案列表出错');
        } finally {
            setLoading(false);
        }
    };

    // Fetch file detail when selectedId changes
    useEffect(() => {
        if (selectedId) {
            fetchDetail(selectedId);
        }
    }, [selectedId]);

    const fetchDetail = async (id) => {
        setDetailLoading(true);
        try {
            const res = await getCopywritingFile(id);
            if (res.success) {
                setCurrentFile(res.data);
            }
        } catch (error) {
            console.error('Fetch detail error:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCopy = () => {
        if (currentFile) {
            navigator.clipboard.writeText(currentFile.content);
            message.success('已复制到剪贴板');
        }
    };

    const handleDownloadMarkdown = () => {
        if (!currentFile) return;
        const blob = new Blob([currentFile.content], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, `${currentFile.title || '方案文档'}.md`);
        setShowDownloadDropdown(false);
    };

    const handleDownloadWord = async () => {
        if (!currentFile) return;
        try {
            const htmlContent = marked.parse(currentFile.content);
            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${currentFile.title || '方案文档'}</title>
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
            saveAs(blob, `${currentFile.title || '方案文档'}.docx`);
        } catch (error) {
            console.error('Word download failed:', error);
            message.error('生成 Word 文档失败');
        } finally {
            setShowDownloadDropdown(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    return (
        <div className="lib-page-container">
            {/* Left Sidebar: Card List */}
            <aside className="lib-sidebar custom-scroll">
                <div className="lib-search-box">
                    <Input
                        placeholder="搜索文件..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                        className="lib-search-input"
                    />
                </div>
                {files.map(item => (
                    <div
                        key={item.id}
                        className={`lib-item-card ${selectedId === item.id ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedId(item.id);
                            setIsEditing(false); // Reset editing when switching files
                        }}
                    >
                        <div className="lib-item-icon">
                            <FileTextOutlined />
                        </div>
                        <div className="lib-item-info">
                            <Tooltip title={item.title} placement="right">
                                <h4 className="lib-item-title">{item.title}</h4>
                            </Tooltip>
                            <div className="lib-item-meta">
                                <span className="card-date">{formatDate(item.created_at)}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {files.length === 0 && !loading && (
                    <div className="empty-state">暂无方案</div>
                )}
                {loading && <div className="loading-state">加载中...</div>}
            </aside>

            {/* Right Pane: Document Viewer */}
            <main className="lib-viewer-main custom-scroll">
                {isEditing && currentFile ? (
                    <PlanDocumentEditor
                        doc={currentFile}
                        onBack={() => {
                            setIsEditing(false);
                            fetchDetail(selectedId); // Refresh detail after editing
                        }}
                    />
                ) : currentFile ? (
                    <div className="lib-viewer-content">
                        <header className="lib-viewer-header">
                            <div className="lib-header-actions">
                                <button className="lib-action-btn" onClick={handleCopy}>
                                    <CopyOutlined /> <span>复制</span>
                                </button>

                                <div className="download-container" ref={downloadDropdownRef}>
                                    <button
                                        className={`lib-action-btn ${showDownloadDropdown ? 'active' : ''}`}
                                        onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                                    >
                                        <DownloadOutlined /> <span>下载</span>
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
                                    className="lib-action-btn quick-edit"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <EditOutlined /> <span>快速编辑</span>
                                </button>
                            </div>
                        </header>

                        <article className="lib-doc-body">
                            <div className="lib-doc-tag">EXPERT PROPOSAL</div>
                            <h1 className="lib-doc-headline">{currentFile.title}</h1>

                            <div className="lib-markdown-render">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {currentFile.content}
                                </ReactMarkdown>
                            </div>
                        </article>
                    </div>
                ) : (
                    <div className="lib-viewer-placeholder">
                        {detailLoading ? '加载中...' : '选择一个方案查看详情'}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PlanLibrary;
