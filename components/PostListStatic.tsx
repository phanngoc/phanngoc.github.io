'use client';

export interface Post {
  filename: string;
  slug: string;
  title: string;
  date: string;
  categories: string[];
  tags: string[];
  math: boolean;
}

interface PostListStaticProps {
  posts: Post[];
}

export default function PostListStatic({ posts }: PostListStaticProps) {
  const getPostUrl = (post: Post): string => {
    // For static export, link to Jekyll post URLs
    // Format: /YYYY/MM/DD/slug.html
    const dateMatch = post.filename.match(/^(\d{4})-(\d{2})-(\d{2})-/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return `/${year}/${month}/${day}/${post.slug}.html`;
    }
    // Fallback to slug-based URL
    return `/${post.slug}.html`;
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

  if (posts.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Chưa có posts nào.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Blog Posts</h1>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Tổng cộng: {posts.length} posts
        </div>

        <div className="space-y-4">
          {posts.map((post) => (
            <a
              key={post.filename}
              href={getPostUrl(post)}
              className="block bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all no-underline"
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
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

