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

const indexHtml = read('index.html');
assert(indexHtml.includes('id="roadmap"'), 'index.html should include a learning roadmap section');
assert(indexHtml.includes('查看学习路径'), 'index.html should promote the learning roadmap in the hero');

const cspHtml = read('cspchusai.html');
assert(cspHtml.includes('id="exam-plan"'), 'cspchusai.html should include an exam preparation plan');
assert(cspHtml.includes('查看备考计划'), 'cspchusai.html should promote the exam plan in the hero');

for (const page of listHtmlPages(root)) {
  const html = read(page);
  assert(!html.includes('姚老师信奥网'), `${page} should not contain the old site name`);
  assert(!html.includes('yaoteacher'), `${page} should not contain old brand contact handles`);
  assert(!html.includes('contact@yaoteacher.com'), `${page} should not contain old brand contact email`);
}

console.log('homepage completion checks passed');
