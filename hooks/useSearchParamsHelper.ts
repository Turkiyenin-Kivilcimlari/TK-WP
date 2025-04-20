"use client";

import { useSearchParams as useNextSearchParams } from 'next/navigation';

// Bu hook, useSearchParams hook'unu güvenli bir şekilde kullanmak içindir
// Sadece SearchParamsProvider içinde kullanılmalıdır
export function useSearchParamsHelper() {
  const searchParams = useNextSearchParams();
  
  const getParam = (param: string): string | null => {
    return searchParams.get(param);
  };
  
  const getAllParams = (): URLSearchParams => {
    return searchParams;
  };
  
  const getParamAsNumber = (param: string): number | null => {
    const value = searchParams.get(param);
    if (value === null) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  };
  
  const getParamWithDefault = (param: string, defaultValue: string): string => {
    const value = searchParams.get(param);
    return value !== null ? value : defaultValue;
  };
  
  const hasParam = (param: string): boolean => {
    return searchParams.has(param);
  };
  
  const getParams = (param: string): string[] => {
    return searchParams.getAll(param);
  };
  
  const toObject = (): Record<string, string> => {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  };
  
  return {
    getParam,
    getAllParams,
    getParamAsNumber,
    getParamWithDefault,
    hasParam,
    getParams,
    toObject,
    searchParams
  };
}
