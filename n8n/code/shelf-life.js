// n8n Code node — "Shelf life & eat-by dates"
// Mode: Run Once for All Items
// Input: parsed K2 extraction { retailer, purchase_date, items[] }
// Output: { today, retailer, purchaseDate, items: [{ id, name, canonical, category, price, purchaseDate, storage, eatBy, daysLeft, freezerDays, staple, confidence }] }
//
// Abridged USDA FoodKeeper table: id -> [emoji, category, defaultStorage, pantryDays, fridgeDays, freezerDays, staple]
const FOODKEEPER = {"spinach":["🥬","produce","fridge",null,5,300,0],"lettuce":["🥬","produce","fridge",null,7,null,0],"kale":["🥬","produce","fridge",null,6,300,0],"strawberries":["🍓","produce","fridge",1,3,240,0],"blueberries":["🫐","produce","fridge",null,10,240,0],"raspberries":["🍓","produce","fridge",null,3,240,0],"grapes":["🍇","produce","fridge",null,7,240,0],"bananas":["🍌","produce","pantry",4,7,60,0],"apples":["🍎","produce","fridge",21,45,null,0],"avocados":["🥑","produce","pantry",4,5,null,0],"tomatoes":["🍅","produce","pantry",5,7,null,0],"cucumbers":["🥒","produce","fridge",null,7,null,0],"bell_pepper":["🫑","produce","fridge",null,8,240,0],"broccoli":["🥦","produce","fridge",null,5,300,0],"carrots":["🥕","produce","fridge",null,21,300,0],"onions":["🧅","produce","pantry",30,60,null,0],"garlic":["🧄","produce","pantry",30,60,null,1],"potatoes":["🥔","produce","pantry",30,60,null,0],"sweet_potatoes":["🍠","produce","pantry",21,null,null,0],"mushrooms":["🍄","produce","fridge",null,5,240,0],"zucchini":["🥒","produce","fridge",null,5,null,0],"asparagus":["🌱","produce","fridge",null,4,240,0],"green_beans":["🫛","produce","fridge",null,5,240,0],"lemons":["🍋","produce","fridge",7,21,null,0],"limes":["🍋","produce","fridge",7,21,null,0],"cilantro":["🌿","produce","fridge",null,5,null,0],"basil":["🌿","produce","fridge",3,3,null,0],"ginger":["🫚","produce","fridge",null,21,180,0],"corn":["🌽","produce","fridge",null,2,240,0],"celery":["🥬","produce","fridge",null,14,null,0],"cauliflower":["🥦","produce","fridge",null,7,240,0],"mango":["🥭","produce","pantry",4,5,240,0],"oranges":["🍊","produce","fridge",7,21,null,0],"cabbage":["🥬","produce","fridge",null,14,null,0],"salad_kit":["🥗","produce","fridge",null,4,null,0],"milk":["🥛","dairy","fridge",null,7,90,0],"oat_milk":["🥛","dairy","fridge",180,10,null,0],"eggs":["🥚","eggs","fridge",null,35,null,0],"butter":["🧈","dairy","fridge",null,60,270,1],"cheddar":["🧀","dairy","fridge",null,180,180,0],"mozzarella":["🧀","dairy","fridge",null,7,null,0],"parmesan":["🧀","dairy","fridge",null,180,null,0],"yogurt":["🥣","dairy","fridge",null,14,60,0],"cream_cheese":["🧀","dairy","fridge",null,30,null,0],"sour_cream":["🥣","dairy","fridge",null,21,null,0],"heavy_cream":["🥛","dairy","fridge",null,10,120,0],"chicken_breast":["🐔","meat","fridge",null,2,270,0],"chicken_thighs":["🍗","meat","fridge",null,2,270,0],"ground_beef":["🥩","meat","fridge",null,2,120,0],"steak":["🥩","meat","fridge",null,4,240,0],"pork_chops":["🍖","meat","fridge",null,4,150,0],"bacon":["🥓","meat","fridge",null,14,30,0],"sausage":["🌭","meat","fridge",null,2,60,0],"deli_turkey":["🥪","deli","fridge",null,14,60,0],"salmon":["🐟","seafood","fridge",null,2,90,0],"shrimp":["🦐","seafood","fridge",null,2,180,0],"tofu":["🧊","deli","fridge",null,30,150,0],"bread":["🍞","bakery","pantry",5,14,90,0],"tortillas":["🫓","bakery","pantry",7,30,180,0],"bagels":["🥯","bakery","pantry",5,7,90,0],"hummus":["🥣","deli","fridge",null,30,null,0],"salsa":["🥣","deli","fridge",null,7,null,0],"guacamole":["🥑","deli","fridge",null,2,null,0],"fresh_pasta":["🍝","deli","fridge",null,3,60,0],"orange_juice":["🧃","beverage","fridge",null,14,null,0],"frozen_peas":["🫛","frozen","freezer",null,null,240,0],"frozen_berries":["🫐","frozen","freezer",null,null,240,0],"ice_cream":["🍨","frozen","freezer",null,null,90,0],"frozen_pizza":["🍕","frozen","freezer",null,null,90,0],"rice":["🍚","pantry","pantry",730,null,null,1],"pasta":["🍝","pantry","pantry",730,null,null,1],"olive_oil":["🫒","pantry","pantry",365,null,null,1],"canned_beans":["🥫","pantry","pantry",730,null,null,1],"canned_tomatoes":["🥫","pantry","pantry",540,null,null,1],"oats":["🌾","pantry","pantry",365,null,null,1],"flour":["🌾","pantry","pantry",240,null,null,1],"sugar":["🍬","pantry","pantry",730,null,null,1],"peanut_butter":["🥜","pantry","pantry",180,null,null,1],"cereal":["🥣","pantry","pantry",180,null,null,1],"coffee":["☕","pantry","pantry",180,null,null,1],"chips":["🍿","pantry","pantry",60,null,null,1],"soy_sauce":["🍶","pantry","pantry",365,null,null,1],"stock":["🥫","pantry","pantry",365,null,null,1],"spices":["🧂","pantry","pantry",730,null,null,1],"quinoa":["🌾","pantry","pantry",365,null,null,1],"honey":["🍯","pantry","pantry",730,null,null,1],"coconut_milk":["🥥","pantry","pantry",730,null,null,1],"sparkling_water":["🫧","beverage","pantry",365,null,null,1]};
// category -> [emoji, defaultStorage, pantryDays, fridgeDays, freezerDays]
const CATEGORY_DEFAULTS = {"produce":["🥗","fridge",null,7,240],"dairy":["🥛","fridge",null,10,90],"eggs":["🥚","fridge",null,35,null],"meat":["🥩","fridge",null,2,180],"seafood":["🐟","fridge",null,2,90],"bakery":["🍞","pantry",5,14,90],"deli":["🥪","fridge",null,5,60],"beverage":["🧃","fridge",180,7,null],"frozen":["🧊","freezer",null,null,180],"pantry":["🥫","pantry",365,null,null]};
const ESTIMATED_PRICE = { produce: 2.99, dairy: 4.49, eggs: 4.79, meat: 8.99, seafood: 11.99, bakery: 4.49, deli: 5.49, beverage: 3.99, frozen: 5.99, pantry: 3.49 };

