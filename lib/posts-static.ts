import fs from 'fs';
import path from 'path';
import { parsePostFile } from './utils';

export interface Post {
  filename: string;
  slug: string;
  title: string;
  date: string;
  categories: string[];
  tags: string[];
  math: boolean;
}

/**
 * Get all posts from _posts directory at build time
 * This function reads posts from the file system and can be used in Server Components
 */
export function getAllPosts(): Post[] {
  const postsDir = path.join(process.cwd(), '_posts');
  
  // Check if _posts directory exists
  if (!fs.existsSync(postsDir)) {
    return [];
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
    })
    .map(post => ({
      filename: post.filename,
      slug: post.slug,
      title: post.title,
      date: post.date,
      categories: post.categories || [],
      tags: post.tags || [],
      math: post.math || false,
    }));

  return allPosts;
}

