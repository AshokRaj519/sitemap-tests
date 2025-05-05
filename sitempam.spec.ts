import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as xml2js from 'xml2js';

const sitemapUrls = [
  'https://www.cars24.com/new-cars/sitemap.xml',
  'https://www.cars24.com/new-cars/tata/sitemap.xml',
  'https://www.cars24.com/new-cars/search-by/sitemap.xml',
  'https://www.cars24.com/new-cars/tata/tiago/sitemap.xml',
];

test('Extract URLs from multiple sitemaps', async ({ page }) => {
  for (const sitemapUrl of sitemapUrls) {
    console.log(`Processing sitemap: ${sitemapUrl}`);

    // Go to the sitemap URL
    const response = await page.goto(sitemapUrl);
    const xmlContent = await response?.text();

    if (!xmlContent) {
      console.error(`Failed to fetch XML content from ${sitemapUrl}`);
      expect(xmlContent).not.toBeNull(); // Fail the test if XML content is null
      continue;
    }

    // Parse the XML
    const parser = new xml2js.Parser();
    try {
      const result = await parser.parseStringPromise(xmlContent);

      // Debug the parsed XML structure
      console.log('Parsed XML result:', JSON.stringify(result, null, 2));

      // Check if urlset and url exist
      if (!result.urlset || !result.urlset.url) {
        console.error(`Invalid XML structure for ${sitemapUrl}`);
        expect(result.urlset).not.toBeNull(); // Fail the test if the structure is invalid
        continue;
      }

      const urls = result.urlset.url.map((u: any) => u.loc[0]);

      // Log or save to file
      console.log(`Extracted URLs from ${sitemapUrl}:`, urls);

      const filePath = `sitemap-urls-${sitemapUrl.split('/').slice(-2, -1)[0]}.txt`;
      fs.writeFileSync(filePath, urls.join('\n'), 'utf-8');
      console.log(`URLs saved to ${filePath}`);

      // Add an assertion to ensure URLs were extracted
      expect(urls.length).toBeGreaterThan(0);
    } catch (err) {
      console.error(`Failed to parse XML from ${sitemapUrl}:`, err);
      expect(err).toBeNull(); // Fail the test if parsing fails
    }
  }
});