+++
title = "PRQL (Pipelined Relational Query Language)"
author = ["Justin"]
lastmod = 2023-02-28T23:17:09-05:00
draft = false
+++

Looks to be a DSL written in Rust that compiles the syntax into [SQL]({{< relref "sql.md" >}}). Their
github repo is at <https://github.com/prql/prql>. I've never had -terrible-
difficulty writing SQL, but I feel like this might be useful for complex
queries. There's some interesting interop with Python and Jupyter and it'd be
neat to try out.

At a glance, some neat stuff I've noticed:

-   can handle different sql dialects
-   f-strings like python, essentially converting them into CONCAT
-   integration with prefect
-   DuckDB integration (I have no clue what this is as of writing - lookup?)
