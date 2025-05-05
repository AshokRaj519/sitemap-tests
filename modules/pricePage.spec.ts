import { slugify } from "@/src/lib/utils";
import { test } from '@/lambdatest-setup';
import { expect } from "@playwright/test";
import {
  breadCrumb,
  checkPageHeadingH1,
  footerClicked,
  footerVisible,
  getPageURL,
  locationSelectSection,
  logoClicked,
  logoVisible,
  pageTitle,
  seoContent,
} from "../components/commonComponents";
import {
  exploreCarSpecifications,
  priceInCities,
  priceStatSection,
  secondaryHeaderClicked,
  userReviewSection,
} from "../components/modelPage";
import { getUserSelectedCity } from "@/src/lib/city-utils";
import dotEnv from "dotenv";
import {
  bodyTypeListTest,
  fuelTypeListTest,
  makeModelDetails,
  priceSlabListTest,
  seatingCapacityListTest,
} from "../constants/makeModel.constants";
import { TPricePage } from "@/src/services/response-types/TPricePage";
import {
  getPriceData,
  getPriceDataInOtherCities,
} from "@/src/services/price.service";
import { TPriceInCity } from "@/src/types/core/TPriceInCity";
import { getModelTabs } from "../constants/modelPage.constant";
import { getVariantsSpecsSummary } from "@/src/lib/variant-utils";
import { getPriceHint, PRICE_HINTS } from "@/src/constants/priceHint.constants";
import { formatCurrency } from "@/src/lib/num-utils";
import { checkNullUndefined, select3RandomNumbers } from "../utils/modelPage";
import { filterList } from "../constants/common.constants";

