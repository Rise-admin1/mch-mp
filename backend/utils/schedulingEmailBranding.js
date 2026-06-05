import { normalizeAppSource } from './schedulingStripe.js';

const DEFAULT_PHD_LOGO_URL =
  'https://amzn-s3-rightintellectual.s3.ap-south-1.amazonaws.com/phd_logo.png';

const DEFAULT_RISE_LOGO_URL =
  'https://phd-success.s3.ap-south-1.amazonaws.com/1-7ffa7b50.png';

const SHARED_COLORS = {
  primary: '#C8102E',
  primaryDark: '#9B0C24',
  accent: '#E53935',
  background: '#FFF5F5',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#FECACA',
};

const BRANDING_BY_APP = {
  'phd-success': {
    name: 'PhD Success AE',
    logoUrl: () =>
      process.env.SCHEDULING_EMAIL_LOGO_URL?.trim() || DEFAULT_PHD_LOGO_URL,
  },
  rise: {
    name: 'RISE Scheduler',
    logoUrl: () =>
      process.env.SCHEDULING_RISE_EMAIL_LOGO_URL?.trim() || "https://phd-success.s3.ap-south-1.amazonaws.com/1-7ffa7b50.png",
  },
};

export function getEmailBranding(appSource) {
  const normalized = normalizeAppSource(appSource) || 'phd-success';
  const config = BRANDING_BY_APP[normalized] || BRANDING_BY_APP['phd-success'];

  return {
    ...SHARED_COLORS,
    name: config.name,
    logoUrl: config.logoUrl(),
    appSource: normalized,
  };
}
