import type { Category, FoodEntry, Storage } from "./types";

/**
 * Abridged USDA FoodKeeper shelf-life table (~70 foods).
 * Durations are days; taken from the midpoint of FoodKeeper's ranges.
 * Full dataset: https://www.fsis.usda.gov/food-safety/foodkeeper-app
 */
export const FOODKEEPER: FoodEntry[] = [
  // ---- Produce -------------------------------------------------------------
  { id: "spinach", name: "Spinach", emoji: "🥬", category: "produce", aliases: ["spinach", "baby spinach", "spnch", "bby spnch"], fridgeDays: 5, freezerDays: 300, defaultStorage: "fridge" },
  { id: "lettuce", name: "Lettuce", emoji: "🥬", category: "produce", aliases: ["lettuce", "romaine", "spring mix", "salad mix", "arugula", "mixed greens", "lttce"], fridgeDays: 7, defaultStorage: "fridge" },
  { id: "kale", name: "Kale", emoji: "🥬", category: "produce", aliases: ["kale"], fridgeDays: 6, freezerDays: 300, defaultStorage: "fridge" },
  { id: "strawberries", name: "Strawberries", emoji: "🍓", category: "produce", aliases: ["strawberries", "strawberry", "strwbry", "strwb", "strawb"], pantryDays: 1, fridgeDays: 3, freezerDays: 240, defaultStorage: "fridge" },
  { id: "blueberries", name: "Blueberries", emoji: "🫐", category: "produce", aliases: ["blueberries", "blueberry", "blubry", "blbry"], fridgeDays: 10, freezerDays: 240, defaultStorage: "fridge" },
  { id: "raspberries", name: "Raspberries", emoji: "🍓", category: "produce", aliases: ["raspberries", "raspberry", "rspbry"], fridgeDays: 3, freezerDays: 240, defaultStorage: "fridge" },
  { id: "grapes", name: "Grapes", emoji: "🍇", category: "produce", aliases: ["grapes", "grape", "grps"], fridgeDays: 7, freezerDays: 240, defaultStorage: "fridge" },
  { id: "bananas", name: "Bananas", emoji: "🍌", category: "produce", aliases: ["bananas", "banana", "bnna", "bnns"], pantryDays: 4, fridgeDays: 7, freezerDays: 60, defaultStorage: "pantry" },
  { id: "apples", name: "Apples", emoji: "🍎", category: "produce", aliases: ["apples", "apple", "honeycrisp", "gala", "fuji", "appl"], pantryDays: 21, fridgeDays: 45, defaultStorage: "fridge" },
  { id: "avocados", name: "Avocados", emoji: "🥑", category: "produce", aliases: ["avocados", "avocado", "hass", "avcdo", "avoc"], pantryDays: 4, fridgeDays: 5, defaultStorage: "pantry" },
  { id: "tomatoes", name: "Tomatoes", emoji: "🍅", category: "produce", aliases: ["tomatoes", "tomato", "roma", "cherry tomatoes", "grape tomatoes", "tmto", "tomat"], pantryDays: 5, fridgeDays: 7, defaultStorage: "pantry" },
  { id: "cucumbers", name: "Cucumbers", emoji: "🥒", category: "produce", aliases: ["cucumbers", "cucumber", "cucmbr", "cuke"], fridgeDays: 7, defaultStorage: "fridge" },
  { id: "bell_pepper", name: "Bell peppers", emoji: "🫑", category: "produce", aliases: ["bell pepper", "bell peppers", "peppers", "red pepper", "green pepper", "pepper", "bll pppr", "ppprs"], fridgeDays: 8, freezerDays: 240, defaultStorage: "fridge" },
  { id: "broccoli", name: "Broccoli", emoji: "🥦", category: "produce", aliases: ["broccoli", "brocc", "brccli", "broccoli crowns"], fridgeDays: 5, freezerDays: 300, defaultStorage: "fridge" },
  { id: "carrots", name: "Carrots", emoji: "🥕", category: "produce", aliases: ["carrots", "carrot", "crrts", "baby carrots"], fridgeDays: 21, freezerDays: 300, defaultStorage: "fridge" },
  { id: "onions", name: "Onions", emoji: "🧅", category: "produce", aliases: ["onions", "onion", "yellow onion", "red onion", "onin", "onn"], pantryDays: 30, fridgeDays: 60, defaultStorage: "pantry" },
  { id: "garlic", name: "Garlic", emoji: "🧄", category: "produce", aliases: ["garlic", "grlc"], pantryDays: 30, fridgeDays: 60, defaultStorage: "pantry", staple: true },
  { id: "potatoes", name: "Potatoes", emoji: "🥔", category: "produce", aliases: ["potatoes", "potato", "russet", "yukon", "ptato", "pot"], pantryDays: 30, fridgeDays: 60, defaultStorage: "pantry" },
  { id: "sweet_potatoes", name: "Sweet potatoes", emoji: "🍠", category: "produce", aliases: ["sweet potatoes", "sweet potato", "yams", "swt pot"], pantryDays: 21, defaultStorage: "pantry" },
  { id: "mushrooms", name: "Mushrooms", emoji: "🍄", category: "produce", aliases: ["mushrooms", "mushroom", "cremini", "portobello", "mshrm", "shrooms"], fridgeDays: 5, freezerDays: 240, defaultStorage: "fridge" },
  { id: "zucchini", name: "Zucchini", emoji: "🥒", category: "produce", aliases: ["zucchini", "squash", "zucch", "zucc"], fridgeDays: 5, defaultStorage: "fridge" },
  { id: "asparagus", name: "Asparagus", emoji: "🌱", category: "produce", aliases: ["asparagus", "asprgs"], fridgeDays: 4, freezerDays: 240, defaultStorage: "fridge" },
  { id: "green_beans", name: "Green beans", emoji: "🫛", category: "produce", aliases: ["green beans", "string beans", "grn bns"], fridgeDays: 5, freezerDays: 240, defaultStorage: "fridge" },
  { id: "lemons", name: "Lemons", emoji: "🍋", category: "produce", aliases: ["lemons", "lemon", "lmn", "lmns"], pantryDays: 7, fridgeDays: 21, defaultStorage: "fridge" },
  { id: "limes", name: "Limes", emoji: "🍋", category: "produce", aliases: ["limes", "lime", "lms"], pantryDays: 7, fridgeDays: 21, defaultStorage: "fridge" },
  { id: "cilantro", name: "Cilantro", emoji: "🌿", category: "produce", aliases: ["cilantro", "parsley", "herbs", "clntro", "fresh herbs"], fridgeDays: 5, defaultStorage: "fridge" },
  { id: "basil", name: "Basil", emoji: "🌿", category: "produce", aliases: ["basil", "fresh basil", "bsl"], pantryDays: 3, fridgeDays: 3, defaultStorage: "fridge" },
  { id: "ginger", name: "Ginger", emoji: "🫚", category: "produce", aliases: ["ginger", "ginger root", "gngr"], fridgeDays: 21, freezerDays: 180, defaultStorage: "fridge" },
  { id: "corn", name: "Corn on the cob", emoji: "🌽", category: "produce", aliases: ["corn", "sweet corn", "corn cob"], fridgeDays: 2, freezerDays: 240, defaultStorage: "fridge" },
  { id: "celery", name: "Celery", emoji: "🥬", category: "produce", aliases: ["celery", "clry"], fridgeDays: 14, defaultStorage: "fridge" },
  { id: "cauliflower", name: "Cauliflower", emoji: "🥦", category: "produce", aliases: ["cauliflower", "cauli", "cflwr"], fridgeDays: 7, freezerDays: 240, defaultStorage: "fridge" },
  { id: "mango", name: "Mango", emoji: "🥭", category: "produce", aliases: ["mango", "mangos", "mangoes", "mngo"], pantryDays: 4, fridgeDays: 5, freezerDays: 240, defaultStorage: "pantry" },
  { id: "oranges", name: "Oranges", emoji: "🍊", category: "produce", aliases: ["oranges", "orange", "navel", "clementines", "mandarins", "orng"], pantryDays: 7, fridgeDays: 21, defaultStorage: "fridge" },
  { id: "cabbage", name: "Cabbage", emoji: "🥬", category: "produce", aliases: ["cabbage", "coleslaw mix", "slaw", "cbbg"], fridgeDays: 14, defaultStorage: "fridge" },
  { id: "salad_kit", name: "Salad kit", emoji: "🥗", category: "produce", aliases: ["salad kit", "chopped salad kit", "caesar kit", "salad bowl"], fridgeDays: 4, defaultStorage: "fridge" },

  // ---- Dairy & eggs --------------------------------------------------------
  { id: "milk", name: "Milk", emoji: "🥛", category: "dairy", aliases: ["milk", "whole milk", "2% milk", "skim milk", "mlk", "whl mlk", "vitamin d milk"], fridgeDays: 7, openedFridgeDays: 7, freezerDays: 90, defaultStorage: "fridge" },
  { id: "oat_milk", name: "Oat milk", emoji: "🥛", category: "dairy", aliases: ["oat milk", "almond milk", "soy milk", "oatly", "oat mlk", "almnd mlk"], pantryDays: 180, fridgeDays: 10, openedFridgeDays: 10, defaultStorage: "fridge" },
  { id: "eggs", name: "Eggs", emoji: "🥚", category: "eggs", aliases: ["eggs", "egg", "dozen eggs", "large eggs", "lg eggs", "eggs 12ct"], fridgeDays: 35, defaultStorage: "fridge" },
  { id: "butter", name: "Butter", emoji: "🧈", category: "dairy", aliases: ["butter", "salted butter", "unsalted butter", "bttr", "btr"], fridgeDays: 60, freezerDays: 270, defaultStorage: "fridge", staple: true },
  { id: "cheddar", name: "Cheddar cheese", emoji: "🧀", category: "dairy", aliases: ["cheddar", "cheese", "block cheese", "sharp cheddar", "chdr", "cheddr", "monterey jack", "colby jack", "jack cheese", "shredded cheese", "mexican blend", "shrd chs", "chs"], fridgeDays: 180, openedFridgeDays: 28, freezerDays: 180, defaultStorage: "fridge" },
  { id: "mozzarella", name: "Fresh mozzarella", emoji: "🧀", category: "dairy", aliases: ["mozzarella", "fresh mozzarella", "mozz", "burrata"], fridgeDays: 7, openedFridgeDays: 5, defaultStorage: "fridge" },
  { id: "parmesan", name: "Parmesan", emoji: "🧀", category: "dairy", aliases: ["parmesan", "parm", "parmigiano", "pecorino", "grated parmesan"], fridgeDays: 180, openedFridgeDays: 45, defaultStorage: "fridge" },
  { id: "yogurt", name: "Yogurt", emoji: "🥣", category: "dairy", aliases: ["yogurt", "greek yogurt", "yoghurt", "ygrt", "grk ygrt", "chobani", "fage", "skyr"], fridgeDays: 14, freezerDays: 60, defaultStorage: "fridge" },
  { id: "cream_cheese", name: "Cream cheese", emoji: "🧀", category: "dairy", aliases: ["cream cheese", "crm chs", "philadelphia"], fridgeDays: 30, openedFridgeDays: 14, defaultStorage: "fridge" },
  { id: "sour_cream", name: "Sour cream", emoji: "🥣", category: "dairy", aliases: ["sour cream", "sr crm", "crema"], fridgeDays: 21, openedFridgeDays: 14, defaultStorage: "fridge" },
  { id: "heavy_cream", name: "Heavy cream", emoji: "🥛", category: "dairy", aliases: ["heavy cream", "whipping cream", "half and half", "hvy crm", "half & half"], fridgeDays: 10, openedFridgeDays: 7, freezerDays: 120, defaultStorage: "fridge" },

  // ---- Meat & seafood ------------------------------------------------------
  { id: "chicken_breast", name: "Chicken breast", emoji: "🐔", category: "meat", aliases: ["chicken breast", "chicken", "chkn brst", "chkn", "bnls sknls chkn", "boneless skinless chicken", "chicken breasts", "ckn brst"], fridgeDays: 2, freezerDays: 270, defaultStorage: "fridge" },
  { id: "chicken_thighs", name: "Chicken thighs", emoji: "🍗", category: "meat", aliases: ["chicken thighs", "chicken thigh", "chkn thgh", "drumsticks", "chicken legs", "chkn thighs"], fridgeDays: 2, freezerDays: 270, defaultStorage: "fridge" },
  { id: "ground_beef", name: "Ground beef", emoji: "🥩", category: "meat", aliases: ["ground beef", "grnd beef", "gb 80/20", "ground chuck", "hamburger", "ground turkey", "grnd trky", "ground meat", "grd bf"], fridgeDays: 2, freezerDays: 120, defaultStorage: "fridge" },
  { id: "steak", name: "Steak", emoji: "🥩", category: "meat", aliases: ["steak", "ribeye", "sirloin", "ny strip", "strip steak", "flank steak", "stk", "beef steak"], fridgeDays: 4, freezerDays: 240, defaultStorage: "fridge" },
  { id: "pork_chops", name: "Pork chops", emoji: "🍖", category: "meat", aliases: ["pork chops", "pork chop", "prk chps", "pork loin", "pork tenderloin", "prk"], fridgeDays: 4, freezerDays: 150, defaultStorage: "fridge" },
  { id: "bacon", name: "Bacon", emoji: "🥓", category: "meat", aliases: ["bacon", "bcn", "thick cut bacon", "turkey bacon"], fridgeDays: 14, openedFridgeDays: 7, freezerDays: 30, defaultStorage: "fridge" },
  { id: "sausage", name: "Sausage", emoji: "🌭", category: "meat", aliases: ["sausage", "italian sausage", "bratwurst", "brats", "chorizo", "ssg", "sausages", "kielbasa"], fridgeDays: 2, freezerDays: 60, defaultStorage: "fridge" },
  { id: "deli_turkey", name: "Deli turkey", emoji: "🥪", category: "deli", aliases: ["deli turkey", "sliced turkey", "deli ham", "sliced ham", "lunch meat", "deli meat", "trky brst sliced", "cold cuts", "deli trky"], fridgeDays: 14, openedFridgeDays: 5, freezerDays: 60, defaultStorage: "fridge" },
  { id: "salmon", name: "Salmon", emoji: "🐟", category: "seafood", aliases: ["salmon", "salmon fillet", "atlantic salmon", "slmn", "slmn flt", "cod", "tilapia", "fish fillet"], fridgeDays: 2, freezerDays: 90, defaultStorage: "fridge" },
  { id: "shrimp", name: "Shrimp", emoji: "🦐", category: "seafood", aliases: ["shrimp", "prawns", "shrmp", "raw shrimp"], fridgeDays: 2, freezerDays: 180, defaultStorage: "fridge" },
  { id: "tofu", name: "Tofu", emoji: "🧊", category: "deli", aliases: ["tofu", "firm tofu", "extra firm tofu", "tf"], fridgeDays: 30, openedFridgeDays: 4, freezerDays: 150, defaultStorage: "fridge" },

  // ---- Bakery --------------------------------------------------------------
  { id: "bread", name: "Bread", emoji: "🍞", category: "bakery", aliases: ["bread", "sourdough", "loaf", "sandwich bread", "whole wheat bread", "brd", "wht brd", "baguette"], pantryDays: 5, fridgeDays: 14, freezerDays: 90, defaultStorage: "pantry" },
  { id: "tortillas", name: "Tortillas", emoji: "🫓", category: "bakery", aliases: ["tortillas", "tortilla", "flour tortillas", "corn tortillas", "trtlla", "wraps", "trtl"], pantryDays: 7, fridgeDays: 30, freezerDays: 180, defaultStorage: "pantry" },
  { id: "bagels", name: "Bagels", emoji: "🥯", category: "bakery", aliases: ["bagels", "bagel", "english muffins", "buns", "rolls", "bgls"], pantryDays: 5, fridgeDays: 7, freezerDays: 90, defaultStorage: "pantry" },

  // ---- Deli / prepared -----------------------------------------------------
  { id: "hummus", name: "Hummus", emoji: "🥣", category: "deli", aliases: ["hummus", "hmms", "sabra"], fridgeDays: 30, openedFridgeDays: 7, defaultStorage: "fridge" },
  { id: "salsa", name: "Fresh salsa", emoji: "🥣", category: "deli", aliases: ["salsa", "pico", "pico de gallo", "fresh salsa"], fridgeDays: 7, openedFridgeDays: 7, defaultStorage: "fridge" },
  { id: "guacamole", name: "Guacamole", emoji: "🥑", category: "deli", aliases: ["guacamole", "guac"], fridgeDays: 2, defaultStorage: "fridge" },
  { id: "fresh_pasta", name: "Fresh pasta", emoji: "🍝", category: "deli", aliases: ["fresh pasta", "ravioli", "tortellini", "gnocchi", "fresh ravioli"], fridgeDays: 3, freezerDays: 60, defaultStorage: "fridge" },
  { id: "orange_juice", name: "Orange juice", emoji: "🧃", category: "beverage", aliases: ["orange juice", "oj", "juice", "orng jce", "tropicana", "simply orange"], fridgeDays: 14, openedFridgeDays: 7, defaultStorage: "fridge" },

  // ---- Frozen --------------------------------------------------------------
  { id: "frozen_peas", name: "Frozen peas", emoji: "🫛", category: "frozen", aliases: ["frozen peas", "frz peas", "frozen vegetables", "frozen veg", "frz veg", "frozen corn"], freezerDays: 240, defaultStorage: "freezer" },
  { id: "frozen_berries", name: "Frozen berries", emoji: "🫐", category: "frozen", aliases: ["frozen berries", "frz berries", "frozen fruit", "frz fruit"], freezerDays: 240, defaultStorage: "freezer" },
  { id: "ice_cream", name: "Ice cream", emoji: "🍨", category: "frozen", aliases: ["ice cream", "gelato", "ice crm", "ben & jerry", "haagen"], freezerDays: 90, defaultStorage: "freezer" },
  { id: "frozen_pizza", name: "Frozen pizza", emoji: "🍕", category: "frozen", aliases: ["frozen pizza", "frz pizza", "pizza"], freezerDays: 90, defaultStorage: "freezer" },

  // ---- Pantry staples (long-life, treated as "free" to a plan) -------------
  { id: "rice", name: "Rice", emoji: "🍚", category: "pantry", aliases: ["rice", "jasmine rice", "basmati", "brown rice", "white rice", "rce"], pantryDays: 730, defaultStorage: "pantry", staple: true },
  { id: "pasta", name: "Pasta", emoji: "🍝", category: "pantry", aliases: ["pasta", "spaghetti", "penne", "rigatoni", "linguine", "macaroni", "fusilli", "psta"], pantryDays: 730, defaultStorage: "pantry", staple: true },
  { id: "olive_oil", name: "Olive oil", emoji: "🫒", category: "pantry", aliases: ["olive oil", "evoo", "oil", "vegetable oil", "canola oil", "olv oil"], pantryDays: 365, defaultStorage: "pantry", staple: true },
  { id: "canned_beans", name: "Canned beans", emoji: "🥫", category: "pantry", aliases: ["black beans", "canned beans", "chickpeas", "kidney beans", "garbanzo", "pinto beans", "beans", "blk bns"], pantryDays: 730, defaultStorage: "pantry", staple: true },
  { id: "canned_tomatoes", name: "Canned tomatoes", emoji: "🥫", category: "pantry", aliases: ["canned tomatoes", "crushed tomatoes", "diced tomatoes", "tomato sauce", "marinara", "pasta sauce", "passata", "tmto sce"], pantryDays: 540, defaultStorage: "pantry", staple: true },
  { id: "oats", name: "Oats", emoji: "🌾", category: "pantry", aliases: ["oats", "oatmeal", "rolled oats", "granola"], pantryDays: 365, defaultStorage: "pantry", staple: true },
  { id: "flour", name: "Flour", emoji: "🌾", category: "pantry", aliases: ["flour", "all purpose flour", "ap flour", "flr"], pantryDays: 240, defaultStorage: "pantry", staple: true },
  { id: "sugar", name: "Sugar", emoji: "🍬", category: "pantry", aliases: ["sugar", "brown sugar", "sgr"], pantryDays: 730, defaultStorage: "pantry", staple: true },
  { id: "peanut_butter", name: "Peanut butter", emoji: "🥜", category: "pantry", aliases: ["peanut butter", "pb", "almond butter", "pnt bttr", "jif", "skippy"], pantryDays: 180, defaultStorage: "pantry", staple: true },
  { id: "cereal", name: "Cereal", emoji: "🥣", category: "pantry", aliases: ["cereal", "cheerios", "granola bars", "crl"], pantryDays: 180, defaultStorage: "pantry", staple: true },
  { id: "coffee", name: "Coffee", emoji: "☕", category: "pantry", aliases: ["coffee", "ground coffee", "coffee beans", "k-cups", "cff"], pantryDays: 180, defaultStorage: "pantry", staple: true },
  { id: "chips", name: "Chips", emoji: "🍿", category: "pantry", aliases: ["chips", "tortilla chips", "potato chips", "pretzels", "crackers", "popcorn", "snacks", "chps"], pantryDays: 60, defaultStorage: "pantry", staple: true },
  { id: "soy_sauce", name: "Soy sauce", emoji: "🍶", category: "pantry", aliases: ["soy sauce", "soy", "tamari", "hot sauce", "sriracha", "ketchup", "mustard", "mayo", "mayonnaise", "condiments"], pantryDays: 365, defaultStorage: "pantry", staple: true },
  { id: "stock", name: "Chicken stock", emoji: "🥫", category: "pantry", aliases: ["stock", "broth", "chicken stock", "chicken broth", "vegetable broth", "bouillon", "chkn brth"], pantryDays: 365, defaultStorage: "pantry", staple: true },
  { id: "spices", name: "Spices", emoji: "🧂", category: "pantry", aliases: ["salt", "pepper", "spices", "cumin", "paprika", "chili powder", "taco seasoning", "italian seasoning", "seasoning", "oregano", "cinnamon"], pantryDays: 730, defaultStorage: "pantry", staple: true },
  { id: "quinoa", name: "Quinoa", emoji: "🌾", category: "pantry", aliases: ["quinoa", "couscous", "farro", "lentils", "qnoa"], pantryDays: 365, defaultStorage: "pantry", staple: true },
  { id: "honey", name: "Honey", emoji: "🍯", category: "pantry", aliases: ["honey", "maple syrup", "syrup", "jam", "jelly", "preserves"], pantryDays: 730, defaultStorage: "pantry", staple: true },
  { id: "coconut_milk", name: "Coconut milk", emoji: "🥥", category: "pantry", aliases: ["coconut milk", "curry paste", "ccnut mlk"], pantryDays: 730, defaultStorage: "pantry", staple: true },
  { id: "sparkling_water", name: "Sparkling water", emoji: "🫧", category: "beverage", aliases: ["sparkling water", "seltzer", "la croix", "lacroix", "soda", "cola", "water", "topo chico", "sprkl wtr"], pantryDays: 365, defaultStorage: "pantry", staple: true },
];

