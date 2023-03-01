#!/usr/bin/env python

import glob
from pathlib import Path
import subprocess


files = glob.glob("/home/justin/.org/brain/main/*.org")

with open('build.ninja', 'w') as ninja_file:
    ninja_file.write("""
rule org2md
  command = ./export-notes $in
  description = org2md $in
""")
    
    for f in files:
        path = Path(f)
        output_file = f"content/posts/{path.with_suffix('.md').name}"
        ninja_file.write(f"""
build {output_file}: org2md {path}
""")

subprocess.call(["ninja"])