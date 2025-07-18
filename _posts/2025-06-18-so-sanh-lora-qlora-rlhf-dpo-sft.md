---
layout: post
title: "So sánh các phương pháp LoRA, QLoRA, RLHF, DPO, SFT: Góc nhìn toán học và ứng dụng thực tế"
date: 2025-01-18 10:00:00 +0700
categories: [machine-learning, llm, fine-tuning]
tags: [LoRA, QLoRA, RLHF, DPO, SFT, LLM, fine-tuning, deep-learning]
math: true
---

Trong việc huấn luyện và fine-tuning các mô hình ngôn ngữ lớn (LLM), chúng ta có nhiều phương pháp khác nhau. Việc hiểu rõ **toán học** đằng sau mỗi phương pháp và **use case thực tế** sẽ giúp bạn lựa chọn kỹ thuật phù hợp nhất cho từng tình huống cụ thể.

## 🔍 **Tổng quan so sánh**

| Phương pháp | Mục tiêu chính | Toán học cốt lõi | Dữ liệu đầu vào | Kỹ thuật trọng tâm | Ưu điểm chính | Use case điển hình |
|-------------|---------------|------------------|-----------------|-------------------|---------------|--------------------|
| **SFT** (Supervised Fine-Tuning) | Dạy mô hình dựa vào cặp (prompt, output) đúng | Cross-entropy loss trên dữ liệu gán nhãn | Prompt + Ground truth | Fine-tune mô hình | Dễ thực hiện, chất lượng cao nếu có dữ liệu chuẩn | GPT for code, Q&A, translation |
| **RLHF** (Reinforcement Learning from Human Feedback) | Tối ưu hành vi mô hình dựa vào đánh giá người dùng | PPO (Proximal Policy Optimization), reward model | Prompt + các phản hồi và ranking | Fine-tune bằng RL trên reward model | Cải thiện alignment với người dùng | ChatGPT, Claude |
| **DPO** (Direct Preference Optimization) | Trực tiếp tối ưu hóa theo ranking người dùng, không cần reward model | Margin-based loss giữa output tốt và xấu | Prompt + (output tốt, output xấu) | Contrastive loss | Đơn giản hơn RLHF, không cần reward model | Thay RLHF cho các LLM nhỏ |
| **LoRA** (Low-Rank Adaptation) | Fine-tune mô hình hiệu quả bằng cách thêm các adapter | Approximate full weight update: ΔW ≈ A·Bᵀ với rank thấp | Same as SFT/RLHF | Low-rank matrices + freezing base model | Giảm số param cần update | Fine-tune LLM nhanh, rẻ |
| **QLoRA** (Quantized LoRA) | Kết hợp LoRA với mô hình lượng tử hóa (quantized) | LoRA + Quantization-aware training | Same as SFT/RLHF | 4-bit quantization + LoRA | Siêu nhẹ, train trên 1 GPU | Fine-tune LLM 65B bằng laptop/GPU nhỏ |

---

## 🧠 1. **SFT – Supervised Fine-Tuning**

### 🧮 **Toán học:**

SFT là phương pháp cơ bản nhất, tối ưu hóa hàm mất mát cross-entropy:

$$L_{\text{SFT}} = - \sum_{t=1}^T \log P_\theta(y_t | x, y_{<t})$$

Trong đó:
- $x$ là input prompt
- $y_t$ là token thứ t trong output
- $y_{<t}$ là các token trước đó
- $\theta$ là tham số mô hình

### ✅ **Use case:**

- **Khi nào dùng**: Khi bạn có dữ liệu chuẩn (ví dụ: input → output đúng)
- **Ứng dụng thực tế**: 
  - Code generation (như GitHub Copilot)
  - Question-Answering systems
  - Machine translation
  - Text summarization

### 💡 **Ví dụ thực tế:**

```python
# Pseudo-code cho SFT
def sft_training(model, dataset):
    for batch in dataset:
        inputs, targets = batch
        logits = model(inputs)
        loss = cross_entropy_loss(logits, targets)
        loss.backward()
        optimizer.step()
```

---

## 🧠 2. **RLHF – Reinforcement Learning from Human Feedback**

### 🧮 **Toán học:**

RLHF gồm 3 giai đoạn:

1. **SFT**: Huấn luyện supervised ban đầu
2. **Train reward model** $R(x, y)$ từ cặp ranking: $y_{\text{better}} > y_{\text{worse}}$
3. **RL fine-tuning** bằng PPO:

