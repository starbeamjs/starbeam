export interface Branding {
  logo_url: string;
  icon_url: string;
}

export interface Stock {
  ticker: string;
  name: string;
  description?: string;
  homepage_url?: string;
  total_employees?: number;
  market_cap?: number;
  share_class_shares_outstanding?: number;
  branding?: Branding;
  values?: DailyValues[];
}

export interface DailyValues {
  from: string;
  open: number;
  close: number;
  high: number;
  low: number;
}