dotEnv.config();
test.describe("Price Page", () => {
  for (const tCase of makeModelDetails) {
    const citySlug = getUserSelectedCity();
    const name = `${tCase.makeName} ${tCase.modelName}`;
    const url = `${tCase.make}/${tCase.model}/price-in-${citySlug}`;

    let pricePageData: TPricePage;
    let priceInOtherCities: TPriceInCity[];

    test.beforeAll(async () => {
      [pricePageData, priceInOtherCities] = await Promise.all([
        getPriceData(`${tCase.make}/${tCase.model}`, citySlug),
        getPriceDataInOtherCities(`${tCase.model}`, citySlug)
      ])
    });

    test(`Check Page Title ${name}`, async ({ page }) => {
      await pageTitle({
        page,
        url: url,
        expectedTitle: pricePageData.data.modelPageSeo.title,
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
        h1: pricePageData.data.modelPageSeo.h1 || backupH1,
      });
    });

    test(`Price Page Secondary Header Links Clicked ${name}`, async ({
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
      const modelPageSeo = pricePageData.data.modelPageSeo;
      await breadCrumb({
        page,
        url,
        breadCrumbLabels: modelPageSeo.breadCrumb,
        breadCrumbUrl: modelPageSeo.breadCrumbUrl,
      });
    });

    test.skip(`User Reviews for ${name}`, async ({ page }) => {
      const modelData = pricePageData.data.modelData._source;
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

    test(`Explore Car Specifications ${name}`, async ({ page }) => {
      const longVideos = pricePageData.data.modelData._source.longVideos;
      if ((longVideos || []).length > 0) {
        await exploreCarSpecifications({ page, url, longVideos });
      }
    });

    test(`SEO Content ${name}`, async ({ page }) => {
      const seoData = pricePageData.data.modelPageSeo.content;
      await seoContent({ page, url, seoData, id: "#price-page-content" });
    });

    test(`Price In other cities ${name}`, async ({ page }) => {
      await priceInCities({
        page,
        url,
        priceInOtherCities,
        make: tCase.make,
        model: tCase.model,
      });
    });

    test(`Browse By Price ${name}`, async ({ page }) => {
      await page.goto(getPageURL(url));
      const locator = page.getByRole("heading", { name: "Browse By Price" });
      await expect.soft(locator).toBeVisible();

      for (let i = 0; i < priceSlabListTest.length; i++) {
        await page.goto(getPageURL(url));
        const priceLocator = page.locator(
          `#${slugify(priceSlabListTest[i].url)}-${i}`
        );
        await expect.soft(priceLocator).toBeVisible();
        const textContent = await priceLocator.textContent();
        expect
          .soft(textContent)
          .toBe(priceSlabListTest[i].name.replace(" Cars", ""));
        expect.soft(priceSlabListTest[i].url).toBeTruthy();
        await page.goto(getPageURL(priceSlabListTest[i].url));
        await expect.soft(page).toHaveURL(getPageURL(priceSlabListTest[i].url));
        await page.goto(getPageURL(url));
      }
    });

    test(`Browse By Body Type ${name}`, async ({ page }) => {
      await page.goto(getPageURL(url));
      const locator = page.getByRole("heading", {
        name: "Browse By Body Type",
      });
      await expect.soft(locator).toBeVisible();

      for (let i = 0; i < bodyTypeListTest.length; i++) {
        const bodySlabLocator = page.locator(
          `#${slugify(bodyTypeListTest[i].url)}-${i}`
        );
        await expect.soft(bodySlabLocator).toBeVisible();
        const textContent = await bodySlabLocator.textContent();
        expect
          .soft(textContent)
          .toBe(bodyTypeListTest[i].name.replace(" Cars", ""));
        await bodySlabLocator.click();
        await page.waitForLoadState("domcontentloaded");

        expect.soft(bodyTypeListTest[i].url).toBeTruthy();
        await page.goto(getPageURL(bodyTypeListTest[i].url));
        await expect.soft(page).toHaveURL(getPageURL(bodyTypeListTest[i].url));
        await page.goto(getPageURL(url));
      }
    });

    test(`Browse By Fuel Type ${name}`, async ({ page }) => {
      await page.goto(getPageURL(url));
      const locator = page.getByRole("heading", {
        name: "Browse By Fuel Type",
      });
      await expect.soft(locator).toBeVisible();

      for (let i = 0; i < fuelTypeListTest.length; i++) {
        const fuelTypeLocator = page.locator(
          `#${slugify(fuelTypeListTest[i].url)}-${i}`
        );
        await expect.soft(fuelTypeLocator).toBeVisible();
        const textContent = await fuelTypeLocator.textContent();
        expect
          .soft(textContent)
          .toBe(fuelTypeListTest[i].name.replace(" Cars", ""));
        await fuelTypeLocator.click();
        expect.soft(fuelTypeListTest[i].url).toBeTruthy();
        await page.goto(getPageURL(fuelTypeListTest[i].url));
        await expect.soft(page).toHaveURL(getPageURL(fuelTypeListTest[i].url));
        await page.goto(getPageURL(url));
      }
    });

    test(`Browse By Seating Capacity ${name}`, async ({ page }) => {
      await page.goto(getPageURL(url));
      const locator = page.getByRole("heading", {
        name: "Browse By Seating Capacity",
      });
      await expect.soft(locator).toBeVisible();

      for (let i = 0; i < seatingCapacityListTest.length; i++) {
        const seatingCapLocator = page.locator(
          `#${slugify(seatingCapacityListTest[i].url)}-${i}`
        );
        await expect.soft(seatingCapLocator).toBeVisible();
        const textContent = await seatingCapLocator.textContent();
        expect
          .soft(textContent)
          .toBe(seatingCapacityListTest[i].name.replace(" Cars", ""));
        await Promise.all([
          page.waitForLoadState("networkidle"),
          seatingCapLocator.click(),
        ]);
        await expect
          .soft(page)
          .toHaveURL(getPageURL(seatingCapacityListTest[i].url));
        await page.goto(getPageURL(url));
      }
    });

    test(`Price Breakdown ${name}`, async ({ page }) => {
      await priceStatSection({
        page,
        url: `${tCase.make}/${tCase.model}/price-in-new-delhi`,
        priceData: pricePageData.data.priceData,
        carImage: pricePageData.data.modelData._source.carImage?.url,
        title:
          pricePageData.data.modelPageSeo.h1 ||
          `${tCase.makeName} ${tCase.modelName} Price in New Delhi`,
        modelName: `${tCase.modelName}${tCase.variant ? ` ${tCase.variant}` : ""}`,
        hints: pricePageData.data?.priceSpecHint?.hint,
      });
    });

    test(`Select Location ${name}`, async ({ page }) => {
      await locationSelectSection({ page, url, make: tCase.make, model: tCase.model });
    });

    test(`Price page compare Variants by price ${name}`, async ({ page }) => {
      const model = pricePageData.data.modelData._source;
      const variants = model.variants;
      if (!model.fuelTypes || model.fuelTypes.length === 0) return;
      if (!variants || variants.length === 0) return;

      const modelFullName = `${model.make.name} ${model.name}`;
      const priceDataList = pricePageData.data.priceData;

      const formatPrice = (value?: string) => {
        const num = Number(value)
        if (isNaN(num)) return "-"
        return `₹ ${formatCurrency(num)}`
      }

      const randomArr = select3RandomNumbers(variants.length);

      await page.goto(getPageURL(url));

      const sectionLocator = page.locator(`data-test-id=compare-variants-by-price`);
      await sectionLocator.scrollIntoViewIfNeeded();
      await expect.soft(sectionLocator).toBeVisible();

      if (!model.isElectric) {
        const filterListLocator = page.locator(`data-test-id=desktop-filter-variants`);
        await filterListLocator.scrollIntoViewIfNeeded();
        await expect.soft(filterListLocator).toBeVisible();

        for (let i = 0; i < (filterList || []).length; i++) {
          const item = filterList?.[i];
          for (let j = 0; j < (item?.filters || []).length; j++) {
            const filter = item?.filters?.[j];
            const filterLocator = await page.$(`#checkbox-filter-${slugify(filter?.label || "")}`);
            await filterLocator?.scrollIntoViewIfNeeded();
            await filterLocator?.click();

            let currAppliedFilter = await page.$(`#applied-filter-${slugify(filter?.label || "")}`);
            expect.soft(currAppliedFilter).toBeTruthy();

            await currAppliedFilter?.click();
            currAppliedFilter = await page.$(`#applied-filter-${slugify(filter?.label || "")}`);
            expect.soft(currAppliedFilter).not.toBeTruthy();
          }
        }

        for (let i = 0; i < (filterList || []).length; i++) {
          const item = filterList?.[i];
          for (let j = 0; j < (item?.filters || []).length; j++) {
            const filter = item?.filters?.[j];
            const filterLocator = await page.$(`#checkbox-filter-${slugify(filter?.label || "")}`);
            await filterLocator?.click();
            let currAppliedFilter = await page.$(`#applied-filter-${slugify(filter?.label || "")}`);
            expect.soft(currAppliedFilter).toBeTruthy();
          }
        }

        const clearBtn = page.getByRole('button', { name: 'Clear All' });
        await clearBtn.click();
        await expect.soft(clearBtn).not.toBeVisible();
      }

      if (variants && variants.length > 0) {
        const expandBtnLocator = page.locator(`data-test-id=View more variants`);
        await expandBtnLocator.scrollIntoViewIfNeeded();
        await expect.soft(expandBtnLocator).toBeVisible();
        await expandBtnLocator.click();
      }

      for (let index of randomArr) {
        const variant = variants[index]
        const variantTile = page.locator(`data-test-id=${modelFullName} ${variant.name}`);
        await variantTile.scrollIntoViewIfNeeded();
        await expect.soft(variantTile).toBeVisible();
        const tileName = page.locator(`data-test-id=${variant.name}`);
        await expect.soft(tileName).toBeVisible();
        const nameText = await tileName.textContent() || '';
        checkNullUndefined(nameText)
        expect.soft(nameText).toBe(`${modelFullName} ${variant.name}`)

        const summaryLocator = page.locator(`data-test-id=summary-${variant.name}`);
        await expect.soft(summaryLocator).toBeVisible();
        const summaryText = await summaryLocator.textContent() || '';
        checkNullUndefined(summaryText)
        const { summary } = getVariantsSpecsSummary(variant)
        expect.soft(summaryText).toBe(summary)

        const price = page.locator(`data-test-id=on-road-price-${variant.name}`);
        const priceText = await price.textContent() || '';
        checkNullUndefined(priceText)
        expect.soft(priceText).toBeTruthy()

        if (index !== 0) {
          await variantTile.click();
        }

        const priceData = priceDataList.find(p => p.variant.name === variant.name)
        const totalOtherCharges = Number(priceData?.tcs) + Number(priceData?.cowCess) + Number(priceData?.greenTax) + Number(priceData?.lifeTax) + Number(priceData?.statutoryFees) + Number(priceData?.roadSafetyTax);
        const hints = pricePageData.data.priceSpecHint.hint;

        const otherPriceStats = [
          { label: PRICE_HINTS.TCS.label, value: (priceData?.tcs), hint: getPriceHint(hints, 'TCS') },
          { label: PRICE_HINTS.ROAD_SAFETY_TAX.label, value: (priceData?.roadSafetyTax), hint: getPriceHint(hints, 'ROAD_SAFETY_TAX') },
          { label: PRICE_HINTS.COW_CESS.label, value: (priceData?.cowCess), hint: getPriceHint(hints, 'COW_CESS') },
          { label: PRICE_HINTS.REG_CHARGES.label, value: (priceData?.regCharges), hint: getPriceHint(hints, 'REG_CHARGES') },
          { label: PRICE_HINTS.GREEN_TAX.label, value: (priceData?.greenTax) },
          { label: PRICE_HINTS.LIFE_TAX.label, value: (priceData?.lifeTax) },
          { label: PRICE_HINTS.STATUTORY_FEES.label, value: (priceData?.statutoryFees) },
        ].filter(p => {
          const num = Number(p.value)
          return !isNaN(num) && num != 0
        }).map(p => ({
          label: p.label,
          value: formatPrice(p.value),
          hint: p.hint
        }))

        const exShowRoomLocator = page.locator(`#${slugify(`Ex-showroom-${variant.name}`)}`);
        const exRoomText = await exShowRoomLocator.textContent() || '';
        checkNullUndefined(exRoomText)
        expect.soft(exRoomText).toBeTruthy();
        const hint = getPriceHint(hints, 'EXSHOWROOM_PRICE');
        if (hint) {
          const infoLocator = exShowRoomLocator?.getByLabel('info');
          await infoLocator.click();
          const infoHeaderText = await page.locator(`#hint-sheet-header`).textContent() || '';
          expect.soft(infoHeaderText).toBeTruthy();
          checkNullUndefined(infoHeaderText)
          const infoContentText = await page.locator(`#hint-sheet-content`).textContent() || '';
          expect.soft(infoContentText).toBeTruthy();
          checkNullUndefined(infoContentText)
          const closeBtn = page.getByRole('button', { name: 'Close' })
          await closeBtn.click();
        }

        if (priceData?.roadTax) {
          const rtoLocator = page.locator(`#${slugify(`RTO-${variant.name}`)}`);
          const rtoText = await rtoLocator.textContent() || '';
          checkNullUndefined(rtoText);
          expect.soft(rtoText).toBeTruthy();

          const hintRoad = getPriceHint(hints, 'ROAD_TAX')
          if (hintRoad) {
            const infoLocator = exShowRoomLocator?.getByLabel('info');
            await infoLocator.click();
            const infoHeaderText = await page.locator(`#hint-sheet-header`).textContent() || '';
            expect.soft(infoHeaderText).toBeTruthy();
            checkNullUndefined(infoHeaderText)
            const infoContentText = await page.locator(`#hint-sheet-content`).textContent() || '';
            expect.soft(infoContentText).toBeTruthy();
            checkNullUndefined(infoContentText)
            const closeBtn = page.getByRole('button', { name: 'Close' })
            await closeBtn.click();
          }
        }

        if (priceData?.insurance) {
          const insuranceLocator = page.locator(`#${slugify(`Insurance-${variant.name}`)}`);
          const insuranceText = await insuranceLocator.textContent() || '';
          checkNullUndefined(insuranceText);
          expect.soft(insuranceText).toBeTruthy();

          const hintInsurance = getPriceHint(hints, 'INSURANCE');
          if (hintInsurance) {
            const infoLocator = exShowRoomLocator?.getByLabel('info');
            await infoLocator.click();
            const infoHeaderText = await page.locator(`#hint-sheet-header`).textContent() || '';
            expect.soft(infoHeaderText).toBeTruthy();
            checkNullUndefined(infoHeaderText)
            const infoContentText = await page.locator(`#hint-sheet-content`).textContent() || '';
            expect.soft(infoContentText).toBeTruthy();
            checkNullUndefined(infoContentText)
            const closeBtn = page.getByRole('button', { name: 'Close' })
            await closeBtn.click();
          }
        }

        if (priceData?.onRoadPrice) {
          const onRoadPriceLocator = page.locator(`#${slugify(`On-Road-${variant.name}`)}`);
          const onRoadPriceText = await onRoadPriceLocator.textContent() || '';
          checkNullUndefined(onRoadPriceText);
          expect.soft(onRoadPriceText).toBeTruthy();

          const hintOnRoad = getPriceHint(hints, 'ON_ROAD_PRICE');
          if (hintOnRoad) {
            const infoLocator = exShowRoomLocator?.getByLabel('info');
            await infoLocator.click();
            const infoHeaderText = await page.locator(`#hint-sheet-header`).textContent() || '';
            expect.soft(infoHeaderText).toBeTruthy();
            checkNullUndefined(infoHeaderText)
            const infoContentText = await page.locator(`#hint-sheet-content`).textContent() || '';
            expect.soft(infoContentText).toBeTruthy();
            checkNullUndefined(infoContentText)
            const closeBtn = page.getByRole('button', { name: 'Close' })
            await closeBtn.click();
          }
        }

        if (totalOtherCharges > 0) {
          const stats = otherPriceStats;
          const statsToShow = stats.filter(s => s.value && s.value !== '0-0');

          const otherChargesLocator = page.locator(`#${slugify(`Other-Charges-${variant.name}`)}`);
          await otherChargesLocator.click();

          for (let j = 0; j < statsToShow.length; j++) {
            const statLocator = page.locator(`#${slugify(`Other-Charges-${variant.name}-${j}`)}`);
            await statLocator.scrollIntoViewIfNeeded();
            await expect.soft(statLocator).toBeVisible();
            const statText = await statLocator.textContent() || '';
            checkNullUndefined(statText);
            expect.soft(statText).toBeTruthy();

            const hintOther = statsToShow[index]?.hint;
            if (hintOther) {
              const infoLocator = exShowRoomLocator?.getByLabel('info');
              await infoLocator.click();
              const infoHeaderText = await page.locator(`#hint-sheet-header`).textContent() || '';
              expect.soft(infoHeaderText).toBeTruthy();
              checkNullUndefined(infoHeaderText)
              const infoContentText = await page.locator(`#hint-sheet-content`).textContent() || '';
              expect.soft(infoContentText).toBeTruthy();
              checkNullUndefined(infoContentText)
              const closeBtn = page.getByRole('button', { name: 'Close' })
              await closeBtn.click();
            }
          }

        }
      };

      if (variants && variants.length > 0) {
        const expandBtnLocator = page.locator(`data-test-id=View less variants`);
        await expandBtnLocator.scrollIntoViewIfNeeded();
        await expect.soft(expandBtnLocator).toBeVisible();
        await expandBtnLocator.click();
        expect.soft(expandBtnLocator).not.toBeVisible();
      }
    })
  }
});
