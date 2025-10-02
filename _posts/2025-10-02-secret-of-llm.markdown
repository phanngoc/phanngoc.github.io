---
layout: post
title: "Unlocking the Secrets of LLM Efficiency: MoE, GQA, FlashAttention, RoPE, YaRN, and BPE"
excerpt: "Khám phá các kỹ thuật tiên tiến để tăng hiệu suất và khả năng mở rộng của mô hình LLM."
---

Large Language Models (LLMs) are pushing boundaries every year. But behind the scenes, their efficiency and scalability rely on clever mathematical tricks and algorithmic innovations. In this blog, we’ll dive deep into six powerful techniques: **Mixture of Experts (MoE)**, **Grouped Query Attention (GQA)**, **Flash Attention**, **Rotary Positional Embeddings (RoPE)**, **YaRN**, and **Byte Pair Encoding (BPE)**. Along the way, we’ll reveal their math, strengths, weaknesses, and real-world applications—with **Mermaid diagrams** to help you visualize how they work.

---

## 1. Mixture of Experts (MoE)

**Mathematics:**

Given an input vector $x$, MoE uses a set of experts $E_1, E_2, ..., E_n$. A gating function $G(x)$ selects the top-$k$ experts.

$$
y = \sum_{i=1}^k G_i(x) \cdot E_i(x)
$$

**Mermaid Diagram:**

```mermaid
graph LR
    A["Input: x"] --> B{"Gating Function<br/>G(x)"}
    B -->|"G₁(x)"| C1["Expert 1<br/>E₁(x)"]
    B -->|"G₂(x)"| C2["Expert 2<br/>E₂(x)"]
    B -->|"Gₖ(x)"| Cn["Expert k<br/>Eₖ(x)"]
    C1 -->|"G₁(x)·E₁(x)"| D["Weighted Sum<br/>Σ Gᵢ(x)·Eᵢ(x)"]
    C2 -->|"G₂(x)·E₂(x)"| D
    Cn -->|"Gₖ(x)·Eₖ(x)"| D
    D --> E["Output: y"]

    style B fill:#ff9,stroke:#333,stroke-width:3px
    style D fill:#9f9,stroke:#333,stroke-width:2px
```

**Pros:**

* Activates only a few experts → lower compute cost.
* Enables scaling model size without proportional inference cost.

**Cons:**

* Hard-to-train gating (especially with hard routing).
* Risk of load imbalance across experts.

**Examples:** Google’s *Switch Transformer*, Mistral’s MoE models.

**Use case:** LLMs requiring efficiency at scale.

---

## 2. Grouped Query Attention (GQA)

**Mathematics:**

Standard attention:
$$
\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right)V
$$

Grouped Query Attention:
$$
Q_i = Q_{\text{group}(i)} \quad \text{sharing K, V}
$$

**Mermaid Diagram:**

```mermaid
graph TD
    A["Queries: Q"] --> B["Group Queries<br/>Q₁, Q₂, ..., Qₙ"]
    B --> C["Shared Keys<br/>K (shared)"]
    B --> D["Shared Values<br/>V (shared)"]
    C --> E["Attention Computation<br/>softmax(QKᵀ/√d)V"]
    D --> E
    E --> F["Output:<br/>Attention(Q,K,V)"]

    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#fbb,stroke:#333,stroke-width:2px
    style D fill:#fbb,stroke:#333,stroke-width:2px
    style E fill:#9f9,stroke:#333,stroke-width:3px
```

**Pros:**

* Reduces memory footprint.
* Faster inference on GPUs.

**Cons:**

* Slightly less expressive (loses per-query uniqueness).

**Examples:** Used in *LLaMA v2*.

**Use case:** Efficient GPU deployment of LLMs.

---

## 3. Flash Attention

**Mathematics:**

Instead of materializing the full $QK^T$ matrix, Flash Attention computes attention block-wise directly in GPU SRAM.

$$
\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right)V
$$

**Mermaid Diagram:**

```mermaid
graph LR
    A["Queries<br/>Q"] --> D["Block Partition<br/>(Q,K,V blocks)"]
    B["Keys<br/>K"] --> D
    C["Values<br/>V"] --> D
    D --> E["GPU SRAM<br/>Block-wise Compute<br/>softmax(QKᵀ/√d)"]
    E --> F["Accumulate<br/>in SRAM"]
    F --> G["Output:<br/>Attention(Q,K,V)"]

    style D fill:#bbf,stroke:#333,stroke-width:2px
    style E fill:#ff9,stroke:#333,stroke-width:3px
    style F fill:#9f9,stroke:#333,stroke-width:2px

    H["Memory: O(n²) → O(n)"] -.->|Optimization| E

    style H fill:#fdd,stroke:#f66,stroke-width:2px,stroke-dasharray: 5 5
```

**Pros:**

* Reduces memory from $O(n^2)$ to near $O(n)$.
* Huge speedups for long sequences.

**Cons:**

* Requires specialized GPU kernels.
* More complex implementation.

**Examples:** FlashAttention v1/v2 in PyTorch & Triton.

