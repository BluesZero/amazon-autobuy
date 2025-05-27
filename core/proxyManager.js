export function getProxyForAccount(account) {
  const url = new URL(account.proxy);
  return {
    server: `${url.protocol}//${url.hostname}:${url.port}`,
    username: url.username,
    password: url.password,
  };
}
