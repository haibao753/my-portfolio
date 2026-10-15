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
 expect(filter).toContain('blur(2.2px)');
 await expect(menu.locator('a').first()).toBeVisible();
});

test('opening mobile menu leaves the page undimmed and uses nav glass filter',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const toggle=page.locator('[data-menu-toggle]');
 if(!(await toggle.isVisible()))return;
 const main=page.locator('main');
 await toggle.click();
 await expect(page.locator('[data-menu-panel]')).toBeVisible();
 const values=await page.evaluate(()=>{
  const main=document.querySelector('main')!,veil=document.querySelector('[data-menu-backdrop]')!,menu=document.querySelector('[data-menu-panel]')!;
  return {filter:getComputedStyle(main).filter,opacity:getComputedStyle(main).opacity,
    veil:getComputedStyle(veil).backgroundColor,menuFilter:getComputedStyle(menu).backdropFilter};
 });
 expect(values.filter).toBe('none');
 expect(values.opacity).toBe('1');
 expect(values.veil).toBe('rgba(0, 0, 0, 0)');
 expect(values.menuFilter).toContain('blur(2.2px)');
});
