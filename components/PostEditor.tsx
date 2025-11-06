'use client';

import { useState, useEffect } from 'react';
import { slugify } from '@/lib/client-utils';

interface PostEditorProps {
  onSave?: (data: PostData) => void;
  onPublish?: (data: PostData) => void;
}

export interface PostData {
  title: string;
  content: string;
  slug: string;
  categories: string;
  tags: string;
  math: boolean;
}

export default function PostEditor({ onSave, onPublish }: PostEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState('');
  const [categories, setCategories] = useState('');
  const [tags, setTags] = useState('');
  const [math, setMath] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(slugify(title));
    }
  }, [title, autoSlug]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ title, content và slug' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/posts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          slug: slug.trim(),
          categories: categories.trim(),
          tags: tags.trim(),
          math,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi lưu post');
      }

      setMessage({ type: 'success', text: data.message || 'Post đã được lưu thành công' });
      
      if (onSave) {
        onSave({
          title: title.trim(),
          content: content.trim(),
          slug: slug.trim(),
          categories: categories.trim(),
          tags: tags.trim(),
          math,
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ title, content và slug' });
      return;
    }

    setIsPublishing(true);
    setMessage(null);

    try {
      // First save
      const saveResponse = await fetch('/api/posts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          slug: slug.trim(),
          categories: categories.trim(),
          tags: tags.trim(),
          math,
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Lỗi khi lưu post');
      }

      // Then publish
      const publishResponse = await fetch('/api/posts/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: saveData.filename,
          title: title.trim(),
        }),
      });

      const publishData = await publishResponse.json();

      if (!publishResponse.ok) {
        throw new Error(publishData.error || 'Lỗi khi publish post');
      }

      setMessage({ 
        type: 'success', 
        text: publishData.message || 'Post đã được publish thành công lên GitHub' 
      });

      if (onPublish) {
        onPublish({
          title: title.trim(),
          content: content.trim(),
          slug: slug.trim(),
          categories: categories.trim(),
          tags: tags.trim(),
          math,
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Jekyll Post Editor</h1>

      {message && (
        <div
          className={`p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tiêu đề bài viết"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-2">
            Slug <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setAutoSlug(false);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="url-friendly-slug"
            />
            <button
              type="button"
              onClick={() => {
                setAutoSlug(true);
                if (title) {
                  setSlug(slugify(title));
                }
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
            >
              Auto
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Slug sẽ được dùng để tạo tên file (YYYY-MM-DD-slug.md)
          </p>
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-2">
            Content (Markdown) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Viết nội dung bài viết bằng Markdown..."
          />
        </div>

        {/* Categories */}
        <div>
          <label htmlFor="categories" className="block text-sm font-medium mb-2">
            Categories (optional)
          </label>
          <input
            id="categories"
            type="text"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="machine-learning, llm, fine-tuning (phân cách bằng dấu phẩy)"
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium mb-2">
            Tags (optional)
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="LoRA, QLoRA, RLHF (phân cách bằng dấu phẩy)"
          />
        </div>

        {/* Math Support */}
        <div className="flex items-center">
          <input
            id="math"
            type="checkbox"
            checked={math}
            onChange={(e) => setMath(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="math" className="ml-2 text-sm font-medium">
            Enable Math Support (LaTeX)
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving || isPublishing}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isPublishing ? 'Đang publish...' : 'Lưu & Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

