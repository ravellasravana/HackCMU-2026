import { formatLongDate, parseISODate } from "./dates";
import type { Category } from "./types";

const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface ReceiptPreset {
  id: string;
  label: string;
  retailer: string;
  description: string;
  /** How many days before "today" the order was delivered. */
  daysAgo: number;
  build: (purchaseISO: string) => string;
}

export const RECEIPT_PRESETS: ReceiptPreset[] = [
  {
    id: "instacart",
    label: "Instacart",
    retailer: "Instacart",
    description: "Clean line items — the email you'd actually forward.",
    daysAgo: 1,
    build: (iso) => {
      const d = parseISODate(iso);
      const long = `${WEEKDAY_LONG[d.getDay()]}, ${formatLongDate(iso)}`;
      return `From: Instacart <orders@instacart.com>
Subject: Your Whole Foods Market order has been delivered

Instacart
Your order from Whole Foods Market has been delivered
Delivered ${long} · Order #IC-4471-8823

Items (19)
1 × Organic Baby Spinach, 5 oz                      $3.49
1 × Strawberries, 1 lb                              $4.99
1 × Boneless Skinless Chicken Breast, 1.2 lb        $8.39
1 × Organic Whole Milk, 1 gal                       $5.29
1 × Large Brown Eggs, 12 ct                         $4.79
2 × Hass Avocados                                   $3.58
1 × Sourdough Loaf                                  $5.49
1 × Sharp Cheddar Block, 8 oz                       $4.29
1 × Greek Yogurt, Plain, 32 oz                      $5.99
1 × Bananas, 6 ct                                   $1.74
2 × Roma Tomatoes                                   $2.18
1 × Atlantic Salmon Fillet, 0.9 lb                  $11.69
1 × Flour Tortillas, 10 ct                          $3.29
1 × Red Bell Pepper                                 $1.99
1 × Ground Beef 80/20, 1 lb                         $6.49
1 × Jasmine Rice, 2 lb                              $3.99
1 × Yellow Onion, 3 lb bag                          $2.99
1 × Lemons, 2 ct                                    $1.58
1 × Heavy Whipping Cream, 16 oz                     $3.79

Subtotal                                            $86.03
Service fee                                         $4.30
Tip                                                 $8.00
Total                                               $98.33

Thanks for shopping with Instacart.
`;
    },
  },
  {
    id: "walmart",
    label: "Walmart (cryptic)",
    retailer: "Walmart",
    description: "Register abbreviations — ORG BBY SPNCH, CHKN BRST BNLS — to show normalization.",
    daysAgo: 1,
    build: (iso) => {
      const [y, m, d] = iso.split("-");
      return `Walmart Supercenter
ST# 02387 OP# 009044 TE# 21 TR# 04471
${m}/${d}/${y} 18:42

ORG BBY SPNCH 5OZ              003.49 F
STRWBRY 1LB                    004.99 F
CHKN BRST BNLS 1.2LB           008.39 F
GV WHL MLK GAL                 003.68 F
GV LG EGGS 12CT                002.98 F
HASS AVOC 2CT                  002.48 F
GV WHT BRD                     001.98 F
SHRD CHDR 8OZ                  002.78 F
GRK YGRT PLN 32OZ              004.98 F
BNNA 2.1LB @ 0.58/LB           001.22 F
ROMA TMTO 1.3LB                001.94 F
SLMN FLT 0.9LB                 009.99 F
TRTLLA FLR 10CT                002.48 F
RED BLL PPPR                   001.28 F
GRND BF 80/20 1LB              005.47 F
YEL ONN 3LB                    002.47 F
MRKTSD CHKN SLD KIT            004.98 F
SUBTOTAL                       066.58
TAX 1  2.000%                  000.35
TOTAL                          066.93
`;
    },
  },
];

/** Rough US grocery prices used when someone adds an item by hand without a price. */
export const ESTIMATED_PRICE: Record<Category, number> = {
  produce: 2.99,
  dairy: 4.49,
  eggs: 4.79,
  meat: 8.99,
  seafood: 11.99,
  bakery: 4.49,
  deli: 5.49,
  beverage: 3.99,
  frozen: 5.99,
  pantry: 3.49,
};
