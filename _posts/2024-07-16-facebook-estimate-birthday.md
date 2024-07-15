# A way to estimate the month and day of people’s birthdays on facebook

Facebook would like to develop a way to estimate the month and day of people’s birthdays, regardless of whether people give us that information directly. What methods would you propose, and data would you use, to help with that task.

## Import necessary libraries

```python
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import re
from datetime import datetime
from faker import Faker


```

We create some dummy data for this task, include posts, profile_info, interactions, photo_tags.
Interactions: Posts with higher interaction scores are considered more reliable

```python
#Initialize Faker
fake = Faker()

n = 200
# Generate dummy data
data = {
    'user_id': [fake.random_int(min=1, max=100) for _ in range(n)],
    'posts': [fake.sentence(nb_words=5) for _ in range(n)],
    'profile_info': [fake.catch_phrase() for _ in range(n)],
    'interactions': [fake.random_int(min=10, max=100) for _ in range(n)],
    'photo_tags': [fake.word(ext_word_list=['birthday', 'celebration', '', 'party']) for _ in range(n)],
    'labels' : [fake.random_int(min=0, max=1) for _ in range(n)]
}
data_df = pd.DataFrame(data)
```

```python
# Data Preprocessing
def preprocess_data(df):
    # Example feature: Extract keywords from posts
    vectorizer = CountVectorizer()
    post_features = vectorizer.fit_transform(df['posts']).toarray()
    
    # Extract numeric features from profile_info (example: year of birth)
    df['year_of_birth'] = df['profile_info'].apply(lambda x: int(re.findall(r'\d+', x)[0]) if re.findall(r'\d+', x) else np.nan)
    
    # Combine features into a single dataframe
    features = np.hstack([post_features, df[['interactions', 'year_of_birth']].fillna(0).values])
    
    return features

# Training the Model
def train_model(features, labels):
    X_train, X_test, y_train, y_test = train_test_split(features, labels, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("Classification Report:\n", classification_report(y_test, y_pred))
    
    return model

# Step 2: Preprocess Data
features = preprocess_data(data_df)

# Mock labels for training (1: birthday, 0: not birthday)
labels = data['labels']

# Step 3: Train Model
model = train_model(features, labels)

# Step 4: Make Predictions (using the same data for demonstration)
predictions = model.predict(features)
data_df['predicted_birthday'] = predictions

print("Predictions:\n", data_df[['user_id', 'predicted_birthday']])

```

```
Accuracy: 0.6
Classification Report:
               precision    recall  f1-score   support

           0       0.72      0.54      0.62        24
           1       0.50      0.69      0.58        16

    accuracy                           0.60        40
   macro avg       0.61      0.61      0.60        40
weighted avg       0.63      0.60      0.60        40

Predictions:
      user_id  predicted_birthday
0         92                   1
1          8                   0
2         75                   1
3         55                   0
4         21                   0
..       ...                 ...
195       61                   1
196       50                   1
197       79                   1
198       86                   0
199       67                   0

[200 rows x 2 columns]
```