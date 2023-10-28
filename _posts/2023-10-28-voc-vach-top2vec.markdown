---
layout: post
title:  "Vọc vạch sơ top2vec, và bài toán tìm topic !"
date:   2017-11-25 11:52:21 +0700
categories: jekyll update
---
Hôm nay mình sẽ chia sẻ hẳn 1 thư viện mà mình mới nghía qua gần đây về **topic modeling** và s**emantic search.** Đó là **top2vec** (https://github.com/ddangelov/Top2Vec)  

Chắc hẳn trong chúng ta đã từng nghe tới bài toán cluster về việc tìm **topic modeling** từ một đống các document. Yes, và hẳn gensim là 1 thư viện cực kì nổi tiếng

Gensim đến với 2 thuật toán :

Latent Dirichlet Allocation and Probabilistic Latent Semantic Analysis

Dùng cấu trúc doc2vec để contruct

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/d1328f7f-310a-4398-bb82-3e1698f21657/7fcfd0c0-3d1c-483b-afe8-77c5e79b132d/Untitled.png)

Tuy nhiên nó có hạn chế là phải giả định trước số topic, và phải dựa vào [bag-of-words representation] sẽ làm mất đi thứ tự và ngữ nghĩa của câu.

Top2Vec là thuật toán cho **topic modeling** và s**emantic search (**search ngữ nghĩa**)**. Nó tự động xác định topic dựa trên text, và sinh ra các khía cạnh như embedded topic, document và word vectors. Phải kể đến 1 số tính năng chính.

![Screen Shot 2023-10-28 at 14.49.02.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/d1328f7f-310a-4398-bb82-3e1698f21657/b756d6d9-848d-4e86-a47f-2f4b431b481c/Screen_Shot_2023-10-28_at_14.49.02.png)

- Phát hiện ra số lượng topic phù hợp. lấy được topics và size of topic, các topic thừa kế nhau như thế nào, tìm topic bởi keyword, hay tìm document bởi topic hoặc keyword
- Tìm từ đồng nghĩa
- Tìm tài liệu tương tự

Pager:

https://arxiv.org/abs/2008.09470

Thực ra mình cũng chưa hiểu hoàn toàn cách nó cải thiện lắm, mình có đọc sơ tài liệu, cơ bản tóm gọn cho các bạn vài ý 😄

Nó sử dụng HDBSCAN để tìm ra dense areas (vùng có độ đậm đặc cao ), 

 

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/d1328f7f-310a-4398-bb82-3e1698f21657/18d8c9a6-7186-43f0-9c71-b4a6d12d3cbd/Untitled.png)

```
DBSCAN(DB, distFunc, eps, minPts) {
    C := 0/* Cluster counter */for each point Pin database DB {
if label(P) ≠ undefinedthencontinue/* Previously processed in inner loop */
        Neighbors N := RangeQuery(DB, distFunc, P, eps)/* Find neighbors */if |N| < minPtsthen {/* Density check */
            label(P) := Noise/* Label as Noise */continue
        }
        C := C + 1/* next cluster label */
        label(P) := C/* Label initial point */
        SeedSet S := N \ {P}/* Neighbors to expand */for each point Qin S {/* Process every seed point Q */if label(Q) = Noisethen label(Q) := C/* Change Noise to border point */if label(Q) ≠ undefinedthencontinue/* Previously processed (e.g., border point) */
            label(Q) := C/* Label neighbor */
            Neighbors N := RangeQuery(DB, distFunc, Q, eps)/* Find neighbors */if |N| ≥ minPtsthen {/* Density check (if Q is a core point) */
                S := S ∪ N/* Add new neighbors to seed set */
            }
        }
    }
}
```

Giải thích thuật toán:

1. **Input Parameters:**
    - **`DB`**: The database of data points you want to cluster.
    - **`distFunc`**: The distance function used to measure the similarity or dissimilarity between data points.
    - **`eps`**: The maximum radius (distance) within which a data point is considered a neighbor of another point.
    - **`minPts`**: The minimum number of data points required within the **`eps`** radius for a point to be considered a core point.
2. **Initialization:**
    - **`C`**: A variable used to keep track of the cluster counter.
    - The algorithm starts by initializing all data point labels as "undefined."
3. **Main Loop:**
    - For each point **`P`** in the database **`DB`**, it checks whether the point has already been processed (labeled). If it has, it continues to the next point.
4. **Range Query:**
    - It performs a range query to find the neighbors of the current point **`P`** within a radius of **`eps`** using the given distance function **`distFunc`**.
5. **Density Check:**
    - If the number of neighbors found in the range query is less than **`minPts`**, the point **`P`** is labeled as "Noise" (an outlier) and the algorithm continues to the next point.
6. **Cluster Assignment:**
    - If there are at least **`minPts`** neighbors, it increments the cluster counter **`C`** and assigns the label **`C`** to the current point **`P`**. This point becomes the initial point of a new cluster.
