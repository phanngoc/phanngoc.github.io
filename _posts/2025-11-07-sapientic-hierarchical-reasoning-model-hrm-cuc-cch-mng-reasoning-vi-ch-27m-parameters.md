---
layout: "post"
title: "Sapientic Hierarchical Reasoning Model (HRM): Cuộc Cách Mạng Reasoning với Chỉ 27M Parameters"
date: "2025-11-07 20:13:36 +0700"
categories: ["LLM", "hrm"]
math: true
---

## Giới Thiệu

Trong bối cảnh các mô hình ngôn ngữ lớn (LLM) đang thống trị AI, một startup có tên Sapient Intelligence vừa tung ra một kiến trúc hoàn toàn mới mang tên **Hierarchical Reasoning Model (HRM)** - một mô hình chỉ với 27 triệu tham số nhưng có khả năng reasoning vượt trội so với các mô hình lớn hơn gấp hàng nghìn lần.

Điều đặc biệt là HRM được huấn luyện chỉ với **1000 ví dụ**, không cần pre-training, không cần Chain-of-Thought (CoT) supervision, nhưng vẫn đạt kết quả gần như hoàn hảo trên các bài toán cực kỳ khó như Sudoku phức tạp và tìm đường trong mê cung 30×30 - những bài toán mà ngay cả các mô hình CoT state-of-the-art đều thất bại hoàn toàn (0% accuracy).

## Vấn Đề Với Các Mô Hình Hiện Tại

### Giới Hạn Của Chain-of-Thought (CoT)

Hiện nay, các LLM chủ yếu dựa vào kỹ thuật Chain-of-Thought để reasoning - tức là chia nhỏ vấn đề thành các bước trung gian và giải quyết tuần tự. Tuy nhiên, CoT có những hạn chế nghiêm trọng:

1. **Phân tách bài toán giòn gẫu (Brittle Task Decomposition)**: Một sai lầm nhỏ hoặc sắp xếp sai thứ tự các bước có thể làm sụp đổ toàn bộ quá trình reasoning
2. **Yêu cầu dữ liệu khổng lồ**: Cần hàng triệu ví dụ huấn luyện
3. **Độ trễ cao**: Phải sinh ra nhiều token trung gian, làm chậm quá trình suy luận
4. **Bị gắn chặt với ngôn ngữ**: Reasoning bị giới hạn ở mức token, trong khi não bộ con người thực hiện reasoning trong không gian latent hiệu quả hơn nhiều

### Độ Sâu Tính Toán Bị Hạn Chế

Transformer chuẩn có độ sâu cố định, đặt chúng vào các lớp phức tạp tính toán như AC⁰ hoặc TC⁰, ngăn cản chúng giải quyết các bài toán yêu cầu thời gian đa thức. Đơn giản là: **Transformer không phải là Turing-complete** và không thể thực hiện reasoning thuật toán phức tạp một cách end-to-end.

## Kiến Trúc HRM: Lấy Cảm Hứng Từ Não Bộ

### Ba Nguyên Lý Cốt Lõi

HRM được thiết kế dựa trên ba nguyên lý tính toán nơron quan sát được trong não bộ:

#### 1. **Hierarchical Processing (Xử Lý Phân Cấp)**

Não bộ tổ chức tính toán theo cấu trúc phân cấp qua các vùng vỏ não hoạt động ở các timescale khác nhau. Điều này cho phép reasoning đa tầng và sâu sắc.

#### 2. **Temporal Separation (Phân Tách Thời Gian)**

Các vùng não khác nhau hoạt động ở tốc độ khác nhau:
- **Vùng cấp thấp**: Xử lý nhanh, chi tiết
- **Vùng cấp cao**: Xử lý chậm, trừu tượng, lập kế hoạch

#### 3. **Recurrent Connectivity (Kết Nối Hồi Quy)**

Các vòng phản hồi hồi quy cho phép tinh chỉnh lặp đi lặp lại các biểu diễn nội bộ, giúp các vùng cấp cao hướng dẫn và các mạch cấp thấp thực thi.

### Kiến Trúc Chi Tiết

HRM bao gồm **4 thành phần chính**:

1. **Input Network (f_in)**: Chiếu input thành biểu diễn working memory
2. **Low-level Module (L)**: Module hồi quy xử lý nhanh, tính toán chi tiết
3. **High-level Module (H)**: Module hồi quy xử lý chậm, lập kế hoạch trừu tượng
4. **Output Network (f_out)**: Tạo prediction từ hidden state

```
Input → f_in → [H-module ⇄ L-module] → f_out → Output
              ↑                    ↓
              └─── Hierarchical ───┘
                   Convergence
```

### Hierarchical Convergence: Bí Quyết Thành Công

Đây là cơ chế đột phá của HRM:

