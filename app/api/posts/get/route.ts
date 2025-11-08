import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parsePostFile, extractSlugFromFilename } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');
    const filename = searchParams.get('filename');

    if (!slug && !filename) {
      return NextResponse.json(
        { error: 'Cần cung cấp slug hoặc filename' },
        { status: 400 }
      );
    }

    const postsDir = path.join(process.cwd(), '_posts');
    
    if (!fs.existsSync(postsDir)) {
      return NextResponse.json(
        { error: 'Thư mục _posts không tồn tại' },
        { status: 404 }
      );
    }

    let filePath: string | null = null;

    if (filename) {
      // If filename is provided, use it directly
      filePath = path.join(postsDir, filename);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { error: `File ${filename} không tồn tại` },
          { status: 404 }
        );
      }
    } else if (slug) {
      // If slug is provided, find file by matching slug
      const files = fs.readdirSync(postsDir)
        .filter(file => /\.(md|markdown)$/i.test(file));

      for (const file of files) {
        const fileSlug = extractSlugFromFilename(file);
        if (fileSlug === slug) {
          filePath = path.join(postsDir, file);
          break;
        }
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return NextResponse.json(
          { error: `Không tìm thấy post với slug: ${slug}` },
          { status: 404 }
        );
      }
    }

    // Parse the post file
    const post = parsePostFile(filePath!);

    if (!post) {
      return NextResponse.json(
        { error: 'Không thể parse post file' },
        { status: 500 }
      );
    }

    // Return post data in format compatible with PostEditor
    return NextResponse.json({
      success: true,
      post: {
        filename: post.filename,
        slug: post.slug,
        title: post.title,
        content: post.content,
        categories: post.categories ? post.categories.join(', ') : '',
        tags: post.tags ? post.tags.join(', ') : '',
        math: post.math || false,
        date: post.date,
      },
    });
  } catch (error: any) {
    console.error('Error getting post:', error);
    return NextResponse.json(
      { error: `Lỗi khi lấy post: ${error.message}` },
      { status: 500 }
    );
  }
}

