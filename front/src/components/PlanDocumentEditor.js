import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import '../styles/PlanDocumentEditor.css';

import { updateCopywritingFile } from '../api/copywriting';
import { marked } from 'marked';
import { Tooltip, message, Modal, Input } from 'antd';
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';

// Simple HTML to Markdown converter for TipTap StarterKit nodes
const htmlToMarkdown = (html) => {
    if (!html) return '';

    let md = html;

    // Headings
    md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n');

    // Paragraphs
    md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');

    // Bold/Italic/Underline
    md = md.replace(/<strong>(.*?)<\/strong>|<b>(.*?)<\/b>/gi, '**$1$2**');
    md = md.replace(/<em>(.*?)<\/em>|<i>(.*?)<\/i>/gi, '*$1$2*');
    md = md.replace(/<u>(.*?)<\/u>/gi, '$1'); // Markdown doesn't support underline natively, stripping it

    // Lists
    md = md.replace(/<ul>([\s\S]*?)<\/ul>/gi, (match, content) => {
        return content.replace(/<li>(.*?)<\/li>/gi, '- $1\n') + '\n';
    });
    md = md.replace(/<ol>([\s\S]*?)<\/ol>/gi, (match, content) => {
        let i = 1;
        return content.replace(/<li>(.*?)<\/li>/gi, () => `${i++}. $1\n`) + '\n';
    });

    // Task Lists
    md = md.replace(/<ul data-type="taskList">([\s\S]*?)<\/ul>/gi, (match, content) => {
        return content.replace(/<li data-checked="(true|false)">(.*?)<\/li>/gi, (m, checked, c) => {
            return `- [${checked === 'true' ? 'x' : ' '}] ${c}\n`;
        }) + '\n';
    });

    // Links
    md = md.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)');

    // Blockquotes
    md = md.replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n');

    // Code
    md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
    md = md.replace(/<pre>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n\n');

    // Horizontal Rule
    md = md.replace(/<hr \/>|<hr>/gi, '---\n\n');

    // Clean up
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&amp;/g, '&');

    // Remove remaining tags
    md = md.replace(/<[^>]+>/g, '');

    // Trim multiple newlines
    md = md.replace(/\n{3,}/g, '\n\n');

    // Trim and take as final string for regex cleaning
    md = md.trim();

    // Remove leading and trailing horizontal rules that are often artifacts
    md = md.replace(/^\s*---+\s*\n*/, '');
    md = md.replace(/\n*\s*---+\s*$/, '');

    return md.trim();
};

