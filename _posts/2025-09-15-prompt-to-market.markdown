# Prompting the Market? A Large-Scale Meta-Analysis of GenAI in Finance NLP (2022–2025)
(arXiv:2509.09544).

## Tóm tắt nhanh

* Nhóm tác giả giới thiệu **MetaGraph** – một phương pháp khái quát để **trích xuất đồ thị tri thức (KG)** từ văn liệu khoa học bằng LLM + người-trong-vòng, áp dụng cho **681 bài** về **NLP tài chính giai đoạn 2022–2025**. Mục tiêu: cho cái nhìn **định lượng** (không chỉ mô tả) về cách GenAI làm thay đổi lĩnh vực. ([arXiv][1])
* Họ xác định **ba pha** tiến hóa: (1) giai đoạn **tiếp nhận LLM sớm** & bùng nổ tác vụ/dataset; (2) **phản tư về giới hạn/rủi ro** của LLM; (3) chuyển dịch sang **kiến trúc hệ thống mô-đun** (RAG, agent, prompt nâng cao). ([arXiv][1])
* Kết quả nổi bật: **Financial QA** vươn lên **tác vụ chủ đạo** (từ \~10% lên **\~33%** vào 2025), **dữ liệu tổng hợp (synthetic)** tăng mạnh (khoảng **5% → \~15%** đến 11/2024), và **đa mô thức + nguồn dữ liệu đa dạng** (bảng, biểu đồ, âm thanh, bình luận analyst…) trở nên phổ biến. ([arXiv][1])
* Bộ KG và tài nguyên công bố trên **Zenodo** (trừ \~58 bài vướng giấy phép). ([arXiv][1])

## Ý then chốt

1. **Từ mô hình sang hệ thống**: thay vì chỉ “fine-tune/prompt 1 model”, xu hướng là **xây hệ**: RAG, self-critique, chain-of-thought, multi-stage prompting, agent-based workflows. ([arXiv][1])
2. **QA thống trị – SA/IE tụt vai trò độc lập**: sentiment/IE vẫn dùng nhưng thường là **bước trung gian** trong pipeline lớn hơn (RAG/agent), không còn là đích cuối. ([arXiv][1])
3. **Dữ liệu: đa nguồn & synthetic**: mở rộng từ news/filings sang bảng, biểu đồ, earnings calls, analyst notes; synthetic/human-in-the-loop giúp giảm chi phí nhãn. ([arXiv][1])
4. **Nhận thức rủi ro tăng**: nhiều bài chuyển trọng tâm sang **lý giải, suy luận định lượng, hiệu năng, bảo mật, bias/robustness, RAG bottlenecks**. ([arXiv][1])
5. **Đa dạng hóa mô hình**: sau giai đoạn GPT thống trị là **LLaMA**, rồi pha **hỗn hợp** open (Qwen, DeepSeek…) + closed trong công nghiệp (ưu tiên tốc độ thử nghiệm). ([arXiv][1])

## Phương pháp & “toán” đứng sau MetaGraph (rút gọn)

**1) Ontology & trích xuất KG**

* Xây **ontology** cho NLP-tài chính: thực thể (paper, task, model, dataset, source…), thuộc tính, quan hệ; trích xuất bằng LLM theo quy trình **human-in-the-loop** để đạt độ chính xác/KG có thể truy vấn. ([arXiv][1])

**2) Chuẩn hoá thực thể (Entity Resolution)**

* Dùng **embedding** (OpenAI *text-embedding-small*) + **clustering** để gộp biến thể tên (ví dụ *FinQA* vs *Finqa*). Tiêu chí gộp dựa trên **độ tương tự cosin**:

  $$
  \cos(\theta)=\frac{\langle \mathbf{e}_i,\mathbf{e}_j\rangle}{\|\mathbf{e}_i\|\;\|\mathbf{e}_j\|}
  $$

  và **ngưỡng** được tinh chỉnh thực nghiệm (paper không công bố giá trị cụ thể). ([arXiv][1])

**3) Điểm liên quan (Relevance Scoring)**

