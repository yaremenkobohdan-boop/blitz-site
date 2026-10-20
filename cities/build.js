// Генератор лендінгів міст: node cities/build.js
// Рендерить cities/city.tpl.html у Chromium (Playwright) для кожного міста й зберігає статичний HTML
// (тексти, FAQ, ціни вже в коді сторінки для пошукових систем). Ціни беруться з ../assets/radio-prices.js.
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const CITIES=[['bt','bila-tserkva','Біла Церква','у Білій Церкві'],['fs','fastiv','Фастів','у Фастові'],['um','uman','Умань','в Умані'],['sm','smila','Сміла','у Смілі'],['bg','bohuslav','Богуслав','у Богуславі'],['rk','rokytne','Рокитне','у Рокитному'],['st','stavyshche','Ставище','у Ставищі'],['mz','merezha','Вся мережа','у мережі БЛІЦ-ФМ']];
const root=path.join(__dirname,'..'),tpl=fs.readFileSync(path.join(__dirname,'city.tpl.html'),'utf8'),prices=fs.readFileSync(path.join(root,'assets','radio-prices.js'),'utf8');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 const today=new Date().toISOString().slice(0,10);
 for(const [k,slug,n,l] of CITIES){
  const host=slug+'.blitz.com.ua';
  const html=tpl.replace(/__CITYN__/g,n).replace(/__CITYL__/g,l).replace(/__HOST__/g,host).replace(/__CITY__/g,k);
  const p=await b.newPage();
  await p.route('**/*',r=>{const u=r.request().url();
   if(u.endsWith('/assets/radio-prices.js')||u==='https://calc.blitz.com.ua/prices.js')return r.fulfill({contentType:'application/javascript',body:prices});
   if(u.startsWith('about:')||u.startsWith('data:'))return r.continue();
   if(u==='https://'+host+'/')return r.fulfill({contentType:'text/html',body:html});
   return r.abort()});
  await p.goto('https://'+host+'/');await p.waitForTimeout(800);
  let out='<!doctype html>\n'+await p.evaluate(()=>{document.querySelectorAll('#uspacy-forms,script[src*="uspa.cy"]').forEach(e=>e.remove());return document.documentElement.outerHTML});
  const dir=path.join(__dirname,'sites',slug);fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),out);
  const BOTS=['ClaudeBot','Claude-SearchBot','Claude-User','GPTBot','OAI-SearchBot','ChatGPT-User','PerplexityBot','Perplexity-User','Google-Extended','Applebot-Extended','Bingbot','Googlebot','Meta-ExternalAgent','CCBot','Amazonbot','DuckAssistBot'];
  fs.writeFileSync(path.join(dir,'robots.txt'),'User-agent: *\nAllow: /\n\n'+BOTS.map(b=>'User-agent: '+b+'\nAllow: /\n').join('\n')+'\nSitemap: https://'+host+'/sitemap.xml\n');
  fs.writeFileSync(path.join(dir,'llms.txt'),'# Реклама на радіо '+l+' — РІА «БЛІЦ»\n\n> Рекламно-інформаційне агентство повного циклу РІА «БЛІЦ» (Біла Церква, працює з 2000 року): реклама на радіо, розрахунок вартості та замовлення '+l+'. Ціни на радіореклами і спонсорство програм розраховує онлайн-калькулятор на цій сторінці.\n\n## Сторінки\n- Ця сторінка: https://'+host+'/\n- Головний сайт агентства: https://blitz.com.ua\n- Реклама на радіо (всі міста): https://blitz.com.ua/poslugy/radio\n- Власна радіостанція БЛІЦ ФМ: https://blits-fm.ua\n\n## Контакти\nАдреса: вул. Млинова, 5, оф. 22, Біла Церква, Україна\nГрафік роботи: Пн–Пт, 9:00–17:00\nТелефони: +380 67 280 40 30, +380 50 469 33 66, +380 63 000 25 30\nTelegram: https://t.me/ra_blits\nInstagram: https://www.instagram.com/ra_blitz/\nFacebook: https://www.facebook.com/blitz.com.ua/\n');
  fs.writeFileSync(path.join(dir,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://'+host+'/</loc><lastmod>'+today+'</lastmod></url></urlset>\n');
  await p.close();console.log('ok',slug,out.length);
 }
 await b.close();
})();
