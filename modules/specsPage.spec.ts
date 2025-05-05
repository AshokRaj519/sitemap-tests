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
    miniStatData,
    pageTitle,
    seoContent,
    similarCarsSection,
    topComparisonSection,
} from "../../../../new-car/tests/e2e/components/commonComponents";
import {
    brochureDetails,
    exploreCarSpecifications,
    secondaryHeaderClicked,
    userReviewSection,
} from "../../../../new-car/tests/e2e/components/modelPage";
import { getUserSelectedCity } from "@/src/lib/city-utils";
import dotEnv from "dotenv";
import { makeModelDetails } from "../../../../new-car/tests/e2e/constants/makeModel.constants";
import { getSpecificationsData } from "@/src/services/specs.service";
import { TSpecsPage } from "@/src/services/response-types/TSpecsPage";
import { getDefinedMappedSpecs } from "@/src/constants/model.constant";
import {
    EV_KEYS_SPECS,
    NON_EV_KEYS_SPECS,
} from "@/src/modules/specificationsPage/specs.const";
import { getModelTabs } from "../../../../new-car/tests/e2e/constants/modelPage.constant";
import { checkNullUndefined, select3RandomNumbers } from "../../../../new-car/tests/e2e/utils/modelPage";
import { slugify } from "@/src/lib/utils";
import { formatCurrency } from "@/src/lib/num-utils";
import { filterList } from "../../../../new-car/tests/e2e/constants/common.constants";