const PlanDocumentEditor = ({ doc, onBack }) => {
    const [activeOutlineId, setActiveOutlineId] = useState(null);
    const [isSaved, setIsSaved] = useState(true);
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [headings, setHeadings] = useState([]);
    const [isOutlineVisible, setIsOutlineVisible] = useState(true);
    const downloadDropdownRef = useRef(null);
    const headingDropdownRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
                setShowDownloadDropdown(false);
            }
            if (headingDropdownRef.current && !headingDropdownRef.current.contains(event.target)) {
                setHeadingDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial content generation from markdown
    const generateInitialHtml = (doc) => {
        if (!doc || !doc.content) return '';

        let content = doc.content.trim();
        // Strip leading and trailing rulers (---, ***, ___)
        content = content.replace(/^([\s\n]*[-*_]{3,}\s*\n*)+/, '').trim();
        content = content.replace(/(\n*[-*_]{3,}\s*)+$/, '');

        // Convert Markdown to HTML for TipTap
        return marked(content.trim());
    };

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: '开始输入内容...',
            }),
            Link.configure({
                openOnClick: false,
            }),
            Underline,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
        ],
        content: generateInitialHtml(doc),
        onUpdate: ({ editor }) => {
            setIsSaved(false);
            // Debounce save (e.g. 2s)
            if (window.saveTimeout) {
                clearTimeout(window.saveTimeout);
            }
            window.saveTimeout = setTimeout(async () => {
                if (!doc || !doc.id) return;
                try {
                    setIsSaving(true);
                    const htmlContent = editor.getHTML();
                    const markdownContent = htmlToMarkdown(htmlContent);

                    // Call update API
                    await updateCopywritingFile(doc.id, {
                        content: markdownContent
                    });
                    message.success("已自动保存文档");

                    setIsSaved(true);
                } catch (error) {
                    console.error('Failed to save document:', error);
                } finally {
                    setIsSaving(false);
                }
            }, 2000);

            // Update headings for TOC
            const extractedHeadings = [];
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    extractedHeadings.push({
                        level: node.attrs.level,
                        text: node.textContent,
                        pos: pos,
                        id: `heading-${pos}`
                    });
                }
            });
            setHeadings(extractedHeadings);
        },
    });

    // Initial headings extraction
    useEffect(() => {
        if (editor) {
            const extractedHeadings = [];
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    extractedHeadings.push({
                        level: node.attrs.level,
                        text: node.textContent,
                        pos: pos,
                        id: `heading-${pos}`
                    });
                }
            });
            setHeadings(extractedHeadings);
        }
    }, [editor]);

    const [headingDropdown, setHeadingDropdown] = useState(false);

    const handleDownloadMarkdown = () => {
        if (!editor || !doc) return;
        const htmlContent = editor.getHTML();
        const markdownContent = htmlToMarkdown(htmlContent);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, `${doc.title || '方案文档'}.md`);
        setShowDownloadDropdown(false);
    };

    const handleDownloadWord = async () => {
        if (!editor || !doc) return;
        try {
            setIsSaving(true);
            const htmlContent = editor.getHTML();
            // html-docx-js-typescript needs a full HTML document with body
            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${doc.title || '方案文档'}</title>
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
            saveAs(blob, `${doc.title || '方案文档'}.docx`);
        } catch (error) {
            console.error('Word download failed:', error);
            message.error('生成 Word 文档失败');
        } finally {
            setIsSaving(false);
            setShowDownloadDropdown(false);
        }
    };

    if (!editor) {
        return null;
    }




    return (
        <div className="plan-document-editor-workspace">
            {/* Header */}
            <header className="editor-workspace-header">
                <div className="header-left">
                    <div className="save-status">
                        {isSaved ? (
                            <><span className="check-dot">✓</span> 已保存</>
                        ) : (
                            <><span className="sync-dot">●</span> 正在保存...</>
                        )}
                    </div>
                </div>
                <div className="header-center">
                    <button className="history-btn" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M3 10h10a5 5 0 010 10H11M3 10l4-4m-4 4l4 4" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                    </button>
                    <button className="history-btn" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M21 10h-10a5 5 0 000 10h2M21 10l-4-4m4 4l-4 4" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                    </button>
                    <div className="divider" />
                    <button
                        className="action-btn"
                        onClick={() => {
                            if (editor) {
                                navigator.clipboard.writeText(editor.getText())
                                    .then(() => message.success('已复制到剪贴板！'))
                                    .catch(err => console.error('复制失败:', err));
                            }
                        }}
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                        <span>复制</span>
                    </button>
                    <div className="download-container" ref={downloadDropdownRef}>
                        <button
                            className={`action-btn ${showDownloadDropdown ? 'active' : ''}`}
                            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeWidth="2" />
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
                </div>
                <div className="header-right">
                    <div className="divider" />
                    <button className="close-workspace-btn" onClick={onBack}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                    </button>
                </div>
            </header>

            <div className="workspace-container">
                {/* Outline Sidebar */}
                <aside className={`outline-sidebar ${!isOutlineVisible ? 'collapsed' : ''}`}>
                    <Tooltip title={isOutlineVisible ? "收起目录" : "展开目录"}>
                        <div className="sidebar-collapse-btn" onClick={() => setIsOutlineVisible(!isOutlineVisible)}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isOutlineVisible ? (
                                    <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" strokeLinecap="round" strokeWidth="2" />
                                ) : (
                                    <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeLinecap="round" strokeWidth="2" />
                                )}
                            </svg>
                        </div>
                    </Tooltip>
                    {isOutlineVisible && (
                        <nav className="outline-nav">
                            {headings.length > 0 ? (
                                headings.map(item => (
                                    <div
                                        key={item.id}
                                        className={`outline-item level-${item.level} ${activeOutlineId === item.id ? 'active' : ''}`}
                                        onClick={() => {
                                            editor.chain().focus().setTextSelection(item.pos).scrollIntoView().run();
                                            setActiveOutlineId(item.id);
                                        }}
                                    >
                                        <span className="item-text">{item.text || '无标题'}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="outline-empty">无章节结构</div>
                            )}
                        </nav>
                    )}
                </aside>

                {/* Editor Content */}
                <main className="editor-main-content">
                    <div className="editor-paper custom-scroll">
                        <BubbleMenu 
                            editor={editor} 
                            tippyOptions={{ duration: 100, interactive: true, zIndex: 9999 }} 
                            className="bubble-menu"
                        >
                            <div className="bubble-menu-content">
                                <div className="menu-group" ref={headingDropdownRef}>
                                    <Tooltip title="文本格式">
                                        <button
                                            className="menu-btn dropdown-btn"
                                            onClick={() => setHeadingDropdown(!headingDropdown)}
                                        >
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" strokeWidth="2" />
                                            </svg>
                                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeWidth="2" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                    {headingDropdown && (
                                        <div className="heading-dropdown">
                                            <button onClick={() => { editor.chain().focus().setParagraph().run(); setHeadingDropdown(false); }} className={editor.isActive('paragraph') ? 'active' : ''}>
                                                <span className="icon">T</span> 正文
                                            </button>
                                            <button onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setHeadingDropdown(false); }} className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}>
                                                <span className="icon">H1</span> 一级标题
                                            </button>
                                            <button onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setHeadingDropdown(false); }} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}>
                                                <span className="icon">H2</span> 二级标题
                                            </button>
                                            <button onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setHeadingDropdown(false); }} className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}>
                                                <span className="icon">H3</span> 三级标题
                                            </button>
                                            <div className="divider" />
                                            <button onClick={() => { editor.chain().focus().toggleBulletList().run(); setHeadingDropdown(false); }} className={editor.isActive('bulletList') ? 'active' : ''}>
                                                <span className="icon">UL</span> 无序列表
                                            </button>
                                            <button onClick={() => { editor.chain().focus().toggleOrderedList().run(); setHeadingDropdown(false); }} className={editor.isActive('orderedList') ? 'active' : ''}>
                                                <span className="icon">OL</span> 有序列表
                                            </button>
                                            <button onClick={() => { editor.chain().focus().toggleTaskList().run(); setHeadingDropdown(false); }} className={editor.isActive('taskList') ? 'active' : ''}>
                                                <span className="icon">TL</span> 任务列表
                                            </button>
                                            <button onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setHeadingDropdown(false); }} className={editor.isActive('codeBlock') ? 'active' : ''}>
                                                <span className="icon">CB</span> 代码块
                                            </button>
                                            <button onClick={() => { editor.chain().focus().toggleBlockquote().run(); setHeadingDropdown(false); }} className={editor.isActive('blockquote') ? 'active' : ''}>
                                                <span className="icon">BQ</span> 引用
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="divider" />

                                <div className="menu-group">
                                    <Tooltip title="加粗">
                                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}>
                                            B
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="删除线">
                                        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''}>
                                            S
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="斜体">
                                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}>
                                            I
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="下划线">
                                        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''}>
                                            U
                                        </button>
                                    </Tooltip>
                                </div>

                                <div className="divider" />

                                <div className="menu-group">
                                    <Tooltip title="插入链接">
                                        <button onClick={() => {
                                            let urlValue = '';
                                            Modal.confirm({
                                                title: '插入链接',
                                                icon: null,
                                                content: (
                                                    <Input 
                                                        placeholder="请输入链接 URL" 
                                                        autoFocus
                                                        onChange={(e) => urlValue = e.target.value}
                                                        onPressEnter={() => {
                                                            Modal.destroyAll();
                                                            if (urlValue) {
                                                                editor.chain().focus().setLink({ href: urlValue }).run();
                                                            }
                                                        }}
                                                    />
                                                ),
                                                onOk() {
                                                    if (urlValue) {
                                                        editor.chain().focus().setLink({ href: urlValue }).run();
                                                    }
                                                }
                                            });
                                        }} className={editor.isActive('link') ? 'active' : ''}>
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" strokeLinecap="round" strokeWidth="2" />
                                                <path d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 11-5.656-5.656l-1.101 1.102" strokeLinecap="round" strokeWidth="2" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="行内代码">
                                        <button onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'active' : ''}>
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeWidth="2" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="背景高亮">
                                        <button
                                            className="color-btn"
                                            onClick={() => editor.chain().focus().toggleHighlight({ color: '#fde047' }).run()}
                                            style={{ backgroundColor: editor.isActive('highlight') ? '#fef08a' : 'transparent' }}
                                        >
                                            A
                                        </button>
                                    </Tooltip>
                                </div>

                                <div className="divider" />

                                <div className="menu-group">
                                    <Tooltip title="复制所选">
                                        <button 
                                            className="icon-btn"
                                            onClick={() => {
                                                if (editor) {
                                                    const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
                                                    navigator.clipboard.writeText(text)
                                                        .then(() => message.success('已复制所选内容'))
                                                        .catch(err => console.error('复制失败:', err));
                                                }
                                            }}
                                        >
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1" strokeLinecap="round" strokeWidth="2" />
                                                <path d="M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" strokeLinecap="round" strokeWidth="2" />
                                            </svg>
                                            <span>复制</span>
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </BubbleMenu>
                        <EditorContent editor={editor} className="tiptap-editor-container" />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PlanDocumentEditor;