**Use case:** Training & inference in models like GPT-4, Claude, and LLaMA.

---

## 4. Rotary Positional Embeddings (RoPE)

**Mathematics:**

RoPE rotates embedding dimensions by an angle $\theta$:

$$
\begin{bmatrix}
x_1' \\
x_2'
\end{bmatrix}
=
\begin{bmatrix}
\cos(\theta) & -\sin(\theta) \\
\sin(\theta) & \cos(\theta)
\end{bmatrix}
\begin{bmatrix}
x_1 \\
x_2
\end{bmatrix}
$$

**Mermaid Diagram:**

```mermaid
graph TD
    A["Token Embedding<br/>[x₁, x₂]"] --> B["Rotation Matrix<br/>[cos(θ) -sin(θ)]<br/>[sin(θ)  cos(θ)]"]
    B --> C["Rotated Embedding<br/>[x₁', x₂']"]

    D["Position m"] -.->|"θ = m·base⁻²ⁱ/ᵈ"| B

    style B fill:#ff9,stroke:#333,stroke-width:3px
    style C fill:#9f9,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#33f,stroke-width:2px,stroke-dasharray: 5 5
```

**Pros:**

* Preserves relative position information.
* Scales well to longer sequences.

**Cons:**

* Less intuitive than sinusoidal embeddings.

**Examples:** LLaMA, GPTNeoX.

**Use case:** Transformer decoders requiring relative positional encoding.

---

## 5. YaRN (Yet another RoPE eNhancement)

**Mathematics:**

Adjusts rotation frequencies to extend context:

$$
\theta_i' = \frac{1}{\lambda_i \cdot \alpha}, \quad \alpha \in (0,1)
$$

**Mermaid Diagram:**

```mermaid
graph LR
    A["Original RoPE<br/>θᵢ = base⁻²ⁱ/ᵈ"] --> B["YaRN Scaling<br/>θᵢ' = 1/(λᵢ·α)"]
    B --> C["Stretched Frequencies<br/>α ∈ (0,1)"]
    C --> D["Long Context<br/>Support"]

    E["Context Length<br/>4K → 128K"] -.->|Extended| D

    style B fill:#ff9,stroke:#333,stroke-width:3px
    style C fill:#9f9,stroke:#333,stroke-width:2px
    style E fill:#fdd,stroke:#f66,stroke-width:2px,stroke-dasharray: 5 5
```

**Pros:**

* Enables extrapolation to unseen long contexts.

**Cons:**

* Requires tuning hyperparameters.

**Examples:** Mistral with YaRN (128K context).

**Use case:** Long-context reasoning (legal docs, long chats).

---

## 6. Byte Pair Encoding (BPE)

**Mathematics:**

* Start: split words into characters.
* Iteratively merge most frequent pairs (A, B → AB).

**Example:**

* "lower" → ["l","o","w","e","r"] → ["lo", "w", "er"]

**Mermaid Diagram:**

```mermaid
graph LR
    A["Text: 'lower'"] --> B["Characters<br/>['l','o','w','e','r']"]
    B --> C["Find Frequent Pairs<br/>(lo), (er)"]
    C --> D["Merge Tokens<br/>['lo','w','er']"]
    D --> E["Vocabulary<br/>V = {lo, w, er}"]

    F["Iteration 1<br/>(l,o) → lo"] -.-> C
    G["Iteration 2<br/>(e,r) → er"] -.-> C

    style C fill:#ff9,stroke:#333,stroke-width:3px
    style E fill:#9f9,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5
    style G fill:#bbf,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5
```

**Pros:**

* Reduces out-of-vocab issues.
* Flexible vocabulary size.

**Cons:**

* Can produce awkward tokenization.
* Struggles with non-Latin languages.

**Examples:** GPT, LLaMA, T5.

**Use case:** Tokenization in nearly all LLMs.

---

## Final Comparison Table

| Technique                       | Pros                                    | Cons                            | Example Use Cases           |
| ------------------------------- | --------------------------------------- | ------------------------------- | --------------------------- |
| **Mixture of Experts**          | Efficient scaling, selective activation | Gating hard to train, imbalance | GPT-MoE, Switch Transformer |
| **Grouped Query Attention**     | Memory savings, faster inference        | Less detail per query           | LLaMA v2                    |
| **Flash Attention**             | O(n) memory, massive speedup            | Needs GPU kernel support        | GPT-4, Claude, LLaMA        |
| **Rotary Positional Embedding** | Preserves relative order, scalable      | Less intuitive                  | LLaMA, GPTNeoX              |
| **YaRN**                        | Long-context reasoning                  | Requires tuning                 | Mistral 128K                |
| **BPE**                         | Reduces OOV, compact vocab              | Semantic mismatch               | GPT, LLaMA, T5              |

---

## Closing Thoughts

The success of modern LLMs isn’t just about scaling parameters—it’s about **smart mathematics and clever engineering**. Techniques like MoE, GQA, and Flash Attention make training feasible, while RoPE, YaRN, and BPE help models understand and generalize language better. Together, these innovations are paving the way for more **efficient, powerful, and context-aware AI systems**.
