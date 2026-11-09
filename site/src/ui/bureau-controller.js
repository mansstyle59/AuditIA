// AuditIA — Bureau : état de l'écran, actions et tâche de fond des agents.
// Les règles sont dans bureau-store.js ; l'affichage dans views/bureau.js.
import { emptyStore, loadStore, saveStore, createAgent, addTask, findTask, removeTask, setAgentStatus, tick, messageFor } from './bureau-store.js';
import { shellHtml, chipsHtml, cardHtml, agentsHtml, readyHtml, pipeHtml, updateScene } from './views/bureau.js';
// (chipsHtml, cardHtml, agentsHtml, readyHtml, pipeHtml : fragments rafraîchis en place)

export function createBureauController({ getUser, getData, getView, rerender }) {
  let owner = null;
  let store = emptyStore();
  let sel = null;

  const clients = () => {
    const d = getData();
    return d && d.status === 'ready' ? d.clients : [];
  };
  const val = id => (document.getElementById(id)?.value || '').trim();

  function ensure() {
    const u = getUser();
    if (!u) return false;
    if (owner !== u.id) { owner = u.id; store = loadStore(u.id); sel = store.agents[0] ? store.agents[0].id : null; }
    return true;
  }
  const save = () => { if (owner) saveStore(owner, store); };

  function note(text, kind = '') {
    const el = document.getElementById('bu-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'bu-msg' + (kind ? ' bu-msg--' + kind : '');
  }

  // Met à jour les parties dynamiques sans toucher aux formulaires (la saisie reste en place)
  function refresh() {
    if (!owner) return;
    const list = clients();
    updateScene(document.getElementById('bu-room'), store, list, sel);
    const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    put('bu-chips', chipsHtml(store, list));
    put('bu-card', cardHtml(store, list, sel));
    put('bu-agents', agentsHtml(store, list));
    put('bu-ready', readyHtml(store, list));
    put('bu-pipe', pipeHtml(store, list));
  }

  // Tâche de fond : les agents au poste avancent, même si l'écran n'est pas ouvert
  setInterval(() => {
    if (!owner) return;
    if (tick(store, clients())) {
      save();
      if (getView() === 'bureau') refresh();
    }
  }, 5000);

  return {
    html() {
      if (!ensure()) return '';
      return shellHtml(store);
    },
    mounted() {
      if (!ensure()) return;
      refresh();
    },
    reset() { owner = null; store = emptyStore(); sel = null; },
    onClick(t) {
      if (!getUser()) return false;
      const pin = t.closest('[data-bu-agent]');
      if (pin) { if (ensure()) { sel = pin.dataset.buAgent; refresh(); } return true; }
      const btn = t.closest('[data-bu-act]');
      if (!btn) return false;
      if (!ensure()) return true;
      const act = btn.dataset.buAct;
      const id = btn.dataset.buId;
      const taskId = btn.dataset.buTask;

      if (act === 'create') {
        const r = createAgent(store, { name: val('bu-name'), cat: val('bu-cat'), role: val('bu-role') });
        if (!r.ok) { note(r.error, 'err'); return true; }
        sel = r.agent.id;
        save();
        note(`${r.agent.name} a rejoint le bureau.`, 'ok');
        rerender();
        return true;
      }
      if (act === 'addtask') {
        const r = addTask(store, val('bu-agent'), { type: val('bu-type'), cat: val('bu-tcat'), zone: val('bu-zone') });
        if (!r.ok) { note(r.error, 'err'); return true; }
        sel = r.agent.id;
        const zone = document.getElementById('bu-zone');
        if (zone) zone.value = '';
        save();
        note(`Tâche ajoutée à ${r.agent.name}.`, 'ok');
        refresh();
        return true;
      }
      if (act === 'work' || act === 'stop' || act === 'cafe' || act === 'back') {
        const status = { work: 'working', stop: 'idle', cafe: 'break', back: 'idle' }[act];
        const a = setAgentStatus(store, id, status);
        if (!a) return true;
        sel = a.id;
        if (act === 'work' && !a.tasks.some(x => x.type === 'message' && x.status === 'todo')) {
          note(`${a.name} est au poste, mais n’a pas de tâche « Messages » à traiter.`, '');
        } else {
          note(`${a.name} : ${{ work: 'est au poste.', stop: 'arrête de travailler.', cafe: 'est en pause café.', back: 'est de retour au poste.' }[act]}`, '');
        }
        save();
        refresh();
        return true;
      }
      if (act === 'deltask') {
        removeTask(store, id, taskId);
        save();
        note('Tâche retirée.', '');
        refresh();
        return true;
      }
      if (act === 'taskdone') {
        const f = findTask(store, id, taskId);
        if (f) f.task.status = 'done';
        save();
        note('Tâche marquée terminée.', 'ok');
        refresh();
        return true;
      }
      if (act === 'copy') {
        const c = clients().find(x => String(x.id) === String(id));
        if (!c) return true;
        const text = messageFor(c);
        navigator.clipboard.writeText(text)
          .then(() => note('Message copié. Relisez-le avant tout envoi.', 'ok'))
          .catch(() => note('Copie refusée par le navigateur : sélectionnez le texte à la main.', 'err'));
        return true;
      }
      return true;
    },
  };
}
