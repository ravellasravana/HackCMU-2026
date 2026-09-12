// n8n Code node — "Parse K2 JSON"
// Mode: Run Once for Each Item
// Takes the chat-completions response and returns the parsed JSON object the model produced.

const res = $input.item.json;
const content = (((res.choices || [])[0] || {}).message || {}).content || '';
const cleaned = content.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
let parsed;
try { parsed = JSON.parse(cleaned); } catch (e) { throw new Error('K2 did not return valid JSON: ' + cleaned.slice(0, 200)); }
return { json: parsed };
