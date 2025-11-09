// Empty generateStaticParams để cho phép static export
// Routes này sẽ không được build khi dùng output: 'export'
// nhưng cần file này để tránh lỗi build
export async function generateStaticParams() {
  // Return empty array - routes này không cần pre-render
  return [];
}

