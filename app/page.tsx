import PostListStatic from '@/components/PostListStatic';
import { getAllPosts } from '@/lib/posts-static';

export default function Home() {
  // Read posts at build time (Server Component)
  const posts = getAllPosts();

  return (
    <main className="w-full min-h-screen">
      <PostListStatic posts={posts} />
    </main>
  );
}

