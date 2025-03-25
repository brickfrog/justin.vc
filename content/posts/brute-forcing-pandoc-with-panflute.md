+++
title = "Brute Forcing Pandoc with Panflute"
author = ["Justin"]
date = 2022-08-08T15:30:00-04:00
lastmod = 2022-08-08T16:28:51-04:00
tags = ["tiddlywiki", "pandoc", "panflute"]
draft = false
+++

Hello! This is a short post, more of a "here's an intersting thing I wandered
into" type of post. I originally wrote most of my posts on TiddlyWiki, which is
where <https://www.zk.justin.vc> resides now. I decided to move this site to Hugo
and was pondering: "Could I write all my notes in org-mode, and convert them?"

I remembered [pandoc](https://pandoc.org) and how simple it was to convert various LaTeX and markdown
files back and forth. The problem was, there's no converter for TiddlyWiki due
to its dynamism. I found a couple Python2 githubs but they seemed a bit out of
date. So I took it on myself to figure out how pandoc filters worked.

I didn't want to spend -too- much time, so writing Haskell and Lua filters were
out. I'd probably seriously consider Lua next time just cause it seems to be a
language that is on the up-and-up, but that's neither here nor there.

Enter [panflute](https://github.com/sergiocorreia/panflute), a pythonic way to write pandoc filters.It's relatively old, but
I didn't have any issues, even on the newest version of pandoc that was released
just a couple days ago (August '22).

Essentially you operate on the normal pandoc portions of the AST such as Para /
Header / Strings, and use a filter to change them. My use case was kind of weird
where I wanted to edit the text wholecloth in some cases.

```python { linenos=true, anchorlinenos=true, lineanchors=org-coderef--e1bcfb }
from panflute import *

def increase_header_level(elem, doc):
    if type(elem) == Header:
        if elem.level < 6:
            elem.level += 1
        else:
            return [] #                                    (delete action)

def main(doc=None):
    return run_filter(increase_header_level, doc=doc)

if __name__ == "__main__":
    main()
```

As you can see in the example, it's pretty self-intuitive when you're doing
simple things. This simply looks at each element to see if there's a "header",
and adds a level if it's below level 6. If they're level 6, then it deletes them.

I probably could've just used normal bash tools but I wanted to do everything in
one script. This article will be more of a code-dump with my thought process. I don't
promise it will be pretty but I figured I didn't see many other people doing
this so it's not -completely- useless.

So, text for tiddlywiki tends to be something like this:

```text
title: testing test
type: text/vnd.tiddlywiki
tags: programming org
created: 20220805
modified: 20220808


! Summary

This is a test article for pandoc and figure out all the associated classes. [[flow state]] is neat. Beep. Beep.

 * This
 * is
 * a
  * nested
  * list

!! Other

Also some other stuff, I guess. Woop. A link to something such as [[julia
programming language]]
```

With all the metadata at the top, which was the key difficulty. The second was
that org-roam primarily uses its ids to link. This I can't take the credit for,
I borrowed code from: <https://www.amoradi.org/20210730173543.html>.

The converter for MediaWiki gets you almost all of the way there, excluding the
metadata. It, thankfully, uses the 'same `[[ ]]` syntax for links that TiddlyWiki
does.

```python
import sqlite3
import os

from panflute import *


ORG_ROAM_DB_PATH = "/home/justin/.org/brain/org-roam.db"

```

The constant for the org-roam db is necessary since I use org-roam, otherwise
unneeded. This only requires panflute as a third party library.

```python

def prepare(doc):
    # Gets the title of the document and instantiates the list for appending
    doc.header = [f"title: {stringify(doc.metadata['title'])}\ntype: text/vnd.tiddlywiki\n"]

```

This is where you can set up global variables in the document. I use this to
store text in lists and as the initial part of the metadata, getting the header.

```python

def sanitize_link(elem, doc):

    '''
    Reformats the links so they work in TiddlyWiki, MediaWiki naturally
    uses the [[]] syntax so this just does a lookup against the org-roam id
    and replace it with the title.
    '''
    file_id = elem.url.split(":")[1]

    cur = db.cursor()
    cur.execute(f"select id, file, title from nodes where id = '\"{file_id}\"';")
    data = cur.fetchone()

    file_id = data[0][1:-1]
    file_name = f"{data[2][1:-1]}"

    elem.url = file_name
```

As mentioned above, I did borrow the code for this section, and modified it to
my needs (the original author exported to HTML directly). It looks up the
org-roam id: and replaces it with the title, since that's how I store my files
on my zettelkasten.

```python

def metadata_parser(elem, doc):
    '''
    Parses the input element content to format it in
    a way that (my) TiddlyWiki understands.

    TODO: needs refactoring if it gets more complex
    '''
    block = elem.text.split()

    # transforming filetags -> tags:
    if elem.text.startswith('#+filetags'):
        text = f"{block[0][6:]} {block[1][1:-1].replace(':',' ')}"
    # transforming created to: created, and format of YYYYMMDD
    elif elem.text.startswith('#+created'):
        text = f"{block[0][2:]} {block[1][1:].replace('-','')}"
    # transforming last_modified to modified, and format of YYYYMMDD
    elif elem.text.startswith('#+last_modified'):
        text = f"{block[0][-9:]} {block[1][1:].replace('-','')}"
    else:
        return None
    return text + '\n'

```

This is where things get a bit hairy, I essentially use this to parse the
associated RawBlock for org and return them as vanilla strings. All TiddlyWiki
tiddlers use this metadata. Eventually I'd like to add more, things like
reading status and private/public depending on the underlying file. While I'm
pretty sure this is not a good way to do it, it works.

```python

def header_parser(elem, doc):
    '''
    TiddlyWiki uses !'s for headers
    '''
    s = ''
    for n in range(1,4):
        if elem.level == n:
            s = '!' * n + ' '
    return s

```

Prepending !'s to MediaWiki headers, since TiddlyWiki uses ! while MediaWiki
uses ='s.

```python { linenos=true, anchorlinenos=true, lineanchors=org-coderef--8846f0 }

def action(elem, doc):
        if isinstance(elem, RawBlock) and elem.format == 'org':
            # Filter for Org Block to reassemble into proper metadata
            # Not a fan of how I did this, but it works
            if elem.prev == None:
                for i in range(len(list(elem.container))):
                    if isinstance(elem.offset(i), RawBlock):

                        header = metadata_parser(elem.offset(i), doc)
                        doc.header.append(header)

                    else:
                        break
                return Para(*[Str(i) for i in doc.header])
            else:
                return []

        elif isinstance(elem, Link) and elem.url.startswith("id:"):
            sanitize_link(elem, doc) #                                     (sanitize2)

        elif isinstance(elem, Header):
            level_string = header_parser(elem, doc)
            return Para(RawInline(level_string + stringify(elem)))

        else:
            return None #a none action                                     (none action)


def finalize(doc):
    pass

def main(doc=None):
    return run_filter(action, prepare, finalize, doc=doc)

if __name__ == "__main__":
    db = sqlite3.connect(os.path.abspath(ORG_ROAM_DB_PATH))
    main()

```

This is the meat n' potatos of the code, so to speak. The run_filter takes an
"action" and goes down the AST provided by pandoc, using the rules associated
with the input/output format and the additional filter.

I basically:

-   Look up the first element, make sure there's nothing behind that, then use
    -that- to loop over the entire element container, stopping when there's no more RawBlocks.
-   I then parse the contents and add it to the header list. This then uses a list
    comprehension to toss into a Paragraph using newlines to put them at the top like in the tiddlywiki example.
-   This then replaces each link type it encounters that starts with id:
-   Finally, it takes the extraneous header information and prepend's a !
    depending on the header level.

Most of my time was wasting understanding the Panflute API and how it interacted
with Pandoc. For example, I didn't realize at first to persist the data you
needed to essentially use the prepare functon and the doc class. And you need to
do modify/delete in the action function. (A [none action](#org-coderef--8846f0-26) preserves an element and an empty
list [] performs a [delete action](#org-coderef--e1bcfb-8).)

Then we can finally do something like:

```bash
pandoc test.org -t mediawiki -f org -F main.py -o test.tid
```

and wrap it in a shell script to work on certain org-files.

I probably made this a bit harder on myself by not simply using the Lua filters,
but it was fun to learn something new and now I can programatically export my
org-roam files to TiddlyWiki. I won't be able to do as much fancy HTML as I'd
like without writing more filters, but I figure it's good enough to get me to
start writing more notes.