* Điểm của mỗi paper tổng hợp từ: (i) **trung tâm hoá thể chế** (PageRank trên đồ thị đồng tác giả theo affiliation), (ii) **năng suất** (số bài của tổ chức), (iii) **trích dẫn chuẩn hoá theo năm**.

  * **PageRank** dùng phương trình cố định điểm:

    $$
    \mathbf{p} = \alpha \mathbf{A}^\top \mathbf{p} + (1-\alpha)\mathbf{v}
    $$

    với $\alpha\in(0,1)$, $\mathbf{A}$ là ma trận kề chuẩn hoá cột, $\mathbf{v}$ là phân phối khởi tạo (thường đều). (Công thức tổng quát; bài không cho tham số α cụ thể.) ([arXiv][1])

**4) Phân tích chuỗi thời gian theo pha**

* Chia mốc thời gian **T1: 01/2022–08/2023**, **T2: 09/2023–07/2024**, **T3: 08/2024–04/2025** rồi thống kê **tần suất tác vụ/dataset/nguồn**, **tỷ lệ synthetic**, **động thái “giới hạn/rủi ro”** qua các kỳ. ([arXiv][1])

## Kết quả định lượng đáng chú ý

* **Financial QA**: từ \~**10%** (trước 2023) → **\~33%** (đến 2025). Đồng thời **số tác vụ/trên bài** tăng (≈1.36 → **≈1.9**) phản ánh chuyển dịch từ pipeline hẹp sang hệ linh hoạt. ([arXiv][1])
* **Synthetic data**: \~**5%** (04/2023) → **\~15%** (11/2024). ([arXiv][1])
* **Nguồn dữ liệu**: ngày càng **dài hơn/đa mô thức** (text + **tables/charts/audio** + structured DB); QA benchmark vượt qua các bộ truyền thống. ([arXiv][1])
* **Khuynh hướng mô hình**: GPT → LLaMA → **mix open/closed** (Qwen, DeepSeek…) với doanh nghiệp thường chấp nhận **đóng/ít minh bạch** để thử nghiệm nhanh các use case như Financial QA. ([arXiv][1])
* **Tài nguyên mở**: KG phát hành trên **Zenodo** (trừ 58 bài vướng giấy phép CC-BY-NC-ND). ([arXiv][1])

## Hàm ý thực tiễn (cho team làm Finance AI)

* **Ưu tiên kiến trúc hệ thống**: coi **RAG** và **prompt-orchestration** (CoT, self-critique, retrieval-based prompting) là “mặc định”, đừng chỉ săn SOTA model. ([arXiv][1])
* **Đầu tư dữ liệu đa nguồn/đa mô thức**: thêm **bảng, biểu đồ, earnings calls, analyst notes**; chuẩn hoá schema để nạp vào **vector/RAG**. ([arXiv][1])
* **Synthetic đúng chỗ**: dùng để mở rộng phạm vi QA/điều kiện hiếm, nhưng có **kiểm soát chất lượng** (human-in-the-loop, kiểm định thống kê). ([arXiv][1])
* **Đo “rủi ro lý luận”**: theo dõi **reasoning, interpretability, latency/cost**, và **bottleneck của retrieval** thay vì chỉ accuracy tổng. ([arXiv][1])

## Hạn chế & phạm vi

* Phân tích dựa trên **681 bài** và **pipeline LLM** nên vẫn phụ thuộc vào **ontology, prompt, ngưỡng ER** và **độ lệch nguồn**; một phần dữ liệu không thể chia sẻ vì **giấy phép**. ([arXiv][1])

Nếu bạn muốn, mình có thể dựng **bản KG/ontology thu gọn** cho domain của bạn (VD: VN-equities, báo cáo doanh nghiệp, tin tức tiếng Việt/tiếng Nhật), kèm **truy vấn mẫu** (đếm xu hướng đề tài, tỉ trọng RAG, độ phủ dataset, mapping task→source).

[1]: https://arxiv.org/html/2509.09544 "Prompting the Market? A Large-Scale Meta-Analysis of GenAI in Finance NLP (2022–2025)"
