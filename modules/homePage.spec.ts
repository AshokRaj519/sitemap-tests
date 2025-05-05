import { test } from '@/lambdatest-setup';
import { breadCrumb, footerClicked, footerVisible, getPageURL, logoClicked, logoVisible, pageTitle, seoContent, topComparisonSection, upcomingAndRecentlyLaunchedCars } from '../components/commonComponents';
import { getHomePageData } from '@/src/services/home.service';
import { THomePage } from '@/src/services/response-types/THomePage';
import { expect } from '@playwright/test';
import { homePageVariables } from '../variables/homePageVariables';
import { priceTabs, seatingCapacityTabs } from '@/src/constants/homepage.constants';
import { slugify } from '@/src/lib/utils';
import dotEnv from "dotenv";
import { getMakeFilterData } from '../utils/homePage';
dotEnv.config()
test.describe('Homepage', () => {
    let responseData: THomePage;
    const currentYear = new Date().getFullYear();

    test.beforeAll(async () => {
        responseData = await getHomePageData()
    })

    test('Check page title', async ({ page }) => {
        await pageTitle({ page, expectedTitle: `New Cars in ${currentYear} : New Cars Price, Images & Specs in India` });
    });

    test('Logo Visible', async ({ page }) => {
        await logoVisible({ page });
    })

    test('Logo Click', async ({ page }) => {
        await logoClicked({ page });
    })

    test('Footer Visible', async ({ page }) => {
        await footerVisible({ page });
    })

    test("Footer and social media links Clicked", async ({ page }) => {
        await footerClicked({ page })
    })

    test("SEO Content / Key Factors for homepage", async ({ page }) => {
        await seoContent({ page, url: "", seoData: responseData.data.keyFactors.content, id: "#key-factors" })
    })

    test("BreadCrumb for homePage", async ({ page }) => {
        await breadCrumb({ page, url: "", breadCrumbLabels: "", breadCrumbUrl: "" })
    })

    test("Top brandsHomepage", async ({ page }) => {
        await page.goto(getPageURL());

        const locator = page.locator(homePageVariables.brandButton);
        await locator.click();
        expect.soft(page.locator(homePageVariables.viewAllBrands)).toBeTruthy();
        await page.locator(homePageVariables.viewAllBrands).click()

        const brandsData = responseData.data.topBrand;
        for (let i = 0; i < brandsData.length; i++) {
            const currBrand = brandsData[i];
            const brandLocator = await page.$(`#top-brand-${currBrand.slug}`);
            const href = await brandLocator?.getAttribute("href");
            expect.soft(href).toContain(`/${currBrand.slug}`);
        }
    })

    test("Browse By Price", async ({ page }) => {
        await page.goto(getPageURL());
        await page.locator(homePageVariables.priceButton).click();
        const tabs = priceTabs
        for (let index = 0; index < tabs.length; index++) {
            const tab = tabs[index];
            const tabId = `tab-${slugify(tab.name)}`
            // clicking on price tabs under 4 lakhs, 5 lakhs ...
            await page.locator(`#${tabId}`).click();
            const filter = {
                price: `${tab.value[0]}-${tab.value[1]}`,
                sortType: 'asc',
                launchStatus: 'Launched',
                sortBy: 'minPriceInLakh'
            };
            const { data } = await getMakeFilterData(filter);
            const priceData = responseData.data.under4Lakh;
            const items = index === 0 ? priceData : data ?? [];
            const filteredData = items.filter((m) => !!m?._source?.featureVideo);

            for (let v = 0; v < filteredData.length; v++) {
                const currentModel = filteredData[v];
                const id = `#browse-by-price-${slugify(currentModel._source.name)}`;
                const tileLocator = await page.waitForSelector(id, { state: 'attached' });
                const href = await tileLocator?.getAttribute("href");
                expect.soft(href).toBe(`/new-cars/${currentModel._source.make.slug}/${currentModel._source.slug}/`);
                await tileLocator?.hover();
                //after mousehover it will take some fractions of seconds to get youtube link 
                const ytPlayerLocator = await tileLocator?.$("#youtube-video-player");
                const ytSrc = await ytPlayerLocator?.getAttribute("src");
                expect.soft(ytSrc).toBeTruthy();
                const viewAllBtnId = `#view-all-${slugify(tab.name)}-cars`;
                const viewAllLocator = await page.$(viewAllBtnId);
                const viewAllHref = await viewAllLocator?.getAttribute("href");
                expect.soft(viewAllHref).toBe(`/new-cars/search-by/cars-${tab.url}/`);
            }
        }
    })

    test("Browse By Seating Capacity", async ({ page }) => {
        await page.goto(getPageURL());
        await page.locator(homePageVariables.seatingCapacityButton).click();
        const tabs = seatingCapacityTabs

        for (let index = 0; index < tabs.length; index++) {
            const tab = tabs[index];
            const tabId = `tab-${slugify(tab.name)}`
            //click on the Tab
            await page.locator(`#${tabId} `).click();
            const filter = {
                seatingCapacity: tab.value,
                sortType: 'desc',
                sortBy: 'latestMonthlySales',
                launchStatus: 'Launched',
                orderBy: 'latestMonthlySales'
            };
            const { data } = await getMakeFilterData(filter);
            const seatingCapacityData = responseData.data.fiveSeaterData;
            const items = index === 0 ? seatingCapacityData : data ?? [];
            const filteredData = items.filter((m) => !!m?._source?.name);

            for (let v = 0; v < filteredData.length; v++) {
                const currentModel = filteredData[v];
                const id = `#browse-by-seating-capacity-${slugify(currentModel._source.name)}`;
                const tileLocator = await page.$(id);
                //to get href it need some fraction of secondes 
                await page.waitForTimeout(2000);
                const href = await tileLocator?.getAttribute("href");
                expect.soft(href).toBe(`/new-cars/${currentModel._source.make.slug}/${currentModel._source.slug}/`);

                const viewAllBtnId = `#view-all-${slugify(tab.name)}-cars`;
                const viewAllLocator = await page.$(viewAllBtnId);
                const viewAllHref = await viewAllLocator?.getAttribute("href");
                expect.soft(viewAllHref).toBe(`/new-cars/search-by/${tab.url}-cars/`);
            }
        }
    })

    test("Browse By Body Type", async ({ page }) => {
        await page.goto(getPageURL());
        await page.locator(homePageVariables.bodyTypeButton).click();
        const tabs = responseData.data.bodyTypeData.data;

        for (let index = 0; index < tabs.length; index++) {
            const tab = tabs[index];
            const url = `/search-by/${slugify(tab.name.toLowerCase())}-cars`;
            const tabId = `tab-${slugify(tab.name)}`
            await page.locator(`#${tabId} `).click();
            const filter = {
                bodyTypes: tab.name,
                sortType: 'desc',
                sortBy: 'latestMonthlySales',
                launchStatus: 'Launched',
                orderBy: 'latestMonthlySales'
            };
            const { data } = await getMakeFilterData(filter);
            const bodyTypeData = responseData.data.bodyTypeData.firstDetails;
            const items = index === 0 ? bodyTypeData : data || [];
            const filteredData = items.filter((m) => !!m?._source?.name);

            for (let v = 0; v < filteredData.length; v++) {
                const currentModel = filteredData[v];
                const id = `#browse-by-body-type-${slugify(currentModel._source.name)}`;

                //after mousehover it will take some fractions of seconds to get youtube link 
                await page.waitForTimeout(1000);
                const tileLocator = page.locator(id);
                const href = await tileLocator?.getAttribute("href");
                expect.soft(href).toBe(`/new-cars/${currentModel._source.make.slug}/${currentModel._source.slug}/`);

                const viewAllBtnId = `#view-all-${slugify(tab.name)}-cars`;
                const viewAllLocator = await page.$(viewAllBtnId);
                const viewAllHref = await viewAllLocator?.getAttribute("href");
                expect.soft(viewAllHref).toBe(`/new-cars${url}/`);
            }
        }
    })

    test("Browse By Fuel Type", async ({ page }) => {
        await page.goto(getPageURL());
        await page.waitForLoadState("domcontentloaded");
        await page.locator(homePageVariables.fuelTypeButton).click();
        const tabs = responseData.data.fuelTypeData.data;
        for (let index = 0; index < tabs.length; index++) {
            const tab = tabs[index];
            const url = `/search-by/${tab.name.toLowerCase()}-cars`;
            const tabId = `tab-${slugify(tab.name)}`
            await page.locator(`#${tabId}`).click();
            const filter = {
                fuelTypes: tab.name,
                sortType: 'desc',
                sortBy: 'latestMonthlySales',
                launchStatus: 'Launched',
                orderBy: 'latestMonthlySales'
            }
            const { data } = await getMakeFilterData(filter);
            const fuelData = responseData.data.fuelTypeData.firstDetails;
            const items = index === 0 ? fuelData : data || [];
            const filteredData = items.filter((m) => !!m?._source?.name && m._source?.featureVideo);

            for (let v = 0; v <= (filteredData || []).length; v++) {
                const currentModel = filteredData?.[v];
                if (!currentModel?._source?.name) continue;
                const id = `#browse-by-fuel-type-${slugify(currentModel._source.name)}`;
                const tileLocator = await page.waitForSelector(id, { state: 'attached' });
                const href = await tileLocator?.getAttribute("href");
                expect.soft(href).toBe(`/new-cars/${currentModel._source.make.slug}/${currentModel._source.slug}/`);

                const viewAllBtnId = `#view-all-${slugify(tab.name)}-cars`;
                const viewAllLocator = page.locator(viewAllBtnId);
                const viewAllHref = await viewAllLocator?.getAttribute("href");
                expect.soft(viewAllHref).toBe(`/new-cars${url}/`);
            }
        };
    })

    test(`Model Page Recently Launched Cars`, async ({ page }) => {
        const modelPageData = responseData.data;
        const recentlyLaunchedCars = modelPageData.recentlyLaunchCar?.map(car => car._source);
        await upcomingAndRecentlyLaunchedCars({ page, url: "", title: "Recently Launched Cars", upcoming_recently_cars: recentlyLaunchedCars });
    })

    test(`Model Page Upcoming Cars`, async ({ page }) => {
        const modelPageData = responseData.data;
        const upcomingCars = modelPageData?.upcomingCars?.map(car => car._source);
        await upcomingAndRecentlyLaunchedCars({ page, url: "", upcoming_recently_cars: upcomingCars });
    })


    test(`Compare With Rivals`, async ({ page }) => {
        const carsToCompare = responseData.data.comparision.comparisionData.variants;

        const title = `You decide who wins`;
        await topComparisonSection({
            page,
            url: "",
            carsToCompare,
            title,
        });
    });
});
