
registerSharedSetup();

const STORAGE_KEY = 'gymToolsSetCounterState';
const SAVED_WORKOUTS_KEY = 'gymToolsSetCounterSavedWorkouts';

const screens = {
  menu: document.getElementById('screenMenu'),
  quickSetup: document.getElementById('screenQuickSetup'),
  quickTimer: document.getElementById('screenQuickTimer'),
  setCounter: document.getElementById('screenSetCounter'),
  fullWorkout: document.getElementById('screenFullWorkout')
};

const els = {
  screenTitle: document.getElementById('screenTitle'),
  backButton: document.getElementById('backButton'),
  quickRestSeconds: document.getElementById('quickRestSeconds'),
  quickSetupSelectedLabel: document.getElementById('quickSetupSelectedLabel'),
  quickSetupStartBtn: document.getElementById('quickSetupStartBtn'),
  quickSetupResetBtn: document.getElementById('quickSetupResetBtn'),
  quickTimerDisplay: document.getElementById('quickTimerDisplay'),
  quickSetsLabel: document.getElementById('quickSetsLabel'),
  quickTimerSubtext: document.getElementById('quickTimerSubtext'),
  quickRestBtn: document.getElementById('quickRestBtn'),
  quickPauseBtn: document.getElementById('quickPauseBtn'),
  quickResetBtn: document.getElementById('quickResetBtn'),
  quickPresetButtons: Array.from(document.querySelectorAll('[data-quick-preset]')),
  setCounterValue: document.getElementById('setCounterValue'),
  setCounterText: document.getElementById('setCounterText'),
  setCounterNextBtn: document.getElementById('setCounterNextBtn'),
  setCounterResetBtn: document.getElementById('setCounterResetBtn'),
  workoutName: document.getElementById('workoutName'),
  blockForm: document.getElementById('blockForm'),
  blockRounds: document.getElementById('blockRounds'),
  blockRoundsBox: document.getElementById('blockRoundsBox'),
  blockRest: document.getElementById('blockRest'),
  blockRestBox: document.getElementById('blockRestBox'),
  blockList: document.getElementById('blockList'),
  currentWorkoutTitle: document.getElementById('currentWorkoutTitle'),
  currentBlockLabel: document.getElementById('currentBlockLabel'),
  currentProgressLabel: document.getElementById('currentProgressLabel'),
  currentStepLabel: document.getElementById('currentStepLabel'),
  timerPhase: document.getElementById('timerPhase'),
  timerDisplay: document.getElementById('timerDisplay'),
  timerSubtext: document.getElementById('timerSubtext'),
  startWorkoutBtn: document.getElementById('startWorkoutBtn'),
  resetFlowBtn: document.getElementById('resetFlowBtn'),
  saveWorkoutBtn: document.getElementById('saveWorkoutBtn'),
  savedWorkouts: document.getElementById('savedWorkouts'),
  goQuickStart: document.getElementById('goQuickStart'),
  goSetCounter: document.getElementById('goSetCounter'),
  goFullWorkout: document.getElementById('goFullWorkout')
};

let currentScreen = 'menu';
const screenHistory = [];
let quickTimerInterval = null;
let fullWorkoutTimerInterval = null;
let fullWorkoutRemaining = 0;
let fullWorkoutIsRunning = false;
let fullWorkoutIsPaused = false;

let appState = loadState();
let savedWorkouts = loadSavedWorkouts();
let quickStartState = createQuickStartState();
let setCounterState = createSetCounterState();

window.gymtoolsIsBusy = () => Boolean(quickStartState.running || quickStartState.paused || fullWorkoutIsRunning || fullWorkoutIsPaused);


