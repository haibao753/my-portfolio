# 原创视频存放位置

页面上的 HTML5 视频播放器从本站相对路径加载两个原创 MP4 文件：

- `public/videos/mobius-shortest.mp4`：莫比乌斯带最短能有多短（4:47，约 17 MB）
- `public/videos/group-definition.mp4`：群的定义与例子（3:24，约 13 MB）

需要把对应 MP4 **以二进制形式**上传到此目录并提交至 `main`。仅提交播放代码、GitHub Actions 测试通过或上传文字链接都不能使视频可播放。请勿把 Base64 文本冒充为 MP4 文件。

进入 GitHub 仓库该文件夹，选择 Add file → Upload files，将两个 MP4 拖入并提交。发布后分别验证：

- https://hujinhai.com/videos/mobius-shortest.mp4
- https://hujinhai.com/videos/group-definition.mp4

建议后续如视频增多改用独立视频对象存储/CDN，并正确支持 byte-range 请求（HTTP 206），以便进度拖动。
