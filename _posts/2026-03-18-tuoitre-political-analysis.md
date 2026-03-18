---
layout: "post"
title: "Phân tích 16,800 bài báo Tuổi Trẻ: Topic chính trị nào nổi bật từng tuần 2025-2026?"
date: "2026-03-18 14:00:00 +0700"
tags: ["nlp", "clustering", "tfidf", "politics", "vietnam", "data-analysis", "chromedp", "golang"]
math: false
---

> Tôi crawl 16,825 bài báo từ Tuổi Trẻ Online trong vòng **24 phút** bằng Go + Chrome DevTools Protocol, sau đó dùng TF-IDF clustering để vẽ bản đồ các chủ đề chính trị theo tuần. Kết quả khá thú vị — đặc biệt là cú shock của chiến sự Iran bắt đầu ngày 28/2/2026.

---

## Tại sao làm việc này?

Tôi muốn có một cách để **nhanh chóng nắm bắt xu hướng chính trị** qua các tuần mà không cần đọc từng bài. Câu hỏi đặt ra: *Tuần này Tuổi Trẻ đang viết nhiều nhất về gì? Topic nào vừa bùng nổ?*

Thay vì đọc thủ công, tôi xây pipeline:
1. Crawl toàn bộ bài báo → SQLite
2. TF-IDF vectorize → K-Means cluster thành 20 topic
3. Vẽ heatmap, timeline, entity tracking

---

## Architecture: Bypass IP Block bằng chromedp

Vấn đề đầu tiên: Tuổi Trẻ block comment API với server IP (cookie `__stat="BLOCK"`). Giải pháp: dùng **Chrome DevTools Protocol** để chạy `fetch()` *bên trong browser thật* — browser dùng cookies thật của mình, bypass hoàn toàn.

```go
// chromedp: chạy JS fetch() trong browser session thật
js := fmt.Sprintf(`
  (async () => {
    const resp = await fetch(
      "https://id.tuoitre.vn/api/getlist-comment.api?appKey=%s&objectId=%s&...",
      { credentials: "include" }  // dùng cookies của browser
    );
    return JSON.stringify(await resp.json());
  })()
`, appKey, objectID)

var result interface{}
chromedp.Run(ctx, chromedp.Evaluate(js, &result, chromedp.EvalAsValue))
```

**Trick quan trọng:** `chromedp.Evaluate` với `interface{}` thay vì `string` để handle cả khi API trả về JSON object trực tiếp thay vì string-wrapped.

### Tốc độ: HTTP parallel + Browser chỉ cho comments

Kiến trúc cuối cùng:

| Layer | Tech | Tốc độ |
|-------|------|--------|
| Article listing | `net/http` parallel | ~100ms/page |
| Article content | `net/http` + custom HTML parser | ~200ms/article |
| Comments | `chromedp.Evaluate` + `fetch()` | ~2s/article |
| Workers | 10 goroutines đồng thời | — |

Kết quả: **37,100 articles/giờ** (so với ~140/giờ khi dùng Chrome navigate cho tất cả).

### Pagination API

Tuổi Trẻ dùng format ít tài liệu hóa:
- Page 1: `https://tuoitre.vn/{section}.htm`
- Page 2+: `https://tuoitre.vn/timeline/{cateId}/trang-{page}.htm`

Tìm được bằng cách intercept network requests qua CDP khi scroll trang.

---

## Dataset: 16,825 bài, 11 chuyên mục

```
the-gioi:    1,995 bài  | giai-tri:   1,975 bài
thoi-su:     1,937 bài  | van-hoa:    1,936 bài
phap-luat:   1,899 bài  | nhip-song-tre: 1,890 bài
suc-khoe:    1,774 bài  | giao-duc:   1,768 bài
kinh-doanh:  1,571 bài  | chinh-tri:     78 bài
```

Phạm vi: **2025-01-01 đến 2026-03-18**

---

## TF-IDF + K-Means: 20 Topic Clusters

Dùng `scikit-learn` với bigrams:

```python
vectorizer = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 2),      # unigrams + bigrams
    min_df=3, max_df=0.7,    # lọc quá hiếm và quá phổ biến
    stop_words=STOPWORDS_VI,
    sublinear_tf=True,        # log normalization
)
X = vectorizer.fit_transform(df['title'] + ' ' + df['sapo'])

km = MiniBatchKMeans(n_clusters=20, random_state=42, n_init=5)
km.fit(X)
```

**20 clusters auto-detected:**

