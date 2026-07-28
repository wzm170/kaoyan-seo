// 考研 SEO 内容站 - 文章生成脚本
// 用法: node generate.js <article-input.json>
// 输入 JSON 字段: { keyword, title, description, category, content(HTML), slug?, date?, tags? }
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ARTICLES_DIR = path.join(ROOT, 'articles');
const MANIFEST = path.join(ROOT, 'manifest.json');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const SITE_BASE = process.env.SITE_BASE || 'https://wzm170.github.io/kaoyan-seo';
const WECHAT = process.env.WECHAT_ID || 'kaoyan-help';

function slugify(s) {
  const s1 = String(s).toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '');
  if (/^[\u4e00-\u9fa5-]+$/.test(s1) || s1 === '') {
    return 'post-' + Date.now().toString(36);
  }
  return s1;
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function loadManifest() {
  if (fs.existsSync(MANIFEST)) {
    try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); }
    catch (e) { return { site: '考研干货站', articles: [] }; }
  }
  return { site: '考研干货站', articles: [] };
}

function saveManifest(m) { fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2), 'utf8'); }

function buildSitemap(m) {
  const urls = m.articles.map(function (a) {
    return '  <url>\n    <loc>' + SITE_BASE + '/' + a.url + '</loc>\n' +
      '    <lastmod>' + a.date + '</lastmod>\n' +
      '    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>';
  }).join('\n');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '  <url>\n    <loc>' + SITE_BASE + '/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n' +
    urls + '\n</urlset>\n';
  fs.writeFileSync(SITEMAP, xml, 'utf8');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function articleTemplate(d) {
  const slug = d.slug;
  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + escapeHtml(d.title) + '</title>\n' +
    '<meta name="description" content="' + escapeHtml(d.description) + '">\n' +
    '<link rel="canonical" href="' + SITE_BASE + '/articles/' + slug + '.html">\n' +
    '<script type="application/ld+json">\n{\n  "@context":"https://schema.org",\n' +
    '  "@type":"Article",\n  "headline":"' + escapeHtml(d.title) + '",\n' +
    '  "description":"' + escapeHtml(d.description) + '",\n' +
    '  "keywords":"' + escapeHtml(d.keyword) + '",\n' +
    '  "datePublished":"' + d.date + '",\n  "dateModified":"' + d.date + '"\n}\n<\/script>\n' +
    '<link rel="stylesheet" href="../assets/style.css">\n</head>\n<body>\n' +
    '<header class="site-header"><div class="wrap"><a class="logo" href="../">考研干货站</a>' +
    '<span class="cat" style="font-size:13px;color:var(--accent);background:var(--accent-bg);padding:2px 8px;border-radius:999px;">' + escapeHtml(d.category) + '</span></div></header>\n' +
    '<main class="wrap article">\n<article>\n' +
    '<h1>' + escapeHtml(d.title) + '</h1>\n' +
    '<p class="meta">关键词:' + escapeHtml(d.keyword) + ' · 更新:' + d.date + '</p>\n' +
    '<div class="ad">[百度联盟 / AdSense 广告位 A]</div>\n' +
    '<div class="content">' + d.content + '</div>\n' +
    '<div class="ad">[百度联盟 / AdSense 广告位 B]</div>\n' +
    '<div class="lead"><h3>免费领资料</h3>\n' +
    '<p>加微信 <b>' + WECHAT + '</b> 免费领《' + escapeHtml(d.keyword) + '考点脑图 + 真题包》,备注「' + escapeHtml(d.keyword) + '」。</p></div>\n' +
    '</article>\n<p class="back"><a href="../">← 返回首页</a></p>\n</main>\n' +
    '<footer class="site-footer"><div class="wrap">© 考研干货站 · 内容由 AI 辅助生成</div></footer>\n</body>\n</html>\n';
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) { console.error('用法: node generate.js <article-input.json>'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const slug = slugify(data.slug || data.keyword || data.title);
  const date = data.date || new Date().toISOString().slice(0, 10);
  ensureDir(ARTICLES_DIR);
  const manifest = loadManifest();
  if (manifest.articles.some(function (a) { return a.slug === slug; })) {
    console.log('已存在同名文章,跳过:', slug); process.exit(0);
  }
  const html = articleTemplate({ slug: slug, date: date, content: data.content || '',
    title: data.title, description: data.description, keyword: data.keyword, category: data.category });
  fs.writeFileSync(path.join(ARTICLES_DIR, slug + '.html'), html, 'utf8');
  manifest.articles.unshift({
    slug: slug, title: data.title, description: data.description,
    keyword: data.keyword, category: data.category, date: date,
    url: 'articles/' + slug + '.html', tags: data.tags || []
  });
  saveManifest(manifest);
  buildSitemap(manifest);
  fs.unlinkSync(inputPath);
  console.log('生成成功:', slug, '| 当前文章数:', manifest.articles.length);
}

main();
