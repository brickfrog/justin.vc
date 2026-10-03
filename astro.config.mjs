import { defineConfig } from 'astro/config';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import remarkAlert from 'remark-github-blockquote-alert';
import { remarkReadingTime } from './src/remark-reading-time.mjs';

// The tags page only has something to show for a post that is published AND
// tagged, which is exactly the condition tags.astro uses to decide `noindex`.
// This mirrors it so the sitemap never advertises a page that tells crawlers
// to go away. Frontmatter is parsed with a real YAML reader rather than
// matched: `draft: true # not ready` is a draft, and no regex worth
// maintaining knows that. astro:content is not available at config load, so
// the files are read directly. The directory is absent in a fresh checkout
// (git does not carry empty directories), so its absence means "no posts",
// not a crash.
const WRITING_DIR = './src/content/writing';

const hasTaggedPost = () => {
  if (!existsSync(WRITING_DIR)) return false;
  return readdirSync(WRITING_DIR, { recursive: true })
    .filter((f) => String(f).endsWith('.md'))
    .some((f) => {
      const { data } = matter(readFileSync(join(WRITING_DIR, String(f)), 'utf8'));
      // Mirrors the collection schema: draft defaults false, tags default [].
      return data.draft !== true && Array.isArray(data.tags) && data.tags.length > 0;
    });
};

const hasPosts = hasTaggedPost();

export default defineConfig({
  site: 'https://justin.vc',
  trailingSlash: 'ignore',
  integrations: [
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      themeCssSelector: (theme) =>
        theme.name === 'github-light'
          ? 'body[data-theme="paper"]'
          : 'body:not([data-theme="paper"])',
      styleOverrides: {
        borderColor: 'var(--rule-dim)',
        borderRadius: '0',
        codeBackground: 'var(--bg-elev)',
        frames: {
          editorActiveTabBackground: 'var(--bg-elev)',
          editorTabBarBackground: 'var(--bg)',
          frameBoxShadowCssValue: 'none',
        },
      },
    }),
    sitemap({ filter: (page) => hasPosts || !page.includes('/tags') }),
  ],
  markdown: {
    smartypants: false,
    remarkPlugins: [remarkAlert, remarkReadingTime],
  },
  build: {
    format: 'directory',
  },
});
