(async function() {
    // --- 1. DUA INDIKATOR WIDGET JALUR DETAIL ---
    const widgetDetailUUID = "845abfe1-3f9d-4b3a-bda5-0a9f2f9083c2";
    const vacancyRegex = /845abfe1-3f9d-4b3a-bda5-0a9f2f9083c2\/\?id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

    const uniqueJobs = [];
    let pageNum = 1;
    let stopScraping = false;

    // --- 2. PEMBUATAN DASHBOARD VISUAL DI LAYAR ---
    const oldDash = document.getElementById("scraping-dashboard");
    if (oldDash) oldDash.remove();

    const dashboard = document.createElement("div");
    dashboard.id = "scraping-dashboard";
    dashboard.style.position = "fixed";
    dashboard.style.top = "20px";
    dashboard.style.right = "20px";
    dashboard.style.zIndex = "9999999";
    dashboard.style.padding = "20px";
    dashboard.style.backgroundColor = "#1e1e2f";
    dashboard.style.color = "#ffffff";
    dashboard.style.borderRadius = "12px";
    dashboard.style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)";
    dashboard.style.fontFamily = "sans-serif";
    dashboard.style.width = "320px";
    dashboard.style.border = "1px solid #3f3f5f";

    dashboard.innerHTML = `
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #4fc3f7; border-bottom: 1px solid #3f3f5f; padding-bottom: 8px;">Pertamina Web Scraper</h3>
        <div style="margin-bottom: 15px; font-size: 14px; line-height: 1.6;">
            <div>Status: <span id="scrape-status" style="color: #ffb74d; font-weight: bold;">Mencari halaman...</span></div>
            <div>Halaman Aktif: <span id="scrape-page" style="font-weight: bold; color: #4fc3f7;">1</span></div>
            <div>Loker Terdeteksi: <span id="scrape-count" style="font-weight: bold; color: #81c784;">0</span></div>
            <div style="margin-top: 10px; height: 8px; background-color: #37474f; border-radius: 4px; overflow: hidden;">
                <div id="scrape-progress" style="width: 0%; height: 100%; background-color: #4fc3f7; transition: width 0.3s;"></div>
            </div>
        </div>
        <button id="btn-stop-download" style="width: 100%; padding: 12px; background-color: #e57373; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer; transition: background-color 0.2s;">Hentikan & Unduh CSV</button>
    `;
    document.body.appendChild(dashboard);

    // Fungsi tombol stop
    document.getElementById("btn-stop-download").onclick = function() {
        stopScraping = true;
        this.innerText = "Menghentikan proses...";
        this.style.backgroundColor = "#ffb74d";
    };

    // --- 3. DETEKSI PAGINATION & CARTU SECARA CERDAS ---
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
        let count = 0;
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

                if (!uniqueJobs.some(job => job.id === vacancyId)) {
                    uniqueJobs.push({
                        id: vacancyId,
                        judul: judul,
                        perusahaan: perusahaan,
                        detailUrl: `https://recruitment.pertamina.com/object/widget/${widgetDetailUUID}/?id=${vacancyId}`
                    });
                    count++;
                }
            }
        });
        document.getElementById("scrape-count").innerText = uniqueJobs.length;
    }

    // --- PHASE 1: COLLECT HALAMAN LIST ---
    while (!stopScraping) {
        document.getElementById("scrape-status").innerText = "Mengumpulkan daftar lowongan...";
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

    // --- PHASE 2: SCRAPE DETAIL PARALEL (5 WORKERS) ---
    const hasilScraping = [];
    
    if (uniqueJobs.length > 0) {
        document.getElementById("scrape-status").innerText = "Menyiapkan pemindaian detail...";
        
        const concurrency = 5; 
        let currentIndex = 0;

        async function worker(workerId) {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '800px';
            iframe.style.height = '600px';
            iframe.style.left = '-9999px';
            iframe.style.top = '-9999px';
            document.body.appendChild(iframe);

            while (currentIndex < uniqueJobs.length && !stopScraping) {
                const index = currentIndex++;
                if (index >= uniqueJobs.length) break;

                const job = uniqueJobs[index];
                
                // Update Dashboard Status
                document.getElementById("scrape-status").innerText = `Memproses (${index + 1}/${uniqueJobs.length})`;
                const progressPercent = ((index + 1) / uniqueJobs.length) * 100;
                document.getElementById("scrape-progress").style.width = `${progressPercent}%`;

                try {
                    iframe.src = job.detailUrl;
                    
                    await new Promise((resolve) => {
                        iframe.onload = resolve;
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    iframeDoc.querySelectorAll('script, style').forEach(el => el.remove());
                    
                    const fullText = iframeDoc.body.innerText || iframeDoc.body.textContent || "";
                    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
                    
                    let pendidikan = "Tidak tertera";
                    let jurusan = "Semua Jurusan / Tidak tertera";
                    let kota = "Tidak tertera";
                    let industri = "Tidak tertera";
                    let sektor = "Tidak tertera";

                    // 1. Deteksi Kota berdasarkan icon lokasi (misal: icon--location, icon-location)
                    const iconLocation = iframeDoc.querySelector('.icon--location, .icon-location, i[class*="location"], i[class*="map"], i[class*="pin"]');
                    if (iconLocation && iconLocation.parentElement) {
                        kota = iconLocation.parentElement.innerText.trim();
                    }

                    // 2. Deteksi Industri berdasarkan icon tag
                    const iconIndustry = iframeDoc.querySelector('.icon--tag, .icon-tag, i[class*="tag"], i[class*="industry"]');
                    if (iconIndustry && iconIndustry.parentElement) {
                        industri = iconIndustry.parentElement.innerText.trim();
                    }

                    // 3. Deteksi Sektor berdasarkan icon briefcase/bag
                    const iconSector = iframeDoc.querySelector('.icon--briefcase, .icon-briefcase, .icon--bag, .icon-bag, i[class*="briefcase"], i[class*="bag"], i[class*="work"]');
                    if (iconSector && iconSector.parentElement) {
                        sektor = iconSector.parentElement.innerText.trim();
                    }

                    // Fallback jika deteksi icon tidak menemukan data
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

                    hasilScraping.push({
                        "Judul Lowongan": job.judul,
                        "Perusahaan": job.perusahaan,
                        "Kota": kota,
                        "Industri": industri,
                        "Sektor": sektor,
                        "Pendidikan": pendidikan,
                        "Jurusan": jurusan,
                        "Link Detail": job.detailUrl
                    });

                } catch (err) {
                    console.error(`Gagal memproses ${job.judul}:`, err);
                }
            }
            document.body.removeChild(iframe);
        }

        const workers = [];
        for (let w = 1; w <= concurrency; w++) {
            workers.push(worker(w));
        }
        await Promise.all(workers);
    }

    // --- PHASE 3: SELESAI & UNDUH DATA ---
    if (hasilScraping.length > 0) {
        document.getElementById("scrape-status").innerText = "Selesai!";
        document.getElementById("scrape-status").style.color = "#81c784";
        document.getElementById("scrape-progress").style.backgroundColor = "#81c784";

        let csvContent = "\uFEFFJudul Lowongan,Perusahaan,Kota,Industri,Sektor,Pendidikan,Jurusan,Link Detail\n";
        hasilScraping.forEach(row => {
            csvContent += `"${row["Judul Lowongan"].replace(/"/g, '""')}","${row["Perusahaan"].replace(/"/g, '""')}","${row["Kota"].replace(/"/g, '""')}","${row["Industri"].replace(/"/g, '""')}","${row["Sektor"].replace(/"/g, '""')}","${row["Pendidikan"].replace(/"/g, '""')}","${row["Jurusan"].replace(/"/g, '""')}","${row["Link Detail"].replace(/"/g, '""')}"\n`;
        });

        // Modifikasi tombol stop menjadi tombol download besar
        const actionBtn = document.getElementById("btn-stop-download");
        actionBtn.innerText = "UNDUH CSV LENGKAP";
        actionBtn.style.backgroundColor = "#28a745";
        
        actionBtn.onclick = function() {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.setAttribute("href", url);
            downloadLink.setAttribute("download", "loker_magang_pertamina_semua.csv");
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };

        // Picu download otomatis
        actionBtn.click();
        console.log("Selesai! Klik tombol hijau di kanan atas jika file belum terunduh otomatis.");
    } else {
        document.getElementById("scrape-status").innerText = "Gagal/Dihentikan";
        document.getElementById("scrape-status").style.color = "#e57373";
        console.log("Tidak ada data lowongan yang berhasil dikumpulkan.");
    }
})();
