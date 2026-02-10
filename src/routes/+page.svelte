<script>
    export let form;
    
    let loading = false;
    let editableLatex = ""; 
    let hasScraped = false;
    let copyText = "COPY";

    $: if (form?.latex && !editableLatex) {
        editableLatex = form.latex;
        hasScraped = true;
    }

    // --- 🧠 FAKE COMPILER V4 (ROBUST TABLES) ---
    function compileLatex(tex) {
        if (!tex) return "";

        // 1. Preamble Killer
        let bodyContent = tex;
        const startMatch = tex.match(/\\begin\{document\}/);
        const endMatch = tex.match(/\\end\{document\}/);
        if (startMatch) bodyContent = tex.substring(startMatch.index + startMatch[0].length);
        if (endMatch) bodyContent = bodyContent.substring(0, bodyContent.indexOf(endMatch[0]));

        let html = bodyContent
            .replace(/</g, "&lt;").replace(/>/g, "&gt;") 

            // --- TABELLEN (More flexible Regex) ---
            // Matches \begin{tabular}{...} CONTENT \end{tabular}
            // [\s\S]*? ensures we match newlines inside the table
            .replace(/\\begin\{tabular\}\{.*?\}([\s\S]*?)\\end\{tabular\}/g, (match, content) => {
                let rows = content.split('\\\\');
                let tableHtml = '<div class="table-wrapper"><table class="preview-table">';
                
                rows.forEach(row => {
                    if (row.trim() === '' || row.includes('\\hline')) return; 

                    tableHtml += '<tr>';
                    let cells = row.split('&');
                    cells.forEach(cell => {
                        // Strip LaTeX formatting inside cells for preview
                        let cleanCell = cell
                            .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
                            .replace(/\\textit\{(.*?)\}/g, '<i>$1</i>')
                            .trim();
                        tableHtml += `<td>${cleanCell}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</table></div>';
                return tableHtml;
            })
            // Clean up center wrappers around tables
            .replace(/\\begin\{center\}/g, '<div class="center-wrapper">')
            .replace(/\\end\{center\}/g, '</div>')

            // --- HEADINGS ---
            .replace(/\\section\*?\{(.*?)\}/g, '<h1>$1</h1>')
            .replace(/\\subsection\*?\{(.*?)\}/g, '<h2>$1</h2>')
            .replace(/\\subsubsection\*?\{(.*?)\}/g, '<h3>$1</h3>')
            .replace(/\\paragraph\*?\{(.*?)\}/g, '<h4>$1</h4>')
            
            // --- STYLES ---
            .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
            .replace(/\\textit\{(.*?)\}/g, '<i>$1</i>')
            .replace(/\\underline\{(.*?)\}/g, '<u>$1</u>')
            .replace(/\\texttt\{(.*?)\}/g, '<code>$1</code>')

            // --- LINKS & IMAGES ---
            .replace(/\\href\{(.*?)\}\{(.*?)\}/g, '<a href="$1" target="_blank">$2</a>')
            .replace(/\[IMG: (.*?)\]/g, '<span class="img-tag">🖼️ $1</span>')
            .replace(/\\fbox\{(.*?)\}/g, '$1') // remove fbox

            // --- LISTS ---
            .replace(/\\begin\{itemize\}/g, '<ul>')
            .replace(/\\end\{itemize\}/g, '</ul>')
            .replace(/\\begin\{enumerate\}/g, '<ol>')
            .replace(/\\end\{enumerate\}/g, '</ol>')
            .replace(/\\item\s/g, '<li>')
            .replace(/\\item\[(.*?)\]/g, '<li><b>$1:</b>')

            // --- CLEANUP ---
            .replace(/\\\\/g, '<br>')
            .replace(/\\/g, '') 
            .replace(/}/g, '')
            .replace(/{/g, '')
            .replace(/\n\s*\n/g, '<br><br>');

        return html;
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
                <h1>ScrapeBoi <span class="v-tag">V4</span></h1>
            </div>
        </div>
        <form method="POST" on:submit={() => { loading = true; editableLatex = ""; }}>
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
            <p class="hero-subtitle">"Hippity Hoppity, your Data is my Property" 🦝</p>
            
            <form method="POST" class="hero-form" on:submit={() => { loading = true; editableLatex = ""; }}>
                <input type="url" name="url" placeholder="https://letterboxd.com/..." required autocomplete="off" />
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
                    <button class="action-btn" on:click={copyToClipboard}>{copyText}</button>
                    <button class="action-btn" on:click={downloadTex}>⬇ .TEX</button>
                </div>
            </div>
            <textarea bind:value={editableLatex} spellcheck="false"></textarea>
        </section>

        <section class="panel preview-panel">
            <div class="toolbar">
                <span>📄 Preview</span>
                <button class="action-btn" on:click={printToPdf}>🖨 PDF</button>
            </div>
            <div class="scroll-container">
                <div class="paper a4">
                    <div class="paper-header">
                        <h1>Output Preview</h1>
                        <small>{new Date().toLocaleDateString()}</small>
                        <hr>
                    </div>
                    <div class="paper-body">
                        {@html previewHtml}
                    </div>
                    <div class="paper-footer">Generated by ScrapeBoi V4</div>
                </div>
            </div>
        </section>
    </main>
    {/if}
</div>

<style>
    /* --- GLOBAL & VARIABLES --- */
    :global(body) { 
        margin: 0; 
        background: #050505; 
        color: #fff; 
        font-family: 'Inter', system-ui, -apple-system, sans-serif; 
        overflow: hidden; /* App-Scroll verhindern */
    }
    
    .app-container { 
        display: flex; 
        flex-direction: column; 
        height: 100vh; 
    }

    /* --- LANDING HERO --- */
    .landing-hero { flex: 1; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1a1a1a 0%, #000 100%); }
    .hero-content { text-align: center; width: 100%; max-width: 600px; padding: 20px; }
    .logo-big { width: 150px; margin-bottom: 20px; filter: drop-shadow(0 0 20px rgba(255,0,255,0.4)); animation: hover 3s ease-in-out infinite; }
    @keyframes hover { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    
    .hero-title { font-size: 3.5rem; margin: 0; font-weight: 900; letter-spacing: -2px; background: linear-gradient(to right, #ff00ff, #00ffff); -webkit-background-clip: text; color: transparent; }
    .hero-subtitle { color: #888; font-style: italic; margin: 10px 0 30px; font-size: 1.1rem; }
    
    .hero-form { display: flex; flex-direction: column; gap: 15px; margin-top: 30px; }
    .hero-form input { padding: 18px; font-size: 1.1rem; background: #111; border: 2px solid #333; color: white; border-radius: 8px; text-align: center; transition: 0.2s; }
    .hero-form input:focus { border-color: magenta; outline: none; box-shadow: 0 0 20px rgba(255,0,255,0.2); }
    .hero-form button { padding: 18px; font-size: 1.1rem; background: magenta; border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; }
    .hero-form button:hover { transform: scale(1.02); background: #ff33ff; }

    /* --- HEADER (Editor Mode) --- */
    header { height: 60px; background: #000; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
    .header-left { display: flex; gap: 10px; align-items: center; }
    .logo-small { height: 30px; }
    .brand-text h1 { font-size: 1.2rem; margin: 0; font-weight: 700; }
    .v-tag { font-size: 0.7rem; color: magenta; vertical-align: super; }

    header form { display: flex; gap: 10px; }
    header input { background: #222; border: 1px solid #444; color: white; padding: 8px 12px; border-radius: 4px; width: 300px; }
    header button { background: magenta; border: none; padding: 8px 15px; color: white; border-radius: 4px; font-weight: bold; cursor: pointer; }

    /* --- MAIN LAYOUT --- */
    .split-layout { flex: 1; display: flex; overflow: hidden; }
    .panel { width: 50%; display: flex; flex-direction: column; border-right: 1px solid #222; }
    
    .toolbar { height: 45px; background: #111; display: flex; justify-content: space-between; align-items: center; padding: 0 15px; border-bottom: 1px solid #333; color: #888; font-size: 0.85rem; font-weight: 500; }
    .btn-group { display: flex; gap: 8px; }
    .action-btn { background: #222; border: 1px solid #333; color: #ddd; padding: 4px 12px; cursor: pointer; font-size: 0.75rem; border-radius: 4px; transition: 0.2s; }
    .action-btn:hover { background: #333; border-color: #555; }

    /* EDITOR */
    textarea { flex: 1; background: #0a0a0a; color: #0f0; border: none; padding: 25px; resize: none; outline: none; font-family: 'JetBrains Mono', 'Courier New', monospace; line-height: 1.6; font-size: 14px; }

    /* PREVIEW (Scroll Area) */
    .preview-panel { background: #222; }
    .scroll-container { 
        flex: 1; 
        overflow-y: auto; 
        padding: 40px; 
        display: flex; 
        justify-content: center; 
    }

    /* --- PAPER VISUALS (Web Preview) --- */
    .paper.a4 { 
        width: 210mm; 
        min-height: 297mm; 
        height: fit-content; 
        padding: 25mm; /* LaTeX Standard Margin */
        background-color: white; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.5); 
        color: black; 
        font-family: 'Times New Roman', serif; 
        line-height: 1.5;
        
        /* Simuliert Seiten-Abstände im Endlos-Scroll */
        background-image: linear-gradient(to bottom, 
            #ffffff 0%, 
            #ffffff 98%, 
            #dcdcdc 98%, /* Schnittkante */
            #dcdcdc 100% /* Lücke */
        );
        background-size: 100% 298mm; /* Wiederholt sich alle ~29.8cm */
        background-repeat: repeat-y;
    }

    /* PREVIEW TYPOGRAPHY */
    .paper :global(h1) { font-size: 20pt; border-bottom: 2px solid black; margin-top: 0; padding-bottom: 5px; }
    .paper :global(h2) { font-size: 16pt; margin-top: 1.5em; font-weight: bold; border-bottom: 1px solid #ccc; }
    .paper :global(h3) { font-size: 14pt; margin-top: 1.2em; font-weight: bold; }
    .paper :global(h4) { font-size: 12pt; margin-top: 1em; font-weight: bold; text-transform: uppercase; }
    
    .paper :global(p) { margin-bottom: 1em; text-align: justify; }
    .paper :global(a) { color: #0000AA; text-decoration: none; }
    .paper :global(a:hover) { text-decoration: underline; }
    
    .paper :global(ul), .paper :global(ol) { padding-left: 20px; margin-bottom: 1em; }
    .paper :global(li) { margin-bottom: 0.3em; }

    /* Images & Placeholders */
    .paper :global(.img-tag) { 
        display: block; 
        background: #f0f0f0; 
        border: 1px dashed #999; 
        padding: 10px; 
        text-align: center; 
        font-family: monospace; 
        font-size: 0.9em; 
        color: #555; 
        margin: 15px 0;
        border-radius: 4px;
    }

    /* Tables */
    .paper :global(.table-wrapper) { width: 100%; overflow-x: auto; margin: 15px 0; }
    .paper :global(.preview-table) { width: 100%; border-collapse: collapse; font-size: 10pt; }
    .paper :global(.preview-table td) { border: 1px solid #444; padding: 6px 10px; vertical-align: top; }
    .paper :global(.preview-table tr:nth-child(even)) { background: #f9f9f9; }
    .paper :global(.preview-table tr:first-child) { font-weight: bold; background: #eee; border-bottom: 2px solid #000; }

    /* =========================================
       🔥 PRINT CSS (DAS WICHTIGE UPDATE) 🔥
       ========================================= */
    @media print {
        /* Verstecke UI Müll */
        header, .editor-panel, .landing-hero, .toolbar, ::-webkit-scrollbar { 
            display: none !important; 
        }

        /* Layout Reset für Print */
        body, .app-container, .split-layout, .preview-panel, .scroll-container {
            display: block !important;
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        /* Papier Reset für Print */
        .paper.a4 {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important; /* Margin wird von @page geregelt */
            box-shadow: none !important;
            background: none !important; /* Kein grauer Balken im Druck! */
            border: none !important;
        }

        /* 📄 ECHTE PDF SEITENREGELN */
        @page {
            size: A4;
            margin: 20mm 20mm 20mm 20mm; /* Echte Druckränder */
        }

        /* ✂️ SCHNITT-LOGIK (Page Breaks) */
        
        /* Überschriften kleben am Text darunter (nicht trennen) */
        .paper :global(h1), 
        .paper :global(h2), 
        .paper :global(h3), 
        .paper :global(h4) { 
            break-after: avoid; 
            page-break-after: avoid; 
        }

        /* Tabellenzeilen nicht zerreißen */
        .paper :global(tr) { 
            break-inside: avoid; 
            page-break-inside: avoid; 
        }
        
        /* Bilder nicht zerreißen */
        .paper :global(.img-tag), 
        .paper :global(img) { 
            break-inside: avoid; 
            page-break-inside: avoid; 
        }

        /* Absätze sauber halten */
        .paper :global(p) { 
            orphans: 3; /* Mindestens 3 Zeilen am Ende der Seite */
            widows: 3;  /* Mindestens 3 Zeilen am Anfang der Seite */
        }

        /* Links im Druck: URL anzeigen? Optional. */
        .paper :global(a) { text-decoration: underline; color: black; }
    }
</style>