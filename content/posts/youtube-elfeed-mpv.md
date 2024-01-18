+++
title = "YouTube & elfeed"
author = ["Justin"]
lastmod = 2024-01-18T04:23:43-05:00
categories = ["short"]
draft = false
comments = false
+++

Realized I should probably just do more short-form stream of consciousness posts
and things I'm tinkering with. This will be my first ox-hugo post of essentially
tossing them into one giant .org file. Going to try use this method from now on
unless it's like some sort of mega-article.

<section class="outline-1nil">

## <span class="org-todo todo TODO">TODO</span> Background {#background}

Okay, I'm sure y'all have notice Google/YouTube going full-on war on adblockers
recently and while there's options such as simply using another browser (I've
noticed Firefox doesn't get hit as often) I've decided to use this as an excuse
to cut down on video consumption.

<div class="outline-2nil">

### yt-dlp {#yt-dlp}

[yt-dlp](<https://github.com/yt-dlp/yt-dlp>) is a neat fork of youtube-dlp which
lets you download directly from youtube (and many other sites). Normally you
could use it like thus:

```bash
yt-dlp -f mp4 https://www.youtube.com/watch\?v\=jNQXAC9IVRw
```

to simply download the file.

</div>

<div class="outline-2nil">

### elfeed {#elfeed}

If you're familiar with emacs, you're probably familiar with elfeed. The most
popular (I think) feed reader for it. For example, I export my [blog
roll](<https://justin.vc/elfeed>) and use that as a compendium of things to read.

</div>

</section>

<section class="outline-1nil">

## Combining Elfeed + yt-dlp {#combining-elfeed-plus-yt-dlp}

Okay, so the fun thing is in bash you could proceed to pipe yt-dlp to mpv and
essentially just watch youtube in your video player. You can then chain this with elfeed
because every youtube channel has an RSS feed behind it.

For example this is [Xah Lee's
feed](<https://www.youtube.com/feeds/videos.xml?channel_id=UCXEJNKH9I4xsoyUNN3IL96A>).

<div class="outline-2nil">

### Getting your feed list {#getting-your-feed-list}

You can export your youtube data by following the instructions
[here](<https://support.google.com/accounts/answer/3024190?hl=en>). This gives you
what is essentially a dump of all the channel ids, etc. that you're subscribed
to. Then you can bash script / python script, etc. to make it into a list.

```python
import pandas as pd

# Load the CSV file
file_path = '/mnt/data/subscriptions.csv'
subscriptions = pd.read_csv(file_path)

# Check the first few rows to understand the structure of the file
subscriptions.head()

# Generating RSS links for each channel
rss_links = subscriptions['Channel Id'].apply(lambda id: f"https://www.youtube.com/feeds/videos.xml?channel_id={id}")

# Adding the RSS links as a new column to the dataframe
subscriptions['RSS Link'] = rss_links
```

</div>

<div class="outline-2nil">

### Importing into emacs {#importing-into-emacs}

You can then use something like org-elfeed to add all your items into a list
(using the aforementioned link as an example) or simply ask GPT or another LLM
to format it in such a way as needed (you could even use a web-based RSS reader
if you don't want to use emacs for some reason):

```org
Video :video:noexport:
YouTube :youtube:
https://www.youtube.com/feeds/videos.xml?channel_id=UCXEJNKH9I4xsoyUNN3IL96A
```

This allows you to have all your subscriptions into your RSS reader.
You can then add a command / shortcut into your config that pipes it into mpv
as such (for example, in my case the `b` key would normally open it in a
browser but now uses mpv). And adding a tag allows you to search only for
videos.

```emacs-lisp
(defun mpv-play-url (url &rest args)
  "Play the given URL in MPV."
  (interactive)
  (start-process "my-process" nil "mpv"
                        "--speed=2.0"
                        "--pause"
                        "--cache=yes"
                        "demuxer-max-bytes=5000M"
                        "demuxer-max-back-bytes=3000M" url))

(setq browse-url-handlers
      '(("youtu\\.?be.*\\.xml" . browse-url-default-browser)  ; Open YouTube RSS feeds in the browser
        ("youtu\\.?be" . mpv-play-url)))                      ; Use mpv-play-url for other YouTube URLs
```

</div>

</section>

<section class="outline-1nil">

## Conclusion {#conclusion}

And that's essentially it. The only annoyances are that if you're constantly
subscribing to new things or watching from the algorithm this isn't a good
workflow.
I'm also sure pinging the RSS constantly isn't great efficiency-wise (the feeds only have the last
15 items although). I, however, only try to check once a day and I tend to
watch the same people so I don't waste time. If nothing else this has lessened me mindlessly refreshing by
adding a bit of friction.

</section>
