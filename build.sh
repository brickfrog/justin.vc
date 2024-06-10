#!/bin/bash

# quotebacks trimming
jq 'map(.quotes |= map(del(.articleText)))' ./static/quotes.json > ./static/modified_quotes.json

# elfeed movement
cp ~/.doom.d/elfeed.opml ./static/feed.opml
