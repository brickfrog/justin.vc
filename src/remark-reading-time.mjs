import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return (tree, { data }) => {
    const text = toString(tree);
    const rt = getReadingTime(text);
    data.astro.frontmatter.readingTime = rt.text;
    data.astro.frontmatter.wordCount = rt.words;
  };
}
