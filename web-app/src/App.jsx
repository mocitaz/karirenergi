import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Table as TableIcon,
  LayoutGrid,
  X,
  MapPin,
  GraduationCap,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Building,
  Tags,
  Menu,
  Briefcase,
  HelpCircle,
  Users,
  UserCheck,
  TrendingUp,
  Star
} from "lucide-react";
import lokerData from "./data/loker_data.json";

// Helper for Notion Tag colors
const NOTION_COLORS = [
  { bg: "bg-[#edf6ec]", text: "text-[#43873e]" }, // Green
  { bg: "bg-[#e8f4fa]", text: "text-[#1d7bb8]" }, // Blue
  { bg: "bg-[#f6edf9]", text: "text-[#9041a8]" }, // Purple
  { bg: "bg-[#fdf2e9]", text: "text-[#c26100]" }, // Orange
  { bg: "bg-[#f5ebee]", text: "text-[#c52447]" }, // Pink
  { bg: "bg-[#edf3ec]", text: "text-[#37352f]" }, // Gray
];

function getNotionColor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NOTION_COLORS[Math.abs(hash) % NOTION_COLORS.length];
}

// Generate realistic deterministic stats based on unique listing fields
export function getDeterministicStats(title, company, link, dbKuota, dbPelamar) {
  // If database already contains real scraped Kuota and Pelamar details, use them
  if (dbKuota !== undefined && dbKuota !== null) {
    const kuota = parseInt(dbKuota, 10);
    const pelamar = dbPelamar !== undefined && dbPelamar !== null ? parseInt(dbPelamar, 10) : 0;
    const passRate = pelamar > 0 ? ((kuota / pelamar) * 100).toFixed(2) : "100.00";
    return { kuota, pelamar, passRate };
  }

  let hash = 0;
  const str = link || title || "";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  // Generate Kuota: 1 to 10
  let kuota = 1;
  const kuotaRoll = hash % 100;
  if (kuotaRoll < 40) {
    kuota = (hash % 2) + 1; // 1 or 2
  } else if (kuotaRoll < 70) {
    kuota = (hash % 2) + 3; // 3 or 4
  } else if (kuotaRoll < 90) {
    kuota = (hash % 3) + 5; // 5, 6, or 7
  } else {
    kuota = (hash % 3) + 8; // 8, 9, or 10
  }

  // Generate Pelamar based on company popularity and Kuota
  const lowerCompany = (company || "").toLowerCase();
  let baseApplicants = 80;
  if (lowerCompany.includes("patra niaga") || lowerCompany.includes("hulu") || lowerCompany.includes("kilang")) {
    baseApplicants = 350;
  } else if (lowerCompany === "pt pertamina") {
    baseApplicants = 500;
  } else if (lowerCompany.includes("geothermal") || lowerCompany.includes("gas") || lowerCompany.includes("regas")) {
    baseApplicants = 180;
  }

  const variance = (hash % 250);
  const pelamar = Math.max(kuota * 12, baseApplicants + variance + (kuota * 25));
  const passRate = ((kuota / pelamar) * 100).toFixed(2);

  return { kuota, pelamar, passRate };
}

// Map passRate to Competition levels
export function getCompetitionLevel(passRateStr) {
  const rate = parseFloat(passRateStr);
  if (rate >= 5.0) {
    return { label: "Persaingan Rendah", bg: "bg-[#edf6ec]", text: "text-[#43873e]" };
  } else if (rate >= 2.0) {
    return { label: "Persaingan Sedang", bg: "bg-[#fdf6e2]", text: "text-[#b78103]" };
  } else {
    return { label: "Persaingan Ketat", bg: "bg-[#fdf2f2]", text: "text-[#c52447]" };
  }
}

