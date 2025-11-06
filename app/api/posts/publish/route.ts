import { NextRequest, NextResponse } from 'next/server';
import { gitAdd, gitCommit, gitPush, isGitRepo } from '@/lib/git';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, title } = body;

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename là bắt buộc' },
        { status: 400 }
      );
    }

    // Check if git repo
    const isRepo = await isGitRepo();
    if (!isRepo) {
      return NextResponse.json(
        { error: 'Thư mục hiện tại không phải là git repository' },
        { status: 400 }
      );
    }

    const results: string[] = [];
    let success = true;

    // Git add
    const addResult = await gitAdd(filename);
    if (!addResult.success) {
      return NextResponse.json(
        { 
          error: `Git add thất bại: ${addResult.error}`,
          step: 'add',
        },
        { status: 500 }
      );
    }
    results.push(`✓ Git add: ${addResult.output || 'Thành công'}`);

    // Git commit
    const commitMessage = title ? `Add post: ${title}` : `Add post: ${filename}`;
    const commitResult = await gitCommit(commitMessage);
    if (!commitResult.success) {
      return NextResponse.json(
        { 
          error: `Git commit thất bại: ${commitResult.error}`,
          step: 'commit',
          previousSteps: results,
        },
        { status: 500 }
      );
    }
    results.push(`✓ Git commit: ${commitResult.output || 'Thành công'}`);

    // Git push
    const pushResult = await gitPush();
    if (!pushResult.success) {
      return NextResponse.json(
        { 
          error: `Git push thất bại: ${pushResult.error}`,
          step: 'push',
          previousSteps: results,
        },
        { status: 500 }
      );
    }
    results.push(`✓ Git push: ${pushResult.output || 'Thành công'}`);

    return NextResponse.json({
      success: true,
      message: 'Post đã được publish thành công lên GitHub',
      output: results.join('\n'),
    });
  } catch (error: any) {
    console.error('Error publishing post:', error);
    return NextResponse.json(
      { error: `Lỗi khi publish post: ${error.message}` },
      { status: 500 }
    );
  }
}

