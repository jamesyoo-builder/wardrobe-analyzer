/**
 * app.js — Core application logic
 */

(async () => {
  // ─── State ───────────────────────────────────────────────────────────────
  let capturedImage = null;
  let editingId = null;

  // ─── Element refs ─────────────────────────────────────────────────────────
  const captureControls     = document.getElementById('capture-controls');
  const postCaptureControls = document.getElementById('post-capture-controls');
  const btnCapture          = document.getElementById('btn-capture');
  const btnAnalyze          = document.getElementById('btn-analyze');
  const btnRetake           = document.getElementById('btn-retake');
  const fileUpload          = document.getElementById('file-upload');
  const formCard            = document.getElementById('form-card');
  const attributeForm       = document.getElementById('attribute-form');
  const btnSave             = document.getElementById('btn-save');
  const btnDiscard          = document.getElementById('btn-discard');
  const analyzingOverlay    = document.getElementById('analyzing-overlay');
  const errorBanner         = document.getElementById('error-banner');
  const errorText           = document.getElementById('error-text');
  const btnRetry            = document.getElementById('btn-retry');
  const btnSettings         = document.getElementById('btn-settings');
  const settingsModal       = document.getElementById('settings-modal');
  const btnCloseSettings    = document.getElementById('btn-close-settings');
  const btnSaveSettings     = document.getElementById('btn-save-settings');
  const btnCancelSettings   = document.getElementById('btn-cancel-settings');
  const btnTestConnection   = document.getElementById('btn-test-connection');
  const connectionStatus    = document.getElementById('connection-status');
  const btnExport           = document.getElementById('btn-export');
  const deleteModal         = document.getElementById('delete-modal');
  const btnConfirmDelete    = document.getElementById('btn-confirm-delete');
  const btnCancelDelete     = document.getElementById('btn-cancel-delete');
  const wardrobeTable       = document.getElementById('wardrobe-table');

  // ─── Init ─────────────────────────────────────────────────────────────────
  await Camera.init();
  Table.refresh();
  loadSettingsToModal();

  // ─── Camera / Capture ─────────────────────────────────────────────────────
  btnCapture.addEventListener('click', () => {
    capturedImage = Camera.capture();
    showPostCapture();
  });

  btnRetake.addEventListener('click', () => {
    capturedImage = null;
    Camera.retake();
    showCapture();
    hideError();
    formCard.hidden = true;
    editingId = null;
  });

  // ─── File Upload ──────────────────────────────────────────────────────────
  fileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError('File is too large. Maximum size is 10 MB.');
      fileUpload.value = '';
      return;
    }

    try {
      capturedImage = await Camera.fileToBase64(file);
      Camera.setPreviewFromFile(capturedImage);
      showPostCapture();
      hideError();
    } catch (err) {
      showError('Failed to process image: ' + err.message);
    }
    fileUpload.value = '';
  });

  // ─── Analyze ──────────────────────────────────────────────────────────────
  btnAnalyze.addEventListener('click', runAnalysis);
  btnRetry.addEventListener('click', runAnalysis);

  async function runAnalysis() {
    if (!capturedImage) { showError('No image to analyze. Capture or upload one first.'); return; }
    hideError();
    setAnalyzing(true);

    try {
      const attrs = await API.analyze(capturedImage);
      setAnalyzing(false);
      populateForm(attrs);
      formCard.hidden = false;
      formCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      setAnalyzing(false);
      showError(err.message);
    }
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  function populateForm(attrs) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };
    setVal('f-type',            attrs.garment_type);
    setVal('f-primary-color',   attrs.primary_color);
    setVal('f-secondary-color', attrs.secondary_color);
    setVal('f-fit',             attrs.fit);
    setVal('f-material',        attrs.material);
    setVal('f-pattern',         attrs.pattern);
    setVal('f-occasion',        attrs.occasion);
    setVal('f-sleeve',          attrs.sleeve_length);
    setVal('f-notes',           attrs.notes);
    attributeForm.dataset.confidence = attrs.confidence_score !== null && attrs.confidence_score !== undefined
      ? attrs.confidence_score : '';
  }

  attributeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const fd = new FormData(attributeForm);
    const record = {
      id: editingId || crypto.randomUUID(),
      garment_type:     fd.get('garment_type') || null,
      primary_color:    fd.get('primary_color') || null,
      secondary_color:  fd.get('secondary_color') || null,
      fit:              fd.get('fit') || null,
      material:         fd.get('material') || null,
      pattern:          fd.get('pattern') || null,
      occasion:         fd.get('occasion') || null,
      sleeve_length:    fd.get('sleeve_length') || null,
      notes:            fd.get('notes') || null,
      image_data:       capturedImage || null,
      confidence_score: attributeForm.dataset.confidence !== ''
        ? parseFloat(attributeForm.dataset.confidence) : null,
      created_at: editingId
        ? (Storage.getById(editingId)?.created_at || new Date().toISOString())
        : new Date().toISOString()
    };

    if (editingId) {
      Storage.update(editingId, record);
      showToast('Item updated ✓');
    } else {
      Storage.add(record);
      showToast('Saved to wardrobe ✓');
    }

    Table.refresh();
    resetCapture();
  });

  btnDiscard.addEventListener('click', () => {
    resetCapture();
  });

  function validateForm() {
    let ok = true;
    const typeEl  = document.getElementById('f-type');
    const colorEl = document.getElementById('f-primary-color');
    const errType  = document.getElementById('err-type');
    const errColor = document.getElementById('err-primary-color');

    errType.textContent  = '';
    errColor.textContent = '';

    if (!typeEl.value) {
      errType.textContent = 'Garment type is required.';
      typeEl.focus();
      ok = false;
    }
    if (!colorEl.value.trim()) {
      errColor.textContent = 'Primary color is required.';
      if (ok) colorEl.focus();
      ok = false;
    }
    return ok;
  }

  function resetCapture() {
    capturedImage = null;
    editingId = null;
    Camera.retake();
    showCapture();
    formCard.hidden = true;
    attributeForm.reset();
    attributeForm.dataset.confidence = '';
    document.getElementById('err-type').textContent = '';
    document.getElementById('err-primary-color').textContent = '';
    hideError();
  }

  // ─── Table actions (edit / delete) via event delegation ──────────────────
  let pendingDeleteId = null;

  wardrobeTable.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-table-edit');
    const delBtn  = e.target.closest('.btn-table-delete');

    if (editBtn) {
      const id = editBtn.dataset.id;
      const item = Storage.getById(id);
      if (!item) return;
      editingId = id;
      capturedImage = item.image_data || null;
      if (capturedImage) Camera.setPreviewFromFile(capturedImage);
      populateForm(item);
      formCard.hidden = false;
      showPostCapture();
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (delBtn) {
      pendingDeleteId = delBtn.dataset.id;
      deleteModal.hidden = false;
      btnConfirmDelete.focus();
    }
  });

  btnConfirmDelete.addEventListener('click', () => {
    if (pendingDeleteId) {
      Storage.remove(pendingDeleteId);
      Table.refresh();
      showToast('Item deleted.');
    }
    pendingDeleteId = null;
    deleteModal.hidden = true;
  });

  btnCancelDelete.addEventListener('click', () => {
    pendingDeleteId = null;
    deleteModal.hidden = true;
  });

  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) { pendingDeleteId = null; deleteModal.hidden = true; }
  });

  // ─── Export CSV ───────────────────────────────────────────────────────────
  btnExport.addEventListener('click', () => {
    const csv = Storage.exportCSV();
    if (!csv) { showToast('No items to export.'); return; }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wardrobe-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported ✓');
  });

  // ─── Settings Modal ───────────────────────────────────────────────────────
  btnSettings.addEventListener('click', () => {
    loadSettingsToModal();
    settingsModal.hidden = false;
    document.getElementById('s-endpoint').focus();
  });

  [btnCloseSettings, btnCancelSettings].forEach(btn => {
    btn.addEventListener('click', () => { settingsModal.hidden = true; });
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.hidden = true;
  });

  btnSaveSettings.addEventListener('click', () => {
    API.saveSettings({
      endpoint:    document.getElementById('s-endpoint').value.trim() || '/api',
      apiKey:      document.getElementById('s-apikey').value,
      model:       document.getElementById('s-model').value.trim() || 'gpt-4o',
      maxTokens:   document.getElementById('s-tokens').value || 512,
      temperature: document.getElementById('s-temp').value !== '' ? document.getElementById('s-temp').value : 0.1
    });
    settingsModal.hidden = true;
    showToast('Settings saved ✓');
  });

  btnTestConnection.addEventListener('click', async () => {
    connectionStatus.textContent = 'Testing…';
    connectionStatus.className = 'connection-status';
    try {
      await API.testConnection();
      connectionStatus.textContent = '✓ Connected';
      connectionStatus.className = 'connection-status ok';
    } catch (err) {
      connectionStatus.textContent = '✗ ' + err.message;
      connectionStatus.className = 'connection-status fail';
    }
  });

  function loadSettingsToModal() {
    const s = API.getSettings();
    document.getElementById('s-endpoint').value = s.endpoint === '/api' ? '' : s.endpoint;
    document.getElementById('s-apikey').value   = s.apiKey;
    document.getElementById('s-model').value    = s.model;
    document.getElementById('s-tokens').value   = s.maxTokens;
    document.getElementById('s-temp').value     = s.temperature;
    connectionStatus.textContent = '';
    connectionStatus.className = 'connection-status';
  }

  // ─── Keyboard: Escape closes modals ──────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!settingsModal.hidden) settingsModal.hidden = true;
      if (!deleteModal.hidden) { pendingDeleteId = null; deleteModal.hidden = true; }
    }
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function showCapture() {
    captureControls.hidden = false;
    postCaptureControls.hidden = true;
  }

  function showPostCapture() {
    captureControls.hidden = true;
    postCaptureControls.hidden = false;
  }

  function setAnalyzing(on) {
    analyzingOverlay.hidden = !on;
    btnAnalyze.disabled = on;
    btnRetake.disabled = on;
  }

  function showError(msg) {
    errorText.textContent = msg;
    errorBanner.hidden = false;
  }

  function hideError() {
    errorBanner.hidden = true;
    errorText.textContent = '';
  }

  let toastTimer;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 2500);
  }
})();
