import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { marked } from 'marked';
import { Modal, Input, Tooltip } from 'antd';
import AssetPicker from './AssetPicker';
import '../styles/AIEOTiptapEditor.css';

const htmlToMarkdown = (html) => {
    if (!html) return '';

    let md = html;

    // Headings
    md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');

    // Paragraphs
    md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');

    // Bold/Italic/Strike (just in case they exist, convert or strip)
    md = md.replace(/<strong>(.*?)<\/strong>|<b>(.*?)<\/b>/gi, '**$1$2**');
    md = md.replace(/<em>(.*?)<\/em>|<i>(.*?)<\/i>/gi, '*$1$2*');

    // Lists
    md = md.replace(/<ul>([\s\S]*?)<\/ul>/gi, (match, content) => {
        return content.replace(/<li>(.*?)<\/li>/gi, '- $1\n') + '\n';
    });
    md = md.replace(/<ol>([\s\S]*?)<\/ol>/gi, (match, content) => {
        let i = 1;
        return content.replace(/<li>(.*?)<\/li>/gi, () => `${i++}. $1\n`) + '\n';
    });
    
    // Images
    md = md.replace(/<img src="(.*?)".*?>/gi, '![]($1)');

    // Clean up
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/<[^>]+>/g, '');
    md = md.replace(/\n{3,}/g, '\n\n');

    return md.trim();
};

const AIEOTiptapEditor = ({ value, onChange, placeholder, hideImage = false }) => {
    const [headingDropdown, setHeadingDropdown] = useState(false);
    const [assetPickerVisible, setAssetPickerVisible] = useState(false);
    const headingDropdownRef = useRef(null);
    
    // Convert initial Markdown to HTML
    const generateInitialHtml = (markdown) => {
        if (!markdown) return '';
        let content = markdown.trim();
        return marked(content);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (headingDropdownRef.current && !headingDropdownRef.current.contains(event.target)) {
                setHeadingDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2] },
                bold: false,
                italic: false,
                strike: false,
                code: false,
                codeBlock: false,
                blockquote: false,
                horizontalRule: false,
            }),
            Placeholder.configure({
                placeholder: placeholder || '开始输入内容...',
            }),
            Image.configure({
                appendLink: false,
            }),
        ],
        content: generateInitialHtml(value),
        onUpdate: ({ editor }) => {
            const htmlContent = editor.getHTML();
            const markdownContent = htmlToMarkdown(htmlContent);
            if (onChange) {
                onChange(markdownContent);
            }
        },
    });
    
    // Update editor content when value changes externally (e.g. switching tabs)
    useEffect(() => {
        // Only update if it's vastly different or editor is empty and value isn't
        if (editor && value) {
            const curHTML = editor.getHTML();
            const curMD = htmlToMarkdown(curHTML);
            // Doing a rough update logic, can be optimized
            if (curMD !== value.trim()) {
                editor.commands.setContent(generateInitialHtml(value));
            }
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }
    

    return (
        <div className="aieo-tiptap-container custom-scroll">
            <div className="aieo-fixed-toolbar">
                <div className="menu-group" ref={headingDropdownRef}>
                    <Tooltip title="点击选择文本格式">
                        <button
                            className="menu-btn dropdown-btn"
                            onClick={() => setHeadingDropdown(!headingDropdown)}
                        >
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>文本格式</span>
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginLeft: 4 }}>
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
                        </div>
                    )}
                </div>
                
                <div className="divider" />
                
                <div className="menu-group">
                    <Tooltip title="无序列表">
                        <button onClick={() => { editor.chain().focus().toggleBulletList().run(); }} className={editor.isActive('bulletList') ? 'active' : ''}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M4 6h16M4 12h16M4 18h16M8 6h.01M8 12h.01M8 18h.01" strokeLinecap="round" strokeWidth="2"/>
                            </svg>
                            <span style={{marginLeft: 4}}>无序列表</span>
                        </button>
                    </Tooltip>
                    <Tooltip title="有序列表">
                        <button onClick={() => { editor.chain().focus().toggleOrderedList().run(); }} className={editor.isActive('orderedList') ? 'active' : ''}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M10 6h10M10 12h10M10 18h10M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" strokeWidth="2"/>
                            </svg>
                            <span style={{marginLeft: 4}}>有序列表</span>
                        </button>
                    </Tooltip>
                </div>
                
                {!hideImage && (
                    <>
                        <div className="divider" />
                        
                        <div className="menu-group">
                            <Tooltip title="插入图片">
                                <button onClick={() => setAssetPickerVisible(true)}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeWidth="2" />
                                    </svg>
                                    <span style={{marginLeft: 4}}>插入图片</span>
                                </button>
                            </Tooltip>
                        </div>
                    </>
                )}
            </div>
            <div className="editor-paper-inline">
                <EditorContent editor={editor} className="tiptap-editor-container" />
            </div>
            <AssetPicker
                visible={assetPickerVisible}
                onCancel={() => setAssetPickerVisible(false)}
                onSelect={(assets) => {
                    if (Array.isArray(assets)) {
                        assets.forEach(asset => {
                            if (asset.path) {
                                editor.chain().focus().setImage({ src: asset.path }).run();
                            }
                        });
                    } else if (assets && assets.path) {
                        editor.chain().focus().setImage({ src: assets.path }).run();
                    }
                }}
                type="image"
                multiple={true}
            />
        </div>
    );
};

export default AIEOTiptapEditor;
