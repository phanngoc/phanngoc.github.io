---
layout: "post"
title: "Bypass Anti-Bot Bằng Chính Trình Duyệt Thật: Kiến Trúc Chrome Extension + Local Proxy Crawl Shopee"
date: "2026-03-19 10:00:00 +0700"
tags: ["web-scraping", "chrome-extension", "shopee", "python", "sqlite", "browser-automation", "anti-bot"]
math: false
---

> **Disclaimer:** Bài viết này hoàn toàn mang tính nghiên cứu kỹ thuật. Hãy tôn trọng Terms of Service của các nền tảng bạn tương tác.

---

Ở [bài trước]({% post_url 2026-03-17-shopee-anti-bot-analysis %}), tôi đã mổ xẻ toàn bộ hệ thống anti-bot của Shopee — 6 lớp phòng thủ từ TLS fingerprint đến behavioral analysis — và kết luận rằng **không có giải pháp free nào bypass được ở scale**.

Nhưng bài đó bỏ sót một insight quan trọng: **điều gì xảy ra nếu chúng ta không cần bypass bất kỳ lớp nào?**

Thay vì giả mạo browser, giả mạo hành vi người dùng, rotate proxy đắt tiền — tại sao không dùng luôn **browser thật của bạn**? Mọi cookie, mọi fingerprint, mọi behavioral signal đều 100% authentic. Chúng ta chỉ cần một cách để "nghe lén" các API call mà browser đang thực hiện.

Đó là ý tưởng đằng sau `shopee-proxy` — một hệ thống **zero-bypass crawling** dùng Chrome Extension làm network sniffer, local Python server làm data sink, và SQLite làm storage.

---

## Vấn Đề Gốc Rễ Với Mọi Crawler Truyền Thống

Trước khi vào architecture, hãy hiểu tại sao approach thông thường thất bại.

Khi bạn dùng `requests`, Playwright, hay Selenium để crawl Shopee, bạn đang cố gắng **impersonate** một browser. Shopee detect impersonation thông qua:

```
[Your bot]
    ├── TLS fingerprint ≠ real Chrome → BLOCK
    ├── Canvas hash = known headless hash → BLOCK  
    ├── Mouse patterns = too uniform → CAPTCHA
    ├── IP = datacenter/proxy → rate limit
    └── Session tokens = stale/stolen → REVOKE
```

Mỗi lớp detection là một signal độc lập. Bypass 5/6 vẫn bị block.

**Insight:** Thay vì impersonate browser, hãy *là* browser. Chỉ cần thêm một lớp ở giữa để capture data mà browser đang fetch.

```
[Real Chrome, thật 100%]
    ├── TLS fingerprint = real Chrome ✅
    ├── Canvas hash = real GPU ✅
    ├── Mouse patterns = bạn đang dùng chuột thật ✅
    ├── IP = IP nhà bạn ✅
    └── Session tokens = thật, fresh ✅
    │
    └── [Chrome Extension] ← chúng ta chỉ thêm cái này
            │ intercept API responses
            ▼
    [Local Python Server]
            │ parse + store
            ▼
    [SQLite Database]
```

---

## Kiến Trúc Tổng Thể

Hệ thống gồm 2 phần chạy song song:

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Browser                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Web Page (MAIN world)                │    │
│  │                                                      │    │
│  │  window.fetch()    ←── intercepted by injector.js   │    │
│  │  XMLHttpRequest()  ←── intercepted by injector.js   │    │
│  │                                                      │    │
│  │  Khi có API response → window.postMessage(payload)  │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │ postMessage                    │
│  ┌──────────────────────────▼──────────────────────────┐    │
│  │            Content Script (ISOLATED world)           │    │
│  │                      bridge.js                       │    │
│  │                                                      │    │
│  │  Nhận postMessage → chrome.runtime.sendMessage()    │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │ chrome.runtime message         │
│  ┌──────────────────────────▼──────────────────────────┐    │
│  │                  background.js                       │    │
│  │              (Service Worker, MV3)                   │    │
│  │                                                      │    │
│  │  Nhận message → đính kèm cookies → POST /capture    │    │
│  └──────────────────────────┬──────────────────────────┘    │
└───────────────────────────────────────────────────────────   │
                              │ HTTP POST localhost:9234
