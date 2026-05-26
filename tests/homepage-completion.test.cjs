const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'cspchusai.html'];

function listHtmlPages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.name === '.git') return [];
    if (entry.isDirectory()) return listHtmlPages(absolutePath);
    return entry.isFile() && entry.name.endsWith('.html')
      ? [path.relative(root, absolutePath)]
      : [];
  });
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function toPosix(file) {
  return file.replace(/\\/g, '/');
}

function isFeedbackPage(page) {
  return toPosix(page).startsWith('反馈/');
}

function expectedAssetPrefix(page) {
  const depth = toPosix(page).split('/').length - 1;
  return depth === 0 ? '' : '../'.repeat(depth);
}

function extractSearchData(html) {
  const match = html.match(/const searchData = \[([\s\S]*?)\];/);
  assert(match, 'searchData array should exist');
  const objectMatches = [...match[1].matchAll(/\{([\s\S]*?)\}/g)];
  return objectMatches.map((entry) => {
    const fields = {};
    for (const field of ['category', 'name', 'description', 'url']) {
      const fieldMatch = entry[1].match(new RegExp(`${field}:\\s*'([^']*)'`));
      if (fieldMatch) fields[field] = fieldMatch[1];
    }
    return fields;
  });
}

function fileExistsForUrl(baseFile, url) {
  if (!url || url.startsWith('#') || /^[a-z]+:/i.test(url)) return true;
  const clean = url.split(/[?#]/)[0].replace(/\\/g, '/');
  const resolved = path.resolve(root, path.dirname(baseFile), clean);
  return fs.existsSync(resolved);
}

function getFragmentTargets(html) {
  const targets = new Set();
  for (const match of html.matchAll(/\b(?:id|name)=(["'])([^"']+)\1/g)) {
    targets.add(match[2]);
  }
  return targets;
}

function decodeFragment(fragment) {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

function assertLocalLinksResolve(page, html) {
  const anchorPattern = /<a\b[^>]*\bhref=(["'])(.*?)\1/gi;
  const currentTargets = getFragmentTargets(html);

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[2].trim();
    if (!href || href.includes('${')) continue;
    assert(href !== '#', `${page} should not contain empty hash links`);
    assert(!/^javascript:/i.test(href), `${page} should not contain javascript pseudo-links`);
    if (/^(https?:|mailto:|tel:)/i.test(href) || href.startsWith('//')) continue;

    const hashIndex = href.indexOf('#');
    const pathPart = (hashIndex >= 0 ? href.slice(0, hashIndex) : href).split('?')[0];
    const fragment = hashIndex >= 0 ? href.slice(hashIndex + 1) : '';
    let targetHtml = html;
    let targetTargets = currentTargets;

    if (pathPart) {
      const clean = pathPart.replace(/\\/g, '/');
      const targetPath = path.resolve(root, path.dirname(page), clean);
      assert(fs.existsSync(targetPath), `${page} local link should point to an existing file: ${href}`);

      if (targetPath.endsWith('.html')) {
        targetHtml = fs.readFileSync(targetPath, 'utf8');
        targetTargets = getFragmentTargets(targetHtml);
      }
    }

    if (fragment) {
      const target = decodeFragment(fragment);
      assert(targetTargets.has(target), `${page} link should point to an existing fragment: ${href}`);
    }
  }
}

function assertSiteShell(page, html) {
  const prefix = expectedAssetPrefix(page);
  assert(html.includes(`href="${prefix}assets/site.css"`), `${page} should load the shared site stylesheet`);
  assert(html.includes(`src="${prefix}assets/site.js"`), `${page} should load the shared site script`);
  assert(/<meta\s+name=(["'])description\1\s+content=(["'])[^"']{20,}\2/i.test(html), `${page} should include a meaningful meta description`);
  assert(/<link\s+rel=(["'])canonical\1\s+href=(["'])https:\/\/ylsnoi\.github\.io\//i.test(html), `${page} should include a canonical URL`);
  assert(/<meta\s+property=(["'])og:title\1/i.test(html), `${page} should include Open Graph title metadata`);
  assert(/<meta\s+property=(["'])og:description\1/i.test(html), `${page} should include Open Graph description metadata`);
  assert(/<main\b[^>]*\bid=(["'])main-content\1/i.test(html), `${page} should expose a main content landmark`);
}

function assertBlankTargetsAreHardened(page, html) {
  for (const match of html.matchAll(/<a\b[^>]*\btarget=(["'])_blank\1[^>]*>/gi)) {
    assert(/\brel=(["'])[^"']*\bnoopener\b[^"']*\1/i.test(match[0]), `${page} target="_blank" link should include rel="noopener": ${match[0]}`);
  }
}

for (const page of pages) {
  const html = read(page);
  assert(html.includes('id="mobile-menu-button"'), `${page} should have a mobile menu button`);
  assert(html.includes('id="mobile-menu"'), `${page} should have a mobile menu container`);
  assert(html.includes('mobileMenuButton.addEventListener'), `${page} should wire the mobile menu button`);
  assert(!html.includes('href="#" class="nav-item"'), `${page} should not keep desktop nav placeholder links`);
  assert(html.includes('class="skip-link"'), `${page} should provide a skip link`);
  assert(html.includes('id="main-content"'), `${page} should expose a main content landmark`);
  assert(html.includes('aria-live="polite"'), `${page} search results should be announced to assistive tech`);
  assert(html.includes('aria-label="关闭搜索结果"'), `${page} search close button should be labelled`);
  assert(html.includes('document.addEventListener(\'keydown\''), `${page} should close overlays with Escape`);

  const searchData = extractSearchData(html);
  assert(searchData.length >= 10, `${page} should expose useful search data`);
  for (const item of searchData) {
    assert(item.url, `${page} search item ${item.name || '(unnamed)'} should include a url`);
    assert(fileExistsForUrl(page, item.url), `${page} search item ${item.name} should point to an existing file: ${item.url}`);
  }

  assert(html.includes('result-card'), `${page} should render search results as clickable cards`);
}

const htmlPages = listHtmlPages(root);
const sitePages = htmlPages.filter((page) => !isFeedbackPage(page));

const indexHtml = read('index.html');
assert(indexHtml.includes('id="roadmap"'), 'index.html should include a learning roadmap section');
assert(indexHtml.includes('查看学习路径'), 'index.html should promote the learning roadmap in the hero');

const cspHtml = read('cspchusai.html');
assert(cspHtml.includes('id="exam-plan"'), 'cspchusai.html should include an exam preparation plan');
assert(cspHtml.includes('查看备考计划'), 'cspchusai.html should promote the exam plan in the hero');

const siteCss = read('assets/site.css');
assert(siteCss.includes('prefers-reduced-motion'), 'shared stylesheet should respect reduced-motion preferences');
assert(siteCss.includes('.site-progress'), 'shared stylesheet should style the reading progress indicator');
assert(siteCss.includes('.site-back-to-top'), 'shared stylesheet should style the back-to-top control');
assert(siteCss.includes('.code-copy-button'), 'shared stylesheet should style code copy controls');

const siteJs = read('assets/site.js');
for (const hook of ['initMobileMenu', 'initReadingProgress', 'initBackToTop', 'initCodeTools', 'initAnchorBehavior']) {
  assert(siteJs.includes(`var ${hook}`), `shared script should define ${hook}`);
}
assert(siteJs.includes('noopener'), 'shared script should harden target blank links');

for (const page of sitePages) {
  const html = read(page);
  assertSiteShell(page, html);
  assertBlankTargetsAreHardened(page, html);
}

for (const page of htmlPages) {
  const html = read(page);
  assert(!/href=(["'])#\1/.test(html), `${page} should not contain empty hash links`);
  assert(!/javascript:;/i.test(html), `${page} should not contain javascript placeholder links`);
  assert(!html.includes('姚老师信奥网'), `${page} should not contain the old site name`);
  assert(!html.includes('yaoteacher'), `${page} should not contain old brand contact handles`);
  assert(!html.includes('contact@yaoteacher.com'), `${page} should not contain old brand contact email`);
  assert(!html.includes('400-123-4567'), `${page} should not contain placeholder phone numbers`);
  assert(!html.includes('京ICP备12345678号'), `${page} should not contain placeholder ICP records`);
  assert(!html.includes('信息学奥赛教程'), `${page} should not contain the old generic site title`);
  assertLocalLinksResolve(page, html);
}

console.log('site completion checks passed');
