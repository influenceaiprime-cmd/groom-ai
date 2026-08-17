import { useEffect, useState } from 'react';
import { supabase } from './db';

export interface AppConfig {
  paywallEnabled: boolean;
  mirrorEnabled: boolean;
  scannerEnabled: boolean;
  videoEnabled: boolean;
  proMonthly: number;
  proYearly: number;
  paywallHeadline: string;
  bannerText: string;
  whopLink: string;
  accessCode: string;
}

const DEFAULT_CONFIG: AppConfig = {
  paywallEnabled: true,
  mirrorEnabled: true,
  scannerEnabled: true,
  videoEnabled: true,
  proMonthly: 4.99,
  proYearly: 19.99,
  paywallHeadline: 'Unlock Your Personal Beauty AI',
  bannerText: '',
  whopLink: '',
  accessCode: 'GLAMPRO2026',
};

export function useConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const load = () => {
      if (!supabase) return;
      supabase
        .from('settings')
        .select('value')
        .eq('key', 'config')
        .single()
        .then(
          (res: any) => {
            if (res.data?.value) setConfig({ ...DEFAULT_CONFIG, ...res.data.value });
          },
          () => {}
        );
    };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  return config;
}