export const FOOD_BY_ID: Record<string, FoodEntry> = Object.fromEntries(
  FOODKEEPER.map((f) => [f.id, f]),
);

/** Fallback shelf lives when a line can only be classified to a category. */
export const CATEGORY_DEFAULTS: Record<
  Category,
  { emoji: string; pantryDays?: number; fridgeDays?: number; freezerDays?: number; defaultStorage: Storage }
> = {
  produce: { emoji: "🥗", fridgeDays: 7, freezerDays: 240, defaultStorage: "fridge" },
  dairy: { emoji: "🥛", fridgeDays: 10, freezerDays: 90, defaultStorage: "fridge" },
  eggs: { emoji: "🥚", fridgeDays: 35, defaultStorage: "fridge" },
  meat: { emoji: "🥩", fridgeDays: 2, freezerDays: 180, defaultStorage: "fridge" },
  seafood: { emoji: "🐟", fridgeDays: 2, freezerDays: 90, defaultStorage: "fridge" },
  bakery: { emoji: "🍞", pantryDays: 5, fridgeDays: 14, freezerDays: 90, defaultStorage: "pantry" },
  deli: { emoji: "🥪", fridgeDays: 5, freezerDays: 60, defaultStorage: "fridge" },
  beverage: { emoji: "🧃", pantryDays: 180, fridgeDays: 7, defaultStorage: "fridge" },
  frozen: { emoji: "🧊", freezerDays: 180, defaultStorage: "freezer" },
  pantry: { emoji: "🥫", pantryDays: 365, defaultStorage: "pantry" },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  produce: "Produce",
  dairy: "Dairy",
  eggs: "Eggs",
  meat: "Meat",
  seafood: "Seafood",
  bakery: "Bakery",
  deli: "Deli",
  beverage: "Drinks",
  frozen: "Frozen",
  pantry: "Pantry",
};

