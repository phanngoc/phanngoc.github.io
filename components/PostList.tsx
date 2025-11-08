'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Post {
  filename: string;
  slug: string;
  title: string;
  date: string;
  categories: string[];
  tags: string[];
  math: boolean;
}

interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function PostList() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchPosts = async (pageNum: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/list?page=${pageNum}&limit=30`);
      const data: PostListResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi tải danh sách posts');
      }

      setPosts(data.posts);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tải danh sách posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const handlePostClick = (slug: string) => {
    router.push(`/posts/edit/${slug}`);
  };

  const handleNewPost = () => {
    router.push('/posts/new');
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.trim() === '') {
      return 'Không có ngày';
    }

    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Try to parse date from filename format or other formats
        // Format: "2024-01-07 00:00:00 +0700" or "2024-01-07"
        const dateMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const parsedDate = new Date(dateMatch[1]);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          }
        }
        return 'Ngày không hợp lệ';
      }

      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Đang tải danh sách posts...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <button
            onClick={() => fetchPosts(page)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Danh sách Posts</h1>
          <button
            onClick={handleNewPost}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            + New Post
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Chưa có posts nào. Hãy tạo post mới!</p>
            <button
              onClick={handleNewPost}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Tạo Post Mới
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Tổng cộng: {total} posts
            </div>

            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.filename}
                  onClick={() => handlePostClick(post.slug)}
                  className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">
                    {post.title}
                  </h2>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span>{formatDate(post.date)}</span>
                    {post.categories.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Categories:</span>
                        {post.categories.map((cat, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {cat}
                          </span>
                        ))}
                      </span>
                    )}
                    {post.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Tags:</span>
                        {post.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                    {post.math && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        Math
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-400">
                    Slug: {post.slug} | File: {post.filename}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2 rounded-md ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>

                <span className="ml-4 text-sm text-gray-600">
                  Trang {page} / {totalPages}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

