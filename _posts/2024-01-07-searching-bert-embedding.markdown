---
layout: post
title:  "Sử dụng SentenceTransformer for create emdedding searching."
---

# Sử dụng SentenceTransformer for create emdedding searching, and openai API cho việc tóm tắt các ý chính về các bản tin tài chính.

```python
from dotenv import load_dotenv
import os
from openai import OpenAI, ChatCompletion
from tenacity import retry, wait_random_exponential, stop_after_attempt
import tiktoken

load_dotenv()

apiKey = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=apiKey)

GPT_MODEL = "gpt-3.5-turbo-0613"
EMBEDDING_MODEL = "text-embedding-ada-002"
```

## Function helper cho việc get data từ database.

```python
import mysql.connector
from datetime import datetime
import pandas as pd

def get_news(date_start = None, date_end = None, path = None):

    # check exist date_end or get current date
    if date_end is None:
        date_end = datetime.now().strftime('%Y-%m-%d')

    # Establish a connection to the MySQL database
    connection = mysql.connector.connect(
        host='127.0.0.1',
        port=13306,
        user='root',
        password='root',
        database='pyml'
    )

    # Read the table data using pandas
    query = f"""
        SELECT title, content, date, url FROM crawl_data cd
        WHERE DATE(date) >= '{date_start}' and DATE(date) <= '{date_end}'
    """

    if path is not None:
        query += f" AND cd.domain = '{path}'"

    df = pd.read_sql(query, connection)
    return df

df_news = get_news('2023-11-01', '2023-12-30', 'https://vneconomy.vn/chung-khoan.htm')

print(df_news.head())
```

### Merge content and title

```python
from functools import reduce
title = df_news['title'][0]
print(title)
df_data = df_news

df_data['full_content'] = df_data['title'] + df_data['content']

print(df_data.head())
```

## Generate embedding
Ở đây mình chọn model `keepitreal/vietnamese-sbert` để generate embedding cho các bản tin tài chính, được training từ article tiếng việt nên có chuẩn hơn số với một số model đa ngôn ngữ như `distiluse-base-multilingual-cased-v2` hay `xlm-r-bert-base-nli-stsb-mean-tokens` 😄

```python
import pandas as pd
from sentence_transformers import SentenceTransformer

# Load the SentenceTransformer model
model = SentenceTransformer('keepitreal/vietnamese-sbert')
df_data['embedding'] = df_data.full_content.apply(lambda x: model.encode(x))
df_data.to_pickle('../cached/vietnamese-vneconomy-embedding.pkl')
```

## Define function for caculate similarity

```python
import numpy as np
from scipy import spatial

def strings_ranked_by_relatedness(
    query: str,
    df: pd.DataFrame,
    relatedness_fn=lambda x, y: 1 - spatial.distance.cosine(x, y),
    top_n: int = 100,
) -> list[str]:
    """Returns a list of strings and relatednesses, sorted from most related to least."""
    query_embedding = model.encode(query)
    strings_and_relatednesses = [
        ((row["url"], i), relatedness_fn(query_embedding, row["embedding"]))
        for i, row in df.iterrows()
    ]
    strings_and_relatednesses.sort(key=lambda x: x[1], reverse=True)
    strings, relatednesses = zip(*strings_and_relatednesses)
    return strings[:top_n], relatednesses[:top_n]

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
```

## Testing search

```python
results = strings_ranked_by_relatedness('tin tức tích cực về ngân hàng STB',
                                        df_data, top_n=10)

print(results)
```

Result
```
((('/blog-chung-khoan-hang-giu-chat-tien-cang-sot-ruot.htm', 311), ('/co-phieu-ngan-hang-chung-khoan-hut-dong-tien.htm', 12), ('/con-trai-chu-tich-vpbank-da-hoan-tat-mua-vao-70-trieu-co-phieu.htm', 168), ('/thanh-thanh-cong-bien-hoa-muon-phat-hanh-500-ty-dong-trai-phieu.htm', 420), ('/vua-lam-co-dong-chien-luoc-cua-vpb-smbc-sap-duoc-nhan-hon-1-190-ty-dong-co-tuc-2022.htm', 156), ('/no-xau-tang-nhom-quy-dragon-capital-van-tiep-tuc-mua-vao-hang-trieu-co-phieu-stb.htm', 108), ('/nha-dau-tu-ca-nhan-tranh-thu-chot-loi-xa-rong-hon-1-000-ty-dong.htm', 35), ('/blog-chung-khoan-tien-da-nhan-sai.htm', 298), ('/gia-tang-hon-58-hcm-chao-ban-297-2-trieu-co-phieu-voi-gia-bang-menh.htm', 570), ('/nha-dau-tu-ca-nhan-chot-loi-som-ban-rong-gan-550-ty-dong.htm', 148)), (0.4540471136569977, 0.4443145990371704, 0.41822221875190735, 0.40131163597106934, 0.3976529836654663, 0.39689165353775024, 0.38984888792037964, 0.38465267419815063, 0.38462647795677185, 0.3840298652648926))
```


