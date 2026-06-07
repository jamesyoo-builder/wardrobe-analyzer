/**
 * table.js — Wardrobe table rendering, sorting, filtering, and pagination
 */

const Table = (() => {
  const PAGE_SIZE = 20;
  let currentPage = 1;
  let sortCol = 'created_at';
  let sortDir = 'desc';
  let filters = { type: '', color: '', fit: '' };

  const tbody = document.getElementById('wardrobe-tbody');
  const emptyState = document.getElementById('empty-state');
  const itemCount = document.getElementById('item-count');
  const pagination = document.getElementById('pagination');
  const storageWarning = document.getElementById('storage-warning');
  const storageFill = document.getElementById('storage-fill');
  const storageText = document.getElementById('storage-text');

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function confidenceBadge(score) {
    if (score === null || score === undefined) return '<span class="badge badge-amber">N/A</span>';
    const pct = Math.round(score * 100);
    const cls = score >= 0.8 ? 'badge-green' : score >= 0.6 ? 'badge-amber' : 'badge-red';
    return `<span class="badge ${cls}" title="AI confidence">${pct}%</span>`;
  }

  function thumbHtml(item) {
    if (item.image_data) {
      return `<img class="garment-thumb" src="${item.image_data}" alt="Thumbnail of ${item.garment_type || 'garment'}" loading="lazy" />`;
    }
    return `<div class="thumb-placeholder" aria-hidden="true">👔</div>`;
  }

  function applyFilters(items) {
    return items.filter(item => {
      if (filters.type && item.garment_type !== filters.type) return false;
      if (filters.color && item.primary_color && !item.primary_color.toLowerCase().includes(filters.color.toLowerCase())) return false;
      if (filters.fit && item.fit !== filters.fit) return false;
      return true;
    });
  }

  function applySort(items) {
    return [...items].sort((a, b) => {
      let va = a[sortCol] || '';
      let vb = b[sortCol] || '';
      if (sortCol === 'created_at') {
        va = new Date(va).getTime() || 0;
        vb = new Date(vb).getTime() || 0;
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function render(items) {
    // Update sort header indicators
    document.querySelectorAll('.wardrobe-table th.sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      th.setAttribute('aria-sort', 'none');
      if (th.dataset.col === sortCol) {
        th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
      }
    });

    const filtered = applyFilters(items);
    const sorted = applySort(filtered);

    // Update color filter options dynamically
    updateColorFilter(items);

    // Item count
    const total = filtered.length;
    itemCount.textContent = `${total} item${total !== 1 ? 's' : ''} in your wardrobe`;

    // Pagination
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = sorted.slice(start, start + PAGE_SIZE);

    // Empty state
    if (total === 0) {
      tbody.innerHTML = '';
      emptyState.classList.add('visible');
    } else {
      emptyState.classList.remove('visible');
      tbody.innerHTML = pageItems.map(item => `
        <tr data-id="${item.id}">
          <td>${thumbHtml(item)}</td>
          <td title="${item.garment_type || ''}">${item.garment_type || '—'}</td>
          <td title="${item.primary_color || ''}">${item.primary_color || '—'}</td>
          <td>${item.fit || '—'}</td>
          <td title="${item.material || ''}">${item.material || '—'}</td>
          <td>${item.pattern || '—'}</td>
          <td>${item.occasion || '—'}</td>
          <td title="${item.notes || ''}">${item.notes ? item.notes.substring(0, 30) + (item.notes.length > 30 ? '…' : '') : '—'}</td>
          <td>${formatDate(item.created_at)}</td>
          <td>${confidenceBadge(item.confidence_score)}</td>
          <td>
            <div class="row-actions">
              <button class="btn-table btn-table-edit" data-id="${item.id}" aria-label="Edit ${item.garment_type || 'item'}">✏️</button>
              <button class="btn-table btn-table-delete" data-id="${item.id}" aria-label="Delete ${item.garment_type || 'item'}">🗑️</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Render pagination
    renderPagination(totalPages);

    // Storage usage
    updateStorageBar();
  }

  function updateColorFilter(items) {
    const colorSelect = document.getElementById('filter-color');
    const current = colorSelect.value;
    const colors = [...new Set(items.map(i => i.primary_color).filter(Boolean))].sort();
    const opts = ['<option value="">All Colors</option>'];
    colors.forEach(c => opts.push(`<option value="${c}"${c === current ? ' selected' : ''}>${c}</option>`));
    colorSelect.innerHTML = opts.join('');
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }
    const btns = [];
    for (let i = 1; i <= totalPages; i++) {
      btns.push(`<button class="page-btn${i === currentPage ? ' active' : ''}" data-page="${i}" aria-label="Page ${i}"${i === currentPage ? ' aria-current="page"' : ''}>${i}</button>`);
    }
    pagination.innerHTML = btns.join('');
  }

  function updateStorageBar() {
    const info = Storage.usageInfo();
    storageWarning.hidden = false;
    storageText.textContent = `${Math.round(info.kb)} KB used`;
    storageFill.style.width = `${info.pct}%`;
    storageFill.className = 'storage-fill' + (info.warn ? ' warn' : '') + (info.pct > 90 ? ' danger' : '');
    if (info.warn) {
      storageText.title = 'Warning: approaching localStorage limit';
    }
  }

  function setSort(col) {
    if (sortCol === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = col;
      sortDir = 'asc';
    }
    currentPage = 1;
    render(Storage.getAll());
  }

  function setFilter(key, value) {
    filters[key] = value;
    currentPage = 1;
    render(Storage.getAll());
  }

  function setPage(p) {
    currentPage = p;
    render(Storage.getAll());
  }

  function refresh() {
    render(Storage.getAll());
  }

  // Bind sort headers
  document.querySelectorAll('.wardrobe-table th.sortable').forEach(th => {
    th.addEventListener('click', () => setSort(th.dataset.col));
    th.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSort(th.dataset.col); }
    });
  });

  // Bind filter dropdowns
  document.getElementById('filter-type').addEventListener('change', e => setFilter('type', e.target.value));
  document.getElementById('filter-color').addEventListener('change', e => setFilter('color', e.target.value));
  document.getElementById('filter-fit').addEventListener('change', e => setFilter('fit', e.target.value));
  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-color').value = '';
    document.getElementById('filter-fit').value = '';
    filters = { type: '', color: '', fit: '' };
    currentPage = 1;
    render(Storage.getAll());
  });

  // Bind pagination (event delegation)
  pagination.addEventListener('click', e => {
    const btn = e.target.closest('.page-btn');
    if (btn) setPage(parseInt(btn.dataset.page, 10));
  });

  return { render, refresh, setSort, setFilter, setPage };
})();
