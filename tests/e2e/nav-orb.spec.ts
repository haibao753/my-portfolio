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
 // Regression: scrolling down again after tapping the orb must re-collapse it.
 await page.evaluate(()=>window.scrollBy(0,150));
 await expect(header).toHaveAttribute('data-orb-closed','true');
 await expect.poll(async()=>Number.parseFloat(await header.evaluate(el=>getComputedStyle(el).width))).toBeLessThan(65);
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

test('Daily Brief desktop toolbar stays centered with actions at right edge',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const homeControls=await page.locator('.glass-nav .controls').boundingBox();
 await page.goto('/brief/');
 const header=page.locator('.glass-nav');
 await expect(header).toHaveAttribute('data-orb-ready','true');
 const nav=await header.boundingBox();
 const links=await header.locator('.desktop-links').boundingBox();
 const controls=await header.locator('.controls').boundingBox();
 expect(nav).not.toBeNull();
 expect(links).not.toBeNull();
 expect(controls).not.toBeNull();
 expect(Math.abs((links!.x+links!.width/2)-(nav!.x+nav!.width/2))).toBeLessThan(24);
 // Shared content gutter: both pages align controls to the same wrap edge.
 expect(homeControls).not.toBeNull();
 expect(Math.abs((controls!.x+controls!.width)-(homeControls!.x+homeControls!.width))).toBeLessThan(20);
 expect(controls!.x).toBeGreaterThan(links!.x+links!.width);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,700));
 await expect(header).toHaveAttribute('data-orb-closed','true');
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(header).toHaveAttribute('data-orb-closed','false');
});

test('Home and Daily Brief expanded logos share a common left alignment',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  const home=await page.locator('.glass-nav .brand span').boundingBox();
  expect(home).not.toBeNull();
  await page.goto('/brief/');
  const nav=page.locator('.glass-nav');
  await expect(nav).toHaveAttribute('data-orb-ready','true');
  const brief=await nav.locator('.brand span').boundingBox();
  expect(brief).not.toBeNull();
  expect(Math.abs(brief!.x-home!.x)).toBeLessThan(2);
  await page.evaluate(()=>window.scrollTo(0,650));
  await expect(nav).toHaveAttribute('data-orb-closed','true');
  const orb=await nav.boundingBox();
  const mark=await nav.locator('.brand span').boundingBox();
  expect(Math.abs((orb!.x+orb!.width/2)-(mark!.x+mark!.width/2))).toBeLessThan(3);
 }
});

test('Brief-only admin regeneration link is reachable from menu without public AI trigger',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  await expect(page.locator('[data-admin-brief-refresh]')).toHaveCount(0);
  await page.goto('/brief/');
  const button=page.locator('[data-menu-toggle]');
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded','true');
  const link=page.locator('[data-menu-panel] [data-admin-brief-refresh]');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href','https://github.com/haibao753/daily-intelligence-brief/actions/workflows/manual-refresh.yml');
  await expect(link).toHaveAttribute('target','_blank');
  await expect(link).toHaveAttribute('rel',/noopener noreferrer/);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu-panel]')).toBeHidden();
 }
});
