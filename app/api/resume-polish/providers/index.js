import { KimiProvider } from './kimi';
import { DeepSeekProvider } from './deepseek';

const providers = {
  kimi: new KimiProvider(),
  deepseek: new DeepSeekProvider(),
};

export function getProvider(name) {
  return providers[name];
}

export function getAllProviders() {
  return Object.keys(providers);
}
