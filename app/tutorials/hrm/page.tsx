'use client';

import HRMFlowWrapper from './HRMFlowWrapper';
import MDXContent from './content.mdx';

export default function HRMTutorialPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="prose prose-lg max-w-none">
          <MDXContent />
          <div className="my-8">
            <HRMFlowWrapper />
          </div>
          <div className="prose prose-lg max-w-none">
            <p>Phần animation trên mô phỏng:</p>
            <ul>
              <li><strong>L-module</strong> chạy nhanh, xử lý chi tiết (K steps mỗi cycle)</li>
              <li><strong>H-module</strong> cập nhật chiến lược sau mỗi chu kỳ (1 step mỗi cycle)</li>
              <li><strong>Q-head</strong> quyết định khi nào dừng (Adaptive Computational Time)</li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  );
}

