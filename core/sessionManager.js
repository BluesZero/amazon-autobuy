import fs from 'fs';

export async function loadCookies(context, filePath) {
  if (fs.existsSync(filePath)) {
    const cookies = JSON.parse(fs.readFileSync(filePath));
    await context.addCookies(cookies);
  }
}

export async function saveCookies(context, filePath) {
  const cookies = await context.cookies();
  fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
}