$$\mathcal{L}_{\text{PPO}}(\theta) = \mathbb{E} \left[ \min\left( \frac{\pi_\theta(a|s)}{\pi_{\theta_{\text{old}}}(a|s)} A, \text{clip}\left( \frac{\pi_\theta(a|s)}{\pi_{\theta_{\text{old}}}(a|s)}, 1 - \epsilon, 1 + \epsilon \right) A \right) \right]$$

Trong đó:
- $A$ là advantage function dựa trên reward
- $\epsilon$ là clipping parameter (thường là 0.2)
- $\pi_\theta$ là policy hiện tại

### ✅ **Use case:**

- **Khi nào dùng**: Khi muốn mô hình "thân thiện" và aligned với con người
- **Ứng dụng thực tế**:
  - ChatGPT, Claude
  - Chatbots customer service
  - Creative writing assistants
  - Educational AI tutors

### 💡 **Ví dụ thực tế:**

```python
# Pseudo-code cho RLHF
def rlhf_training(model, reward_model, dataset):
    # Stage 1: SFT
    sft_training(model, dataset)
    
    # Stage 2: Train reward model
    reward_model = train_reward_model(comparison_dataset)
    
    # Stage 3: PPO training
    for episode in range(num_episodes):
        prompt = sample_prompt()
        response = model.generate(prompt)
        reward = reward_model(prompt, response)
        ppo_update(model, reward)
```

---

## 🧠 3. **DPO – Direct Preference Optimization**

### 🧮 **Toán học:**

DPO trực tiếp tối ưu xác suất chọn ra mẫu tốt hơn:

$$\mathcal{L}_{\text{DPO}} = -\mathbb{E}_{(x,y^+,y^-) \sim \mathcal{D}} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y^+|x)}{\pi_{\text{ref}}(y^+|x)} - \beta \log \frac{\pi_\theta(y^-|x)}{\pi_{\text{ref}}(y^-|x)} \right) \right]$$

Trong đó:
- $y^+$ là response được prefer
- $y^-$ là response kém hơn
- $\beta$ là hyperparameter điều chỉnh "temperature"
- $\pi_{\text{ref}}$ là reference model (thường là SFT model)
- $\sigma$ là sigmoid function

### ✅ **Use case:**

- **Khi nào dùng**: Thay thế RLHF trong trường hợp tài nguyên hạn chế
- **Ứng dụng thực tế**:
  - Open-source LLMs (Mistral, OpenChat)
  - Zephyr, Starling models
  - Khi cần training pipeline đơn giản hơn RLHF

### 💡 **Ví dụ thực tế:**

```python
# Pseudo-code cho DPO
def dpo_training(model, preference_dataset, beta=0.1):
    for batch in preference_dataset:
        prompts, preferred, rejected = batch
        
        # Get log probabilities
        log_pi_preferred = model.log_prob(preferred, prompts)
        log_pi_rejected = model.log_prob(rejected, prompts)
        
        # DPO loss
        logits = beta * (log_pi_preferred - log_pi_rejected)
        loss = -torch.nn.functional.logsigmoid(logits).mean()
        
        loss.backward()
        optimizer.step()
```

---

## 🧠 4. **LoRA – Low-Rank Adaptation**

### 🧮 **Toán học:**

LoRA gán biến thể trọng số như sau:

$$W' = W + \Delta W, \quad \Delta W = A B^T$$

Trong đó:
- $A \in \mathbb{R}^{d \times r}$, $B \in \mathbb{R}^{k \times r}$, với $r \ll d, k$
- $r$ là rank (thường từ 4-64)
- Chỉ update $A$ và $B$, còn $W$ (trọng số gốc) được giữ nguyên (frozen)

**Số tham số cần train**: $r \times (d + k)$ thay vì $d \times k$

### ✅ **Use case:**

- **Khi nào dùng**: Fine-tune mô hình rất lớn với chi phí thấp
- **Ứng dụng thực tế**:
  - Fine-tune LLaMA, Falcon cho domain-specific tasks
  - Personalized AI assistants
  - Multi-task learning với nhiều LoRA adapters

### 💡 **Ví dụ thực tế:**

