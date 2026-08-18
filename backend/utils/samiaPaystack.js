function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getSamiaPaystackConfig() {
  return {
    secretKey: readEnv('SAMIA_PAYSTACK_SECRET_KEY'),
    publicKey: readEnv('SAMIA_PAYSTACK_PUBLIC_KEY'),
  };
}
