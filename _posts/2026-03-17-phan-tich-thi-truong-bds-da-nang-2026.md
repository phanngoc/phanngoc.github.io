---
layout: "post"
title: "Phân Tích Thị Trường Bất Động Sản Đà Nẵng 2026: Insights Từ 5,207 Listings Thực Tế"
date: "2026-03-17 09:00:00 +0700"
tags: ["data-analysis", "real-estate", "da-nang", "eda", "python", "kaggle"]
math: false
---

> **TL;DR:** Tôi crawl 5,207 listings bất động sản Đà Nẵng từ batdongsan.com.vn, chạy EDA toàn diện và rút ra một số insights thú vị: Sơn Trà đắt nhất tính theo m², Ngũ Hành Sơn sôi động nhất về khối lượng giao dịch, và phần lớn thị trường tập trung ở phân khúc 5–15 tỷ. Dataset và notebook đầy đủ trên Kaggle.

---

## Bối Cảnh & Phương Pháp

Đà Nẵng luôn là một trong những thị trường BĐS được theo dõi sát nhất Việt Nam — vừa là thành phố du lịch quốc tế, vừa là hub công nghệ đang phát triển mạnh. Nhưng đọc tin tức thị trường thì được mấy phần thực chất?

Tôi quyết định lấy thẳng từ nguồn: crawl toàn bộ listings đất nền Đà Nẵng trên **batdongsan.com.vn** bằng Go + go-rod (browser automation với stealth mode), thu về **5,207 listings** tính đến ngày 17/03/2026.

**Stack sử dụng:**
- Crawler: Go 1.21 + go-rod + stealth
- Storage: SQLite
- Analysis: Python + Pandas + Seaborn + Matplotlib
- Publish: Kaggle Datasets + Notebook

