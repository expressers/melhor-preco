// Generic product photos (Unsplash, free licence). Kept in one place so they
// can be swapped for files in /public without touching the rest of the mocks.
// Render them with <ProductPhoto>, which falls back to a neutral tile if a URL fails.

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

export const PHOTOS = {
  fridge: u("1571175443880-49e1d25b2bc5"),
  washer: u("1626806787461-102c1bfaaea1"),
  microwave: u("1574269909862-7e1d70bb8078"),
  tv: u("1593359677879-a4bb92f829d1"),
  airCon: u("1585338447937-7082f8fc763d"),
  phone: u("1511707171634-5f897ff02aa9"),
  tshirt: u("1521572163474-6864f9cf17ab"),
  dress: u("1595777457583-95e059d581b8"),
  shoes: u("1549298916-b41d501d3772"),
  construction: u("1504307651254-35680f356dfd"),
  paint: u("1562259949-e8e7689d7828"),
} as const;
