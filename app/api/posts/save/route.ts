import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateFrontMatter, formatDate, validateSlug, generateFilename, parsePostFile } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, slug, categories, tags, math, filename: existingFilename } = body;

    // Validate required fields
    if (!title || !content || !slug) {
      return NextResponse.json(
        { error: 'Title, content và slug là bắt buộc' },
        { status: 400 }
      );
    }

    const postsDir = path.join(process.cwd(), '_posts');
    
    // Ensure _posts directory exists
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true });
    }

    let filename: string;
    let postDate: string;

    if (existingFilename) {
      // Editing existing post - use existing filename and date
      filename = existingFilename;
      const existingFilePath = path.join(postsDir, existingFilename);
      
      if (!fs.existsSync(existingFilePath)) {
        return NextResponse.json(
          { error: `File ${existingFilename} không tồn tại` },
          { status: 404 }
        );
      }

      // Parse existing file to get original date
      const existingPost = parsePostFile(existingFilePath);
      postDate = existingPost?.date || formatDate();
    } else {
      // Creating new post - validate slug and generate filename
      const slugValidation = validateSlug(slug);
      if (!slugValidation.valid) {
        return NextResponse.json(
          { error: slugValidation.message },
          { status: 400 }
        );
      }

      filename = slugValidation.filename || generateFilename(slug);
      postDate = formatDate();
    }

    // Generate front matter
    const frontMatter = generateFrontMatter({
      title,
      date: postDate,
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
      message: existingFilename ? 'Post đã được cập nhật thành công' : 'Post đã được lưu thành công',
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

