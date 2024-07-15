# Check sql running in mysql, using enable general log

In this tutorial, we'll go through the steps to enable, use, and clear the general log in MySQL. This is useful for debugging SQL queries.

- First, enable the general log:

```
SET global general_log = 1;
SET global log_output = 'table';
select CONVERT((argument) USING utf8) from mysql.general_log where argument like '%CURRENT_TIMESTAMP%';
select * from mysql.general_log order by event_time desc;
truncate mysql.general_log;
```

- Next, set the output of the log to 'table':

```
SET global log_output = 'table';
```

- Now, you can query the log. For example, to find all entries that include 'CURRENT_TIMESTAMP':

```
SELECT CONVERT((argument) USING utf8) 
FROM mysql.general_log 
WHERE argument LIKE '%CURRENT_TIMESTAMP%';
```

- To view all entries in the log, ordered by event time in descending order:
```
SELECT * 
FROM mysql.general_log 
ORDER BY event_time DESC;
```

- Finally, to clear the log:

```
TRUNCATE mysql.general_log;
```