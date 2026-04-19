import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import remarkAlert from 'remark-github-blockquote-alert';
import { remarkReadingTime } from './src/remark-reading-time.mjs';

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
    sitemap(),
  ],
  markdown: {
    smartypants: false,
    remarkPlugins: [remarkAlert, remarkReadingTime],
  },
  build: {
    format: 'directory',
  },
});
