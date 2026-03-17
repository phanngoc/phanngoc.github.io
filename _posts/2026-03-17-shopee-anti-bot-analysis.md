---
layout: "post"
title: "Giải Mã Hệ Thống Anti-Bot Của Shopee: Từ Góc Nhìn Của Một Developer Vừa Bị Chặn"
date: "2026-03-17 14:00:00 +0700"
tags: ["web-scraping", "anti-bot", "playwright", "shopee", "security", "browser-automation"]
math: false
---

> **Disclaimer:** Bài viết này được viết với mục đích nghiên cứu kỹ thuật. Tất cả các thử nghiệm được thực hiện trên dữ liệu public. Hãy tôn trọng ToS của các nền tảng.

---

Tôi vừa mất 3 giờ chiến đấu với hệ thống anti-bot của Shopee để crawl danh sách sản phẩm điện thoại. Kết quả: chỉ crawl được ~250 sản phẩm trước khi bị chặn hoàn toàn. Nhưng trong quá trình đó, tôi học được rất nhiều thứ thú vị về cách Shopee bảo vệ platform của họ.

Đây là bài phân tích chi tiết — dành cho những developer muốn hiểu **anti-bot hoạt động như thế nào ở cấp độ thực tế**.

---

## Bức Tranh Tổng Thể: Shopee Dùng Gì?

Qua quan sát các network requests và response patterns, Shopee triển khai **nhiều lớp bảo vệ** chồng chéo lên nhau:

```
Request → [Layer 1: TLS Fingerprint] → [Layer 2: IP Reputation] 
        → [Layer 3: Bot Behavior] → [Layer 4: Session Token] 
        → [Layer 5: Canvas/WebGL Fingerprint] → Response
```

Không có layer nào là "magic bullet" — chính sự **kết hợp nhiều signals** mới tạo nên độ khó.

---

## Layer 1: TLS Fingerprinting (JA3/JA4)

Đây là thứ đầu tiên tôi gặp phải và không nhận ra ngay.

Khi một browser connect tới HTTPS server, quá trình TLS handshake tạo ra một **fingerprint độc nhất** dựa trên:
- Cipher suites được đề xuất (và thứ tự)
- TLS extensions
- Elliptic curves và point formats

Tools như **curl**, **requests** (Python), hay Playwright Chromium có JA3 hash khác với real Chrome. Shopee detect điều này ở connection layer — **trước khi nhìn vào HTTP headers**.

```python
# requests library JA3: 771,4866-4867-4865-...,0-23-65281-...
# real Chrome JA3:      771,4866-4867-4865-...,0-23-65281-... (khác order)
```

**Cách Playwright Firefox thoát được:** Firefox có TLS profile khác hoàn toàn với Chromium và giống với real Firefox traffic. Đó là lý do `p.firefox.launch()` hoạt động còn `p.chromium.launch()` bị block ngay.

---

## Layer 2: IP Reputation & Rate Limiting

Đây là layer chặn tôi nhiều nhất — và đây là những gì tôi quan sát được:

**Signal 1: AS Number**
Data center IPs (AWS, GCP, DigitalOcean) bị rate-limit cực gắt. Shopee trace AS number của IP và assign "trust score" thấp hơn cho cloud IPs.

**Signal 2: Request velocity**
Phân tích response thực tế cho thấy pattern:
- Request 1-2: OK ✅
- Request 3: `verify/captcha` ❌

Đây không phải threshold đơn giản — Shopee tracking **velocity per IP per time window** với sliding window, không phải fixed counter.

**Signal 3: Shared IP history**
Nếu IP đó từng được dùng để spam/scrape trước đây, nó sẽ bị "pre-flagged". Public proxy lists thường toàn IPs đã bị blacklist.

```
# Thực tế từ crawl session của tôi:
Page 1: OK (60 products)
Page 2: verify/captcha
↳ Restart browser + re-inject cookies: OK
Page 3: verify/captcha (permanent)
↳ Browser restart: vẫn block
```

