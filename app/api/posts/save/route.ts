import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateFrontMatter, formatDate, validateSlug, generateFilename } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, slug, categories, tags, math } = body;

    // Validate required fields
    if (!title || !content || !slug) {
      return NextResponse.json(
        { error: 'Title, content và slug là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate slug
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      return NextResponse.json(
        { error: slugValidation.message },
        { status: 400 }
      );
    }

    // Generate filename
    const filename = slugValidation.filename || generateFilename(slug);
    const postsDir = path.join(process.cwd(), '_posts');
    
    // Ensure _posts directory exists
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true });
    }

    // Generate front matter
    const frontMatter = generateFrontMatter({
      title,
      date: formatDate(),
      categories: categories && categories.length > 0 
        ? Array.isArray(categories) ? categories : categories.split(',').map((c: string) => c.trim())
        : undefined,
      tags: tags && tags.length > 0
        ? Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())
        : undefined,
      math: math || false,
    });

    // Create full post content
    const postContent = `${frontMatter}\n\n${content}`;

    // Write file
    const filePath = path.join(postsDir, filename);
    fs.writeFileSync(filePath, postContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Post đã được lưu thành công',
      filename,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Error saving post:', error);
    return NextResponse.json(
      { error: `Lỗi khi lưu post: ${error.message}` },
      { status: 500 }
    );
  }
}

