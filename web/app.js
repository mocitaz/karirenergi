// State variables
let jobListings = [];
let filteredListings = [];

// DOM Elements
const searchInput = document.getElementById("search-input");
const filterCompany = document.getElementById("filter-company");
const filterMajor = document.getElementById("filter-major");
const filterCity = document.getElementById("filter-city");
const filterEdu = document.getElementById("filter-edu");
const sortSelect = document.getElementById("sort-select");
const btnReset = document.getElementById("btn-reset");
const jobGrid = document.getElementById("job-grid");
const resultsCount = document.getElementById("results-count");

// Stat Elements
const statTotal = document.getElementById("stat-total");
const statCompanies = document.getElementById("stat-companies");
const statCities = document.getElementById("stat-cities");
const statS1 = document.getElementById("stat-s1");

// Modal Elements
const detailModal = document.getElementById("detail-modal");
const modalTitle = document.getElementById("modal-title");
const modalCompany = document.getElementById("modal-company");
const modalLocation = document.getElementById("modal-location");
const modalEducation = document.getElementById("modal-education");
const modalIndustry = document.getElementById("modal-industry");
const modalSector = document.getElementById("modal-sector");
const modalMajors = document.getElementById("modal-majors");
const modalApplyLink = document.getElementById("modal-apply-link");
const btnCloseModal = document.getElementById("btn-close-modal");

// Load data on window load
window.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
    try {
        console.log("Loading vacancy data...");
        const response = await fetch("loker_data.json");
        jobListings = await response.json();
        
        // Clean data (trim whitespaces, etc.)
        jobListings = jobListings.map(job => ({
            ...job,
            "Judul Lowongan": job["Judul Lowongan"] ? job["Judul Lowongan"].trim() : "Tidak tertera",
            "Perusahaan": job["Perusahaan"] ? job["Perusahaan"].trim() : "PT Pertamina",
            "Kota": job["Kota"] ? job["Kota"].trim() : "Tidak tertera",
            "Industri": job["Industri"] ? job["Industri"].trim() : "Tidak tertera",
            "Sektor": job["Sektor"] ? job["Sektor"].trim() : "Tidak tertera",
            "Pendidikan": job["Pendidikan"] ? job["Pendidikan"].trim() : "Tidak tertera",
            "Jurusan": job["Jurusan"] ? job["Jurusan"].trim() : "Semua Jurusan / Tidak tertera",
        }));
        
        filteredListings = [...jobListings];
        
        populateFilters();
        updateStats();
        renderJobs();
        setupListeners();
    } catch (err) {
        console.error("Failed to load vacancy data:", err);
        jobGrid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation" style="color: #ff5252;"></i>
                <p>Gagal memuat data. Hubungi administrator atau pastikan 'loker_data.json' tersedia.</p>
            </div>
        `;
    }
}

// Populate filter dropdowns with unique sorted values
function populateFilters() {
    const companies = new Set();
    const cities = new Set();
    const educations = new Set();
    const majors = new Set();
    
    jobListings.forEach(job => {
        if (job["Perusahaan"]) companies.add(job["Perusahaan"]);
        if (job["Kota"] && job["Kota"] !== "Tidak tertera") cities.add(job["Kota"]);
        if (job["Pendidikan"] && job["Pendidikan"] !== "Tidak tertera") educations.add(job["Pendidikan"]);
        
        // Ekstrak jurusan individual dari daftar koma/kombinasi
        if (job["Jurusan"] && job["Jurusan"] !== "Semua Jurusan / Tidak tertera") {
            const parts = job["Jurusan"].split(/,|\bserta\b|dan|;/gi);
            parts.forEach(p => {
                const trimmed = p.replace(/[\s\.\-\(\)]+/g, ' ').trim();
                const capitalized = trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                
                if (capitalized && capitalized.length > 2 && capitalized.length < 40 && !capitalized.toLowerCase().includes("tidak tertera") && !capitalized.toLowerCase().includes("semua jurusan")) {
                    majors.add(capitalized);
                }
            });
        }
    });
    
    // Populate Company dropdown
    Array.from(companies).sort().forEach(company => {
        const opt = document.createElement("option");
        opt.value = company;
        opt.textContent = company;
        filterCompany.appendChild(opt);
    });
    
    // Populate Jurusan dropdown
    Array.from(majors).sort().forEach(major => {
        const opt = document.createElement("option");
        opt.value = major;
        opt.textContent = major;
        filterMajor.appendChild(opt);
    });
    
    // Populate City dropdown
    Array.from(cities).sort().forEach(city => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        filterCity.appendChild(opt);
    });
    
    // Populate Education dropdown
    Array.from(educations).sort().forEach(edu => {
        const opt = document.createElement("option");
        opt.value = edu;
        opt.textContent = edu;
        filterEdu.appendChild(opt);
    });
}

// Update stats dashboard
function updateStats() {
    statTotal.textContent = jobListings.length;
    
    const companies = new Set(jobListings.map(j => j["Perusahaan"]));
    statCompanies.textContent = companies.size;
    
    const cities = new Set(jobListings.map(j => j["Kota"]).filter(c => c !== "Tidak tertera"));
    statCities.textContent = cities.size;
    
    const s1Jobs = jobListings.filter(j => {
        const edu = j["Pendidikan"].toLowerCase();
        return edu.includes("s1") || edu.includes("sarjana") || edu.includes("d4/s1");
    });
    statS1.textContent = s1Jobs.length;
}

// Render filtered jobs
function renderJobs() {
    jobGrid.innerHTML = "";
    resultsCount.textContent = filteredListings.length;
    
    if (filteredListings.length === 0) {
        jobGrid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <p>Tidak ada lowongan yang cocok dengan kriteria filter Anda.</p>
            </div>
        `;
        return;
    }
    
    filteredListings.forEach(job => {
        const card = document.createElement("div");
        card.className = "job-card";
        
        card.innerHTML = `
            <div class="job-card-header">
                <span class="company-name">${job["Perusahaan"]}</span>
                <h3 class="job-title" title="${job["Judul Lowongan"]}">${job["Judul Lowongan"]}</h3>
                <div class="job-meta-list">
                    <div class="job-meta-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${job["Kota"]}</span>
                    </div>
                    <div class="job-meta-item">
                        <i class="fa-solid fa-industry"></i>
                        <span>${job["Industri"]}</span>
                    </div>
                </div>
            </div>
            <div>
                <span class="badge-edu">${job["Pendidikan"]}</span>
            </div>
            <div class="job-card-footer">
                <button class="btn-primary btn-view-detail" data-id="${encodeURIComponent(job["Link Detail"])}">
                    Lihat Detail <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `;
        
        jobGrid.appendChild(card);
    });
    
    // Bind click events to view detail buttons
    document.querySelectorAll(".btn-view-detail").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const detailUrl = decodeURIComponent(e.currentTarget.getAttribute("data-id"));
            showJobDetail(detailUrl);
        });
    });
}