Pattern này cho thấy IP bị "cool down" sau N requests — không phải session-based.

---

## Layer 3: Behavioral Fingerprinting

Layer này tinh vi nhất và khó bypass nhất. Shopee collect các signals sau **trong JavaScript**:

### Mouse Movement Entropy

Real users có mouse movement với **Gaussian noise** — cursor không bao giờ di chuyển thẳng tuyến tính. Automation tools tạo ra movement patterns quá "đều":

```javascript
// Bot: perfect straight line
mousemove(100,100) → mousemove(200,200) → mousemove(300,300)

// Human: có micro-jitter, acceleration/deceleration
mousemove(100,100) → mousemove(143,152) → mousemove(198,201) → ...
```

Tôi đã implement `human_mouse_wiggle()` để simulate điều này, nhưng chưa đủ — cần thêm **Bezier curves** và velocity modeling.

### Scroll Pattern

Shopee detect scroll bằng cách measure:
- Time between scroll events
- Delta per event (humans scroll in non-uniform chunks)
- Pause patterns (humans dừng lại để đọc)

```python
# Human-like scroll implementation của tôi:
async def human_scroll(page):
    for scroll_pct in [20, 40, 60, 80, 100]:
        await page.evaluate(f"window.scrollTo({{top: ..., behavior: 'smooth'}})")
        await asyncio.sleep(random.uniform(0.15, 0.45))
        if random.random() < 0.15:  # đọc content
            await asyncio.sleep(random.uniform(0.5, 1.5))
```

Điều thú vị: `behavior: 'smooth'` trong JS thực ra **giúp** bypass detection vì nó tạo ra nhiều intermediate scroll events như human.

### Event Timing Distribution

Browser automation thường trigger events với timing quá đều. Real users có **timing jitter** theo phân phối log-normal:

```
Bot timing:    [100ms, 100ms, 100ms, 100ms]  ← quá đều
Human timing:  [87ms, 134ms, 92ms, 201ms]    ← log-normal distribution
```

---

## Layer 4: Session Token Architecture

Đây là discovery thú vị nhất. Shopee dùng 2 loại tokens:

**`SPC_F`** — Device fingerprint token, tồn tại lâu dài
**`SPC_EC`** — Session encryption token, expire nhanh

Khi tôi inspect cookies sau khi bị captcha:

```
SPC_EC: [encrypted blob, ~256 chars]  ← bị invalidate server-side
SPC_F:  [shorter token]               ← vẫn valid nhưng bị flag
```

Vấn đề: ngay cả khi re-inject cookies từ real Chrome profile, server đã **revoke `SPC_EC`** sau khi detect automation. Re-inject cookies cũ không giúp được gì vì server-side state đã thay đổi.

Đây là kiến trúc **stateful session validation** — token validity được check ở server, không chỉ ở client.

---

## Layer 5: Canvas & WebGL Fingerprinting

Shopee run JavaScript để lấy canvas fingerprint:

```javascript
// Shopee's fingerprinting code (deobfuscated pattern)
var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
ctx.fillText('Shopee fingerprint', 10, 10);
var hash = canvas.toDataURL(); // unique per GPU/driver/OS
```

Playwright Chromium headless có một **known canvas fingerprint** mà Shopee đã blacklist. Firefox có fingerprint khác — đó là lý do Firefox hoạt động ban đầu.

Tuy nhiên, sau vài requests, **behavioral signals** (mouse, scroll, timing) override cả canvas fingerprint.

---

## Layer 6: The Honeypot — `verify/traffic/error`

URL này rất thú vị:

```
https://shopee.vn/verify/traffic/error?
  home_url=https://shopee.vn
  &is_logged_in=false
  &tracking_id=676960ddb3-5467-4771-a88e-230f1195c66d
```

`tracking_id` là một **correlation ID** — Shopee dùng nó để link request này với toàn bộ session history của IP/fingerprint combination. Một khi bị assign tracking_id này, **mọi request tiếp theo từ IP đó** đều bị route qua verification flow, bất kể browser hay cookies.