**Vấn đề với RNN thông thường**: RNN thường hội tụ quá sớm - khi hidden state tiến đến điểm cố định, độ lớn của các cập nhật co lại, làm đình trệ tính toán và giới hạn độ sâu hiệu dụng.

**Giải pháp của HRM - Hierarchical Convergence**:

1. Trong mỗi **cycle**, L-module cập nhật nhiều lần (ví dụ 8 steps) để hội tụ đến một **equilibrium cục bộ**
2. Khi L-module đạt equilibrium, **H-module cập nhật một lần duy nhất**
3. Cập nhật này tạo context mới cho L-module, "khởi động lại" quá trình tính toán của nó
4. L-module bắt đầu hội tụ mới đến một equilibrium cục bộ khác

**Kết quả**: 
- Với T cycles và mỗi cycle có K steps, HRM đạt độ sâu hiệu dụng là **T × K**
- Duy trì hoạt động tính toán cao trong nhiều bước (không bị decay như RNN thông thường)
- Vẫn giữ được tính ổn định trong quá trình hội tụ

## Đột Phá Về Huấn Luyện

### 1. One-Step Gradient Approximation

**Vấn đề với BPTT**: Backpropagation Through Time yêu cầu lưu trữ hidden states từ forward pass, tốn bộ nhớ O(T), không khả thi sinh học và kém hiệu quả.

**Giải pháp của HRM**: Sử dụng gradient approximation 1 bước, chỉ cần O(1) bộ nhớ:

- Gradient path: `Output → H_final → L_final → Input embedding`
- Dựa trên lý thuyết Deep Equilibrium Models (DEQ) và Implicit Function Theorem
- Có thể triển khai dễ dàng với PyTorch autograd
- Gần với cơ chế học của não bộ (local learning rules)

### 2. Deep Supervision

Lấy cảm hứng từ dao động nơron điều chỉnh thời điểm học trong não bộ:

- Thực hiện nhiều **forward passes (segments)** trên cùng một mẫu dữ liệu
- Mỗi segment tính loss và cập nhật parameters
- Hidden state được "detached" giữa các segment → gradient 1-step
- Cung cấp feedback thường xuyên hơn cho H-module
- Hoạt động như cơ chế regularization

### 3. Adaptive Computational Time (ACT)

Não bộ linh hoạt chuyển đổi giữa "System 1" (tự động, nhanh) và "System 2" (suy nghĩ, chậm). HRM mô phỏng điều này:

**Cơ chế**:
- Q-head dự đoán Q-values cho 2 actions: "halt" và "continue"
- Sử dụng Q-learning để học khi nào nên dừng
- Động nhận định độ phức tạp của bài toán
- Tiết kiệm tính toán khi bài toán đơn giản, dùng nhiều tài nguyên khi bài toán phức tạp

**Inference-Time Scaling**: Chỉ cần tăng computational limit, HRM tự động cải thiện performance mà không cần training thêm!

## Kết Quả Đáng Kinh Ngạc

### ARC-AGI Challenge

ARC-AGI (Abstraction and Reasoning Corpus) là benchmark đánh giá trí thông minh duy lý tổng quát - được xem là test IQ cho AI.

**Kết quả HRM trên ARC-AGI-1**:
- HRM (27M params, 30×30 grid = 900 tokens): **40.3%**
- OpenAI o3-mini-high (hàng tỷ params): 34.5%
- Claude 3.7 (8K context): 21.2%
- Training: chỉ ~1000 examples, không pre-training!

### Sudoku-Extreme

Dataset mới với các Sudoku cực kỳ khó (trung bình 55.2 backtracks/puzzle so với 0.7 của dataset thông thường):

**Kết quả**:
- HRM: **Gần như hoàn hảo** (near-perfect accuracy)
- CoT methods: **0%** (thất bại hoàn toàn)
- Direct Transformer (cùng size): **0%** với 1000 examples
- Transformer 175M params với 1M examples: vẫn accuracy thấp

### Maze-Hard (30×30)

Tìm đường tối ưu trong mê cung 30×30:

**Kết quả**:
- HRM: **Optimal paths** với accuracy cực cao
- CoT methods: **0%**
- Transformer 175M với 1M examples: dưới 5% accuracy

## Khám Phá Cơ Chế Reasoning Của HRM

### Visualization Các Timesteps Trung Gian

Nhóm nghiên cứu đã phân tích state trajectories và solution evolution của HRM:

**Maze Task**:
1. Khám phá đồng thời nhiều đường đi tiềm năng
2. Loại bỏ các route bị chặn hoặc không hiệu quả
3. Xây dựng outline giải pháp sơ bộ
4. Refinement lặp đi lặp lại nhiều lần