7. **Seed Set:**
    - A seed set **`S`** is initialized with the neighbors found in the range query, excluding the current point **`P`**.
8. **Expanding the Cluster:**
    - For each point **`Q`** in the seed set **`S`**, the algorithm checks whether **`Q`** was previously labeled as "Noise." If so, it changes its label to the cluster label **`C`**.
    - If **`Q`** was already labeled with a cluster or is undefined, it continues to the next point in the seed set.
    - If **`Q`** is neither noise nor previously processed, it assigns the cluster label **`C`** to it.
    - A new range query is performed on **`Q`** to find its neighbors.
    - If the number of neighbors found in this query is greater than or equal to **`minPts`**, those neighbors are added to the seed set **`S`**.
9. The algorithm continues this process until all points in the database **`DB`** have been assigned to a cluster or labeled as noise.


![Screen Shot 2023-10-28 at 15.53.12.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/d1328f7f-310a-4398-bb82-3e1698f21657/beb3c259-f504-4294-a872-26af7ca14dde/Screen_Shot_2023-10-28_at_15.53.12.png)

Dùng UMAP để giảm dimension trước khi caculate

Các bạn có tham khảo nhiều hơn ở đây 

https://www.analyticsvidhya.com/blog/2020/09/how-dbscan-clustering-works/

## Sample code tranning dùng top2vec

Lấy data tin tức, thật ra các bạn cũng có thể search trên mạng rất nhiều nguồn tin tức báo tiếng việt 😄, ở đây mình chỉ code ví dụ.

```bash
from regress_adapter import get_news_date

data = get_news_date('2022-01-01')
print(data.head())
```

```bash
title  \
0  Góc nhìn chuyên gia: Khả năng thị trường còn đ...   
1  Vì sao vợ chồng tổng giám đốc CII muốn bán sạc...   
2  Chứng khoán giảm 4 tuần liên tục, nhà đầu tư l...   
3  Khải Hoàn Land (KHG) muốn chào bán riêng lẻ 18...   
4  Đất Xanh Services (DXS) chốt ngày phát hành 12...   

                                             content                date  
0  \n\n\n\n\nTIN MỚI\n\n\n\n\n    Thị trường chứn... 2023-08-10 12:58:00  
1  \n\n\n\n\r\n                    CII: \n\n\n\n\... 2023-09-10 09:35:00  
2  \n\n\n\n\nTIN MỚI\n\n\n\n\n\nKhông phục hồi nh... 2023-07-10 19:01:00  
3  \n\n\n\n\r\n                    KHG: \n\n\n\n\... 2023-06-10 10:20:00  
4  \n\n\n\n\r\n                    DXS: \n\n\n\n\... 2023-05-10 01:00:00
```

```bash
t = data['title'] + data['content']
data_list = t.to_list()
```

Các function xử lí bóc tách từ và loại bỏ các dấu câu lung tung 😃

(Dùng underthesea để tách cho chuẩn nhe)

```python
import re
import helper
import numpy as np
from importlib import reload
from underthesea import word_tokenize

reload(helper)

def segmentation(text):
    try:
        return word_tokenize(text, format="text")
    except (TypeError, AttributeError):
        return ''

def split_words(post, return_type='sentence'):
    texts = segmentation(post)
    try:
        t = [str(x.strip('0123456789%@$.,=+-!;/()*"&^:#|\n\t\' ').lower()) for x in texts.split()]
        filtered_list = [item for item in t if item != ""]
        if return_type == 'token':
            return filtered_list
        elif return_type == 'sentence':
            return ' '.join(filtered_list)

    except TypeError:
        return []
    
def split_tokens(post):
    return split_words(post, return_type='token')
```

Xóa bớt các đoạn văn bị rỗng (1 thao tác làm sạch dữ liệu ) 😄

```python
X_2 = [words for words in map(split_words, data_list) if len(words) > 0]
```

Đoạn code training cực kì quan trọng 

```python
model = Top2Vec(X_2, embedding_model="distiluse-base-multilingual-cased", speed = "learn", tokenizer=split_tokens)
```

Save model lại để dùng lại nhé 

```python
# write code save model to file
model.save('./cached/top2vec.model')
```

Lấy số topic

```python
num_topic = model.get_num_topics()
print(num_topic)
```

```python
47
```

Lấy topic size và topic index

```python
topic_sizes, topic_nums = model.get_topic_sizes()
print(topic_sizes, topic_nums)
```

```python
[999 600 422 397 346 344 307 305 293 290 265 258 254 228 227 210 194 182
 166 159 147 144 136 130 119 115 105 100  91  89  89  80  79  73  70  66
  62  57  50  47  47  44  42  38  34  32  23] [ 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46]
```

Search topic dựa trên keyword nhé mọi người 

```python
topic_words, word_scores, topic_scores, topic_nums = model.search_topics(keywords=["chứng_khoán"], num_topics=5)
for topic in topic_nums:
    model.generate_topic_wordcloud(topic)
```