| # | Topic | Bài |
|---|-------|-----|
| 0 | 💼 Kinh doanh / Doanh nghiệp | 962 |
| 1 | ⚔️ Chiến sự Trung Đông (Mỹ–Iran–Israel) | 985 |
| 4 | 🏗️ Dự án / Đầu tư công | 1,370 |
| 5 | 🌡️ Đời sống / Xã hội | 3,394 |
| 6 | 🇻🇳 Việt Nam / Chính trị nội địa | 1,145 |
| 12 | 🎋 Tết Bính Ngọ 2026 | 757 |
| 14 | 🏛️ Lãnh đạo / Chính sách | 463 |

---

## Kết quả: Timeline theo tuần

### Entity mentions — Chiến sự bùng nổ tuần 2026-02-23

Theo dõi 6 thực thể chính theo tuần:

| Tuần | Iran | Israel | Mỹ/Trump | Nga | Trung Quốc | VN Chính trị |
|------|------|--------|----------|-----|------------|-------------|
| 2026-01-05 | 16 | 4 | 62 | 62 | 42 | 94 |
| 2026-02-02 | 19 | 1 | 42 | 76 | 41 | 131 |
| **2026-02-23** | **80** | **38** | 48 | 75 | 39 | 150 |
| **2026-03-02** | **144** | **50** | 49 | 46 | 15 | 171 |
| 2026-03-09 | 123 | 38 | 40 | 56 | 22 | 165 |

Cú nhảy từ 19 → **144** mentions/tuần của Iran sau ngày 28/2 rất rõ.

### Topic shift: Trước vs Sau chiến sự

So sánh cơ cấu bài viết **7,002 bài trước 28/2** vs **2,689 bài sau**:

```
TĂNG MẠNH:
  +5.9%  🇻🇳 VN Chính trị (Quốc hội khóa XVI)
  +3.8%  ⚔️ Chiến sự Trung Đông
  +1.9%  📈 Tài chính/Chứng khoán
  +1.2%  🚗 Giao thông

GIẢM MẠNH:
  -0.8%  👮 Công an/Pháp luật  
  -2.6%  🌡️ Đời sống/Xã hội
  -9.5%  🎋 Tết Bính Ngọ (đương nhiên!)
```

### Weekly digest — Mỗi tuần có gì?

Một vài tuần đáng chú ý:

**📅 Tuần 2026-02-09** (trước chiến sự):
- 🎋 Tết Bính Ngọ (196 bài) — tuần cao điểm Tết
- 🌡️ Đời sống (146 bài)

**📅 Tuần 2026-02-23** (chiến sự bắt đầu):
- 🌡️ Đời sống (177 bài)
- ⚔️ Chiến sự: *"Dân Iran được kêu gọi 'rời thủ đô', dân Israel 'bình thản'"*
- 👮 Pháp luật: *"Cựu Bộ trưởng Nguyễn Thị Kim Tiến được đưa 20,4 tỉ..."*

**📅 Tuần 2026-03-02** (chiến sự leo thang):
- 🌡️ Đời sống (171 bài)
- 🇻🇳 VN Chính trị (126 bài) — *"Chủ tịch Quốc hội: Kỳ họp thứ nhất Quốc hội khóa XVI..."*
- ⚔️ Chiến sự (122 bài): *"Sáng nay Israel không kích mạnh vào Tehran..."*

---

## Interactive Charts

Tất cả charts interactive (Plotly) ở đây:

- 🗺️ [Heatmap: Topic × Tuần 2025-2026](/assets/tuoitre-politics/heatmap_topics.html)
- 🌍 [Entity Timeline: Iran/Israel/Mỹ/Nga theo tuần](/assets/tuoitre-politics/entities_timeline.html)
- 📊 [Topic Shift: Trước/Sau chiến sự 28/2](/assets/tuoitre-politics/topic_shift.html)
- 📅 [Weekly Digest HTML](/assets/tuoitre-politics/weekly_digest.html)

---

## Code

GitHub: [tuoitre-crawler](https://github.com/phanngoc/phanngoc.github.io) (trong repo này)

Stack:
- **Crawler:** Go + chromedp (CDP) + net/http
- **Analysis:** Python + scikit-learn + plotly
- **Storage:** SQLite

---

## Limitations

1. **Comments = 0** — server IP bị block, chỉ lấy được article metadata
2. **TF-IDF không hiểu ngữ nghĩa** — một số cluster bị mix. Nên thử `PhoBERT` hoặc multilingual sentence-transformers cho kết quả tốt hơn
3. **Chỉ title + sapo** — content đầy đủ có nhưng chưa dùng để cluster (quá nhiều noise)

---

*Crawled & analyzed: 2026-03-18 | Tools: Go 1.18, Python 3.10, chromedp v0.9.5*
