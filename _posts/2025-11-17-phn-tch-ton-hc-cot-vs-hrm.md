---
layout: "post"
title: "Phân tích Toán học: CoT vs HRM"
date: "2025-11-17 14:42:53 +0700"
tags: ["hrm", "cot"]
math: false
---

## 1. Chain of Thought (CoT) - Mô hình Tuần tự

### Định nghĩa toán học

CoT là một **chuỗi ánh xạ tuần tự**:

```
f_CoT: X → Y₁ → Y₂ → ... → Yₙ → Z

hoặc: Z = fₙ(fₙ₋₁(...f₂(f₁(X))))
```

Với:
- `X`: Input ban đầu
- `Yᵢ`: Intermediate reasoning step thứ i
- `Z`: Output cuối cùng
- `fᵢ`: Function transformation tại bước i

### Công thức xác suất

```
P(Y₁, Y₂, ..., Yₙ, Z | X) = P(Y₁|X) × P(Y₂|Y₁,X) × ... × P(Z|Yₙ,X)

                           = ∏ᵢ₌₁ⁿ P(Yᵢ|Y₁...Yᵢ₋₁,X) × P(Z|Y₁...Yₙ,X)
```

**Markov Property**: Mỗi bước chỉ phụ thuộc vào bước trước:
```
P(Yᵢ|Y₁...Yᵢ₋₁,X) ≈ P(Yᵢ|Yᵢ₋₁,X)
```

### Example: Giải phương trình bậc 2

**Đề bài**: Giải `2x² - 8x + 6 = 0`

**Step-by-step calculation**:

```
Input X = "2x² - 8x + 6 = 0"

Step 1 (Y₁): Xác định a, b, c
    f₁(X) → Y₁ = {a=2, b=-8, c=6}
    P(Y₁|X) = 0.95

Step 2 (Y₂): Tính discriminant Δ
    f₂(Y₁) → Y₂ = Δ = b² - 4ac = (-8)² - 4(2)(6) = 64 - 48 = 16
    P(Y₂|Y₁,X) = 0.92

Step 3 (Y₃): Tính √Δ
    f₃(Y₂) → Y₃ = √16 = 4
    P(Y₃|Y₂,Y₁,X) = 0.98

Step 4 (Y₄): Áp dụng công thức nghiệm
    f₄(Y₃,Y₁) → Y₄ = x = (-b ± √Δ) / 2a
    x₁ = (8 + 4) / 4 = 3
    x₂ = (8 - 4) / 4 = 1
    P(Y₄|Y₃,Y₂,Y₁,X) = 0.94

Output Z = {x₁=3, x₂=1}

Xác suất tổng: P(Z|X) = 0.95 × 0.92 × 0.98 × 0.94 ≈ 0.805
```

**Vấn đề**: Nếu sai ở bước 2, toàn bộ các bước sau đều sai (error propagation)

---

## 2. Hierarchical Reasoning Models (HRM) - Mô hình Phân tầng

### Định nghĩa toán học

HRM là một **hệ thống đa tầng tương tác**:

```
Level L (cao):   h^L = g_L(x, h^(L-1))         [Strategic planning]
Level L-1:       h^(L-1) = g_(L-1)(x, h^(L-2), h^L)  [Tactical]
...
Level 1 (thấp):  h^1 = g_1(x, h^2)             [Execution]

Output:          y = f(h^1, h^2, ..., h^L)
```

Với:
- `h^l`: Hidden representation ở tầng l
- `g_l`: Transform function của tầng l
- **Bidirectional flow**: Tầng cao điều khiển tầng thấp, tầng thấp feedback lên tầng cao

### Công thức xác suất (Hierarchical Bayesian)

```
P(y, h^1, ..., h^L | x) = P(h^L|x) × ∏ₗ₌₁^(L-1) P(h^l|h^(l+1),x) × P(y|h^1,...,h^L,x)
```

**Key difference**: Mỗi tầng phụ thuộc vào tầng trên (top-down guidance)

