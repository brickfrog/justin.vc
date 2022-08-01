+++
title = "Using ox-hugo and Org-roam for Writing"
author = ["Justin"]
date = 2022-07-16T02:31:00-04:00
lastmod = 2022-08-01T04:56:08-04:00
tags = ["hugo", "org", "org-roam", "emacs"]
draft = false
+++

Do you like emacs and try to use it for as much as possible? Do you like static
site generators? Then this post may be of relevance to you.

If this all sounds greek to you, and you somehow
wandered into here randomly, hoo-boy do I have a fun rabbit hole for you:
[Getting started with Emacs Doom](https:www.youtube.com/watch?v=rCMh7srOqvw).


## Okay, But Why? {#okay-but-why}

_High-level: I really like emacs and writing notes in org-roam, and didn't want
to introduce mental overhead by writing things elsewhere. But I -also- don't
like how the default mode in ox-hugo is a monolithic org file._

For the longest (okay, not -that- long) I tried to use
[TiddlyWiki](https://www.tiddlywiki.com) for most of my writing, both long and short form. This works well for
[Zettelkasten](https://zettelkasten.de/posts/overview/) style notes, but I felt like it didn't work out that well for
anything other than atomic notes. Add to the fact that it's a bit difficult to
edit/make new notes easily outside of TiddlyWiki, I decided to move my
note-taking to org-mode and emacs.

I'm not a strict FOSS purist, so I still tend
to like glamming things up with javascript (other people's javascript), but I just love how fun it is to
tinker with emacs configs. I still plan on using TiddlyWiki as display
for my zettelkasten, but I wanted something nicer for my tutorials, portfolios,
{{% sidenote "f1"  "articles, and such." %}}  What articles? Rude. {{% /sidenote %}}

I was aware of
[Org-roam](https://www.orgroam.com) due to sheer popularity / stars on github and I decided to try it out.
I'm (as of writing) not currently using anything super fancy, I've basically
adapted Jethro Kuan's [guide](https://jethrokuan.github.io/org-roam-guide) on taking notes. I figured that since he created the
thing, he'd be a good template to follow. I reccomend skimming his article for
the basics if you're new to this.

The second key part of this is [ox-hugo](https://ox-hugo.scripter.co/), which can export .org files into
markdown, which are served by hugo, a popular static-site generator. I'm
not entirely sure if there's any other options, but ox-hugo is by far the most
popular that I could find, with easy setup and theming.

The basic workflow idea is, for any `article` capture, add the appropriate hugo
headers and export to markdown to build your site. Simple as that. I'll go into
a bit more detail further down, but it really is that simple. I got my site
working in less than an hour. I spent most of my time tinkering around with
the javascript to get it looking like how I wanted to. But, also, a lot of the neat
stuff I liked from TiddyWiki is pretty replicatable out-of-the-box depending on theming.[^fn:1]


## Getting Started {#getting-started}

I use [Doom Emacs](https://doomemacs.org), which makes setup easy. You simply need to enable the
appropriate sections in doom's `init.el`. It shouldn't be too difficult to do this
in vanilla emacs, but I leave that as an exercise to the reader.

{{< figure src="/images/orgdoom.png" alt="org language section of doom emac's init.el" title="Doom Emacs' org-language init.el" >}}


### Config Settings {#config-settings}

This is really the main part of the workflow. The key thing to note that is that
ox-hugo would prefer you to do everything in a monolithic org file, essentially
treating each heading as an article. That kind of conflicts with how Jethro does
his notes as I understood things.

But, no worries, I say! It's simple to just use the org-templates
to capture the needed tags. (And most of the benefits of monolith aren't as
helpful unless writing successions of articles where inheriting headers is important.)

```emacs-lisp { linenos=true, anchorlinenos=true, lineanchors=org-coderef--ed0192 }
;; config.el, setting templates for org-roam
(setq org-roam-capture-templates
      '(("m" "main" plain
         "%?"
         :if-new
         (file+head "main/${slug}.org"
          "#+title: ${title}
          #+created: %U
          #+last_modified: %U\n\n")
         :immediate-finish t
         :unnarrowed t)
        ("r" "reference" plain
         "%?"
         :if-new
         (file+head "reference/${title}.org"
                    "#+title: ${title}
                    #+created: %U
                    #+last_modified: %U\n\n")
         :immediate-finish t
         :unnarrowed t)
        ("a" "article" plain             ;;                (article)
         "%?"
         :if-new
         (file+head "articles/${title}.org"
                   "#+HUGO_BASE_DIR: ~/code/justin.vc
                   #+HUGO_SECTION: ./posts
                   #+HUGO_AUTO_SET_LASTMOD: t
                   #+TITLE: ${title}
                   #+DATE: %U
                   #+HUGO_TAGS: article
                   #+HUGO_DRAFT: true\n")
         :immediate-finish t
         :unnarrowed t)))
```

If you're familiar with or skimmed the earlier linked site, this is simply
borrowing Jethro Kuan's capture templates, -but- adding the necessary headers to
utilize ox-hugo. [article](#org-coderef--ed0192-21) is where it starts, as I primarily intend to export
"articles" as my hugo pages.

`HUGO_BASE_DIR` - So, this is where you put your hugo site. In this case, it's a
folder for my website, [justin.vc](https://justin.vc). If you're new to hugo, you can download hugo
and create a new site in a folder of your choosing with `hugo new site
/path/to/site`, then simply choose said folder in your template.

`HUGO_SECTION` - This is a bit self-explanatory, it's just the section where your
posts will go. In essence, ending up in somewhere such as `justin.vc/posts/blah`
on the web, and in `justin.vc/content/posts/blah.md` file-wise.

These are the two mandatory headers, there's some clashes between naming in
Jethro's examples, e.g. created -&gt; DATE, but I figure it <span class="underline">probably</span> doesn't matter,
since the things in main/references don't go to hugo.


## Workflow {#workflow}

In effect, after you've got the template done, you're pretty much good to
go. You can run `org-hugo-export-to-md` and it'll automagically create a
markdown copy of your post in the appropriate place.

I'm not an expert, of course, but here's some tips I noticed and some dumb
things I wasted time on.

1.  If you notice above, there's `HUGO_DRAFT`, make sure to mark that as false
    (or get rid of it entirely if need be) when ready to publish. Otherwise
    hugo tends not to build things unless you explicitly tell it to.
2.  ox-hugo knows how to take care of images magically, for single-post org
    files you simply put them in an appropriate spot (I have them in my
    `~/.org/roam/articles/static` folder, to keep them aligned with my posts)
    and ox-hugo will move them to `-your code folder-/static/picture.png`
3.  You can automatically export on save by adding an appropriate footer to
    the bottom.

{{< figure src="/images/hugofooter.png" alt="Footnotes in org-mode, showing how to auto-save using comment/evals" >}}

<https://ox-hugo.scripter.co/doc/auto-export-on-saving/>

That's pretty much it! Whenver I want to write an article I just call
`org-roam-node-find`, type in the file name I want, change the title, add
tags, and poof.


## Tips {#tips}

1.  Theming is really easy! I really, really, really loathe javascript and
    even I found it simple to mess with. I personally like [PaperModX](https://reorx.github.io/hugo-PaperModX/), a fork
    of PaperMod that feels a bit nicer.
2.  There's nothing stopping you from doing other .org files. You simply
    change the appropriate headers. For example, my
    blog roll link is simply an export of my [elfeed-org](https://github.com/remyhonig/elfeed-org) file that I use for
    my RSS feed.
3.  I know I mentioned this is geared towards individual org-notes, but I
    believe there's nothing stopping from mixing and matching! I plan on
    using monolithic org files for certain topics, such as conferences or
    chains of tutorials.
4.  This is more of an org-tip, but be aware that you can add alt-text to
    your images with `#+ATTR_HTML :alt This is text` above an image. I think it
    helps with SEO, but also it's useful for those who are hard-of-seeing.
5.  You're using org-mode, make use of code blocks! Think of all the neat tutorials you could write
    about [literate programming](https://en.wikipedia.org/wiki/Literate_programming).


## Caveats {#caveats}

Of course, this all doesn't come for free. As ox-hugo uses a parser to move
files into markdown, there are a couple features that are a bit, finnicky, as
one would say.

The main issue I noticed is shortcodes, there are a lot of in-built shortcodes that
work just fine, but once you get into custom ones, that's where you run into
issues.


### Example: Sidenote Shortcode {#example-sidenote-shortcode}

For example, to {{% sidenote "f2"  "implement sidenotes" %}}  Such as this. It gets finnicky around ,'s since those are used to seperate the arguments. But it's still pretty nifty. I -think- you can also do LaTeX in this. Thanks to [Danilafe's blog](https://danilafe.com/blog/sidenotes) for figuring this out in pure CSS. I tried to do it with javascript but hugo didn't like it. {{% /sidenote %}}
I had to make an org-mode macro, and it requires everytime I want to make one,
to use syntax such as:

`{{{sidenote(f2 "This is inline." "Hello!")}}}`

You could see that getting a bit distracting. Thankfully, you can make macros at
the global level. I had to google a bit, since it doesn't seem to come up
quickly, but it's about as simple as setting a org-macro, then creating a
snippet.

```html
<span class="sidenote">
    <label class="sidenote-label" for="{{ .Get 0 }}">{{ .Get 1 }}</label>
    <input class="sidenote-checkbox" type="checkbox" id="{{ .Get 0 }}"></input>
    <span class="sidenote-content sidenote-right">{{ .Inner }}</span>
</span>
```

The {{% sidenote "f3"  "html for the sidenotes." %}}  Note that the html is 0 indexed, and the macro in org is 1 indexed. This threw me off for a bit. {{% /sidenote %}}

```elisp
(setq org-export-global-macros '(
  ("sidenote" . "@@html:{ {% sidenote $1 $2 %} } $3 { {% /sidenote %} }@@")
        ))
```

This is how you would add a macro at the global level. ****Replace the spacing in
the brackets to the respective {{}}.**** Hugo didn't like me replicating shortcode
for example purposes.

```text
# -*- mode: snippet -*-
# name: sidenote creation
# uuid: oxhugo_sidenote
# key: snote
# --
{{{sidenote(${1:label}, ${2:inline text}, ${3:sidetext})}}}
```

This is a snippet for making sidenotes easier.


## Conclusions {#conclusions}

There are probably some quality of life things I could add such as adding an
interactive step to the capture template for tags, and adding in the footer
automatically, but I figure I'll hone my process as I go along, and I'll try to
update this post when it comes to it, or write a new one if necessary.

Do you do something similar, or have any input? Feel free to contact me and let
me know, as I said, I'm just kind of bumbling through this. But even writing this article was a piece of
cake, so I have good feelings about it and hope to hone this through several
iterations of work.

---

**TLDR;**   make sure capture template is set correctly -&gt; `org-roam-node-find` -&gt; enter file name -&gt; add tags / change title to more
 "readable"  -&gt; Get writing! -&gt; `org-hugo-export-to-md`

Post-Update Notes:

-   <https://scripter.co/sidenotes-using-only-css/>, read this after I wrote my own.
    Also a good way of making sidenotes and how to use ox-hugo. (This is ox-hugo's
    creator)

[^fn:1]: Hello! This is a footnote. Yay. In other topics I'll probably try to limit
    footnotes to actual citations with `citar` or the like.
