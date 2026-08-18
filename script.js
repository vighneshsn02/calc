/**
 * Calculator - Simple, Fast, and Modern
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- APP STATE ---
    let currentTab = 'standard'; // 'standard', 'scientific', 'age'
    let isDegMode = true; // DEG vs RAD for trig functions
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
    const historyToggleBtn = document.getElementById('history-toggle-btn');
    const historyPanel = document.getElementById('history-panel');
    const historyBackdrop = document.getElementById('history-backdrop');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyBadge = document.getElementById('history-badge');
    const toastFeedback = document.getElementById('toast-feedback');

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

    // Default Dates for Age Calc
    const todayStr = new Date().toISOString().split('T')[0];
    if (targetDateInput) targetDateInput.value = todayStr;

    // --- THEME MANAGEMENT ---
    const savedTheme = localStorage.getItem('omni_calc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const activeTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('omni_calc_theme', newTheme);
    });

    // --- TOAST HELPER ---
    let toastTimeout;
    function showToast(message) {
        if (!toastFeedback) return;
        toastFeedback.textContent = message;
        toastFeedback.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastFeedback.classList.remove('show');
        }, 1800);
    }

    // --- COPY TO CLIPBOARD ON DISPLAY CLICK ---
    function copyDisplayValue(val) {
        if (!val || val === '0' || val === 'Error') return;
        navigator.clipboard.writeText(val).then(() => {
            showToast('Copied to clipboard');
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

    // --- HISTORY OVERLAY DRAWER ---
    function openHistory() {
        historyPanel.classList.add('open');
        historyPanel.setAttribute('aria-hidden', 'false');
        historyBackdrop.classList.add('active');
    }

    function closeHistory() {
        historyPanel.classList.remove('open');
        historyPanel.setAttribute('aria-hidden', 'true');
        historyBackdrop.classList.remove('active');
    }

    historyToggleBtn.addEventListener('click', () => {
        if (historyPanel.classList.contains('open')) {
            closeHistory();
        } else {
            openHistory();
        }
    });

    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistory);
    if (historyBackdrop) historyBackdrop.addEventListener('click', closeHistory);

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.removeItem('omni_calc_history');
        renderHistory();
        updateHistoryBadge();
        showToast('History cleared');
    });

    function updateHistoryBadge() {
        if (!historyBadge) return;
        if (history.length > 0) {
            historyBadge.style.display = 'block';
        } else {
            historyBadge.style.display = 'none';
        }
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
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">No calculations yet</div>';
            return;
        }

        historyList.innerHTML = history.map((item) => `
            <div class="history-item" data-res="${item.result}">
                <div class="history-expr">${escapeHtml(item.expression)} =</div>
                <div class="history-res">${escapeHtml(item.result)}</div>
            </div>
        `).join('');

        // Click to reuse history result
        document.querySelectorAll('.history-item').forEach(el => {
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

        // Toggle container mode classes for responsive widths
        mainCalculator.classList.remove('mode-scientific', 'mode-age');
        if (tabName === 'scientific') {
            mainCalculator.classList.add('mode-scientific');
        } else if (tabName === 'age') {
            mainCalculator.classList.add('mode-age');
        }
    }

    // --- ANGLE MODE (DEG/RAD) ---
    if (angleModeBtn) {
        angleModeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isDegMode = !isDegMode;
            angleModeBtn.textContent = isDegMode ? 'DEG' : 'RAD';
        });
    }

    // --- DYNAMIC FONT SIZING HELPER ---
    function adjustFontSize(element, text) {
        if (!element) return;
        const len = text.length;
        if (len > 14) {
            element.style.fontSize = '1.4rem';
        } else if (len > 10) {
            element.style.fontSize = '1.8rem';
        } else if (len > 7) {
            element.style.fontSize = '2.1rem';
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
        } else if (action === 'percent') {
            const val = parseFloat(stdCurrentInput);
            if (!isNaN(val)) {
                stdCurrentInput = String(val / 100);
            }
        } else if (action === 'negate') {
            if (stdCurrentInput !== '0') {
                if (stdCurrentInput.startsWith('-')) {
                    stdCurrentInput = stdCurrentInput.slice(1);
                } else {
                    stdCurrentInput = '-' + stdCurrentInput;
                }
            }
        } else if (action === 'operator') {
            if (stdResetOnNextInput && stdExpression.endsWith('=')) {
                stdExpression = `${stdCurrentInput} ${value}`;
            } else {
                stdExpression += ` ${stdCurrentInput} ${value}`;
            }
            stdResetOnNextInput = true;
        } else if (action === 'equals') {
            if (!stdExpression || stdExpression.includes('=')) return;
            const fullExpr = `${stdExpression} ${stdCurrentInput}`;
            try {
                const evaluated = evaluateSimpleExpression(fullExpr);
                saveHistoryItem(fullExpr, String(evaluated));
                stdExpression = `${fullExpr} =`;
                stdCurrentInput = String(evaluated);
                stdResetOnNextInput = true;
            } catch (err) {
                stdCurrentInput = 'Error';
                stdResetOnNextInput = true;
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
            } else if (action === 'sci-func') {
                if (val === 'sqr') {
                    sciExpression += '^2';
                } else if (val === 'inv') {
                    sciExpression += '^( -1)';
                } else {
                    sciExpression += `${val}(`;
                }
            } else if (action === 'sci-const') {
                sciExpression += val;
            } else if (action === 'sci-op' || action === 'operator') {
                sciResetOnNextInput = false;
                sciExpression += ` ${val} `;
            } else if (action === 'insert') {
                sciExpression += val;
            } else if (action === 'equals') {
                if (!sciExpression) return;
                try {
                    const result = parseAndEvaluateSci(sciExpression, isDegMode);
                    saveHistoryItem(sciExpression, String(result));
                    sciExpression = String(result);
                    sciResetOnNextInput = true;
                } catch (e) {
                    sciDisplay.textContent = 'Error';
                    sciResetOnNextInput = true;
                    return;
                }
            } else if (action === 'negate') {
                if (sciExpression.startsWith('-')) {
                    sciExpression = sciExpression.substring(1);
                } else {
                    sciExpression = '-' + sciExpression;
                }
            } else if (action === 'percent') {
                sciExpression += '/100';
            } else {
                // Numbers
                sciExpression += (val || btn.textContent.trim());
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

    if (calcAgeBtn) calcAgeBtn.addEventListener('click', calculateAge);
    if (dobInput) dobInput.addEventListener('change', calculateAge);
    if (targetDateInput) targetDateInput.addEventListener('change', calculateAge);

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

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT')) return;

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
            } else if (['+', '-', '*', '/', '^', '(', ')'].includes(key)) {
                sciExpression += ` ${key} `;
                updateSciDisplay();
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
