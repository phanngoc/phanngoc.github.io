---
layout: post
title: "Hướng dẫn sử dụng Mermaid trong Jekyll Blog"
excerpt: "Cách thêm và sử dụng biểu đồ Mermaid trong blog Jekyll của bạn."
---

# Hướng dẫn sử dụng Mermaid trong Jekyll Blog

Blog Jekyll của bạn đã được cấu hình để hỗ trợ Mermaid diagrams. Dưới đây là cách sử dụng:

## Cách thêm Mermaid diagram

### 1. Sử dụng code block với class `mermaid`

```markdown
```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```
```

### 2. Sử dụng div với class `mermaid`

```html
<div class="mermaid">
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
</div>
```

## Các loại biểu đồ được hỗ trợ

### 1. Flowchart (Sơ đồ luồng)

```mermaid
graph LR
    A[Input] --> B[Process]
    B --> C[Output]
```

### 2. Sequence Diagram (Sơ đồ tuần tự)

```mermaid
sequenceDiagram
    participant A as User
    participant B as Server
    A->>B: Request
    B-->>A: Response
```

### 3. Gantt Chart (Biểu đồ Gantt)

```mermaid
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Task 1           :done,    task1, 2024-01-01, 2024-01-10
    Task 2           :active,  task2, 2024-01-11, 2024-01-20
```

### 4. Class Diagram (Sơ đồ lớp)

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    Animal <|-- Dog
```

## Ví dụ thực tế từ blog

Dưới đây là một ví dụ từ bài viết về LLM:

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
```

## Mẹo sử dụng

1. **Sử dụng HTML entities** cho các ký tự đặc biệt: `&lt;`, `&gt;`, `&amp;`
2. **Thêm `<br/>`** để xuống dòng trong labels
3. **Sử dụng quotes** cho labels có ký tự đặc biệt: `"Label with spaces"`
4. **Test trước** trên [Mermaid Live Editor](https://mermaid.live/)

## Cấu hình hiện tại

Blog đã được cấu hình với:
- Mermaid version 10
- Theme: default
- Security level: loose
- Responsive design
- Custom CSS styling

Chúc bạn viết blog thành công với Mermaid! 🎉