function createDefaultState() {
  return {
    session: { id: `session-${Date.now()}`, name: 'Workout A', blocks: [] },
    flow: { started: false, completed: false, currentBlockIndex: 0, currentRound: 0 }
  };
}
function createQuickStartState() {
  const preset = clamp(Number(els.quickRestSeconds.value) || 60, 5, 900);
  return { preset, remaining: preset, completedSets: 0, running: false, paused: false };
}
function createSetCounterState() { return { completedSets: 0 }; }
function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && parsed.session && Array.isArray(parsed.session.blocks) && parsed.flow) return parsed;
  } catch {}
  return createDefaultState();
}
function loadSavedWorkouts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_WORKOUTS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)); }
function saveSavedWorkouts() { localStorage.setItem(SAVED_WORKOUTS_KEY, JSON.stringify(savedWorkouts)); }

function navigateTo(screen, options = {}) {
  const { pushHistory = true } = options;
  if (pushHistory && currentScreen && currentScreen !== screen) {
    screenHistory.push(currentScreen);
  }
  currentScreen = screen;
  Object.entries(screens).forEach(([name, node]) => node.classList.toggle('hidden', name !== screen));
  const screenTitles = { menu:'Rest Timer', quickSetup:'Quick Start', quickTimer:'Quick Start', setCounter:'Set Counter', fullWorkout:'Full Workout' };
  els.screenTitle.textContent = screenTitles[screen] || 'Rest Timer';
  syncBackButton();
}
function syncBackButton() {
  els.backButton.textContent = 'Back';
}
function goBack() {
  if (currentScreen === 'menu') {
    window.location.href = '../menu.html';
    return;
  }
  const previous = screenHistory.pop();
  navigateTo(previous || 'menu', { pushHistory: false });
}
els.backButton.addEventListener('click', (event) => {
  event.preventDefault();
  goBack();
});

function renderQuickStart() {
  els.quickSetupSelectedLabel.textContent = `${quickStartState.preset} sec`;
  els.quickTimerDisplay.textContent = secondsToClock(quickStartState.remaining);
  els.quickSetsLabel.textContent = `${quickStartState.completedSets} ${quickStartState.completedSets === 1 ? 'Set' : 'Sets'}`;
  els.quickTimerSubtext.textContent = quickStartState.running ? 'Rest running.' : quickStartState.paused ? 'Paused.' : 'Press Start, then use Rest when you finish each set.';
  els.quickRestBtn.textContent = quickStartState.running || quickStartState.paused ? 'Rest' : 'Start';
  els.quickPauseBtn.textContent = quickStartState.running ? 'Pause' : 'Resume';
}
function setQuickPreset(value) {
  const next = clamp(Number(value) || 60, 5, 900);
  els.quickRestSeconds.value = String(next);
  quickStartState.preset = next;
  if (!quickStartState.running) quickStartState.remaining = next;
  renderQuickStart();
}
function startQuickStartFlow() {
  quickStartState = createQuickStartState();
  navigateTo('quickTimer');
  renderQuickStart();
}
function resetQuickStart() {
  setQuickPreset(60);
}
function resetQuickStartFromTimer() {
  clearInterval(quickTimerInterval);
  quickTimerInterval = null;
  quickStartState = createQuickStartState();
  navigateTo('quickSetup');
  renderQuickStart();
}
function startQuickTimer() {
  clearInterval(quickTimerInterval);
  quickStartState.running = true;
  quickStartState.paused = false;
  renderQuickStart();
  quickTimerInterval = setInterval(() => {
    quickStartState.remaining -= 1;
    if (quickStartState.remaining <= 0) {
      clearInterval(quickTimerInterval);
      quickTimerInterval = null;
      quickStartState.running = false;
      quickStartState.remaining = 0;
      window.__gymtoolsBeepManager.beep('done');
    } else if (quickStartState.remaining <= 3) {
      window.__gymtoolsBeepManager.beep('countdown');
    }
    renderQuickStart();
  }, 1000);
}
function handleQuickRestPress() {
  window.__gymtoolsBeepManager.unlock();
  quickStartState.completedSets += 1;
  quickStartState.remaining = quickStartState.preset;
  startQuickTimer();
}
function toggleQuickPause() {
  if (quickStartState.running) {
    clearInterval(quickTimerInterval);
    quickTimerInterval = null;
    quickStartState.running = false;
    quickStartState.paused = true;
  } else if (quickStartState.paused && quickStartState.remaining > 0) {
    startQuickTimer();
  }
  renderQuickStart();
}
function renderSetCounter() {
  els.setCounterValue.textContent = String(setCounterState.completedSets);
  els.setCounterText.textContent = `${setCounterState.completedSets} ${setCounterState.completedSets === 1 ? 'Set' : 'Sets'}`;
}

