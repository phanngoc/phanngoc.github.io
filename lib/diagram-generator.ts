import fs from 'fs';
import path from 'path';
import { generateDiagramSpecFromText, DiagramSpec } from './diagram-spec';
import { renderDiagramGif } from './gif-renderer';

export interface GenerateGifResult {
  success: boolean;
  gifPath: string;
  spec: DiagramSpec;
  error?: string;
}

/**
 * Generate GIF diagram for article content
 * Orchestrates: spec generation → rendering → file saving
 */
export async function generateGifForArticle(
  content: string,
  slug: string,
  title?: string
): Promise<GenerateGifResult> {
  try {
    // Validate inputs
    if (!content || !content.trim()) {
      throw new Error('Content không được để trống');
    }
    if (!slug || !slug.trim()) {
      throw new Error('Slug không được để trống');
    }

    // Step 1: Generate diagram spec from content using OpenAI
    const spec = await generateDiagramSpecFromText(content);

    // Step 2: Determine output paths
    // Save to both locations: assets/images/ for Jekyll and public/assets/images/ for Next.js
    const jekyllImagesDir = path.join(process.cwd(), 'assets', 'images');
    const publicImagesDir = path.join(process.cwd(), 'public', 'assets', 'images');
    
    const slugDir = slug.trim();
    const jekyllSlugDir = path.join(jekyllImagesDir, slugDir);
    const publicSlugDir = path.join(publicImagesDir, slugDir);

    // Ensure directories exist
    if (!fs.existsSync(jekyllSlugDir)) {
      fs.mkdirSync(jekyllSlugDir, { recursive: true });
    }
    if (!fs.existsSync(publicSlugDir)) {
      fs.mkdirSync(publicSlugDir, { recursive: true });
    }

    // Generate GIF filename
    const gifFilename = 'flow.gif';
    const jekyllGifPath = path.join(jekyllSlugDir, gifFilename);
    const publicGifPath = path.join(publicSlugDir, gifFilename);

    // Step 3: Render GIF
    // Render to temporary location first, then copy to both locations
    const tempGifPath = path.join(process.cwd(), 'temp-flow.gif');
    
    try {
      await renderDiagramGif(spec, tempGifPath);

      // Step 4: Copy GIF to both locations
      const gifBuffer = fs.readFileSync(tempGifPath);
      fs.writeFileSync(jekyllGifPath, gifBuffer);
      fs.writeFileSync(publicGifPath, gifBuffer);
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempGifPath)) {
        try {
          fs.unlinkSync(tempGifPath);
        } catch (cleanupError) {
          // Ignore cleanup errors
          console.warn('Failed to cleanup temp file:', cleanupError);
        }
      }
    }

    // Step 5: Return result with relative path for markdown
    const relativePath = `/assets/images/${slugDir}/${gifFilename}`;

    return {
      success: true,
      gifPath: relativePath,
      spec,
    };
  } catch (error: any) {
    return {
      success: false,
      gifPath: '',
      spec: {
        title: title || 'Untitled',
        nodes: [],
        flows: [],
        frames: [],
      },
      error: error.message || 'Unknown error occurred',
    };
  }
}

