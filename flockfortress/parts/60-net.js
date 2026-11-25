// ================= online (Arcade Shelf relay) =================
// Two players. The player whose turn it is runs the physics and streams positions to the other; builds are
// swapped once both are ready, so both screens start every siege from exactly the same fort lists.
const RELAY = Q.get('relay') || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8787' : 'https://relay.thearcadeshelf.com');
const ROOM_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', HOLD_S = 90;
const MP = { ws: null, seat: -1, code: '', present: new Set(), pidOf: new Map(), pid: '', want: false };
try { MP.pid = localStorage.getItem('flockfortress.pid') || ''; } catch (e) { }
if (!MP.pid) { MP.pid = Math.random().toString(36).slice(2, 10); try { localStorage.setItem('flockfortress.pid', MP.pid); } catch (e) { } }
const mpStatus = h => { $('mpStatus').innerHTML = h; };
function mpSend(o) { if (MP.ws && MP.ws.readyState === 1) MP.ws.send(JSON.stringify(o)); }
function mpLeave() { MP.want = false; clearTimeout(MP.retryT); if (MP.ws) { MP.ws.onclose = null; try { MP.ws.close(); } catch (e) { } } MP.ws = null; MP.seat = -1; MP.present.clear(); MP.pidOf.clear(); renderLobby(); }
const isHost = () => MP.seat >= 0 && MP.seat === Math.min(...MP.present);
const seatPid = s => s === MP.seat ? MP.pid : (MP.pidOf.get(s) || 's' + s);
function mpConnect(code) {
  mpLeave(); MP.code = code; MP.want = true;
  let ws; try { ws = new WebSocket(RELAY.replace(/^http/, 'ws') + '/ws?game=flockfortress&room=' + code); } catch (e) { mpStatus('Could not reach the game server.'); return; }
  MP.ws = ws; if (!(G && G.mode === 'online')) mpStatus(`Connecting to <b>${code}</b>…`);
  ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } mpMsg(m); };
  ws.onerror = () => { if (!(G && G.mode === 'online')) mpStatus('Could not reach the game server. Try again in a moment.'); };
  ws.onclose = () => {
    MP.ws = null; MP.seat = -1; MP.present.clear(); renderLobby();
    if (G && G.mode === 'online' && G.phase !== 'over' && MP.want) { G.lost = G.lost || { t: HOLD_S }; renderHold(); MP.retryT = setTimeout(() => { if (G && G.lost) mpConnect(MP.code); }, 2500); }
    else mpStatus('Disconnected from the room.');
  };
}
// ---------- coming back after dropping out
const REC_KEY = 'flockfortress.rejoin';
function saveRec() { if (!G || G.mode !== 'online' || G.phase === 'over' || !MP.code) return; try { localStorage.setItem(REC_KEY, JSON.stringify({ room: MP.code, seed: G.seed, ts: Date.now(), build: G.phase === 'build' && !G.ready[G.me] ? serializeFort(G.me) : null })); } catch (e) { } }
function loadRec() { try { const r = JSON.parse(localStorage.getItem(REC_KEY) || 'null'); return r && Date.now() - r.ts < 15 * 60e3 ? r : null; } catch (e) { return null; } }
function clearRec() { try { localStorage.removeItem(REC_KEY); } catch (e) { } showRejoin(); }
function showRejoin() { const r = loadRec(); $('rejoinRow').classList.toggle('hidden', !r || !!G); if (r) $('bRejoin').textContent = `↩ Rejoin match · ${r.room}`; }
addEventListener('pagehide', saveRec); addEventListener('beforeunload', saveRec);
setInterval(saveRec, 2000);
function startHold() { if (!G || G.phase === 'over') return; G.hold = G.hold || HOLD_S; renderHold(); AUD.click(); }
function endHold(drop) {
  if (!G || !G.hold) return; G.hold = null; renderHold();
  if (drop) { G.phase = 'siege'; roundOverForfeit(); }
  else say('They\'re back!', '', 1.6);
}
function roundOverForfeit() { G.wins[G.me] = 2; G.phase = 'over'; showCard('Victory!', 'The other player left the match.', '', 'Menu', () => { mpLeave(); clearRec(); toMenu(); }); }
function holdTick(dt) {
  if (G.lost) { G.lost.t -= dt; if (G.lost.t <= 0) { G.lost = null; MP.want = false; renderHold(); showCard('Disconnected', 'Could not get back into the room.', '', 'Menu', () => { mpLeave(); clearRec(); toMenu(); }); } else renderHold(); return true; }
  if (!G.hold) return false;
  G.hold -= dt; if (G.hold <= 0) endHold(true); else renderHold();
  return !!G.hold;
}
function renderHold() {
  const box = $('hold');
  if (!G || (!G.hold && !G.lost) || G.phase === 'over') { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  if (G.lost) { $('holdT').textContent = `Connection lost · reconnecting… ${Math.ceil(G.lost.t)} s`; $('bHoldGo').classList.add('hidden'); return; }
  $('holdT').textContent = `${G.names[1 - G.me]} lost connection · waiting ${Math.ceil(G.hold)} s for them to come back`;
  $('bHoldGo').classList.remove('hidden'); $('bHoldGo').textContent = 'Take the win';
}
$('bHoldGo').onclick = () => { mpSend({ k: 'quit' }); endHold(true); };
function fullState() { return { seed: G.seed, pids: G.pids, phase: G.phase === 'roundEnd' ? 'siege' : G.phase, buildT: G.buildT, ready: G.ready, forts: G.forts, st: snapState(true) }; }
function applySync(m) {
  const me = m.pids.indexOf(MP.pid); if (me < 0) return;
  hideCard(); newMatch({ mode: 'online', me, seed: m.seed }); G.pids = m.pids;
  const st = m.st; G.round = st.round; G.wins = st.wins; G.dmg = st.dmg; G.ammo = st.ammo; G.turn = st.turn; G.turnN = st.turnN; G.starter = st.starter;
  G.forts = m.forts; G.ready = m.ready; G.buildT = m.buildT;
  if (m.phase === 'build') {
    resetWorld();
    for (const s of [0, 1]) if (G.forts[s]) buildFrom(s, G.forts[s]);
    const rec = loadRec(); if (!G.ready[me] && rec && rec.build) for (const [t, x, y, a, rot] of rec.build) placePiece(me, t, x, y, rot, true);
    G.phase = 'build'; G.builder = me; camTo('build', me, true);
  } else {
    resetWorld(); applyState(st, true); G.phase = 'siege'; G.shot = null; newWind(); camTo('aim', G.turn, true);
  }
  renderBars(); say('Back in the match!', '', 2.4);
}
// ---------- lobby
function renderLobby() {
  const on = MP.seat >= 0;
  $('lobby').classList.toggle('hidden', !on); $('joinRows').classList.toggle('hidden', on);
  if (!on) return;
  const seats = [...MP.present].sort((a, b) => a - b);
  $('lobbyList').innerHTML = seats.map((s, k) => `<span style="color:${k ? 'var(--p1)' : 'var(--p0)'}">${s === MP.seat ? 'You' : 'Friend'}${k === 0 ? ' · host' : ''}</span>`).join('');
  const host = isHost();
  $('bStart').classList.toggle('hidden', !host); $('bStart').disabled = seats.length < 2;
  $('bStart').textContent = seats.length < 2 ? 'Waiting for a friend…' : '▶ Start';
  $('roomCode').textContent = MP.code; $('bShare').classList.toggle('hidden', !navigator.share);
  mpStatus(host ? 'Send a friend the link or code, then start.' : 'Waiting for the host to start…');
}
function hostStart() {
  if (!isHost()) return;
  const seats = [...MP.present].sort((a, b) => a - b).slice(0, 2); if (seats.length < 2) return;
  const pids = seats.map(seatPid), seed = (Math.random() * 1e9) | 0;
  mpSend({ k: 'start', seed, pids }); beginOnline(seed, pids);
}
function beginOnline(seed, pids) {
  const me = pids.indexOf(MP.pid);
  if (me < 0) { mpStatus('A match is under way in this room.'); return; }
  clearRec(); hideCard(); newMatch({ mode: 'online', me, seed }); G.pids = pids;
}
function mpMsg(m) {
  if (m.k === 'full') { mpStatus('That room already has two players.'); return; }
  if (m.k === 'hello') {
    MP.seat = m.seat; MP.present = new Set([m.seat, ...(m.seats || [])]); mpSend({ k: 'here', seat: m.seat, pid: MP.pid }); renderLobby();
    if (loadRec() && loadRec().room === MP.code) { clearTimeout(MP.syncT); MP.syncT = setTimeout(() => { if (!(G && G.mode === 'online' && !G.lost)) { clearRec(); mpStatus('That match has ended.'); } else if (G && G.lost) { G.lost = null; renderHold(); } }, 8000); }
    return;
  }
  if (m.k === 'here') {
    const isNew = !MP.present.has(m.seat); MP.present.add(m.seat); if (m.pid) MP.pidOf.set(m.seat, m.pid);
    if (isNew || !m.re) mpSend({ k: 'here', seat: MP.seat, pid: MP.pid, re: 1 });
    renderLobby();
    if (m.pid && !m.re && G && G.mode === 'online' && G.phase !== 'over' && G.pids && G.pids.includes(m.pid) && m.pid !== MP.pid) { mpSend({ k: 'sync', to: m.pid, s: fullState() }); endHold(false); }
    return;
  }
  if (m.k === 'peer') {
    if (m.on) MP.present.add(m.seat); else { MP.present.delete(m.seat); const pid = MP.pidOf.get(m.seat); MP.pidOf.delete(m.seat); if (pid && G && G.mode === 'online' && G.pids && G.pids.includes(pid) && G.phase !== 'over') startHold(); }
    renderLobby(); return;
  }
  if (m.k === 'sync') { if (m.to === MP.pid) { clearTimeout(MP.syncT); G = null; applySync(m.s); } return; }
  if (m.k === 'start') { if (G && G.mode === 'online' && G.phase !== 'over' && G.pids && G.pids.includes(MP.pid) && G.round > 0 && G.phase !== 'roundEnd') return; beginOnline(m.seed, m.pids); return; }
  if (!G || G.mode !== 'online') return;
  if (G.hold) endHold(false);
  if (m.k === 'fort') { if (m.round !== G.round) return; G.forts[m.side] = m.list; G.ready[m.side] = true; if (G.forts[0] && G.forts[1] && G.phase === 'build') startSiege(); renderBars(); }
  else if (m.k === 'shot') { if (G.phase !== 'siege') return; G.ammo[m.side][m.type]--; G.stats[m.side].shots++; G.shot = { side: m.side, t: 0, quiet: 0, boom: -9 }; G.authority = false; G.catT = 0.5; G.catSide = m.side; AUD.launch(); AUD.baa(1.1); camTo('follow', m.side); renderBars(); }
  else if (m.k === 'snap') { if (G.shot && !G.authority) applyState(m.st, false); }
  else if (m.k === 'fx') { puff(m.x, m.y, Math.round(18 + m.R / 4), '#fff', m.R); FX.push({ x: m.x, y: m.y, t: 0, life: 0.45, k: 'ring', s: m.R }); G.shake = Math.min(14, 3 + m.R / 12); AUD.boom(m.R, m.chain); }
  else if (m.k === 'end') { applyState(m.state, true); for (const b of BODIES.filter(b => b.kind === 'sheep')) removeBody(b); G.shot = null; nextTurn(); }
  else if (m.k === 'round') { applyState(m.state, true); G.phase = 'siege'; G.shot = null; G.wins = m.state.wins.slice(); if (m.winner >= 0) G.wins[m.winner]--; roundOver(m.winner, m.why); }
  else if (m.k === 'next') { hideCard(); newRound(); }
  else if (m.k === 'quit') { roundOverForfeit(); }
}
$('bCreate').onclick = () => { AUD.init(); let c = ''; for (let i = 0; i < 5; i++) c += ROOM_ABC[(Math.random() * ROOM_ABC.length) | 0]; mpConnect(c); };
$('bJoin').onclick = () => { AUD.init(); const c = $('roomIn').value.toUpperCase().replace(/[^A-Z2-9]/g, ''); if (c.length !== 5) { mpStatus('Room codes are 5 letters.'); return; } mpConnect(c); };
$('bStart').onclick = () => { AUD.init(); hostStart(); };
$('bRejoin').onclick = () => { const r = loadRec(); if (!r) { showRejoin(); return; } AUD.init(); if ($('friend').classList.contains('hidden')) drawer('friend'); mpConnect(r.room); mpStatus(`Rejoining <b>${r.room}</b>…`); };
$('bLeaveRoom').onclick = () => { mpLeave(); mpStatus(''); };
$('roomIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('bJoin').click(); e.stopPropagation(); });
const roomLink = () => `${location.origin}${location.pathname}?room=${MP.code}`;
async function copyText(text, btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e2) { } ta.remove(); }
  const was = btn.dataset.label || (btn.dataset.label = btn.textContent);
  btn.textContent = ok ? 'Copied ✓' : 'Press Ctrl+C'; btn.classList.toggle('done', ok);
  clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = was; btn.classList.remove('done'); }, 1600);
}
$('bCopyLink').onclick = () => copyText(roomLink(), $('bCopyLink'));
$('bCopyCode').onclick = () => copyText(MP.code, $('bCopyCode'));
$('bShare').onclick = () => { navigator.share({ title: 'Flock & Fortress', text: 'Join my Flock & Fortress room: ' + MP.code, url: roomLink() }).catch(() => { }); };
