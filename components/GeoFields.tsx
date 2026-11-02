'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomSelect from '@/components/CustomSelect';
import {
  defaultCurrencyForCountry,
  defaultTimezoneForCountry,
  fetchCities,
  fetchCountries,
  fetchCurrencies,
  fetchStates,
  fetchTimezones,
  geocodePlace,
  placeQuery,
  type CountryView,
  type CurrencyView,
  type RegionView,
} from '@/lib/geo';

export type GeoSelection = {
  countryCode: string;
  region: string;
  city: string;
  currency?: string;
  timezone?: string;
};

type Props = {
  value: GeoSelection;
  onChange: (next: GeoSelection) => void;
  showCurrency?: boolean;
  showTimezone?: boolean;
  geocodeOnCity?: boolean;
  onGeocoded?: (coords: { lat: number; lon: number; displayName: string }) => void;
  helperPrefix?: string;
  /** Dense layout for tight auth/register screens — no helper text. */
  compact?: boolean;
};

export default function GeoFields({
  value,
  onChange,
  showCurrency = true,
  showTimezone = true,
  geocodeOnCity = false,
  onGeocoded,
  helperPrefix,
  compact = false,
}: Props) {
  const [countries, setCountries] = useState<CountryView[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyView[]>([]);
  const [states, setStates] = useState<RegionView[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [timezones, setTimezones] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.code === value.countryCode),
    [countries, value.countryCode]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCountries(), fetchCurrencies(false)])
      .then(([countryList, currencyList]) => {
        if (cancelled) return;
        setCountries(countryList);
        setCurrencies(currencyList);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStates = useCallback(async (countryCode: string) => {
    if (!countryCode) {
      setStates([]);
      setCities([]);
      return;
    }
    setLoadingStates(true);
    try {
      const next = await fetchStates(countryCode);
      setStates(next);
    } catch {
      setStates([]);
    } finally {
      setLoadingStates(false);
    }
  }, []);

  const loadCities = useCallback(async (countryCode: string, stateName: string) => {
    if (!countryCode || !stateName) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const next = await fetchCities(countryCode, stateName);
      setCities(next);
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  const loadTimezones = useCallback(async (countryCode: string) => {
    if (!countryCode) {
      setTimezones([]);
      return;
    }
    try {
      const next = await fetchTimezones(countryCode);
      setTimezones(next);
    } catch {
      setTimezones([]);
    }
  }, []);

  useEffect(() => {
    if (value.countryCode) {
      void loadStates(value.countryCode);
      void loadTimezones(value.countryCode);
    }
  }, [value.countryCode, loadStates, loadTimezones]);

  useEffect(() => {
    if (value.countryCode && value.region) {
      void loadCities(value.countryCode, value.region);
    }
  }, [value.countryCode, value.region, loadCities]);

  const handleCountryChange = (code: string) => {
    const country = countries.find((c) => c.code === code);
    onChange({
      countryCode: code,
      region: '',
      city: '',
      currency: showCurrency ? defaultCurrencyForCountry(country) : value.currency,
      timezone: showTimezone ? defaultTimezoneForCountry(country) : value.timezone,
    });
    setCities([]);
  };

  const handleRegionChange = (region: string) => {
    onChange({ ...value, region, city: '' });
  };

  const handleCityChange = async (city: string) => {
    onChange({ ...value, city });
    if (!geocodeOnCity || !onGeocoded) return;
    const query = placeQuery({
      city,
      region: value.region,
      countryName: selectedCountry?.name,
    });
    const found = await geocodePlace(query);
    if (found) onGeocoded(found);
  };

  const currencyOptions = useMemo(() => {
    const fromCatalog = currencies.map((c) => ({
      value: c.code,
      label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''} — ${c.name || c.code}`,
    }));
    const fromCountries = new Map<string, string>();
    countries.forEach((country) => {
      country.currencies?.forEach((c) => {
        if (c.code && !fromCountries.has(c.code)) {
          fromCountries.set(c.code, `${c.code}${c.symbol ? ` (${c.symbol})` : ''} — ${c.name || c.code}`);
        }
      });
    });
    const merged = fromCatalog.length > 0
      ? fromCatalog
      : Array.from(fromCountries.entries()).map(([code, label]) => ({ value: code, label }));
    if (value.currency && !merged.some((o) => o.value === value.currency)) {
      merged.unshift({ value: value.currency, label: value.currency });
    }
    return merged;
  }, [currencies, countries, value.currency]);

  const hint = helperPrefix ? `${helperPrefix} ` : '';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: compact
          ? showCurrency
            ? 'repeat(3, minmax(0, 1fr))'
            : 'repeat(2, minmax(0, 1fr))'
          : 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: compact ? '8px' : '16px',
      }}
    >
      <div className="form-group" style={compact ? { marginBottom: 0, gap: 3 } : undefined}>
        <label className="form-label" style={compact ? { fontSize: '0.72rem' } : undefined}>
          Country
        </label>
        <CustomSelect
          options={countries.map((c) => ({
            value: c.code,
            label: c.name,
            sublabel: c.code,
            icon: c.flag ? <span style={{ fontSize: '1.05rem' }}>{c.flag}</span> : undefined,
          }))}
          value={value.countryCode}
          onChange={handleCountryChange}
          placeholder="Select country"
          loading={loadingCountries}
        />
        {!compact && (
          <p className="input-helper" style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {hint}Loads official states, provinces, and currencies for this country.
          </p>
        )}
      </div>

      {showCurrency && (
        <div className="form-group" style={compact ? { marginBottom: 0, gap: 3 } : undefined}>
          <label className="form-label" style={compact ? { fontSize: '0.72rem' } : undefined}>
            Currency
          </label>
          <CustomSelect
            options={currencyOptions}
            value={value.currency || ''}
            onChange={(currency) => onChange({ ...value, currency })}
            placeholder="Select currency"
          />
          {!compact && (
            <p className="input-helper" style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Prices, bookings, and payouts for this business use this currency.
            </p>
          )}
        </div>
      )}

      <div className="form-group" style={compact ? { marginBottom: 0, gap: 3 } : undefined}>
        <label className="form-label" style={compact ? { fontSize: '0.72rem' } : undefined}>
          State / Region
        </label>
        <CustomSelect
          options={states.map((s) => ({ value: s.name, label: s.name }))}
          value={value.region}
          onChange={handleRegionChange}
          placeholder="Select region"
          disabled={!value.countryCode}
          loading={loadingStates}
        />
      </div>

      <div className="form-group" style={compact ? { marginBottom: 0, gap: 3 } : undefined}>
        <label className="form-label" style={compact ? { fontSize: '0.72rem' } : undefined}>
          City
        </label>
        <CustomSelect
          options={cities.map((c) => ({ value: c, label: c }))}
          value={value.city}
          onChange={(city) => void handleCityChange(city)}
          placeholder="Select city"
          disabled={!value.region}
          loading={loadingCities}
        />
      </div>

      {showTimezone && (
        <div
          className="form-group"
          style={{
            gridColumn: compact ? (showCurrency ? 'span 2' : '1 / -1') : '1 / -1',
            marginBottom: compact ? 0 : undefined,
            gap: compact ? 3 : undefined,
          }}
        >
          <label className="form-label" style={compact ? { fontSize: '0.72rem' } : undefined}>
            Timezone
          </label>
          <CustomSelect
            options={timezones.map((tz) => ({ value: tz, label: tz }))}
            value={value.timezone || ''}
            onChange={(timezone) => onChange({ ...value, timezone })}
            placeholder="Select timezone"
          />
        </div>
      )}
    </div>
  );
}
