import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parsePostFile, extractSlugFromFilename } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const postsDir = path.join(process.cwd(), '_posts');
    
    // Check if _posts directory exists
    if (!fs.existsSync(postsDir)) {
      return NextResponse.json({
        posts: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 0,
      });
    }

    // Read all files in _posts directory
    const files = fs.readdirSync(postsDir)
      .filter(file => /\.(md|markdown)$/i.test(file))
      .map(file => path.join(postsDir, file));

    // Parse all posts
    const allPosts = files
      .map(filePath => parsePostFile(filePath))
      .filter((post): post is NonNullable<typeof post> => post !== null)
      .sort((a, b) => {
        // Sort by date (newest first)
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

    const total = allPosts.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const posts = allPosts.slice(startIndex, endIndex);

    // Return simplified post data for list view
    const postsList = posts.map(post => ({
      filename: post.filename,
      slug: post.slug,
      title: post.title,
      date: post.date,
      categories: post.categories || [],
      tags: post.tags || [],
      math: post.math || false,
    }));

    return NextResponse.json({
      posts: postsList,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    console.error('Error listing posts:', error);
    return NextResponse.json(
      { error: `Lỗi khi lấy danh sách posts: ${error.message}` },
      { status: 500 }
    );
  }
}

