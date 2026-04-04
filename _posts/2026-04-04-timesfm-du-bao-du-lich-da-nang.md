---
layout: post
title: "TimesFM 2.5: Khi Google dùng GPT để dự báo du lịch Đà Nẵng"
date: 2026-04-04
tags: [TimesFM, Google Research, Time Series, Forecasting, Da Nang, Tourism, AI]
description: "Phân tích thuật toán TimesFM 2.5 — foundation model cho time series forecasting từ Google Research, và ứng dụng thực tế dự báo du lịch Đà Nẵng."
---

# TimesFM 2.5: Khi Google dùng GPT để dự báo du lịch Đà Nẵng

> Bạn biết GPT dự đoán từ tiếp theo trong câu. Nhưng nếu thay "từ" bằng "con số", bạn sẽ có **TimesFM** — foundation model cho dự báo chuỗi thời gian từ Google Research. Bài viết này phân tích thuật toán, benchmark với 6 model truyền thống, và xây MVP dự báo du lịch Đà Nẵng.

---

## Mục lục

1. [TimesFM là gì?](#1-timesfm-là-gì)
2. [Thuật toán — 8 bước chi tiết](#2-thuật-toán--8-bước-chi-tiết)
3. [Data training — 100 tỷ timepoints](#3-data-training--100-tỷ-timepoints)
4. [MVP: Dự báo du lịch Đà Nẵng](#4-mvp-dự-báo-du-lịch-đà-nẵng)
5. [Benchmark: TimesFM vs 6 model truyền thống](#5-benchmark-timesfm-vs-6-model-truyền-thống)
6. [Kết luận](#6-kết-luận)

---

## 1. TimesFM là gì?

**TimesFM** (Time Series Foundation Model) là mô hình pretrained do Google Research phát triển, công bố tại **ICML 2024**. Ý tưởng cốt lõi: áp dụng kiến trúc GPT (decoder-only transformer) cho bài toán dự báo chuỗi thời gian.

**Specs:**
- **200M parameters** (nhỏ hơn GPT-3 gần 1000 lần)
- **16K context length** — nhìn được tới 16,000 điểm dữ liệu quá khứ
- **Zero-shot** — không cần train lại, chạy thẳng trên data mới
- **Quantile forecast** — confidence intervals 10%-90%

Paper: [A decoder-only foundation model for time-series forecasting](https://arxiv.org/abs/2310.10688)

Repo: [github.com/google-research/timesfm](https://github.com/google-research/timesfm)

---

## 2. Thuật toán — 8 bước chi tiết

### Tổng quan: "GPT cho Time Series"

Cách train TimesFM **gần như giống hệt** cách train GPT/LLM, chỉ thay **token text → patch số liệu**:

```
GPT:     "Tôi" → "đi" → "học" → [dự đoán: "bài"]
TimesFM: [32 giá] → [32 giá] → [32 giá] → [dự đoán: 128 giá tiếp]
```

### Bước 1: Patching — Tokenize chuỗi số

Thay vì tokenize text thành words, TimesFM **chia chuỗi thời gian thành patches** (tương tự ViT chia ảnh):

```
Input: [y₁, y₂, ... y₅₁₂]  (512 ngày)
                ↓
Patch 1: [y₁ ... y₃₂]      ← 32 điểm = 1 "token"
Patch 2: [y₃₃ ... y₆₄]
...
Patch 16: [y₄₈₁ ... y₅₁₂]
```

Tại sao?
- **Giảm sequence length 32×** → transformer nhanh hơn nhiều
- Mỗi patch chứa đủ thông tin local (trend ngắn, mức noise)
- Output patch = 128 điểm (4× input) — "nhìn ít, đoán nhiều"

### Bước 2: Input Encoding

Mỗi patch [32 số] + mask [32 bit] → concat thành vector 64 chiều → qua **Residual Block** (Linear→SiLU→Linear + skip connection) → vector 1280 chiều → cộng **Rotary Position Embedding (RoPE)**.

Mask đánh dấu vị trí padding — model biết chỗ nào là data thật, chỗ nào không.

### Bước 3: Transformer Decoder (Core)

**20 layers**, mỗi layer gồm:

1. **RMSNorm** (thay LayerNorm — nhẹ hơn)
2. **Multi-Head Causal Attention**: 16 heads × 80d, Fused QKV, Per-dim scaling
3. **Residual connection**
4. **FFN** với SiLU activation + Residual

**Causal Attention** = điểm mấu chốt — mỗi token chỉ nhìn được các token **trước** nó (tương lai bị che). Giống hệt GPT.

### Bước 4: Output Heads

Mỗi output embedding → 2 heads:

| Head | Output | Mục đích |
|------|--------|----------|
| **Point Head** | 128 values | Dự đoán trung bình |
| **Quantile Head** | 1024 × 10 | 9 quantiles (10th→90th) + mean |

### Bước 5: Loss Function — MSE

```
Loss = mean(MSE₁, MSE₂, ..., MSEₙ)
```

Tính **song song** cho tất cả positions trong 1 forward pass. Decoder-only architecture cho phép parallelize hoàn toàn khi training.

### Bước 6: Random Front Masking

Vấn đề: nếu train với patches đều đặn, model chỉ giỏi khi context = bội số 32.

Giải pháp: mỗi sample, random mask `r ∈ [0, 31]` điểm đầu của patch 1:

```
r=4:  Patch 1 = [MASK×4, y₅...y₃₂] → thấy 28 điểm
r=20: Patch 1 = [MASK×20, y₂₁...y₃₂] → thấy 12 điểm
```

Lặp qua tất cả r → model học được **mọi context length**.

### Bước 7: RevIN (Reversible Instance Normalization)

```python
# Forward: normalize
normalized = (patch - μ) / σ  # running stats per patch

# Transformer xử lý
output = Transformer(normalized)

# Reverse: denormalize
forecast = output × σ + μ
```

Đảm bảo `f(aX + b) = a·f(X) + b` — model xử lý được mọi scale (giá 1,684 hay giá 27 đều OK).

### Bước 8: Autoregressive Decoding (Inference)

```
Prefill 16 patches → KV-Cache → Output 128 ngày
Nếu cần thêm: lấy output → chia patches mới → decode tiếp (dùng cache)
```

Giống LLM inference: KV-Cache tránh tính lại attention cho tokens cũ.

### So sánh với GPT

| | GPT | TimesFM |
|---|---|---|
| Input | Text tokens | Patches 32 số |
| Output | 1 token/step | **128 values/step** |
| Attention | Causal | Causal |
| Position | RoPE | RoPE |
| Norm | LayerNorm | **RMSNorm + RevIN** |
| Loss | Cross-entropy | **MSE** |
| Params | 175B | **200M** |
| Training | Text internet | **Time series 100B pts** |

---

## 3. Data training — 100 tỷ timepoints

TimesFM được pretrain trên ~100 tỷ timepoints từ 3 nguồn chính:

### Google Trends (~0.5B timepoints)
- ~22K search queries phổ biến nhất
- Hourly, daily, weekly, monthly (2007-2022)
- Pattern: seasonal spikes, trends, mean-reversion

### Wikipedia Pageviews (~300B timepoints) — Nguồn lớn nhất
- Lượt xem tất cả trang Wikimedia
- Jan 2012 – Nov 2023
- Pattern: daily/weekly seasonality + event-driven spikes

### Synthetic Data (3 triệu chuỗi × 2048 points)
- ARMA processes
- Seasonal (tổ hợp sin/cos)
- Trends (linear, exponential + change points)
- Step functions

### Ý nghĩa cho ứng dụng

TimesFM **không** được train trên financial data hay dữ liệu du lịch cụ thể. Nhưng vì Google Trends data là nguồn training chính, nên khi chúng ta dùng Google Trends làm input → **đúng domain** → accuracy cao.

---

## 4. MVP: Dự báo du lịch Đà Nẵng

### Bài toán

Đà Nẵng đón **12.8 triệu lượt khách** trong 8 tháng đầu 2025. Chủ khách sạn, nhà hàng, tour operator cần biết: **tuần/tháng tới khách đông hay vắng?**

### Giải pháp

Kết hợp 4 nguồn dữ liệu miễn phí + TimesFM 2.5:

```
Google Trends (daily/weekly) ─┐
Open-Meteo Weather ───────────┤──> TimesFM 2.5 ──> Forecast
Event Calendar ───────────────┤                        │
Cục Thống kê ĐN (monthly) ───┘                   Dashboard
```

### Google Trends — Leading Indicator

Tôi track 11 search queries liên quan đến du lịch Đà Nẵng:

**Tiếng Việt (nội địa):**
- "khách sạn đà nẵng", "du lịch đà nẵng", "vé máy bay đà nẵng"
- "bà nà hills", "biển mỹ khê"

**Tiếng Anh (quốc tế):**
- "da nang hotel", "da nang travel", "flight to danang"
- "danang", "danang hotel", "vietnam beach"

### Kết quả forecast (12 tuần tới)

![Forecast khách sạn Đà Nẵng](/assets/images/timesfm/forecast_da_nang_hotel.png)
*"Khách sạn đà nẵng" — Search interest tăng 80.5% trong 12 tuần tới. Seasonal pattern rõ ràng: peak mùa hè.*

![Forecast lượng khách](/assets/images/timesfm/forecast_visitors.png)
*Lượng khách hàng tháng — Từ peak 1,970K (T8/2025) dự báo giảm về ~1,296K (mùa mưa). Đúng seasonal pattern.*

### Nhận định từ model

| Query | Xu hướng | Insight |
|---|---|---|
| 🟢 khách sạn đà nẵng | **+80.5%** | Nội địa tăng rất mạnh |
| 🟢 vé máy bay đà nẵng | +32.3% | Nhu cầu đi lại tăng |
| 🟢 bà nà hills | +31.9% | Điểm đến hot |
| 🟢 du lịch đà nẵng | +28.0% | Trend chung tăng |
| 🔴 da nang travel (EN) | -29.8% | Khách quốc tế giảm nhẹ |
| 🔴 vietnam beach | -21.3% | Có thể do căng thẳng địa chính trị |

**Insight:** Khách nội địa đang dẫn dắt tăng trưởng. Khách quốc tế giảm nhẹ — có thể do bất ổn địa chính trị toàn cầu (căng thẳng Iran). Khuyến nghị: focus marketing nội địa, tăng giá phòng mùa hè, tuyển thêm seasonal staff.

![Dashboard](/assets/images/timesfm/dashboard.png)
*Dashboard tổng hợp: 11 queries + lượng khách + thời tiết Đà Nẵng*

---

## 5. Benchmark: TimesFM vs 6 model truyền thống

Để đánh giá công bằng, tôi chạy **walk-forward backtest** (3 splits, horizon 6 tháng) trên data lượng khách hàng tháng:

![Benchmark](/assets/images/timesfm/benchmark_visitors.png)

### Kết quả

| Rank | Model | MAE | MAPE | Dir Acc | Thời gian |
|---|---|---|---|---|---|
| 🥇 | **Holt-Winters** | 113.35 | 12.05% | 80% | 123ms |
| 🥈 | **Seasonal Naive** | 116.67 | 11.60% | 80% | 0ms |
| 🥉 | Moving Average | 141.67 | 13.38% | 20% | 0ms |
| 4 | **TimesFM 2.5** | 162.11 | 14.53% | **80%** | 229ms |
| 5 | Auto-ARIMA | 188.83 | 16.99% | 40% | 905ms |
| 6 | Naive | 225.00 | 20.14% | 20% | 0ms |
| 7 | Prophet | 359.43 | 37.64% | 40% | 544ms |

### Phân tích

**Holt-Winters thắng** — hợp lý vì:
- Data có seasonal pattern **cực kỳ rõ** (mùa hè vs mùa mưa)
- Chỉ 32 datapoints (monthly) — ít → model truyền thống chuyên seasonality chiếm ưu thế
- Holt-Winters được **thiết kế đúng** cho bài toán trend + seasonality

**TimesFM 2.5 xếp thứ 4** nhưng đáng chú ý:
- **Directional Accuracy = 80%** — ngang top, đoán đúng hướng tăng/giảm
- **Zero-shot hoàn toàn** — không cần config, tuning, hay chọn hyperparameters
- Đánh bại **Auto-ARIMA** (cần grid search) và **Prophet** (Meta)
- Gap 43% MAE vs best — chấp nhận được cho model không train trên domain

**Prophet tệ nhất** — 32 datapoints quá ít cho Prophet hoạt động tốt.

### Khi nào dùng gì?

| Điều kiện | Model tốt nhất |
|---|---|
| Monthly, seasonal rõ, ít điểm | **Holt-Winters** |
| Daily/weekly, nhiều điểm (>200) | **TimesFM 2.5** |
| Không biết gì về data, cần nhanh | **TimesFM 2.5** (zero-shot) |
| Cần interpretability | **ARIMA** |
| Multi-seasonality + holidays | **Prophet** (cần >2 năm data) |

---

## 6. Kết luận

### TimesFM 2.5 — Đánh giá

**Điểm mạnh:**
- 🟢 Zero-shot: chạy ngay, không cần train hay tuning
- 🟢 Đa năng: 1 model cho mọi loại time series
- 🟢 Quantile forecast: confidence intervals miễn phí
- 🟢 Fast: ~2s cho 11 queries trên MacBook Air M1

**Điểm yếu:**
- 🔴 Thua model truyền thống trên data ít điểm + seasonal rõ
- 🔴 Không train trên financial data → stock forecast yếu
- 🔴 Cần PyTorch + HuggingFace (nặng hơn statsmodels)

### MVP Du lịch Đà Nẵng — Lessons Learned

1. **Google Trends = leading indicator tuyệt vời** — khách search trước khi đến
2. **TimesFM + Google Trends = match hoàn hảo** — đúng domain training
3. **Luôn benchmark** — đừng assume model mới = tốt hơn
4. **Kết hợp** — dùng TimesFM cho daily trends (mạnh), Holt-Winters cho monthly visitors (mạnh hơn)

### Source Code

- **MVP:** [github.com/phanngoc/danang-tourism-forecast](https://github.com/phanngoc/danang-tourism-forecast)
- **TimesFM:** [github.com/google-research/timesfm](https://github.com/google-research/timesfm)
- **Paper:** [arxiv.org/abs/2310.10688](https://arxiv.org/abs/2310.10688)

---

*Viết bởi Ngoc Phan — Đà Nẵng, 04/2026*
