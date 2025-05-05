import { slugify } from '@/src/lib/utils';
import { test } from '@/lambdatest-setup';
import  { expect } from "@playwright/test";
import {
    breadCrumb,
    checkPageHeadingH1,
    footerClicked,
    footerVisible,
    getPageURL,
    logoClicked,
    logoVisible,
    pageTitle,
    seoContent,
    shortsSection,
    similarCarsSection,
    topComparisonSection,
    upcomingAndRecentlyLaunchedCars,
} from "../components/commonComponents";
import {
    brochureDetails,
    exploreCarSpecifications,
    priceInCities,
    secondaryHeaderClicked,
    userReviewSection,
} from "../components/modelPage";
import { getUserSelectedCity } from "@/src/lib/city-utils";
import dotEnv from "dotenv";
import { makeModelDetails } from "../constants/makeModel.constants";
import { TModelPage } from "@/src/services/response-types/TModelPage";
import { getModelPageData } from "@/src/services/model.service";
import { TPriceInCity } from "@/src/types/core/TPriceInCity";
import { getPriceDataInOtherCities } from "@/src/services/price.service";
import { getMappedSpecs } from '@/src/constants/model.constant';
import { getModelTabs } from '../constants/modelPage.constant';
import { formatCurrency } from '@/src/lib/num-utils';
import { getVariantsSpecsSummary } from '@/src/lib/variant-utils';
import { checkNullUndefined, select3RandomNumbers } from '../utils/modelPage';
import { createCompareLink } from '../utils/modelPage';
import { leaderboardEntryPoint } from '../components/leaderboardEntryPoint';

