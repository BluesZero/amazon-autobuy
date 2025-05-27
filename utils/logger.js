export function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

export function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
