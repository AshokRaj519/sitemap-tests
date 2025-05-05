import { test } from '@/lambdatest-setup';
import { expect } from '@playwright/test';
import { homePageVariables } from '../variables/homePageVariables';
import { TPopularBrandsResponse } from '@/src/custom-hooks/useTopSalesBrand';
import apiClient from '@/src/services/api.client';
import ENDPOINT from '@/src/services/endpoints';
import { slugify } from '@/src/lib/utils';
import { getDataOnSearch } from '../utils/common';
import { getPageURL } from '../components/commonComponents';

test.describe('Search Functionality', () => {
    let responseData: TPopularBrandsResponse;

    test.beforeAll(async () => {
        responseData = await apiClient.get<TPopularBrandsResponse>(ENDPOINT.topSalesBrands);
    })

    test('Popular Models', async ({ page }) => {
        await page.goto(getPageURL());
        await page.locator(homePageVariables.searchBar).click();
        const brandsData = responseData.data;
        for (let i = 0; i < brandsData.length; i++) {
            const currBrand = brandsData[i];
            const popularSearchModelImg = currBrand.url;
            expect.soft(popularSearchModelImg).toBeTruthy();
            //Compare api popular Model Image and uipopular models image
            const response = await fetch(popularSearchModelImg);
            expect(response.status).toBe(200);
            const popularSearchModelsAPI = `${currBrand.make_name} ${currBrand.model_name}`;
            const modelId = `#popular-models-${(currBrand.model_slug)}`
            const popularSearchModelsUI = await page.locator(`${modelId} span`).textContent();
            //Compare api popular Model Text and uipopular models Text
            expect(popularSearchModelsUI).toBe(popularSearchModelsAPI)
            const popularModel = await page.locator(modelId).getAttribute("href");
            //Compare api popular Model href and uipopular models href
            expect.soft(popularModel).toBe(`/new-cars/${slugify(currBrand.make_slug)}/${(currBrand.model_slug)}/`)
        }
        const allLinks = brandsData.map(data => `/new-cars/${slugify(data.make_slug)}/${(data.model_slug)}/`)
        for (const link of allLinks) {
            const response = await page.goto(link, { waitUntil: 'networkidle' });
            const statusCode = response?.status();
            expect.soft(statusCode).toBeLessThan(400);
        }
    })

    test("Search Suggestions", async ({ page }) => {
        await page.goto(getPageURL())
        await page.locator(homePageVariables.searchBar).click();
        await page.locator(homePageVariables.popUp).click();
        await page.waitForTimeout(1000);
        await page.locator(homePageVariables.popUp).fill(homePageVariables.SAMPLE_BRAND_NAME);
        const searchSuggestions = await getDataOnSearch(homePageVariables.SAMPLE_BRAND_NAME)
        const uiSuggestions = await page.$(`#universal-search-results`);
        const childElements = await uiSuggestions?.$$("> *")
        for (let i = 0; i < (childElements || [])?.length; i++) {
            expect.soft((childElements || [])?.length).toBe(searchSuggestions.data.length);
            const searchSuggestion = searchSuggestions.data[i].slug;
            const searchSuggestionHref = `/new-cars${searchSuggestion}/`
            const childElement = childElements?.[i];
            await page.waitForTimeout(500)
            const anchor = await childElement?.$('a');
            const searchSuggestionText = await anchor?.textContent();
            expect.soft(searchSuggestionText).toBe(searchSuggestions.data[i].label.replaceAll("<em>", "").replaceAll("</em>", ""));
            const url = await anchor?.getAttribute(`href`)
            expect.soft(searchSuggestionHref).toBe(url)
        }
    })

    test("Recent Searches", async ({ page }) => {
        await page.goto(getPageURL())
        await page.locator(homePageVariables.searchBar).click();
        await page.locator(homePageVariables.popUp).click();
        await page.locator(homePageVariables.popUp).fill(homePageVariables.SAMPLE_BRAND_NAME);
        const xpathExpression = await page.waitForSelector(`#universal-search-results`);
        const childElements1 = await xpathExpression?.$$("> *")
        const searchLength = (childElements1 || []).length;
        let index = 0;
        while (index < searchLength) {
            await page.goto(getPageURL());
            await page.locator(homePageVariables.searchBar).click();
            await page.locator(homePageVariables.popUp).click();
            await page.locator(homePageVariables.popUp).fill(homePageVariables.SAMPLE_BRAND_NAME);
            //Search Suggestion
            const xpath = await page.waitForSelector('#universal-search-results');
            const children = await xpath?.$$("> *");
            const item = children?.[index];
            const anchor = await item?.$('a');
            const url = await anchor?.getAttribute(`href`);
            await anchor?.click();
            //validating all Recent Searches
            await page.waitForLoadState('networkidle');
            const response = await page.goto(url || '', { waitUntil: 'networkidle' });
            const statusCode = response?.status();
            expect(statusCode).toBeLessThan(400);
            index++;

        }
    })
});