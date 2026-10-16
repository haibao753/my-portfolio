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
 const orb=await header.boundingBox();
 const logo=await header.locator('.brand span').boundingBox();
 expect(orb).not.toBeNull();
 expect(logo).not.toBeNull();
 expect(Math.abs((orb!.x+orb!.width/2)-(logo!.x+logo!.width/2))).toBeLessThan(3);
 expect(Math.abs((orb!.y+orb!.height/2)-(logo!.y+logo!.height/2))).toBeLessThan(3);
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