const input = $input.first().json;
const today = new Date().toISOString().slice(0, 10);
const purchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(input.purchase_date || '') ? input.purchase_date : today;
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const between = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

const items = (input.items || []).map((raw, i) => {
  const entry = raw.canonical && FOODKEEPER[raw.canonical] ? FOODKEEPER[raw.canonical] : null;
  const category = entry ? entry[1] : (CATEGORY_DEFAULTS[raw.category] ? raw.category : 'produce');
  const cd = CATEGORY_DEFAULTS[category];
  const storage = entry ? entry[2] : cd[1];
  const life = { pantry: entry ? entry[3] : cd[2], fridge: entry ? entry[4] : cd[3], freezer: entry ? entry[5] : cd[4] };
  const days = life[storage] ?? life.fridge ?? life.pantry ?? null;
  const eatBy = days == null ? null : addDays(purchaseDate, days);
  return {
    id: 'i' + i,
    name: raw.name || raw.raw_line,
    rawLine: raw.raw_line,
    canonical: entry ? raw.canonical : 'unknown',
    emoji: entry ? entry[0] : cd[0],
    category,
    quantity: Number(raw.quantity) || 1,
    unit: raw.unit || null,
    price: Number(raw.price) > 0 ? Number(raw.price) : ESTIMATED_PRICE[category],
    purchaseDate,
    storage,
    shelfLife: life,
    freezerDays: life.freezer,
    eatBy,
    daysLeft: eatBy ? between(today, eatBy) : null,
    staple: entry ? entry[6] === 1 : false,
    confidence: Number(raw.confidence) || 0,
    needsConfirm: (Number(raw.confidence) || 0) < 0.7,
  };
});

return [{ json: { today, retailer: input.retailer || null, purchaseDate, items } }];