```python
# Pseudo-code cho LoRA
import torch.nn as nn

class LoRALayer(nn.Module):
    def __init__(self, original_layer, rank=16):
        super().__init__()
        self.original_layer = original_layer
        self.rank = rank
        
        # Freeze original weights
        for param in self.original_layer.parameters():
            param.requires_grad = False
        
        # LoRA matrices
        self.lora_A = nn.Parameter(torch.randn(rank, original_layer.in_features))
        self.lora_B = nn.Parameter(torch.zeros(original_layer.out_features, rank))
        
    def forward(self, x):
        # Original output + LoRA adaptation
        return self.original_layer(x) + (x @ self.lora_A.T @ self.lora_B.T)
```

---

## 🧠 5. **QLoRA – Quantized LoRA**

### 🧮 **Toán học:**

QLoRA kết hợp:
- **4-bit quantization** của trọng số cơ sở $W$
- **LoRA adaptation** như trên

Kỹ thuật chính:
- **NF4 quantization**: Quantization scheme tối ưu cho neural networks
- **Double quantization**: Quantize cả quantization constants
- **Paged optimizers**: Quản lý memory hiệu quả

$$W_{\text{quantized}} = \text{Quantize}(W, 4\text{-bit}) + A B^T$$

### ✅ **Use case:**

- **Khi nào dùng**: Fine-tune mô hình lớn trên GPU 24GB trở xuống
- **Ứng dụng thực tế**:
  - Fine-tune LLaMA 65B trên single GPU
  - Guanaco, Zephyr models
  - Research với budget hạn chế

### 💡 **Ví dụ thực tế:**

```python
# Pseudo-code cho QLoRA
from transformers import BitsAndBytesConfig
from peft import LoraConfig, get_peft_model

# Quantization config
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

# LoRA config
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.1,
)

# Load model with quantization
model = AutoModelForCausalLM.from_pretrained(
    model_name, 
    quantization_config=quantization_config
)

# Apply LoRA
model = get_peft_model(model, lora_config)
```

---

## 📊 **So sánh hiệu quả tài nguyên**

| Phương pháp | GPU Memory (7B model) | Training Time | Số parameters cần update |
|-------------|----------------------|---------------|-------------------------|
| **Full Fine-tuning** | ~28GB | 100% | 7B (100%) |
| **LoRA (r=16)** | ~16GB | 50% | ~4M (0.057%) |
| **QLoRA (r=16)** | ~6GB | 70% | ~4M (0.057%) |
| **DPO** | ~28GB | 80% | 7B (100%) |
| **RLHF** | ~56GB | 300% | 7B + Reward Model |

---

## 📌 **Tóm tắt lựa chọn theo tình huống**

| Tình huống | Gợi ý kỹ thuật | Lý do |
|------------|---------------|-------|
| Có dữ liệu gán nhãn chuẩn | ✅ **SFT** | Đơn giản, hiệu quả, baseline tốt |
| Muốn mô hình thân thiện hơn với người dùng | ✅ **RLHF** hoặc **DPO** | Alignment với human preferences |
| Không có reward model, cần dễ implement | ✅ **DPO** | Đơn giản hơn RLHF, không cần 3 stages |
| Ít tài nguyên, cần fine-tune mô hình lớn | ✅ **LoRA** hoặc **QLoRA** | Giảm memory và compute requirements |
| Chạy trên laptop, GPU 1-card | ✅ **QLoRA** | Siêu nhẹ, phù hợp consumer hardware |
| Cần fine-tune nhiều tasks khác nhau | ✅ **LoRA** | Có thể swap nhiều adapters |
| Production với budget cao | ✅ **RLHF** | Chất lượng tốt nhất cho user experience |

---

## 🔗 **Kết hợp các phương pháp**

Trong thực tế, các phương pháp này thường được kết hợp:

1. **SFT → DPO**: Phổ biến nhất
2. **SFT → LoRA → DPO**: Cho resource-constrained environments
3. **SFT → RLHF**: Classic approach (ChatGPT style)
4. **QLoRA + DPO**: Cho research và small teams

---

## 📚 **Tài liệu tham khảo**

- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)
- [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314)
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155)
- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290)

---

**Kết luận**: Việc lựa chọn phương pháp phù hợp phụ thuộc vào tài nguyên, dữ liệu, và mục tiêu cụ thể của bạn. Với sự phát triển nhanh chóng của lĩnh vực này, DPO và QLoRA đang trở thành những lựa chọn phổ biến nhờ tính hiệu quả và dễ triển khai.

Bạn có thể bắt đầu với **SFT + LoRA** để làm quen, sau đó chuyển sang **DPO** khi cần cải thiện alignment, hoặc **QLoRA** khi tài nguyên hạn chế.