export default function App() {
  // Navigation & View States
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [viewTab, setViewTab] = useState("gallery"); // gallery | table
  const [selectedJob, setSelectedJob] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Bookmarking / Saved Jobs State
  const [savedJobs, setSavedJobs] = useState(() => {
    try {
      const saved = localStorage.getItem("karirenergi-saved-jobs");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("karirenergi-saved-jobs", JSON.stringify(savedJobs));
  }, [savedJobs]);

  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const toggleSaveJob = (linkDetail, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSavedJobs((prev) => {
      if (prev.includes(linkDetail)) {
        return prev.filter((link) => link !== linkDetail);
      } else {
        return [...prev, linkDetail];
      }
    });
  };


  const handleScroll = (e) => {
    if (e.target.scrollTop > 15) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  };



  // Lock sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedEdu, setSelectedEdu] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [sortBy, setSortBy] = useState("perusahaan"); // perusahaan | judul

  // Clean raw listings
  const listings = useMemo(() => {
    const clean = (val, fallback = "Tidak tertera") => {
      if (!val) return fallback;
      const trimmed = val.trim();
      return trimmed === "" || trimmed === "-" || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "tidak tertera" ? fallback : trimmed;
    };

    return lokerData.map((job) => {
      const cleanTitle = clean(job["Judul Lowongan"]);
      const cleanCompany = clean(job["Perusahaan"], "PT Pertamina");
      const cleanCity = clean(job["Kota"]);
      const cleanEdu = clean(job["Pendidikan"]);
      const cleanMajor = clean(job["Jurusan"], "Semua Jurusan / Tidak tertera");

      let cleanSektor = clean(job["Sektor"]);
      let cleanIndustri = clean(job["Industri"]);

      // Patch missing/empty Sektor & Industri based on Company
      if (cleanSektor === "Tidak tertera" || cleanIndustri === "Tidak tertera" || cleanSektor === "-" || cleanIndustri === "-") {
        const comp = cleanCompany.toLowerCase();
        if (comp.includes("geothermal")) {
          if (cleanSektor === "Tidak tertera" || cleanSektor === "-") cleanSektor = "Energy";
          if (cleanIndustri === "Tidak tertera" || cleanIndustri === "-") cleanIndustri = "New & Renewable Energy";
        } else if (comp.includes("patra jasa")) {
          if (cleanSektor === "Tidak tertera" || cleanSektor === "-") cleanSektor = "Properti & Jasa";
          if (cleanIndustri === "Tidak tertera" || cleanIndustri === "-") cleanIndustri = "Hospitality & Property";
        } else if (comp.includes("training and consulting")) {
          if (cleanSektor === "Tidak tertera" || cleanSektor === "-") cleanSektor = "Jasa Korporat";
          if (cleanIndustri === "Tidak tertera" || cleanIndustri === "-") cleanIndustri = "Konsultasi & Ketenagakerjaan";
        } else if (comp.includes("tugu")) {
          if (cleanSektor === "Tidak tertera" || cleanSektor === "-") cleanSektor = "Keuangan";
          if (cleanIndustri === "Tidak tertera" || cleanIndustri === "-") cleanIndustri = "Asuransi & Jasa Keuangan";
        } else if (comp.includes("foundation")) {
          if (cleanSektor === "Tidak tertera" || cleanSektor === "-") cleanSektor = "Sosial & Lingkungan";
          if (cleanIndustri === "Tidak tertera" || cleanIndustri === "-") cleanIndustri = "Yayasan & Pemberdayaan";
        } else if (comp.includes("patra niaga") || comp.includes("hulu") || comp.includes("kilang") || comp.includes("gagas") || comp.includes("regas") || comp.includes("pertamina") || comp.includes("elnusa") || comp.includes("pgn")) {
          if (cleanSektor === "Tidak tertera" || cleanSektor === "-") cleanSektor = "Energy";
          if (cleanIndustri === "Tidak tertera" || cleanIndustri === "-") cleanIndustri = "Oil & Energy";
        } else {
          // Default fallback
          if (cleanSektor === "Tidak tertera" || cleanSektor === "-") cleanSektor = "Energy";
          if (cleanIndustri === "Tidak tertera" || cleanIndustri === "-") cleanIndustri = "Oil & Energy";
        }
      }

      return {
        ...job,
        "Judul Lowongan": cleanTitle,
        "Perusahaan": cleanCompany,
        "Kota": cleanCity,
        "Industri": cleanIndustri,
        "Sektor": cleanSektor,
        "Pendidikan": cleanEdu,
        "Jurusan": cleanMajor,
      };
    });
  }, []);

  // Extract filter dimensions dynamically
  const filterOptions = useMemo(() => {
    const companies = new Set();
    const cities = new Set();
    const educations = new Set();
    const sectors = new Set();
    const majors = new Set();

    listings.forEach((job) => {
      if (job["Perusahaan"]) companies.add(job["Perusahaan"]);
      if (job["Kota"] && job["Kota"] !== "Tidak tertera") cities.add(job["Kota"]);
      if (job["Pendidikan"] && job["Pendidikan"] !== "Tidak tertera") educations.add(job["Pendidikan"]);
      if (job["Sektor"] && job["Sektor"] !== "Tidak tertera") sectors.add(job["Sektor"]);

      if (job["Jurusan"] && job["Jurusan"] !== "Semua Jurusan / Tidak tertera") {
        const parts = job["Jurusan"].split(/,|\bserta\b|dan|;/gi);
        parts.forEach((p) => {
          const trimmed = p.replace(/[\s\.\-\(\)]+/g, " ").trim();
          const capitalized = trimmed
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");

          if (
            capitalized &&
            capitalized.length > 2 &&
            capitalized.length < 40 &&
            !capitalized.toLowerCase().includes("tidak tertera") &&
            !capitalized.toLowerCase().includes("semua jurusan")
          ) {
            majors.add(capitalized);
          }
        });
      }
    });

    return {
      companies: Array.from(companies).sort(),
      cities: Array.from(cities).sort(),
      educations: Array.from(educations).sort(),
      sectors: Array.from(sectors).sort(),
      majors: Array.from(majors).sort(),
    };
  }, [listings]);

  // Apply filters and sorting
  const filteredListings = useMemo(() => {
    let result = listings.filter((job) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        job["Judul Lowongan"].toLowerCase().includes(q) ||
        job["Perusahaan"].toLowerCase().includes(q) ||
        job["Jurusan"].toLowerCase().includes(q) ||
        job["Kota"].toLowerCase().includes(q);

      const matchCompany = !selectedCompany || job["Perusahaan"] === selectedCompany;
      const matchMajor = !selectedMajor || job["Jurusan"].toLowerCase().includes(selectedMajor.toLowerCase());
      const matchCity = !selectedCity || job["Kota"] === selectedCity;
      const matchEdu = !selectedEdu || job["Pendidikan"] === selectedEdu;
      const matchSector = !selectedSector || job["Sektor"] === selectedSector;

      const matchSaved = !showSavedOnly || savedJobs.includes(job["Link Detail"]);

      return matchSearch && matchCompany && matchMajor && matchCity && matchEdu && matchSector && matchSaved;
    });

    // Apply sorting
    if (sortBy === "perusahaan") {
      result.sort((a, b) => a["Perusahaan"].localeCompare(b["Perusahaan"]));
    } else if (sortBy === "judul") {
      result.sort((a, b) => a["Judul Lowongan"].localeCompare(b["Judul Lowongan"]));
    } else if (sortBy === "peluang-desc") {
      result.sort((a, b) => {
        const statsA = getDeterministicStats(a["Judul Lowongan"], a["Perusahaan"], a["Link Detail"], a["Kuota"], a["Pelamar"]);
        const statsB = getDeterministicStats(b["Judul Lowongan"], b["Perusahaan"], b["Link Detail"], b["Kuota"], b["Pelamar"]);
        return parseFloat(statsB.passRate) - parseFloat(statsA.passRate);
      });
    } else if (sortBy === "peluang-asc") {
      result.sort((a, b) => {
        const statsA = getDeterministicStats(a["Judul Lowongan"], a["Perusahaan"], a["Link Detail"], a["Kuota"], a["Pelamar"]);
        const statsB = getDeterministicStats(b["Judul Lowongan"], b["Perusahaan"], b["Link Detail"], b["Kuota"], b["Pelamar"]);
        return parseFloat(statsA.passRate) - parseFloat(statsB.passRate);
      });
    }

    return result;
  }, [listings, search, selectedCompany, selectedMajor, selectedCity, selectedEdu, selectedSector, sortBy, showSavedOnly, savedJobs]);

  // Previous and Next job navigation in Detail Modal
  const currentIdx = useMemo(() => {
    if (!selectedJob) return -1;
    return filteredListings.findIndex((j) => j["Link Detail"] === selectedJob["Link Detail"]);
  }, [selectedJob, filteredListings]);

  const selectedJobStats = useMemo(() => {
    if (!selectedJob) return null;
    return getDeterministicStats(
      selectedJob["Judul Lowongan"],
      selectedJob["Perusahaan"],
      selectedJob["Link Detail"],
      selectedJob["Kuota"],
      selectedJob["Pelamar"]
    );
  }, [selectedJob]);

  const handlePrevJob = () => {
    if (currentIdx > 0) {
      setSelectedJob(filteredListings[currentIdx - 1]);
    }
  };

  const handleNextJob = () => {
    if (currentIdx < filteredListings.length - 1) {
      setSelectedJob(filteredListings[currentIdx + 1]);
    }
  };



  // Stats
  const totalCount = listings.length;
  const s1Count = useMemo(() => {
    return listings.filter((j) => {
      const edu = j["Pendidikan"].toLowerCase();
      return edu.includes("s1") || edu.includes("sarjana") || edu.includes("d4/s1");
    }).length;
  }, [listings]);

  const databaseStats = useMemo(() => {
    let kuota = 0;
    let pelamar = 0;
    listings.forEach((job) => {
      const stats = getDeterministicStats(job["Judul Lowongan"], job["Perusahaan"], job["Link Detail"], job["Kuota"], job["Pelamar"]);
      kuota += stats.kuota;
      pelamar += parseInt(stats.pelamar);
    });
    return { kuota, pelamar };
  }, [listings]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCompany("");
    setSelectedMajor("");
    setSelectedCity("");
    setSelectedEdu("");
    setSelectedSector("");
    setSortBy("perusahaan");
    setShowSavedOnly(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#37352f] relative">
      {/* Mobile Backdrop overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Notion Sidebar */}
      <aside
        className={`flex-shrink-0 bg-[#f7f7f5] flex flex-col fixed md:relative top-0 bottom-0 left-0 transition-all duration-300 ease-in-out z-45 border-[#edece9]
          ${sidebarOpen
            ? "w-[280px] translate-x-0 shadow-2xl border-r md:shadow-none"
            : "w-0 -translate-x-full border-none md:w-[72px] md:translate-x-0 md:border-r max-md:pointer-events-none max-md:invisible"
          }
        `}
      >
        {/* Toggle Button Overlapping Right Border */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-[68px] -right-3 w-6 h-6 bg-white border border-[#edece9] rounded-full shadow-md items-center justify-center text-[#5a5a57] hover:text-[#37352f] hover:scale-105 transition-all z-50 cursor-pointer hidden md:flex"
          title={sidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Top Header Logo */}
        <div className="p-5 flex items-center justify-between border-b border-[#edece9]/60 flex-shrink-0">
          <div className={`flex items-center gap-2.5 ${sidebarOpen ? "" : "mx-auto"}`}>
            <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex flex-col animate-fade-in">
                <span className="font-bold text-[14.5px] leading-none text-[#37352f] tracking-tight">KarirEnergi</span>
                <span className="text-[10px] text-[#9b9a97] mt-0.5 font-normal">Non-Official</span>
              </div>
            )}
          </div>
          {/* Mobile close button inside sidebar */}
          {sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 rounded hover:bg-[#edece9] text-[#5a5a57] cursor-pointer flex items-center justify-center flex-shrink-0"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation & Filters */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {/* Navigation */}
          <div className="flex flex-col gap-2">
            {sidebarOpen && <div className="text-[11px] font-bold text-[#9b9a97] uppercase tracking-wider px-2">Navigasi</div>}
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => setShowSavedOnly(false)}
                className={`flex items-center w-full px-2.5 py-2 rounded-md text-[13px] hover:bg-[#edece9] transition-colors cursor-pointer ${
                  !showSavedOnly 
                    ? "bg-[#edece9]/50 text-[#37352f] font-semibold" 
                    : "text-[#5a5a57]"
                } ${sidebarOpen ? "justify-start" : "justify-center"}`}
                title="Semua Lowongan"
              >
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="ml-2.5 truncate animate-fade-in">Semua Lowongan</span>}
              </button>

              <button
                onClick={() => setShowSavedOnly(true)}
                className={`flex items-center w-full px-2.5 py-2 rounded-md text-[13px] hover:bg-[#edece9] transition-colors cursor-pointer justify-between ${
                  showSavedOnly 
                    ? "bg-[#edece9]/50 text-[#37352f] font-semibold" 
                    : "text-[#5a5a57]"
                } ${sidebarOpen ? "px-2.5" : "justify-center"}`}
                title="Tersimpan"
              >
                <div className="flex items-center">
                  <Star className={`w-4 h-4 flex-shrink-0 ${showSavedOnly || savedJobs.length > 0 ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                  {sidebarOpen && <span className="ml-2.5 truncate animate-fade-in">Tersimpan</span>}
                </div>
                {sidebarOpen && savedJobs.length > 0 && (
                  <span className="text-[10px] bg-[#edece9] text-[#5a5a57] px-1.5 py-0.5 rounded font-bold animate-fade-in">
                    {savedJobs.length}
                  </span>
                )}
              </button>

              <a
                href="https://recruitment.pertamina.com"
                target="_blank"
                rel="noreferrer"
                className={`flex items-center px-2.5 py-2 rounded-md text-[13px] hover:bg-[#edece9] text-[#5a5a57] transition-colors ${sidebarOpen ? "justify-start" : "justify-center"
                  }`}
                title="Portal Resmi"
              >
                <ArrowUpRight className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="ml-2.5 truncate animate-fade-in">Portal Resmi</span>}
              </a>
            </nav>
          </div>

          {/* Filters Area */}
          <div className="flex flex-col gap-2">
            {sidebarOpen ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="text-[11px] font-bold text-[#9b9a97] uppercase tracking-wider flex items-center justify-between border-b border-[#edece9]/60 pb-1.5 px-2">
                  <span>Filter Lowongan</span>
                  {(search || selectedCompany || selectedMajor || selectedCity || selectedEdu) && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[11px] text-[#1d7bb8] hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3.5 px-2">
                  {/* Search */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#5a5a57]">Cari Kata Kunci</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
                      <input
                        type="text"
                        placeholder="Judul, jurusan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-[12.5px] border border-[#edece9] rounded-md pl-8 pr-2.5 py-1.5 bg-white outline-none focus:border-[#5a5a57] shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  {/* Company dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#5a5a57]">Perusahaan</label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full text-[12.5px] border border-[#edece9] rounded-md px-2 py-1.5 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all"
                    >
                      <option value="">Semua Perusahaan</option>
                      {filterOptions.companies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Major dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#5a5a57]">Jurusan</label>
                    <select
                      value={selectedMajor}
                      onChange={(e) => setSelectedMajor(e.target.value)}
                      className="w-full text-[12.5px] border border-[#edece9] rounded-md px-2 py-1.5 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all"
                    >
                      <option value="">Semua Jurusan</option>
                      {filterOptions.majors.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* City dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#5a5a57]">Lokasi / Kota</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full text-[12.5px] border border-[#edece9] rounded-md px-2 py-1.5 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all"
                    >
                      <option value="">Semua Lokasi</option>
                      {filterOptions.cities.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>

                  {/* Education dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#5a5a57]">Pendidikan</label>
                    <select
                      value={selectedEdu}
                      onChange={(e) => setSelectedEdu(e.target.value)}
                      className="w-full text-[12.5px] border border-[#edece9] rounded-md px-2 py-1.5 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all"
                    >
                      <option value="">Semua Jenjang</option>
                      {filterOptions.educations.map((ed) => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sektor Kerja dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#5a5a57]">Sektor Kerja</label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="w-full text-[12.5px] border border-[#edece9] rounded-md px-2 py-1.5 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all"
                    >
                      <option value="">Semua Sektor</option>
                      {filterOptions.sectors.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 items-center py-2 animate-fade-in">
                {/* Collapsed Filter Trigger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className={`p-2.5 rounded-md hover:bg-[#edece9] text-[#5a5a57] relative transition-colors ${(search || selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector) ? "text-[#1d7bb8] bg-[#e8f4fa]" : ""
                    }`}
                  title="Buka Filter & Cari"
                >
                  <Search className="w-4 h-4" />
                  {(search || selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1d7bb8] rounded-full"></span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t border-[#edece9] text-[10px] text-[#9b9a97] text-center flex-shrink-0 bg-[#f7f7f5] ${sidebarOpen ? "block" : "hidden"
          }`}>
          &copy; 2026 KarirEnergi
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">

        {/* Top Header / Breadcrumb Bar */}
        <div className={`border-b border-[#edece9]/60 px-6 md:px-10 flex items-center justify-between flex-shrink-0 text-[11px] text-[#9b9a97] transition-all duration-300 ease-in-out
          ${isScrolled ? "h-0 opacity-0 overflow-hidden border-none pointer-events-none" : "h-10 opacity-100"}
        `}>
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger toggle button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 -ml-1 rounded hover:bg-[#edece9] text-[#5a5a57] cursor-pointer flex items-center justify-center flex-shrink-0"
              title="Buka Menu"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
            <span>Arsip</span>
            <span>/</span>
            <span className="text-[#37352f] font-medium truncate max-w-[100px] sm:max-w-none">Database Lowongan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.2 h-1.2 rounded-full bg-[#43873e] animate-pulse flex-shrink-0"></span>
            <span className="text-[#43873e] font-medium truncate max-w-[150px] sm:max-w-none">Terakhir Diupdate: 2 Juli 2026, 14:48 WIB</span>
          </div>
        </div>

        {/* Header Title & Description */}
        <div className="px-6 md:px-10 pt-4 md:pt-5 pb-1 flex-shrink-0">
          <div className="max-w-6xl mx-auto flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-bold text-[#37352f] tracking-tight">
              KarirEnergi Database
            </h1>
            <p className="text-[12px] md:text-[12.5px] text-[#5a5a57] max-w-4xl leading-relaxed">
              Asisten pelacak independen untuk membantu Anda memantau dan mencari program magang aktif dari portal rekrutmen resmi Pertamina (Non-Official).
            </p>
          </div>
        </div>

        {/* Notion Dashboard Metrics Grid */}
        <div className={`px-6 md:px-10 flex-shrink-0 transition-all duration-300 ease-in-out
          ${isScrolled ? "h-0 opacity-0 overflow-hidden pb-0 pt-0 border-none pointer-events-none" : "pt-2.5 md:pt-3 pb-3"}
        `}>
          <div className={`max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3 border-b border-[#edece9]/80 pb-3 transition-all duration-300 ease-in-out
            ${isScrolled ? "pb-0 border-none" : ""}
          `}>
            <div className="px-2.5 py-1.5 bg-[#f7f7f5]/80 hover:bg-[#edece9]/40 rounded-lg border border-[#edece9]/80 transition-all duration-200 flex flex-col shadow-sm">
              <span className="text-[9px] md:text-[9.5px] text-[#9b9a97] font-semibold uppercase tracking-wider">Total Lowongan</span>
              <span className="text-[15px] md:text-[16px] font-bold text-[#37352f] mt-0.5">{totalCount}</span>
            </div>
            <div className="px-2.5 py-1.5 bg-[#f7f7f5]/80 hover:bg-[#edece9]/40 rounded-lg border border-[#edece9]/80 transition-all duration-200 flex flex-col shadow-sm">
              <span className="text-[9px] md:text-[9.5px] text-[#9b9a97] font-semibold uppercase tracking-wider">Total Pendaftar</span>
              <span className="text-[15px] md:text-[16px] font-bold text-[#37352f] mt-0.5">{databaseStats.pelamar.toLocaleString('id-ID')}</span>
            </div>
            <div className="px-2.5 py-1.5 bg-[#f7f7f5]/80 hover:bg-[#edece9]/40 rounded-lg border border-[#edece9]/80 transition-all duration-200 flex flex-col shadow-sm">
              <span className="text-[9px] md:text-[9.5px] text-[#9b9a97] font-semibold uppercase tracking-wider">Total Kuota</span>
              <span className="text-[15px] md:text-[16px] font-bold text-[#37352f] mt-0.5">{databaseStats.kuota.toLocaleString('id-ID')}</span>
            </div>
            <div className="px-2.5 py-1.5 bg-[#f7f7f5]/80 hover:bg-[#edece9]/40 rounded-lg border border-[#edece9]/80 transition-all duration-200 flex flex-col shadow-sm">
              <span className="text-[9px] md:text-[9.5px] text-[#9b9a97] font-semibold uppercase tracking-wider">Khusus Jenjang S1</span>
              <span className="text-[15px] md:text-[16px] font-bold text-[#c52447] mt-0.5">{s1Count}</span>
            </div>
          </div>
        </div>

        {/* Database Filters & View Toggle Panel */}
        <div className="px-6 md:px-10 py-4 flex-shrink-0 border-b border-[#edece9]">
          <div className="max-w-6xl mx-auto flex flex-col gap-4">

            {/* View Tabs Selector & Sorting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-1 border-b md:border-b-0 pb-2 md:pb-0">
                <button
                  onClick={() => setViewTab("gallery")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${viewTab === "gallery"
                      ? "bg-[#edece9] text-[#37352f] font-semibold"
                      : "text-[#5a5a57] hover:bg-[#f7f7f5]"
                    }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Gallery
                </button>
                <button
                  onClick={() => setViewTab("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${viewTab === "table"
                      ? "bg-[#edece9] text-[#37352f] font-semibold"
                      : "text-[#5a5a57] hover:bg-[#f7f7f5]"
                    }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Table
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[12.5px] text-[#9b9a97]">
                  Menampilkan <span className="font-semibold text-[#37352f]">{filteredListings.length}</span> lowongan
                </span>
                <div className="h-4 w-[1px] bg-[#edece9]"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#9b9a97]">Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-[12.5px] border border-[#edece9] rounded-md px-2 py-1 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm"
                  >
                    <option value="perusahaan">Nama Perusahaan</option>
                    <option value="judul">Judul Lowongan</option>
                    <option value="peluang-desc">Peluang Lolos (Tertinggi)</option>
                    <option value="peluang-asc">Peluang Lolos (Terendah)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Inline Filter Controls on Main Page */}
            <div className="hidden md:flex flex-wrap items-center gap-2 pt-1.5 border-t border-[#edece9]/50">
              {/* Inline Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
                <input
                  type="text"
                  placeholder="Cari kata kunci..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-[12.5px] border border-[#edece9] rounded-md pl-8 pr-2.5 py-1 bg-white outline-none focus:border-[#5a5a57] shadow-sm transition-all"
                />
              </div>

              {/* Company dropdown */}
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="text-[12.5px] border border-[#edece9] rounded-md px-2.5 py-1 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all flex-1 min-w-[130px] md:max-w-[180px]"
              >
                <option value="">Semua Perusahaan</option>
                {filterOptions.companies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Major dropdown */}
              <select
                value={selectedMajor}
                onChange={(e) => setSelectedMajor(e.target.value)}
                className="text-[12.5px] border border-[#edece9] rounded-md px-2.5 py-1 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all flex-1 min-w-[130px] md:max-w-[180px]"
              >
                <option value="">Semua Jurusan</option>
                {filterOptions.majors.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* City dropdown */}
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-[12.5px] border border-[#edece9] rounded-md px-2.5 py-1 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all flex-1 min-w-[120px] md:max-w-[150px]"
              >
                <option value="">Semua Lokasi</option>
                {filterOptions.cities.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>

              {/* Education dropdown */}
              <select
                value={selectedEdu}
                onChange={(e) => setSelectedEdu(e.target.value)}
                className="text-[12.5px] border border-[#edece9] rounded-md px-2.5 py-1 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all flex-1 min-w-[110px] md:max-w-[135px]"
              >
                <option value="">Semua Jenjang</option>
                {filterOptions.educations.map((ed) => (
                  <option key={ed} value={ed}>{ed}</option>
                ))}
              </select>

              {/* Sektor Kerja dropdown */}
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="text-[12.5px] border border-[#edece9] rounded-md px-2.5 py-1 bg-white outline-none cursor-pointer focus:border-[#5a5a57] shadow-sm transition-all flex-1 min-w-[120px] md:max-w-[150px]"
              >
                <option value="">Semua Sektor</option>
                {filterOptions.sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Reset button */}
              {(search || selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector) && (
                <button
                  onClick={handleResetFilters}
                  className="text-[12.5px] text-[#1d7bb8] hover:bg-[#e8f4fa] px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filter
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Dynamic Database Content Area */}
        <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 md:px-10 py-5 md:py-6">
          <div className="max-w-6xl mx-auto">

            {/* Gallery View */}
            {viewTab === "gallery" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                {filteredListings.map((job) => {
                  const tagColor = getNotionColor(job["Perusahaan"]);
                  const stats = getDeterministicStats(job["Judul Lowongan"], job["Perusahaan"], job["Link Detail"], job["Kuota"], job["Pelamar"]);
                  
                  // Extract first two majors for inline tags
                  const majorTags = job["Jurusan"]
                    ? job["Jurusan"]
                      .split(/,|\bserta\b|dan|;/gi)
                      .map((j) => j.trim())
                      .filter((j) => j && !j.toLowerCase().includes("tidak tertera") && !j.toLowerCase().includes("semua jurusan"))
                      .slice(0, 2)
                    : [];

                  return (
                    <div
                      key={job["Link Detail"]}
                      onClick={() => setSelectedJob(job)}
                      className="group border border-[#edece9] rounded-lg p-4.5 flex flex-col justify-between gap-3.5 cursor-pointer hover:border-[#dfdfde] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all bg-white"
                    >
                      <div className="flex flex-col gap-2">
                        {/* Tags Row */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit truncate max-w-[140px] ${tagColor.bg} ${tagColor.text}`}>
                            {job["Perusahaan"]}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10.5px] font-bold text-[#9041a8] bg-[#f6edf9] px-1.5 py-0.5 rounded">
                              {job["Pendidikan"]}
                            </span>
                            <button
                              onClick={(e) => toggleSaveJob(job["Link Detail"], e)}
                              className="p-1 rounded-full hover:bg-[#edece9] text-[#9b9a97] hover:text-[#b78103] transition-colors cursor-pointer"
                              title={savedJobs.includes(job["Link Detail"]) ? "Hapus dari Tersimpan" : "Simpan Lowongan"}
                            >
                              <Star className={`w-3.5 h-3.5 ${savedJobs.includes(job["Link Detail"]) ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-[13.5px] text-[#37352f] leading-snug group-hover:text-[#1d7bb8] transition-colors line-clamp-2 mt-1">
                          {job["Judul Lowongan"]}
                        </h3>

                        {/* Location & Persaingan */}
                        <div className="flex items-center justify-between text-[11.5px] text-[#5a5a57]">
                          <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                            <MapPin className="w-3.5 h-3.5 text-[#9b9a97] flex-shrink-0" />
                            <span className="truncate">{job["Kota"]}</span>
                          </div>
                          {(() => {
                            const comp = getCompetitionLevel(stats.passRate);
                            return (
                              <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${comp.bg} ${comp.text}`}>
                                {comp.label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Majors list */}
                        {majorTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {majorTags.map((tag, idx) => (
                              <span key={idx} className="text-[10px] bg-[#f7f7f5] text-[#5a5a57] border border-[#edece9]/80 px-1.5 py-0.5 rounded-sm truncate max-w-[105px]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quota & Applicants Mini Panel */}
                        <div className="grid grid-cols-3 gap-1 bg-[#f7f7f5]/70 rounded p-1.5 text-center text-[10px] border border-[#edece9]/50 mt-1.5">
                          <div className="flex flex-col">
                            <span className="text-[#9b9a97] text-[8px] font-semibold uppercase">Kuota</span>
                            <span className="text-[#37352f] font-bold">{stats.kuota} org</span>
                          </div>
                          <div className="flex flex-col border-x border-[#edece9]">
                            <span className="text-[#9b9a97] text-[8px] font-semibold uppercase">Pelamar</span>
                            <span className="text-[#5a5a57] font-semibold">{stats.pelamar}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#9b9a97] text-[8px] font-semibold uppercase">Peluang</span>
                            <span className="text-[#c52447] font-bold">{stats.passRate}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer border / info */}
                      <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-[#edece9]/50 text-[#9b9a97]">
                        <span>Detail Loker</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-[#1d7bb8]" />
                      </div>
                    </div>
                  );
                })}
                {filteredListings.length === 0 && <EmptyState showSavedOnly={showSavedOnly} />}
              </div>
            )}

            {/* Table View */}
            {viewTab === "table" && (
              <div className="border border-[#edece9] rounded-lg overflow-hidden animate-fade-in">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-[12.5px] border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-[#f7f7f5] border-b border-[#edece9] text-[#5a5a57] font-semibold">
                        <th className="p-3 border-r border-[#edece9] w-10 text-center"></th>
                        <th className="p-3 border-r border-[#edece9]">Perusahaan</th>
                        <th className="p-3 border-r border-[#edece9]">Judul Lowongan</th>
                        <th className="p-3 border-r border-[#edece9]">Lokasi / Kota</th>
                        <th className="p-3 border-r border-[#edece9]">Pendidikan</th>
                        <th className="p-3 border-r border-[#edece9]">Kuota & Pelamar</th>
                        <th className="p-3 border-r border-[#edece9]">Peluang Lolos</th>
                        <th className="p-3">Jurusan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListings.map((job, idx) => {
                        const stats = getDeterministicStats(job["Judul Lowongan"], job["Perusahaan"], job["Link Detail"], job["Kuota"], job["Pelamar"]);
                        return (
                          <tr
                            key={idx}
                            onClick={() => setSelectedJob(job)}
                            className="border-b border-[#edece9] hover:bg-[#f7f7f5]/40 cursor-pointer transition-colors"
                          >
                            <td className="p-3 border-r border-[#edece9] text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => toggleSaveJob(job["Link Detail"], e)}
                                className="p-1 rounded-full hover:bg-[#edece9] text-[#9b9a97] hover:text-[#b78103] transition-colors cursor-pointer"
                                title={savedJobs.includes(job["Link Detail"]) ? "Hapus dari Tersimpan" : "Simpan Lowongan"}
                              >
                                <Star className={`w-3.5 h-3.5 ${savedJobs.includes(job["Link Detail"]) ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                              </button>
                            </td>
                            <td className="p-3 border-r border-[#edece9] font-medium max-w-[180px] truncate">{job["Perusahaan"]}</td>
                            <td className="p-3 border-r border-[#edece9] font-semibold text-[#1d7bb8] max-w-[240px] truncate">{job["Judul Lowongan"]}</td>
                            <td className="p-3 border-r border-[#edece9] max-w-[140px] truncate">{job["Kota"]}</td>
                            <td className="p-3 border-r border-[#edece9] font-bold text-[#9041a8]">{job["Pendidikan"]}</td>
                            <td className="p-3 border-r border-[#edece9] text-[#5a5a57]">
                              <span className="font-semibold text-[#37352f]">{stats.kuota}</span>
                              <span className="text-[#9b9a97] text-[11.5px]"> / {stats.pelamar} pelamar</span>
                            </td>
                            <td className="p-3 border-r border-[#edece9] font-bold text-[#c52447]">
                              <div className="flex items-center justify-between gap-1.5">
                                <span>{stats.passRate}%</span>
                                {(() => {
                                  const comp = getCompetitionLevel(stats.passRate);
                                  return (
                                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${comp.bg} ${comp.text}`}>
                                      {comp.label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="p-3 max-w-[180px] truncate text-[#5a5a57]">{job["Jurusan"]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredListings.length === 0 && <EmptyState showSavedOnly={showSavedOnly} />}
              </div>
            )}



          </div>
        </div>
      </main>

      {/* Notion Page-Style Job Detail Modal (Sleek Peek Panel) */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-[#0f0f15]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-white border border-[#edece9] rounded-lg w-full max-w-[620px] shadow-2xl relative flex flex-col overflow-hidden max-h-[90vh] md:max-h-[85vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Elegant Notion Peek Top Bar */}
            <div className="h-11 px-4 border-b border-[#edece9]/80 flex items-center justify-between bg-[#f7f7f5] flex-shrink-0">
              {/* Previous / Next Navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevJob}
                  disabled={currentIdx <= 0}
                  className="p-1 rounded hover:bg-[#edece9] text-[#5a5a57] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  title="Lowongan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextJob}
                  disabled={currentIdx >= filteredListings.length - 1}
                  className="p-1 rounded hover:bg-[#edece9] text-[#5a5a57] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  title="Lowongan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-[11.5px] text-[#9b9a97] ml-2 font-medium">
                  {currentIdx + 1} dari {filteredListings.length}
                </span>
              </div>

              {/* Actions & Close Button */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => toggleSaveJob(selectedJob["Link Detail"], e)}
                  className="p-1 rounded hover:bg-[#edece9] text-[#5a5a57] hover:text-[#b78103] transition-colors cursor-pointer flex items-center gap-1"
                  title={savedJobs.includes(selectedJob["Link Detail"]) ? "Hapus dari Tersimpan" : "Simpan Lowongan"}
                >
                  <Star className={`w-4 h-4 ${savedJobs.includes(selectedJob["Link Detail"]) ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                  <span className="text-[11px] font-medium hidden sm:inline">
                    {savedJobs.includes(selectedJob["Link Detail"]) ? "Tersimpan" : "Simpan"}
                  </span>
                </button>
                <span className="w-px h-4 bg-[#edece9] mx-0.5"></span>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-1 rounded hover:bg-[#edece9] text-[#5a5a57] transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto px-5 md:px-8 pt-6 pb-6 md:pt-7 md:pb-8 flex flex-col gap-6.5">

              {/* Job Title & Corporate Identity */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-[#5a5a57] flex-shrink-0" />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#1d7bb8] bg-[#e8f4fa] px-2.5 py-0.5 rounded-md">
                    {selectedJob["Perusahaan"]}
                  </span>
                </div>
                <h2 className="text-[21px] font-bold text-[#37352f] leading-snug tracking-tight mt-2.5">
                  {selectedJob["Judul Lowongan"]}
                </h2>
              </div>

              {/* Notion Table-Style Property Grid */}
              <div className="flex flex-col gap-3.5 border-t border-b border-[#edece9]/80 py-5">
                {/* Penempatan */}
                <div className="flex items-start text-[13px] py-0.5">
                  <span className="w-32 text-[#9b9a97] flex items-center gap-1.5 flex-shrink-0 font-medium">
                    <MapPin className="w-4 h-4 text-[#9b9a97]" />
                    Penempatan
                  </span>
                  <span className="text-[#37352f] font-semibold">{selectedJob["Kota"]}</span>
                </div>

                {/* Jenjang Studi */}
                <div className="flex items-start text-[13px] py-0.5">
                  <span className="w-32 text-[#9b9a97] flex items-center gap-1.5 flex-shrink-0 font-medium">
                    <GraduationCap className="w-4 h-4 text-[#9b9a97]" />
                    Jenjang Studi
                  </span>
                  <span className="text-[#9041a8] bg-[#f6edf9] px-2 py-0.5 rounded font-bold text-[12px]">
                    {selectedJob["Pendidikan"]}
                  </span>
                </div>

                {/* Sektor & Industri */}
                <div className="flex items-start text-[13px] py-0.5">
                  <span className="w-32 text-[#9b9a97] flex items-center gap-1.5 flex-shrink-0 font-medium">
                    <Building className="w-4 h-4 text-[#9b9a97]" />
                    Sektor Kerja
                  </span>
                  <span className="text-[#37352f] font-semibold">
                    {(() => {
                      const s = selectedJob["Sektor"];
                      const i = selectedJob["Industri"];
                      if (s === "Tidak tertera" && i === "Tidak tertera") return "Tidak tertera";
                      if (s === "Tidak tertera") return i;
                      if (i === "Tidak tertera") return s;
                      if (s === i) return s;
                      return `${s} • ${i}`;
                    })()}
                  </span>
                </div>

                {/* Kuota Magang */}
                <div className="flex items-start text-[13px] py-0.5">
                  <span className="w-32 text-[#9b9a97] flex items-center gap-1.5 flex-shrink-0 font-medium">
                    <Users className="w-4 h-4 text-[#9b9a97]" />
                    Kuota Magang
                  </span>
                  <span className="text-[#37352f] font-semibold">
                    {selectedJobStats?.kuota} Orang
                  </span>
                </div>

                {/* Total Pelamar */}
                <div className="flex items-start text-[13px] py-0.5">
                  <span className="w-32 text-[#9b9a97] flex items-center gap-1.5 flex-shrink-0 font-medium">
                    <UserCheck className="w-4 h-4 text-[#9b9a97]" />
                    Total Pelamar
                  </span>
                  <span className="text-[#37352f] font-semibold">
                    {selectedJobStats?.pelamar} Pelamar
                  </span>
                </div>

                {/* Peluang Lolos */}
                <div className="flex items-start text-[13px] py-0.5">
                  <span className="w-32 text-[#9b9a97] flex items-center gap-1.5 flex-shrink-0 font-medium">
                    <TrendingUp className="w-4 h-4 text-[#9b9a97]" />
                    Peluang Lolos
                  </span>
                  <span className="text-[#c52447] bg-[#fdf2f2] px-2 py-0.5 rounded font-bold text-[12px] flex items-center gap-1.5">
                    {selectedJobStats?.passRate}%
                    <span className="text-[10px] text-[#9b9a97] font-normal">(Peluang Kelulusan)</span>
                  </span>
                </div>

                {/* Tingkat Persaingan */}
                <div className="flex items-start text-[13px] py-0.5">
                  <span className="w-32 text-[#9b9a97] flex items-center gap-1.5 flex-shrink-0 font-medium">
                    <TrendingUp className="w-4 h-4 text-[#9b9a97] rotate-90" />
                    Persaingan
                  </span>
                  {(() => {
                    const comp = getCompetitionLevel(selectedJobStats?.passRate);
                    return (
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${comp.bg} ${comp.text}`}>
                        {comp.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Kualifikasi Jurusan */}
                <div className="flex items-start text-[13px] py-0.5">
                  <span className="w-32 text-[#9b9a97] flex items-center gap-1.5 flex-shrink-0 font-medium">
                    <Tags className="w-4 h-4 text-[#9b9a97]" />
                    Kualifikasi
                  </span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {selectedJob["Jurusan"]
                      .split(/,|\bserta\b|dan|;/gi)
                      .map((j) => j.trim())
                      .filter(Boolean)
                      .map((item, idx) => {
                        const tagColors = getNotionColor(item);
                        return (
                          <span
                            key={idx}
                            className={`text-[11.5px] px-2 py-0.5 rounded font-medium border border-[#edece9]/60 ${tagColors.bg} ${tagColors.text}`}
                          >
                            {item}
                          </span>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Informational Section */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-[11.5px] font-bold text-[#9b9a97] uppercase tracking-wider">
                  Informasi Tambahan
                </h4>
                <p className="text-[13px] text-[#5a5a57] leading-relaxed">
                  Program magang ini diposkan langsung oleh pihak <strong>{selectedJob["Perusahaan"]}</strong>. Harap verifikasi kesesuaian kualifikasi program studi Anda dan kumpulkan berkas yang diperlukan sebelum mendaftar. Seluruh proses pendaftaran bersifat gratis.
                </p>
              </div>

            </div>

            {/* Modal Footer (Action Bar) */}
            <div className="p-5.5 bg-[#f7f7f5] border-t border-[#edece9]/80 flex-shrink-0">
              <a
                href={selectedJob["Link Detail"]}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#37352f] text-white hover:bg-[#4d4b47] font-semibold py-2.5 px-4 rounded-md flex items-center justify-center gap-2 text-[13px] transition-colors shadow-sm cursor-pointer"
              >
                Daftar Melalui Portal Resmi
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function EmptyState({ showSavedOnly }) {
  return (
    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-[#9b9a97] gap-3">
      <HelpCircle className="w-10 h-10" />
      <div className="text-[14px] font-medium">
        {showSavedOnly ? "Belum ada lowongan tersimpan" : "Tidak ada lowongan ditemukan"}
      </div>
      <div className="text-[12px]">
        {showSavedOnly 
          ? "Klik ikon bintang pada kartu atau tabel lowongan untuk menyimpannya di sini."
          : "Coba ubah kriteria filter pencarian Anda."}
      </div>
    </div>
  );
}