### Attention Mechanism trong HRM

```
α_l = softmax(W_q^l · h^(l+1))  // Attention từ tầng cao
h^l = ∑ᵢ α_l,i · Transform(x_i) + β · h^(l+1)
```

### Example: Tối ưu hóa Portfolio đầu tư

**Đề bài**: Phân bổ 100K USD vào 4 tài sản (Cổ phiếu, Trái phiếu, Vàng, Crypto) để tối đa hóa lợi nhuận với rủi ro < 15%

#### **Level 3 (Strategic) - Chiến lược tổng thể**

```
Input: X = {Budget=100K, Risk_tolerance=15%, Horizon=5years}

h³ = Strategic_Policy(X)
   = {
       Diversification_target: 4 assets,
       Risk_budget: [40%, 30%, 20%, 10%] per asset class,
       Return_target: 12% annual,
       Rebalance_frequency: quarterly
     }

P(h³|X) = 0.88
```

#### **Level 2 (Tactical) - Phân tích từng nhóm tài sản**

```
// Tầng 2 nhận guidance từ tầng 3
For each asset class in h³.Risk_budget:

h²_stocks = Tactical_Analysis(Stocks, h³)
    = {
        Allocation: 40K (40% of 100K),
        Sector_split: [Tech=15K, Health=12K, Finance=13K],
        Expected_return: 18%,
        Risk(σ): 22%,
        Sharpe_ratio: 0.82
      }
    P(h²_stocks|h³,X) = 0.85

h²_bonds = Tactical_Analysis(Bonds, h³)
    = {
        Allocation: 30K,
        Type_split: [Government=20K, Corporate=10K],
        Expected_return: 5%,
        Risk(σ): 8%,
        Sharpe_ratio: 0.63
      }
    P(h²_bonds|h³,X) = 0.92

h²_gold = {Allocation: 20K, Return: 7%, Risk: 12%, Sharpe: 0.58}
    P(h²_gold|h³,X) = 0.89

h²_crypto = {Allocation: 10K, Return: 35%, Risk: 45%, Sharpe: 0.78}
    P(h²_crypto|h³,X) = 0.75
```

#### **Level 1 (Execution) - Chi tiết cụ thể**

```
// Tầng 1 nhận cả guidance từ h³ và constraints từ h²

h¹_stocks = Execution_Plan(h²_stocks, h³)
    = {
        Buy: [AAPL: 30 shares @ $180 = $5.4K,
              MSFT: 25 shares @ $380 = $9.5K,
              NVDA: 50 shares @ $500 = $25K (overweight tech per h³ growth strategy),
              JNJ: 40 shares @ $160 = $6.4K,
              UNH: 25 shares @ $520 = $13K,
              JPM: 35 shares @ $150 = $5.25K,
              BAC: 120 shares @ $32 = $3.84K],
        Order_type: Limit orders,
        Execution_time: Market open + VWAP strategy
      }
    P(h¹_stocks|h²_stocks,h³,X) = 0.91

h¹_bonds = Execution_Plan(h²_bonds, h³)
    = {
        Buy: [US_Treasury_10Y: $20K face value,
              Corporate_Bond_ETF (LQD): $10K],
        Order_type: Market orders
      }
    P(h¹_bonds|h²_bonds,h³,X) = 0.94

... (tương tự cho Gold và Crypto)
```

#### **Feedback Loop - Kiểm tra consistency**

```
// Check: Tổng allocation = Budget?
Total = ∑(h¹_i.amount) = 40K + 30K + 20K + 10K = 100K ✓

// Check: Portfolio risk ≤ Risk_tolerance?
σ_portfolio = √(∑ᵢ∑ⱼ wᵢwⱼσᵢσⱼρᵢⱼ)
            = √(0.4²×0.22² + 0.3²×0.08² + 0.2²×0.12² + 0.1²×0.45² + 2×correlations)
            ≈ 0.146 = 14.6% < 15% ✓

If violation detected → Update h² or h³ → Re-calculate h¹
```

