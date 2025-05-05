import { test, expect } from '@playwright/test';
import { log } from 'console';

test.describe('Login Functionality Tests', () => {
  let page;
  let context;
  let isLoginSuccessful = true;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto('https://your-login-page.com');
  });

  test.afterEach("reuse the user name and password", async()=>{
    let isLoginSuccessful = true;


  }
);


});