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
    similarCarsSection,
    topComparisonSection,
} from "../components/commonComponents";
import { brochureDetails, exploreCarSpecifications, secondaryHeaderClicked } from "../components/modelPage";
import { getUserSelectedCity } from "@/src/lib/city-utils";
import dotEnv from "dotenv";
import { makeModelDetails } from "../constants/makeModel.constants";
import { TVariantPage } from "@/src/services/response-types/TVariantPage";
import { getVariantsData } from "@/src/services/variant.service";
import { getModelTabs } from "../constants/modelPage.constant";
import { filterList } from "../constants/common.constants";
import { slugify } from "@/src/lib/utils";
import { checkNullUndefined, select3RandomNumbers } from "../utils/modelPage";
import { formatCurrency } from "@/src/lib/num-utils";

dotEnv.config();
test.describe("Variants Page", () => {
    for (const tCase of makeModelDetails) {
        let responseData: TVariantPage;

        test.beforeAll(async () => {
            const currCity = getUserSelectedCity();
            responseData = await getVariantsData(
                `${tCase.make}/${tCase.model}`, currCity
            );
        });

        const name = `${tCase.makeName} ${tCase.modelName}`;
        const url = `${tCase.make}/${tCase.model}/variants`;
        test(`Check Page Title ${name}`, async ({ page }) => {
            await pageTitle({
                page,
                url: url,
                expectedTitle: responseData.data.variantSeo.title,
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

        test(`Page Heading H1 ${name}`, async ({ page }) => {
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
                (item) => item.tabId === "variants"
            )?.pageHeader;
            await checkPageHeadingH1({
                page,
                url,
                h1: responseData.data.variantSeo.h1 || backupH1,
            });
        });

        test(`Variants Page Secondary Header Links Clicked ${name}`, async ({
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
            const variantSeo = responseData.data.variantSeo;
            await breadCrumb({
                page,
                url,
                breadCrumbLabels: variantSeo.breadCrumb,
                breadCrumbUrl: variantSeo.breadCrumbUrl,
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

            const title = `Compare ${modelFullName} With Rivals`;
            await topComparisonSection({
                page,
                url,
                carsToCompare,
                title,
            });
        });

        test(`SEO Content ${name}`, async ({ page }) => {
            const seoData = responseData.data.variantSeo.content;
            await seoContent({ page, url, seoData, id: "#variant-content" })
        })

        test(`Broucher ${name}`, async ({ page }) => {
            await brochureDetails({ page, url, modelBrochure: responseData.data.modelData._source })
        })

        test(`Explore Car Specifications ${name}`, async ({ page }) => {
            const longVideos = responseData.data.modelData._source.longVideos;
            if ((longVideos || []).length > 0) {
                await exploreCarSpecifications({ page, url, longVideos });
            }
        });

        test(`Variants Mini Stats ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const makeName = model.make.name;
            const modelName = model.name;
            const carImage = model?.carImage?.url || "";
            await page.goto(getPageURL(url));
            const headingLocator = await page.locator(`#variants-heading`).textContent();
            expect(headingLocator).toBe(`${makeName} ${modelName} Variants`);

            expect.soft(carImage).toBeTruthy()
            const response = await fetch(carImage || '');
            expect(response.status).toBe(200);
            const isImageInViewport = page.getByRole('img', { name: `${model.name}`, exact: true })
            await isImageInViewport.scrollIntoViewIfNeeded();
            const imageProperties = await isImageInViewport?.boundingBox();
            expect(imageProperties).not.toBeNull();
            expect(imageProperties?.width).toBeGreaterThan(0);
            expect(imageProperties?.height).toBeGreaterThan(0);
            await expect.soft(isImageInViewport).toBeInViewport()
        });

        test(`Variant Section in Variant Page ${name}`, async ({ page }) => {
            await page.goto(getPageURL(url));

            const model = responseData.data.modelData._source;
            const variants = model.variants;
            const modelName = model.name;
            const makeName = model.make.name;

            if ((variants || []).length === 0) return;

            if (!model.isElectric) {
                for (let i = 0; i < (filterList || []).length; i++) {
                    const item = filterList?.[i];
                    for (let j = 0; j < (item?.filters || []).length; j++) {
                        const filter = item?.filters?.[j];
                        const filterLocator = await page.$(`#checkbox-filter-${slugify(filter?.label || "")}`);
                        await filterLocator?.scrollIntoViewIfNeeded();
                        await filterLocator?.click();

                        let currAppliedFilter = await page.$(`#applied-filter-${slugify(filter?.label || "")}`);
                        if (currAppliedFilter) {
                            expect.soft(currAppliedFilter).toBeTruthy();
                            await currAppliedFilter?.click();
                            currAppliedFilter = await page.$(`#applied-filter-${slugify(filter?.label || "")}`);
                            expect.soft(currAppliedFilter).not.toBeTruthy();
                        }
                    }
                }

                for (let i = 0; i < (filterList || []).length; i++) {
                    const item = filterList?.[i];
                    for (let j = 0; j < (item?.filters || []).length; j++) {
                        const filter = item?.filters?.[j];
                        const filterLocator = await page.$(`#checkbox-filter-${slugify(filter?.label || "")}`);
                        await filterLocator?.click();
                    }
                }

                const clearBtn = page.getByRole('button', { name: 'Clear All' });
                await clearBtn.click();
                await expect.soft(clearBtn).not.toBeVisible();
            }

            const randomNumberArr = select3RandomNumbers(variants.length);
            for (let ind = 0; ind < randomNumberArr.length; ind++) {
                const variant = variants[randomNumberArr[ind]];
                const variantLocator = await page.$(`data-test-id=variant-id-${variant.variant_id}`);

                const variantNameLocator = await variantLocator?.$("#variant-name");
                const variantNameLocatorText = await variantNameLocator?.textContent();
                checkNullUndefined(variantNameLocatorText);
                expect.soft(variantNameLocatorText).toBe(`${modelName} ${variant.name}`);

                const price = formatCurrency(variant.exShowroomPrice?.exShowroomPrice);
                const fuelType = variant.performanceFuel?.fuelType;
                const nonElectricSpecList = [
                    { label: "Engine", value: variant.engineTransmission?.engineDisplacement + " cc" ?? "-" },
                    { label: "Fuel", value: fuelType ?? "-" },
                    { label: "Transmission", value: variant.engineTransmission?.transmissionType ?? "-" },
                ];
                const electricSpecList = [
                    { label: "Range", value: variant.performanceFuel?.range + " km" ?? "-" },
                    { label: "Battery Capacity", value: variant.performanceFuel?.batteryCapacity + " kWh" ?? "-" },
                    { label: "Max Torque", value: variant.performanceFuel?.maxTorque?.toLowerCase() ?? "-" },
                ];
                const specList = fuelType === 'Electric' ? electricSpecList : nonElectricSpecList;

                const priceLocator = await variantLocator?.$("#variant-price");
                const priceLocatorText = await priceLocator?.textContent();
                checkNullUndefined(priceLocatorText);
                expect.soft(priceLocatorText).toBe(`₹ ${price}*`);

                for (let specInd = 0; specInd < specList.length; specInd++) {
                    const spec = specList[specInd];

                    const specLabelLocator = await variantLocator?.$(`#spec-label-${slugify(spec.label)}`);
                    const specLabelLocatorText = await specLabelLocator?.textContent();
                    expect.soft(specLabelLocatorText).toBe(spec.label);

                    const specValueLocator = await variantLocator?.$(`#spec-value-${slugify(spec.value)}`);
                    const specValueLocatorText = await specValueLocator?.textContent();
                    checkNullUndefined(specValueLocatorText);
                    expect.soft(specValueLocatorText).toBe(spec.value);
                }

                const features = variant.featuresHints || [];
                const minFeaturesToShow = 3;
                const hasMoreFeatures = features.length >= minFeaturesToShow;
                for (let minFeatInd = 0; minFeatInd < minFeaturesToShow; minFeatInd++) {
                    const currMinFeature = features[minFeatInd];
                    if (!currMinFeature) continue;
                    const featureLocator = await variantLocator?.$(`#min-feature-${slugify(currMinFeature.attributeName)}`);
                    const featureLocatorText = await featureLocator?.textContent();
                    checkNullUndefined(featureLocatorText);
                    expect.soft(featureLocatorText).toBe(currMinFeature.attributeName);
                }

                if (hasMoreFeatures) {
                    const sheetLocator = await variantLocator?.$(`#all-feature-sheet-${variant.variant_id}`);
                    await sheetLocator?.click();

                    for (let minFeatInd = 0; minFeatInd < features.length; minFeatInd++) {
                        const currMinFeature = features[minFeatInd];
                        const featureLocator = await page?.$(`#sheet-feature-${slugify(currMinFeature.attributeName)}`);
                        const featureLocatorText = await featureLocator?.textContent();
                        checkNullUndefined(featureLocatorText);
                        expect.soft(featureLocatorText).toBe(currMinFeature.attributeName);
                    }

                    const sheetCloseLocator = await page.$("#sheet-close-button");
                    await sheetCloseLocator?.click();
                }

                const compareBtnLocator = await variantLocator?.$(`#add-to-compare-btn-${variant.variant_id}`);
                await compareBtnLocator?.click();

                await page.waitForTimeout(1000);
                let makeSelectorLocator = await page.$("#compare-popup-make-selector");
                await makeSelectorLocator?.click();

                const makePopupSelector = await page.$("#popup-make-select");
                if (!makePopupSelector) await makeSelectorLocator?.click();

                await page.waitForTimeout(1000);
                const makeTataLocator = await page.$("#popup-make-tata");
                await makeTataLocator?.click();
                await page.waitForTimeout(1000);

                let modelSelectorLocator = await page.$("#popup-model-select");
                if (!modelSelectorLocator) {
                    const modelSelectLocator = await page.$("#compare-popup-model-selector");
                    await modelSelectLocator?.click();
                }
                await page.waitForTimeout(1000);
                const modelPunchLocator = await page.$("#popup-model-punch");
                await page.waitForTimeout(1000);
                await modelPunchLocator?.click();
                await page.waitForTimeout(1000);
                let pickFirstVariant = await page.$("#popup-variant-list-0");
                await pickFirstVariant?.click();
                await page.waitForTimeout(1000);

                makeSelectorLocator = await page.$("#compare-popup-make-selector");
                await makeSelectorLocator?.click();
                await page.waitForTimeout(1000);
                const makeMarutiLocator = await page.$("#popup-make-maruti-suzuki");
                await page.waitForTimeout(1000);
                await makeMarutiLocator?.click();
                await page.waitForTimeout(1000);

                modelSelectorLocator = await page.$("#popup-model-select");
                if (!modelSelectorLocator) {
                    const modelSelectLocator = await page.$("#compare-popup-model-selector");
                    await modelSelectLocator?.click();
                }
                await page.waitForTimeout(1000);
                const modelWagonRLocator = await page.$("#popup-model-wagon-r");
                await modelWagonRLocator?.click();
                await page.waitForTimeout(1000);

                pickFirstVariant = await page.$("#popup-variant-list-0");
                await pickFirstVariant?.click();

                const popupCompareBtnLocator = await page.$("#popup-compare-btn");
                await popupCompareBtnLocator?.click();

                await page.waitForTimeout(1000);
                await page.waitForLoadState("domcontentloaded");
                await page.waitForTimeout(1000);

                const comparePageH1Locator = await page.$("#compare-page-heading");
                const comparePageH1Text = await comparePageH1Locator?.textContent();
                expect(comparePageH1Text).toContain(`${makeName} ${modelName} vs Tata Punch vs Maruti Suzuki Wagon R Comparison`);

                await page.goto(getPageURL(url));
                await page.waitForTimeout(1000);
                await page.waitForLoadState("domcontentloaded");
                await page.waitForTimeout(1000);
            }
        });
    }
});
