import { test } from '@/lambdatest-setup';
import { expect } from '@playwright/test';
import { breadCrumb, checkPageHeadingH1, footerClicked, footerVisible, logoClicked, logoVisible, pageTitle, seoContent } from '../components/commonComponents';
import { makeModelDetails } from '../constants/makeModel.constants';
import { getUserSelectedCity } from '@/src/lib/city-utils';
import { secondaryHeaderClicked } from '../components/modelPage';
import { getColoursPageData } from '@/src/services/colours.service';
import { TColoursPage } from '@/src/services/response-types/TColoursPage';
import dotEnv from "dotenv";


dotEnv.config()
test.describe('Colours Page', async () => {
    for (const tCase of makeModelDetails) {
        let responseData: TColoursPage;

        test.beforeAll(async () => {
            responseData = await getColoursPageData(`${tCase.make}/${tCase.model}`)
        })

        const url = `${tCase.make}/${tCase.model}/colours/`;
        const name = `${tCase.makeName} ${tCase.modelName}`;

        test(`Check Page Title ${name}`, async ({ page }) => {
            const coloursPageDataSeo = responseData.data.seo;
            await pageTitle({
                page,
                url,
                expectedTitle: coloursPageDataSeo.title,
            });
        });

        test(`Logo Visible ${name}`, async ({ page }) => {
            await logoVisible({ page, url });
        })

        test(`Logo Click ${name}`, async ({ page }) => {
            await logoClicked({ page, url });
        })

        test(`Color Page Secondary Header Links Clicked ${name}`, async ({ page }) => {
            const currCity = getUserSelectedCity();
            const modelData = responseData.data.modelData._source;
            await secondaryHeaderClicked({
                page,
                url,
                make: tCase.make,
                makeName: tCase.makeName,
                model: tCase.model,
                modelName: tCase.modelName,
                variant: tCase.variant,
                currCity,
                modelData,
            });
        });

        test(`Footer Visible ${name}`, async ({ page }) => {
            await footerVisible({ page, url });
        })

        test(`Footers and social media links Clicked ${name}`, async ({ page }) => {
            await footerClicked({ page, url })
        })

        test(`Page Heading H1 ${name}`, async ({ page }) => {
            const modelData = responseData.data.modelData._source;

            await checkPageHeadingH1({
                page,
                url,
                h1: `${modelData.make.name} ${modelData.name} colours`,
            });
        });

        test(`Colours selector clicked and Image scrolled ${name}`, async ({ page }) => {
            const coloursPageData = responseData.data.modelData._source.imagesForColor || [];

            await page.goto(`new-cars/${url}`);
            expect(coloursPageData.length).toBeGreaterThan(0);

            for (let i = 0; i < coloursPageData.length; i++) {
                const colourButtonSelector = `.sm\\:justify-center > button:nth-child(${i + 1})`;
                await page.locator(colourButtonSelector).click();
                const imageSelector = `data-test-id=${coloursPageData[i].colorCode}${coloursPageData[i].secondColorCode ? coloursPageData[i].secondColorCode : ''}`
                await page.locator(imageSelector).scrollIntoViewIfNeeded();
                await page.waitForSelector(imageSelector, { state: `attached` });
                expect.soft(coloursPageData[i].imageUrl).toBeTruthy()
                const response = await fetch(coloursPageData[i].imageUrl);
                expect(response.status).toBe(200);
                await expect.soft(page.locator(imageSelector)).toBeVisible()
                const isImageInViewport = page.locator(imageSelector)
                const imageProperties = await isImageInViewport?.boundingBox();
                expect(imageProperties).not.toBeNull();
                expect(imageProperties?.width).toBeGreaterThan(0);
                expect(imageProperties?.height).toBeGreaterThan(0);
                await expect.soft(isImageInViewport).toBeInViewport()
                const carColourLocater = page.getByRole('heading', { name: coloursPageData[i].colorName, exact: true });
                await carColourLocater.waitFor({ state: 'visible' });
                await isImageInViewport.waitFor({ state: 'visible' });
            }
        })

        test(`SEO content ${name}`, async ({ page }) => {
            const coloursPageDataSeo = responseData.data.seo;
            await seoContent({ page, url, seoData: coloursPageDataSeo.content, id: "#car-colors-content" })
        })

        test(`Breadcrumb links click ${name}`, async ({ page }) => {
            const coloursPageDataSeo = responseData.data.seo;
            await breadCrumb({ page, url, breadCrumbLabels: coloursPageDataSeo.breadCrumb, breadCrumbUrl: coloursPageDataSeo.breadCrumbUrl })
        })

    }
});