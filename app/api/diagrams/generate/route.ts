import { NextRequest, NextResponse } from 'next/server';
import { generateGifForArticle } from '@/lib/diagram-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, slug, title } = body;

    // Validate required fields
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content là bắt buộc' },
        { status: 400 }
      );
    }

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        { error: 'Slug là bắt buộc' },
        { status: 400 }
      );
    }

    // Generate GIF
    const result = await generateGifForArticle(content, slug, title);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Lỗi khi generate GIF diagram',
          success: false 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gifPath: result.gifPath,
      spec: result.spec,
      message: 'GIF diagram đã được generate thành công',
    });
  } catch (error: any) {
    console.error('Error generating diagram GIF:', error);
    return NextResponse.json(
      { 
        error: `Lỗi khi generate diagram GIF: ${error.message || 'Unknown error'}`,
        success: false 
      },
      { status: 500 }
    );
  }
}

