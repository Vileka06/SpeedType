/* ==========================================================================
   TypeQuest — front-end application
   ========================================================================== */
(function () {
    "use strict";

    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    var storeGet = function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    var storeSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

    /* ----------------------------------------------------------------------
       Theme + navigation
    ---------------------------------------------------------------------- */
    var themeBtn = $("#theme-toggle");
    if (themeBtn) {
        themeBtn.addEventListener("click", function () {
            var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", cur);
            storeSet("tq-theme", cur);
        });
    }

    var burger = $("#nav-burger");
    if (burger) {
        burger.addEventListener("click", function () { $("#nav-links").classList.toggle("open"); });
        $("#nav-links").addEventListener("click", function (e) {
            if (e.target.tagName === "A") $("#nav-links").classList.remove("open");
        });
    }

    /* ----------------------------------------------------------------------
       Flash messages, toasts, reveal animations, counters
    ---------------------------------------------------------------------- */
    $$(".flash-close").forEach(function (btn) {
        btn.addEventListener("click", function () { dismissFlash(btn.closest(".flash")); });
    });
    function dismissFlash(el) {
        el.style.transition = "opacity .3s, transform .3s";
        el.style.opacity = "0";
        el.style.transform = "translateY(-8px)";
        setTimeout(function () { el.remove(); }, 320);
    }
    $$(".flash").forEach(function (el) {
        setTimeout(function () { if (document.body.contains(el)) dismissFlash(el); }, 5200);
    });

    function toast(icon, text) {
        var stack = $("#toast-stack");
        if (!stack) return;
        var el = document.createElement("div");
        el.className = "toast";
        el.innerHTML = '<span class="toast-ico">' + icon + "</span><span>" + text + "</span>";
        stack.appendChild(el);
        var kill = function () {
            if (!el.classList.contains("out")) {
                el.classList.add("out");
                setTimeout(function () { el.remove(); }, 320);
            }
        };
        el.addEventListener("click", kill);
        setTimeout(kill, 4200);
    }

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add("in");
                var counters = $$(".count", entry.target);
                var all = entry.target.classList.contains("count") ? [entry.target] : (counters.length ? counters : null);
                if (all) all.forEach(animateCount);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    $$(".reveal").forEach(function (el) {
        revealObserver.observe(el);
        var counters = $$(".count", el);
        if (counters.length) counters.forEach(function (c) { c.setAttribute("data-done", "0"); });
        if (el.classList.contains("count")) el.setAttribute("data-done", "0");
    });

    function animateCount(el) {
        if (el.getAttribute("data-done") === "1") return;
        el.setAttribute("data-done", "1");
        var target = parseFloat(el.getAttribute("data-count") || "0") || 0;
        var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
        var dur = 1100, start = null;
        function frame(ts) {
            if (!start) start = ts;
            var p = Math.min(1, (ts - start) / dur);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * eased).toFixed(decimals);
            if (p < 1) requestAnimationFrame(frame);
            else el.textContent = target.toFixed(decimals);
        }
        requestAnimationFrame(frame);
    }

    /* ----------------------------------------------------------------------
       Confetti
    ---------------------------------------------------------------------- */
    function confetti() {
        var canvas = $("#confetti-canvas");
        if (!canvas) return;
        var ctx = canvas.getContext("2d");
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        function size() {
            canvas.width = canvas.offsetWidth * DPR;
            canvas.height = canvas.offsetHeight * DPR;
        }
        size();
        window.addEventListener("resize", size);
        var colors = ["#6366f1", "#a855f7", "#d946ef", "#ec4899", "#f59e0b", "#22c55e", "#0ea5e9"];
        var parts = [];
        var W = canvas.width, H = canvas.height;
        for (var i = 0; i < 160; i++) {
            parts.push({
                x: W / 2 + (Math.random() - 0.5) * W * 0.3,
                y: H * 0.35,
                vx: (Math.random() - 0.5) * 9,
                vy: -Math.random() * 10 - 3,
                g: 0.22,
                size: 5 + Math.random() * 5,
                color: colors[(Math.random() * colors.length) | 0],
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.3,
                life: 80 + Math.random() * 40
            });
        }
        var start = null;
        function burst(ts) {
            if (!start) start = ts;
            ctx.clearRect(0, 0, W, H);
            var still = [];
            parts.forEach(function (p) {
                p.vy += p.g; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
                if (p.life > 0 && p.y < H + 40) still.push(p);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
                ctx.restore();
            });
            parts = still;
            if (parts.length) requestAnimationFrame(burst);
        }
        requestAnimationFrame(burst);
        setTimeout(function () {
            ctx.clearRect(0, 0, W, H);
            window.removeEventListener("resize", size);
        }, 3500);
    }

    /* ======================================================================
       Typing game
    ====================================================================== */
    function initGame() {
        var cfg = window.TQ;
        if (!cfg) return;

        var G = {
            started: false,
            ended: true,
            startTime: null,
            ticker: null,
            target: "",
            index: 0,
            correct: 0,
            wrong: 0,
            lives: cfg.survivalLives || 5,
            maxLives: cfg.survivalLives || 5,
            currentLevel: 1,
            currentCategory: "General",
            currentMode: cfg.modes[0],
            spans: []
        };

        var els = {
            levelChips: $("#level-chips"),
            modeChips: $("#mode-chips"),
            catChips: $("#category-chips"),
            levelGroup: $("#level-group"),
            catGroup: $("#category-group"),
            text: $("#text-words"),
            viewport: $("#text-viewport"),
            surface: $("#text-surface"),
            overlay: $("#start-overlay"),
            ghost: $("#ghost-input"),
            statTime: $("#stat-time"),
            statWpm: $("#stat-wpm"),
            statAcc: $("#stat-acc"),
            statErr: $("#stat-err"),
            statProgress: $("#stat-progress"),
            livesPill: $("#stat-lives-pill"),
            livesKey: $("#stat-lives-key"),
            livesVal: $("#stat-lives"),
            modal: $("#result-modal"),
            recordTip: $("#new-record-tip")
        };

        var sel = storeGet("tq-sel") || { level: 1, category: "General", mode: null };
        var preset = (typeof cfg.presetMode !== "undefined") ? cfg.presetMode : null;
        sel.mode = preset && cfg.modes.indexOf(preset) !== -1 ? preset : (sel.mode || "Speed Run");
        if (!storeGet("tq-sel") || sel.mode === preset) storeSet("tq-sel", sel);

        /* ---------- Build chips ---------- */
        function buildLevelChips() {
            els.levelChips.innerHTML = "";
            for (var i = 1; i <= cfg.maxLevel; i++) {
                var locked = !!cfg.user && i > cfg.user.unlockedLevel;
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "chip" + (i === sel.level ? " active" : "") + (locked ? " locked" : "");
                btn.innerHTML = (locked ? '<span class="lock">🔒</span>' : "") + i;
                btn.title = "Level " + i + " · " + cfg.levels[i - 1] + (locked ? " · locked until you reach this rank" : "");
                btn.addEventListener("click", function () {
                    var v = parseInt(this.getAttribute("data-level"), 10);
                    if (this.classList.contains("locked")) {
                        toast("🔒", "Reach level " + v + " to unlock " + cfg.levels[v - 1]);
                        return;
                    }
                    sel.level = v; storeSet("tq-sel", sel);
                    $$(".chip", els.levelChips).forEach(function (c) { c.classList.remove("active"); });
                    this.classList.add("active");
                    loadText();
                });
                btn.setAttribute("data-level", i);
                els.levelChips.appendChild(btn);
            }
        }

        function buildModeChips() {
            els.modeChips.innerHTML = "";
            cfg.modes.forEach(function (m) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "chip" + (m === sel.mode ? " active" : "");
                btn.textContent = m;
                btn.title = m;
                btn.addEventListener("click", function () {
                    sel.mode = m; storeSet("tq-sel", sel);
                    $$(".chip", els.modeChips).forEach(function (c) { c.classList.remove("active"); });
                    this.classList.add("active");
                    applyModeUI();
                    loadText();
                });
                els.modeChips.appendChild(btn);
            });
        }

        function buildCategoryChips() {
            els.catChips.innerHTML = "";
            cfg.categories.forEach(function (c) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "chip" + (c === sel.category ? " active" : "");
                btn.textContent = c === "Programming" ? "⌨ " + c : c;
                btn.addEventListener("click", function () {
                    sel.category = c; storeSet("tq-sel", sel);
                    $$(".chip", els.catChips).forEach(function (x) { x.classList.remove("active"); });
                    this.classList.add("active");
                    loadText();
                });
                els.catChips.appendChild(btn);
            });
        }

        function applyModeUI() {
            var daily = sel.mode === "Daily Challenge";
            var dg = "opacity:.45;pointer-events:none;";
            els.levelGroup.style.cssText = els.catGroup.style.cssText = daily ? dg : "";
            if (daily) toast("📅", "Daily Challenge: +" + (cfg.dailyBonusXp || 50) + " bonus XP today");
            els.livesPill.classList.toggle("hide", sel.mode !== "Survival Mode");
            if (sel.mode === "Survival Mode") { els.livesKey.textContent = "Lives"; updateLives(); }
        }

        /* ---------- Load text ---------- */
        var loading = false;
        function loadText() {
            if (loading) return;
            loading = true;
            els.overlay.classList.remove("hidden");
            els.recordTip.classList.remove("show");
            var q = new URLSearchParams();
            q.set("level", sel.level);
            q.set("category", sel.category);
            if (sel.mode === "Daily Challenge") q.set("mode", "Daily Challenge");
            fetch("/api/texts?" + q.toString(), { headers: { "Accept": "application/json" } })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    loading = false;
                    G.currentLevel = data.level;
                    G.currentCategory = data.category;
                    G.currentMode = sel.mode;
                    buildSpans(data.text);
                    resetEngine();
                })
                .catch(function () {
                    loading = false;
                    toast("⚠️", "Could not load a passage. Check your connection.");
                });
        }

        function buildSpans(text) {
            G.target = text;
            els.text.innerHTML = "";
            G.spans = [];
            for (var i = 0; i < text.length; i++) {
                var ch = text[i];
                var span = document.createElement("span");
                span.className = "char" + (ch === " " ? " space" : "");
                span.textContent = ch === " " ? "\u00A0" : ch;
                els.text.appendChild(span);
                G.spans.push(span);
            }
        }

        function resetEngine() {
            G.started = false;
            G.ended = false;
            G.startTime = null;
            G.index = 0;
            G.correct = 0;
            G.wrong = 0;
            G.lives = G.maxLives;
            if (G.ticker) { clearInterval(G.ticker); G.ticker = null; }
            G.spans.forEach(function (s) { s.classList.remove("correct", "wrong", "active"); });
            setStats("0.0", 0, "100%", 0, 0);
            updateLives();
            els.overlay.classList.remove("hidden");
            els.modal.classList.remove("open");
            els.modal.setAttribute("aria-hidden", "true");
            requestAnimationFrame(focusGhost);
        }

        function setStats(time, wpm, acc, err, progress) {
            els.statTime.textContent = time;
            els.statWpm.textContent = String(Math.round(wpm));
            els.statAcc.textContent = acc + "%";
            els.statErr.textContent = String(err);
            els.statProgress.style.width = progress + "%";
        }

        function updateLives() {
            if (sel.mode !== "Survival Mode") return;
            var out = "";
            for (var i = 0; i < G.maxLives; i++) out += i < G.lives ? "❤️" : "🖤";
            els.livesVal.textContent = out;
        }

        function focusGhost() { try { els.ghost.focus({ preventScroll: true }); } catch (e) { els.ghost.focus(); } }

        /* ---------- Input handling ---------- */
        function start() {
            if (G.started || G.ended) return;
            G.started = true;
            G.startTime = performance.now();
            els.overlay.classList.add("hidden");
            G.ticker = setInterval(tick, 180);
            tick();
        }

        function commitChar(ch) {
            if (!G.started) start();
            if (G.ended || G.index >= G.target.length) return;
            var ok = ch === G.target.charAt(G.index);
            var span = G.spans[G.index];
            if (ok) {
                span.classList.add("correct");
                G.correct++;
            } else {
                span.classList.add("wrong");
                G.wrong++;
                if (sel.mode === "Survival Mode") {
                    G.lives = Math.max(0, G.lives - 1);
                    updateLives();
                    if (G.lives <= 0) { G.index++; paintCaret(); finish(false); return; }
                }
            }
            G.index++;
            paintCaret();
            updateProgress();

            if (G.index >= G.target.length) {
                setTimeout(function () { if (!G.ended) finish(true); }, 140);
            }
        }

        function backspace() {
            if (!G.started || G.ended || G.index <= 0) return;
            G.index--;
            var span = G.spans[G.index];
            if (span.classList.contains("correct")) G.correct--;
            if (span.classList.contains("wrong")) {
                G.wrong--;
                if (sel.mode === "Survival Mode") {
                    G.lives = Math.min(G.maxLives, G.lives + 1);
                    updateLives();
                }
            }
            span.classList.remove("correct", "wrong");
            paintCaret();
            updateProgress();
        }

        function paintCaret() {
            G.spans.forEach(function (s, i) { s.classList.toggle("active", i === G.index); });
            if (G.index < G.spans.length) keepCaretVisible(G.spans[G.index]);
        }

        function keepCaretVisible(el) {
            var vp = els.viewport;
            var r = el.getBoundingClientRect();
            var vr = vp.getBoundingClientRect();
            if (r.top < vr.top) vp.scrollTop += r.top - vr.top - 8;
            else if (r.bottom > vr.bottom) vp.scrollTop += r.bottom - vr.bottom + 8;
            if (r.left < vr.left) vp.scrollLeft += r.left - vr.left - 6;
            else if (r.right > vr.right) vp.scrollLeft += r.right - vr.right + 6;
        }

        function updateProgress() {
            var pct = G.target.length ? (G.index / G.target.length) * 100 : 0;
            els.statProgress.style.width = Math.min(100, pct) + "%";
        }

        function tick() {
            if (!G.started || G.ended) return;
            var elapsed = (performance.now() - G.startTime) / 1000;
            var minutes = elapsed / 60;
            var wpm = minutes > 0 ? (G.correct / 5) / minutes : 0;
            var typed = G.correct + G.wrong;
            var acc = typed > 0 ? (G.correct / typed) * 100 : 100;

            if (sel.mode === "Time Attack") {
                var remain = Math.max(0, cfg.timeAttackSeconds - elapsed);
                els.statTime.textContent = remain.toFixed(1) + "s";
                if (remain <= 0) { setStats("0.0", wpm, acc, G.wrong, 0); finish(false); return; }
            } else {
                els.statTime.textContent = elapsed.toFixed(1) + "s";
            }
            els.statWpm.textContent = String(Math.round(wpm));
            els.statAcc.textContent = acc.toFixed(0) + "%";
        }

        /* ---------- Finish ---------- */
        function finish(completed) {
            if (G.ended) return;
            G.ended = true;
            if (G.ticker) { clearInterval(G.ticker); G.ticker = null; }

            var elapsed = G.started ? Math.max(0.6, (performance.now() - G.startTime) / 1000) : 0;
            var minutes = elapsed / 60;
            var wpm = minutes > 0 ? Math.round((G.correct / 5) / minutes * 10) / 10 : 0;
            var typed = G.correct + G.wrong;
            var acc = typed > 0 ? (Math.round(G.correct / typed * 1000) / 10) : 0;
            var errors = G.wrong;

            if (sel.mode !== "Time Attack") {
                els.statTime.textContent = elapsed.toFixed(1) + "s";
                els.statWpm.textContent = String(Math.round(wpm));
                els.statAcc.textContent = acc.toFixed(1) + "%";
                els.statErr.textContent = String(errors);
            }

            var best = parseFloat(storeGet("tq-best") || "0") || 0;
            if (wpm > best && wpm > 0) {
                storeSet("tq-best", wpm);
                els.recordTip.classList.add("show");
            }

            fillModal(wpm, acc, errors, elapsed, currentUserLevel());
            els.modal.classList.add("open");
            els.modal.setAttribute("aria-hidden", "false");

            if (cfg.logged_in) {
                postResult(wpm, acc, errors, elapsed, completed);
            } else {
                $("#modal-nudge").classList.remove("hide");
                $("#modal-gamification").classList.add("hide");
            }
        }

        function currentUserLevel() { return cfg.user ? cfg.user.level : 1; }

        function setModalGamification(text) {
            var g = $("#modal-gamification");
            g.classList.remove("hide");
            g.innerHTML = text;
        }

        function fillModal(wpm, acc, errors, elapsed, level) {
            $("#modal-wpm").textContent = String(Math.round(wpm));
            $("#modal-acc").textContent = acc.toFixed(1) + "%";
            $("#modal-err").textContent = String(errors);
            $("#modal-time").textContent = elapsed.toFixed(1) + "s";
            $("#modal-level").textContent = "Lv " + level;
            $("#modal-nudge").classList.add("hide");
            $("#modal-gamification").classList.add("hide");
        }

        function postResult(wpm, acc, errors, elapsed, completed) {
            var body = {
                mode: G.currentMode,
                category: G.currentCategory,
                level: G.currentLevel,
                wpm: wpm,
                accuracy: acc,
                errors: errors,
                duration: Math.round(elapsed * 10) / 10,
                completed: completed,
                textLength: G.target.length
            };
            fetch("/api/results", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body)
            })
                .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
                .then(function (res) {
                    if (!res.ok) {
                        if (res.d && res.d.error === "login_required") {
                            $("#modal-nudge").classList.remove("hide");
                            setModalGamification("");
                            return;
                        }
                        toast("⚠️", "Could not save your result.");
                        return;
                    }
                    var d = res.d;
                    var html = "";
                    html += '<div class="levelup-banner hide" id="modal-levelup"><span class="levelup-emoji">🎉</span><div><strong>Level up!</strong><span id="modal-newrank"></span></div></div>';
                    html += '<span class="xp-gain' + (d.dailyBonus ? " daily" : "") + '">+' + d.xpEarned + " XP</span>";
                    html += '<div class="streak-line">🔥 <b>' + d.streak + "-day</b> streak" + (d.dailyBonus ? " · 📅 daily bonus claimed" : "") + "</div>";
                    if (d.achievements && d.achievements.length) {
                        html += '<div class="ach-list">' + d.achievements.map(function (a, i) {
                            return '<div class="ach-item" style="animation-delay:' + (i * 0.07) + 's"><span class="ach-icon">' + a.icon + "</span><div><strong>" + a.name + "</strong><span>" + a.description + "</span></div></div>";
                        }).join("") + "</div>";
                    }
                    setModalGamification(html);
                    $("#modal-level").textContent = "Lv " + d.level;

                    var navXp = $("#nav-xp");
                    if (navXp) navXp.textContent = String(d.totalXp);
                    if (cfg.user) cfg.user.level = d.level;

                    if (d.levelUp) {
                        $("#modal-levelup").classList.remove("hide");
                        $("#modal-newrank").textContent = d.level + " · " + d.levelName;
                    }
                    var finalHtml = $("#modal-gamification").innerHTML;
                    if (d.achievements && d.achievements.length) {
                        d.achievements.forEach(function (a) { toast(a.icon, "Achievement unlocked: " + a.name); });
                    }
                    if (d.levelUp || (d.achievements && d.achievements.length)) confetti();
                })
                .catch(function () { toast("⚠️", "Network error while saving."); });
        }

        /* ---------- Keyboard ---------- */
        function ignoreKey(e) {
            return e.ctrlKey || e.metaKey || e.altKey ||
                (els.modal.classList.contains("open") && e.key !== "Escape");
        }

        window.addEventListener("keydown", function (e) {
            if (ignoreKey(e)) return;
            var key = e.key;
            if (key === "Tab") { e.preventDefault(); restart(); return; }
            if (key === "Escape") {
                if (els.modal.classList.contains("open")) { closeModal(); return; }
                e.preventDefault(); finish(false); return;
            }
            if (key === "Backspace") { e.preventDefault(); backspace(); return; }
            if (key.length === 1) { e.preventDefault(); commitChar(key); return; }
        });

        els.ghost.addEventListener("input", function () {
            var v = els.ghost.value;
            if (v.length) commitChar(v.charAt(v.length - 1));
            els.ghost.value = "";
        });

        /* ---------- Buttons / overlays ---------- */
        function restart() { loadText(); }
        function closeModal() {
            els.modal.classList.remove("open");
            els.modal.setAttribute("aria-hidden", "true");
        }

        $("#btn-restart").addEventListener("click", restart);
        $("#btn-finish").addEventListener("click", function () { finish(false); });
        $("#modal-play-again").addEventListener("click", function () { closeModal(); loadText(); });
        $("#modal-close").addEventListener("click", closeModal);
        els.modal.addEventListener("click", function (e) { if (e.target === els.modal) closeModal(); });
        els.surface.addEventListener("click", function (e) {
            if (!G.ended) focusGhost();
        });

        function onVisibility() {
            if (!document.hidden && G.started && !G.ended) focusGhost();
        }
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("blur", function () {
            if (G.started && !G.ended && !els.modal.classList.contains("open")) focusGhost();
        });

        /* ---------- Init ---------- */
        buildLevelChips();
        buildModeChips();
        buildCategoryChips();
        applyModeUI();
        loadText();
    }

    /* ======================================================================
       Dashboard charts
    ====================================================================== */
    function initCharts() {
        var dash = window.TQ_DASH;
        if (!dash || !$("#wpm-chart")) return;

        drawLineChart($("#wpm-chart"), dash.wpm, { color: "#6366f1", label: "WPM" });
        drawLineChart($("#acc-chart"), dash.acc, { color: "#ec4899", label: "Accuracy %" });
    }

    function drawLineChart(canvas, data, opts) {
        if (!data || data.length < 2) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var rect = canvas.getBoundingClientRect();
        var w = rect.width, h = rect.height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        var ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        var padL = 34, padR = 14, padT = 14, padB = 26;
        var pw = w - padL - padR, ph = h - padT - padB;
        var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
        if (min === max) { min -= 1; max += 1; }
        var range = max - min;
        var lo = Math.max(0, min - range * 0.15);
        var hi = max + range * 0.15;

        var xs = function (i) { return padL + (i / (data.length - 1)) * pw; };
        var ys = function (v) { return padT + (1 - (v - lo) / (hi - lo)) * ph; };

        ctx.font = "11px ui-monospace, monospace";
        ctx.textBaseline = "middle";
        for (var grid = 0; grid <= 4; grid++) {
            var y = padT + (grid / 4) * ph;
            var val = hi - (grid / 4) * (hi - lo);
            ctx.strokeStyle = "rgba(120,130,160,.14)";
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(w - padR, y);
            ctx.stroke();
            ctx.fillStyle = "rgba(120,130,160,.9)";
            ctx.textAlign = "right";
            ctx.fillText(Number(val.toFixed(1)), padL - 8, y);
        }

        var grad = ctx.createLinearGradient(0, padT, 0, padT + ph);
        grad.addColorStop(0, hexToRgba(opts.color, 0.28));
        grad.addColorStop(1, hexToRgba(opts.color, 0.02));
        ctx.beginPath();
        ctx.moveTo(xs(0), ys(data[0]));
        data.forEach(function (v, i) { ctx.lineTo(xs(i), ys(v)); });
        ctx.lineTo(xs(data.length - 1), padT + ph);
        ctx.lineTo(xs(0), padT + ph);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        data.forEach(function (v, i) {
            if (i === 0) ctx.moveTo(xs(i), ys(v));
            else ctx.lineTo(xs(i), ys(v));
        });
        ctx.strokeStyle = hexToRgba(opts.color, 0.95);
        ctx.lineWidth = 2.2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();

        data.forEach(function (v, i) {
            ctx.beginPath();
            ctx.arc(xs(i), ys(v), 3, 0, Math.PI * 2);
            ctx.fillStyle = opts.color;
            ctx.fill();
        });
    }

    function hexToRgba(hex, a) {
        var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    }

    /* ---------- Boot ---------- */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { initGame(); initCharts(); });
    } else {
        initGame();
        initCharts();
    }
})();