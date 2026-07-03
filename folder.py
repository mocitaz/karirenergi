(async function() {
    // --- 1. CONFIGURATION & UUIDS ---
    const widgetDetailUUID = "845abfe1-3f9d-4b3a-bda5-0a9f2f9083c2";
    const vacancyRegex = /845abfe1-3f9d-4b3a-bda5-0a9f2f9083c2\/\?id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

    const uniqueJobs = [];
    const hasilScraping = [];
    let pageNum = 1;
    let stopScraping = false;

    // --- 2. PREMIUM NOTION-STYLE GLASSMORPHIC DASHBOARD UI ---
    const oldDash = document.getElementById("scraping-dashboard");
    if (oldDash) oldDash.remove();

    const dashboard = document.createElement("div");
    dashboard.id = "scraping-dashboard";
    
    // Apply styling
    Object.assign(dashboard.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "9999999",
        padding: "22px",
        backgroundColor: "rgba(30, 30, 45, 0.95)",
        backdropFilter: "blur(8px)",
        color: "#ffffff",
        borderRadius: "14px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        width: "340px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        userSelect: "none",
        transition: "all 0.3s ease"
    });

    dashboard.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px; font-weight: 800; color: #4fc3f7; letter-spacing: -0.3px;">KarirEnergi Scraper</span>
                <span style="font-size: 9px; font-weight: bold; background: rgba(79, 195, 247, 0.15); color: #4fc3f7; padding: 2px 6px; rounded-radius: 4px; border: 1px solid rgba(79, 195, 247, 0.3); border-radius: 4px;">v2.1</span>
            </div>
            <div id="minimize-btn" style="cursor: pointer; font-size: 14px; opacity: 0.7; hover:opacity: 1;">➖</div>
        </div>
        <div id="dashboard-content" style="font-size: 13.5px; line-height: 1.65; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between;"><span>Status:</span><span id="scrape-status" style="color: #ffb74d; font-weight: bold;">Mencari halaman...</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Halaman Aktif:</span><span id="scrape-page" style="font-weight: bold; color: #4fc3f7;">1</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Loker Terdeteksi:</span><span id="scrape-count" style="font-weight: bold; color: #81c784;">0</span></div>
            <div style="margin: 14px 0 10px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">
                    <span>Progress Pemindaian</span>
                    <span id="scrape-progress-text">0%</span>
                </div>
                <div style="height: 6px; background-color: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                    <div id="scrape-progress" style="width: 0%; height: 100%; background-color: #4fc3f7; transition: width 0.3s; border-radius: 3px;"></div>
                </div>
            </div>
            <div id="dashboard-actions" style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
                <button id="btn-stop-download" style="width: 100%; padding: 10px; background-color: #e57373; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(229,115,115,0.25);">Hentikan Scraping</button>
            </div>
        </div>
    `;
    document.body.appendChild(dashboard);

    // Minimize toggle
    let isMinimized = false;
    document.getElementById("minimize-btn").onclick = function() {
        isMinimized = !isMinimized;
        const content = document.getElementById("dashboard-content");
        if (isMinimized) {
            content.style.display = "none";
            this.innerText = "➕";
            dashboard.style.padding = "12px 20px";
        } else {
            content.style.display = "block";
            this.innerText = "➖";
            dashboard.style.padding = "22px";
        }
    };

    // Tombol stop
    document.getElementById("btn-stop-download").onclick = function() {
        stopScraping = true;
        this.innerText = "Menghentikan proses...";
        this.style.backgroundColor = "#ffb74d";
        this.style.boxShadow = "none";
    };

    // --- 3. DETEKSI PAGINATION & JALUR LOKER ---
    function getNextButton() {
        let btn = document.querySelector('[aria-label="Next"], [aria-label="Next Page"], .next-page, .next, .pagination-next');
        if (btn && !isDisabled(btn)) return btn;
        
        const elements = Array.from(document.querySelectorAll('a, button, li, span'));
        for (let el of elements) {
            const text = el.innerText.trim().toLowerCase();
            if (text === 'next' || text === 'selanjutnya' || text === '>' || text === '»') {
                if (!isDisabled(el)) return el;
            }
        }

        const activeEl = document.querySelector('.active, .current, [class*="active"], [class*="current"]');
        if (activeEl) {
            const container = activeEl.closest('.pagination, [class*="pagination"], [class*="page-list"]');
            if (container) {
                const links = Array.from(container.querySelectorAll('a, button, li'));
                const activeIndex = links.indexOf(activeEl) !== -1 ? links.indexOf(activeEl) : links.findIndex(l => l.contains(activeEl));
                if (activeIndex !== -1 && links[activeIndex + 1]) {
                    const nextLink = links[activeIndex + 1].querySelector('a, button') || links[activeIndex + 1];
                    if (nextLink && !isDisabled(nextLink)) return nextLink;
                }
            }
        }
        return null;
    }

    function isDisabled(el) {
        if (el.disabled || el.hasAttribute('disabled') || el.classList.contains('disabled')) return true;
        if (el.parentElement && el.parentElement.classList.contains('disabled')) return true;
        return false;
    }

    function collectJobsFromCurrentPage() {
        const jobCards = document.querySelectorAll('.job-item, .card, tr, [class*="card"]');
        jobCards.forEach(card => {
            const htmlContent = card.outerHTML || "";
            const match = htmlContent.match(vacancyRegex);
            
            if (match) {
                const vacancyId = match[1];
                const cardLines = card.innerText.split('\n').map(l => l.trim()).filter(Boolean);
                const judul = cardLines[0] || "Tidak diketahui";
                
                if (judul.toLowerCase().includes("beranda") || judul.toLowerCase().includes("riwayat") || judul.length < 5) {
                    return; 
                }

                let perusahaan = "PT Pertamina";
                if (cardLines.length > 1 && cardLines[1].length > 3 && !cardLines[1].toLowerCase().includes("internship")) {
                    perusahaan = cardLines[1];
                }

                let kuota = 1;
                let pelamar = 0;
                const cardText = card.innerText || "";
                const matchPosisi = cardText.match(/(\d+)\s+posisi/i);
                const matchPelamar = cardText.match(/(\d+)\s+pelamar/i);
                if (matchPosisi) kuota = parseInt(matchPosisi[1], 10);
                if (matchPelamar) pelamar = parseInt(matchPelamar[1], 10);

                if (!uniqueJobs.some(job => job.id === vacancyId)) {
                    uniqueJobs.push({
                        id: vacancyId,
                        judul: judul,
                        perusahaan: perusahaan,
                        detailUrl: `https://recruitment.pertamina.com/object/widget/${widgetDetailUUID}/?id=${vacancyId}`,
                        kuota: kuota,
                        pelamar: pelamar
                    });
                }
            }
        });
        document.getElementById("scrape-count").innerText = uniqueJobs.length;
    }

    // --- PHASE 1: COLLECTING LISTINGS ---
    while (!stopScraping) {
        document.getElementById("scrape-status").innerText = "Mengumpulkan loker...";
        document.getElementById("scrape-page").innerText = pageNum;
        
        collectJobsFromCurrentPage();
        
        const nextBtn = getNextButton();
        if (!nextBtn) {
            console.log("Sudah di halaman terakhir.");
            break;
        }

        console.log(`Pindah ke halaman ${pageNum + 1}...`);
        nextBtn.click();
        pageNum++;
        
        await new Promise(resolve => setTimeout(resolve, 2500));
    }

    // --- PHASE 2: PARALEL DETAILS FETCH (5 CONCURRENT IFRAMES) ---
    // Menggunakan iframe untuk mengeksekusi Client-Side JS Pertamina agar data Kota/Industri ter-render sempurna
    if (uniqueJobs.length > 0 && !stopScraping) {
        document.getElementById("scrape-status").innerText = "Menghubungkan detail...";
        
        const concurrency = 5; 
        let currentIndex = 0;

        async function worker(workerId) {
            // Buat iframe tunggal untuk pekerja ini untuk dipakai ulang (Hemat memori)
            const iframe = document.createElement('iframe');
            iframe.id = `scraper-worker-${workerId}`;
            Object.assign(iframe.style, {
                position: 'absolute',
                width: '800px',
                height: '600px',
                left: '-9999px',
                top: '-9999px',
                visibility: 'hidden'
            });
            document.body.appendChild(iframe);

            while (currentIndex < uniqueJobs.length && !stopScraping) {
                const index = currentIndex++;
                if (index >= uniqueJobs.length) break;

                const job = uniqueJobs[index];
                
                // Update Dashboard Status & Progress
                const progressPercent = Math.round(((index + 1) / uniqueJobs.length) * 100);
                document.getElementById("scrape-status").innerText = `Memindai (${index + 1}/${uniqueJobs.length})`;
                document.getElementById("scrape-progress").style.width = `${progressPercent}%`;
                document.getElementById("scrape-progress-text").innerText = `${progressPercent}%`;

                try {
                    iframe.src = job.detailUrl;
                    
                    // Tunggu event load dari iframe
                    await new Promise((resolve) => {
                        iframe.onload = resolve;
                    });
                    
                    // Tunggu 1500ms agar JS internal widget merender ikon & data di DOM
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!iframeDoc) throw new Error("Iframe document not accessible");
                    
                    // Bersihkan tag script/style agar tidak merusak pencarian teks
                    iframeDoc.querySelectorAll('script, style').forEach(el => el.remove());
                    
                    const fullText = iframeDoc.body.innerText || iframeDoc.body.textContent || "";
                    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
                    
                    let pendidikan = "Tidak tertera";
                    let jurusan = "Semua Jurusan / Tidak tertera";
                    let kota = "Tidak tertera";
                    let industri = "Tidak tertera";
                    let sektor = "Tidak tertera";

                    // 1. Deteksi Kota
                    const iconLocation = iframeDoc.querySelector('.icon--location, .icon-location, i[class*="location"], i[class*="map"], i[class*="pin"]');
                    if (iconLocation && iconLocation.parentElement) {
                        kota = iconLocation.parentElement.innerText.trim();
                    }

                    // 2. Deteksi Industri
                    const iconIndustry = iframeDoc.querySelector('.icon--tag, .icon-tag, i[class*="tag"], i[class*="industry"]');
                    if (iconIndustry && iconIndustry.parentElement) {
                        industri = iconIndustry.parentElement.innerText.trim();
                    }

                    // 3. Deteksi Sektor
                    const iconSector = iframeDoc.querySelector('.icon--briefcase, .icon-briefcase, .icon--bag, .icon-bag, i[class*="briefcase"], i[class*="bag"], i[class*="work"]');
                    if (iconSector && iconSector.parentElement) {
                        sektor = iconSector.parentElement.innerText.trim();
                    }

                    // Fallback Kota, Industri, Sektor dari baris text
                    let indexKota = -1;
                    for (let j = 0; j < lines.length; j++) {
                        const line = lines[j];
                        const lowerLine = line.toLowerCase();
                        if (lowerLine.startsWith("kota ") || lowerLine.startsWith("kab. ") || lowerLine.startsWith("kabupaten ")) {
                            if (kota === "Tidak tertera") {
                                kota = line;
                            }
                            indexKota = j;
                            break; 
                        }
                    }

                    if (indexKota !== -1) {
                        if (industri === "Tidak tertera" && lines[indexKota + 1] && !lines[indexKota + 1].toLowerCase().includes("job description") && !lines[indexKota + 1].toLowerCase().includes("requirements")) {
                            industri = lines[indexKota + 1].trim();
                        }
                        if (sektor === "Tidak tertera" && lines[indexKota + 2] && !lines[indexKota + 2].toLowerCase().includes("job description") && !lines[indexKota + 2].toLowerCase().includes("requirements") && !lines[indexKota + 2].includes("-")) {
                            sektor = lines[indexKota + 2].trim();
                        }
                    }

                    // Bersihkan tag / format kota
                    kota = kota.replace(/[\s\-\•\.\,]+$/, '').trim();
                    industri = industri.replace(/[\s\-\•\.\,]+$/, '').trim();
                    sektor = sektor.replace(/[\s\-\•\.\,]+$/, '').trim();

                    const matchPendidikan = fullText.match(/(?:Tingkat\s+)?Pendidikan\s*:\s*([^\n\r]+)/i);
                    if (matchPendidikan) {
                        let val = matchPendidikan[1].trim();
                        const indexJur = val.toLowerCase().indexOf("jurusan");
                        if (indexJur !== -1) {
                            val = val.substring(0, indexJur).trim();
                        }
                        pendidikan = val.replace(/[\s:-]+$/, '').trim();
                    }

                    const matchJurusan = fullText.match(/Jurusan\s*:\s*([^\n\r]+)/i);
                    if (matchJurusan) {
                        let val = matchJurusan[1].trim();
                        const indexReq = val.toLowerCase().indexOf("requirements");
                        if (indexReq !== -1) {
                            val = val.substring(0, indexReq).trim();
                        }
                        jurusan = val.trim();
                    }

                    // Clean Jurusan from script injection & requirements text
                    const cleanJurusanStr = (jStr) => {
                        if (!jStr) return "Semua Jurusan / Tidak Tertera";
                        
                        const dirtyIndicator = "$(document).ready";
                        if (jStr.includes(dirtyIndicator)) {
                            const idx = jStr.indexOf(dirtyIndicator);
                            jStr = jStr.substring(0, idx).trim();
                        }
                        
                        // 1. Insert space at camelCase boundary (e.g. EkonomiMenguasai -> Ekonomi, Menguasai)
                        let cleaned = jStr.replace(/([a-z])([A-Z])/g, '$1, $2');
                        
                        // Pre-split normalization for K3 variations
                        cleaned = cleaned.replace(/keselamatan\s+dan\s+kesehatan\s+kerja(\s*\(k3\))?/gi, 'Kesehatan & Keselamatan Kerja (K3)');
                        cleaned = cleaned.replace(/keselamatan\s+kesehatan\s+kerja(\s*\(k3\))?/gi, 'Kesehatan & Keselamatan Kerja (K3)');
                        
                        // 2. Split by separators
                        const tokens = cleaned.split(/[,;\n\r]|\band\b|\bdan\b|\bserta\b/i);
                        
                        // Keywords indicating requirement start
                        const requirementKeywords = [
                            "menguasai", "mampu", "memiliki", "detail", "big data", "advanced", "problem", 
                            "data analysis", "data visualization", "analytical", "soft skill", "hard skill", 
                            "communicative", "power bi", "excel", "word", "powerpoint", "canva", "adobe", 
                            "active", "presentation", "compliance", "procurement", "reporting", "critical", 
                            "discipline", "work ethic", "berdomisi", "bersedia", "dapat", "inisiatif", 
                            "observasi", "komunikatif", "leadership", "english", "menulis", "tulisan", 
                            "laporan", "minat", "pengalaman", "pemahaman", "proaktif", "attention", 
                            "teamwork", "learning", "claims", "contract", "machine learning", "procedure", 
                            "desain", "editing", "visualisasi", "stakeholder", "speaking", "planning", 
                            "strategic", "event", "office", "ms.", "microsoft", "kualifikasi", "requirements", 
                            "tata kelola", "document", "analisa", "pengolahan", "penyusunan",
                            "git", "coding", "software", "application", "cloud", "java", "python", "javascript", 
                            "html", "css", "sql", "c++", "c#", "php", "golang", "rust", "react", "node", "aws", 
                            "docker", "kubernetes", "figma", "ui/ux", "hardskill", "softskill", "skills", 
                            "knowledge", "ability", "capability", "experience", "understanding", "interest", 
                            "passion", "adaptability", "resilience", "adaptive", "writing", "listening", 
                            "thinking", "solving", "oriented", "project management", "stakeholder management", 
                            "data management", "waste management", "emergency response"
                        ];
                        
                        const majorCorrections = {
                            "design komunikasi visual (dkv)": "Desain Komunikasi Visual",
                            "design komunikasi visual": "Desain Komunikasi Visual",
                            "design grafis": "Desain Grafis",
                            "dkv": "Desain Komunikasi Visual",
                            "akturia": "Aktuaria",
                            "akutansi": "Akuntansi",
                            "psiklogi": "Psikologi",
                            "admitrasi": "Administrasi",
                            "keskatriatan": "Kesekretariatan",
                            "hukum pi": "Hukum Pidana",
                            "bisnis management": "Business Management",
                            "electro": "Teknik Elektro",
                            "industrial engineering": "Teknik Industri",
                            "management": "Manajemen",
                            "management / administrasi bisnis": "Manajemen / Administrasi Bisnis",
                            "system computer": "Sistem Komputer",
                            "public relation": "Public Relations",
                            "teknik metallurgy": "Teknik Metalurgi"
                        };

                        const validMajors = [];
                        for (let token of tokens) {
                            token = token.replace(/^[^a-zA-Z0-9(]+|[^a-zA-Z0-9)]+$/g, '').trim();
                            if (!token || token.length <= 1) continue;
                            
                            let tokenLower = token.toLowerCase();
                            let hasKeyword = false;
                            for (let kw of requirementKeywords) {
                                if (tokenLower.includes(kw)) {
                                    hasKeyword = true;
                                    break;
                                }
                            }
                            
                            if (hasKeyword) {
                                break;
                            }
                            
                            // Apply corrections with word boundary match where appropriate (longest typo first to prevent nesting)
                            const sortedCorrections = Object.entries(majorCorrections).sort((a, b) => b[0].length - a[0].length);
                            for (let [typo, correction] of sortedCorrections) {
                                if (tokenLower.includes(correction.toLowerCase())) {
                                    continue;
                                }
                                const leftBoundary = /^[a-zA-Z0-9]/.test(typo) ? '\\b' : '';
                                const rightBoundary = /[a-zA-Z0-9]$/.test(typo) ? '\\b' : '';
                                const escapedTypo = typo.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                const pattern = new RegExp(leftBoundary + escapedTypo + rightBoundary, 'gi');
                                if (pattern.test(tokenLower)) {
                                    token = token.replace(pattern, correction);
                                    tokenLower = token.toLowerCase();
                                }
                            }

                            token = token.replace(/\s+/g, ' ').trim();
                            validMajors.push(token);
                        }
                        
                        if (validMajors.length === 0) {
                             return "Semua Jurusan / Tidak Tertera";
                         }
                        return validMajors.join(", ").trim().replace(/[,.\s]+$/, '');
                    };
                    jurusan = cleanJurusanStr(jurusan);

                    hasilScraping.push({
                        "Judul Lowongan": job.judul,
                        "Perusahaan": job.perusahaan,
                        "Kota": kota,
                        "Industri": industri,
                        "Sektor": sektor,
                        "Pendidikan": pendidikan,
                        "Jurusan": jurusan,
                        "Link Detail": job.detailUrl,
                        "Kuota": job.kuota,
                        "Pelamar": job.pelamar
                    });

                } catch (err) {
                    console.error(`Gagal memproses detail ${job.judul}:`, err);
                }
                
                // Jitter (delay acak antara 150-300ms agar lebih aman terhadap WAF)
                await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150));
            }
            
            // Hapus iframe pekerja setelah selesai
            document.body.removeChild(iframe);
        }

        const workers = [];
        for (let w = 1; w <= concurrency; w++) {
            workers.push(worker(w));
        }
        await Promise.all(workers);
    }

    // --- PHASE 3: SELESAI & EKSPORT DATA ---
    if (hasilScraping.length > 0) {
        document.getElementById("scrape-status").innerText = "Selesai!";
        document.getElementById("scrape-status").style.color = "#81c784";
        document.getElementById("scrape-progress").style.backgroundColor = "#81c784";
        document.getElementById("scrape-progress-text").innerText = "100%";

        // Hilangkan tombol Hentikan Scraping
        const btnStop = document.getElementById("btn-stop-download");
        if (btnStop) btnStop.remove();

        // Siapkan File CSV
        const cleanCSVField = (text) => {
            if (!text) return "";
            return String(text).replace(/[\r\n]+/g, ' ').replace(/"/g, '""').trim();
        };

        let csvContent = "\uFEFFJudul Lowongan,Perusahaan,Kota,Industri,Sektor,Pendidikan,Jurusan,Link Detail,Kuota,Pelamar\n";
        hasilScraping.forEach(row => {
            csvContent += `"${cleanCSVField(row["Judul Lowongan"])}","${cleanCSVField(row["Perusahaan"])}","${cleanCSVField(row["Kota"])}","${cleanCSVField(row["Industri"])}","${cleanCSVField(row["Sektor"])}","${cleanCSVField(row["Pendidikan"])}","${cleanCSVField(row["Jurusan"])}","${cleanCSVField(row["Link Detail"])}","${row["Kuota"]}","${row["Pelamar"]}"\n`;
        });

        // Siapkan File JSON
        const jsonContent = JSON.stringify(hasilScraping, null, 2);

        // Render Action Buttons
        const actionArea = document.getElementById("dashboard-actions");
        actionArea.innerHTML = `
            <button id="btn-download-json" style="width: 100%; padding: 11px; background-color: #4fc3f7; color: #1e1e2f; border: none; border-radius: 6px; font-weight: bold; font-size: 13.5px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(79,195,247,0.3);">📥 UNDUH DATA (.JSON)</button>
            <button id="btn-download-csv" style="width: 100%; padding: 10px; background-color: rgba(255,255,255,0.08); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; transition: all 0.2s; hover:background:rgba(255,255,255,0.15)">📥 Unduh CSV Kerja</button>
        `;

        // Handle Download JSON (Database Siap Pakai)
        document.getElementById("btn-download-json").onclick = function() {
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.setAttribute("href", url);
            downloadLink.setAttribute("download", "loker_data.json");
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };

        // Handle Download CSV
        document.getElementById("btn-download-csv").onclick = function() {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.setAttribute("href", url);
            downloadLink.setAttribute("download", "loker_magang_pertamina_lengkap.csv");
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };

        // Otomatis download JSON demi efisiensi database website
        document.getElementById("btn-download-json").click();
        console.log("Scraping berhasil selesai! File database 'loker_data.json' telah diunduh otomatis.");
    } else {
        document.getElementById("scrape-status").innerText = "Gagal/Dihentikan";
        document.getElementById("scrape-status").style.color = "#e57373";
        console.log("Tidak ada data loker yang dikumpulkan.");
    }
})();