**Sudoku Task**:
- Chiến lược giống **Depth-First Search**
- Khám phá các giải pháp tiềm năng
- **Backtrack** khi gặp dead ends
- Thể hiện khả năng "suy nghĩ" và "quay lại"

**ARC Task**:
- Điều chỉnh dần dần board
- Cải thiện lặp đi lặp lại cho đến khi đạt giải pháp
- Giống **hill-climbing optimization**
- Ít backtracking hơn Sudoku

→ **Kết luận**: HRM có khả năng tự động chọn và adapt các chiến lược reasoning khác nhau tùy theo đặc điểm của từng bài toán!

## Tương Đồng Với Não Bộ: Brain Correspondence

### Participation Ratio (PR) - Đo Dimensionality

HRM tái tạo một nguyên lý nền tảng trong neuroscience: **Dimensionality Hierarchy**

**Trong não chuột**:
- Vùng sensory cấp thấp: PR thấp (biểu diễn compact, low-dimensional)
- Vùng associative cấp cao (như PFC): PR cao (biểu diễn linh hoạt, high-dimensional)
- Correlation: ρ = 0.79 (P = 0.0003)

**Trong HRM (sau training)**:
- L-module: PR = 30.22 (low-dimensional, specialized)
- H-module: PR = 89.95 (high-dimensional, flexible)
- Ratio H/L ≈ 3.0 (gần với ratio trong não chuột!)

**Trong HRM chưa training (random weights)**:
- L-module: PR = 42.09
- H-module: PR = 40.75
- Không có sự phân cấp rõ ràng

→ **Hierarchical organization là emergent property** xuất hiện qua quá trình học, không phải artifact của kiến trúc!

### Ý Nghĩa

Biểu diễn high-dimensional trong H-module:
- Crucial cho **cognitive flexibility**
- Là đặc trưng của các vùng não cấp cao như PFC
- Giải thích cơ chế thành công trên các bài toán phức tạp

HRM tự động phát hiện một nguyên lý tổ chức mà não bộ đã tiến hóa qua hàng triệu năm!

## So Sánh Với Các Phương Pháp Khác

### vs. Chain-of-Thought

| Tiêu chí | CoT | HRM |
|----------|-----|-----|
| Pre-training | Cần | Không cần |
| Data | Hàng triệu examples | 1000 examples |
| Reasoning space | Language tokens | Latent space |
| Độ sâu | Cố định | Adaptive (T×K) |
| Backtracking | Khó khăn | Tự nhiên |
| Latency | Cao (nhiều tokens) | Thấp (single forward pass) |

### vs. Các Neural Reasoners Trước Đây

| Model | Turing-complete? | Depth issue? | Practical? |
|-------|------------------|--------------|------------|
| Neural Turing Machine | ✓ | Early convergence | ✗ |
| Universal Transformer | ✓ | Limited | Partial |
| RRN | Partial | BPTT expensive | ✗ |
| **HRM** | **✓** | **Solved** | **✓** |

HRM vượt qua:
1. Early convergence (hierarchical convergence)
2. BPTT memory cost (1-step gradient)
3. Fixed depth (ACT)

## Ứng Dụng Thực Tế

Theo CEO Guan Wang, HRM phù hợp cho:

### 1. Sequential Problems với Complex Decision-Making
- Healthcare diagnostics
- Financial planning
- Supply chain optimization

### 2. Latency-Sensitive Applications
- **Embodied AI**: Robot control, autonomous vehicles
- Real-time decision systems
- Edge computing devices

### 3. Data-Scarce Domains
- **Scientific exploration**: Ít data sẵn có
- **Medical research**: Limited patient data
- Custom enterprise applications

### 4. Deterministic Tasks
- Mathematical reasoning
- Logic puzzles
- Symbolic manipulation
- Code verification

**Lưu ý**: Với language-based hoặc creative tasks, LLM vẫn tốt hơn. HRM là công cụ bổ sung, không thay thế LLM!

## Hạn Chế và Phê Bình

### Arc Prize Team Assessment (Aug 2025)

Đội ngũ Arc Prize đã phân tích độc lập và đưa ra 5 phát hiện quan trọng:

1. **Hierarchical advantage là marginal**: Performance gần như bằng Transformer cùng size
2. **"Outer loop" refinement là yếu tố chính**: Iterative prediction + self-correction quan trọng hơn cấu trúc
3. **Limited cross-task transfer**: Hầu hết performance đến từ "memorizing" solutions
4. **Test-time training**: Approach gần với test-time training hơn là generalizable reasoning
5. **Architecture impact questioned**: Liệu cấu trúc phân cấp có thực sự cần thiết?

### Những Câu Hỏi Mở

