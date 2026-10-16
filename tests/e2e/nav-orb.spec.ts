import {test,expect} from '@playwright/test';

test('Daily Brief navigation morphs to logo orb and expands again',async({page})=>{
 await page.goto('/brief/');
 const header=page.locator('.glass-nav');
 await expect(header).toHaveAttribute('data-orb-ready','true');
 await expect(header.locator('.brand')).toBeVisible();
 const initial=await header.boundingBox();
 expect(initial?.width??0).toBeGreaterThan(200);
 await page.evaluate(()=>window.scrollTo(0,650));
 await expect.poll(async()=>Number.parseFloat(await header.evaluate(el=>getComputedStyle(el).width))).toBeLessThan(65);
 await expect(header).toHaveAttribute('data-orb-closed','true');
 await expect(header.locator('.brand')).toBeVisible();
 await header.locator('.brand').click();
 await expect.poll(async()=>Number.parseFloat(await header.evaluate(el=>getComputedStyle(el).width))).toBeGreaterThan(200);
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(header).toHaveAttribute('data-orb-closed','false');
});

test('Daily Brief orb respects reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/brief/');
 const header=page.locator('.glass-nav');
 await page.evaluate(()=>window.scrollTo(0,650));
 await expect.poll(async()=>header.getAttribute('data-orb-closed')).toBe('true');
 await expect(header.locator('.brand')).toBeVisible();
});