---

## Cái Gì Thực Sự Hoạt Động

Từ quá trình thử nghiệm, đây là ranking của các techniques:

| Technique | Bypass rate | Notes |
|-----------|-------------|-------|
| Firefox (vs Chromium) | ⭐⭐⭐⭐ | TLS + canvas fingerprint khác |
| Real Chrome cookies | ⭐⭐⭐ | Bypass login check, không bypass IP |
| Human scroll/mouse | ⭐⭐ | Delay detection, không prevent |
| Browser restart | ⭐⭐ | New fingerprint, same IP → still flagged |
| Free proxy lists | ⭐ | Đều bị pre-blacklist |
| Residential proxy | ⭐⭐⭐⭐⭐ | Real ISP IP → bypass IP reputation |
| TOR | ⭐⭐ | Exit nodes thường bị blacklist |

**Pattern thực tế:** Shopee cho phép ~1-3 pages per IP per time window trước khi captcha. Với residential proxy rotation (mỗi request/IP khác nhau), bạn bypass được layer IP hoàn toàn.

---

## Architecture Của Một Crawler Thực Sự Bypass Được

Nếu phải thiết kế lại từ đầu, đây là architecture tôi sẽ dùng:

```
┌─────────────────────────────────────────────────┐
│                  Crawler Core                    │
│                                                  │
│  Playwright Firefox (TLS fingerprint ✅)         │
│       + Real Chrome Cookies (session ✅)         │
│       + Human Behavior Engine (behavioral ✅)   │
│                    │                             │
│                    ▼                             │
│         Residential Proxy Rotator               │
│    (new IP per page, ISP-grade trust ✅)        │
│                    │                             │
│                    ▼                             │
│              Shopee.vn ✅                        │
└─────────────────────────────────────────────────┘
```

**Human Behavior Engine** cần implement:
1. **Bezier curve mouse movement** — không phải random wiggle
2. **Log-normal timing distribution** cho keyboard/click events
3. **Realistic scroll with reading pauses** — dừng lại ở product cards
4. **Random viewport interactions** — hover qua filters, không chỉ scroll thẳng

---

## Lesson Learned: Shopee Không Chỉ Detect Bot, Họ Detect Patterns

Điều tôi nhận ra sau cùng: Shopee không nhìn vào từng request riêng lẻ. Họ build **behavioral profile** theo thời gian:

- Session mở lúc nào?
- Có xem trang chủ trước không?
- Click vào category hay vào thẳng URL?
- Dừng lại bao lâu ở mỗi trang?
- Có interact với search/filter không?

Real users không mở thẳng `?page=5&sortBy=pop`. Họ vào trang chủ, search, filter, rồi mới pagination. Một crawler "hoàn hảo" phải simulate **toàn bộ user journey**, không chỉ từng request.

---

## Kết Luận

Shopee đã đầu tư nghiêm túc vào anti-bot — đây là hệ thống multi-layer với từng layer bắt một loại attacker khác nhau:

- **Script kiddies** → bị chặn bởi TLS fingerprint
- **Basic Selenium/Playwright** → bị chặn bởi canvas fingerprint + IP reputation
- **Sophisticated bots** → bị chặn bởi behavioral analysis
- **Residential proxies** → bị chặn bởi CAPTCHA + rate limiting

Hệ thống này không "unhackable" — nhưng chi phí để bypass nó (residential proxy ~$15-50/tháng, sophisticated behavior engine vài ngày dev) đủ để filter 99% attackers.

Từ góc nhìn defensive, đây là một case study xuất sắc về **defense in depth** cho web application. Từ góc nhìn offensive... well, biết địch biết ta, trăm trận trăm thắng 🙂

---

**Source code** của crawler (Python + Playwright + proxy rotation): [github.com/phanngoc/shopee-crawler](https://github.com/phanngoc/shopee-crawler)
