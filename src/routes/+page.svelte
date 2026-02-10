<script>
    export let form;
    let loading = false;
</script>

<div class="main-wrapper">
    <header>
        <h1>🦄 LaTeX Scraper 3000 </h1>
        <h2>(extra NUR für den milan)</h2>
        <form method="POST" on:submit={() => loading = true}>
                        <input type="url" name="url" value="https://letterboxd.com/er_ich/" placeholder="https://letterboxd.com/er_ich/..."  required />
            <button disabled={loading}>
                {loading ? 'Hacking...' : 'SCRAPE IT'}
            </button>
        </form>
        {#if form?.error}<div class="error">{form.error}</div>{/if}
    </header>

    {#if form?.success}
    <div class="split-view">
        
        <div class="column code-col">   
            <h3>💻 Der Code (Copy me)</h3>
            <textarea readonly value={form.latex}></textarea>
            <button class="copy-btn" on:click={() => navigator.clipboard.writeText(form.latex)}>
                COPY TO CLIPBOARD
            </button>
        </div>

        <div class="column preview-col">
            <h3>👁️ Live Preview (Fake PDF)</h3>
            <div class="paper a4">
                <div class="latex-header">
                    <div class="title">Scrape God Output</div>
                    <div class="date">{new Date().toLocaleDateString()}</div>
                </div>
                {@html form.preview}
            </div>
        </div>
    </div>
    {/if}
</div>

<style>
    /* GLOBAL DARK MODE */
    :global(body) {
        margin: 0;
        background-color: #111;
        color: #eee;
        font-family: 'Courier New', Courier, monospace;
    }

    .main-wrapper {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    header {
        text-align: center;
        padding: 20px;
        border-bottom: 2px solid magenta;
        background: #000;
    }

    input {
        padding: 10px; width: 300px; border: 2px solid cyan; background: #222; color: #fff;
    }
    
    button {
        padding: 10px 20px; background: magenta; color: #fff; border: none; font-weight: bold; cursor: pointer;
    }

    /* SPLIT SCREEN LOGIC */
    .split-view {
        display: flex;
        flex: 1;
        overflow: hidden; /* Scrollen passiert in den Spalten */
    }

    .column {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    /* LINKS: CODE STYLE */
    .code-col {
        border-right: 2px solid #333;
        background: #0d0d0d;
    }

    textarea {
        width: 100%;
        flex: 1;
        background: #1a1a1a;
        color: #00ff00;
        border: 1px solid #333;
        font-family: monospace;
        padding: 10px;
        resize: none;
    }

    .copy-btn {
        margin-top: 10px;
        background: lime;
        color: black;
    }

    /* RECHTS: PREVIEW STYLE (Das Fake Paper) */
    .preview-col {
        background: #555; /* Tisch-Farbe */
        align-items: center;
    }

    .paper.a4 {
        background: white;
        color: black;
        width: 210mm; /* A4 Breite */
        min-height: 297mm; /* A4 Höhe */
        padding: 25mm; /* Standard LaTeX Margin */
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        font-family: 'Cormorant Garamond', serif; /* Sieht aus wie LaTeX */
        font-size: 12pt;
        line-height: 1.5;
        box-sizing: border-box;
    }

    /* Fake LaTeX Styling im HTML */
    .paper :global(h1) {
        font-size: 18pt;
        font-weight: bold;
        margin-top: 2em;
        margin-bottom: 1em;
    }

    .paper :global(h2) {
        font-size: 14pt;
        font-weight: bold;
        margin-top: 1.5em;
        margin-bottom: 1em;
    }

    .paper :global(p) {
        margin-bottom: 1em;
        text-align: justify; /* Blocksatz wie im Paper */
    }

    .latex-header {
        text-align: center;
        margin-bottom: 3em;
        border-bottom: 1px solid #ccc; /* Kleiner visueller Trenner */
        padding-bottom: 1em;
    }
    .title { font-size: 24pt; font-weight: bold; }
</style>