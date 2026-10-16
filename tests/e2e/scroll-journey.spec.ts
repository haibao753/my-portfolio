import {test,expect,type Page} from '@playwright/test';

const scrollTo=async(page:Page,y:number)=>{await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y)};
const uniform=(page:Page)=>page.locator('[data-sculpture-canvas]').evaluate((canvas:HTMLCanvasElement)=>{
 const gl=canvas.getContext('webgl')!,program=gl.getParameter(gl.CURRENT_PROGRAM);
 const location=gl.getUniformLocation(program,'journey');if(!location)throw Error('Scroll deformation uniform is unavailable');
 return gl.getUniform(program,location) as number;
});

test('native scroll drives the optical sculpture and reverses on return',async({page,isMobile})=>{
 await page.goto('/lab/');const host=page.locator('[data-optical-universe]'),guide=page.locator('[data-scroll-journey]');
 await expect(host).toHaveAttribute('data-universe-gpu','true');await expect(page.locator('body')).toHaveAttribute('data-reading-motion','full');
 await expect(guide).toBeHidden();await expect.poll(()=>uniform(page)).toBe(0);
 const top=await page.locator('[data-universe-stage]').evaluate(el=>el.getBoundingClientRect().top);
 await scrollTo(page,220);await expect(guide).toBeVisible();await expect.poll(()=>uniform(page)).toBeGreaterThan(.15);
 expect(await page.evaluate(()=>scrollY)).toBe(220);
 if(!isMobile)expect(Math.abs(await page.locator('[data-universe-stage]').evaluate(el=>el.getBoundingClientRect().top)-top)).toBeLessThan(2);
 await page.locator('[data-universe-pause]').click();await expect.poll(()=>uniform(page)).toBe(0);
 await page.locator('[data-universe-pause]').click();await expect.poll(()=>uniform(page)).toBeGreaterThan(.15);
 await scrollTo(page,0);await expect.poll(()=>uniform(page)).toBe(0);await expect(guide).toBeHidden();
});

test('reading unfolds the posters and chapter navigation reaches real content',async({page})=>{
 await page.goto('/lab/');await expect(page.locator('body')).toHaveAttribute('data-reading-motion','full');
 const object=page.locator('[data-lab-object]').first(),poster=object.locator('.poster');
 await expect.poll(()=>poster.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeLessThan(.5);
 const destination=await object.evaluate(el=>el.getBoundingClientRect().top+scrollY-innerHeight*.38);
 await scrollTo(page,destination);await expect.poll(()=>poster.evaluate(el=>Number(getComputedStyle(el).opacity))).toBe(1);
 await expect(page.locator('[data-reading-chapter="1"]')).toHaveAttribute('aria-current','location');
 await object.locator('[data-lab-open]').click();await expect(page.locator('[data-lab-inspector]')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('[data-reading-chapter="2"]').click();await expect.poll(()=>page.locator('#contact').evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(page.viewportSize()!.height*.58);
 await expect(page.locator('[data-reading-chapter="2"]')).toHaveAttribute('aria-current','location');
 await expect(page.locator('#contact a[href^="mailto:"]')).toBeVisible();
 await page.locator('[data-language-toggle]').click();await expect(page.locator('[data-reading-chapter="1"]')).toContainText('WORK');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test('reduced motion removes pinning and transforms while retaining navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/lab/');
 await expect(page.locator('body')).toHaveAttribute('data-reading-motion','reduced');
 await expect(page.locator('[data-optical-universe]')).toHaveAttribute('data-universe-motion','paused');
 expect(await page.locator('[data-universe-stage]').evaluate(el=>getComputedStyle(el).position)).toBe('relative');
 await scrollTo(page,250);await expect.poll(()=>uniform(page)).toBe(0);
 expect(await page.locator('[data-lab-object] .poster').first().evaluate(el=>getComputedStyle(el).transform)).toBe('none');
 await page.locator('[data-reading-chapter="1"]').click();await expect.poll(()=>page.locator('#worlds').evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(100);
 await expect(page.locator('[data-reading-chapter="1"]')).toHaveAttribute('aria-current','location');
});
