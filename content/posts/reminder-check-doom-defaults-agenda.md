+++
title = "A Reminder to Check on Doom Defaults: Org-Agenda"
author = ["Justin"]
date = 2023-02-21T12:33:00-05:00
lastmod = 2023-03-05T22:48:18-05:00
tags = ["emacs", "org-agenda", "org", "doom-emacs"]
draft = false
+++

So, I've been trying to shuffle back into using emacs for more things. This week
specifically I was looking to wean myself off todoist and get back into using
org-mode for tasks/todo's, etc. I remembered finding a blog post by ["but she's a
girl..."](https://www.rousette.org.uk/archives/doom-emacs-tweaks-org-journal-and-org-super-agenda/) on her setup, relevant part repeated here for clarity:

```elisp
(def-package! org-super-agenda
  :after org-agenda
  :init
  (setq org-agenda-skip-scheduled-if-done t
      org-agenda-skip-deadline-if-done t
      org-agenda-include-deadlines t
      org-agenda-block-separator nil
      org-agenda-compact-blocks t
      org-agenda-start-day nil ;; i.e. today
      org-agenda-span 1
      org-agenda-start-on-weekday nil)
  (setq org-agenda-custom-commands
        '(("c" "Super view"
           ...
  :config
  (org-super-agenda-mode))
```

I thought, "oh, swell" someone else made a easy config that's nicer than the one
in the project github, this will be useful!

Now, notice the "org-agenda-start-day" set to nil, which defaults the "view" to the
current date.  I encountered a weird problem
where "org-agenda-start-day" seemed to default to "-3d", which, in effect would cause
org-super-agenda to show the wrong date (three days before). No matter what I did it seemed to
default back, which set me on a bit of a "I will figure this out out of spite!"
path. I spent an hour randomly looking through my own literate config and
config.el, nothing seemed to work except for manually running the block which
would set things correctly until I next restarted the emacs server / client.

I ended up getting annoyed and asking for help on
{{% sidenote "f1"  "Mastodon" %}}  I joined this particular instance cause it seemed pretty open, without mass fediblocking and such. {{% /sidenote %}}
(<https://emacs.ch>).
where a helpful person by the name of Sylvain Soliman
([@soliman@pouet.chapril.org](https://pouet.chapril.org/@soliman)) pointed me in the direction of Doom's
+org-init-agenda-h, located at /modules/lang/org/config.el - apparently doom's
org setup would overwrite it and, if you were blindly following instructions
from someone else's setup, would never notice it.

{{< figure src="/images/org-config-start-day.png" alt="section of config for lang/org/config.el showing doom sets the variable org-agenda-start-day to -3d" >}}

Really, this was all just a round about way me saying, if you're new to doom / emacs /
or you're just forgetful like I am, and something weird seems to be going on,
make sure to check what doom is setting in the background.

TLDR: Everything worked out when changing the after! to org instead of
org-agenda. Check the doom configs if something weird is going on and try user
after! org instead of the specific package to see if that changes anything.
