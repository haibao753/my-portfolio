import {test,expect} from "@playwright/test";

test("Lab 001 shows noncommutative 3D rotations with consistent math",async({page})=>{
 await page.goto("/lab/rotation/");
 await expect(page.locator("#rotation-lab h1")).toBeVisible();
 await expect(page.locator("#rotation-xy")).toBeVisible();
 await expect(page.locator("#rotation-yx")).toBeVisible();
 await expect(page.locator("#angle-x-value")).toHaveText("90°");
 await expect(page.locator("#angle-y-value")).toHaveText("90°");
 await expect(page.locator("#rotation-xy-vector")).toHaveText("(0.00, -1.00, 0.00)");
 await expect(page.locator("#rotation-yx-vector")).toHaveText("(1.00, 0.00, 0.00)");
 await expect(page.locator("#rotation-difference")).not.toHaveText("0.00");
 await page.locator("#angle-x").evaluate((el:HTMLInputElement)=>{el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}));});
 await expect(page.locator("#rotation-difference")).toHaveText("0.00");
 await page.locator("#rotation-reset").click();
 await expect(page.locator("#angle-x-value")).toHaveText("90°");
 await expect(page.locator("#rotation-difference")).not.toHaveText("0.00");
});

test("Lab 001 remains usable on a 390px phone and camera does not change math",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/lab/rotation/");
 await expect(page.locator("#rotation-xy")).toBeVisible();
 await expect(page.locator("#rotation-yx")).toBeVisible();
 const before=await page.locator("#rotation-xy-vector").textContent();
 await page.locator("#rotation-camera-left").click();
 await expect(page.locator("#rotation-xy-vector")).toHaveText(before||"");
 const check=await page.evaluate(()=>({
  body:document.documentElement.scrollWidth,viewport:window.innerWidth,
  canvases:[...document.querySelectorAll<HTMLCanvasElement>("#rotation-lab canvas")].map(x=>x.getBoundingClientRect().width)
 }));
 expect(check.body).toBeLessThanOrEqual(check.viewport+1);
 expect(check.canvases.every(w=>w>250&&w<check.viewport)).toBe(true);
});

test("Lab 001 explanation is available without canvas graphics",async({page})=>{
 await page.addInitScript(()=>{
  const native=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type,...rest){
   if(type==="2d")return null;
   return native.call(this,type,...rest);
  } as typeof HTMLCanvasElement.prototype.getContext;
 });
 await page.goto("/lab/rotation/");
 await expect(page.locator("#rotation-xy-vector")).toHaveText("(0.00, -1.00, 0.00)");
 await expect(page.locator("#rotation-yx-vector")).toHaveText("(1.00, 0.00, 0.00)");
 await expect(page.locator("#rotation-note")).toContainText("旋转顺序");
});
