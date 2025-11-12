document.addEventListener("DOMContentLoaded", () => {
  // --- LOGIKA MODE ---
  const mode = localStorage.getItem('targetMode') || '10zone'; 
  
  // --- LOGIKA JUMLAH PANAH, SERI, & JARAK ---
  const arrowsPerEnd = localStorage.getItem('arrowsPerEnd') || '6'; 
  const arrowsPerEndFixed = parseInt(arrowsPerEnd, 10);
  const maxEnds = (arrowsPerEndFixed === 6) ? 6 : 5;
  const targetDistance = localStorage.getItem('targetDistance') || '18'; // Ambil Jarak
  // --- AKHIR LOGIKA ---

  document.body.classList.add('mode-' + mode);

  const modeLabel = document.getElementById('modeLabel');
  const backToChoose = document.getElementById('backToChoose');
  const arrowsPerEndLabel = document.getElementById('arrowsPerEndLabel');
  const distanceLabel = document.getElementById('distanceLabel');
  const playersEl = document.getElementById('players');
  const leaderboardEl = document.getElementById('leaderboard');
  const numCompEl = document.getElementById('numComp');
  const currentEndEl = document.getElementById('currentEnd');
  
  const maxEndsLabel = document.getElementById('maxEndsLabel');
  const maxEndsEl = document.getElementById('maxEnds'); 

  const newName = document.getElementById('newName');
  const addFromInput = document.getElementById('addFromInput');
  const exportBtn = document.getElementById('exportBtn');
  const resetBtn = document.getElementById('resetBtn');
  const endBtn = document.getElementById('endBtn');
  const prevEndBtn = document.getElementById('prevEnd');
  const nextEndBtn = document.getElementById('nextEnd');
  const clockEl = document.getElementById('clock');
  
  const modeText = {
    '10zone': 'Target face: 122cm 10-Ring',
    '6zone': 'Target face: 60cm 6-Ring'
  };
  modeLabel.textContent = modeText[mode] || 'Mode Tidak Dikenal';
  
  maxEndsLabel.textContent = maxEnds; 
  maxEndsEl.textContent = maxEnds;

  if (arrowsPerEndLabel) {
    arrowsPerEndLabel.textContent = arrowsPerEndFixed;
  }
  if (distanceLabel) {
    distanceLabel.textContent = targetDistance;
  }

  const scoringButtonsByMode = {
    '10zone': ['X', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'M'],
    '6zone': ['X', '10', '9', '8', '7', '6', 'M']
  };

  const defaultState = {
    competitors: [],
    selectedId: null,
    currentEnd: 1,
    matchEnded: false,
  };
  
  let state = defaultState; 

  function saveState() {
    localStorage.setItem('archeryState', JSON.stringify(state));
  }

  function loadState() {
    const savedState = localStorage.getItem('archeryState');
    if (savedState) {
      state = JSON.parse(savedState);
      
      if ((mode === '10zone' || mode === '6zone') && state.competitors.length > 0) {
        state.competitors.forEach(p => {
          if (typeof p.tensCount === 'undefined' || typeof p.xPlusTensCount === 'undefined') { 
            recalculateStats(p); 
          }
        });
      }
      
    } else {
      state = { ...defaultState, competitors: [] };
    }
  }

  function recalculateStats(p) {
    let total = 0, missCount = 0, xCount = 0, tensCount = 0, xPlusTensCount = 0;
    for (let i = 1; i <= maxEnds; i++) {
      if (p.scores[i]) {
        p.scores[i].forEach(arrow => {
          if (arrow) {
            total += arrow.score;
            if (arrow.isM) {
               missCount++;
            } else {
              if (arrow.isX && (mode === '10zone' || mode === '6zone')) {
                 xCount++;
                 xPlusTensCount++; 
              } else if (arrow.score === 10) {
                 tensCount++; 
                 xPlusTensCount++; 
              }
            }
          }
        });
      }
    }
    p.total = total;
    p.missCount = missCount;
    p.xCount = xCount;
    p.tensCount = tensCount; // Stat untuk sorting
    p.xPlusTensCount = xPlusTensCount; // Stat untuk display
  }

  function render() {
    playersEl.innerHTML = '';
    state.competitors.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'player' + (p.id === state.selectedId ? ' selected' : '');
      
      const currentEndArrows = p.scores[state.currentEnd] || Array(arrowsPerEndFixed).fill(null);
      let currentArrowsHtml = '';

      for (let i = 0; i < arrowsPerEndFixed; i++) {
        const arrow = currentEndArrows[i];
        
        let arrowDisplay = '&nbsp;';
        let arrowClass = 'empty';
        let scoreClass = ''; 

        if (arrow) {
          if (arrow.isM) {
            arrowDisplay = 'M';
            arrowClass = 'filled miss';
          } else if (arrow.isX && (mode === '10zone' || mode === '6zone')) {
            arrowDisplay = 'X';
            arrowClass = 'filled';
            scoreClass = 'score-x'; 
          } else {
            arrowDisplay = arrow.score;
            arrowClass = 'filled';
            scoreClass = 'score-' + arrow.score; 
          }
        }
        
        currentArrowsHtml += `<div class="arrow-box ${arrowClass} ${scoreClass}" data-index="${i}">
          ${arrowDisplay}</div>`;
      }

      const metaDisplay = (mode === '10zone' || mode === '6zone') ?
        `Total: ${p.total} • X+10: ${p.xPlusTensCount} • X: ${p.xCount}` :
        `Total: ${p.total}`;

      div.innerHTML = `
        <button class="remove-btn" data-action="remove" title="Hapus ${p.name}">×</button> 
        <div class="name">${p.name}</div>
        <div class="meta">${metaDisplay}</div>
        <div class="meta-seri">Skor Seri ${state.currentEnd}:</div>
        <div class="current-arrows">${currentArrowsHtml}</div>
        ${!state.matchEnded && p.id === state.selectedId ? `
          <div class="pad" data-comp="${p.id}">
            ${scoringButtonsByMode[mode].map(s => `<button data-score="${s}">${s}</button>`).join('')}
          </div>` : ''}
      `;

      div.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="remove"]')) {
          if (state.matchEnded) return;
          removeCompetitor(p.id);
          return;
        }

        const arrowBox = e.target.closest('.arrow-box');
        if (arrowBox && arrowBox.classList.contains('filled')) {
          if (state.matchEnded) return;
          if (state.selectedId === p.id)
            removeSpecificArrow(p.id, state.currentEnd, parseInt(arrowBox.dataset.index, 10));
          else { state.selectedId = p.id; render(); }
          return;
        }

        const scoreBtn = e.target.closest('[data-score]');
        if (scoreBtn) { 
          recordScoreManual(scoreBtn.dataset.score); 
          return; 
        }

        if (state.selectedId !== p.id) { 
          state.selectedId = p.id; 
          render();
        }
      });
      playersEl.appendChild(div);
    });

    // Logika Sorting (Total -> X -> 10)
    const sorted = [...state.competitors].sort((a, b) => 
        b.total - a.total || 
        ((mode === '10zone' || mode === '6zone') ? (b.xCount - a.xCount) : 0) || // 1. X
        ((mode === '10zone' || mode === '6zone') ? (b.tensCount - a.tensCount) : 0) || // 2. 10
        a.missCount - b.missCount
    );
    
    leaderboardEl.innerHTML = sorted.map((p, i) => {
        let stats;
        // Tampilan Leaderboard (X+10 dan X)
        if (mode === '10zone' || mode === '6zone') {
          stats = `${p.total} (X+10: ${p.xPlusTensCount}), (X: ${p.xCount})`;
        } else {
          stats = `${p.total}`;
        }
        return `<div class="leader"><div>${i + 1}. ${p.name}</div><div>${stats}</div></div>`
      }).join('');
      
    numCompEl.textContent = state.competitors.length;
    currentEndEl.textContent = state.currentEnd;
  }

  function addCompetitor(name = "Atlet") {
    const existing = state.competitors.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      state.selectedId = existing.id;
      return existing; 
    }

    const id = Date.now() + Math.floor(Math.random() * 1000);
    const newScores = {};
    
    const emptyArrows = Array(arrowsPerEndFixed).fill(null);
    for (let i = 1; i <= maxEnds; i++) newScores[i] = [...emptyArrows];
    
    const newP = { id, name, scores: newScores, total: 0, missCount: 0, xCount: 0, tensCount: 0, xPlusTensCount: 0 };
    
    state.competitors.push(newP);
    state.selectedId = id;
    newName.focus();
    
    return newP;
  }

  function removeCompetitor(id) {
    state.competitors = state.competitors.filter(p => p.id !== id);
    if (state.selectedId === id) state.selectedId = state.competitors[0]?.id || null;
    
    saveState();
    render();
  }

  function removeSpecificArrow(competitorId, end, indexOnCard) {
    const p = state.competitors.find(x => x.id === competitorId);
    if (!p) return;
    p.scores[end][indexOnCard] = null;
    recalculateStats(p);
    
    saveState();
    render();
  }
  
  function recordScoreManual(value) {
    if (!state.selectedId || state.matchEnded) {
      alert('Pilih atlet terlebih dahulu sebelum memasukkan skor.');
      return;
    }
    const p = state.competitors.find(x => x.id === state.selectedId);
    if (!p) return;

    const success = recordScore(p, value);

    if (success) {
      recalculateStats(p);
      
      const finished = state.competitors.filter(c =>
        c.scores[state.currentEnd].every(s => s !== null)
      ).length;

      if (finished === state.competitors.length && state.competitors.length > 0) {
        if (state.currentEnd >= maxEnds) {
          endRound();
        } else {
          state.currentEnd++;
          state.selectedId = null;
          saveState();
        }
      } else {
         saveState();
      }
      
      render();
    }
  }

  function recordScore(p, value) {
    if (!p || state.matchEnded) return false;

    const sValue = String(value);
    const isM = sValue.toUpperCase() === 'M' || sValue === '0';
    const isX = (sValue.toUpperCase() === 'X') && (mode === '10zone' || mode === '6zone');
    
    const numeric = isM ? 0 : (isX ? 10 : Number(value));
    
    if (!isM && !isX && (Number.isNaN(numeric) || numeric < 0)) return false; 

    const currentScores = p.scores[state.currentEnd];
    const emptySlotIndex = currentScores.findIndex(s => s === null);
    
    if (emptySlotIndex === -1) { 
       alert(`Skor Seri ${state.currentEnd} untuk ${p.name} sudah penuh (${arrowsPerEndFixed} panah).`); 
       return false; // Gagal
    }

    const arrow = { 
      end: state.currentEnd, 
      score: numeric, 
      isM: isM, 
      isX: isX
    };
    currentScores[emptySlotIndex] = arrow;
    return true; // Sukses
  }

  function fillMissesForEnd(endNumber) {
    let changed = false;
    state.competitors.forEach(p => {
      const currentScores = p.scores[endNumber];
      for (let i = 0; i < arrowsPerEndFixed; i++) {
        if (currentScores[i] === null) {
          currentScores[i] = { end: endNumber, score: 0, isM: true, isX: false };
          changed = true;
        }
      }
      if(changed) recalculateStats(p);
    });
    if(changed) saveState();
  }

  function resetRound() {
    if (!confirm('Reset semua skor? (Nama atlet akan tetap ada)')) return;
    
    const emptyArrows = Array(arrowsPerEndFixed).fill(null);
    
    state.competitors.forEach(p => {
        const newScores = {};
        for (let i = 1; i <= maxEnds; i++) {
          newScores[i] = [...emptyArrows];
        }
        
        p.scores = newScores;
        p.total = 0;
        p.missCount = 0;
        p.xCount = 0;
        p.tensCount = 0;
        p.xPlusTensCount = 0;
    });

    state.selectedId = null;
    state.currentEnd = 1;
    state.matchEnded = false;
    
    endBtn.classList.remove('done');    
    endBtn.textContent = 'Akhiri Sesi'; 
    
    saveState();
    render();
  }

  function endRound() {
    if (!state.matchEnded) {
      fillMissesForEnd(state.currentEnd);
      for (let i = state.currentEnd; i <= maxEnds; i++) fillMissesForEnd(i);
      state.matchEnded = true;
      state.selectedId = null;
      endBtn.textContent = 'Sesi Selesai';
      endBtn.classList.add('done');
      state.currentEnd = maxEnds;
      
      saveState();
      render();
    }
  }

  function nextEnd() {
    if (!state.matchEnded) {
      fillMissesForEnd(state.currentEnd);
      if (state.currentEnd >= maxEnds) { endRound(); return; }
      state.currentEnd++;
    } else if (state.currentEnd < maxEnds) state.currentEnd++;
    state.selectedId = null;
    
    saveState();
    render();
  }

  function prevEnd() {
    if (state.currentEnd <= 1) return;
    state.currentEnd--;
    state.selectedId = null;
    
    saveState();
    render();
  }

  addFromInput.addEventListener('click', () => {
    if (state.matchEnded) return;
    const name = (newName.value || '').trim();
    if (!name) { alert('Nama atlet kosong.'); return; }
    addCompetitor(name);
    
    saveState();
    render();
    newName.value = ''; 
  });

  exportBtn.addEventListener('click', () => { exportCSV(); state.selectedId = null; render(); });
  resetBtn.addEventListener('click', resetRound);
  
  endBtn.addEventListener('click', () => {
    if (state.competitors.length === 0) return alert('Data belum terisi'); 
    if (!state.matchEnded && confirm('Akhiri sesi sekarang? Skor akan terkunci dan tidak dapat diubah (skor kosong akan terisi M)')) endRound();
  });

  nextEndBtn.addEventListener('click', () => {
    if (state.competitors.length === 0) return alert('Data belum terisi');
    if (state.currentEnd === maxEnds) return;
    nextEnd();
  });

  prevEndBtn.addEventListener('click', prevEnd);

  backToChoose.addEventListener('click', () => {
    if (!confirm('Kembali ke pemilihan mode? Pengaturan tidak tersimpan.')) return;
    localStorage.removeItem('targetMode');
    localStorage.removeItem('archeryState');
    localStorage.removeItem('arrowsPerEnd'); 
    localStorage.removeItem('targetDistance');
    window.location.href = 'index.html';
  });

  window.addEventListener('keydown', (e) => {
    if (document.activeElement === newName) {
      if (e.key === 'Enter') { e.preventDefault(); addFromInput.click(); }
      return;
    }
    if (state.matchEnded) return;

    if (!state.selectedId) {
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault(); 
      
      const p = state.competitors.find(x => x.id === state.selectedId);
      if (!p) return;

      const currentScores = p.scores[state.currentEnd];
      
      let lastFilledIndex = -1;
      for (let i = currentScores.length - 1; i >= 0; i--) {
        if (currentScores[i] !== null) {
          lastFilledIndex = i;
          break;
        }
      }
      
      if (lastFilledIndex !== -1) {
        removeSpecificArrow(p.id, state.currentEnd, lastFilledIndex);
      }
      return; 
    }

    const key = e.key.toUpperCase();
    if (key === '0') return recordScoreManual('0');
    if (scoringButtonsByMode[mode].includes(key)) recordScoreManual(key);
  });

  function exportCSV() {
    const headers = ['Nama']; 
    for (let i = 1; i <= maxEnds; i++) {
      headers.push(`R${i}`);
    }
    headers.push('Total');
    
    if (mode === '10zone' || mode === '6zone') {
      headers.push('X+10'); 
      headers.push('X'); 
    }

    // Sorting (Total -> X -> 10)
    const sortedCompetitors = [...state.competitors].sort((a, b) => 
        b.total - a.total || 
        ((mode === '10zone' || mode === '6zone') ? (b.xCount - a.xCount) : 0) ||
        ((mode === '10zone' || mode === '6zone') ? (b.tensCount - a.tensCount) : 0) ||
        a.missCount - b.missCount
    );

    const rows = sortedCompetitors.map(p => {
      const rowData = [];
      rowData.push(`"${p.name}"`); 

      for (let end = 1; end <= maxEnds; end++) {
        let rambahanTotal = 0;
        const arrowsInEnd = p.scores[end]; 
        
        if (arrowsInEnd) {
          arrowsInEnd.forEach(arrow => {
            if (arrow) {
              rambahanTotal += arrow.score;
            }
          });
        }
        rowData.push(rambahanTotal);
      }

      rowData.push(p.total);
      if (mode === '10zone' || mode === '6zone') {
        rowData.push(p.xPlusTensCount); 
        rowData.push(p.xCount); 
      }
      
      return rowData.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scoring_result.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (clockEl) {
    const updateClock = () => {
      clockEl.textContent = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };
    setInterval(updateClock, 1000);
    updateClock();
  }

  loadState();
  render(); 
});