import fs from 'fs';
import path from 'path';

/**
 * Format date for Jekyll front matter
 */
export function formatDate(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} +0700`;
}

/**
 * Generate Jekyll front matter YAML
 */
export function generateFrontMatter(data: {
  title: string;
  date: string;
  categories?: string[];
  tags?: string[];
  math?: boolean;
}): string {
  const frontMatter: Record<string, any> = {
    layout: 'post',
    title: data.title,
    date: data.date,
  };

  if (data.categories && data.categories.length > 0) {
    frontMatter.categories = data.categories;
  }

  if (data.tags && data.tags.length > 0) {
    frontMatter.tags = data.tags;
  }

  if (data.math !== undefined) {
    frontMatter.math = data.math;
  }

  // Convert to YAML format
  const yamlLines = ['---'];
  
  for (const [key, value] of Object.entries(frontMatter)) {
    if (Array.isArray(value)) {
      yamlLines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
    } else if (typeof value === 'boolean') {
      yamlLines.push(`${key}: ${value}`);
    } else if (typeof value === 'string') {
      // Escape quotes in title if needed
      const escapedValue = value.includes('"') ? `"${value.replace(/"/g, '\\"')}"` : `"${value}"`;
      yamlLines.push(`${key}: ${escapedValue}`);
    } else {
      yamlLines.push(`${key}: ${value}`);
    }
  }
  
  yamlLines.push('---');
  return yamlLines.join('\n');
}

/**
 * Validate slug and check for duplicate filename
 */
export function validateSlug(slug: string, postsDir: string = '_posts'): { valid: boolean; message?: string; filename?: string } {
  if (!slug || slug.trim().length === 0) {
    return { valid: false, message: 'Slug không được để trống' };
  }

  // Check for invalid characters
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang' };
  }

  // Check for duplicate
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const filename = `${year}-${month}-${day}-${slug}.md`;
  
  const filePath = path.join(process.cwd(), postsDir, filename);
  
  if (fs.existsSync(filePath)) {
    return { 
      valid: false, 
      message: `File ${filename} đã tồn tại. Vui lòng chọn slug khác.`,
      filename 
    };
  }

  return { valid: true, filename };
}

/**
 * Generate filename from slug and date
 */
export function generateFilename(slug: string, date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}-${slug}.md`;
}