#### **Final Output**

```
y = Aggregate(h¹, h², h³)
  = {
      Portfolio: [detailed holdings from h¹],
      Expected_return: Weighted_avg(h².returns) = 14.2%,
      Risk: 14.6%,
      Sharpe: 0.97,
      Confidence: P(y|X) = P(h³|X) × ∏ P(h²ᵢ|h³) × ∏ P(h¹ᵢ|h²ᵢ,h³)
                         = 0.88 × (0.85×0.92×0.89×0.75) × (0.91×0.94×...)
                         ≈ 0.73
    }
```

---

## 3. So sánh Computational Complexity

### Chain of Thought
```
Time Complexity: O(n × T_step)
    n = số bước
    T_step = thời gian mỗi bước

Space Complexity: O(n)
    Chỉ cần lưu trạng thái hiện tại

Error Propagation: 
    ε_total ≈ ∑ᵢ₌₁ⁿ εᵢ  (tích lũy tuyến tính)
```

### HRM
```
Time Complexity: O(L × M × T_level)
    L = số tầng
    M = số nodes mỗi tầng
    T_level = thời gian xử lý mỗi tầng

Space Complexity: O(L × M)
    Phải lưu trạng thái tất cả các tầng

Error Mitigation:
    ε_total ≈ max(εₗ) + ∑ᵢ correctionᵢ  (có cơ chế sửa lỗi)
```

---

## 4. Optimization Problem Formulation

### CoT as Sequential Optimization

```
min J = ∑ᵢ₌₁ⁿ L(yᵢ, ŷᵢ)
s.t. yᵢ = f(yᵢ₋₁)
```

### HRM as Hierarchical Optimization

```
min J = ∑ₗ₌₁ᴸ λₗ · Lₗ(hˡ, ĥˡ) + λ_y · L_y(y, ŷ)

s.t. 
    hˡ = gₗ(hˡ⁺¹, x)           ∀l ∈ [1, L-1]  (top-down)
    ∑ᵢ wᵢˡ = 1                  ∀l            (constraints per level)
    Consistency(h¹, h², ..., hᴸ) = True        (global consistency)
```

Với:
- `λₗ`: Trọng số cho tầng l
- `Lₗ`: Loss function tại tầng l
- **Multi-objective**: Tối ưu đồng thời trên nhiều tầng

---

## 5. Information Flow - Graph Theory

### CoT: Directed Acyclic Graph (DAG) - Chain

```
X → Y₁ → Y₂ → Y₃ → Z

Adjacency Matrix A:
     X  Y₁ Y₂ Y₃ Z
X  [ 0  1  0  0  0 ]
Y₁ [ 0  0  1  0  0 ]
Y₂ [ 0  0  0  1  0 ]
Y₃ [ 0  0  0  0  1 ]
Z  [ 0  0  0  0  0 ]

Path từ X → Z: Unique (chỉ 1 đường)
```

### HRM: Hierarchical Graph - Tree/Lattice

```
       h³ (Strategic)
      / | \
    h²₁ h²₂ h²₃ (Tactical)
    / \ | / |  \
  h¹₁ h¹₂ h¹₃ h¹₄ (Execution)

Adjacency Matrix: Dense, bidirectional
Multiple paths từ input → output
```

---

## 6. Kết luận Toán học

| Metric | CoT | HRM |
|--------|-----|-----|
| **Độ phức tạp tính toán** | O(n) | O(L×M) |
| **Khả năng song song** | Thấp (sequential) | Cao (parallel per level) |
| **Error recovery** | Không (1 sai → tất cả sai) | Có (feedback + correction) |
| **Tối ưu hóa** | Local (greedy) | Global (multi-objective) |
| **Khả năng mở rộng** | Tuyến tính | Theo cấp số nhân |

**Trade-off**: HRM mạnh hơn nhưng tốn nhiều compute và memory hơn CoT.