dotEnv.config();
test.describe("Specs Page", () => {
    for (const tCase of makeModelDetails) {
        let responseData: TSpecsPage;

        test.beforeAll(async () => {
            responseData = await getSpecificationsData(
                `${tCase.make}/${tCase.model}`
            );
        });

        const name = `${tCase.makeName} ${tCase.modelName}`;
        const url = `${tCase.make}/${tCase.model}/specifications`;
        test(`Check Page Title ${name}`, async ({ page }) => {
            await pageTitle({
                page,
                url: url,
                expectedTitle: responseData.data.modelSpecsSeo.title,
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
                (item) => item.tabId === "price"
            )?.pageHeader;
            await checkPageHeadingH1({
                page,
                url,
                h1: responseData.data.modelSpecsSeo.h1 || backupH1,
            });
        });

        test(`Specs Page Secondary Header Links Clicked ${name}`, async ({
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
            const modelSpecsSeo = responseData.data.modelSpecsSeo;
            await breadCrumb({
                page,
                url,
                breadCrumbLabels: modelSpecsSeo.breadCrumb,
                breadCrumbUrl: modelSpecsSeo.breadCrumbUrl,
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
            const seoData = responseData.data.modelSpecsSeo.content;
            await seoContent({ page, url, seoData, id: "#car-specs-content" });
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

        test(`Specs Page mini stats ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const specsList = model.specs;
            const carImage = model?.carImage?.url || "";
            const keys = model.isElectric ? EV_KEYS_SPECS : NON_EV_KEYS_SPECS;
            const limit = 3;
            const imageSelector = responseData.data?.modelSpecsSeo?.h1 ?? `${model.make.name} ${model.name} Specifications`;
            const mappedSpecs = specsList && getDefinedMappedSpecs(specsList, keys, limit);
            const list = [];
            if (mappedSpecs && mappedSpecs.length > 0) {
                for (let i = 0; i < mappedSpecs.length; i++) {
                    list.push({
                        label: mappedSpecs[i]?.label,
                        value: `${mappedSpecs[i]?.value}`,
                    });
                }
            }
            await miniStatData({
                page,
                url,
                list,
                carImage,
                imageSelector,
            });
        });

        test(`Key Specifications ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const mappedSpecs = getDefinedMappedSpecs(
                model.specs ?? [],
                model.isElectric ? EV_KEYS_SPECS : NON_EV_KEYS_SPECS
            ).slice(3, 6);
            if (mappedSpecs.length === 0) return;
            page.goto(getPageURL(url));
            const locater = `#key-specification`;
           await page.waitForSelector(locater, { state: "visible" });
           const specs = page.locator(`#key-specification`);
            await expect.soft(specs).toBeVisible();
            const headingLocator = page.locator(`#key-specs-heading`);
            await expect.soft(headingLocator).toBeVisible();

            for (let i = 0; i < mappedSpecs.length; i++) {
                const locator = page.locator(`#key-specs-${i}`);
                const text = await locator.textContent();
                expect
                    .soft(text)
                    .toContain(`${mappedSpecs[i].label} ${mappedSpecs[i].value}`);
            }
        });

        test(`Compare Variants By Specs ${name}`, async ({ page }) => {
            const model = responseData.data.modelData._source;
            const variants = model.variants;
            if (!variants || variants.length === 0) return;
            page.goto(getPageURL(url));
            const variantsBySpecs = page.locator(`#compare-variants-by-specs`);
            await variantsBySpecs.scrollIntoViewIfNeeded();
            await expect.soft(variantsBySpecs).toBeVisible();

            const heading = page.locator(`#full-specifications`);
            await expect.soft(heading).toBeVisible();
            const headingText = await heading.textContent() || '';
            expect.soft(headingText).toBeTruthy();
            checkNullUndefined(headingText);

            const variantSelector = page.locator(`#compare-variant-selector`);
            await expect.soft(variantSelector).toBeVisible();

            const randomArr = select3RandomNumbers(variants.length);

            const allVariantIds = ['ent', 'pnf', 'sbt', 'dnc', 'cnc', 'sns', 'et', 'int', 'ext'];
            const minSpecToShow = 5;

            const tileSpecFirst = page.locator(`#${allVariantIds[0]}`);
            await tileSpecFirst.click();

            let count = 0;
            for (let index of randomArr) {
                const variantTile = page.locator(`data-test-id=variant-spec-tile-${variants[index].name}`);
                await variantTile.scrollIntoViewIfNeeded();
                await expect.soft(variantTile).toBeVisible();
                await variantTile.click();
                const allSpecs = page.locator(`data-test-id=all-variant-specs-${variants[index]?.name}`);
                await expect.soft(allSpecs).toBeVisible();
                const variant = variants[index];
                const allVariantSpecs = [
                    variant?.engineTransmission, variant?.performanceFuel,
                    variant?.suspension, variant?.dimensionsCapacity,
                    variant?.comfortConvenience, variant?.safetySecurity,
                    variant?.entertainment, variant?.interior, variant?.exterior
                ];

                for (let i = 0; i < allVariantSpecs.length; i++) {
                    const spec = allVariantSpecs[i];
                    if (spec && !Object.keys(spec)?.length) {
                        continue;
                    }
                    const allSpecsOfTile = spec ? Object.keys(spec).filter(key => spec[key]) : [];
                    const tileSpec = page.locator(`#${allVariantIds[i]}`);
                    await expect.soft(tileSpec).toBeVisible();
                    await tileSpec.click();

                    if (allSpecsOfTile.length > minSpecToShow) {
                        if (count == 0) {
                            const viewBtn = page.locator(`#${allVariantIds[i]}`).getByText('View More Specs');
                            await viewBtn.scrollIntoViewIfNeeded();
                            await expect.soft(viewBtn).toBeVisible();
                            await viewBtn.click();
                        }
                    }

                    const allTextContent = await tileSpec.textContent() || '';
                    expect.soft(allTextContent).toBeTruthy();
                    checkNullUndefined(allTextContent);
                }
                const clicked = variants[index];
                const variantTileText = await variantTile.textContent() || '';
                expect.soft(variantTileText).toBeTruthy();
                checkNullUndefined(variantTileText)
                const price = `₹ ${formatCurrency(clicked?.exShowroomPrice?.exShowroomPrice)}*`
                const selected = page.locator(`#${slugify(`variant-selected-${clicked.name}`)}`);
                await selected.scrollIntoViewIfNeeded();
                await expect.soft(selected).toBeVisible();
                const selectedText = await selected.textContent() || '';
                checkNullUndefined(selectedText)
                expect.soft(selectedText).toBe(`${model.name} ${clicked.name}${price}`);
                count++;
            }

            for (let item of randomArr) {
                const searchBar = page.locator(`data-test-id=search-bar-specs`);
                await expect.soft(searchBar).toBeVisible();
                await searchBar.click();
                await searchBar.fill(variants[item].name);
                const tile = page.locator(`data-test-id=variant-spec-tile-${variants[item].name}`);
                await tile.scrollIntoViewIfNeeded();
                await expect.soft(tile).toBeVisible();
            }

            if (!model.isElectric) {
                const filterLocator = page.locator('#filter-variants-list');
                await filterLocator.scrollIntoViewIfNeeded();
                await expect.soft(filterLocator).toBeVisible();

                for (let i = 0; i < filterList.length; i++) {
                    const locator = page.locator(`#mobile-filter-${slugify(filterList[i].title)}`);
                    await expect.soft(locator).toBeVisible();
                    await locator.click();

                    for (let j = 0; j < filterList[i].filters.length; j++) {
                        const filter = filterList[i].filters[j];
                        const checkBox = page.locator(`data-test-id=${filter.label}${filter.value}`);
                        await expect.soft(checkBox).toBeVisible();
                        await checkBox.click();
                    }

                    const showResult = page.locator(`data-test-id=show-results`);
                    await expect.soft(showResult).toBeVisible();
                    await showResult.click();

                    for (let j = 0; j < filterList[i].filters.length; j++) {
                        const filter = filterList[i].filters[j];
                        const buttonLocator = page.locator(`#mobile-applied-filter-${slugify(filter.label)}`);
                        await expect.soft(buttonLocator).toBeVisible();
                        await page.waitForTimeout(500);
                        await buttonLocator.click();
                        await expect.soft(buttonLocator).not.toBeVisible();
                    }
                }

                for (let i = 0; i < filterList.length; i++) {
                    const locator = page.locator(`#mobile-filter-${slugify(filterList[i].title)}`);
                    await expect.soft(locator).toBeVisible();
                    await locator.click();

                    for (let j = 0; j < filterList[i].filters.length; j++) {
                        const filter = filterList[i].filters[j];
                        const checkBox = page.locator(`data-test-id=${filter.label}${filter.value}`);
                        await expect.soft(checkBox).toBeVisible();
                        await checkBox.click();
                    }

                    if (i == filterList.length - 2) {
                        const clearResult = page.locator(`data-test-id=clear-results`);
                        await expect.soft(clearResult).toBeVisible();
                        await clearResult.click();
                        await expect.soft(locator).toBeVisible();
                    } else if (i == filterList.length - 1) {
                        const closeBtn = page.getByRole('button', { name: 'Close' });
                        await expect.soft(closeBtn).toBeVisible();
                        await closeBtn.click();
                        await expect.soft(locator).toBeVisible();
                    } else {
                        const showResult = page.locator(`data-test-id=show-results`);
                        await expect.soft(showResult).toBeVisible();
                        await showResult.click();
                        for (let j = 0; j < filterList[i].filters.length; j++) {
                            const filter = filterList[i].filters[j];
                            const buttonLocator = page.locator(`#mobile-applied-filter-${slugify(filter.label)}`);
                            await expect.soft(buttonLocator).toBeVisible();
                            await buttonLocator.click();
                            await expect.soft(buttonLocator).not.toBeVisible();
                        }
                    }
                }
            }
        })
    }
});