# 全球资讯观察站 /brief

此目录独立于主页，不修改根目录 `index.html`。

- `index.html`：公开静态观察站，可通过浏览器访问。
- `data/index.json`：已发布日期列表。
- `data/YYYY-MM-DD.json`：每天最多12条、已翻译好的中文资讯及来源。
- 每日数据由私有仓库 `daily-intelligence-brief` 的 GitHub Actions 自动生成并推送到本公开仓库。
- 部署前需确认 Cloudflare Pages 正在跟踪此仓库的 `main` 分支。若不是，需要调整部署来源或复制此 `brief/` 目录到实际站点项目。
- 网站数据公开可访问；不应包含任何 DeepSeek 密钥、Server酱 SendKey 或 GitHub Token。

首次启用自动发布：给每日简报私有仓库添加 `WEBSITE_REPO_TOKEN` Secret，使用仅授权 `haibao753/my-portfolio`、Contents 读写权限的 GitHub fine-grained PAT。不要把凭证直接发到聊天。
