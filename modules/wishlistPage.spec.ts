import { devices, expect, Locator, Page, test } from "@playwright/test";
import dotEnv from "dotenv";
import { login } from "../components/login";
import { getPageURL, testId } from "../components/commonComponents";
import { LOGIN_MOBILE_FORM } from "@/src/core-module/loginConstants/common";
import { SORT_BY_OPTIONS } from "@/src/modules/wishlistPage/wishlist.const";
import { checkArraySortOrder } from "../utils/common";
import apiClient from "@/src/services/api.client";
import ENDPOINT from "@/src/services/endpoints";
import { TKeyFactors } from "@/src/services/response-types/TKeyFactors";
import { getWishlistModels } from "@/src/services/wishlist.service";
import { FilterMap } from "@/src/types/core/TLeaderboard";
import { filterKeyMapping } from "@/src/components/molecules/FilterCarPopup/types";

dotEnv.config();
test.describe("Wishlist Page", async () => {
  const getPageTitle = (count: number) =>
    `Wishlist Garage ${count ? `(${count} cars)` : `(0 car)`}`;

  function getMinPrice(text?: string | null) {
    if (!text) return;
    const regex = /₹\s*(\d+(\.\d+)?)L/;
    const match = regex.exec(text);
    // Check if there's a match and return the first capturing group (the number)
    return match ? match[1] : undefined;
  }

  async function addToWishlist(page: Page, from: string = "upcoming-cars/") {
    await page.goto(getPageURL(from));
    await page.waitForTimeout(2000);
    const wishlistButtons = await page.$$(testId("wishlist-btn", false));
    const ids = [];

    // Add Models to wishlist
    for (const btn of wishlistButtons) {
      ids.push(await btn.getAttribute("data-test-id"));
      await btn.click();
      await page.waitForTimeout(2000);
    }
    return ids;
  }

  test(`Login prompt should appear for logged-out used while whistling`, async ({
    page,
  }) => {
    await page.goto(getPageURL("upcoming-cars/"));
    const wishlistButton = await page.$(testId("wishlist-btn", false));
    await wishlistButton?.click();
    await page.waitForTimeout(1000);
    const loginBtn = page.locator(testId("desktop-Login"));
    expect(await loginBtn.count()).toBe(1);
    const wishlistLoginTagLine = page.getByText(
      LOGIN_MOBILE_FORM.tagline.wishlist
    );
    expect(await wishlistLoginTagLine.count()).toBe(1);
  });

  test("Go to wishlist page from header", async ({ page }) => {
    await login(page);
    await page.goto(getPageURL());
    const profileBtn = page.locator(testId("desktop-user-profile"));
    await profileBtn.click();
    const wishlistMenu = page.locator(testId("desktop-Wishlist garage"));
    await wishlistMenu.click();
    await page.waitForTimeout(1000);
    expect.soft(page.url().endsWith("wishlist/")).toBeTruthy();
  });

  test("Redirect from wishlist to homepage if user is logged-out", async ({
    page,
  }) => {
    await page.goto(getPageURL("wishlist/"));
    await page.waitForTimeout(1000);
    expect.soft(page.url().endsWith(getPageURL("/"))).toBeTruthy();
  });

  test(`Wishlist models and remove them from wishlist page`, async ({
    page,
  }) => {
    await login(page);
    const ids = await addToWishlist(page);

    await page.goto(getPageURL("wishlist/"));
    await page.waitForTimeout(2000);

    const pageTitle = await page.locator(testId("page-title")).textContent();
    expect.soft(pageTitle).toBe(getPageTitle(ids.length));

    // Remove Models from wishlist
    for (const id of ids) {
      if (id) {
        const wishListedModel = await page.$(testId(id));
        const btnId = await wishListedModel?.getAttribute("data-test-id");
        expect.soft(btnId).toBeTruthy();
        await wishListedModel?.click();
      }
    }

    await page.waitForTimeout(4000);
    const pageTitleEmpty = await page
      .locator(testId("page-title"))
      .textContent();
    expect.soft(pageTitleEmpty).toBe(getPageTitle(0));
  });

  test("Apply sorting", async ({ page }) => {
    await login(page);
    await addToWishlist(page);

    await page.goto(getPageURL("wishlist/"));
    await page.waitForTimeout(2000);
    // Apply Sorting
    async function testSortingOrder(trigger: Locator) {
      for (let i = 1; i < SORT_BY_OPTIONS.length; i++) {
        const sortOption = SORT_BY_OPTIONS[i];
        await trigger.click();
        await page.getByText(sortOption.label).click();
        await page.waitForTimeout(2000);

        const models = await page?.$$(testId("price-range", false));
        const minPriceList = [];
        if (models) {
          for (const model of models) {
            const minPrice = getMinPrice(await model.textContent());
            if (minPrice) minPriceList.push(Number(minPrice));
          }
        }

        const sortOrder = checkArraySortOrder(minPriceList);
        switch (sortOption.value) {
          case "asc": {
            expect.soft(sortOrder).toBe("ascending");
            break;
          }
          case "desc": {
            expect.soft(sortOrder).toBe("descending");
            break;
          }
        }
      }
    }

    // for Desktop
    const sortByDropDown = page.getByText("Sort By - "); // to be replaced by id
    await testSortingOrder(sortByDropDown);

    // for Mobile
    page.setViewportSize(devices["iPhone 12 Pro"].viewport);
    const sortByMobile = page.locator(testId("sort-by-btn-mobile"));
    await testSortingOrder(sortByMobile);
  });

  test("Apply filters", async ({ page }) => {
    const token = await login(page);
    await addToWishlist(page);

    await page.goto(getPageURL("wishlist/"));
    await page.waitForTimeout(2000);

    const filtersRes = (await apiClient.get(ENDPOINT.leaderBoardFilter, {
      params: { pageType: "mileage" },
    })) as { data: Record<string, TKeyFactors[]> };
    async function testFilters(trigger: Locator) {
      const filters = filtersRes.data;
      const filterKeys = Object.keys(filters).filter((key) => filters[key]);
      for (const key of filterKeys) {
        const filter = filters[key][0];
        await trigger.click();
        await page.waitForTimeout(2000);
        await page.locator(testId(`category-tab-${key}`)).click();
        await page.locator(testId(`filter-key-${filter.name}`)).click();
        const filterMap: FilterMap = {};
        filterMap[key] = {
          filterKey: filterKeyMapping[key],
          value: [
            {
              apiKey: filter.name,
              value: filter.name,
            },
          ],
        };
        const wishlistData = await getWishlistModels(1, filterMap, "", token);
        await page.locator(testId("show-cars-btn")).click();
        await page.waitForTimeout(2000);
        for (const model of wishlistData?.data) {
          const modelCard = await page.$(testId(model.slug));
          expect.soft(modelCard).toBeTruthy();
        }
        const filterChip = page.locator(testId(`filter-chip-cross-${filter.name}`));
        expect.soft(filterChip).toBeTruthy();
        await filterChip?.click();
        await page.waitForTimeout(2000);
      }
    }

    // for Desktop
    const filterBtnDesktop = page.locator(testId("filter-trigger-desktop"));
    await testFilters(filterBtnDesktop);

    // // for Mobile
    page.setViewportSize(devices["iPhone 12 Pro"].viewport);
    const filterBtnMobile = page.locator(testId("filter-btn-mobile"));

    await testFilters(filterBtnMobile);
  });
});
