import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, message,
  Row, Col, Typography, Space, Divider, Tooltip
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, TagOutlined, BookOutlined, ReloadOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
// 导入API接口函数，替换直接的axios调用
import {
  getMaterialLibraryList,
  getMaterialLibraryDetail,
  createMaterialLibrary,
  updateMaterialLibrary,
  deleteMaterialLibrary
} from '../api/materialLibrary';
import AIEOTiptapEditor from './AIEOTiptapEditor';

import '../styles/MaterialLibrary.css';
const { Title, Text } = Typography;
const { Option } = Select;

const MaterialLibrary = () => {
  // 状态管理
  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searchTitle, setSearchTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // 模态框状态
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);

  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 获取文案列表 - 使用API接口函数
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await getMaterialLibraryList({
        page,
        page_size: pageSize,
        title: searchTitle,
        tag: selectedTags
      });

      if (response.success) {
        setMaterials(response.data.materials || []);
        setTotal(response.data.total || 0);
      } else {
        message.error('获取文案列表失败');
      }
    } catch (error) {
      console.error('获取文案列表错误:', error);
      message.error('获取文案列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取所有标签（用于筛选）
  const fetchAllTags = async () => {
    try {
      // 从已有文案中提取标签
      const tagsSet = new Set();
      materials.forEach(material => {
        if (material.tags && material.tags.length > 0) {
          material.tags.forEach(tag => tagsSet.add(tag));
        }
      });
      setAllTags(Array.from(tagsSet));
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchAllTags();
  }, [materials]);

  // 监听筛选条件变化
  useEffect(() => {
    fetchMaterials();
  }, [page, pageSize, searchTitle, selectedTags]);

  // 创建文案 - 使用API接口函数
  const handleCreate = async (values) => {
    try {
      const response = await createMaterialLibrary({
        title: values.title,
        content: values.content,
        tags: values.tags || []
      });

      if (response.success) {
        message.success('文案创建成功');
        setIsCreateModalVisible(false);
        createForm.resetFields();
        fetchMaterials();
      } else {
        message.error('文案创建失败');
      }
    } catch (error) {
      console.error('创建文案错误:', error);
      message.error('文案创建失败，请稍后重试');
    }
  };

  // 更新文案 - 使用API接口函数
  const handleUpdate = async (values) => {
    if (!currentMaterial) return;

    try {
      const response = await updateMaterialLibrary(currentMaterial.id, {
        title: values.title,
        content: values.content,
        tags: values.tags || []
      });

      if (response.success) {
        message.success('文案更新成功');
        setIsEditModalVisible(false);
        editForm.resetFields();
        fetchMaterials();
      } else {
        message.error('文案更新失败');
      }
    } catch (error) {
      console.error('更新文案错误:', error);
      message.error('文案更新失败，请稍后重试');
    }
  };

  // 删除文案 - 使用API接口函数
  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个文案吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await deleteMaterialLibrary(id);

          if (response.success) {
            message.success('文案删除成功');
            fetchMaterials();
          } else {
            message.error('文案删除失败');
          }
        } catch (error) {
          console.error('删除文案错误:', error);
          message.error('文案删除失败，请稍后重试');
        }
      }
    });
  };

  // 查看文案详情 - 使用API接口函数
  const handleViewDetail = async (id) => {
    try {
      const response = await getMaterialLibraryDetail(id);

      if (response.success) {
        setCurrentMaterial(response.data);
        setIsDetailModalVisible(true);
      } else {
        message.error('获取文案详情失败');
      }
    } catch (error) {
      console.error('获取文案详情错误:', error);
      message.error('获取文案详情失败，请稍后重试');
    }
  };

  // 编辑文案
  const handleEdit = (record) => {
    setCurrentMaterial(record);
    editForm.setFieldsValue({
      title: record.title,
      content: record.content,
      tags: record.tags || []
    });
    setIsEditModalVisible(true);
  };

  // 重置筛选条件
  const handleResetFilters = () => {
    setSearchTitle('');
    setSelectedTags([]);
    setPage(1);
  };

  // 表格列配置
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => handleViewDetail(record.id)}>{text}</a>
      )
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 300,
      render: (text) => {
        // 简单处理Markdown，移除基本的Markdown语法，获取纯文本内容
        const plainText = text ? text
          .replace(/#{1,6}\s/g, '')  // 移除标题标记
          .replace(/\*\*(.*?)\*\*/g, '$1')  // 移除粗体标记
          .replace(/\*(.*?)\*/g, '$1')  // 移除斜体标记
          .replace(/\[(.*?)\]\((.*?)\)/g, '$1')  // 移除链接，保留文本
          .replace(/`{1,3}(.*?)`{1,3}/g, '$1')  // 移除代码块标记
          .replace(/\n/g, ' ')  // 将换行符替换为空格
          .trim() : '';

        // 限制显示长度
        const displayText = plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;

        return (
          <Tooltip title={plainText || '无内容'} placement="top">
            <span>{displayText || '无内容'}</span>
          </Tooltip>
        );
      }
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => (
        <>
          {tags && tags.length > 0 ? (
            tags.map((tag, index) => (
              <Tag key={index} color="blue">{tag}</Tag>
            ))
          ) : (
            <Text type="secondary">无标签</Text>
          )}
        </>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (timestamp) => {
        if (!timestamp) return '-';
        return new Date(timestamp * 1000).toLocaleString();
      }
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (timestamp) => {
        if (!timestamp) return '-';
        return new Date(timestamp * 1000).toLocaleString();
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* 头部已去除 */}

      <div className="page-content-card">
        {/* 筛选区域 */}
        <div className="filter-row">
          <Form layout="inline" style={{ width: '100%' }}>
            <Row gutter={[16, 16]} style={{ width: '100%', alignItems: 'center' }}>
              <Col>
                <Form.Item label="标签" className="filter-item">
                  <Select
                    mode="multiple"
                    placeholder="选择标签"
                    value={selectedTags}
                    onChange={setSelectedTags}
                    allowClear
                    style={{ width: 240 }}
                    className="custom-select-override"
                  >
                    {allTags.map(tag => (
                      <Option key={tag} value={tag}>{tag}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col>
                <Form.Item label="搜索" className="filter-item">
                  <Input
                    placeholder="搜索标题"
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    style={{ width: 220 }}
                    allowClear
                    className="custom-input"
                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  />
                </Form.Item>
              </Col>
              <Col>
                <Button
                  className="premium-btn premium-btn-outline"
                  icon={<ReloadOutlined />}
                  onClick={handleResetFilters}
                >
                  重置
                </Button>
              </Col>
              <Col style={{ flex: 1, textAlign: 'right' }}>
                <Button
                  type="primary"
                  className="premium-btn premium-btn-primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateModalVisible(true)}
                >
                  创建新文案
                </Button>
              </Col>
            </Row>
          </Form>
        </div>

        {/* 文案表格 */}
        <Table
          columns={columns}
          dataSource={materials}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          loading={loading}
          locale={{
            emptyText: '暂无文案数据'
          }}
        />
      </div>

      {/* 创建文案模态框 */}
      <Modal
        title="创建新文案"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={800}
        className="premium-modal"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入文案标题' }]}
          >
            <Input placeholder="请输入文案标题" className="custom-input" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="请输入标签，按回车确认"
              style={{ width: '100%' }}
              tokenSeparators={[',', ' ', '\n']}
              className="custom-select-override"
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="内容（Markdown格式）"
            rules={[{ required: true, message: '请输入文案内容' }]}
          >
            <AIEOTiptapEditor hideImage={false} placeholder="请输入文案内容，支持Markdown格式" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginBottom: 0 }}>
            <Button className="premium-btn premium-btn-outline" onClick={() => {
              setIsCreateModalVisible(false);
              createForm.resetFields();
            }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" className="premium-btn premium-btn-primary" style={{ marginLeft: '12px' }}>
              创建文案
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑文案模态框 */}
      <Modal
        title="编辑文案"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
        width={800}
        className="premium-modal"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入文案标题' }]}
          >
            <Input placeholder="请输入文案标题" className="custom-input" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="请输入标签，按回车确认"
              style={{ width: '100%' }}
              tokenSeparators={[',', ' ', '\n']}
              className="custom-select-override"
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="内容（Markdown格式）"
            rules={[{ required: true, message: '请输入文案内容' }]}
          >
            <AIEOTiptapEditor hideImage={false} placeholder="请输入文案内容，支持Markdown格式" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginBottom: 0 }}>
            <Button className="premium-btn premium-btn-outline" onClick={() => {
              setIsEditModalVisible(false);
              editForm.resetFields();
            }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" className="premium-btn premium-btn-primary" style={{ marginLeft: '12px' }}>
              更新文案
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 文案详情模态框 */}
      <Modal
        title="文案详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {currentMaterial && (
          <div>
            <Row gutter={16} style={{ marginBottom: '20px' }}>
              <Col span={24}>
                <Title level={5}>{currentMaterial.title}</Title>
              </Col>
              <Col span={24}>
                <Space>
                  {currentMaterial.tags && currentMaterial.tags.length > 0 && (
                    currentMaterial.tags.map((tag, index) => (
                      <Tag key={index} color="blue">{tag}</Tag>
                    ))
                  )}
                </Space>
              </Col>
              <Col span={24}>
                <Text type="secondary">
                  创建时间: {new Date(currentMaterial.created_at * 1000).toLocaleString()} |
                  更新时间: {new Date(currentMaterial.updated_at * 1000).toLocaleString()}
                </Text>
              </Col>
            </Row>

            <Divider />

            <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
              <ReactMarkdown>{currentMaterial.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MaterialLibrary;