/** Things every kitchen is assumed to have; recipes can lean on them for free. */
export const KITCHEN_STAPLES = [
  "salt",
  "black pepper",
  "olive oil",
  "garlic",
  "butter",
  "rice",
  "pasta",
  "flour",
  "sugar",
  "soy sauce",
  "vinegar",
  "canned tomatoes",
  "chicken stock",
  "dried spices",
  "honey",
];

export function shelfLifeDays(
  entry: Pick<FoodEntry, "pantryDays" | "fridgeDays" | "freezerDays" | "openedFridgeDays"> | undefined,
  storage: Storage,
  opened: boolean,
  category?: Category,
): number | undefined {
  const fallback = category ? CATEGORY_DEFAULTS[category] : undefined;
  if (storage === "freezer") return entry?.freezerDays ?? fallback?.freezerDays;
  if (storage === "fridge") {
    if (opened && entry?.openedFridgeDays) return entry.openedFridgeDays;
    return entry?.fridgeDays ?? fallback?.fridgeDays ?? entry?.pantryDays ?? fallback?.pantryDays;
  }
  return entry?.pantryDays ?? fallback?.pantryDays ?? entry?.fridgeDays ?? fallback?.fridgeDays;
}

export function storageOptions(entry: FoodEntry | undefined, category: Category): Storage[] {
  const opts: Storage[] = [];
  const fallback = CATEGORY_DEFAULTS[category];
  if (entry?.pantryDays ?? fallback.pantryDays) opts.push("pantry");
  if (entry?.fridgeDays ?? fallback.fridgeDays) opts.push("fridge");
  if (entry?.freezerDays ?? fallback.freezerDays) opts.push("freezer");
  return opts;
}
