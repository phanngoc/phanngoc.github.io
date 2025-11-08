import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const subfolder = formData.get('subfolder') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Không có file được upload' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File phải là hình ảnh' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const filename = `${baseName}-${timestamp}${ext}`;

    // Read file into buffer once
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine upload paths - save to both locations
    // 1. assets/images/ for Jekyll
    const jekyllImagesDir = path.join(process.cwd(), 'assets', 'images');
    let jekyllUploadPath = jekyllImagesDir;

    // 2. public/assets/images/ for Next.js preview
    const publicImagesDir = path.join(process.cwd(), 'public', 'assets', 'images');
    let publicUploadPath = publicImagesDir;

    if (subfolder && subfolder.trim()) {
      jekyllUploadPath = path.join(jekyllImagesDir, subfolder.trim());
      publicUploadPath = path.join(publicImagesDir, subfolder.trim());
    }

    // Ensure both directories exist
    if (!fs.existsSync(jekyllUploadPath)) {
      fs.mkdirSync(jekyllUploadPath, { recursive: true });
    }
    if (!fs.existsSync(publicUploadPath)) {
      fs.mkdirSync(publicUploadPath, { recursive: true });
    }

    // Save file to both locations
    const jekyllFilePath = path.join(jekyllUploadPath, filename);
    const publicFilePath = path.join(publicUploadPath, filename);
    
    fs.writeFileSync(jekyllFilePath, buffer);
    fs.writeFileSync(publicFilePath, buffer);

    // Generate relative path for markdown (same path works for both Jekyll and Next.js)
    const relativePath = subfolder && subfolder.trim()
      ? `/assets/images/${subfolder.trim()}/${filename}`
      : `/assets/images/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'Image đã được upload thành công',
      path: relativePath,
      filename,
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: `Lỗi khi upload image: ${error.message}` },
      { status: 500 }
    );
  }
}

