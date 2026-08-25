/**
 * GlowCalc - Modern Glassmorphism Calculator
 * Complete Engine: Standard, Scientific, Age & Unit Modes with Audio Feedback
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- APP STATE ---
    let currentTab = 'standard'; // 'standard', 'scientific', 'age', 'unit'
    let isDegMode = true; // DEG vs RAD for trig functions
    let soundEnabled = JSON.parse(localStorage.getItem('glow_calc_sound') ?? 'true');
    let history = JSON.parse(localStorage.getItem('omni_calc_history') || '[]');

    // Standard Calc State
    let stdCurrentInput = '0';
    let stdExpression = '';
    let stdResetOnNextInput = false;

    // Scientific Calc State
    let sciExpression = '';
    let sciResetOnNextInput = false;

    // DOM Elements
    const mainCalculator = document.getElementById('main-calculator');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const historyToggleBtn = document.getElementById('history-toggle-btn');
    const historyPanel = document.getElementById('history-panel');
    const historyBackdrop = document.getElementById('history-backdrop');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyBadge = document.getElementById('history-badge');
    const toastFeedback = document.getElementById('toast-feedback');
    const toastText = document.getElementById('toast-text');

    const tabBtns = document.querySelectorAll('.mode-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Display elements
    const stdScreen = document.getElementById('std-screen');
    const stdDisplay = document.getElementById('std-display');
    const stdExpressionEl = document.getElementById('std-expression');
    const sciScreen = document.getElementById('sci-screen');
    const sciDisplay = document.getElementById('sci-display');
    const sciExpressionEl = document.getElementById('sci-expression');
    const angleModeBtn = document.getElementById('angle-mode-btn');

    // Age elements
    const dobInput = document.getElementById('dob-input');
    const targetDateInput = document.getElementById('target-date-input');
    const calcAgeBtn = document.getElementById('calc-age-btn');

    // Unit Converter elements
    const categoryChips = document.querySelectorAll('.category-chip');
    const unitFromSelect = document.getElementById('unit-from-select');
    const unitToSelect = document.getElementById('unit-to-select');
    const unitFromInput = document.getElementById('unit-from-val');
    const unitToVal = document.getElementById('unit-to-val');
    const swapUnitsBtn = document.getElementById('swap-units-btn');
    const unitFormulaBadge = document.getElementById('unit-formula-badge');
    const unitResultContainer = document.getElementById('unit-result-container');
    const copyUnitResultBtn = document.getElementById('copy-unit-result-btn');
    const unitGridSubtitle = document.getElementById('unit-grid-subtitle');
    const unitAllGrid = document.getElementById('unit-all-grid');

    // Default Dates for Age Calc
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (targetDateInput) targetDateInput.value = todayStr;

    // Set default DOB to 2000-01-01 if empty
    if (dobInput && !dobInput.value) {
        dobInput.value = '2000-01-01';
    }

    // --- SYNTHESIZED AUDIO FEEDBACK (Web Audio API) ---
    let audioCtx = null;
    function playClickSound(freq = 600, type = 'sine') {
        if (!soundEnabled) return;
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioCtx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.045);
        } catch (e) {
            // Audio context not allowed or supported
        }
    }

    function updateSoundBtnUI() {
        if (!soundToggleBtn) return;
        const onIcon = soundToggleBtn.querySelector('.sound-on-icon');
        const offIcon = soundToggleBtn.querySelector('.sound-off-icon');
        if (onIcon && offIcon) {
            onIcon.style.display = soundEnabled ? 'block' : 'none';
            offIcon.style.display = soundEnabled ? 'none' : 'block';
        }
    }
    updateSoundBtnUI();

    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            localStorage.setItem('glow_calc_sound', JSON.stringify(soundEnabled));
            updateSoundBtnUI();
            showToast(soundEnabled ? 'Sound feedback ON' : 'Sound feedback OFF');
            if (soundEnabled) playClickSound(700);
        });
    }

    // --- THEME MANAGEMENT ---
    const savedTheme = localStorage.getItem('omni_calc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const activeTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('omni_calc_theme', newTheme);
            playClickSound(850);
        });
    }

    // --- TOAST HELPER ---
    let toastTimeout;
    function showToast(message) {
        if (!toastFeedback) return;
        if (toastText) {
            toastText.textContent = message;
        } else {
            toastFeedback.textContent = message;
        }
        toastFeedback.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastFeedback.classList.remove('show');
        }, 1900);
    }

    // --- COPY TO CLIPBOARD ---
    function copyDisplayValue(val) {
        if (!val || val === '0' || val === 'Error' || val === '–') return;
        navigator.clipboard.writeText(val).then(() => {
            showToast('Copied to clipboard');
            playClickSound(900);
        }).catch(() => {
            showToast('Unable to copy');
        });
    }

    if (stdScreen) {
        stdScreen.addEventListener('click', () => {
            copyDisplayValue(stdCurrentInput);
        });
    }

    if (sciScreen) {
        sciScreen.addEventListener('click', () => {
            copyDisplayValue(sciDisplay.textContent.trim());
        });
    }

    if (copyUnitResultBtn) {
        copyUnitResultBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (unitToVal) copyDisplayValue(unitToVal.textContent.trim());
        });
    }

    if (unitResultContainer) {
        unitResultContainer.addEventListener('click', () => {
            if (unitToVal) copyDisplayValue(unitToVal.textContent.trim());
        });
    }

    // --- HISTORY OVERLAY DRAWER ---
    function openHistory() {
        historyPanel.classList.add('open');
        historyPanel.setAttribute('aria-hidden', 'false');
        historyBackdrop.classList.add('active');
        playClickSound(550);
    }

    function closeHistory() {
        historyPanel.classList.remove('open');
        historyPanel.setAttribute('aria-hidden', 'true');
        historyBackdrop.classList.remove('active');
    }

    if (historyToggleBtn) {
        historyToggleBtn.addEventListener('click', () => {
            if (historyPanel.classList.contains('open')) {
                closeHistory();
            } else {
                openHistory();
            }
        });
    }

    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistory);
    if (historyBackdrop) historyBackdrop.addEventListener('click', closeHistory);

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            history = [];
            localStorage.removeItem('omni_calc_history');
            renderHistory();
            updateHistoryBadge();
            showToast('History cleared');
            playClickSound(400);
        });
    }

    function updateHistoryBadge() {
        if (!historyBadge) return;
        historyBadge.style.display = history.length > 0 ? 'block' : 'none';
    }

    function saveHistoryItem(expression, result) {
        if (!expression || result === 'Error') return;
        const item = { expression, result, timestamp: Date.now() };
        history.unshift(item);
        if (history.length > 50) history.pop();
        localStorage.setItem('omni_calc_history', JSON.stringify(history));
        renderHistory();
        updateHistoryBadge();
    }

    function renderHistory() {
        if (!historyList) return;
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <span class="empty-icon">⏳</span>
                    <span>No calculations yet</span>
                </div>
            `;
            return;
        }

        historyList.innerHTML = history.map((item) => `
            <div class="history-item glass-subcard" data-res="${escapeHtml(item.result)}">
                <div class="history-expr">${escapeHtml(item.expression)} =</div>
                <div class="history-res">${escapeHtml(item.result)}</div>
            </div>
        `).join('');

        // Click to reuse history result
        historyList.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', () => {
                const res = el.getAttribute('data-res');
                if (currentTab === 'standard') {
                    stdCurrentInput = res;
                    stdResetOnNextInput = true;
                    updateStdDisplay();
                } else if (currentTab === 'scientific') {
                    sciExpression += res;
                    updateSciDisplay();
                }
                closeHistory();
                showToast(`Loaded ${res}`);
                playClickSound(700);
            });
        });
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    renderHistory();
    updateHistoryBadge();

    // --- TAB SWITCHING ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
            playClickSound(650);
        });
    });

    function switchTab(tabName) {
        currentTab = tabName;
        tabBtns.forEach(b => {
            const isTarget = b.getAttribute('data-tab') === tabName;
            b.classList.toggle('active', isTarget);
            b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        });
        tabPanels.forEach(p => {
            p.classList.toggle('active', p.id === `tab-${tabName}`);
        });

        // Responsive container sizing classes
        mainCalculator.classList.remove('mode-scientific', 'mode-age', 'mode-unit');
        if (tabName === 'scientific') {
            mainCalculator.classList.add('mode-scientific');
        } else if (tabName === 'age') {
            mainCalculator.classList.add('mode-age');
            calculateAge();
        } else if (tabName === 'unit') {
            mainCalculator.classList.add('mode-unit');
            updateUnitConversions();
        }
    }

    // --- ANGLE MODE (DEG/RAD) ---
    if (angleModeBtn) {
        angleModeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isDegMode = !isDegMode;
            angleModeBtn.textContent = isDegMode ? 'DEG' : 'RAD';
            showToast(`Angle mode: ${isDegMode ? 'Degrees' : 'Radians'}`);
            playClickSound(750);
        });
    }

    // --- DYNAMIC FONT SIZING HELPER ---
    function adjustFontSize(element, text) {
        if (!element) return;
        const len = text.length;
        if (len > 15) {
            element.style.fontSize = '1.35rem';
        } else if (len > 11) {
            element.style.fontSize = '1.75rem';
        } else if (len > 8) {
            element.style.fontSize = '2.15rem';
        } else {
            element.style.fontSize = '';
        }
    }

    // --- STANDARD CALCULATOR LOGIC ---
    function updateStdDisplay() {
        const formatted = formatNumber(stdCurrentInput);
        stdDisplay.textContent = formatted;
        stdExpressionEl.textContent = stdExpression || '\u00A0';
        adjustFontSize(stdDisplay, formatted);
    }

    function handleStdAction(action, value) {
        if (action === 'clear') {
            stdCurrentInput = '0';
            stdExpression = '';
            stdResetOnNextInput = false;
            playClickSound(420);
        } else if (action === 'backspace') {
            if (stdResetOnNextInput) {
                stdCurrentInput = '0';
                stdResetOnNextInput = false;
            } else if (stdCurrentInput.length > 1) {
                stdCurrentInput = stdCurrentInput.slice(0, -1);
                if (stdCurrentInput === '-' || stdCurrentInput === '-0') stdCurrentInput = '0';
            } else {
                stdCurrentInput = '0';
            }
            playClickSound(480);
        } else if (action === 'percent') {
            const val = parseFloat(stdCurrentInput);
            if (!isNaN(val)) {
                stdCurrentInput = String(val / 100);
            }
            playClickSound(580);
        } else if (action === 'negate') {
            if (stdCurrentInput !== '0') {
                if (stdCurrentInput.startsWith('-')) {
                    stdCurrentInput = stdCurrentInput.slice(1);
                } else {
                    stdCurrentInput = '-' + stdCurrentInput;
                }
            }
            playClickSound(580);
        } else if (action === 'operator') {
            if (stdResetOnNextInput && stdExpression.endsWith('=')) {
                stdExpression = `${stdCurrentInput} ${value}`;
            } else {
                stdExpression += ` ${stdCurrentInput} ${value}`;
            }
            stdResetOnNextInput = true;
            playClickSound(640);
        } else if (action === 'equals') {
            if (!stdExpression || stdExpression.includes('=')) return;
            const fullExpr = `${stdExpression} ${stdCurrentInput}`;
            try {
                const evaluated = evaluateSimpleExpression(fullExpr);
                saveHistoryItem(fullExpr, String(evaluated));
                stdExpression = `${fullExpr} =`;
                stdCurrentInput = String(evaluated);
                stdResetOnNextInput = true;
                playClickSound(800, 'triangle');
            } catch (err) {
                stdCurrentInput = 'Error';
                stdResetOnNextInput = true;
                playClickSound(300, 'sawtooth');
            }
        }
        updateStdDisplay();
    }

    function handleStdNumber(val) {
        if (stdResetOnNextInput) {
            if (stdExpression.endsWith('=')) {
                stdExpression = '';
            }
            stdCurrentInput = (val === '.') ? '0.' : val;
            stdResetOnNextInput = false;
        } else {
            if (val === '.') {
                if (!stdCurrentInput.includes('.')) {
                    stdCurrentInput += '.';
                }
            } else {
                if (stdCurrentInput === '0') {
                    stdCurrentInput = val;
                } else {
                    if (stdCurrentInput.length < 16) {
                        stdCurrentInput += val;
                    }
                }
            }
        }
        playClickSound(520);
        updateStdDisplay();
    }

    // Attach listeners to Standard Keypad
    document.querySelectorAll('#tab-standard .key').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            const value = btn.getAttribute('data-value');
            if (action === 'operator' || action === 'clear' || action === 'backspace' || action === 'percent' || action === 'negate' || action === 'equals') {
                handleStdAction(action, value);
            } else {
                handleStdNumber(value || btn.textContent.trim());
            }
            triggerButtonFeedback(btn);
        });
    });

    function evaluateSimpleExpression(exprStr) {
        let clean = exprStr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
        const tokens = clean.trim().split(/\s+/);
        if (tokens.length === 0) return 0;
        
        let result = parseFloat(tokens[0]);
        for (let i = 1; i < tokens.length; i += 2) {
            const op = tokens[i];
            const nextVal = parseFloat(tokens[i+1]);
            if (isNaN(nextVal)) continue;
            
            if (op === '+') result += nextVal;
            else if (op === '-') result -= nextVal;
            else if (op === '*') result *= nextVal;
            else if (op === '/') {
                if (nextVal === 0) throw new Error('Division by zero');
                result /= nextVal;
            }
        }
        return Number.isInteger(result) ? result : parseFloat(result.toFixed(10));
    }

    // --- SCIENTIFIC CALCULATOR LOGIC ---
    function updateSciDisplay() {
        const text = sciExpression ? formatSciExpression(sciExpression) : '0';
        sciDisplay.textContent = text;
        sciExpressionEl.textContent = sciExpression ? '' : '\u00A0';
        adjustFontSize(sciDisplay, text);
    }

    function formatSciExpression(expr) {
        return expr.replace(/\*/g, '×')
                   .replace(/\//g, '÷')
                   .replace(/-/g, '−')
                   .replace(/sqrt\(/g, '√(')
                   .replace(/cbrt\(/g, '³√(')
                   .replace(/pi/g, 'π');
    }

    document.querySelectorAll('#tab-scientific .key').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            const val = btn.getAttribute('data-value');
            
            if (sciResetOnNextInput && action !== 'sci-op' && action !== 'operator' && action !== 'equals') {
                sciExpression = '';
                sciResetOnNextInput = false;
            }

            if (action === 'clear') {
                sciExpression = '';
                sciResetOnNextInput = false;
                playClickSound(420);
            } else if (action === 'backspace') {
                if (sciResetOnNextInput) {
                    sciExpression = '';
                    sciResetOnNextInput = false;
                } else if (sciExpression.length > 0) {
                    const funcs = ['asin(', 'acos(', 'atan(', 'sqrt(', 'cbrt(', 'fact(', 'sin(', 'cos(', 'tan(', 'log(', 'abs(', 'EXP('];
                    let deleted = false;
                    for (const f of funcs) {
                        if (sciExpression.endsWith(f)) {
                            sciExpression = sciExpression.slice(0, -f.length);
                            deleted = true;
                            break;
                        }
                    }
                    if (!deleted) {
                        sciExpression = sciExpression.slice(0, -1);
                    }
                }
                playClickSound(480);
            } else if (action === 'sci-func') {
                if (val === 'sqr') {
                    sciExpression += '^2';
                } else if (val === 'inv') {
                    sciExpression += '^( -1)';
                } else {
                    sciExpression += `${val}(`;
                }
                playClickSound(600);
            } else if (action === 'sci-const') {
                sciExpression += val;
                playClickSound(550);
            } else if (action === 'sci-op' || action === 'operator') {
                sciResetOnNextInput = false;
                sciExpression += ` ${val} `;
                playClickSound(640);
            } else if (action === 'insert') {
                sciExpression += val;
                playClickSound(580);
            } else if (action === 'equals') {
                if (!sciExpression) return;
                try {
                    const result = parseAndEvaluateSci(sciExpression, isDegMode);
                    saveHistoryItem(sciExpression, String(result));
                    sciExpression = String(result);
                    sciResetOnNextInput = true;
                    playClickSound(800, 'triangle');
                } catch (e) {
                    sciDisplay.textContent = 'Error';
                    sciResetOnNextInput = true;
                    playClickSound(300, 'sawtooth');
                    return;
                }
            } else if (action === 'negate') {
                if (sciExpression.startsWith('-')) {
                    sciExpression = sciExpression.substring(1);
                } else {
                    sciExpression = '-' + sciExpression;
                }
                playClickSound(580);
            } else if (action === 'percent') {
                sciExpression += '/100';
                playClickSound(580);
            } else {
                // Numbers
                sciExpression += (val || btn.textContent.trim());
                playClickSound(520);
            }

            updateSciDisplay();
            triggerButtonFeedback(btn);
        });
    });

    // Scientific Expression Evaluator
    function parseAndEvaluateSci(exprStr, inDegMode) {
        let clean = exprStr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');

        clean = clean.replace(/(\d|\))\s*(sin|cos|tan|asin|acos|atan|ln|log|sqrt|cbrt|fact|abs|pi|e)\b/gi, '$1*$2');
        clean = clean.replace(/(\d|\))\s*\(/g, '$1*(');
        clean = clean.replace(/\)\s*(\d)/g, ')*$1');

        clean = clean.replace(/pi/g, `(${Math.PI})`);
        clean = clean.replace(/\be\b/g, `(${Math.E})`);
        clean = clean.replace(/EXP\(/g, '*10^(');

        clean = clean.replace(/(\d+(\.\d+)?|fact\([^)]+\)|[a-z]+\([^)]+\))\!/g, (match, p1) => {
            return `fact(${p1})`;
        });

        const degToRad = (val) => inDegMode ? (val * Math.PI / 180) : val;
        const radToDeg = (val) => inDegMode ? (val * 180 / Math.PI) : val;

        function factorial(n) {
            if (n < 0) return NaN;
            if (n === 0 || n === 1) return 1;
            let res = 1;
            for (let i = 2; i <= Math.floor(n); i++) res *= i;
            return res;
        }

        function evaluateSubExpr(str) {
            const mathFuncs = {
                'sin': (x) => Math.sin(degToRad(x)),
                'cos': (x) => Math.cos(degToRad(x)),
                'tan': (x) => Math.tan(degToRad(x)),
                'asin': (x) => radToDeg(Math.asin(x)),
                'acos': (x) => radToDeg(Math.acos(x)),
                'atan': (x) => radToDeg(Math.atan(x)),
                'ln': (x) => Math.log(x),
                'log': (x) => Math.log10(x),
                'sqrt': (x) => Math.sqrt(x),
                'cbrt': (x) => Math.cbrt(x),
                'fact': (x) => factorial(x),
                'abs': (x) => Math.abs(x)
            };

            while (str.includes('(')) {
                let openIdx = str.lastIndexOf('(');
                let closeIdx = str.indexOf(')', openIdx);
                if (closeIdx === -1) throw new Error('Unbalanced parenthesis');

                let inner = str.slice(openIdx + 1, closeIdx);
                let funcMatch = str.slice(0, openIdx).match(/([a-z]+)$/i);
                
                let val = evaluateSubExpr(inner);

                if (funcMatch) {
                    let funcName = funcMatch[1].toLowerCase();
                    if (mathFuncs[funcName]) {
                        val = mathFuncs[funcName](val);
                        str = str.slice(0, openIdx - funcName.length) + val + str.slice(closeIdx + 1);
                    } else {
                        str = str.slice(0, openIdx) + val + str.slice(closeIdx + 1);
                    }
                } else {
                    str = str.slice(0, openIdx) + val + str.slice(closeIdx + 1);
                }
            }

            while (str.includes('^')) {
                let parts = str.split('^');
                let left = evaluateSubExpr(parts[0]);
                let right = evaluateSubExpr(parts.slice(1).join('^'));
                return Math.pow(left, right);
            }

            if (!/^[0-9+*\/\-\.\s\eE]+$/.test(str)) {
                throw new Error('Invalid math expression');
            }

            return Function(`"use strict"; return (${str})`)();
        }

        const rawResult = evaluateSubExpr(clean);
        if (isNaN(rawResult) || !isFinite(rawResult)) {
            throw new Error('Invalid calculation');
        }

        return Number.isInteger(rawResult) ? rawResult : parseFloat(rawResult.toFixed(10));
    }

    // --- AGE CALCULATOR LOGIC ---
    function calculateAge() {
        if (!dobInput || !targetDateInput) return;
        const dobVal = dobInput.value;
        const targetVal = targetDateInput.value;

        if (!dobVal || !targetVal) {
            showToast('Please select both dates');
            return;
        }

        const dob = new Date(dobVal + 'T00:00:00');
        const target = new Date(targetVal + 'T00:00:00');

        if (dob > target) {
            showToast('Birth date cannot be in future');
            return;
        }

        let years = target.getFullYear() - dob.getFullYear();
        let months = target.getMonth() - dob.getMonth();
        let days = target.getDate() - dob.getDate();

        if (days < 0) {
            months -= 1;
            const prevMonthDate = new Date(target.getFullYear(), target.getMonth(), 0);
            days += prevMonthDate.getDate();
        }

        if (months < 0) {
            years -= 1;
            months += 12;
        }

        document.getElementById('age-years').textContent = years;
        document.getElementById('age-months').textContent = months;
        document.getElementById('age-days').textContent = days;

        const diffMs = target - dob;
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const totalWeeks = Math.floor(totalDays / 7);
        const totalMonths = (years * 12) + months;
        const totalHours = totalDays * 24;
        const totalMinutes = totalHours * 60;

        document.getElementById('stat-total-months').textContent = totalMonths.toLocaleString();
        document.getElementById('stat-total-weeks').textContent = totalWeeks.toLocaleString();
        document.getElementById('stat-total-days').textContent = totalDays.toLocaleString();
        document.getElementById('stat-total-hours').textContent = totalHours.toLocaleString();
        document.getElementById('stat-total-minutes').textContent = totalMinutes.toLocaleString();

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        document.getElementById('stat-dob-day').textContent = daysOfWeek[dob.getDay()];

        let nextBdayYear = target.getFullYear();
        let nextBday = new Date(nextBdayYear, dob.getMonth(), dob.getDate());

        if (nextBday < target) {
            nextBday.setFullYear(nextBdayYear + 1);
        }

        const daysUntilNextBday = Math.ceil((nextBday - target) / (1000 * 60 * 60 * 24));
        const nextBdayDayName = daysOfWeek[nextBday.getDay()];

        if (daysUntilNextBday === 0) {
            document.getElementById('next-bday-text').textContent = `🎉 Today is your birthday!`;
        } else {
            document.getElementById('next-bday-text').textContent = `${daysUntilNextBday} day${daysUntilNextBday > 1 ? 's' : ''} left (${nextBdayDayName}, ${nextBday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;
        }
    }

    if (calcAgeBtn) {
        calcAgeBtn.addEventListener('click', () => {
            calculateAge();
            playClickSound(720);
        });
    }
    if (dobInput) dobInput.addEventListener('change', calculateAge);
    if (targetDateInput) targetDateInput.addEventListener('change', calculateAge);

    // --- UNIT CONVERTER DATA & ENGINE ---
    const UNIT_DEFINITIONS = {
        length: {
            name: 'Length',
            base: 'm',
            units: [
                { id: 'm', name: 'Meters', symbol: 'm', factor: 1 },
                { id: 'km', name: 'Kilometers', symbol: 'km', factor: 1000 },
                { id: 'cm', name: 'Centimeters', symbol: 'cm', factor: 0.01 },
                { id: 'mm', name: 'Millimeters', symbol: 'mm', factor: 0.001 },
                { id: 'in', name: 'Inches', symbol: 'in', factor: 0.0254 },
                { id: 'ft', name: 'Feet', symbol: 'ft', factor: 0.3048 },
                { id: 'yd', name: 'Yards', symbol: 'yd', factor: 0.9144 },
                { id: 'mi', name: 'Miles', symbol: 'mi', factor: 1609.344 },
                { id: 'nmi', name: 'Nautical Miles', symbol: 'NM', factor: 1852 }
            ]
        },
        mass: {
            name: 'Mass',
            base: 'kg',
            units: [
                { id: 'kg', name: 'Kilograms', symbol: 'kg', factor: 1 },
                { id: 'g', name: 'Grams', symbol: 'g', factor: 0.001 },
                { id: 'mg', name: 'Milligrams', symbol: 'mg', factor: 0.000001 },
                { id: 'lb', name: 'Pounds', symbol: 'lbs', factor: 0.45359237 },
                { id: 'oz', name: 'Ounces', symbol: 'oz', factor: 0.028349523125 },
                { id: 'st', name: 'Stone', symbol: 'st', factor: 6.35029318 },
                { id: 't', name: 'Metric Ton', symbol: 't', factor: 1000 }
            ]
        },
        temperature: {
            name: 'Temperature',
            isSpecial: true,
            units: [
                { id: 'c', name: 'Celsius', symbol: '°C' },
                { id: 'f', name: 'Fahrenheit', symbol: '°F' },
                { id: 'k', name: 'Kelvin', symbol: 'K' }
            ]
        },
        area: {
            name: 'Area',
            base: 'sqm',
            units: [
                { id: 'sqm', name: 'Square Meters', symbol: 'm²', factor: 1 },
                { id: 'sqkm', name: 'Square Kilometers', symbol: 'km²', factor: 1000000 },
                { id: 'sqft', name: 'Square Feet', symbol: 'ft²', factor: 0.09290304 },
                { id: 'sqyd', name: 'Square Yards', symbol: 'yd²', factor: 0.83612736 },
                { id: 'acre', name: 'Acres', symbol: 'ac', factor: 4046.8564224 },
                { id: 'ha', name: 'Hectares', symbol: 'ha', factor: 10000 },
                { id: 'sqmi', name: 'Square Miles', symbol: 'mi²', factor: 2589988.110336 }
            ]
        },
        volume: {
            name: 'Volume',
            base: 'l',
            units: [
                { id: 'l', name: 'Liters', symbol: 'L', factor: 1 },
                { id: 'ml', name: 'Milliliters', symbol: 'mL', factor: 0.001 },
                { id: 'm3', name: 'Cubic Meters', symbol: 'm³', factor: 1000 },
                { id: 'gal', name: 'Gallons (US)', symbol: 'gal', factor: 3.785411784 },
                { id: 'qt', name: 'Quarts (US)', symbol: 'qt', factor: 0.946352946 },
                { id: 'pt', name: 'Pints (US)', symbol: 'pt', factor: 0.473176473 },
                { id: 'cup', name: 'Cups (US)', symbol: 'cup', factor: 0.2365882365 },
                { id: 'floz', name: 'Fluid Ounces (US)', symbol: 'fl oz', factor: 0.0295735295625 }
            ]
        },
        speed: {
            name: 'Speed',
            base: 'mps',
            units: [
                { id: 'mps', name: 'Meters / second', symbol: 'm/s', factor: 1 },
                { id: 'kph', name: 'Kilometers / hour', symbol: 'km/h', factor: 0.2777777778 },
                { id: 'mph', name: 'Miles / hour', symbol: 'mph', factor: 0.44704 },
                { id: 'knot', name: 'Knots', symbol: 'kn', factor: 0.5144444444 },
                { id: 'fps', name: 'Feet / second', symbol: 'ft/s', factor: 0.3048 }
            ]
        },
        time: {
            name: 'Time',
            base: 's',
            units: [
                { id: 's', name: 'Seconds', symbol: 's', factor: 1 },
                { id: 'ms', name: 'Milliseconds', symbol: 'ms', factor: 0.001 },
                { id: 'min', name: 'Minutes', symbol: 'min', factor: 60 },
                { id: 'h', name: 'Hours', symbol: 'h', factor: 3600 },
                { id: 'd', name: 'Days', symbol: 'd', factor: 86400 },
                { id: 'wk', name: 'Weeks', symbol: 'wk', factor: 604800 },
                { id: 'yr', name: 'Years (365d)', symbol: 'yr', factor: 31536000 }
            ]
        },
        data: {
            name: 'Data',
            base: 'B',
            units: [
                { id: 'B', name: 'Bytes', symbol: 'B', factor: 1 },
                { id: 'KB', name: 'Kilobytes', symbol: 'KB', factor: 1024 },
                { id: 'MB', name: 'Megabytes', symbol: 'MB', factor: 1048576 },
                { id: 'GB', name: 'Gigabytes', symbol: 'GB', factor: 1073741824 },
                { id: 'TB', name: 'Terabytes', symbol: 'TB', factor: 1099511627776 },
                { id: 'bit', name: 'Bits', symbol: 'b', factor: 0.125 }
            ]
        },
        energy: {
            name: 'Energy',
            base: 'J',
            units: [
                { id: 'J', name: 'Joules', symbol: 'J', factor: 1 },
                { id: 'kJ', name: 'Kilojoules', symbol: 'kJ', factor: 1000 },
                { id: 'cal', name: 'Calories', symbol: 'cal', factor: 4.184 },
                { id: 'kcal', name: 'Kilocalories', symbol: 'kcal', factor: 4184 },
                { id: 'Wh', name: 'Watt-hours', symbol: 'Wh', factor: 3600 },
                { id: 'kWh', name: 'Kilowatt-hours', symbol: 'kWh', factor: 3600000 },
                { id: 'eV', name: 'Electronvolts', symbol: 'eV', factor: 1.602176634e-19 },
                { id: 'BTU', name: 'BTU', symbol: 'BTU', factor: 1055.05585 }
            ]
        },
        pressure: {
            name: 'Pressure',
            base: 'Pa',
            units: [
                { id: 'Pa', name: 'Pascals', symbol: 'Pa', factor: 1 },
                { id: 'kPa', name: 'Kilopascals', symbol: 'kPa', factor: 1000 },
                { id: 'bar', name: 'Bar', symbol: 'bar', factor: 100000 },
                { id: 'psi', name: 'PSI', symbol: 'psi', factor: 6894.757293168 },
                { id: 'atm', name: 'Standard Atmospheres', symbol: 'atm', factor: 101325 },
                { id: 'torr', name: 'Torr / mmHg', symbol: 'Torr', factor: 133.3223684211 }
            ]
        }
    };

    let activeCategory = 'length';

    function initUnitConverter() {
        // Wire Category Chip Click
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const cat = chip.getAttribute('data-category');
                if (cat === activeCategory) return;
                activeCategory = cat;
                categoryChips.forEach(c => c.classList.toggle('active', c === chip));
                populateUnitDropdowns(cat);
                updateUnitConversions();
                playClickSound(650);
            });
        });

        // Dropdown changes
        if (unitFromSelect) {
            unitFromSelect.addEventListener('change', () => {
                updateUnitConversions();
                playClickSound(550);
            });
        }
        if (unitToSelect) {
            unitToSelect.addEventListener('change', () => {
                updateUnitConversions();
                playClickSound(550);
            });
        }

        // Input value change
        if (unitFromInput) {
            unitFromInput.addEventListener('input', () => {
                updateUnitConversions();
            });
        }

        // Swap units button
        if (swapUnitsBtn) {
            swapUnitsBtn.addEventListener('click', () => {
                const temp = unitFromSelect.value;
                unitFromSelect.value = unitToSelect.value;
                unitToSelect.value = temp;
                updateUnitConversions();
                playClickSound(700);
            });
        }

        populateUnitDropdowns(activeCategory);
        updateUnitConversions();
    }

    function populateUnitDropdowns(catKey) {
        const cat = UNIT_DEFINITIONS[catKey];
        if (!cat || !unitFromSelect || !unitToSelect) return;

        const optionsHtml = cat.units.map((u) => `<option value="${u.id}">${u.name} (${u.symbol})</option>`).join('');

        unitFromSelect.innerHTML = optionsHtml;
        unitToSelect.innerHTML = optionsHtml;

        // Default selections (first and second unit)
        unitFromSelect.selectedIndex = 0;
        unitToSelect.selectedIndex = Math.min(1, cat.units.length - 1);
    }

    function convertUnits(val, fromId, toId, catKey) {
        const cat = UNIT_DEFINITIONS[catKey];
        if (!cat || isNaN(val)) return 0;

        if (catKey === 'temperature') {
            // Temperature Conversion
            let inC = val;
            if (fromId === 'f') inC = (val - 32) * (5 / 9);
            else if (fromId === 'k') inC = val - 273.15;

            if (toId === 'c') return inC;
            if (toId === 'f') return (inC * 9 / 5) + 32;
            if (toId === 'k') return inC + 273.15;
            return inC;
        }

        // Linear Factor Conversion
        const fromUnit = cat.units.find(u => u.id === fromId);
        const toUnit = cat.units.find(u => u.id === toId);
        if (!fromUnit || !toUnit) return 0;

        const inBase = val * fromUnit.factor;
        return inBase / toUnit.factor;
    }

    function formatConvertedValue(val) {
        if (isNaN(val) || !isFinite(val)) return '0';
        if (val === 0) return '0';
        if (Math.abs(val) < 0.000001 || Math.abs(val) >= 1e12) {
            return val.toExponential(5).replace(/\+?0*([0-9]+)$/, '$1');
        }
        return parseFloat(val.toFixed(6)).toString();
    }

    function updateUnitConversions() {
        if (!unitFromSelect || !unitToSelect || !unitFromInput || !unitToVal) return;

        const fromId = unitFromSelect.value;
        const toId = unitToSelect.value;
        const inputVal = parseFloat(unitFromInput.value) || 0;

        const converted = convertUnits(inputVal, fromId, toId, activeCategory);
        const formattedRes = formatConvertedValue(converted);
        unitToVal.textContent = formattedRes;

        // Formula badge
        const cat = UNIT_DEFINITIONS[activeCategory];
        const fromUnit = cat.units.find(u => u.id === fromId);
        const toUnit = cat.units.find(u => u.id === toId);

        if (fromUnit && toUnit && unitFormulaBadge) {
            const oneConverted = convertUnits(1, fromId, toId, activeCategory);
            unitFormulaBadge.textContent = `1 ${fromUnit.symbol} = ${formatConvertedValue(oneConverted)} ${toUnit.symbol}`;
        }

        if (unitGridSubtitle && fromUnit) {
            unitGridSubtitle.textContent = `equivalent to ${inputVal} ${fromUnit.symbol}`;
        }

        // Render All Equivalents Grid
        if (unitAllGrid && cat) {
            unitAllGrid.innerHTML = cat.units.map(u => {
                const eqVal = convertUnits(inputVal, fromId, u.id, activeCategory);
                const isTarget = u.id === toId;
                return `
                    <div class="unit-all-card glass-subcard ${isTarget ? 'is-target' : ''}" data-unit-id="${u.id}">
                        <div class="unit-all-card-top">
                            <span class="unit-all-card-name">${u.name}</span>
                            <span class="unit-all-card-symbol">${u.symbol}</span>
                        </div>
                        <div class="unit-all-card-val gradient-text">${formatConvertedValue(eqVal)}</div>
                    </div>
                `;
            }).join('');

            // Click card to set as 'To' unit
            unitAllGrid.querySelectorAll('.unit-all-card').forEach(card => {
                card.addEventListener('click', () => {
                    const uId = card.getAttribute('data-unit-id');
                    unitToSelect.value = uId;
                    updateUnitConversions();
                    playClickSound(600);
                });
            });
        }
    }

    initUnitConverter();

    // --- HELPER & KEYBOARD HANDLERS ---
    function formatNumber(valStr) {
        if (valStr === 'Error') return 'Error';
        if (valStr.endsWith('.')) return valStr;
        const num = parseFloat(valStr);
        if (isNaN(num)) return valStr;
        
        if (valStr.includes('.') && valStr.split('.')[1].length > 6) {
            return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
        }
        return valStr;
    }

    function triggerButtonFeedback(btn) {
        if (!btn) return;
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 120);
    }

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) return;

        if (e.key === 'Escape') {
            if (historyPanel.classList.contains('open')) {
                closeHistory();
                return;
            }
        }

        const key = e.key;

        if (currentTab === 'standard') {
            if (/^[0-9]$/.test(key)) {
                handleStdNumber(key);
                highlightMatchingKey('#tab-standard', key);
            } else if (key === '.') {
                handleStdNumber('.');
                highlightMatchingKey('#tab-standard', '.');
            } else if (['+', '-', '*', '/'].includes(key)) {
                handleStdAction('operator', key);
                highlightMatchingKey('#tab-standard', key, 'operator');
            } else if (key === 'Enter' || key === '=') {
                e.preventDefault();
                handleStdAction('equals');
                highlightMatchingKey('#tab-standard', '=', 'equals');
            } else if (key === 'Backspace') {
                handleStdAction('backspace');
                highlightMatchingKey('#tab-standard', null, 'backspace');
            } else if (key === 'Escape' || key.toLowerCase() === 'c') {
                handleStdAction('clear');
                highlightMatchingKey('#tab-standard', null, 'clear');
            } else if (key === '%') {
                handleStdAction('percent');
                highlightMatchingKey('#tab-standard', '%', 'percent');
            }
        } else if (currentTab === 'scientific') {
            if (/^[0-9.]$/.test(key)) {
                sciExpression += key;
                updateSciDisplay();
                playClickSound(520);
            } else if (['+', '-', '*', '/', '^', '(', ')'].includes(key)) {
                sciExpression += ` ${key} `;
                updateSciDisplay();
                playClickSound(640);
            } else if (key === 'Enter' || key === '=') {
                e.preventDefault();
                const equalsBtn = document.querySelector('#tab-scientific .key-equals');
                if (equalsBtn) equalsBtn.click();
            } else if (key === 'Backspace') {
                const backBtn = document.querySelector('#tab-scientific [data-action="backspace"]');
                if (backBtn) backBtn.click();
            } else if (key === 'Escape' || key.toLowerCase() === 'c') {
                const clearBtn = document.querySelector('#tab-scientific [data-action="clear"]');
                if (clearBtn) clearBtn.click();
            }
        }
    });

    function highlightMatchingKey(containerSelector, value, action) {
        let selector = '';
        if (action) {
            if (value) {
                selector = `${containerSelector} [data-action="${action}"][data-value="${value}"]`;
            } else {
                selector = `${containerSelector} [data-action="${action}"]`;
            }
        } else if (value) {
            selector = `${containerSelector} [data-value="${value}"]`;
        }
        if (selector) {
            const btn = document.querySelector(selector);
            triggerButtonFeedback(btn);
        }
    }
});
