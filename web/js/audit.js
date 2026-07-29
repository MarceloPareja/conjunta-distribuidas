import { AUDIT_API } from './config.js';

(function () {
  'use strict';

  var state = {
    page: 1,
    pageSize: 15,
    entity: '',
    action: '',
    user: '',
    totalPages: 1,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function formatDate(dStr) {
    if (!dStr) return '-';
    var d = new Date(dStr);
    return d.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  async function fetchLogs() {
    var listEl = $('auditList');
    listEl.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)">Cargando eventos de auditoría…</td></tr>';

    var params = new URLSearchParams({
      page: state.page,
      pageSize: state.pageSize,
    });

    if (state.entity) params.set('entity', state.entity);
    if (state.action) params.set('action', state.action);
    if (state.user) params.set('user', state.user);

    try {
      var res = await fetch(AUDIT_API + '/audit-logs?' + params.toString());
      if (!res.ok) throw new Error('Error al conectar con la API de auditoría (' + res.status + ')');
      var data = await res.json();

      state.totalPages = data.meta.totalPages || 1;
      renderTable(data.items || []);
      renderPagination(data.meta);
    } catch (err) {
      listEl.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#C5221F">⚠️ Error cargando auditoría: ' + esc(err.message) + '<br><small style="color:var(--muted)">Asegúrate de que el microservicio en http://localhost:3002 esté iniciado.</small></td></tr>';
      $('btnPrev').disabled = true;
      $('btnNext').disabled = true;
    }
  }

  function renderTable(items) {
    var listEl = $('auditList');
    if (!items || !items.length) {
      listEl.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)">No se encontraron registros de auditoría.</td></tr>';
      return;
    }

    var html = items.map(function (log) {
      var dataStr = log.data ? JSON.stringify(log.data, null, 2) : '{}';
      var userDisplay = esc(log.userEmail || log.userId || 'Sistema / Anónimo');

      return '<tr>' +
        '<td><strong style="color:var(--ink)">' + formatDate(log.timestamp) + '</strong></td>' +
        '<td><span class="badge badge-entity">' + esc(log.entity) + '</span></td>' +
        '<td><span class="badge badge-action ' + esc(log.action) + '">' + esc(log.action) + '</span></td>' +
        '<td>' + userDisplay + '</td>' +
        '<td><pre class="json-data">' + esc(dataStr) + '</pre></td>' +
      '</tr>';
    }).join('');

    listEl.innerHTML = html;
  }

  function renderPagination(meta) {
    $('pageInfo').textContent = 'Página ' + (meta.page || 1) + ' de ' + (meta.totalPages || 1) + ' (' + (meta.total || 0) + ' registros)';
    $('btnPrev').disabled = !meta.hasPrevPage;
    $('btnNext').disabled = !meta.hasNextPage;
  }

  function bindEvents() {
    var userTimer = null;

    $('btnRefresh').addEventListener('click', function () {
      fetchLogs();
    });

    $('filterEntity').addEventListener('change', function (e) {
      state.entity = e.target.value;
      state.page = 1;
      fetchLogs();
    });

    $('filterAction').addEventListener('change', function (e) {
      state.action = e.target.value;
      state.page = 1;
      fetchLogs();
    });

    $('filterUser').addEventListener('input', function (e) {
      state.user = e.target.value.trim();
      clearTimeout(userTimer);
      userTimer = setTimeout(function () {
        state.page = 1;
        fetchLogs();
      }, 300);
    });

    $('btnPrev').addEventListener('click', function () {
      if (state.page > 1) {
        state.page -= 1;
        fetchLogs();
      }
    });

    $('btnNext').addEventListener('click', function () {
      if (state.page < state.totalPages) {
        state.page += 1;
        fetchLogs();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    fetchLogs();
  });
})();
