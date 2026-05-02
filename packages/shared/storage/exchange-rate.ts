import { ExchangeRate, ExchangeRateTable } from '../types';
import { generateId } from '../utils/date';
import { getSupabaseStorageClient } from './supabase';

type ExchangeRateRow = {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  timestamp: number;
  source: ExchangeRate['source'];
};

function fromRow(row: ExchangeRateRow): ExchangeRate {
  return {
    id: row.id,
    fromCurrency: row.from_currency,
    toCurrency: row.to_currency,
    rate: row.rate,
    timestamp: row.timestamp,
    source: row.source,
  };
}

function toRow(rate: ExchangeRate): ExchangeRateRow {
  return {
    id: rate.id,
    from_currency: rate.fromCurrency,
    to_currency: rate.toCurrency,
    rate: rate.rate,
    timestamp: rate.timestamp,
    source: rate.source,
  };
}

export class ExchangeRateStorage {
  async save(exchangeRate: Omit<ExchangeRate, 'id'>): Promise<ExchangeRate> {
    const rate: ExchangeRate = {
      id: generateId('rate'),
      ...exchangeRate,
    };

    const { data, error } = await getSupabaseStorageClient()
      .from('exchange_rates')
      .insert(toRow(rate))
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as ExchangeRateRow);
  }

  async saveMany(rates: Omit<ExchangeRate, 'id'>[]): Promise<ExchangeRate[]> {
    const results: ExchangeRate[] = [];
    for (const rate of rates) {
      results.push(await this.save(rate));
    }
    return results;
  }

  async getRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const { data, error } = await getSupabaseStorageClient()
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? fromRow(data as ExchangeRateRow) : null;
  }

  async getAllRates(): Promise<ExchangeRate[]> {
    const { data, error } = await getSupabaseStorageClient()
      .from('exchange_rates')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return ((data || []) as ExchangeRateRow[]).map(fromRow);
  }

  async getRateTable(baseCurrency: string): Promise<ExchangeRateTable> {
    const allRates = await this.getAllRates();
    const rates: Record<string, number> = {};

    for (const rate of allRates) {
      if (rate.fromCurrency === baseCurrency && rates[rate.toCurrency] === undefined) {
        rates[rate.toCurrency] = rate.rate;
      }
    }

    const latestRate = allRates.find(r => r.fromCurrency === baseCurrency);
    return {
      baseCurrency,
      rates,
      timestamp: latestRate?.timestamp || Date.now(),
      lastUpdated: new Date(latestRate?.timestamp || Date.now()),
    };
  }

  async deleteOutdated(): Promise<number> {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const { data, error } = await getSupabaseStorageClient()
      .from('exchange_rates')
      .delete()
      .lt('timestamp', thirtyDaysAgo)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  async clear(): Promise<void> {
    const { error } = await getSupabaseStorageClient()
      .from('exchange_rates')
      .delete()
      .neq('id', '');

    if (error) throw error;
  }

  async isUpToDate(
    fromCurrency: string,
    toCurrency: string,
    maxAge: number = 24 * 60 * 60 * 1000
  ): Promise<boolean> {
    const rate = await this.getRate(fromCurrency, toCurrency);
    if (!rate) return false;
    return Date.now() - rate.timestamp < maxAge;
  }

  async export(): Promise<{ exportedAt: number; rates: ExchangeRate[] }> {
    return {
      exportedAt: Date.now(),
      rates: await this.getAllRates(),
    };
  }

  async import(data: { rates: ExchangeRate[] }): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const rate of data.rates || []) {
      try {
        const existing = await this.getRate(rate.fromCurrency, rate.toCurrency);
        if (existing && existing.timestamp >= rate.timestamp) {
          skipped++;
          continue;
        }
        await this.save(rate);
        imported++;
      } catch (error) {
        console.error('Failed to import exchange rate:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }
}

let exchangeRateStorage: ExchangeRateStorage | null = null;

export function getExchangeRateStorage(): ExchangeRateStorage {
  if (!exchangeRateStorage) {
    exchangeRateStorage = new ExchangeRateStorage();
  }
  return exchangeRateStorage;
}
