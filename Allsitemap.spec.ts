import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as xml2js from 'xml2js';

const mainSitemapUrl = 'https://www.cars24.com/new-cars/sitemap.xml';

test('Extract all URLs from sitemap or sitemap index', async ({ page }) => {
  const parser = new xml2js.Parser({ strict: false, trim: true });

  async function extractUrlsFromSitemap(sitemapUrl: string) {
    console.log(`📥 Fetching: ${sitemapUrl}`);
    try {
      const response = await page.goto(sitemapUrl);
      const xmlContent = await response?.text();
      if (!xmlContent) throw new Error('Empty XML content');

      const result = await parser.parseStringPromise(xmlContent);

      // Case 1: Sitemap Index
      if (result.sitemapindex?.sitemap) {
        const nestedSitemaps = result.sitemapindex.sitemap.map((entry: any) => entry.loc[0]);
        console.log(`📂 Found ${nestedSitemaps.length} nested sitemaps in index.`);   
        for (const nestedUrl of nestedSitemaps) {
          await extractUrlsFromSitemap(nestedUrl); // Recursive call
        }
      }

      // Case 2: Regular Sitemap
      else if (result.urlset?.url) {
        const urls = result.urlset.url.map((entry: any) => entry.loc[0]);
        console.log(`✅ Found ${urls.length} URLs in sitemap: ${sitemapUrl}`);

        const slug = sitemapUrl.split('/').slice(-2).join('_').replace('.xml', '');
        const filePath = `sitemap-urls-${slug}.txt`;
        fs.writeFileSync(filePath, urls.join('\n'), 'utf-8');

        console.log(`💾 Saved to: ${filePath}`);
        expect(urls.length).toBeGreaterThan(0);
      }

      // Case 3: Unknown structure
      else {
        console.warn(`⚠️ Unknown sitemap structure at: ${sitemapUrl}`);
      }
    } catch (err) {
      console.error(`❌ Failed to process sitemap: ${sitemapUrl}`, err);
    }
  }

  await extractUrlsFromSitemap(mainSitemapUrl);
});
