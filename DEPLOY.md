# Hướng Dẫn Deploy Lên GitHub Pages

## Lưu Ý Quan Trọng

Project này có **API routes** (posts, images, diagrams) cần server-side. GitHub Pages chỉ serve **static files**, nên:

- ✅ **Tutorial pages** (như `/tutorials/hrm`) sẽ hoạt động tốt
- ❌ **API routes** và **Editor pages** sẽ không hoạt động trên GitHub Pages

## Giải Pháp

### Option 1: Deploy Static Pages (Chỉ Tutorial)

Nếu chỉ cần deploy tutorial pages lên GitHub Pages:

1. **Enable GitHub Pages**:
   - Vào Settings → Pages
   - Source: "GitHub Actions"

2. **Push code lên GitHub**:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin master
   ```

3. **GitHub Actions sẽ tự động**:
   - Build static export
   - Deploy lên GitHub Pages
   - Site sẽ có tại: `https://phanngoc.github.io/tutorials/hrm/`

### Option 2: Hybrid Deployment (Khuyến nghị)

- **GitHub Pages**: Deploy static tutorial pages
- **Vercel/Netlify**: Deploy full Next.js app với API routes

**Setup Vercel**:
```bash
npm i -g vercel
vercel
```

**Setup Netlify**:
```bash
npm i -g netlify-cli
netlify deploy --prod
```

## Cấu Trúc Files

- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `next.config.static.js` - Config cho static export
- `next.config.js` - Config cho development (có API routes)

## Scripts

- `npm run build` - Build development (có API routes)
- `npm run build:static` - Build static export cho GitHub Pages
- `npm run dev` - Development server

## Các Bước Triển Khai

1. **Enable GitHub Pages trong repo settings**:
   - Vào Settings → Pages
   - Source: "GitHub Actions" (không phải "Deploy from a branch")
   - Save

2. **Push code lên GitHub**:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin master
   ```

3. **Kiểm tra GitHub Actions**:
   - Vào tab "Actions" trong repo
   - Workflow "Deploy to GitHub Pages" sẽ tự động chạy
   - Đợi build và deploy hoàn tất

4. **Truy cập site**:
   - Site sẽ có tại: `https://phanngoc.github.io/tutorials/hrm/`
   - Có thể mất vài phút để deploy xong

## Troubleshooting

### Build fails với API routes

Script `build:static` tự động tạm thời di chuyển API routes và dynamic pages ra khỏi `app/` khi build. Không cần làm gì thêm.

### Assets không load

Đảm bảo `trailingSlash: true` trong `next.config.static.js` để GitHub Pages hoạt động tốt hơn. File `.nojekyll` đã được tạo trong `public/` để GitHub Pages không xử lý như Jekyll site.

### Workflow không chạy

Kiểm tra:
- Branch name đúng (master hoặc main)
- GitHub Pages đã enable với source "GitHub Actions"
- Permissions trong workflow đã đúng

