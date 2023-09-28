+++
title = "Embedded SQL in Hugo with sqlime"
author = ["Justin"]
date = 2023-03-12T23:52:00-04:00
lastmod = 2023-03-13T18:58:23-04:00
tags = ["sql", "sqlite", "hugo"]
draft = false
+++

Another short(-ish) post. I found a neat tutorial/example page at:
<https://sqlime.org/examples.html>. It shows an embedded sqlite database, using
web assembly and javascript to run interactive SQL examples without needing to
hit a third-party hosted script (assuming you're hosting it yourself).

<div class="alert-primary alert">

<div class="alert-heading">

Note

</div>

The SQL may give an error if it hasn't loaded all the way - try refreshing in
that case.

</div>

This lets you do something like:

{{< sqlime db="employees" path="/data/employees.sql" >}}
SELECT
  rank() over w as "rank",
  name, department, salary
FROM employees
WINDOW W as (order by salary desc)
ORDER BY "rank", id
LIMIT 15
{{< /sqlime >}}

This is fully interactable sqlite data - feel free to `SELECT * FROM EMPLOYEES;`,
it's only 20 rows. Also feel free to try some badly formatted SQL to see the
resulting errors.

I thought it'd be neat to be able to quickly use this example for posts about
SQL, so I edited the example code a bit, making it a bit easier to futz with the
CSS, and then created a hugo shortcode, `sqlime.html`:

```html
{{ $db_name := .Get "db" }}
{{ $db_path := .Get "path" }}
{{ $editable := .Get "editable" | default true }}

<script>

    const scriptPaths = [
        "/js/sqlite3.js",
        "/js/sqlime-db.js",
        "/js/sqlime-examples.js"
      ];

      function loadScript(src) {
        var script = document.createElement("script");
        script.src = src;
        document.head.appendChild(script);
      }

      scriptPaths.forEach(function(path) {
        if (!document.querySelector(`script[src="${path}"]`)) {
          loadScript(path);
        }
      });

</script>

<div class="bordered">
    <div class="code">
    <pre class="sqlime">{{- .Inner -}}</pre></div>
    <noscript><p> To run this SQL statement, please enable javascript.</p></noscript>
</div>


  <sqlime-db name="{{ $db_name }}" path="{{ $db_path }}"></sqlime-db>
{{ if (eq $editable true) }}
  <sqlime-examples db="{{ $db_name }}" selector="pre.sqlime" editable></sqlime-examples>
{{ else }}
  <sqlime-examples db="{{ $db_name }}" selector="pre.sqlime"></sqlime-examples>
{{ end }}
```

I host the script files in `/static/js/*` as the static
folder is the default storage. As seen below I put the actual data in `/static/data`
Which can then be used in your site, via standard shortcode methods:

```md
{{</* sqlime db="employees" path="/data/employees.sql" editable="true"*/>}}
SELECT
  rank() over w as "rank",
  name, department, salary
FROM employees
WINDOW W as (order by salary desc)
ORDER BY "rank", id
LIMIT 15
{{</* /sqlime */>}}
```

And for you ox-hugo / org-mode users out there, with
`#+hugo_paired_shortcodes: sqlime`
in your top-level (or property in a sub-tree):

```org
#+attr_shortcode: :db employees :path /data/employees.sql
#+begin_sqlime
SELECT
  rank() over w as "rank",
  name, department, salary
FROM employees
WINDOW W as (order by salary desc)
ORDER BY "rank", id
LIMIT 15
#+end_sqlime
```

The one gotcha for ox-hugo is I believe it likes to auto-escape \*'s, so if your
SQL statement has a SELECT \* then you will need to remove the \\.

I would like to note that most of the code available for this will be on the
github for my [site](https://www.github.com/brickfrog/justin.vc) if you're curious. I know it's not a "best practice" - but I
un-minified the javascript, so feel free to grab my copy of it.

In summation, I would like to thank the people at <https://sqlime.org> for doing
the hard work of assembling the javascript to interact with the sqlite WASM.
Hopefully this gives more people with static sites ideas around interactive SQL
demos. As a data scientist, I think SQL will be one of those skills that sticks
around for a long while and there's never enough demos.