┌─────────────────────────────▼───────────────────────────┐
│                     proxy.py                             │
│                 (Python HTTP Server)                     │
│                                                          │
│  Nhận payload → parse recommend_v2 / search_items       │
│  → INSERT OR IGNORE INTO products                        │
│                    │                                     │
│                    ▼                                     │
│              products.db (SQLite)                        │
└──────────────────────────────────────────────────────────┘
```

4 components, mỗi cái một trách nhiệm rõ ràng. Hãy đi sâu vào từng phần.

---

## Component 1: injector.js — Monkey-Patch Fetch/XHR

Đây là "trái tim" của extension. File này được inject vào **MAIN world** của trang web — nghĩa là nó chạy trong cùng execution context với JavaScript của Shopee, có thể override các global APIs.

```javascript
// injector.js — chạy trong MAIN world của trang
(function () {
  if (window.__shopeeCapture) return;  // chống inject lại
  window.__shopeeCapture = true;

  // Intercept fetch
  const _fetch = window.fetch;  // lưu bản gốc
  window.fetch = async function (...args) {
    const [input, init] = args;
    const url = typeof input === "string" ? input : input?.url || "";

    // Chỉ capture các API call
    if (!isApi(url)) return _fetch.apply(this, args);

    // Gọi fetch thật
    const resp = await _fetch.apply(this, args);
    
    // Clone response để đọc body (response body chỉ đọc được 1 lần)
    const clone = resp.clone();
    clone.text().then((body) => {
      emit({
        method, url,
        timestamp: new Date().toISOString(),
        requestBody: reqBody,
        responseStatus: resp.status,
        responseBody: body,  // full response body
      });
    });

    return resp;  // trả về response gốc cho Shopee
  };
})();
```

**Tại sao clone response?** `Response.body` là ReadableStream — chỉ có thể đọc một lần. Nếu chúng ta đọc nó trước, Shopee code sẽ nhận về stream rỗng. `resp.clone()` tạo bản sao để chúng ta đọc riêng mà không ảnh hưởng đến luồng chính.

**Tương tự với XHR:**

```javascript
// Patch XMLHttpRequest
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._cap = { method: method.toUpperCase(), url, headers: {} };
  return _open.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function (body) {
  if (this._cap && isApi(this._cap.url)) {
    this.addEventListener("load", function () {
      emit({
        url: this._cap.url,
        responseBody: this.responseText,  // XHR thì dễ hơn
        // ...
      });
    });
  }
  return _send.call(this, body);
};
```

---

## Component 2: Chrome Extension World Isolation

Chrome Extension MV3 có một security model quan trọng cần hiểu: **world isolation**.

```
┌─────────────────────────────────────────┐
│             Chrome Tab                   │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │    MAIN world                   │    │
│  │    - Shopee's JavaScript        │    │
│  │    - window.fetch (original)    │    │
│  │    - injector.js ← inject vào đây│   │
│  └──────────────┬──────────────────┘    │
│                 │ window.postMessage     │
│  ┌──────────────▼──────────────────┐    │
│  │    ISOLATED world               │    │
│  │    - Content scripts (bridge.js)│    │
│  │    - Có chrome.* API            │    │
│  │    - Không có window.fetch thật │    │
│  └──────────────┬──────────────────┘    │
│                 │ chrome.runtime.sendMessage
└─────────────────│───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Service Worker (background.js)          │
│  - Chạy ngoài tab                        │
│  - Có chrome.cookies API                 │
│  - Có fetch() để call localhost          │
└──────────────────────────────────────────┘
```

**Tại sao cần bridge.js?**

Content scripts chạy trong ISOLATED world — họ không thể đọc/ghi `window` của trang web. Nhưng cả MAIN world lẫn ISOLATED world đều nhận `window.postMessage` từ cùng origin.

Đây là cách data flow:
1. `injector.js` (MAIN) gọi `window.postMessage({ type: "__SHOPEE_CAPTURE__", payload })`
2. `bridge.js` (ISOLATED) lắng nghe `window.addEventListener("message", ...)`
3. `bridge.js` forward qua `chrome.runtime.sendMessage()`
4. `background.js` (Service Worker) nhận và POST lên localhost

```javascript
// bridge.js — đơn giản nhưng critical
window.addEventListener("message", (event) => {
  if (event.source !== window) return;  // chỉ nhận từ cùng tab
  if (event.data?.type !== "__SHOPEE_CAPTURE__") return;  // filter đúng type
  
  try {
    chrome.runtime.sendMessage({ action: "capture", data: event.data.payload });
  } catch (e) {
    // Extension context có thể bị invalidate khi reload extension
    // Ignore để tránh crash
  }
});
```

---

## Component 3: background.js — Cookie Enrichment + HTTP Forward

Background script có quyền truy cập `chrome.cookies` API — thứ mà content script không có. Trước khi POST lên local server, nó đính kèm toàn bộ cookies của `.shopee.vn`:

```javascript
// background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== "capture") return;

  // Lấy toàn bộ cookies shopee.vn
  chrome.cookies.getAll({ domain: ".shopee.vn" }, (cookies) => {
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    
    const enriched = { 
      ...message.data,    // original payload (url, method, body, headers)
      cookies: cookieStr  // thêm cookies vào
    };

    // POST lên local proxy server
    fetch("http://localhost:9234/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enriched),
    });
  });
});
```

**Một điểm thú vị về SPA navigation:** Shopee là Single Page Application dùng React. Khi bạn navigate giữa các trang, URL thay đổi nhưng không có full page reload. injector.js có thể bị mất sau navigation.

background.js handle điều này bằng cách lắng nghe `chrome.webNavigation.onHistoryStateUpdated` — event này fire mỗi khi SPA thay đổi URL qua History API:

```javascript
// Re-inject khi SPA navigate
chrome.webNavigation?.onHistoryStateUpdated?.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["injector.js"],
      world: "MAIN",
    });
  },
  { url: [{ hostContains: "shopee.vn" }] }
);
```

---

## Component 4: proxy.py — Parse, Deduplicate, Store

Python HTTP server nhận POST requests từ extension và parse data ra 2 API format khác nhau.

### Shopee có 2 API trả về sản phẩm:

**1. `recommend/recommend_v2`** — dùng cho category pages, có structure phức tạp hơn:

```python
def parse_recommend_product(unit: dict) -> dict | None:
    item = unit.get("item", {})
    asset = item.get("item_card_displayed_asset", {})  # display data
    item_data = item.get("item_data", {})  # raw data

    # Lấy item_id từ tracking_card_id
    # Format: "TYPE::SHOPID::ITEMID"
    tid = unit.get("tracking_card_id", "")
    item_id = tid.split("::")[-1] if "::" in tid else ""

    # Price được store dưới dạng integer * 100000
    price_raw = asset.get("display_price", {}).get("price", 0)
    price = price_raw / 100000  # convert về VND thật

    return {
        "item_id": item_id,
        "name": asset.get("name", ""),
        "price": price,
        # ...
    }