function renderFullWorkoutHeader() {
  els.currentWorkoutTitle.textContent = appState.session.name || 'Workout A';
}
function renderBlockControls() {
  els.blockRoundsBox.textContent = String(els.blockRounds.value);
  els.blockRestBox.textContent = `${els.blockRest.value} sec`;
}
function renderBlockList() {
  els.blockList.innerHTML = '';
  if (!appState.session.blocks.length) {
    els.blockList.innerHTML = '<div class="block-item">No blocks yet.</div>';
    return;
  }
  appState.session.blocks.forEach((block) => {
    const item = document.createElement('div');
    item.className = 'block-item';
    item.innerHTML = `<div><strong>Sets block</strong></div><div class="block-meta">${block.rounds} sets • ${block.rest}s rest</div>`;
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const up = document.createElement('button');
    up.className = 'card-btn';
    up.textContent = 'Up';
    up.onclick = () => moveBlock(block.id, -1);
    const down = document.createElement('button');
    down.className = 'card-btn';
    down.textContent = 'Down';
    down.onclick = () => moveBlock(block.id, 1);
    const del = document.createElement('button');
    del.className = 'card-btn';
    del.textContent = 'Delete';
    del.onclick = () => deleteBlock(block.id);
    actions.append(up, down, del);
    item.appendChild(actions);
    els.blockList.appendChild(item);
  });
}
function getCurrentBlock() {
  return appState.session.blocks[appState.flow.currentBlockIndex] || null;
}
function setTimerCard(phase, time, subtext) {
  els.timerPhase.textContent = phase;
  els.timerDisplay.textContent = time;
  els.timerSubtext.textContent = subtext;
}
function renderFullWorkoutFlow() {
  const block = getCurrentBlock();
  if (!appState.session.blocks.length) {
    els.currentBlockLabel.textContent = 'No blocks';
    els.currentProgressLabel.textContent = '—';
    els.currentStepLabel.textContent = '—';
    setTimerCard('Ready', '00:00', 'Build your workout, then press Start.');
    els.startWorkoutBtn.textContent = 'Start';
    return;
  }
  if (appState.flow.completed || !block) {
    els.currentBlockLabel.textContent = 'Complete';
    els.currentProgressLabel.textContent = 'Finished';
    els.currentStepLabel.textContent = '—';
    setTimerCard('Complete', '00:00', 'Workout complete.');
    els.startWorkoutBtn.textContent = 'Start';
    return;
  }
  els.currentBlockLabel.textContent = `Sets (${appState.flow.currentBlockIndex + 1} of ${appState.session.blocks.length})`;
  els.currentProgressLabel.textContent = `${appState.flow.currentRound} of ${block.rounds} completed`;
  els.currentStepLabel.textContent = fullWorkoutIsRunning ? 'Rest' : fullWorkoutIsPaused ? 'Paused' : 'Ready';

  if (!appState.flow.started && !fullWorkoutIsRunning && !fullWorkoutIsPaused) {
    setTimerCard('Ready', secondsToClock(block.rest), 'Press Start to begin your first rest.');
  } else if (fullWorkoutIsRunning) {
    setTimerCard('Rest', secondsToClock(fullWorkoutRemaining), 'Rest running.');
  } else if (fullWorkoutIsPaused) {
    setTimerCard('Paused', secondsToClock(fullWorkoutRemaining), 'Press Start to resume.');
  } else {
    setTimerCard('Ready', secondsToClock(fullWorkoutRemaining || block.rest), 'Press Start when you finish the next set.');
  }
  els.startWorkoutBtn.textContent = fullWorkoutIsRunning ? 'Pause' : 'Start';
}
function renderSavedWorkouts() {
  els.savedWorkouts.innerHTML = '';
  if (!savedWorkouts.length) {
    els.savedWorkouts.innerHTML = '<div class="saved-item">No saved workouts yet.</div>';
    return;
  }
  savedWorkouts.forEach(item => {
    const card = document.createElement('div');
    card.className = 'saved-item';
    card.innerHTML = `<div><strong>${item.name}</strong></div><div class="saved-meta">${item.blocks.length} block(s)</div>`;
    const row = document.createElement('div');
    row.className = 'card-actions';
    const loadBtn = document.createElement('button');
    loadBtn.className = 'card-btn primary';
    loadBtn.textContent = 'Load';
    loadBtn.onclick = () => {
      appState.session = JSON.parse(JSON.stringify(item));
      appState.flow = createDefaultState().flow;
      saveState();
      renderAll();
syncBackButton();
    };
    const delBtn = document.createElement('button');
    delBtn.className = 'card-btn';
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      savedWorkouts = savedWorkouts.filter(x => x.id !== item.id);
      saveSavedWorkouts();
      renderSavedWorkouts();
    };
    row.append(loadBtn, delBtn);
    card.appendChild(row);
    els.savedWorkouts.appendChild(card);
  });
}
function renderAll() {
  renderQuickStart();
  renderSetCounter();
  renderFullWorkoutHeader();
  renderBlockControls();
  renderBlockList();
  renderFullWorkoutFlow();
  renderSavedWorkouts();
}
function addBlock(rounds, rest) {
  appState.session.blocks.push({ id: `block-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, type:'sets', rounds, rest });
  appState.flow = createDefaultState().flow;
  saveState();
  renderAll();
syncBackButton();
}
function moveBlock(id, dir) {
  const index = appState.session.blocks.findIndex(b => b.id === id);
  if (index < 0) return;
  const nextIndex = index + dir;
  if (nextIndex < 0 || nextIndex >= appState.session.blocks.length) return;
  [appState.session.blocks[index], appState.session.blocks[nextIndex]] = [appState.session.blocks[nextIndex], appState.session.blocks[index]];
  appState.flow = createDefaultState().flow;
  saveState();
  renderAll();
syncBackButton();
}
function deleteBlock(id) {
  appState.session.blocks = appState.session.blocks.filter(b => b.id !== id);
  appState.flow = createDefaultState().flow;
  saveState();
  renderAll();
syncBackButton();
}
function clearWorkout() {
  appState = createDefaultState();
  els.workoutName.value = 'Workout A';
  fullWorkoutRemaining = 0;
  fullWorkoutIsRunning = false;
  fullWorkoutIsPaused = false;
  clearInterval(fullWorkoutTimerInterval);
  saveState();
  renderAll();
syncBackButton();
}
function handleFullWorkoutStartPause() {
  window.__gymtoolsBeepManager.unlock();
  const block = getCurrentBlock();
  if (!block) return;
  if (fullWorkoutIsRunning) {
    clearInterval(fullWorkoutTimerInterval);
    fullWorkoutTimerInterval = null;
    fullWorkoutIsRunning = false;
    fullWorkoutIsPaused = true;
    renderFullWorkoutFlow();
    return;
  }

  if (!appState.flow.started) {
    appState.flow.started = true;
    fullWorkoutRemaining = block.rest;
  } else if (!fullWorkoutRemaining) {
    fullWorkoutRemaining = block.rest;
  }

  fullWorkoutIsRunning = true;
  fullWorkoutIsPaused = false;
  renderFullWorkoutFlow();
  clearInterval(fullWorkoutTimerInterval);
  fullWorkoutTimerInterval = setInterval(() => {
    fullWorkoutRemaining -= 1;
    if (fullWorkoutRemaining <= 0) {
      window.__gymtoolsBeepManager.beep('done');
      clearInterval(fullWorkoutTimerInterval);
      fullWorkoutTimerInterval = null;
      fullWorkoutIsRunning = false;
      fullWorkoutRemaining = 0;
      const currentBlock = getCurrentBlock();
      if (!currentBlock) return;
      appState.flow.currentRound += 1;
      if (appState.flow.currentRound >= currentBlock.rounds) {
        appState.flow.currentBlockIndex += 1;
        appState.flow.currentRound = 0;
        if (appState.flow.currentBlockIndex >= appState.session.blocks.length) {
          appState.flow.completed = true;
        }
      }
      saveState();
      renderFullWorkoutFlow();
    } else {
      if (fullWorkoutRemaining <= 3) window.__gymtoolsBeepManager.beep('countdown');
      renderFullWorkoutFlow();
    }
  }, 1000);
}
function resetFullWorkoutFlowOnly() {
  clearInterval(fullWorkoutTimerInterval);
  fullWorkoutTimerInterval = null;
  fullWorkoutRemaining = 0;
  fullWorkoutIsRunning = false;
  fullWorkoutIsPaused = false;
  appState.flow = createDefaultState().flow;
  saveState();
  renderFullWorkoutFlow();
}
function saveCurrentWorkout() {
  if (!appState.session.blocks.length) return;
  const copy = JSON.parse(JSON.stringify(appState.session));
  copy.id = `session-${Date.now()}`;
  const existingIndex = savedWorkouts.findIndex(item => item.name === copy.name);
  if (existingIndex >= 0) savedWorkouts[existingIndex] = copy;
  else savedWorkouts.unshift(copy);
  saveSavedWorkouts();
  renderSavedWorkouts();
}

els.goQuickStart.addEventListener('click', () => navigateTo('quickSetup'));
els.goSetCounter.addEventListener('click', () => navigateTo('setCounter'));
els.goFullWorkout.addEventListener('click', () => navigateTo('fullWorkout'));

els.quickSetupStartBtn.addEventListener('click', startQuickStartFlow);
els.quickSetupResetBtn.addEventListener('click', resetQuickStart);
els.quickRestBtn.addEventListener('click', handleQuickRestPress);
els.quickPauseBtn.addEventListener('click', toggleQuickPause);
els.quickResetBtn.addEventListener('click', resetQuickStartFromTimer);
els.quickPresetButtons.forEach(btn => btn.addEventListener('click', () => setQuickPreset(Number(btn.dataset.quickPreset))));
els.setCounterNextBtn.addEventListener('click', () => { setCounterState.completedSets += 1; renderSetCounter(); });
els.setCounterResetBtn.addEventListener('click', () => { setCounterState = createSetCounterState(); renderSetCounter(); });
els.workoutName.addEventListener('input', (event) => { appState.session.name = event.target.value.trim() || 'Workout A'; saveState(); renderFullWorkoutHeader(); renderSavedWorkouts(); });
els.blockForm.addEventListener('submit', (event) => { event.preventDefault(); addBlock(Number(els.blockRounds.value) || 1, Number(els.blockRest.value) || 60); });
els.resetBuilderBtn.addEventListener('click', clearWorkout);
els.startWorkoutBtn.addEventListener('click', handleFullWorkoutStartPause);
els.resetFlowBtn.addEventListener('click', resetFullWorkoutFlowOnly);
els.saveWorkoutBtn.addEventListener('click', saveCurrentWorkout);

document.querySelectorAll('[data-stepper-target]').forEach(btn => btn.addEventListener('click', () => {
  const target = document.getElementById(btn.dataset.stepperTarget);
  const step = Number(btn.dataset.step) || 1;
  const current = Number(target.value) || 0;
  const next = clamp(current + step, 1, 900);
  target.value = String(next);
  if (target === els.quickRestSeconds) setQuickPreset(next);
  if (target === els.blockRounds) els.blockRoundsBox.textContent = String(next);
  if (target === els.blockRest) els.blockRestBox.textContent = `${next} sec`;
}));

navigateTo('menu');
renderAll();
syncBackButton();
