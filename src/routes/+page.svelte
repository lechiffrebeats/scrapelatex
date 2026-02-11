<script>
    export let form;
    
    let loading = false;
    let editableLatex = ""; 
    let hasScraped = false;
    let copyText = "COPY";
    
    // --- FEATURE: MODES ---
    let isCheatSheet = false; // Toggle für Cheat Sheet
    let audioYoink, audioSuccess, audioError; // Audio Refs

    $: if (form?.latex && !editableLatex) {
        editableLatex = form.latex;
        hasScraped = true;
        playSound("success");
    } else if (form?.error) {
        playSound("error");
    }

    // --- FEATURE: SOUNDBOARD ---
    function playSound(type) {
        // Sicherstellen, dass wir im Browser sind
        if (typeof Audio === "undefined") return;
        
        try {
            if (type === "yoink") new Audio('/yoink.mp3').play();
            if (type === "success") new Audio('/success.mp3').play();
            if (type === "error") new Audio('/error.mp3').play();
        } catch (e) { console.log("Audio failed (User interaction needed first)"); }
    }

    // --- FEATURE: DIRECT TO OVERLEAF ---
    function openOverleaf() {
        // Wir erstellen ein unsichtbares Formular und senden den Code an Overleaf
        const form = document.createElement('form');
        form.action = "https://www.overleaf.com/docs";
        form.method = "POST";
        form.target = "_blank";

        const input = document.createElement('input');
        input.type = "hidden";
        input.name = "snip";
        input.value = editableLatex; // Der aktuelle Code

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    // --- FEATURE: CHEAT SHEET TOGGLE ---
    function toggleCheatSheet() {
        isCheatSheet = !isCheatSheet;
        if (isCheatSheet) {
            // Regex Magic: Preamble ändern für 2 Spalten & Querformat
            editableLatex = editableLatex
                .replace("a4paper]", "a4paper, landscape]")
                .replace("\\begin{document}", "\\begin{document}\n\\begin{multicols}{2}")
                .replace("\\end{document}", "\\end{multicols}\n\\end{document}");
        } else {
            // Zurück zum Standard (Simpel Replace, könnte man smarter machen)
            editableLatex = editableLatex
                .replace("a4paper, landscape]", "a4paper]")
                .replace("\\begin{multicols}{2}", "")
                .replace("\\end{multicols}", "");
        }
    }

    function compileLatex(tex) {
        if (!tex) return "";
        let bodyContent = tex;
        // Preamble Killer Logic...
        const startMatch = tex.match(/\\begin\{document\}/);
        const endMatch = tex.match(/\\end\{document\}/);
        if (startMatch) bodyContent = tex.substring(startMatch.index + startMatch[0].length);
        if (endMatch) bodyContent = bodyContent.substring(0, bodyContent.indexOf(endMatch[0]));

        return bodyContent
            .replace(/</g, "&lt;").replace(/>/g, "&gt;") 
            // Cleanup Multicols für Preview
            .replace(/\\begin\{multicols\}\{2\}/g, '').replace(/\\end\{multicols\}/g, '')
            // Tables
            .replace(/\\begin\{longtable\}\{.*?\}([\s\S]*?)\\end\{longtable\}/g, (match, content) => {
                let rows = content.split('\\\\');
                let tableHtml = '<div class="table-wrapper"><table class="preview-table">';
                rows.forEach(row => {
                    if (row.trim() === '' || row.includes('\\hline')) return; 
                    tableHtml += '<tr>';
                    let cells = row.split('&');
                    cells.forEach(cell => {
                        let cleanCell = cell.replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>').replace(/\\textit\{(.*?)\}/g, '<i>$1</i>').trim();
                        tableHtml += `<td>${cleanCell}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</table></div>';
                return tableHtml;
            })
            // Bibliography
            .replace(/\\begin\{thebibliography\}\{9\}/g, '<h3>Sources (Stolen)</h3><ul>')
            .replace(/\\end\{thebibliography\}/g, '</ul>')
            .replace(/\\bibitem\{(.*?)\} (.*?), \\url\{(.*?)\}/g, '<li><b>[$1]</b> <a href="$3" target="_blank">$2</a></li>')
            // Headings & Text
            .replace(/\\section\*?\{(.*?)\}/g, '<h1>$1</h1>')
            .replace(/\\subsection\*?\{(.*?)\}/g, '<h2>$1</h2>')
            .replace(/\\subsubsection\*?\{(.*?)\}/g, '<h3>$1</h3>')
            .replace(/\\paragraph\*?\{(.*?)\}/g, '<h4>$1</h4>')
            .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
            .replace(/\\textit\{(.*?)\}/g, '<i>$1</i>')
            .replace(/\\underline\{(.*?)\}/g, '<u>$1</u>')
            .replace(/\\texttt\{(.*?)\}/g, '<code>$1</code>')
            // Links & Images
            .replace(/\\href\{(.*?)\}\{(.*?)\}/g, '<a href="$1" target="_blank">$2</a>')
            .replace(/\[IMG: (.*?)\]/g, '<span class="img-tag">🖼️ $1</span>')
            .replace(/\\fbox\{(.*?)\}/g, '$1')
            .replace(/\\cite\{(.*?)\}/g, '<sup>[$1]</sup>')
            // Lists
            .replace(/\\begin\{itemize\}/g, '<ul>').replace(/\\end\{itemize\}/g, '</ul>')
            .replace(/\\begin\{enumerate\}/g, '<ol>').replace(/\\end\{enumerate\}/g, '</ol>')
            .replace(/\\item\s/g, '<li>').replace(/\\item\[(.*?)\]/g, '<li><b>$1:</b>')
            // Cleanup
            .replace(/\\\\/g, '<br>').replace(/\\/g, '').replace(/}/g, '').replace(/{/g, '').replace(/\n\s*\n/g, '<br><br>');
    }

    $: previewHtml = compileLatex(editableLatex);

    function downloadTex() {
        const blob = new Blob([editableLatex], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scrapeboi_export.tex';
        a.click();
    }
    function printToPdf() { window.print(); }
    function copyToClipboard() {
        navigator.clipboard.writeText(editableLatex);
        copyText = "COPIED!";
        setTimeout(() => copyText = "COPY", 2000);
    }
</script>

<div class="app-container" class:centered-mode={!hasScraped}>
    
    {#if hasScraped}
    <header>
        <div class="header-left">
            <img src="/logo.png" alt="ScrapeBoi" class="logo-small" />
            <div class="brand-text">
                <h1>ScrapeBoi <span class="v-tag">V5</span></h1>
                <span class="mini-slogan">Academic Weapon Edition ⚔️</span>
            </div>
        </div>
        <form method="POST" on:submit={() => { loading = true; playSound('yoink'); editableLatex = ""; }}>
            <input type="url" name="url" placeholder="Paste Link..." required autocomplete="off" />
            <button disabled={loading} class:stealing={loading}>
                {loading ? 'YOINKING...' : 'SCRAPE IT 🔥'}
            </button>
        </form>
    </header>
    {/if}

    {#if !hasScraped}
    <div class="landing-hero">
        <div class="hero-content">
            <img src="/logo.png" alt="Logo" class="logo-big" />
            <h1 class="hero-title">ScrapeBoi</h1>
            <p class="hero-tagline">Turn Trash HTML into Classy LaTeX</p>
            <p class="hero-meme">"Hippity Hoppity, your Data is my Property" 🦝</p>
            
            <form method="POST" class="hero-form" on:submit={() => { loading = true; playSound('yoink'); editableLatex = ""; }}>
                <input type="url" name="url" placeholder="https://..." required autocomplete="off" />
                <button disabled={loading} class:stealing={loading}>
                    {loading ? 'STEALING DATA...' : 'START HEIST 🚀'}
                </button>
            </form>
            {#if form?.error}<div class="hero-error">💀 {form.error}</div>{/if}
        </div>
    </div>
    {/if}

    {#if hasScraped}
    <main class="split-layout">
        <section class="panel editor-panel">
            <div class="toolbar">
                <span>📝 Source</span>
                <div class="btn-group">
                    <button class="action-btn" on:click={toggleCheatSheet}>
                        {isCheatSheet ? '📄 NORMAL' : '🧠 CHEAT SHEET'}
                    </button>
                    <button class="action-btn" on:click={copyToClipboard}>{copyText}</button>
                    <button class="action-btn" on:click={downloadTex}>⬇ .TEX</button>
                </div>
            </div>
            <textarea bind:value={editableLatex} spellcheck="false"></textarea>
        </section>

        <section class="panel preview-panel">
            <div class="toolbar">
                <span>📄 Live Preview</span>
                <div class="btn-group">
                    <button class="action-btn overleaf" on:click={openOverleaf}>🚀 OVERLEAF</button>
                    <button class="action-btn primary" on:click={printToPdf}>🖨 PDF</button>
                </div>
            </div>
            <div class="scroll-container">
                <div class="paper a4" class:cheat-sheet={isCheatSheet}>
                    <div class="paper-header">
                        <h1>{isCheatSheet ? 'Cheat Sheet Mode' : 'Output Preview'}</h1>
                        <small>{new Date().toLocaleDateString()}</small>
                        <hr>
                    </div>
                    <div class="paper-body" class:multi-col={isCheatSheet}>
                        {@html previewHtml}
                    </div>
                    <div class="paper-footer">Generated by ScrapeBoi V5</div>
                </div>
            </div>
        </section>
    </main>
    {/if}
</div>

<style>
    /* VARIABLES & GLOBAL */
    :global(body) { margin: 0; background: #050505; color: #fff; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
    .app-container { display: flex; flex-direction: column; height: 100vh; }
    
    /* LANDING */
    .landing-hero { flex: 1; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1b1b1b 0%, #000 90%); }
    .hero-content { text-align: center; width: 100%; max-width: 650px; padding: 20px; }
    .logo-big { width: 140px; margin-bottom: 25px; filter: drop-shadow(0 0 25px rgba(255,0,255,0.4)); animation: hover 3s ease-in-out infinite; }
    @keyframes hover { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .hero-title { font-size: 4rem; margin: 0; font-weight: 900; color: white; }
    .hero-tagline { font-size: 1.2rem; font-weight: 700; color: magenta; letter-spacing: 2px; margin: 5px 0 20px; text-transform: uppercase; }
    .hero-meme { color: #666; font-style: italic; font-size: 1rem; }
    .hero-form { display: flex; flex-direction: column; gap: 15px; margin-top: 40px; }
    .hero-form input { padding: 20px; font-size: 1.1rem; background: #111; border: 2px solid #333; color: white; border-radius: 8px; text-align: center; }
    .hero-form input:focus { border-color: magenta; outline: none; box-shadow: 0 0 25px rgba(255,0,255,0.2); }
    .hero-form button { padding: 20px; font-size: 1.1rem; background: magenta; border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: 900; }
    .hero-form button:hover { transform: scale(1.02); background: #ff33ff; }

    /* HEADER */
    header { height: 65px; background: #000; border-bottom: 1px solid #222; display: flex; align-items: center; justify-content: space-between; padding: 0 25px; }
    .header-left { display: flex; gap: 15px; align-items: center; }
    .logo-small { height: 35px; }
    .brand-text h1 { font-size: 1.1rem; margin: 0; line-height: 1; color: white; }
    .mini-slogan { font-size: 0.7rem; color: magenta; font-weight: bold; }
    header input { background: #1a1a1a; border: 1px solid #333; color: white; padding: 8px 12px; border-radius: 4px; width: 300px; }
    header button { background: magenta; border: none; padding: 8px 20px; color: white; border-radius: 4px; font-weight: bold; cursor: pointer; }

    /* LAYOUT */
    .split-layout { flex: 1; display: flex; overflow: hidden; }
    .panel { width: 50%; display: flex; flex-direction: column; border-right: 1px solid #222; }
    .toolbar { height: 45px; background: #0a0a0a; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid #222; color: #888; font-size: 0.85rem; font-weight: 600; }
    .btn-group { display: flex; gap: 8px; }
    .action-btn { background: #222; border: 1px solid #333; color: #ccc; padding: 5px 12px; cursor: pointer; font-size: 0.75rem; border-radius: 4px; font-weight: 600; }
    .action-btn:hover { background: #333; color: white; }
    .action-btn.primary { background: #eee; color: black; border-color: #fff; }
    .action-btn.overleaf { background: #3f9f3f; color: white; border-color: #3f9f3f; }
    
    textarea { flex: 1; background: #050505; color: #00ff00; border: none; padding: 30px; resize: none; outline: none; font-family: 'JetBrains Mono', monospace; line-height: 1.6; font-size: 13px; }

    /* PREVIEW */
    .preview-panel { background: #151515; }
    .scroll-container { flex: 1; overflow-y: auto; padding: 40px; display: flex; justify-content: center; }
    
    .paper.a4 { 
        width: 210mm; min-height: 297mm; height: fit-content; padding: 20mm; 
        background-color: white; box-shadow: 0 10px 50px rgba(0,0,0,0.6); 
        color: black; font-family: 'Times New Roman', serif; line-height: 1.45;
        background-image: linear-gradient(to bottom, #fff 0%, #fff 98%, #e0e0e0 98%, #e0e0e0 100%);
        background-size: 100% 297mm; background-repeat: repeat-y;
        transition: transform 0.3s;
    }

    /* CHEAT SHEET MODE STYLES */
    .paper.a4.cheat-sheet {
        /* Landscape A4 Simulieren */
        width: 297mm; 
        padding: 10mm;
        font-size: 9pt;
    }
    .paper-body.multi-col {
        column-count: 2;
        column-gap: 20px;
        column-rule: 1px solid #ccc;
    }

    /* TYPOGRAPHY */
    .paper :global(h1) { font-size: 22pt; border-bottom: 2px solid black; margin-top: 0; padding-bottom: 5px; }
    .paper.cheat-sheet :global(h1) { font-size: 16pt; }
    .paper :global(h2) { font-size: 16pt; margin-top: 1.5em; font-weight: bold; border-bottom: 1px solid #ccc; }
    .paper :global(.preview-table) { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 15px 0; }
    .paper :global(.preview-table td) { border: 1px solid #444; padding: 6px 10px; vertical-align: top; }
    .paper :global(.preview-table tr:first-child) { font-weight: bold; background: #eee; }
    .paper :global(a) { color: #0000AA; text-decoration: underline; }

    @media print {
        header, .editor-panel, .landing-hero, .toolbar, ::-webkit-scrollbar { display: none !important; }
        body, .app-container, .split-layout, .preview-panel, .scroll-container {
            display: block !important; height: auto !important; width: 100% !important; overflow: visible !important; background: white !important;
        }
        .paper.a4 { width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; background: none !important; }
        @page { size: A4; margin: 20mm; }
        /* Cheat Sheet Print Landscape */
        .paper.a4.cheat-sheet { width: 100% !important; }
        .paper :global(h1), .paper :global(h2) { break-after: avoid; }
        .paper :global(tr), .paper :global(.img-tag) { break-inside: avoid; }
    }
</style>