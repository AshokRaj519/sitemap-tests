import { test, expect, Browser } from '@playwright/test';
import { appendFile } from 'fs';
import { chromium } from 'playwright';
import axios from 'axios';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
    

test.describe("Multiple Windows", () => {


    // test("User one ", async({page, browser })=>{

    //   const  context = await browser.newContext();
    //     page = await context.newPage();
    //     await page.goto('https://demoblaze.com/');

    //     await page.waitForTimeout(5000);


    //     const  page1 = await context.newPage();
    //       await page1.goto('https://www.youtube.com/watch?v=QJL6uV7z-8I&ab_channel=CommitQuality');

    //       await page1.waitForTimeout(5000);


    // })
    // test("User Two ", async({page, browser })=>{

    //     const  context = await browser.newContext();
    //       page = await context.newPage();
    //       await page.goto('https://demoblaze.com/');

    //       await page.waitForTimeout(5000);
    //       await page.close();


          
  
    //  })

    
    
    // Types for better autocomplete and safety
    interface SitemapUrlEntry {
      loc: string[];
      [key: string]: any;
    }
    
    // Main function to extract URLs from sitemap
  test("User one ", async()=>{
      const sitemapUrl = 'https://www.cars24.com/new-cars/search-by/sitemap.xml';
      const outputFile = 'sitemap-urls.txt';
    
      try {
        console.log(`Fetching sitemap from: ${sitemapUrl}`);
        const response = await axios.get(sitemapUrl);
        const xmlData = response.data;
    
        xml2js.parseString(xmlData, (err, result) => {
          if (err) {
            throw new Error('Failed to parse XML: ' + err.message);
          }
    
          const entries: SitemapUrlEntry[] = result.urlset.url;
          const urls: string[] = entries.map((entry) => entry.loc[0]);
    
          // Write to file
          fs.writeFileSync(outputFile, urls.join('\n'), 'utf-8');
          console.log(`✅ Extracted ${urls.length} URLs and saved to "${outputFile}"`);
        });
      } catch (error: any) {
        console.error('❌ Error fetching sitemap:', error.message);
      }
    });
    
    // Run it
    // Removed the call to undefined function
    
    


});