```

**2. `search/search_items`** — dùng cho search results, structure đơn giản hơn:

```python
def parse_search_product(item: dict) -> dict | None:
    item_basic = item.get("item_basic") or item
    item_id = str(item_basic.get("itemid", ""))

    price = item_basic.get("price", 0) / 100000
    
    # Sold count formatting
    historical_sold = item_basic.get("historical_sold", 0)
    if historical_sold >= 1000:
        sold_text = f"Đã bán {historical_sold // 1000}k+"
    else:
        sold_text = f"Đã bán {historical_sold}" if historical_sold else ""

    # Seller type
    if item_basic.get("is_official_shop"):
        seller_type = "MALL"
    elif item_basic.get("shopee_verified"):
        seller_type = "PREFERRED"

    return { "item_id": item_id, "price": price, "sold": sold_text, ... }
```

### SQLite với `INSERT OR IGNORE` — deduplication tự động:

```python
def init_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            item_id TEXT PRIMARY KEY,  -- PRIMARY KEY đảm bảo unique
            shop_id TEXT,
            name TEXT,
            price REAL,
            original_price REAL,
            discount TEXT,
            sold TEXT,
            seller_type TEXT,
            image TEXT,
            images TEXT,       -- JSON array
            url TEXT,
            category_id TEXT,
            captured_at TEXT
        )
    """)
    return conn

def insert_products(products: list[dict], cat_id: str) -> int:
    for p in products:
        conn.execute(
            """INSERT OR IGNORE INTO products (...)  -- bỏ qua nếu item_id đã tồn tại
               VALUES (?, ?, ?, ...)""",
            (...),
        )
    conn.commit()
```

`INSERT OR IGNORE` kết hợp với `PRIMARY KEY` trên `item_id` tự động handle deduplication — cùng một sản phẩm xuất hiện ở nhiều pages/categories chỉ được lưu một lần.

---

## manifest.json — Minimum Permissions

Extension request đúng permissions cần thiết, không hơn:

```json
{
  "manifest_version": 3,
  "name": "Shopee Network Capture",
  "version": "2.2",
  "permissions": [
    "scripting",      // để inject injector.js vào MAIN world
    "tabs",           // để detect tab navigation
    "webNavigation",  // để detect SPA history changes
    "cookies"         // để đọc shopee.vn cookies
  ],
  "host_permissions": ["*://*.shopee.vn/*"],  // chỉ trên shopee.vn
  "background": {
    "service_worker": "background.js"  // MV3: service worker thay cho background page
  },
  "content_scripts": [{
    "matches": ["*://*.shopee.vn/*"],
    "js": ["bridge.js"],
    "run_at": "document_start"  // inject sớm nhất có thể
  }]
}
```

---

## Workflow Thực Tế

### 1. Khởi động server

```bash
pip install rich
python3 proxy.py --db products.db --port 9234
```

Output:
```
╭─────────────────────────────────────────╮
│          Shopee Product Proxy           │
│ Server:   http://localhost:9234         │
│ Database: /path/products.db (0 products)│
│ Captures: recommend_v2 + search_items  │
╰─────────────────────────────────────────╯

Listening... Browse Shopee category pages.
```

### 2. Load Extension

`chrome://extensions` → Developer mode → Load unpacked → chọn thư mục `extension/`

### 3. Browse Shopee bình thường

Mở bất kỳ category page nào, scroll:

```
  # 1  GET 200 /api/v4/recommend/recommend_v2
       ＋48 new (0 dupes, 48 parsed, 48 in DB)
  # 2  GET 200 /api/v4/recommend/recommend_v2
       ＋0 new (48 dupes, 48 parsed, 48 in DB)
  # 3  POST 200 /api/v4/recommend/recommend_v2
       ＋52 new (3 dupes, 55 parsed, 100 in DB)
  # 4  GET 200 /api/v4/search/search_items
       ＋24 new (0 dupes, 24 parsed, 124 in DB)
```

### 4. Query data

```bash
sqlite3 products.db "
  SELECT name, printf('%.0f', price) as price, discount, sold
  FROM products
  WHERE seller_type = 'MALL'
  ORDER BY price DESC
  LIMIT 10;
"
```

Hoặc trong Python:

```python
import sqlite3, json

conn = sqlite3.connect("products.db")

# Top sản phẩm discount cao nhất
results = conn.execute("""
    SELECT name, price, original_price, discount
    FROM products
    WHERE original_price IS NOT NULL
    ORDER BY (original_price - price) DESC
    LIMIT 20
