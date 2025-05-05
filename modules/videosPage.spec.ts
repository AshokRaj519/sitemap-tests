import { test } from '@/lambdatest-setup';
import {
  checkPageHeadingH1,
  footerClicked,
  footerVisible,
  logoClicked,
  logoVisible,
  pageTitle,
} from "../components/commonComponents";
import {
  carVideosSpecification,
  secondaryHeaderClicked,
} from "../components/modelPage";
import { getUserSelectedCity } from "@/src/lib/city-utils";
import dotEnv from "dotenv";
import { makeModelDetails } from "../constants/makeModel.constants";
import { getGalleryPageData } from "@/src/services/gallery.service";
import { TGalleryPage } from "@/src/services/response-types/TGalleryPage";
import { getModelTabs } from "../constants/modelPage.constant";

dotEnv.config();
test.describe("Videos Page", () => {
  for (const tCase of makeModelDetails) {
    let responseData: TGalleryPage;

    test.beforeAll(async () => {
      responseData = await getGalleryPageData(
        `${tCase.make}/${tCase.model}`,
        "video"
      );
    });

    const name = `${tCase.makeName} ${tCase.modelName}`;
    const url = `${tCase.make}/${tCase.model}/videos`;
    test(`Check Page Title ${name}`, async ({ page }) => {
      await pageTitle({
        page,
        url: url,
        expectedTitle: responseData.data.gallerySeo.title,
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
        (item) => item.tabId === "gallery"
      )?.pageHeader;
      await checkPageHeadingH1({
        page,
        url,
        h1: responseData.data.gallerySeo.h1 || backupH1,
      });
    });

    test(`Videos Page Secondary Header Links Clicked ${name}`, async ({
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

    test(`Car Specification Videos ${name}`, async ({ page }) => {
      const longVideos = responseData.data.modelData._source.longVideos;
      if ((longVideos || []).length > 0) {
        await carVideosSpecification({ page, url, longVideos });
      }
    });
  }
});
