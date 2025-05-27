import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { loadCookies, saveCookies } from '../core/sessionManager.js';
import { delay, log } from '../utils/logger.js';
import { sendTelegramNotification } from '../utils/notifier.js';

const BASE_URL = 'https://www.amazon.com.mx/';
const COOKIES_PATH = path.resolve('./sessions/bot-session.json');
const targets = JSON.parse(fs.readFileSync(path.resolve('./config/targets.json'), 'utf-8'));

function formatNameForFile(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
}

export async function runBot() {
  log('🧩 Conectando a tu navegador Chrome real vía CDP...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  await loadCookies(context, COOKIES_PATH);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  const accountText = await page
    .locator('#nav-link-accountList-nav-line-1')
    .innerText()
    .catch(() => '');

  if (!/hola\s+/i.test(accountText)) {
    log('⚠️ No se detectó sesión activa. Inicia sesión manualmente y presiona Enter para continuar...');
    process.stdin.once('data', async () => {
      await saveCookies(context, COOKIES_PATH);
      log('✅ Sesión guardada. Comenzando monitoreo...');
      await monitorTargets(page);
    });
    return;
  }

  log('✅ Sesión activa detectada. Comenzando monitoreo...');
  await monitorTargets(page);
}

async function monitorTargets(page) {
  const baseInterval = 25000;

  while (true) {
    for (const target of targets) {
      const { asin, name, maxPrice } = target;
      const url = `https://www.amazon.com.mx/dp/${asin}`;
      const filenameBase = `${asin}_${formatNameForFile(name)}`;
      log(`🔎 Revisando ${name} (ASIN: ${asin})`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const priceText = await page
          .locator('span.a-price-whole')
          .first()
          .innerText()
          .catch(() => '');

        let price = null;
        if (priceText && /\d/.test(priceText)) {
          price = parseFloat(priceText.replace(/[^\d.]/g, ''));
        } else {
          log(`❌ No se detectó un precio válido para ${name}. Saltando...`);
          continue;
        }

        const buyNowButton = page.locator('#buy-now-button');
        if (await buyNowButton.isVisible() && price <= maxPrice) {
          log(`🟢 Producto disponible por $${price}. Iniciando compra inmediata...`);
          await sendTelegramNotification(`✅ *${name}* disponible por $${price}.\nASIN: ${asin}\nhttps://www.amazon.com.mx/dp/${asin}`);
          await buyNowButton.click();
          await delay(3000);

          await completePurchase(page, asin, name);
          await page.screenshot({ path: `screenshots/${filenameBase}_bought.png` });

        } else {
          log(`⛔ No disponible o precio $${price} supera el máximo ($${maxPrice}).`);
        }

        const jitter = Math.floor(Math.random() * 10000);
        const waitTime = baseInterval + jitter;
        log(`⏳ Esperando ${waitTime / 1000}s antes del siguiente producto...`);
        await delay(waitTime);
      } catch (err) {
        log(`❌ Error al revisar ${name} (${asin}): ${err.message}`);
      }
    }
  }
}

async function completePurchase(page, asin, name) {
  try {
    const currentURL = page.url();

    if (currentURL.includes('/payselect/')) {
      log(`🟡 Amazon requiere seleccionar método de pago. Procediendo...`);

      const firstAvailableCard = page.locator('input[name="ppw-instrumentRowSelection"]');
      if (await firstAvailableCard.first().isVisible()) {
        await firstAvailableCard.first().check();
        log(`💳 Tarjeta seleccionada. Confirmando método de pago...`);

        const confirmButton = page.locator('input.a-button-input[name="ppw-widgetEvent:SetPaymentPlanSelectContinueEvent"]');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await delay(3000);
        } else {
          log(`❌ No se encontró botón para confirmar método de pago.`);
          await page.screenshot({ path: `screenshots/${asin}_no_confirm_payment.png` });
          return;
        }
      } else {
        log(`❌ No se encontró tarjeta visible. Requiere intervención manual.`);
        await page.screenshot({ path: `screenshots/${asin}_no_cards.png` });
        return;
      }
    }

    const placeOrderButtons = page.locator('input[name="placeYourOrder1"]:not([disabled])');
    const count = await placeOrderButtons.count();

    if (count > 0) {
      log(`✅ Botón 'Realiza tu pedido' detectado. Confirmando compra...`);
      await placeOrderButtons.nth(0).click();
      log(`🎉 Pedido realizado exitosamente para ${name}!`);
    } else {
      log(`⚠️ No se encontró un botón activo para finalizar el pedido.`);
      await page.screenshot({ path: `screenshots/${asin}_placeorder_disabled.png` });
    }

  } catch (err) {
    log(`❌ Error al intentar finalizar el pedido de ${name}: ${err.message}`);
    await page.screenshot({ path: `screenshots/${asin}_placeorder_error.png` });
  }
}

export async function comprarProducto(asin) {
  log(`🤖 Compra directa por ASIN: ${asin}`);
  const target = targets.find(t => t.asin === asin);

  if (!target) {
    log(`❌ ASIN no encontrado en targets.json: ${asin}`);
    return;
  }

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  await loadCookies(context, COOKIES_PATH);
  await page.goto(`https://www.amazon.com.mx/dp/${asin}`, { waitUntil: 'domcontentloaded' });

  const priceText = await page
    .locator('span.a-price-whole')
    .first()
    .innerText()
    .catch(() => '');

  let price = null;
  if (priceText && /\d/.test(priceText)) {
    price = parseFloat(priceText.replace(/[^\d.]/g, ''));
  }

  if (!price || price > target.maxPrice) {
    log(`⛔ Precio inválido o mayor que el máximo: $${price} > $${target.maxPrice}`);
    return;
  }

  log(`🟢 Iniciando compra directa para ${target.name} por $${price}`);
  await sendTelegramNotification(`✅ *${target.name}* disponible por $${price}.\nASIN: ${asin}\nhttps://www.amazon.com.mx/dp/${asin}`);
  await page.locator('#buy-now-button').click();
  await delay(3000);

  await completePurchase(page, asin, target.name);
  await page.screenshot({ path: `screenshots/${asin}_direct_bought.png` });
}
