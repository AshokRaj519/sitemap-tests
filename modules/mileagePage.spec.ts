import { test } from '@/lambdatest-setup';
import {
  breadCrumb,
  checkPageHeadingH1,
  footerClicked,
  footerVisible,
  logoClicked,
  logoVisible,
  pageTitle,
  similarCarsSection,
  topComparisonSection,
} from "../components/commonComponents";
import { getUserSelectedCity } from "@/src/lib/city-utils";
import {
  exploreCarSpecifications,
  mileagePageStat,
  secondaryHeaderClicked,
  userReviewSection,
  variantsByMileage,
} from "../components/modelPage";
import { makeModelDetails } from "../constants/makeModel.constants";
import { getMileagePageData } from "@/src/services/mileage.service";
import { TMileagePage } from "@/src/services/response-types/TMileagePage";
import dotEnv from "dotenv";
import getMileageStats from "@/src/components/molecules/MileageStats/getMileageStats";
import { getModelTabs } from "../constants/modelPage.constant";
import { filterList } from "../constants/common.constants";

dotEnv.config();
test.describe("Mileage Page", async () => {
  for (const tCase of makeModelDetails) {
    let responseData: TMileagePage;

    test.beforeAll(async () => {
      responseData = await getMileagePageData(`${tCase.make}/${tCase.model}`);
    });

    const url = `${tCase.make}/${tCase.model}/mileage/`;
    const name = `${tCase.makeName} ${tCase.modelName}`;

    test(`Check Page Title ${name}`, async ({ page }) => {
      const mileageDataSeo = responseData.data.mileageSeo;
      await pageTitle({
        page,
        url,
        expectedTitle: mileageDataSeo.title,
      });
    });

    test(`Logo Visible ${name}`, async ({ page }) => {
      await logoVisible({ page, url });
    });

    test(`Logo Click ${name}`, async ({ page }) => {
      await logoClicked({ page, url });
    });

    test(`Mileage Page Secondary Header Links Clicked ${name}`, async ({
      page,
    }) => {
      if (!responseData.data.modelData._source.isMileagePage) return;

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
    });

    test(`Footers and social media links Clicked ${name}`, async ({ page }) => {
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
        (item) => item.tabId === "mileage"
      )?.pageHeader;
      await checkPageHeadingH1({
        page,
        url,
        h1: responseData.data.mileageSeo.h1 || backupH1,
      });
    });

    test(`Breadcrumb links click ${name}`, async ({ page }) => {
      const mileageDataSeo = responseData.data.mileageSeo;
      await breadCrumb({
        page,
        url,
        breadCrumbLabels: mileageDataSeo.breadCrumb,
        breadCrumbUrl: mileageDataSeo.breadCrumbUrl,
      });
    });

    test.skip(`User Reviews for ${name}`, async ({ page }) => {
      if (!responseData.data.modelData._source.isMileagePage) return;

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

    test(`Similar Cars ${name}`, async ({ page }) => {
      if (!responseData.data.modelData._source.isMileagePage) return;
      const similarCarData = responseData.data.similarCarData;
      await similarCarsSection({ page, url, similarCarData });
    });

    test(`Compare With Rivals ${name}`, async ({ page }) => {
      if (!responseData.data.modelData._source.isMileagePage) return;

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

    test(`Explore Car Specifications ${name}`, async ({ page }) => {
      const modelData = responseData.data.modelData._source;
      const longVideos = modelData.longVideos;
      if (!modelData.isMileagePage) return;
      await exploreCarSpecifications({ page, url, longVideos });
    });

    test(`Mileage Page Stats for ${name}`, async ({ page }) => {
      const modelData = responseData.data.modelData._source;
      if (!modelData.isMileagePage) return;
      const { list, fuelType } = getMileageStats(modelData.variants);
      const avgMileage = responseData.data.mileageSeo.content;
      const cleanedString = avgMileage.replace(/<\/?p>/g, '');
      // Use avgMileageValue in your function call
      await mileagePageStat({
        page,
        url,
        mileageStatList: list,
        fuelType,
        avgMileage: cleanedString,
        modelName: `${tCase.modelName}${tCase.variant ? ` ${tCase.variant}` : ""}`,
        carImage: modelData.carImage?.url,
      });
    });

    test(`Mileage Page Variant by Mileage ${name}`, async ({ page }) => {
      const modelData = responseData.data.modelData._source;
      if (!modelData.isMileagePage) return;
      await variantsByMileage({ page, url, modelData, filterList });
    });
  }
});
