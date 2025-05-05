import { test } from '@/lambdatest-setup';
import { expect } from '@playwright/test';
import { checkPageHeadingH1, footerClicked, footerVisible, getPageURL, logoClicked, logoVisible, pageTitle } from '../components/commonComponents';
import { makeModelDetails } from '../constants/makeModel.constants';
import { getUserSelectedCity } from '@/src/lib/city-utils';
import { secondaryHeaderClicked } from '../components/modelPage';
import dotEnv from "dotenv";
import { TGalleryPage } from '@/src/services/response-types/TGalleryPage';
import { getGalleryPageData } from '@/src/services/gallery.service';
import { getModelTabs } from '../constants/modelPage.constant';

dotEnv.config();
test.describe('Gallery Page Layout', async () => {
    for (const tCase of makeModelDetails) {
        let responseData: TGalleryPage;

        test.beforeAll(async () => {
            responseData = await getGalleryPageData(`${tCase.make}/${tCase.model}`)
            console.log("My images ", responseData)
        })

        const url = `${tCase.make}/${tCase.model}/videos/`;
        const urlInterior = `${tCase.make}/${tCase.model}/images/interior/`;
        const urlExterior = `${tCase.make}/${tCase.model}/images/exterior/`;
        const name = `${tCase.makeName} ${tCase.modelName}`;

        test.skip(`Check Page Title ${name}`, async ({ page }) => {
            const galleryPageDataSeo = responseData.data.gallerySeo;
            await pageTitle({
                page,
                url,
                expectedTitle: galleryPageDataSeo.title,
            });
        });

        test(`Logo Visible ${name}`, async ({ page }) => {
            await logoVisible({ page, url });
        })

        test(`Logo Click ${name}`, async ({ page }) => {
            await logoClicked({ page, url });
        })

        test(`Gallery Page Secondary Header Links Clicked ${name}`, async ({ page }) => {
            const currCity = getUserSelectedCity();
            await secondaryHeaderClicked({
                page,
                url,
                make: tCase.make,
                makeName: tCase.makeName,
                model: tCase.model,
                modelName: tCase.modelName,
                variant: tCase.variant,
                currCity,
            });
        });

        test(`Footer Visible ${name}`, async ({ page }) => {
            await footerVisible({ page, url });
        })

        test(`Footers and social media links Clicked ${name}`, async ({ page }) => {
            await footerClicked({ page, url })
        })

        test(`Gallery page Interior ${name}`, async ({ page }) => {
            await page.goto(getPageURL(url));

            const model = responseData.data.modelData._source
            const interiorImages = model.images?.filter(img => img.template === 'Interior');

            if ((interiorImages || []).length === 0) return;

            const button = page.locator("#interior-images");
            await button.click()
            await expect(page).toHaveURL(getPageURL(urlInterior));
            const text = page.locator('#interior');
            await expect.soft(text).toHaveText('Interior')

            if (interiorImages.length > 0) {
                for (let i = 0; i < interiorImages.length; i++) {
                    expect.soft(interiorImages[i].url).toBeTruthy()
                    const response = await fetch(interiorImages[i].url);
                    expect(response.status).toBe(200);

                    const locater = page.locator(`#interior-image-${i}`)
                    await expect.soft(locater).toBeVisible()
                    const imageProperties = await locater?.boundingBox();
                    expect(imageProperties).not.toBeNull();
                    expect(imageProperties?.width).toBeGreaterThan(0);
                    expect(imageProperties?.height).toBeGreaterThan(0);
                    await locater.scrollIntoViewIfNeeded()
                    await expect.soft(locater).toBeInViewport()

                    await locater.click()
                    const currentImage = page.locator(`#image-${i}`)
                    await expect.soft(currentImage).toBeVisible()
                    const imageProp = await currentImage?.boundingBox();
                    expect(imageProp).not.toBeNull();
                    expect(imageProp?.width).toBeGreaterThan(0);
                    expect(imageProp?.height).toBeGreaterThan(0);
                    await expect.soft(currentImage).toBeInViewport()

                    const leftBtn = page.getByRole('button', { name: '>' })
                    const rightBtn = page.getByRole('button', { name: '<' })

                    if (i < interiorImages.length - 2) {
                        await leftBtn.click()
                        await expect(page.locator(`#interior-image-${i + 1}`)).toBeVisible();
                    }

                    if (i > 0) {
                        await rightBtn.click();
                        expect(page.locator(`#interior-image-${i - 1}`)).toBeVisible();
                    }

                    const closeButton = page.getByRole('button').first();
                    await closeButton.click()

                }
            } else {
                const locater = page.locator("#no-interior-image");
                await expect.soft(locater).toHaveText('No Interior Image found.')
            }
        })

        test.skip(`Page Heading H1 ${name}`, async ({ page }) => {
            const currCity = getUserSelectedCity();
            const headertabs = getModelTabs(
                tCase.make,
                tCase.makeName,
                tCase.model,
                tCase.modelName,
                currCity,
                tCase.variant || ""
            );
            const backupH1 = headertabs.find(
                (item) => item.tabId === "gallery"
            )?.pageHeader;
            await checkPageHeadingH1({
                page,
                url,
                h1: responseData.data.gallerySeo.h1 || backupH1,
            });
        });

        test(`Gallery page Exterior  ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source
            const exteriorImages = model.images?.filter(img => img.template === 'Exterior');

            if ((exteriorImages || []).length === 0) return;

            await page.goto(getPageURL(url));
            const button = page.getByRole('link', { name: 'Exterior' });
            await button.click()
            await expect(page).toHaveURL(getPageURL(urlExterior));
            const text = page.locator('#exterior');
            expect.soft(text).toHaveText('Exterior')

            if (exteriorImages.length > 0) {
                for (let i = 0; i < exteriorImages.length; i++) {
                    expect.soft(exteriorImages[i].url).toBeTruthy()
                    const response = await fetch(exteriorImages[i].url);
                    expect(response.status).toBe(200);

                    const locater = page.locator(`#exterior-image-${i}`)
                    await expect.soft(locater).toBeVisible()
                    const imageProperties = await locater?.boundingBox();
                    expect(imageProperties).not.toBeNull();
                    expect(imageProperties?.width).toBeGreaterThan(0);
                    expect(imageProperties?.height).toBeGreaterThan(0);
                    await locater.scrollIntoViewIfNeeded()
                    await expect.soft(locater).toBeInViewport()

                    await locater.click()
                    const currentImage = page.locator(`#image-${i}`)
                    await expect.soft(currentImage).toBeVisible()
                    const imageProp = await currentImage?.boundingBox();
                    expect(imageProp).not.toBeNull();
                    expect(imageProp?.width).toBeGreaterThan(0);
                    expect(imageProp?.height).toBeGreaterThan(0);
                    await expect.soft(currentImage).toBeInViewport()

                    const leftBtn = page.getByRole('button', { name: '>' })
                    const rightBtn = page.getByRole('button', { name: '<' })

                    if (i < exteriorImages.length - 2) {
                        await leftBtn.click()
                        await expect(page.locator(`#exterior-image-${i + 1}`)).toBeVisible();
                    }

                    if (i > 0) {
                        await rightBtn.click();
                        expect(page.locator(`#exterior-image-${i - 1}`)).toBeVisible();
                    }

                    const closeButton = page.getByRole('button').first();
                    await closeButton.click()

                }
            } else {
                const locater = page.locator("#no-exterior-image");
                await expect.soft(locater).toHaveText('No Exterior Image found.')
            }
        })


    }
});