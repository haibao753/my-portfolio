import {test,expect} from "@playwright/test";

const research={
 status:"partial_pdf_text",
 material_scope:"公开 PDF 中提取文本的前 7/11 页；非全文核验",
 review_status:"AI 摘录解读，未独立验证、未复现实验",
 source_url:"https://arxiv.org/pdf/2601.12345",
 pages_read:7,pages_total:11,
 citations:[{id:"E1",page:2},{id:"E2",page:5},{id:"E3",page:6}],
 sections:{
  question:{text:"研究方法能否在数据分布变化时维持稳定的泛化性能？",evidence_ids:["E1"]},
  method:{text:"作者报告比较了有监督的模型基线与所提出的算法结构。",evidence_ids:["E2"]},
  findings:{text:"实验结果是作者报告的结果，仍需要独立复核。",evidence_ids:["E3"]},
  limitations:{text:"摘录并未说明所有数据分割与统计显著性。",evidence_ids:["E2"]},
  replication:{text:"建议先复现原论文明确提出的训练与评估过程。",evidence_ids:["E3"]}
 }
};
function mock(page:any, data:any){
 return Promise.all([
  page.route("**/brief/data/index.json",(route:any)=>route.fulfill({contentType:"application/json",
   body:JSON.stringify({version:1,dates:["2026-10-17"],updated_at:"1"})})),
  page.route("**/brief/data/2026-10-17.json",(route:any)=>route.fulfill({contentType:"application/json",
   body:JSON.stringify({version:1,date:"2026-10-17",items:[{
    edition:"morning",category:"机器学习",source:"arXiv cs.LG",
    title_zh:"深度学习论文",summary_zh:"新闻概述",
    why_zh:"值得关注",details_zh:"常规摘要",
    url:"https://arxiv.org/abs/2601.12345",research:data
   }]})}))
 ]);
}
test("deep paper dossier shows five evidence-anchored sections and source pages",async({page})=>{
 await mock(page,research);
 await page.goto("/brief/");
 await expect(page.locator(".news-card")).toHaveCount(1);
 await expect(page.locator(".news-category")).toContainText("论文精读");
 await page.locator(".news-read-toggle").click();
 await page.locator(".news-expanded summary").click();
 const panel=page.locator(".news-research");
 await expect(panel).toBeVisible();
 await expect(panel.locator(".news-research-part")).toHaveCount(5);
 await expect(panel.locator("a")).toHaveCount(5);
 const first=panel.locator("a").first();
 await expect(first).toHaveAttribute("href","https://arxiv.org/pdf/2601.12345#page=2");
 await expect(first).toHaveAttribute("rel",/noopener/);
 await expect(panel).toContainText("非全文核验");
 await expect(panel).toContainText("未独立验证");
});
test("untrusted external research PDF URLs never create a study badge or links",async({page})=>{
 await mock(page,{...research,source_url:"https://arxiv.org.evil.example/pdf/2601.12345"});
 await page.goto("/brief/");
 await expect(page.locator(".news-card")).toHaveCount(1);
 await expect(page.locator(".news-category")).not.toContainText("论文精读");
 await expect(page.locator(".news-research")).toHaveCount(0);
});