// Filter and sort listings
function applyFilters() {
    const q = searchInput.value.toLowerCase().trim();
    const comp = filterCompany.value;
    const major = filterMajor.value.toLowerCase();
    const city = filterCity.value;
    const edu = filterEdu.value;
    
    filteredListings = jobListings.filter(job => {
        // Search filter
        const matchSearch = !q || 
            job["Judul Lowongan"].toLowerCase().includes(q) || 
            job["Perusahaan"].toLowerCase().includes(q) || 
            job["Jurusan"].toLowerCase().includes(q) ||
            job["Kota"].toLowerCase().includes(q);
            
        // Company filter
        const matchCompany = !comp || job["Perusahaan"] === comp;
        
        // Major filter (checking if selected major is included in the job's majors list)
        const matchMajor = !major || job["Jurusan"].toLowerCase().includes(major);
        
        // City filter
        const matchCity = !city || job["Kota"] === city;
        
        // Education filter
        const matchEdu = !edu || job["Pendidikan"] === edu;
        
        return matchSearch && matchCompany && matchMajor && matchCity && matchEdu;
    });
    
    applySort();
}

// Sort listings
function applySort() {
    const sortVal = sortSelect.value;
    
    if (sortVal === "perusahaan") {
        filteredListings.sort((a, b) => a["Perusahaan"].localeCompare(b["Perusahaan"]));
    } else if (sortVal === "judul") {
        filteredListings.sort((a, b) => a["Judul Lowongan"].localeCompare(b["Judul Lowongan"]));
    }
    
    renderJobs();
}

// Reset filters
function resetFilters() {
    searchInput.value = "";
    filterCompany.value = "";
    filterMajor.value = "";
    filterCity.value = "";
    filterEdu.value = "";
    sortSelect.value = "perusahaan";
    
    filteredListings = [...jobListings];
    applySort();
}

// Event Listeners setup
function setupListeners() {
    searchInput.addEventListener("input", applyFilters);
    filterCompany.addEventListener("change", applyFilters);
    filterMajor.addEventListener("change", applyFilters);
    filterCity.addEventListener("change", applyFilters);
    filterEdu.addEventListener("change", applyFilters);
    sortSelect.addEventListener("change", applySort);
    btnReset.addEventListener("click", resetFilters);
    
    // Close modal triggers
    btnCloseModal.addEventListener("click", hideModal);
    detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) hideModal();
    });
    
    // Escape key close modal
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && detailModal.style.display !== "none") {
            hideModal();
        }
    });
}

// Show job detail modal
function showJobDetail(url) {
    const job = jobListings.find(j => j["Link Detail"] === url);
    if (!job) return;
    
    modalTitle.textContent = job["Judul Lowongan"];
    modalCompany.textContent = job["Perusahaan"];
    modalLocation.textContent = job["Kota"];
    modalEducation.textContent = job["Pendidikan"];
    modalIndustry.textContent = job["Industri"];
    modalSector.textContent = job["Sektor"];
    modalMajors.textContent = job["Jurusan"];
    modalApplyLink.href = job["Link Detail"];
    
    detailModal.style.display = "flex";
}

function hideModal() {
    detailModal.style.display = "none";
}