📊 **Dataset & Notebook:** [kaggle.com/ngocphansun/da-nang-real-estate-listings](https://www.kaggle.com/datasets/ngocphansun/da-nang-real-estate-listings)

---

## 1. Bức Tranh Tổng Quan

| Chỉ số | Giá trị |
|--------|---------|
| Tổng listings | **5,207** |
| Có thông tin giá | **4,868 (93.5%)** |
| Giá trung vị | **9.0 tỷ VND** |
| Giá trung bình | **19.4 tỷ VND** |
| Giá thấp nhất | **280 triệu** |
| Giá cao nhất | **582 tỷ** |
| Diện tích trung vị | **110 m²** |
| Đăng trong 1 tuần | **94.2%** |

Con số đáng chú ý đầu tiên: **khoảng cách lớn giữa trung vị (9 tỷ) và trung bình (19.4 tỷ)** — dấu hiệu rõ của phân phối lệch phải. Một số lô đất siêu cao (100–582 tỷ) kéo giá trung bình lên đáng kể, trong khi đại đa số giao dịch vẫn nằm ở mức 5–20 tỷ.

---

## 2. Quận Nào Sôi Động Nhất?

![Listings by District](/assets/bds-danang-2026/district_listings.png)

| Quận | Listings | % thị phần | Giá trung vị | Giá/m² trung vị |
|------|----------|------------|-------------|-----------------|
| **Ngũ Hành Sơn** | 1,537 | 29.5% | 10.2 tỷ | 81.6 tr/m² |
| **Sơn Trà** | 1,302 | 25.0% | 16.5 tỷ | 143.8 tr/m² |
| **Cẩm Lệ** | 715 | 13.7% | 7.2 tỷ | 64.4 tr/m² |
| **Liên Chiểu** | 680 | 13.1% | 6.15 tỷ | 58.7 tr/m² |
| **Hòa Vang** | 384 | 7.4% | 2.78 tỷ | 19.5 tr/m² |
| **Hải Châu** | 343 | 6.6% | 11.5 tỷ | 118.3 tr/m² |
| **Thanh Khê** | 245 | 4.7% | 6.15 tỷ | 87.5 tr/m² |

**Ngũ Hành Sơn chiếm gần 30% tổng listings** — con số này phản ánh làn sóng phát triển ở khu vực ven biển phía Nam thành phố, đặc biệt quanh Bán đảo Sơn Trà và Non Nước. Khu vực này đang hút rất nhiều nhà đầu tư dài hạn với quỹ đất còn tương đối rộng so với trung tâm.

---

## 3. Phân Bổ Giá: Thị Trường Tập Trung Ở Đâu?

![Price Distribution](/assets/bds-danang-2026/price_distribution.png)

```
Phân khúc giá       Số lượng    Tỷ lệ
─────────────────────────────────────
< 3 tỷ                  283      5.8%
3 – 5 tỷ                697     14.3%
5 – 8 tỷ              1,174     24.1%  ← đông nhất
8 – 10 tỷ               433      8.9%
10 – 15 tỷ              731     15.0%
15 – 20 tỷ              420      8.6%
20 – 30 tỷ              410      8.4%
30 – 50 tỷ              393      8.1%
50 – 100 tỷ             208      4.3%
> 100 tỷ                119      2.4%
```

**Phân khúc 5–8 tỷ là "sweet spot" của thị trường** với 24% tổng số listings. Kết hợp với phân khúc 3–5 tỷ, có thể thấy gần 40% listings nằm trong range 3–8 tỷ — đây là phân khúc tầm trung đang được giới đầu tư lướt sóng và ở thực nhắm đến nhiều nhất.

Đáng chú ý, **gần 15% listings có giá từ 30 tỷ trở lên** — cho thấy phân khúc cao cấp vẫn rất sôi động ở Đà Nẵng, chủ yếu tập trung ở Sơn Trà và Hải Châu.

---

## 4. Giá Theo m²: Sơn Trà Đắt Gấp 7 Lần Hòa Vang

![Price per m2](/assets/bds-danang-2026/price_per_m2.png)

Đây là góc nhìn công bằng hơn để so sánh giá trị thực giữa các quận:

| Quận | Giá/m² trung vị | Giá/m² trung bình |
|------|-----------------|-------------------|
| 🥇 **Sơn Trà** | 142 tr/m² | 154 tr/m² |
| 🥈 **Hải Châu** | 118 tr/m² | 131 tr/m² |
| 🥉 **Thanh Khê** | 87.5 tr/m² | 90.7 tr/m² |
| **Ngũ Hành Sơn** | 81.1 tr/m² | 111.9 tr/m² |
| **Cẩm Lệ** | 64.3 tr/m² | 68.0 tr/m² |
| **Liên Chiểu** | 58.6 tr/m² | 61.4 tr/m² |
| **Hòa Vang** | 17.9 tr/m² | 23.4 tr/m² |

**Sơn Trà đắt nhất** với trung vị 142 tr/m² — đây là hệ quả của vị trí ven biển, mật độ resort/khách sạn cao, và quỹ đất hạn chế do địa hình bán đảo. **Hòa Vang rẻ nhất** (17.9 tr/m²), nhưng đây là huyện ngoại thành với đất nông nghiệp và đất ở nông thôn, không thể so sánh trực tiếp.

Điều thú vị: **Ngũ Hành Sơn có giá trung bình (112 tr/m²) cao hơn nhiều so với trung vị (81 tr/m²)** — nghĩa là có một số lô siêu cao giá đang kéo trung bình lên. Phân phối ở đây rất rộng, phản ánh sự đa dạng từ đất nền khu dân cư đến đất mặt tiền biển.

---

## 5. Diện Tích: 100m² Là "Standard"

![Area Distribution](/assets/bds-danang-2026/area_distribution.png)

Phân tích diện tích cho thấy thị trường Đà Nẵng khá chuẩn hóa:

- **100 m²** là size phổ biến nhất (785 listings, ~15%)
- **90 m²** đứng thứ hai (245 listings)
- **Hơn 60%** listings nằm trong range 80–200 m²

Điều này phản ánh quy hoạch đô thị khá đồng nhất — hầu hết các dự án đất nền ở Đà Nẵng được chia lô theo tiêu chuẩn 5×20m (100m²) hoặc 5×18m (90m²).

---

## 6. Độ Tươi Của Data & VIP Tier

![Freshness & VIP](/assets/bds-danang-2026/freshness_vip.png)

**94.2% listings được đăng trong 1 tuần trước** — đây là điểm mạnh của dữ liệu, phản ánh "nhiệt độ" thực của thị trường tại thời điểm crawl chứ không phải tồn đọng cũ.

Về **VIP tier** (mức độ quảng cáo trả phí):
- Normal (miễn phí): 5,080 listings (97.6%)
- Silver: 96 (1.8%)
- Gold: 21 (0.4%)
- Diamond: 10 (0.2%)

Chỉ ~2.4% listings trả phí để boost — điều này có nghĩa là **thị trường BĐS Đà Nẵng vẫn chủ yếu do môi giới/cá nhân đăng tự do**, chưa có nhiều chủ đầu tư lớn đổ ngân sách marketing vào nền tảng này.

---

## 7. Tương Quan Giá & Diện Tích

![Price vs Area](/assets/bds-danang-2026/price_vs_area.png)

Scatter plot và correlation matrix cho thấy:

- **Tương quan giá × diện tích: ~0.35** — tương quan dương nhưng không mạnh
- **Tương quan giá × giá/m²: ~0.72** — cao hơn nhiều

Kết luận: **Vị trí (quận, đường, view) giải thích giá tốt hơn diện tích**. Một lô 100m² ở Sơn Trà có thể đắt hơn 5–7 lần so với lô cùng size ở Hòa Vang. Diện tích lớn hơn không nhất thiết tương quan với giá cao hơn theo cách tuyến tính.

---

## 8. Key Takeaways Cho Nhà Đầu Tư

### 🔴 Phân khúc Hot: 5–15 tỷ
Gần 40% tổng listings, liquidity tốt nhất thị trường. Phù hợp cho cả ở thực lẫn đầu tư lướt sóng.

### 🟡 Cẩn Trọng: Sơn Trà & Hải Châu
Giá/m² cao nhất (>100 tr/m²), nhưng room tăng tiếp có thể hạn chế. Phù hợp cho dài hạn, nắm giữ.

### 🟢 Tiềm Năng: Ngũ Hành Sơn & Liên Chiểu
- **Ngũ Hành Sơn**: Thị phần lớn nhất, infrastructure đang phát triển, giá/m² còn chấp nhận được
- **Liên Chiểu**: Giá thấp nhất trong nội thành (~59 tr/m²), hưởng lợi từ quy hoạch cảng Liên Chiểu

### 🔵 Cơ Hội Niche: Hòa Vang
Giá đất siêu rẻ (trung vị 17.9 tr/m²), thích hợp cho đầu tư đất nông nghiệp chuyển đổi dài hạn hoặc resort/nghỉ dưỡng.

---

## Hạn Chế & Caveats

Một số điều cần lưu ý khi đọc phân tích này:

1. **Giá listing ≠ giá thành công**: Đây là giá chào, không phải giá giao dịch thực tế
2. **Bias từ nền tảng**: batdongsan.com.vn có thể không đại diện cho toàn bộ thị trường (bỏ sót giao dịch qua Facebook, Zalo, môi giới trực tiếp)
3. **Snapshot 1 tuần**: Dữ liệu phản ánh thời điểm tháng 3/2026, không track được trend theo thời gian
4. **Geocoding thô**: Phân loại quận dựa trên text, có thể có sai sót nhỏ

---

## Kết Luận

Với 5,207 listings trong tay, bức tranh thị trường BĐS Đà Nẵng đầu 2026 khá rõ nét: **thị trường đang sôi động** (94% listings mới trong tuần), **tập trung ở phân khúc 5–15 tỷ**, và **Sơn Trà + Hải Châu dẫn đầu về giá trị/m²** trong khi **Ngũ Hành Sơn dẫn đầu về khối lượng**.

Dataset đầy đủ và notebook EDA interactive trên Kaggle — mọi người có thể tự khám phá thêm:

👉 [Dataset](https://www.kaggle.com/datasets/ngocphansun/da-nang-real-estate-listings) | [EDA Notebook](https://www.kaggle.com/code/ngocphansun/ph-n-t-ch-c-h-i-u-t-b-s-n-ng)

Source code crawler (Go): [github.com/phanngoc/bds-pipeline](https://github.com/phanngoc/bds-pipeline)
