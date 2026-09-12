// n8n Code node — "Prepare receipt text"
// Mode: Run Once for Each Item
// Input: Gmail Trigger item (text / html / snippet / subject / from)
// Output: { subject, from, receiptText, receivedAt }

const m = $input.item.json;
let text = m.text || '';
if (!text && m.html) {
  text = m.html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#?\w+;/g, ' ');
}
text = text
  .split(/\r?\n/)
  .map((l) => l.replace(/[ \t]+/g, ' ').trim())
  .filter(Boolean)
  .join('\n')
  .slice(0, 12000);

return { json: { subject: m.subject || '', from: (m.from && m.from.value ? m.from.value[0].address : m.from) || '', receiptText: text, receivedAt: m.date || new Date().toISOString() } };
