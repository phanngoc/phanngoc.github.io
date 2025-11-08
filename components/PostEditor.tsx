'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugify } from '@/lib/client-utils';

// Image component for ReactMarkdown with error handling
function MarkdownImage(props: any) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Handle both absolute paths and relative paths
  const imageSrc = props.src || '';
  
  // Use useMemo to compute finalSrc and ensure it updates when src changes
  const finalSrc = useMemo(() => {
    if (!imageSrc) return '';
    
    // If it's already an absolute URL, use it as is
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      return imageSrc;
    }
    
    // For relative paths, ensure they start with /
    let normalizedPath = imageSrc.startsWith('/') ? imageSrc : `/${imageSrc}`;
    
    // Convert /assets/images/... to /api/images/... for Next.js preview
    // This allows the API route to serve the image dynamically
    if (normalizedPath.startsWith('/assets/images/')) {
      // Remove leading /assets/images/ and use API route
      const imagePath = normalizedPath.replace('/assets/images/', '');
      return `/api/images/${imagePath}`;
    }
    
    return normalizedPath;
  }, [imageSrc]);
  
  // Reset error and loading state when src changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [imageSrc]);
  
  const handleError = () => {
    setImageError(true);
    setImageLoading(false);
  };
  
  const handleLoad = () => {
    setImageLoading(false);
  };
  
  if (imageError) {
    return (
      <div className="my-2 p-4 bg-gray-100 border border-gray-300 rounded text-sm text-gray-600">
        <p className="font-medium">Image không thể tải</p>
        <p className="text-xs mt-1 text-gray-500">Path: {finalSrc}</p>
        <p className="text-xs mt-1 text-gray-400">Original: {imageSrc}</p>
      </div>
    );
  }
  
  return (
    <div className="my-2 relative">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <span className="text-xs text-gray-500">Đang tải...</span>
        </div>
      )}
      <img 
        {...props}
        src={finalSrc} 
        alt={props.alt || ''} 
        className="max-w-full h-auto rounded"
        onError={handleError}
        onLoad={handleLoad}
        key={finalSrc} // Force re-render when src changes
      />
    </div>
  );
}

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(slugify(title));
    }
  }, [title, autoSlug]);

  // Helper function to insert text at cursor position
  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = content.substring(0, start);
    const textAfter = content.substring(end);
    const newContent = textBefore + text + textAfter;
    
    setContent(newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Upload image and insert markdown link
  const uploadAndInsertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'File phải là hình ảnh' });
      return;
    }

    setIsUploadingImage(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use slug as subfolder if available, otherwise use a default folder
      if (slug.trim()) {
        formData.append('subfolder', slug.trim());
      }

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi upload image');
      }

      // Insert markdown image link at cursor position
      const imageMarkdown = `![${file.name}](${data.path})`;
      insertTextAtCursor(imageMarkdown);

      setMessage({ type: 'success', text: 'Image đã được upload và chèn vào editor' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng kéo thả file hình ảnh' });
      return;
    }

    // Upload first image (can be extended to handle multiple images)
    await uploadAndInsertImage(imageFiles[0]);
  };

  // Handle paste
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        await uploadAndInsertImage(file);
      }
    }
  };

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
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6 space-y-6">
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

          {/* Content Split View */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content (Markdown) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px] lg:h-[600px]">
              {/* Editor Panel */}
              <div 
                className={`flex flex-col border rounded-md overflow-hidden bg-white shadow-sm transition-colors ${
                  isDragging 
                    ? 'border-blue-500 border-2 bg-blue-50' 
                    : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-300 text-xs font-medium text-gray-700 flex items-center justify-between">
                  <span>Editor</span>
                  {isUploadingImage && (
                    <span className="text-blue-600 text-xs">Đang upload image...</span>
                  )}
                  {isDragging && (
                    <span className="text-blue-600 text-xs">Thả image vào đây</span>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={handlePaste}
                  className="flex-1 w-full px-4 py-2 border-0 rounded-md focus:outline-none focus:ring-0 font-mono text-sm resize-none"
                  placeholder="Viết nội dung bài viết bằng Markdown... (Có thể kéo thả hoặc paste image)"
                />
              </div>

              {/* Preview Panel */}
              <div className="flex flex-col border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm">
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-300 text-xs font-medium text-gray-700">
                  Preview
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 prose prose-sm prose-gray max-w-none">
                  {content ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: MarkdownImage,
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Preview sẽ hiển thị ở đây...</p>
                  )}
                </div>
              </div>
            </div>
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
    </div>
  );
}

