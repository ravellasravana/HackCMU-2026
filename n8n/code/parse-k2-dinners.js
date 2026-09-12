// n8n Code node — "Parse K2 dinners"
// Mode: Run Once for All Items
// Combines the K2 dinners response with the dated inventory from "Build K2 dinners request".

const res = $input.first().json;
const content = (((res.choices || [])[0] || {}).message || {}).content || '';
const cleaned = content.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
let parsed = { dinners: [] };
try { parsed = JSON.parse(cleaned); } catch (e) { /* scheduler falls back to freeze-or-eat decisions only */ }

const upstream = $('Build K2 dinners request').first().json;
return [{ json: { today: upstream.today, retailer: upstream.retailer, items: upstream.items, dinners: parsed.dinners || [] } }];
