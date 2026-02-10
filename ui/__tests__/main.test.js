const fs = require('fs');
const path = require('path');

describe('ui/main.js', () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');

  function loadDom() {
    const html = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = html;
  }

  function setupBootstrapMock() {
    global.bootstrap = {
      Modal: class {
        constructor() {}
        show() {}
        hide() {}
        static getInstance() {
          return { hide() {} };
        }
      }
    };
  }

  beforeEach(() => {
    jest.resetModules();
    loadDom();
    setupBootstrapMock();
    global.fetch = jest.fn();
  });

  test('updateStats calcula conteos y vencidas', () => {
    const { updateStats } = require('../main');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const tasks = [
      { estado: 'pendiente', fecha_vencimiento: yesterday.toISOString().slice(0, 10) },
      { estado: 'en_progreso', fecha_vencimiento: tomorrow.toISOString().slice(0, 10) },
      { estado: 'completada', fecha_vencimiento: yesterday.toISOString().slice(0, 10) },
      { estado: 'pendiente', fecha_vencimiento: null }
    ];

    updateStats(tasks);

    expect(document.getElementById('statTotal').textContent).toBe('4');
    expect(document.getElementById('statPending').textContent).toBe('2');
    expect(document.getElementById('statProgress').textContent).toBe('1');
    expect(document.getElementById('statCompleted').textContent).toBe('1');
    expect(document.getElementById('statOverdue').textContent).toBe('1');
  });

  test('buildCsv genera CSV con escape correcto', () => {
    const { buildCsv } = require('../main');
    const tasks = [
      {
        id: 1,
        titulo: 'Tarea, 1',
        descripcion: 'Linea 1\nLinea 2',
        estado: 'pendiente',
        prioridad: 3,
        fecha_vencimiento: '2026-02-01',
        fecha_creacion: '2026-01-01',
        active: true,
        project_id: 5
      },
      {
        id: 2,
        titulo: '"Cita"',
        descripcion: null,
        estado: 'completada',
        prioridad: 1,
        fecha_vencimiento: null,
        fecha_creacion: '2026-01-02',
        active: false,
        project_id: null
      }
    ];

    const csv = buildCsv(tasks);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('id,titulo,descripcion,estado,prioridad,fecha_vencimiento,fecha_creacion,active,project_id');
    expect(lines[1]).toBe('1,"Tarea, 1",Linea 1 Linea 2,pendiente,3,2026-02-01,2026-01-01,true,5');
    expect(lines[2]).toBe('2,"""Cita""",,completada,1,,2026-01-02,false,');
  });

  test('copyToClipboard usa la API del portapapeles cuando esta disponible', async () => {
    const { copyToClipboard } = require('../main');
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await copyToClipboard('hola');

    expect(writeText).toHaveBeenCalledWith('hola');
  });

  test('loadProjects retorna true con proyecto activo y actualiza UI', async () => {
    localStorage.setItem('currentProjectId', '7');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 7, name: 'Proyecto 7' }]
    });

    const { loadProjects } = require('../main');
    const hasProject = await loadProjects();

    expect(hasProject).toBe(true);
    expect(document.getElementById('currentProjectName').textContent).toBe('Proyecto 7');
    expect(document.getElementById('projectSelect').value).toBe('7');
  });
});
