// Shared pictograms for venue cards and the filter rail.
const artwork = {
 other:'<path d="M20 35c-5-6-12-12-12-19a12 12 0 0 1 24 0c0 7-7 13-12 19Z"/><circle cx="20" cy="16" r="3"/>',
 all:'<rect x="7" y="7" width="11" height="11" rx="2"/><rect x="22" y="7" width="11" height="11" rx="2"/><rect x="7" y="22" width="11" height="11" rx="2"/><rect x="22" y="22" width="11" height="11" rx="2"/>',
 bakery:'<path d="M9 32c-3 0-5-3-3-6L23 9c4-4 9 1 6 5L12 31Z"/><path d="m13 20 4 1m1-6 4 1m1-6 4 1"/><path d="M18 33c1-6 5-10 10-10s9 4 10 10l-6-3-4 4-4-4Z"/>',
 ice_cream:'<path d="m12 17 8 18 8-18M12 17a4 4 0 0 1-1-8 9 9 0 0 1 18 0 4 4 0 0 1-1 8Zm3 7 9 4m-8 0 9-6"/>',
 pastry:'<path d="M6 17 23 6l11 11v15H6Zm0 0h28M6 24h28"/><path d="M22 6c0-3 2-4 4-4"/>',
 deli:'<path d="M5 16h30v5H5Zm3 5 3 12h18l3-12M11 16l3-5h12l3 5m-13 7 1 7m6-7-1 7"/>',
 takeaway:'<path d="M9 13h22l3 22H6Zm6 0V9a5 5 0 0 1 10 0v4m-9 8h8"/>',
 sushi:'<ellipse cx="15" cy="13" rx="9" ry="5"/><path d="M6 13v13a9 5 0 0 0 18 0V13m4 5 7 2-3 12-8-2m4-7 5 1"/><circle cx="15" cy="13" r="1.8"/>',
 piadina:'<path d="M5 27a15 15 0 1 1 30 0H5Zm1 4h28M12 24l3-4 4 3 4-4 5 5m-16-8 2-2m8-2 2 1"/>',
 pizza:'<path d="M7 11a27 27 0 0 1 26 0L20 35Z"/><path d="M9 15a23 23 0 0 1 22 0"/><circle cx="17" cy="19" r="1.6"/><circle cx="23" cy="23" r="1.6"/>',
 cafe:'<path d="M8 15h20v8a10 10 0 0 1-20 0Zm20 2h3a4 4 0 1 1 0 8h-3M5 34h29M15 5c-3 2 3 4 0 7m7-7c-3 2 3 4 0 7"/>',
 pub:'<path d="M11 14h18l-3 20H14Z"/><path d="M11 14a4 4 0 0 1 1-8 5 5 0 0 1 8-1 5 5 0 0 1 8 2 4 4 0 0 1 1 7m-12 5 1 10m5-10-1 10"/>',
 cocktail:'<path d="M6 10h28L20 25ZM11 15h18m-9 10v9m-6 0h12m-3-19 8-10"/><circle cx="31" cy="5" r="2"/>',
 wine:'<path d="M13 6h14l2 9a9 9 0 1 1-18 0ZM12 16h16m-8 8v10m-6 0h12"/>',
 restaurant:'<circle cx="20" cy="20" r="10"/><circle cx="20" cy="20" r="6"/><path d="M4 7v10m3-10v10m-3 0a2 2 0 0 0 3 0m-1.5 2v14M34 7c-3 4-3 8 0 11h2m0-11v26"/>',
 burger:'<path d="M7 17a13 9 0 0 1 26 0Zm0 5h26m-26 5h26v1a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4Z"/><path d="m14 13 1-1m7-1 1 1m4 1 1 1"/>',
};

export const categoryFilters = ['all','bakery','pizza','cafe','pub','wine','cocktail','restaurant','piadina','burger','sushi','takeaway','ice_cream','pastry','deli'];

export function displayCategory(category, takeaway) {
 if (category==='fast_food'&&takeaway) return 'takeaway';
 if (category==='bar') return 'cafe';
 return categoryFilters.includes(category)&&category!=='all'?category:'other';
}

export function categoryIcon(category) {
 const shape=artwork[category]||artwork.restaurant;
 return `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shape}</svg>`;
}
