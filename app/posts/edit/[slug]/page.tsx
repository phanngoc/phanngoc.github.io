'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PostEditor, { PostData } from '@/components/PostEditor';

export default function EditPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [initialData, setInitialData] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setError('Slug không hợp lệ');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/posts/get?slug=${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Lỗi khi tải post');
        }

        if (data.success && data.post) {
          setInitialData(data.post);
        } else {
          throw new Error('Không tìm thấy post');
        }
      } catch (err: any) {
        setError(err.message || 'Có lỗi xảy ra khi tải post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Đang tải post...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <a
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
          >
            Quay lại danh sách
          </a>
        </div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">Không tìm thấy post</div>
          <a
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
          >
            Quay lại danh sách
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full min-h-screen">
      <PostEditor initialData={initialData} />
    </main>
  );
}

