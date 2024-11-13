import { writable } from 'svelte/store';
import { PlanSummaryData } from './plan-data';

export const planSummary = writable(new PlanSummaryData([], false));
export const now = writable(new Date());
export const timelineColors = writable<string[]>([]);
export const timelineHoverColors = writable<string[]>([]);
