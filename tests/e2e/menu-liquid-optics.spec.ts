import {test,expect} from '@playwright/test';

test('expanded menu uses sampled GPU material instead of frosted backdrop',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const toggle=page.locator('[data-menu-toggle]');
 if(!(await toggle.isVisible()))return;
 await toggle.click();
 const menu=page.locator('[data-menu-panel]');
 await expect(menu).toBeVisible();
 await expect.poll(()=>menu.getAttribute('data-menu-optics')).toBe('active');
 await expect(menu.locator('.menu-optical-layer')).toBeVisible();
 const filter=await menu.evaluate(el=>getComputedStyle(el).backdropFilter);
 expect(filter).toContain('blur(5px)');
 await expect(menu.locator('a').first()).toBeVisible();
});