""").fetchall()

for name, price, orig, disc in results:
    print(f"{name[:40]} | {price:,.0f}đ | {disc}")
```

---

## Xử Lý Edge Cases

### Anti-bot Response (error code 90309999)

Shopee đôi khi trả về response với error code này khi phát hiện bất thường. proxy.py check và skip:

```python
if "90309999" in resp_body:
    console.print("[red]BLOCKED (anti-bot)[/]")
    return 0, 0
```

Trong thực tế với approach này (browser thật), bạn rất hiếm gặp error này vì mọi request đều đến từ session hợp lệ của bạn.

### SPA Navigation — Re-inject

Shopee SPA thay đổi URL mà không reload page. background.js inject lại injector.js mỗi khi detect history state change:

```javascript
chrome.webNavigation?.onHistoryStateUpdated?.addListener(
  (details) => {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["injector.js"],
      world: "MAIN",
    });
  },
  { url: [{ hostContains: "shopee.vn" }] }
);
```

Guard `if (window.__shopeeCapture) return;` trong injector.js đảm bảo nếu đã inject rồi thì không patch lại (tránh double-patch fetch/XHR).

### Extension Context Invalidated

Khi bạn reload extension trong `chrome://extensions`, Service Worker bị restart nhưng content scripts trong các tab đang mở thì không. `chrome.runtime.sendMessage()` trong bridge.js lúc này sẽ throw error.

```javascript
try {
  chrome.runtime.sendMessage({ action: "capture", data: event.data.payload });
} catch (e) {
  // Extension context invalidated — bỏ qua, không crash page
}
```

---

## Crawl.py — Standalone Extractor Từ JSON Log

Ngoài real-time capture, có thể export network log từ Chrome DevTools và parse offline:

```python
# crawl.py
def extract_from_log(log_file: str) -> list[dict]:
    with open(log_file) as f:
        data = json.load(f)

    all_products = []
    seen_ids = set()

    for r in data:
        url = r.get("url", "")
        if "recommend/recommend_v2" not in url:
            continue

        resp_body = r.get("response_body", "")
        if not resp_body or "90309999" in resp_body:
            continue

        resp = json.loads(resp_body)
        units = resp.get("data", {}).get("units", [])
        
        for u in units:
            product = parse_product(u)
            if product and product["item_id"] not in seen_ids:
                seen_ids.add(product["item_id"])
                all_products.append(product)

    return all_products
```

Dùng khi bạn đã có sẵn `network_log.json` (export từ DevTools → Network → Save all as HAR):

```bash
python3 crawl.py --log network_log.json --output products.json
```

---

## So Sánh Với Các Approach Khác

| Approach | Setup | Anti-bot Risk | Scale | Cost |
|----------|-------|--------------|-------|------|
| **requests/httpx** | Đơn giản | Rất cao | Thấp | Free |
| **Playwright headless** | Trung bình | Cao | Trung bình | Free |
| **Playwright + residential proxy** | Phức tạp | Thấp | Cao | $$$ |
| **Extension + local proxy (approach này)** | Trung bình | Gần bằng 0 | Trung bình* | Free |

**\*Scale limitation:** Approach này yêu cầu bạn browse thủ công hoặc có browser đang chạy thật. Không tự động hoàn toàn như headless crawler. Phù hợp với data collection có giám sát, không phải autonomous scraping 24/7.

---

## Giới Hạn Và Khi Nào Nên Dùng

**Phù hợp khi:**
- Cần data chất lượng cao, không lo bị block
- Dataset size vừa phải (vài ngàn đến vài chục ngàn sản phẩm)
- Có thể để browser chạy trong vài giờ
- Muốn lấy data từ nhiều categories khác nhau

**Không phù hợp khi:**
- Cần crawl 1 triệu+ sản phẩm một cách autonomous
- Cần schedule tự động không cần người dùng
- Production pipeline không có human supervision

**Extension vào approach tốt hơn:**
- Thêm auto-pagination: inject JavaScript để tự click "next page" sau mỗi N giây
- Kết hợp với category list để system hướng dẫn bạn browse đúng trang
- Add price tracking: so sánh price giữa các lần capture để detect price changes

---

## Kết Luận

Đôi khi giải pháp tốt nhất không phải là đánh trực tiếp vào vấn đề — mà là **đi vòng quanh nó**.

Thay vì chiến đấu với 6 lớp anti-bot của Shopee bằng proxy đắt tiền, fingerprint spoofing, và behavior simulation phức tạp, hệ thống này tận dụng một sự thật đơn giản: **browser thật của bạn đã vượt qua tất cả các lớp đó rồi**. Chúng ta chỉ cần một cái "tai nghe" gắn vào.

Kiến trúc này dạy chúng ta một bài học quan trọng về system design: **luôn hỏi "có gì sẵn có mà ta có thể tận dụng không?" trước khi bắt đầu build từ đầu**.

Data pipeline đơn giản nhất thường là data pipeline tốt nhất.

---

**Source code:** [github.com/phanngoc/shopee-proxy](https://github.com/phanngoc/shopee-proxy)

*Xem thêm: [Giải Mã Hệ Thống Anti-Bot Của Shopee]({% post_url 2026-03-17-shopee-anti-bot-analysis %}) — phân tích 6 lớp phòng thủ và 10 lần thất bại.*
