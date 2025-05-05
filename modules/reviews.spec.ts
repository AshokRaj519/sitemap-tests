import { test } from '@/lambdatest-setup';
import {
  breadCrumb,
  checkPageHeadingH1,
  footerClicked,
  footerVisible,
  logoClicked,
  logoVisible,
  miniStatData,
  pageTitle,
  similarCarsSection,
  topComparisonSection,
} from "../components/commonComponents";
import {
  exploreCarSpecifications,
  secondaryHeaderClicked,
  userReviewSection,
} from "../components/modelPage";
import { getUserSelectedCity } from "@/src/lib/city-utils";
import { TSpecs } from "@/src/types/core/Specs";
import dotEnv from "dotenv";
import { makeModelDetails } from "../constants/makeModel.constants";
import { TReviewsPage } from "@/src/services/response-types/TReviewsPage";
import { getUserReviewPageData } from "@/src/services/reviews.service";
import { getModelTabs } from "../constants/modelPage.constant";

dotEnv.config();
test.describe("UserReviewPage", () => {
  for (const tCase of makeModelDetails) {
    let responseData: TReviewsPage;

    test.beforeAll(async () => {
      responseData = await getUserReviewPageData(
        `${tCase.make}/${tCase.model}`
      );
    });

    const name = `${tCase.makeName} ${tCase.modelName}`;
    const url = `${tCase.make}/${tCase.model}/review`;
    test(`Check Page Title ${name}`, async ({ page }) => {
      await pageTitle({
        page,
        url: url,
        expectedTitle: responseData.data.userReviewSeo.title,
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
        (item) => item.tabId === "reviews"
      )?.pageHeader;
      await checkPageHeadingH1({
        page,
        url,
        h1: responseData.data.userReviewSeo.h1 || backupH1,
      });
    });

    test(`User Review Page Secondary Header Links Clicked ${name}`, async ({
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
      const userReviewSeo = responseData.data.userReviewSeo;
      await breadCrumb({
        page,
        url,
        breadCrumbLabels: userReviewSeo.breadCrumb,
        breadCrumbUrl: userReviewSeo.breadCrumbUrl,
      });
    });

    test(`Reviews Page mini stats ${name}`, async ({ page }) => {
      const model = responseData.data.modelData._source;
      const carImage = model?.carImage?.url || "";
      const seo = responseData.data.userReviewSeo;
      const imageSelector =
        seo?.h1 || `${model.make.name} ${model.name} User Reviews`;
      const list: TSpecs[] = [
        {
          label: "Interiors",
          value:
            model.avgRateInfotainmentInteriors?.toFixed(1).toString() ?? "-",
        },
        {
          label: "Fuel Economy",
          value: model.avgRateFuelEconomy?.toFixed(1).toString() ?? "-",
        },
        {
          label: "Overall",
          value: model.avgRateOverall?.toFixed(1).toString() ?? "-",
        },
        {
          label: "Looks",
          value: model.avgRateExteriorLooks?.toFixed(1).toString() ?? "-",
        },
        {
          label: "Comfort",
          value: model.avgRateComfort?.toFixed(1).toString() ?? "-",
        },
      ];

      await miniStatData({
        page,
        url,
        list,
        carImage,
        imageSelector,
      });
    });

    test.skip(`Similar Cars ${name}`, async ({ page }) => {
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

      await userReviewSection({ page, url, modelData, list });
    });

    test(`Explore Car Specifications ${name}`, async ({ page }) => {
      const longVideos = responseData.data.modelData._source.longVideos;
      if ((longVideos || []).length > 0) {
        await exploreCarSpecifications({ page, url, longVideos });
      }
    });
  }
});