dotEnv.config();
test.describe("Model Page", () => {
    for (const tCase of makeModelDetails) {
        const name = `${tCase.makeName} ${tCase.modelName}`;
        const url = `${tCase.make}/${tCase.model}`;

        let responseData: TModelPage;
        let priceInOtherCities: TPriceInCity[];

        test.beforeAll(async () => {
            [responseData, priceInOtherCities] = await Promise.all([
                getModelPageData(`${tCase.make}/${tCase.model}`),
                getPriceDataInOtherCities(`${tCase.model}`)
            ])
        });

        test(`Check Page Title ${name}`, async ({ page }) => {
            await pageTitle({
                page,
                url: url,
                expectedTitle: responseData.data.modelPageSeo.title,
            });
        });

        test(`Logo Visible ${name}`, async ({ page }) => {
            await logoVisible({ page, url });
        });

        test(`Logo Click ${name}`, async ({ page }) => {
            await logoClicked({ page, url });
        });

        test(`Footer Visible ${name}`, async ({ page }) => {
            await footerVisible({ page, url });
        });

        test(`Footers and Social Media Links Clicked ${name}`, async ({ page }) => {
            await footerClicked({ page, url });
        });

        test(`Model Page Secondary Header Links Clicked ${name}`, async ({
            page,
        }) => {
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

        test(`Breadcrumb links click ${name}`, async ({ page }) => {
            const modelPageSeo = responseData.data.modelPageSeo;
            await breadCrumb({
                page,
                url,
                breadCrumbLabels: modelPageSeo.breadCrumb,
                breadCrumbUrl: modelPageSeo.breadCrumbUrl,
            });
        });

        test(`Similar Cars ${name}`, async ({ page }) => {
            const similarCarData = responseData.data.similarCarData;
            await similarCarsSection({ page, url, similarCarData });
        });

        test(`Compare With Rivals ${name}`, async ({ page }) => {
            const similarCars = responseData.data.similarCarData;
            const modelToCompare = responseData.data.modelData._source;
            const modelFullName = `${modelToCompare.make.name} ${modelToCompare.name}`;
            const carsToCompare =
                similarCars?.map(({ _source: model }) => {
                    return {
                        firstVariant: { model: model },
                        secondVariant: { model: modelToCompare },
                    };
                }) ?? [];

            const title = `Compare ${modelFullName} with rivals`;
            await topComparisonSection({
                page,
                url,
                carsToCompare,
                title,
            });
        });

        test(`SEO Content ${name}`, async ({ page }) => {
            const introContent = responseData.data.modelData._source.introcontent ?? [];
            await seoContent({ page, url, seoData: introContent[0]?.content, id: "#expert-reviews" });
        });

        test(`Broucher ${name}`, async ({ page }) => {
            await brochureDetails({
                page,
                url,
                modelBrochure: responseData.data.modelData._source,
            });
        });

        test(`Explore Car Specifications ${name}`, async ({ page }) => {
            const longVideos = responseData.data.modelData._source.longVideos;
            if ((longVideos || []).length > 0) {
                await exploreCarSpecifications({ page, url, longVideos });
            }
        });

        test.skip(`User Reviews for ${name}`, async ({ page }) => {
            const modelData = responseData.data.modelData._source;
            const list = [
                {
                    label: "interiors-rating",
                    value:
                        modelData.avgRateInfotainmentInteriors?.toFixed(1).toString() ??
                        "-",
                },
                {
                    label: "fuel-economy-rating",
                    value: modelData.avgRateFuelEconomy?.toFixed(1).toString() ?? "-",
                },
                {
                    label: "looks-rating",
                    value: modelData.avgRateExteriorLooks?.toFixed(1).toString() ?? "-",
                },
                {
                    label: "comfort-rating",
                    value: modelData.avgRateComfort?.toFixed(1).toString() ?? "-",
                },
            ];
            await userReviewSection({
                page,
                url,
                modelData,
                list,
                expectedUrl: `${tCase.make}/${tCase.model}/review/`,
            });
        });

        test(`Price In other cities ${name}`, async ({ page }) => {
            await priceInCities({ page, url, priceInOtherCities, make: tCase.make, model: tCase.model })
        })

        test(`Model Page Model Colours Section ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const imagesForColour = model.imagesForColor;
            if ((imagesForColour)) {
                await page.goto(getPageURL(url), { waitUntil: "load" });
                const locator = page.locator("#model-colours");
                await locator.scrollIntoViewIfNeeded()
                await expect.soft(locator).toBeVisible();
                const imageLocator = page.locator(`data-test-id=${slugify(imagesForColour[0].imageUrl)}`);
                expect.soft(imagesForColour[0].imageUrl).toBeTruthy()
                const response = await fetch(imagesForColour[0].imageUrl);
                expect(response.status).toBe(200);
                await locator.waitFor({ state: "visible" })
                await expect.soft(imageLocator).toBeVisible();
                const isImageInViewport = imageLocator;
                const imageProperties = await isImageInViewport?.boundingBox();
                expect(imageProperties).not.toBeNull();
                expect(imageProperties?.width).toBeGreaterThan(0);
                expect(imageProperties?.height).toBeGreaterThan(0);
                await expect.soft(isImageInViewport).toBeInViewport();
                for (let i = 0; i < imagesForColour.length; i++) {
                    const buttonLocator = page.locator(`data-test-id=${slugify(imagesForColour[i].colorName)}-${i}`);
                    await buttonLocator.click();
                    expect.soft(imagesForColour[i].imageUrl).toBeTruthy()
                    const imageInViewport = page.locator(`data-test-id=${slugify(imagesForColour[i].imageUrl)}`);
                    const imageResponse = await fetch(imagesForColour[i].imageUrl);
                    expect(imageResponse.status).toBe(200);
                    await imageInViewport.waitFor({ state: "visible" })
                    await expect.soft(imageInViewport).toBeVisible();
                    const imageProps = await imageInViewport?.boundingBox();
                    expect(imageProps).not.toBeNull();
                    expect(imageProps?.width).toBeGreaterThan(0);
                    expect(imageProps?.height).toBeGreaterThan(0);
                    await expect.soft(imageInViewport).toBeInViewport();
                }
                const viewAllButton = page.locator('[data-test-id="view-all-colours"]');
                await viewAllButton.click();
                await expect.soft(page).toHaveURL(getPageURL(`${url}/colours/`));

            } else {
                const locator = page.locator("data-test-id=model-colours-section");
                expect.soft(locator).not.toBeVisible();
            }
        })

        test(`Model Page Model Images Section ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            let modelImages = model.images;
            if ((modelImages || []).length > 0) {
                modelImages = model.images.slice(0, 4);
                await page.goto(getPageURL(url), { waitUntil: "load" });
                const locator = page.locator("#model-images");
                await locator.scrollIntoViewIfNeeded()
                await expect.soft(locator).toBeVisible();
                const imageLocator = page.locator(`data-test-id=${slugify(model.carImage?.url ?? '')}`);
                expect.soft(modelImages[0].url).toBeTruthy()
                const response = await fetch(modelImages[0].url);
                expect(response.status).toBe(200);
                await locator.waitFor({ state: "visible" })
                await expect.soft(imageLocator).toBeVisible();
                const isImageInViewport = imageLocator;
                const imageProperties = await isImageInViewport?.boundingBox();
                expect(imageProperties).not.toBeNull();
                expect(imageProperties?.width).toBeGreaterThan(0);
                expect(imageProperties?.height).toBeGreaterThan(0);
                await expect.soft(isImageInViewport).toBeInViewport();
                for (let i = 0; i < modelImages.length; i++) {
                    const buttonLocator = page.locator(`data-test-id=${slugify(modelImages[i].url)}-${i}`);
                    await buttonLocator.click();
                    if (i == modelImages.length - 1) {
                        await page.waitForTimeout(1000);
                        const isUrlCorrect = page.url().includes(`${url}/images/`);
                        expect(isUrlCorrect).toBeTruthy();
                    } else {
                        expect.soft(modelImages[i].url).toBeTruthy()
                        const imageInViewport = page.locator(`data-test-id=${slugify(modelImages[i].url)}`);
                        const imageResponse = await fetch(modelImages[i].url);
                        expect(imageResponse.status).toBe(200);
                        await imageInViewport.waitFor({ state: "visible" })
                        await expect.soft(imageInViewport).toBeVisible();
                        const imageProps = await imageInViewport?.boundingBox();
                        expect(imageProps).not.toBeNull();
                        expect(imageProps?.width).toBeGreaterThan(0);
                        expect(imageProps?.height).toBeGreaterThan(0);
                        await expect.soft(imageInViewport).toBeInViewport();
                    }
                }
                await page.goto(getPageURL(url));
                const viewAllButton = page.locator('[data-test-id="view-all-images-link"]');
                await viewAllButton.click();
                await expect.soft(page).toHaveURL(getPageURL(`${url}/images/`));

            }
        })

        // TODO: need to check this automation
        test.skip(`Model Page Model Specifications ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            if (!model.specs || model.specs.length === 0) return;
            await page.goto(getPageURL(url), { waitUntil: "load" });
            const locator = page.locator(`#car-specifications`);
            await locator.scrollIntoViewIfNeeded();
            expect.soft(locator).toBeVisible();
            const specifications = getMappedSpecs(model.specs).slice(0, 6)
            for (let i = 0; i < specifications.length; i++) {
                const specsLocator = page.locator(`data-test-id=${specifications[i].label}-${i}`);
                const text = await specsLocator.textContent();
                const unit = typeof specifications[i].unit === 'string' ? specifications[i].unit : '';
                expect.soft(text).toBe(`${specifications[i].value}${unit}${specifications[i].label}`);
            }
            const viewAllButton = page.locator('[data-test-id="view-all-specifications-link"]');
            await viewAllButton.click();
            await page.waitForLoadState("domcontentloaded");
            await expect.soft(page).toHaveURL(getPageURL(`${url}/specifications/`));
        })

        test(`Model Page Recently Launched Cars ${name}`, async ({ page }) => {
            const modelPageData = responseData.data;
            const recentlyLaunchedCars = modelPageData.recentlyLaunchCar?.map(car => car._source);
            await upcomingAndRecentlyLaunchedCars({ page, url, title: "Recently Launched Cars", upcoming_recently_cars: recentlyLaunchedCars });
        })

        test(`Model Page Upcoming Cars ${name}`, async ({ page }) => {
            const modelPageData = responseData.data;
            const upcomingCars = modelPageData?.upcomingCars?.map(car => car._source);
            await upcomingAndRecentlyLaunchedCars({ page, url, upcoming_recently_cars: upcomingCars });
        })

        test(`Model Page Shorts Section ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const modelName = model.name;
            const priceRange = `₹ ${model.minPriceInLakh}-${model.maxPriceInLakh}L*`
            await shortsSection({ page, url, videos: model.shortVideos, modelName, priceRange })
        })

        test(`Model Page Thoughts about ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const positiveThoughts = model.positiveThoughts;
            const negativeThoughts = model.negativeThoughts;
            if ((positiveThoughts || [])?.length === 0 || (negativeThoughts || [])?.length === 0)
                return

            await page.goto(getPageURL(url));
            const thoughtsLocator = page.locator(`data-test-id=thoughts-section`);
            await thoughtsLocator.scrollIntoViewIfNeeded();
            await expect.soft(thoughtsLocator).toBeVisible();
            const thoughts = await thoughtsLocator.textContent();
            expect(thoughts).toBeTruthy();

            const positiveThoughtsLocator = page.locator('data-test-id=positive-thoughts');
            const negativeThoughtsLocator = page.locator('data-test-id=negative-thoughts');
            await expect.soft(positiveThoughtsLocator).toBeVisible();
            await expect.soft(negativeThoughtsLocator).toBeVisible();
            const textPositive = await positiveThoughtsLocator.textContent() || '';
            const textNegative = await negativeThoughtsLocator.textContent() || '';
            expect.soft(textPositive).toBeTruthy();
            expect.soft(textNegative).toBeTruthy();
            checkNullUndefined(textPositive);
            checkNullUndefined(textNegative);
        })

        test(`Model Page FAQ ${name}`, async ({ page }) => {
            const faqSectionData = responseData.data.modelPageSeo.faq;
            if ((faqSectionData || []).length === 0) return;
            await page.goto(getPageURL(url));
            const faqLocator = page.locator(`#faqs`);
            await faqLocator.scrollIntoViewIfNeeded();
            await expect.soft(faqLocator).toBeVisible();

            for (let i = 0; i < faqSectionData.length; i++) {
                const questionLocator = page.locator(`[data-test-id="item-question-${i}"]`)
                await expect.soft(questionLocator).toBeVisible();
                const questionText = await questionLocator.textContent() || '';
                expect.soft(questionText).toBeTruthy();
                checkNullUndefined(questionText);
                await questionLocator.click();
                const answerLocator = page.locator(`[data-test-id="item-answer-${i}"]`)
                await expect.soft(answerLocator).toBeVisible();
                const answerText = await answerLocator.textContent() || '';
                expect.soft(answerText).toBeTruthy();
                checkNullUndefined(answerText);
                await questionLocator.click();
                await expect.soft(answerLocator).not.toBeVisible();
            }

            const btn = page.locator(`data-test-id=show-hide-all-faqs`);
            await btn.click();
            for (let i = 0; i < faqSectionData.length; i++) {
                const answerLocator = page.locator(`[data-test-id="item-answer-${i}"]`)
                await expect.soft(answerLocator).toBeVisible();
            }

            await btn.click();
            for (let i = 0; i < faqSectionData.length; i++) {
                const answerLocator = page.locator(`[data-test-id="item-answer-${i}"]`)
                await expect.soft(answerLocator).not.toBeVisible();
            }
        })

        test(`Page Heading H1 ${name}`, async ({ page }) => {
            const currCity = getUserSelectedCity();
            const headerTabs = getModelTabs(
                tCase.make,
                tCase.makeName,
                tCase.model,
                tCase.modelName,
                currCity,
                tCase.variant || ""
            );
            const backupH1 = headerTabs.find(
                (item) => item.tabId === "model"
            )?.pageHeader;
            await checkPageHeadingH1({
                page,
                url,
                h1: responseData.data.modelPageSeo.h1 || backupH1,
            });
        });

        test(`Model Page Banner ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const videoUrl = model.featureVideo
            const featImgMob = model.featureImageForMobile?.url;
            const featImgDesktop = model.featureImage?.url;
            const specsList = model.specs || [];

            expect.soft(videoUrl).toBeTruthy();
            expect.soft(featImgMob || featImgDesktop).toBeTruthy();

            const responseVideo = await fetch(videoUrl || '');
            expect(responseVideo.status).toBe(200);

            const responseImage = await fetch(featImgMob || featImgDesktop || '');
            expect(responseImage.status).toBe(200);

            await page.goto(getPageURL(url));
            const priceLocator = page.locator('#model-banner-price');
            await expect.soft(priceLocator).toBeVisible();
            const priceText = await priceLocator.textContent() || '';
            checkNullUndefined(priceText)

            const mappedSpecs = getMappedSpecs(specsList).slice(0, 3);
            expect.soft(mappedSpecs).toBeTruthy();

            for (let i = 0; i < mappedSpecs.length; i++) {
                const spec = mappedSpecs[i];
                const locator = page.locator(`#model-banner-spec-${i}`);
                const text = await locator.textContent();
                expect.soft(text).toBe(`${spec.value}${(spec.unit && (typeof spec.unit !== 'object')) ? spec.unit : ''}${spec.label}`);
            }

            const onRoadPriceLocator = page.locator('#on-road-price-link');
            await onRoadPriceLocator.click();
            const userSelectedCity = getUserSelectedCity()
            const pricePageLink = `/${tCase.make}/${tCase.model}/` + "price-in-" + userSelectedCity
            await expect.soft(page).toHaveURL(getPageURL(`${pricePageLink}/`));
        })

        test(`Model Variant By FuelType ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const image = model.carImage?.url ?? "";
            if (!model.fuelTypes || model.fuelTypes.length === 0) return;
            await page.goto(getPageURL(url));

            const modelVariantsByFuelLocator = page.locator(`#car-variants`);
            await modelVariantsByFuelLocator.scrollIntoViewIfNeeded();
            await expect.soft(modelVariantsByFuelLocator).toBeVisible();
            expect.soft(image).toBeTruthy()
            const response = await fetch(image);
            expect(response.status).toBe(200);

            const tabs = model.fuelTypes;
            for (let j = 0; j < tabs.length; j++) {
                const currentTab = tabs[j];
                const variants = model.variants.filter(
                    (variant) => variant.performanceFuel?.fuelType === currentTab
                );
                const tabLocator = page.locator(`#tab-${slugify(tabs[j])}`);
                await tabLocator.click();

                if (variants.length > 4) {
                    await page.getByRole('button', { name: 'View More Variants' }).click();
                }

                for (let i = 0; i < (variants || []).length; i++) {
                    const variant = variants?.[i];

                    const variantLocator = await page.$(`#variant-${variant.slug}`);

                    const variantNameLocator = await variantLocator?.$("#variant-full-name");
                    const variantNameLocatorText = await variantNameLocator?.textContent() || '';
                    checkNullUndefined(variantNameLocatorText)
                    expect.soft(variantNameLocatorText).toBe(`${model?.make.name} ${model?.name} ${variant?.name}`);

                    const variantPrimaryDetailLocator = await variantLocator?.$("#primary-detail");
                    const variantPrimaryDetailLocatorText = await variantPrimaryDetailLocator?.textContent() || '';
                    checkNullUndefined(variantPrimaryDetailLocatorText)
                    expect.soft(variantPrimaryDetailLocatorText).toContain(`₹ ${formatCurrency(variant?.exShowroomPrice?.exShowroomPrice)}*`);

                    const variantPriceLocator = await variantLocator?.$("#secondary-detail");
                    const variantPriceLocatorText = await variantPriceLocator?.textContent() || '';
                    checkNullUndefined(variantPriceLocatorText)
                    const { summary, mileage, range } = getVariantsSpecsSummary(variant)
                    if (variant.performanceFuel?.fuelType === 'Electric') {
                        expect.soft(variantPriceLocatorText).toContain(`${range ? range : ''}`);
                        expect.soft(variantPriceLocatorText).toContain(`${mileage ? mileage : ''}`);
                    } else {
                        expect.soft(variantPriceLocatorText).toContain(`${summary ? summary : ''}`);
                    }
                }

                const randomNumberArr = select3RandomNumbers((variants || []).length);
                for (let ind = 0; ind < randomNumberArr.length; ind++) {
                    const variant = variants?.[randomNumberArr[ind]];
                    const variantLocator = await page.$(`#variant-${variant?.slug}`);
                    await variantLocator?.scrollIntoViewIfNeeded();
                    await variantLocator?.click();
                }

                await page.locator("#compare-variant-sheet-trigger")?.click();
                let sheetLocator = page.locator("#compare-variant-sheet-content");
                await expect.soft(sheetLocator).toBeVisible();


                for (let ind = 0; ind < randomNumberArr.length; ind++) {
                    const variant = variants?.[randomNumberArr[ind]];
                    let variantLocator = await page.$(`#sheet-variant-${variant?.slug}`);

                    const variantNameLocator = await variantLocator?.$("#variant-name");
                    const variantNameLocatorText = await variantNameLocator?.textContent() || '';
                    checkNullUndefined(variantNameLocatorText)
                    expect.soft(variantNameLocatorText).toBe(`${model?.make.name} ${model?.name} ${variant?.name}`);

                    const variantPriceLocator = await variantLocator?.$("#variant-price");
                    const variantPriceLocatorText = await variantPriceLocator?.textContent() || '';
                    checkNullUndefined(variantPriceLocatorText)
                    expect.soft(variantPriceLocatorText).toContain(`${formatCurrency(variant?.exShowroomPrice?.exShowroomPrice)}*`);

                    const crossIconLocator = await variantLocator?.$("#btn-remove-variant");
                    await crossIconLocator?.click();
                    variantLocator = await page.$(`#sheet-variant-${variant?.slug}`);
                    expect.soft(variantLocator).not.toBeTruthy();
                }

                const randomVariants = [];
                for (let ind = 0; ind < randomNumberArr.length; ind++) {
                    const variant = variants?.[randomNumberArr[ind]];
                    if (variant) randomVariants.push(variant);
                    const variantLocator = await page.$(`#variant-${variant?.slug}`);
                    await variantLocator?.scrollIntoViewIfNeeded();
                    await variantLocator?.click();
                }

                await page.locator("#compare-variant-sheet-trigger")?.click();
                sheetLocator = page.locator("#compare-variant-sheet-content");
                await expect.soft(sheetLocator).toBeVisible();

                const compareBtnLocator = page.locator("#btn-sheet-compare-variant");
                const href = await compareBtnLocator.getAttribute("href");
                expect.soft(href).toBe(getPageURL(`/compare-cars/${createCompareLink(randomVariants, `${model?.make.slug}-${model?.slug}`)}`));

                for (let ind = 0; ind < randomNumberArr.length; ind++) {
                    const variant = variants?.[randomNumberArr[ind]];
                    let variantLocator = await page.$(`#sheet-variant-${variant?.slug}`);
                    const crossIconLocator = await variantLocator?.$("#btn-remove-variant");
                    await crossIconLocator?.click();
                    variantLocator = await page.$(`#sheet-variant-${variant?.slug}`);
                    expect.soft(variantLocator).not.toBeTruthy();
                }

                if (variants.length > 4) {
                    await page.getByRole('button', { name: 'View Less Variants' }).click();
                }
            }
        })

        test(`Leaderboard Entry Point ${name}`, async ({ page }) => {
            const modelData = responseData?.data?.modelData._source;
            const leaderboard = responseData?.data?.leaderBoard;
            await leaderboardEntryPoint({ page, url, modelData, leaderboard });
        });
    }
});