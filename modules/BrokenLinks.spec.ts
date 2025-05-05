import { test } from "@/lambdatest-setup";



test.describe("Broken Links", () => {
    test("Check for broken links", async ({ page }) => {
        // Define the URL to check
        const url = "https://www.bikes24.com/"; // Replace with your target URL

        // Navigate to the URL
        await page.goto(url);

        // Get all links on the page
        const links = await page.$$eval("a", (anchors) =>
            anchors.map((anchor) => anchor.href)
        );

        // Check each link for a response status
       
    });
});