/**
 * storage.js — localStorage read/write layer
 * Each garment is stored as a JSON record with a UUID primary key.
 */

const Storage = (() => {
  const KEY = 'wardrobe_items';
  const WARN_BYTES = 4 * 1024 * 1024; // 4 MB

  function getAll() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveAll(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function add(item) {
    const items = getAll();
    items.unshift(item); // newest first
    saveAll(items);
    return items;
  }

  function update(id, patch) {
    const items = getAll().map(i => i.id === id ? { ...i, ...patch } : i);
    saveAll(items);
    return items;
  }

  function remove(id) {
    const items = getAll().filter(i => i.id !== id);
    saveAll(items);
    return items;
  }

  function getById(id) {
    return getAll().find(i => i.id === id) || null;
  }

  function usageBytes() {
    const raw = localStorage.getItem(KEY) || '';
    // Approximate: each char ~2 bytes in UTF-16
    return raw.length * 2;
  }

  function usageInfo() {
    const bytes = usageBytes();
    const kb = bytes / 1024;
    const pct = Math.min((bytes / (5 * 1024 * 1024)) * 100, 100);
    const warn = bytes >= WARN_BYTES;
    return { bytes, kb, pct, warn };
  }

  function exportCSV() {
    const items = getAll();
    if (!items.length) return null;

    const headers = [
      'id', 'garment_type', 'primary_color', 'secondary_color',
      'fit', 'material', 'pattern', 'occasion', 'sleeve_length',
      'notes', 'confidence_score', 'created_at'
    ];

    const escape = v => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const rows = [headers.join(',')];
    for (const item of items) {
      rows.push(headers.map(h => escape(item[h])).join(','));
    }
    return rows.join('\r\n');
  }

  return { getAll, add, update, remove, getById, usageInfo, exportCSV };
})();
