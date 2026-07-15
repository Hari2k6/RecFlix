import pandas as pd
df = pd.read_csv('movies.csv', nrows=1)
print(list(df.columns))
