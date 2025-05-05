import test, { expect, Page } from "@playwright/test";
import { profileAPIClient } from "@/src/core-module/loginServices/loginAPIClient"; 
import { TPage } from "@/src/services/response-types/TPage"; 
import ENDPOINT from "@/src/services/endpoints"; 
import { AUTH_TOKEN } from "@/src/constants/auth"; 
import { TLoginFormResponse, TLoginMeta } from "@/src/core-module/loginTypes/TLoginForm";
import { checkNullUndefined } from "../utils/modelPage";
import { getPageURL } from "../components/commonComponents";

type Props = {
    page: Page;
};

test.describe("Login and Logout Flow Automation", () => {
    let response: TLoginFormResponse;
    test.beforeAll(async () => {
        const cacheKey = ENDPOINT.loginScreen;
        const res =
            await profileAPIClient.get<TPage<TLoginFormResponse, TLoginMeta>>(
                cacheKey,
            );
        response = res.data;
    });

    test("Login Flow", async ({ page }: Props) => {
        await page.goto(getPageURL(""));
        const profileBtn = page.locator("data-test-id=desktop-user-profile");
        await profileBtn.click();
        const loginBtn = page.locator("data-test-id=desktop-Login");
        await loginBtn.click();
        await page.waitForTimeout(1000);
        const lottieList = response.loginForms;
        const currentLottie = lottieList?.find(
            (item) => item.screenName === "mobileNumberScreen",
        );
        await page.waitForTimeout(500);
        const resp = await fetch(currentLottie?.file.url || "");
        expect.soft(resp.status).toBe(200);
        const termsCondition = page.locator("data-test-id=terms-conditions");
        const href = await termsCondition.getAttribute("href");
        checkNullUndefined(href);
        expect.soft(href).toBe(getPageURL("terms-and-conditions/"));
        const inputFieldMobileNumber = page.locator(
            "data-test-id=mobileNo-input",
        );
        await inputFieldMobileNumber.click();
        await inputFieldMobileNumber.fill("123456789");
        const clearInput = page.locator("data-test-id=clear-input");
        await clearInput.click();
        const inputAfterClear = await inputFieldMobileNumber.textContent();
        expect.soft(inputAfterClear).toBe("");
        await inputFieldMobileNumber.fill("9999999999");
        const submitBtn = page.locator("data-test-id=otp-submit");
        await submitBtn.click();
        await page.waitForTimeout(500);
        const checkBorderColor = async (selector: string) => {
            return page.$eval(selector, (element) => {
                return window.getComputedStyle(element).borderColor;
            });
        };
        for (let i = 0; i <= 3; i++) {
            const otpInput = page.locator(`data-test-id=otp-input-${i}`);
            await otpInput.fill("2");
        }
        const submitOTPBtn = page.locator("data-test-id=enter-otp");
        await submitOTPBtn.click();
        await page.waitForTimeout(1000);
        for (let i = 0; i <= 3; i++) {
            const borderColor = await checkBorderColor(
                `data-test-id=otp-input-${i}`,
            );
            expect.soft(borderColor).toBe("rgb(239, 68, 68)");
        }
        for (let i = 0; i <= 3; i++) {
            const otpInput = page.locator(`data-test-id=otp-input-${i}`);
            await otpInput.fill("1");
        }
        const correctSubmitOTPBtn = page.locator("data-test-id=enter-otp");
        await correctSubmitOTPBtn.click();
        await page.waitForTimeout(1000);
        const congratsLottie = lottieList?.find(
            (item) => item.screenName === "congratsScreen",
        );
        await page.waitForTimeout(500);
        const res = await fetch(congratsLottie?.file.url || "");
        expect.soft(res.status).toBe(200);
        await page.waitForTimeout(9000);
        await profileBtn.click();
        await page.waitForTimeout(2000);
        const EditProfile = page.locator("data-test-id=desktop-Edit Profile");
        expect.soft(EditProfile).toBeVisible();
        const cookie = await page.context().cookies();
        const isCookiePresent = cookie.some((c) => c.name === AUTH_TOKEN);
        expect(isCookiePresent).toBe(true);
    });
});