1. **Scalability**: HRM scale như thế nào với size lớn hơn?
2. **General reasoning**: Có thực sự generalize tốt hay chỉ overfit trên benchmark?
3. **Integration**: Làm sao kết hợp với LLM hiện có?
4. **Real-world deployment**: Performance trên production tasks?

## Hướng Phát Triển Tương Lai

### 1. Hierarchical Memory

Tích hợp cơ chế memory multi-timescale để xử lý context dài hơn:
- Giống Hierarchical Sequential Models
- Giống Clockwork RNN
- Kết hợp với linear attention

### 2. RL Training

Hiện tại HRM dùng supervised learning. Tương lai có thể:
- Kết hợp RL để khám phá strategies mới
- Tuy nhiên, cần cẩn thận với instability của RL
- HRM có lợi thế: dense gradient supervision thay vì sparse reward

### 3. Hybrid Systems

Kết hợp HRM với:
- LLM cho language understanding
- Sensory modules cho grounding
- Symbolic systems cho structured reasoning

Mô hình: **Sense → Symbolize → Plan (HRM) → Act**

### 4. Larger Scale

- Scale lên billions parameters
- Pre-training với diverse reasoning tasks
- Multi-task learning

## Technical Details Cho Practitioners

### Architecture Components

```python
# Pseudo-structure
class HRM(nn.Module):
    def __init__(self):
        self.input_net = InputNetwork()
        self.L_module = LowLevelTransformer(layers=4)
        self.H_module = HighLevelTransformer(layers=4)
        self.output_net = OutputNetwork()
        self.q_head = QHead()  # For ACT
        
    def forward(self, x, T_max=10, K=8):
        # Input projection
        z = self.input_net(x)
        
        # Initialize states
        h_L = init_low_state()
        h_H = init_high_state()
        
        for t in range(T_max):
            # Low-level updates (K steps)
            for k in range(K):
                h_L = self.L_module(h_L, h_H, z)
            
            # High-level update (1 step)
            h_H = self.H_module(h_H, h_L)
            
            # Adaptive halting
            q_values = self.q_head(h_H)
            if should_halt(q_values, t):
                break
        
        # Output
        return self.output_net(h_H)
```

### Modern Enhancements

HRM sử dụng các kỹ thuật hiện đại:
- **RoPE** (Rotary Position Encoding)
- **GLU** (Gated Linear Units)
- **RMSNorm** (thay LayerNorm)
- **Post-Norm architecture**
- **Adam-atan2 optimizer** (scale-invariant)
- **Stablemax** (thay Softmax) cho small-sample learning

### Training Setup

```python
# Key hyperparameters
batch_size = 32
learning_rate = 1e-3  # với linear warmup
weight_decay = 0.01   # cho stability
T_max = 10            # max segments
K = 8                 # steps per cycle
epsilon = 0.3         # exploration cho ACT
```

## Kết Luận

Sapientic Hierarchical Reasoning Model đại diện cho một **paradigm shift** trong cách chúng ta tiếp cận AI reasoning:

### Key Takeaways

1. **Efficiency**: 27M params + 1000 examples = SOTA performance
2. **Brain-inspired**: Hierarchical + multi-timescale = hiệu quả như não bộ
3. **Practical**: Turing-complete, không cần BPTT, adaptive computation
4. **Specialized**: Xuất sắc cho reasoning tasks, bổ sung (không thay thế) LLM

### Ý Nghĩa Rộng Hơn

HRM chứng minh rằng:
- **Bigger is not always better**: Kiến trúc đúng > Scale
- **Pre-training is not mandatory**: Good inductive bias > big data
- **CoT is not the only way**: Latent reasoning có thể hiệu quả hơn
- **Neuroscience principles work**: Evolution đã tối ưu hóa reasoning

### Vision Dài Hạn

Sapient Intelligence hướng đến **AGI** bằng cách:
- Kết hợp RL, evolutionary algorithms, neuroscience
- Phát triển architectures có khả năng reasoning phức tạp
- Đạt và vượt qua human-level intelligence

**"Nature đã dành hàng tỷ năm để hoàn thiện reasoning. Chúng ta chỉ cần học từ nó."** - Guan Wang, CEO Sapient Intelligence

## Resources

- **Paper**: [Hierarchical Reasoning Model](https://arxiv.org/abs/2506.21734)
- **Code**: [GitHub - sapientinc/HRM](https://github.com/sapientinc/HRM)
- **Company**: [Sapient Intelligence](https://sapient.inc)
- **Benchmarks**: ARC-AGI, Sudoku-Extreme, Maze-Hard

---

**Disclaimer**: Bài viết này được viết dựa trên thông tin công bố tính đến tháng 11/2025. Một số phê bình và hạn chế đã được nêu ra bởi cộng đồng nghiên cứu, và đây là một lĩnh vực đang phát triển nhanh chóng.