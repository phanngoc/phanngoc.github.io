'use client';

import MDXContent from './content.mdx';

export default function HRMTutorialPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="prose prose-lg max-w-none">
          <MDXContent />
        </article>
      </div>
    </div>
  );
}

