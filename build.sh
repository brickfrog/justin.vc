#!/bin/bash

jq 'map(.quotes |= map(del(.articleText)))' ./static/quotes.json > ./static/modified_quotes.json
