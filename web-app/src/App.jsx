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
  Bookmark,
  SlidersHorizontal,
  Timer,
  Sun,
  Moon,
  Share2,
  Award
} from "lucide-react";
import lokerData from "./data/loker_data.json";
import Fuse from "fuse.js";

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

export function getDeadlineText() {
  const targetDate = new Date("2026-07-05T23:59:00+07:00").getTime();
  const now = new Date().getTime();
  const diff = targetDate - now;
  
  if (diff <= 0) {
    return {
      text: "Tutup",
      color: "bg-red-50 text-red-700 border-red-200 html.dark:bg-red-950/20 html.dark:text-red-400 html.dark:border-red-900/40"
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return {
      text: `Tutup Hari Ini (${hours}j lagi)`,
      color: "bg-red-50 text-red-600 border-red-200 animate-pulse-warning html.dark:bg-red-950/30 html.dark:text-red-400 html.dark:border-red-900/60"
    };
  }
  if (days === 1) {
    return {
      text: "Tutup Besok",
      color: "bg-orange-50 text-orange-600 border-orange-200 animate-pulse-warning html.dark:bg-orange-950/30 html.dark:text-orange-400 html.dark:border-orange-900/60"
    };
  }
  return {
    text: `Tutup 5 Jul (${days} hari lagi)`,
    color: "bg-amber-50 text-amber-700 border-amber-200 html.dark:bg-amber-950/20 html.dark:text-amber-400 html.dark:border-amber-900/40"
  };
}

// Extract unique job ID from linkDetail URL
export function getJobId(linkDetail) {
  if (!linkDetail) return "";
  const parts = linkDetail.trim().split("/");
  return parts[parts.length - 1] || "";
}

// Compute relative time for last updated label
export function getRelativeUpdateTime() {
  const lastUpdated = new Date("2026-07-04T14:20:00+07:00");
  const diffMs = new Date() - lastUpdated;
  if (diffMs < 0) return "baru saja";
  
  const diffMinsTotal = Math.floor(diffMs / (1000 * 60));
  if (diffMinsTotal < 1) return "baru saja";
  if (diffMinsTotal < 60) return `${diffMinsTotal} menit yang lalu`;
  
  const diffHours = Math.floor(diffMinsTotal / 60);
  if (diffHours < 24) {
    const mins = diffMinsTotal % 60;
    if (mins === 0) return `${diffHours} jam yang lalu`;
    return `${diffHours} jam ${mins} menit yang lalu`;
  }
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "kemarin";
  return `${diffDays} hari yang lalu`;
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

export function renderPersyaratan(text) {
  if (!text) return null;
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("tingkat pendidikan") || lower.startsWith("jurusan")) {
      const parts = trimmed.split(":");
      const label = parts[0] ? parts[0].trim() : "";
      const value = parts.slice(1).join(":").trim();
      return (
        <div key={idx} className="mb-2 text-[12.5px] text-[#37352f]">
          <strong>{label} : </strong>
          <span className="font-bold text-[#2b2a26] bg-[#f2f1ee]/90 px-2 py-0.5 rounded text-[11.5px] border border-[#edece9]">{value}</span>
        </div>
      );
    }
    
    const isListItem = /^[0-9]+[\.\)]|^\-|^\•/.test(trimmed);
    let cleanLine = trimmed;
    if (isListItem) {
      cleanLine = trimmed.replace(/^[0-9]+[\.\)]\s*|^\-\s*|^\•\s*/, '').trim();
    }
    
    return (
      <div key={idx} className="flex items-start gap-2 pl-1.5 py-0.5 text-[12.5px] text-[#4d4b47] leading-relaxed">
        <span className="text-[#8a8a86] mt-1.5 text-[7px] select-none">•</span>
        <span className="font-medium">{cleanLine}</span>
      </div>
    );
  });
}

export function renderDeskripsiPekerjaan(text) {
  if (!text) return null;
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    
    const isListItem = /^[0-9]+[\.\)]|^\-|^\•/.test(trimmed);
    let cleanLine = trimmed;
    if (isListItem) {
      cleanLine = trimmed.replace(/^[0-9]+[\.\)]\s*|^\-\s*|^\•\s*/, '').trim();
    }
    
    return (
      <div key={idx} className="flex items-start gap-2 pl-1.5 py-0.5 text-[12.5px] text-[#4d4b47] leading-relaxed">
        <span className="text-[#8a8a86] mt-1.5 text-[7px] select-none">•</span>
        <span className="font-medium">{cleanLine}</span>
      </div>
    );
  });
}

// Clean and swap title parts to show only position: "INTERNSHIP 2026 - PT Company - Position" -> "Position"
export function formatTitle(rawTitle) {
  if (!rawTitle) return "";
  const parts = rawTitle.split(/\s*[-–]\s*/);
  if (parts.length < 2) {
    return rawTitle.replace(/^INTERNSHIP\s*\d*\s*[-–]?\s*/i, "").trim();
  }

  const firstPart = parts[0].trim();
  const isInternshipPrefix = /^INTERNSHIP\s*\d*$/i.test(firstPart);

  let title = rawTitle;
  if (isInternshipPrefix) {
    if (parts.length === 2) {
      title = parts[1].trim();
    } else if (parts.length >= 3) {
      title = parts.slice(2).join(" - ").trim();
    }
  } else {
    const lastPart = parts[parts.length - 1].trim();
    if (/^PT\b|^Persero\b/i.test(lastPart) || lastPart.toLowerCase().includes("pertamina")) {
      title = parts.slice(0, -1).join(" - ").trim();
    } else {
      title = parts.join(" - ").trim();
    }
  }

  return title.replace(/^INTERNSHIP\s*\d*\s*[-–]?\s*/i, "").trim();
}

function isJobNew(tanggalDitemukan) {
  if (!tanggalDitemukan) return false;
  try {
    const today = new Date();
    const foundDate = new Date(tanggalDitemukan);
    const diffTime = Math.abs(today - foundDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  } catch (e) {
    return false;
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
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(24);
  const [hoveredCorrelationPoint, setHoveredCorrelationPoint] = useState(null);
  const [hoveredEduBar, setHoveredEduBar] = useState(null);
  const [hoveredSectorSlice, setHoveredSectorSlice] = useState(null);
  const [hoveredCompanyBar, setHoveredCompanyBar] = useState(null);
  const [hoveredMajorBar, setHoveredMajorBar] = useState(null);
  const [hoveredCityBar, setHoveredCityBar] = useState(null);
  const [hoveredRegionSlice, setHoveredRegionSlice] = useState(null);
  const [hoveredRegionMap, setHoveredRegionMap] = useState(null);
  const [selectedRegionMap, setSelectedRegionMap] = useState(null);

  // Kelayakan Calculator States
  const [calcMajorDraft, setCalcMajorDraft] = useState("Semua Jurusan");
  const [calcCityDraft, setCalcCityDraft] = useState("");
  const [calcEduDraft, setCalcEduDraft] = useState("");
  const [calcMajor, setCalcMajor] = useState("Semua Jurusan");
  const [calcCity, setCalcCity] = useState("");
  const [calcEdu, setCalcEdu] = useState("");

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
  const [pendingBookmark, setPendingBookmark] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("karirenergi-dark-mode");
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("karirenergi-dark-mode", JSON.stringify(darkMode));
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {}
  }, [darkMode]);

  // Handle Deep Linking URL updates based on selectedJob
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (selectedJob) {
        urlParams.set("job", selectedJob["Link Detail"]);
        window.history.pushState(null, "", "?" + urlParams.toString());
      } else {
        urlParams.delete("job");
        const newSearch = urlParams.toString();
        window.history.pushState(
          null,
          "",
          newSearch ? "?" + newSearch : window.location.pathname
        );
      }
    } catch (e) {}
  }, [selectedJob]);

  // Handle parsing initial URL deep link on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const jobLink = urlParams.get("job");
      if (jobLink && lokerData && lokerData.length > 0) {
        const matched = lokerData.find((job) => job["Link Detail"] === jobLink);
        if (matched) {
          setSelectedJob(matched);
        }
      }
    } catch (e) {}
  }, []);
  // Toast Message State
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };
  // Live Visitor State (Real API + Persistent LocalStorage Cache)
  const [liveVisitors, setLiveVisitors] = useState(() => {
    const cached = localStorage.getItem("live_visitors");
    if (cached) {
      const parsed = parseInt(cached, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 58; // Stable initial fallback count
  });

  useEffect(() => {
    const fetchVisitors = () => {
      fetch("/api/active-visitors")
        .then((res) => {
          if (!res.ok) throw new Error("API Offline");
          return res.json();
        })
        .then((data) => {
          if (data && typeof data.active_visitors === "number") {
            setLiveVisitors(data.active_visitors);
            localStorage.setItem("live_visitors", String(data.active_visitors));
          }
        })
        .catch(() => {
          // Fallback simulation in case API is down or local development
          setLiveVisitors((prev) => {
            const change = Math.floor(Math.random() * 3) - 1;
            const nextVal = prev + change;
            const val = Math.max(5, Math.min(450, nextVal));
            localStorage.setItem("live_visitors", String(val));
            return val;
          });
        });
    };

    fetchVisitors();
    const interval = setInterval(fetchVisitors, 15000);
    return () => clearInterval(interval);
  }, []);


  // Share Job listing handler
  const handleShareJob = (e) => {
    if (e) e.stopPropagation();
    if (!selectedJob) return;

    const jobId = getJobId(selectedJob["Link Detail"]);
    const shareUrl = `${window.location.origin}${window.location.pathname}?job=${jobId}`;
    const shareText = `Lowongan Magang Pertamina: ${selectedJob["Judul Lowongan"]} - ${selectedJob["Perusahaan"]}.\nCek info kualifikasi & jurusan lengkapnya di: ${shareUrl}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText)
        .then(() => showToast("Tautan lowongan berhasil disalin ke papan klip!"))
        .catch(() => showToast("Gagal menyalin tautan."));
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showToast("Tautan lowongan berhasil disalin ke papan klip!");
      } catch (err) {
        showToast("Gagal menyalin tautan.");
      }
      document.body.removeChild(textarea);
    }
  };

  // WhatsApp share handler
  const handleShareWhatsApp = (e) => {
    if (e) e.stopPropagation();
    if (!selectedJob) return;

    const jobId = getJobId(selectedJob["Link Detail"]);
    const shareUrl = `${window.location.origin}${window.location.pathname}?job=${jobId}`;
    const message = `Lowongan Magang Pertamina:\n*${selectedJob["Judul Lowongan"]}* - *${selectedJob["Perusahaan"]}*\n\nCek info kualifikasi & jurusan lengkapnya di:\n${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const toggleSaveJob = (linkDetail, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const isSaved = savedJobs.includes(linkDetail);
    if (isSaved) {
      setSavedJobs((prev) => prev.filter((link) => link !== linkDetail));
    } else {
      const skipConfirm = localStorage.getItem("karirenergi-skip-bookmark-confirm") === "true";
      if (skipConfirm) {
        setSavedJobs((prev) => [...prev, linkDetail]);
      } else {
        setPendingBookmark(linkDetail);
        setDontShowAgain(false);
      }
    }
  };

  const handleConfirmBookmark = () => {
    if (pendingBookmark) {
      setSavedJobs((prev) => [...prev, pendingBookmark]);
      if (dontShowAgain) {
        localStorage.setItem("karirenergi-skip-bookmark-confirm", "true");
      }
      setPendingBookmark(null);
    }
  };


  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop > 15) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }

    // Lazy load next batch when close to the bottom (within 150px)
    if (scrollHeight - scrollTop - clientHeight < 150) {
      setVisibleLimit((prev) => Math.min(prev + 24, filteredListings.length));
    }
  };

  // Lock sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Filters State (Applied)
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedEdu, setSelectedEdu] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [sortBy, setSortBy] = useState("perusahaan"); // perusahaan | judul

  // Reset visible limit on filter changes
  useEffect(() => {
    setVisibleLimit(24);
  }, [search, selectedCompany, selectedMajor, selectedCity, selectedEdu, selectedSector, showSavedOnly]);

  // Draft Filters State (applied on clicking 'Cari' or pressing Enter)
  const [draftSearch, setDraftSearch] = useState("");
  const [draftCompany, setDraftCompany] = useState("");
  const [draftMajor, setDraftMajor] = useState("");
  const [draftCity, setDraftCity] = useState("");
  const [draftEdu, setDraftEdu] = useState("");
  const [draftSector, setDraftSector] = useState("");

  const handleApplyFilters = () => {
    setSearch(draftSearch);
    setSelectedCompany(draftCompany);
    setSelectedMajor(draftMajor);
    setSelectedCity(draftCity);
    setSelectedEdu(draftEdu);
    setSelectedSector(draftSector);
    setSidebarOpen(false);
    setFilterDrawerOpen(false);
  };

  // Countdown Timer State (Target: 5 July 2026 at 23:59 WIB)
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const targetDate = new Date("2026-07-05T23:59:00+07:00").getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  // Clean raw listings
  const listings = useMemo(() => {
    const clean = (val, fallback = "Tidak tertera") => {
      if (!val) return fallback;
      const trimmed = val.trim();
      return trimmed === "" || trimmed === "-" || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "tidak tertera" ? fallback : trimmed;
    };

    return lokerData.map((job) => {
      const cleanTitle = formatTitle(clean(job["Judul Lowongan"]));
      const cleanCompany = clean(job["Perusahaan"], "PT Pertamina");
      
      let rawCity = clean(job["Kota"]);
      let cleanCity = rawCity;
      if (cleanCity && cleanCity !== "Tidak tertera") {
        cleanCity = cleanCity
          .replace(/\b(kota administrasi|kota|kabupaten|kab\b\.?)\s+/gi, "")
          .replace(/\s+\b(kota administrasi|kota|kabupaten|kab\b\.?)\b/gi, "")
          .trim();
        cleanCity = cleanCity.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
      }

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
    const cleanMajorName = (str) => {
      let name = str.trim();
      const lower = name.toLowerCase();
      
      // Exclude generic fallbacks and placeholder values
      if (
        lower === "all" ||
        lower.includes("tidak tertera") ||
        lower.includes("semua jurusan") ||
        lower.includes("jurusan lain") ||
        lower.includes("jurusan relevan") ||
        lower.includes("atau lainnya") ||
        lower.includes("seluruh teknik") ||
        lower.includes("sarjana sains") ||
        lower.includes("sarjana teknik")
      ) {
        return null;
      }
      
      // Fix known typos
      if (lower === "business anaytics") return "Business Analytics";
      if (lower === "bussines administration") return "Business Administration";
      
      // Smart Title Case / Capitalization
      const words = name.split(/\s+/);
      const formattedWords = words.map(word => {
        let cleanWord = word.replace(/[()]/g, '');
        const cleanWordLower = cleanWord.toLowerCase();
        
        // Known acronyms to keep completely uppercase
        const abbreviations = ["it", "sdm", "dkv", "tkj", "rpl", "k3", "k3u", "hr", "psdk", "stem"];
        if (abbreviations.includes(cleanWordLower)) {
          return word.toUpperCase();
        }
        
        // General title casing
        if (word.startsWith("(")) {
          if (word.length > 2) {
            return "(" + word.charAt(1).toUpperCase() + word.slice(2).toLowerCase();
          }
          return word.toUpperCase();
        }
        if (word.endsWith(")")) {
          if (word.length > 2) {
            return word.charAt(0).toUpperCase() + word.slice(1, -1).toLowerCase() + ")";
          }
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
      
      return formattedWords.join(" ");
    };

    const companies = new Set();
    const cities = new Set();
    const educations = new Set();
    const sectors = new Set();
    const majors = new Set();

    const companyCounts = {};
    const cityCounts = {};
    const educationCounts = {};
    const sectorCounts = {};
    const majorCounts = {};

    listings.forEach((job) => {
      if (job["Perusahaan"]) {
        companies.add(job["Perusahaan"]);
        companyCounts[job["Perusahaan"]] = (companyCounts[job["Perusahaan"]] || 0) + 1;
      }
      if (job["Kota"] && job["Kota"] !== "Tidak tertera") {
        cities.add(job["Kota"]);
        cityCounts[job["Kota"]] = (cityCounts[job["Kota"]] || 0) + 1;
      }
      if (job["Pendidikan"] && job["Pendidikan"] !== "Tidak tertera") {
        educations.add(job["Pendidikan"]);
        educationCounts[job["Pendidikan"]] = (educationCounts[job["Pendidikan"]] || 0) + 1;
      }
      if (job["Sektor"] && job["Sektor"] !== "Tidak tertera") {
        sectors.add(job["Sektor"]);
        sectorCounts[job["Sektor"]] = (sectorCounts[job["Sektor"]] || 0) + 1;
      }

      if (job["Jurusan"] && job["Jurusan"] !== "Semua Jurusan / Tidak Tertera" && job["Jurusan"] !== "Semua Jurusan / Tidak tertera") {
        const parts = job["Jurusan"].split(",");
        const seenMajors = new Set();
        parts.forEach((p) => {
          const cleaned = cleanMajorName(p);
          if (cleaned && cleaned.length > 2) {
            seenMajors.add(cleaned);
          }
        });
        seenMajors.forEach((m) => {
          majors.add(m);
        });
      }
    });

    const sortedMajors = Array.from(majors).sort();
    
    // Count general "Semua Jurusan" vacancies
    const generalCount = listings.filter(j => 
      (j["Jurusan"] || "").toLowerCase().includes("semua jurusan")
    ).length;
    majorCounts["Semua Jurusan"] = generalCount;

    // Count specific major eligible vacancies (specific + semua jurusan)
    sortedMajors.forEach(m => {
      majorCounts[m] = listings.filter(j => {
        const jur = (j["Jurusan"] || "").toLowerCase();
        return jur.includes(m.toLowerCase()) || jur.includes("semua jurusan");
      }).length;
    });

    return {
      companies: Array.from(companies).sort(),
      cities: Array.from(cities).sort(),
      educations: Array.from(educations).sort(),
      sectors: Array.from(sectors).sort(),
      majors: ["Semua Jurusan", ...sortedMajors],
      companyCounts,
      cityCounts,
      educationCounts,
      sectorCounts,
      majorCounts,
    };
  }, [listings]);

  // Auto-open job modal if "?job=XXXX" query param is present on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("job");
    if (jobId && listings && listings.length > 0) {
      const match = listings.find((j) => getJobId(j["Link Detail"]) === jobId);
      if (match) {
        setSelectedJob(match);
      }
    }
  }, [listings]);

  // Sync selectedJob state to the address bar query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedJob) {
      const currentJobId = getJobId(selectedJob["Link Detail"]);
      if (params.get("job") !== currentJobId) {
        params.set("job", currentJobId);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState(null, "", newUrl);
      }
    } else {
      if (params.has("job")) {
        params.delete("job");
        const cleanQuery = params.toString();
        const newUrl = cleanQuery ? `${window.location.pathname}?${cleanQuery}` : window.location.pathname;
        window.history.replaceState(null, "", newUrl);
      }
    }
  }, [selectedJob]);

  // Apply filters and sorting
  const filteredListings = useMemo(() => {
    // 1. Initial base filtering (all filters except search query)
    let result = listings.filter((job) => {
      const matchCompany = !selectedCompany || job["Perusahaan"] === selectedCompany;
      let matchMajor = true;
      if (selectedMajor) {
        if (selectedMajor === "Semua Jurusan") {
          matchMajor = job["Jurusan"].toLowerCase().includes("semua jurusan");
        } else {
          matchMajor = job["Jurusan"].toLowerCase().includes(selectedMajor.toLowerCase()) || 
                       job["Jurusan"].toLowerCase().includes("semua jurusan");
        }
      }
      const matchCity = !selectedCity || job["Kota"] === selectedCity;
      const matchEdu = !selectedEdu || job["Pendidikan"] === selectedEdu;
      const matchSector = !selectedSector || job["Sektor"] === selectedSector;
      const matchSaved = !showSavedOnly || savedJobs.includes(job["Link Detail"]);

      let matchRegion = true;
      if (selectedRegionMap) {
        const city = (job["Kota"] || "").toLowerCase();
        if (selectedRegionMap === "Jabodetabek") {
          matchRegion = city.includes("jakarta") || city.includes("bekasi") || city.includes("tangerang") || city.includes("depok") || city.includes("bogor");
        } else if (selectedRegionMap === "Jawa & Bali (Luar Jabodetabek)") {
          matchRegion = city.includes("bandung") || city.includes("semarang") || city.includes("surabaya") || city.includes("tasikmalaya") || city.includes("cilacap") || city.includes("cirebon") || city.includes("bali");
        } else if (selectedRegionMap === "Sumatera") {
          matchRegion = city.includes("medan") || city.includes("palembang") || city.includes("dumai") || city.includes("lhokseumawe") || city.includes("indramayu") || city.includes("balongan") || city.includes("tanggamus") || city.includes("muara enim") || city.includes("sumatera") || city.includes("lampung");
        } else if (selectedRegionMap === "Kalimantan & Sulawesi") {
          matchRegion = city.includes("balikpapan") || city.includes("makassar") || city.includes("kalimantan") || city.includes("sulawesi") || city.includes("banjarmasin") || city.includes("samarinda");
        } else {
          // Indonesia Timur & Lainnya
          matchRegion = !(
            city.includes("jakarta") || city.includes("bekasi") || city.includes("tangerang") || city.includes("depok") || city.includes("bogor") ||
            city.includes("bandung") || city.includes("semarang") || city.includes("surabaya") || city.includes("tasikmalaya") || city.includes("cilacap") || city.includes("cirebon") || city.includes("bali") ||
            city.includes("medan") || city.includes("palembang") || city.includes("dumai") || city.includes("lhokseumawe") || city.includes("indramayu") || city.includes("balongan") || city.includes("tanggamus") || city.includes("muara enim") || city.includes("sumatera") || city.includes("lampung") ||
            city.includes("balikpapan") || city.includes("makassar") || city.includes("kalimantan") || city.includes("sulawesi") || city.includes("banjarmasin") || city.includes("samarinda")
          );
        }
      }

      return matchCompany && matchMajor && matchCity && matchEdu && matchSector && matchSaved && matchRegion;
    });

    // 2. Apply Fuse.js fuzzy search if search query is active
    const q = search.trim();
    if (q) {
      const fuse = new Fuse(result, {
        keys: [
          { name: "Judul Lowongan", weight: 0.4 },
          { name: "Perusahaan", weight: 0.2 },
          { name: "Jurusan", weight: 0.3 },
          { name: "Kota", weight: 0.1 }
        ],
        threshold: 0.35,
        distance: 100,
        ignoreLocation: true
      });
      result = fuse.search(q).map((res) => res.item);
    }

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
    } else if (sortBy === "pelamar-desc") {
      result.sort((a, b) => {
        const statsA = getDeterministicStats(a["Judul Lowongan"], a["Perusahaan"], a["Link Detail"], a["Kuota"], a["Pelamar"]);
        const statsB = getDeterministicStats(b["Judul Lowongan"], b["Perusahaan"], b["Link Detail"], b["Kuota"], b["Pelamar"]);
        return statsB.pelamar - statsA.pelamar;
      });
    } else if (sortBy === "pelamar-asc") {
      result.sort((a, b) => {
        const statsA = getDeterministicStats(a["Judul Lowongan"], a["Perusahaan"], a["Link Detail"], a["Kuota"], a["Pelamar"]);
        const statsB = getDeterministicStats(b["Judul Lowongan"], b["Perusahaan"], b["Link Detail"], b["Kuota"], b["Pelamar"]);
        return statsA.pelamar - statsB.pelamar;
      });
    } else if (sortBy === "kuota-desc") {
      result.sort((a, b) => {
        const statsA = getDeterministicStats(a["Judul Lowongan"], a["Perusahaan"], a["Link Detail"], a["Kuota"], a["Pelamar"]);
        const statsB = getDeterministicStats(b["Judul Lowongan"], b["Perusahaan"], b["Link Detail"], b["Kuota"], b["Pelamar"]);
        return statsB.kuota - statsA.kuota;
      });
    } else if (sortBy === "kuota-asc") {
      result.sort((a, b) => {
        const statsA = getDeterministicStats(a["Judul Lowongan"], a["Perusahaan"], a["Link Detail"], a["Kuota"], a["Pelamar"]);
        const statsB = getDeterministicStats(b["Judul Lowongan"], b["Perusahaan"], b["Link Detail"], b["Kuota"], b["Pelamar"]);
        return statsA.kuota - statsB.kuota;
      });
    }

    return result;
  }, [listings, search, selectedCompany, selectedMajor, selectedCity, selectedEdu, selectedSector, sortBy, showSavedOnly, savedJobs]);

  // Calculate Kelayakan matching data
  const calcResults = useMemo(() => {
    const totalCount = listings.length;
    if (totalCount === 0) return { eligibleJobs: [], percentage: 0, topCompany: "-", avgPeluang: 0 };
    
    const eligibleJobs = listings.filter((job) => {
      if (calcEdu && job["Pendidikan"] !== calcEdu) return false;
      if (calcCity && job["Kota"] !== calcCity) return false;
      if (calcMajor) {
        const req = (job["Jurusan"] || "").toLowerCase();
        if (calcMajor === "Semua Jurusan") {
          return req.includes("semua jurusan");
        } else {
          return req.includes(calcMajor.toLowerCase()) || req.includes("semua jurusan");
        }
      }
      return true;
    });

    const percentage = totalCount > 0 ? Math.round((eligibleJobs.length / totalCount) * 100) : 0;

    const eligibleJobsWithStats = eligibleJobs.map(job => {
      const stats = getDeterministicStats(job["Judul Lowongan"], job["Perusahaan"], job["Link Detail"], job["Kuota"], job["Pelamar"]);
      return { ...job, stats };
    });

    eligibleJobsWithStats.sort((a, b) => parseFloat(b.stats.passRate) - parseFloat(a.stats.passRate));

    const companyCounts = {};
    eligibleJobs.forEach(job => {
      const co = job["Perusahaan"];
      companyCounts[co] = (companyCounts[co] || 0) + 1;
    });
    let topCompany = "-";
    let maxCompanyCount = 0;
    Object.keys(companyCounts).forEach(co => {
      if (companyCounts[co] > maxCompanyCount) {
        maxCompanyCount = companyCounts[co];
        topCompany = co;
      }
    });

    let totalPassRate = 0;
    eligibleJobsWithStats.forEach(job => {
      totalPassRate += parseFloat(job.stats.passRate);
    });
    const avgPeluang = eligibleJobsWithStats.length > 0 ? (totalPassRate / eligibleJobsWithStats.length).toFixed(1) : 0;

    return {
      eligibleJobs: eligibleJobsWithStats,
      percentage,
      topCompany,
      avgPeluang
    };
  }, [listings, calcMajor, calcCity, calcEdu]);

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

  // Memoized calculations for the Analytics Dashboard
  const analyticsData = useMemo(() => {
    const getJobSector = (comp) => {
      const c = (comp || "").toLowerCase();
      if (c.includes("hulu") || c.includes("geothermal") || c.includes("ep cepu") || c.includes("internasional ep")) {
        return "Hulu (Upstream)";
      }
      if (c.includes("patra niaga")) {
        return "Hilir (Commercial & Trading)";
      }
      if (c.includes("shipping") || c.includes("trans kontinental") || c.includes("port & logistics") || c.includes("marine")) {
        return "Logistik & Perkapalan";
      }
      if (c.includes("power") || c.includes("new renewable")) {
        return "Power & EBT (Energi Baru)";
      }
      if (c.includes("gagas") || c.includes("regas") || c.includes("arun") || c.includes("pertamina gas") || c.includes("graha nusantara")) {
        return "Gas & Infrastruktur";
      }
      return "Holding & Jasa Pendukung";
    };

    const totalJobs = filteredListings.length;

    // Map all listings to their precise stats (using getDeterministicStats)
    const listingsWithStats = filteredListings.map(j => {
      const stats = getDeterministicStats(
        j["Judul Lowongan"],
        j["Perusahaan"],
        j["Link Detail"],
        j["Kuota"],
        j["Pelamar"]
      );
      return {
        ...j,
        preciseKuota: stats.kuota,
        precisePelamar: stats.pelamar,
        precisePassRate: parseFloat(stats.passRate)
      };
    });

    const totalQuota = listingsWithStats.reduce((sum, item) => sum + item.preciseKuota, 0);
    const totalApplicants = listingsWithStats.reduce((sum, item) => sum + item.precisePelamar, 0);
    const avgApplicantsPerJob = totalJobs > 0 ? Math.round(totalApplicants / totalJobs) : 0;
    
    // Overall Pass Rate (Precise: Total Kuota / Total Pelamar * 100)
    const avgPassRate = totalApplicants > 0
      ? ((totalQuota / totalApplicants) * 100).toFixed(2)
      : "0.00";

    // Company breakdown
    const companyCounts = {};
    const companyApplicants = {};
    const companyQuota = {};
    listingsWithStats.forEach(j => {
      const c = j.Perusahaan || "Tidak tertera";
      companyCounts[c] = (companyCounts[c] || 0) + 1;
      companyApplicants[c] = (companyApplicants[c] || 0) + j.precisePelamar;
      companyQuota[c] = (companyQuota[c] || 0) + j.preciseKuota;
    });
    
    const companyLeaderboard = Object.keys(companyCounts).map(name => ({
      name,
      vacancies: companyCounts[name],
      applicants: companyApplicants[name]
    })).sort((a, b) => b.vacancies - a.vacancies).slice(0, 7);

    // Precise company pass rate (Total Kuota / Total Pelamar * 100)
    const avgPassRateByCompany = Object.keys(companyCounts)
      .map(name => {
        const q = companyQuota[name];
        const p = companyApplicants[name];
        return {
          name,
          avgRate: p > 0 ? ((q / p) * 100).toFixed(2) : "0.00"
        };
      })
      .sort((a, b) => parseFloat(b.avgRate) - parseFloat(a.avgRate))
      .slice(0, 5);

    // Most Competitive Specific Jobs (Ratio Pelamar/Kuota)
    const competitiveJobs = listingsWithStats
      .map(j => {
        const ratio = j.precisePelamar / j.preciseKuota;
        return {
          ...j,
          ratio: Math.round(ratio),
          passRate: j.precisePassRate.toFixed(2)
        };
      })
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5);

    // Education Level Breakdown
    const eduCounts = {};
    listingsWithStats.forEach(j => {
      const edu = j.Pendidikan || "Tidak tertera";
      eduCounts[edu] = (eduCounts[edu] || 0) + 1;
    });
    const eduBreakdown = Object.keys(eduCounts).map(name => ({
      name,
      count: eduCounts[name],
      percentage: totalJobs > 0 ? Math.round((eduCounts[name] / totalJobs) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // Geographic Breakdown
    const cityCounts = {};
    listingsWithStats.forEach(j => {
      const city = j.Kota || "Tidak tertera";
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
    const topCities = Object.keys(cityCounts).map(name => ({
      name,
      count: cityCounts[name],
      percentage: totalJobs > 0 ? Math.round((cityCounts[name] / totalJobs) * 100) : 0
    })).sort((a, b) => b.count - a.count).slice(0, 6);

    // Competition Heat Classification
    let superKetat = 0; 
    let tinggi = 0;      
    let sedang = 0;      
    let terbuka = 0;     

    listingsWithStats.forEach(j => {
      const ratio = j.precisePelamar / j.preciseKuota;
      if (ratio > 200) superKetat++;
      else if (ratio >= 50) tinggi++;
      else if (ratio >= 20) sedang++;
      else terbuka++;
    });

    const heatClassification = [
      { label: "Sangat Ketat (Rasio > 1:200)", count: superKetat, percentage: totalJobs > 0 ? Math.round((superKetat / totalJobs) * 100) : 0, color: "#c52447", bg: "#fdf0f2" },
      { label: "Tinggi (Rasio 1:50 - 1:200)", count: tinggi, percentage: totalJobs > 0 ? Math.round((tinggi / totalJobs) * 100) : 0, color: "#d97706", bg: "#fef3c7" },
      { label: "Sedang (Rasio 1:20 - 1:50)", count: sedang, percentage: totalJobs > 0 ? Math.round((sedang / totalJobs) * 100) : 0, color: "#2563eb", bg: "#dbeafe" },
      { label: "Terbuka (Rasio < 1:20)", count: terbuka, percentage: totalJobs > 0 ? Math.round((terbuka / totalJobs) * 100) : 0, color: "#16a34a", bg: "#dcfce7" }
    ];

    // Group Majors Category
    const majorCategories = {
      "Teknik / STEM": 0,
      "Manajemen / Bisnis": 0,
      "Ekonomi & Akuntansi": 0,
      "Teknologi Informasi & Komputer": 0,
      "Psikologi / Human Resources": 0,
      "Hukum & Legal": 0,
      "Statistika / Matematika": 0,
      "Semua Jurusan": 0
    };

    listingsWithStats.forEach(j => {
      const jur = (j.Jurusan || "").toLowerCase();
      if (jur.includes("semua jurusan")) {
        majorCategories["Semua Jurusan"]++;
      } else {
        if (jur.includes("teknik") || jur.includes("sains") || jur.includes("kimia") || jur.includes("fisika") || jur.includes("lingkungan") || jur.includes("sipil") || jur.includes("mesin") || jur.includes("elektro") || jur.includes("industri") || jur.includes("perminyakan") || jur.includes("geologi")) {
          majorCategories["Teknik / STEM"]++;
        }
        if (jur.includes("manajemen") || jur.includes("bisnis") || jur.includes("administrasi") || jur.includes("marketing") || jur.includes("pemasaran")) {
          majorCategories["Manajemen / Bisnis"]++;
        }
        if (jur.includes("akuntansi") || jur.includes("ekonomi") || jur.includes("keuangan")) {
          majorCategories["Ekonomi & Akuntansi"]++;
        }
        if (jur.includes("informatika") || jur.includes("komputer") || jur.includes("sistem informasi") || jur.includes("it") || jur.includes("software") || jur.includes("teknologi informasi")) {
          majorCategories["Teknologi Informasi & Komputer"]++;
        }
        if (jur.includes("psikologi") || jur.includes("human resource") || jur.includes("hc")) {
          majorCategories["Psikologi / Human Resources"]++;
        }
        if (jur.includes("hukum") || jur.includes("legal")) {
          majorCategories["Hukum & Legal"]++;
        }
        if (jur.includes("statistika") || jur.includes("matematika") || jur.includes("statistik")) {
          majorCategories["Statistika / Matematika"]++;
        }
      }
    });

    const sortedMajors = Object.keys(majorCategories).map(name => ({
      name,
      count: majorCategories[name],
      percentage: totalJobs > 0 ? Math.round((majorCategories[name] / totalJobs) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // A. Top 5 Most User-Friendly Jobs (Competition Ratio Terendah)
    const userFriendlyJobs = listingsWithStats
      .map(j => {
        const ratio = j.precisePelamar / j.preciseKuota;
        return {
          ...j,
          ratio: Math.round(ratio),
          passRate: j.precisePassRate.toFixed(2)
        };
      })
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 5);

    // B. Job Roles Breakdown
    const rolesCount = {
      "Engineering & Operations": 0,
      "Finance, Legal & Sales": 0,
      "Human Capital & Admin": 0,
      "IT, Data & Digital": 0,
      "HSSE & Safety": 0,
      "Lainnya": 0
    };
    listingsWithStats.forEach(j => {
      const t = (j["Judul Lowongan"] || "").toLowerCase();
      if (t.includes("hsse") || t.includes("safety") || t.includes("k3") || t.includes("environment") || t.includes("lingkungan")) {
        rolesCount["HSSE & Safety"]++;
      } else if (t.includes("maintenance") || t.includes("operation") || t.includes("teknik") || t.includes("engineering") || t.includes("laboratory") || t.includes("kilang") || t.includes("proyek") || t.includes("fungsi project")) {
        rolesCount["Engineering & Operations"]++;
      } else if (t.includes("finance") || t.includes("akuntansi") || t.includes("audit") || t.includes("legal") || t.includes("hukum") || t.includes("tax") || t.includes("claim") || t.includes("sales") || t.includes("commercial")) {
        rolesCount["Finance, Legal & Sales"]++;
      } else if (t.includes("it ") || t.includes("developer") || t.includes("sistem") || t.includes("programmer") || t.includes("data") || t.includes("digital") || t.includes("network") || t.includes("cyber") || t.includes("software")) {
        rolesCount["IT, Data & Digital"]++;
      } else if (t.includes("human") || t.includes("hc ") || t.includes("hr ") || t.includes("administrasi") || t.includes("ga ") || t.includes("general") || t.includes("hc") || t.includes("relation")) {
        rolesCount["Human Capital & Admin"]++;
      } else {
        rolesCount["Lainnya"]++;
      }
    });
    const rolesBreakdown = Object.keys(rolesCount).map(name => ({
      name,
      count: rolesCount[name],
      percentage: totalJobs > 0 ? Math.round((rolesCount[name] / totalJobs) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // C. Regional Distribution (Wilayah Barat vs Timur)
    const regionalCount = {
      "Jabodetabek": 0,
      "Jawa & Bali (Luar Jabodetabek)": 0,
      "Sumatera": 0,
      "Kalimantan & Sulawesi": 0,
      "Indonesia Timur & Lainnya": 0
    };
    listingsWithStats.forEach(j => {
      const city = (j.Kota || "").toLowerCase();
      if (city.includes("jakarta") || city.includes("bekasi") || city.includes("tangerang") || city.includes("depok") || city.includes("bogor")) {
        regionalCount["Jabodetabek"]++;
      } else if (city.includes("balikpapan") || city.includes("makassar") || city.includes("kalimantan") || city.includes("sulawesi") || city.includes("banjarmasin") || city.includes("samarinda") || city.includes("tomohon")) {
        regionalCount["Kalimantan & Sulawesi"]++;
      } else if (city.includes("bandung") || city.includes("semarang") || city.includes("surabaya") || city.includes("tasikmalaya") || city.includes("cilacap") || city.includes("cirebon") || city.includes("bali") || city.includes("indramayu") || city.includes("balongan")) {
        regionalCount["Jawa & Bali (Luar Jabodetabek)"]++;
      } else if (city.includes("medan") || city.includes("palembang") || city.includes("dumai") || city.includes("lhokseumawe") || city.includes("tanggamus") || city.includes("muara enim") || city.includes("sumatera") || city.includes("lampung")) {
        regionalCount["Sumatera"]++;
      } else {
        regionalCount["Indonesia Timur & Lainnya"]++;
      }
    });
    const regionalDistribution = Object.keys(regionalCount).map(name => ({
      name,
      count: regionalCount[name],
      percentage: totalJobs > 0 ? Math.round((regionalCount[name] / totalJobs) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // E. Sector Breakdown
    const sectorCounts = {};
    listingsWithStats.forEach(j => {
      const s = getJobSector(j.Perusahaan);
      sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    });
    const sectorBreakdown = Object.keys(sectorCounts).map(name => ({
      name,
      count: sectorCounts[name],
      percentage: totalJobs > 0 ? Math.round((sectorCounts[name] / totalJobs) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // F. Industry Breakdown (Top 6)
    const industryCounts = {};
    listingsWithStats.forEach(j => {
      const ind = j.Industri || "Tidak tertera";
      industryCounts[ind] = (industryCounts[ind] || 0) + 1;
    });
    const industryBreakdown = Object.keys(industryCounts).map(name => ({
      name,
      count: industryCounts[name],
      percentage: totalJobs > 0 ? Math.round((industryCounts[name] / totalJobs) * 100) : 0
    })).sort((a, b) => b.count - a.count).slice(0, 6);

    // 1. Quota per Sector for "Average Quota per Position"
    const sectorQuota = {};
    const sectorCountsForQuota = {};
    listingsWithStats.forEach(j => {
      const s = getJobSector(j.Perusahaan);
      sectorQuota[s] = (sectorQuota[s] || 0) + j.preciseKuota;
      sectorCountsForQuota[s] = (sectorCountsForQuota[s] || 0) + 1;
    });
    const avgQuotaPerSector = Object.keys(sectorCountsForQuota).map(name => ({
      name,
      avgQuota: parseFloat((sectorQuota[name] / sectorCountsForQuota[name]).toFixed(1))
    })).sort((a, b) => b.avgQuota - a.avgQuota);

    // 2. Sectoral Competition Index
    const sectorApplicants = {};
    const sectorQuotaForComp = {};
    listingsWithStats.forEach(j => {
      const s = getJobSector(j.Perusahaan);
      sectorApplicants[s] = (sectorApplicants[s] || 0) + j.precisePelamar;
      sectorQuotaForComp[s] = (sectorQuotaForComp[s] || 0) + j.preciseKuota;
    });
    const sectoralCompetitionIndex = Object.keys(sectorQuotaForComp).map(name => {
      const q = sectorQuotaForComp[name];
      const p = sectorApplicants[name];
      const ratio = q > 0 ? (p / q) : 0;
      return {
        name,
        ratio: Math.round(ratio),
        passRate: p > 0 ? ((q / p) * 100).toFixed(2) : "0.00"
      };
    }).sort((a, b) => b.ratio - a.ratio);

    // 3. Matriks Korelasi Ukuran Kuota vs Minat Pelamar
    const quotaGroups = {
      "Kuota 1": { count: 0, applicants: 0 },
      "Kuota 2-3 text": { count: 0, applicants: 0 }, // wait, let's write exact keys
      "Kuota 2-3": { count: 0, applicants: 0 },
      "Kuota 4-5": { count: 0, applicants: 0 },
      "Kuota 6-8": { count: 0, applicants: 0 }
    };
    // remove the extra key above
    delete quotaGroups["Kuota 2-3 text"];
    
    listingsWithStats.forEach(j => {
      const q = j.preciseKuota;
      const p = j.precisePelamar;
      if (q === 1) {
        quotaGroups["Kuota 1"].count++;
        quotaGroups["Kuota 1"].applicants += p;
      } else if (q >= 2 && q <= 3) {
        quotaGroups["Kuota 2-3"].count++;
        quotaGroups["Kuota 2-3"].applicants += p;
      } else if (q >= 4 && q <= 5) {
        quotaGroups["Kuota 4-5"].count++;
        quotaGroups["Kuota 4-5"].applicants += p;
      } else {
        quotaGroups["Kuota 6-8"].count++;
        quotaGroups["Kuota 6-8"].applicants += p;
      }
    });
    const quotaCorrelation = Object.keys(quotaGroups).map(name => {
      const data = quotaGroups[name];
      return {
        name,
        avgApplicants: data.count > 0 ? Math.round(data.applicants / data.count) : 0,
        totalJobs: data.count
      };
    });

    // 4. Kluster Kata Kunci Keahlian Teknis Terpopuler
    const skillKeywords = [
      { label: "Ms. Excel / Spreadsheet", keys: ["excel", "spreadsheet", "word", "office"] },
      { label: "SQL / Database", keys: ["sql", "database", "query"] },
      { label: "Python / Programming", keys: ["python", "programming", "developer", "coding", "java", "html", "css", "javascript"] },
      { label: "HSE / Keselamatan Kerja", keys: ["hse", "k3", "safety", "keselamatan", "kesehatan kerja"] },
      { label: "Project Management", keys: ["project management", "pm ", "agile", "scrum", "manajemen proyek"] },
      { label: "AutoCAD / Desain CAD", keys: ["autocad", "design engineering", "cad ", "solidwork", "3d modeling"] },
      { label: "Data Analytics & BI", keys: ["data analytics", "data analysis", "tableau", "powerbi", "power bi", "analisis data"] },
      { label: "Desain Adobe / Canva", keys: ["adobe", "photoshop", "illustrator", "design graphic", "canva", "desain grafis"] }
    ];
    const skillCounts = {};
    skillKeywords.forEach(sk => {
      skillCounts[sk.label] = 0;
    });
    listingsWithStats.forEach(j => {
      const desc = ((j["Deskripsi"] || "") + " " + (j["Persyaratan"] || "")).toLowerCase();
      skillKeywords.forEach(sk => {
        const matches = sk.keys.some(k => desc.includes(k));
        if (matches) {
          skillCounts[sk.label]++;
        }
      });
    });
    const topSkills = Object.keys(skillCounts).map(name => ({
      name,
      count: skillCounts[name],
      percentage: totalJobs > 0 ? Math.round((skillCounts[name] / totalJobs) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // 5. Pemetaan Kota riil untuk masing-masing Region Map
    const mapRegionCities = {
      "Jabodetabek": {},
      "Jawa & Bali (Luar Jabodetabek)": {},
      "Sumatera": {},
      "Kalimantan & Sulawesi": {},
      "Indonesia Timur & Lainnya": {}
    };
    
    listingsWithStats.forEach(j => {
      const city = j.Kota || "Tidak tertera";
      const cityLower = city.toLowerCase();
      let regionKey = "Indonesia Timur & Lainnya";
      
      if (cityLower.includes("jakarta") || cityLower.includes("bekasi") || cityLower.includes("tangerang") || cityLower.includes("depok") || cityLower.includes("bogor")) {
        regionKey = "Jabodetabek";
      } else if (cityLower.includes("balikpapan") || cityLower.includes("makassar") || cityLower.includes("kalimantan") || cityLower.includes("sulawesi") || cityLower.includes("banjarmasin") || cityLower.includes("samarinda") || cityLower.includes("tomohon")) {
        regionKey = "Kalimantan & Sulawesi";
      } else if (cityLower.includes("bandung") || cityLower.includes("semarang") || cityLower.includes("surabaya") || cityLower.includes("tasikmalaya") || cityLower.includes("cilacap") || cityLower.includes("cirebon") || cityLower.includes("bali") || cityLower.includes("indramayu") || cityLower.includes("balongan")) {
        regionKey = "Jawa & Bali (Luar Jabodetabek)";
      } else if (cityLower.includes("medan") || cityLower.includes("palembang") || cityLower.includes("dumai") || cityLower.includes("lhokseumawe") || cityLower.includes("tanggamus") || cityLower.includes("muara enim") || cityLower.includes("sumatera") || cityLower.includes("lampung")) {
        regionKey = "Sumatera";
      }
      
      mapRegionCities[regionKey][city] = (mapRegionCities[regionKey][city] || 0) + 1;
    });
    
    const regionCitiesSorted = {};
    Object.keys(mapRegionCities).forEach(reg => {
      regionCitiesSorted[reg] = Object.keys(mapRegionCities[reg]).map(cityName => ({
        name: cityName,
        count: mapRegionCities[reg][cityName]
      })).sort((a, b) => b.count - a.count);
    });

    return {
      totalJobs,
      totalQuota,
      totalApplicants,
      avgApplicantsPerJob,
      avgPassRate,
      companyLeaderboard,
      competitiveJobs,
      eduBreakdown,
      topCities,
      heatClassification,
      sortedMajors,
      userFriendlyJobs,
      rolesBreakdown,
      regionalDistribution,
      avgPassRateByCompany,
      sectorBreakdown,
      industryBreakdown,
      avgQuotaPerSector,
      sectoralCompetitionIndex,
      quotaCorrelation,
      topSkills,
      regionCitiesSorted
    };
  }, [filteredListings]);



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
    setDraftSearch("");
    setDraftCompany("");
    setDraftMajor("");
    setDraftCity("");
    setDraftEdu("");
    setDraftSector("");
    setSearch("");
    setSelectedCompany("");
    setSelectedMajor("");
    setSelectedCity("");
    setSelectedEdu("");
    setSelectedSector("");
    setSelectedRegionMap(null);
    setSortBy("perusahaan");
    setShowSavedOnly(false);
  };

  const handleCompanyChartClick = (companyName) => {
    setSelectedCompany(companyName);
    setDraftCompany(companyName);
    setViewTab("gallery");
  };

  const handleMajorChartClick = (majorRumpunName) => {
    let query = "";
    if (majorRumpunName === "Teknik / STEM") query = "Teknik";
    else if (majorRumpunName === "Manajemen / Bisnis") query = "Manajemen";
    else if (majorRumpunName === "Ekonomi & Akuntansi") query = "Akuntansi";
    else if (majorRumpunName === "Teknologi Informasi & Komputer") query = "Informatika";
    else if (majorRumpunName === "Psikologi / Human Resources") query = "Psikologi";
    else if (majorRumpunName === "Hukum & Legal") query = "Hukum";
    else if (majorRumpunName === "Statistika / Matematika") query = "Statistika";
    else if (majorRumpunName === "Semua Jurusan") query = "Semua Jurusan";
    
    if (query) {
      setSearch(query);
      setDraftSearch(query);
      setViewTab("gallery");
    }
  };

  const handleCityChartClick = (cityName) => {
    setSelectedCity(cityName);
    setDraftCity(cityName);
    setViewTab("gallery");
  };

  const handleSkillChartClick = (skillName) => {
    let query = "";
    if (skillName.includes("Excel")) query = "excel";
    else if (skillName.includes("SQL")) query = "sql";
    else if (skillName.includes("Python")) query = "python";
    else if (skillName.includes("HSE") || skillName.includes("Keselamatan")) query = "hse";
    else if (skillName.includes("Project")) query = "project management";
    else if (skillName.includes("AutoCAD") || skillName.includes("CAD")) query = "autocad";
    else if (skillName.includes("Data") || skillName.includes("Analytics")) query = "data analytics";
    else if (skillName.includes("Desain") || skillName.includes("Canva")) query = "adobe";
    
    if (query) {
      setSearch(query);
      setDraftSearch(query);
      setViewTab("gallery");
    }
  };

  const handleSectorChartClick = (sectorName) => {
    let query = "";
    if (sectorName.includes("Hulu")) query = "hulu";
    else if (sectorName.includes("Hilir") || sectorName.includes("Patra")) query = "patra niaga";
    else if (sectorName.includes("Logistik") || sectorName.includes("shipping")) query = "shipping";
    else if (sectorName.includes("Power")) query = "power";
    else if (sectorName.includes("Gas")) query = "gas";
    else if (sectorName.includes("Holding")) query = "persero";
    
    if (query) {
      setSearch(query);
      setDraftSearch(query);
      setViewTab("gallery");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#37352f] relative">
      {/* Notion Sidebar - Desktop Only */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-[#fbfbfa]/95 backdrop-blur-md relative top-0 bottom-0 left-0 transition-all duration-300 ease-in-out z-45 border-r border-[#edece9]/80
          ${sidebarOpen ? "w-[280px]" : "w-[68px]"}
        `}
      >
        {/* Toggle Button Overlapping Right Border */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-[68px] -right-3 w-5 h-5 bg-white border border-[#edece9] rounded-full shadow-xs flex items-center justify-center text-[#5a5a57] hover:text-[#37352f] hover:scale-105 hover:bg-[#edece9]/30 transition-all z-50 cursor-pointer"
          title={sidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
        >
          {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {/* Top Header Logo */}
        <div className="p-5 flex items-center justify-between border-b border-[#edece9]/50 flex-shrink-0">
          <div className={`flex items-center gap-2.5 ${sidebarOpen ? "" : "mx-auto"}`}>
            <img src="/logo.png?v=2" alt="Logo" className="h-9 w-auto object-contain flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex flex-col animate-fade-in">
                <span className="font-extrabold text-[14.5px] leading-none text-[#37352f] tracking-tight">KarirEnergi</span>
                <span className="text-[9.5px] text-[#9b9a97] mt-0.5 font-semibold flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#1d7bb8]"></span>
                  Independen
                </span>
              </div>
            )}
          </div>
          {/* Mobile close button inside sidebar */}
          {sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-[#edece9] text-[#5a5a57] cursor-pointer flex items-center justify-center flex-shrink-0 transition-colors"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation & Filters */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scrollbar-thin">
          {/* Navigation */}
          <div className="flex flex-col gap-2">
            {sidebarOpen && <div className="text-[10px] font-extrabold text-[#9b9a97] uppercase tracking-wider px-2.5">Menu Utama</div>}
            <nav className="flex flex-col gap-0.5">
              <button
                onClick={() => setShowSavedOnly(false)}
                className={`flex items-center w-full px-2.5 py-2 rounded-lg text-[13px] hover:bg-[#edece9]/50 hover:text-[#37352f] transition-all cursor-pointer group ${
                  !showSavedOnly 
                    ? "bg-[#edece9]/70 text-[#37352f] font-bold" 
                    : "text-[#5a5a57]"
                } ${sidebarOpen ? "justify-start" : "justify-center"}`}
                title="Semua Lowongan"
              >
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="ml-2.5 truncate animate-fade-in group-hover:translate-x-0.5 transition-transform">Semua Lowongan</span>}
              </button>

              <button
                onClick={() => setShowSavedOnly(true)}
                className={`flex items-center w-full px-2.5 py-2 rounded-lg text-[13px] hover:bg-[#edece9]/50 hover:text-[#37352f] transition-all cursor-pointer justify-between group ${
                  showSavedOnly 
                    ? "bg-[#edece9]/70 text-[#37352f] font-bold" 
                    : "text-[#5a5a57]"
                } ${sidebarOpen ? "px-2.5" : "justify-center"}`}
                title="Tersimpan"
              >
                <div className="flex items-center">
                  <Bookmark className={`w-4 h-4 flex-shrink-0 ${showSavedOnly || savedJobs.length > 0 ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                  {sidebarOpen && <span className="ml-2.5 truncate animate-fade-in group-hover:translate-x-0.5 transition-transform">Tersimpan</span>}
                </div>
                {sidebarOpen && savedJobs.length > 0 && (
                  <span className="text-[10px] bg-[#edece9] text-[#5a5a57] px-1.5 py-0.25 rounded font-bold animate-fade-in">
                    {savedJobs.length}
                  </span>
                )}
              </button>

              <a
                href="https://recruitment.pertamina.com"
                target="_blank"
                rel="noreferrer"
                className={`flex items-center px-2.5 py-2 rounded-lg text-[13px] hover:bg-[#edece9]/50 text-[#5a5a57] hover:text-[#37352f] transition-all group ${sidebarOpen ? "justify-start" : "justify-center"
                  }`}
                title="Portal Resmi"
              >
                <ArrowUpRight className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="ml-2.5 truncate animate-fade-in group-hover:translate-x-0.5 transition-transform">Portal Resmi</span>}
              </a>
            </nav>
          </div>

          {/* Filters Area - Only visible on desktop (hidden on mobile) */}
          <div className="hidden md:flex flex-col gap-2">
            {sidebarOpen ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="text-[10px] font-extrabold text-[#9b9a97] uppercase tracking-wider flex items-center justify-between border-b border-[#edece9]/60 pb-1.5 px-2.5">
                  <span>Filter</span>
                  {(draftSearch || draftCompany || draftMajor || draftCity || draftEdu || draftSector || search || selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector) && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[10px] text-[#1d7bb8] hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3.5 px-1">
                  {/* Search */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider px-1">Cari Kata Kunci</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
                      <input
                        type="text"
                        placeholder="Judul, jurusan..."
                        value={draftSearch}
                        onChange={(e) => setDraftSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleApplyFilters(); }}
                        className="w-full text-[12px] border border-[#edece9] rounded-lg pl-8 pr-2.5 py-1.5 bg-white outline-none focus:border-[#c4c4c2] focus:shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Company dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider px-1">Perusahaan</label>
                    <select
                      value={draftCompany}
                      onChange={(e) => setDraftCompany(e.target.value)}
                      className="w-full text-[12px] border border-[#edece9] rounded-lg px-2.5 py-1.5 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                    >
                      <option value="">Semua Perusahaan</option>
                      {filterOptions.companies.map((c) => (
                        <option key={c} value={c}>{c} ({filterOptions.companyCounts[c] || 0})</option>
                      ))}
                    </select>
                  </div>

                  {/* Major dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider px-1">Jurusan</label>
                    <select
                      value={draftMajor}
                      onChange={(e) => setDraftMajor(e.target.value)}
                      className="w-full text-[12px] border border-[#edece9] rounded-lg px-2.5 py-1.5 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                    >
                      <option value="">Seluruh Jurusan (No Filter)</option>
                      {filterOptions.majors.map((m) => (
                        <option key={m} value={m}>{m} ({filterOptions.majorCounts[m] || 0})</option>
                      ))}
                    </select>
                  </div>

                  {/* City dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider px-1">Lokasi / Kota</label>
                    <select
                      value={draftCity}
                      onChange={(e) => setDraftCity(e.target.value)}
                      className="w-full text-[12px] border border-[#edece9] rounded-lg px-2.5 py-1.5 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                    >
                      <option value="">Semua Lokasi</option>
                      {filterOptions.cities.map((ct) => (
                        <option key={ct} value={ct}>{ct} ({filterOptions.cityCounts[ct] || 0})</option>
                      ))}
                    </select>
                  </div>

                  {/* Education dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider px-1">Pendidikan</label>
                    <select
                      value={draftEdu}
                      onChange={(e) => setDraftEdu(e.target.value)}
                      className="w-full text-[12px] border border-[#edece9] rounded-lg px-2.5 py-1.5 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                    >
                      <option value="">Semua Jenjang</option>
                      {filterOptions.educations.map((ed) => (
                        <option key={ed} value={ed}>{ed} ({filterOptions.educationCounts[ed] || 0})</option>
                      ))}
                    </select>
                  </div>

                  {/* Sektor Kerja dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider px-1">Sektor Kerja</label>
                    <select
                      value={draftSector}
                      onChange={(e) => setDraftSector(e.target.value)}
                      className="w-full text-[12px] border border-[#edece9] rounded-lg px-2.5 py-1.5 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                    >
                      <option value="">Semua Sektor</option>
                      {filterOptions.sectors.map((s) => (
                        <option key={s} value={s}>{s} ({filterOptions.sectorCounts[s] || 0})</option>
                      ))}
                    </select>
                  </div>

                  {/* Apply Filters Button */}
                  <button
                    onClick={handleApplyFilters}
                    className="w-full bg-[#1d7bb8] text-white hover:bg-[#155a8a] py-2 rounded-lg text-[12.5px] font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer mt-1 hover:shadow-md"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Cari Lowongan
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 items-center py-2 animate-fade-in">
                {/* Collapsed Filter Trigger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className={`p-2.5 rounded-lg hover:bg-[#edece9]/50 text-[#5a5a57] relative transition-all hover:scale-105 cursor-pointer ${(search || selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector) ? "text-[#1d7bb8] bg-[#e8f4fa]" : ""
                    }`}
                  title="Buka Filter & Cari"
                >
                  <Search className="w-4 h-4" />
                  {(search || selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector) && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#1d7bb8] rounded-full"></span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t border-[#edece9]/50 bg-transparent flex-shrink-0 text-center flex flex-col gap-1.5 select-none ${sidebarOpen ? "block" : "hidden"}`}>
          <span className="text-[10px] text-[#8a8a86] font-semibold leading-none">
            KarirEnergi &copy; 2026
          </span>
          <span className="text-[10px] text-[#8a8a86] font-medium">
            Support:{" "}
            <a
              href="https://saweria.co/mocitaz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1d7bb8] hover:underline font-bold"
            >
              saweria.co/mocitaz
            </a>
          </span>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">

        {/* Top Header / Breadcrumb Bar */}
        <div className={`border-b border-[#edece9]/60 px-6 md:px-10 flex items-center justify-between flex-shrink-0 text-[11px] text-[#9b9a97] transition-all duration-300 ease-in-out
          ${isScrolled ? "md:h-0 md:opacity-0 md:overflow-hidden md:border-none md:pointer-events-none h-10 opacity-100" : "h-10 opacity-100"}
        `}>
          <div className="flex items-center gap-2">
            <span>Arsip</span>
            <span>/</span>
            <span className="text-[#37352f] font-medium truncate max-w-[100px] sm:max-w-none">Database Lowongan</span>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-center p-1.5 rounded-lg hover:bg-[#edece9]/40 border border-[#edece9]/20 transition-all cursor-pointer text-[#5a5a57] hover:text-[#37352f] select-none"
            title={darkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-500 animate-[spin_4s_linear_infinite]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#5a5a57]" />
            )}
          </button>
        </div>

        {/* Header Title, Description & Countdown */}
        <div className="px-6 md:px-10 pt-4 md:pt-5 pb-3.5 flex-shrink-0 border-b border-[#edece9]/60 bg-white">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-extrabold text-[#37352f] tracking-tight">KarirEnergi Database</h1>
                <span className="text-[10px] font-semibold text-[#8a8a86] bg-[#edece9]/50 border border-[#edece9] px-2 py-0.5 rounded-full select-none">
                  Non-Official
                </span>
              </div>
              {/* Collapse description & update time when scrolled */}
              <div className={`transition-all duration-300 ease-in-out origin-top ${
                isScrolled ? "h-0 opacity-0 overflow-hidden mt-0 pointer-events-none" : "opacity-100 mt-0.5"
              }`}>
                <p className="text-[12.5px] text-[#5a5a57] max-w-2xl leading-relaxed">
                  Pelacak independen program magang resmi Pertamina.
                </p>
                <div className="text-[10.5px] text-[#9b9a97] mt-0.5 flex items-center gap-2.5 flex-wrap">
                  <span>Terakhir Diupdate: 4 Juli 2026, 14:20 WIB ({getRelativeUpdateTime()})</span>
                  <span className="text-[#edece9] select-none">•</span>
                  <div className="flex items-center gap-1.5 text-[#43873e] font-extrabold select-none">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#43873e] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#43873e]"></span>
                    </span>
                    <span>{liveVisitors} orang sedang memantau</span>
                  </div>
                </div>
              </div>

              {/* Navigation Links inside Header on Mobile */}
              <div className="flex md:hidden items-center gap-4 text-[12.5px] border-t border-[#edece9]/40 pt-2.5 mt-2.5">
                <button
                  onClick={() => setShowSavedOnly(false)}
                  className={`font-semibold transition-all pb-1 cursor-pointer ${!showSavedOnly ? "text-[#1d7bb8] border-b-2 border-[#1d7bb8]" : "text-[#8a8a86]"}`}
                >
                  Semua Lowongan
                </button>
                <button
                  onClick={() => setShowSavedOnly(true)}
                  className={`font-semibold transition-all pb-1 cursor-pointer flex items-center gap-1.5 ${showSavedOnly ? "text-[#1d7bb8] border-b-2 border-[#1d7bb8]" : "text-[#8a8a86]"}`}
                >
                  Tersimpan
                  {savedJobs.length > 0 && (
                    <span className="text-[10px] bg-[#edece9] text-[#5a5a57] px-1.5 py-0.25 rounded-full font-bold">
                      {savedJobs.length}
                    </span>
                  )}
                </button>
                <a
                  href="https://recruitment.pertamina.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#8a8a86] flex items-center gap-0.5 hover:text-[#37352f] pb-1"
                >
                  Portal Resmi <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Compact Monospace Countdown - Collapse when scrolled */}
            {!timeLeft.isExpired && (
              <div className={`transition-all duration-300 ease-in-out ${
                isScrolled ? "h-0 opacity-0 overflow-hidden p-0 border-none pointer-events-none" : "flex items-center bg-[#f1f1ef]/60 border border-[#edece9] text-[#37352f] px-3.5 py-1.5 rounded-lg text-[12px] w-fit shadow-3xs self-start sm:self-center"
              }`}>
                <Timer className="w-3.5 h-3.5 mr-2 text-[#5a5a57] flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#8a8a86] leading-none mb-0.5">Batas Registrasi</span>
                  <span className="font-mono font-bold leading-none select-none flex items-center gap-0.5 text-[#37352f]">
                    <span>{timeLeft.days}<span className="text-[8.5px] font-sans font-semibold text-[#8a8a86] ml-0.5">d</span></span>
                    <span className="text-[#8a8a86]/50 font-sans mx-1">:</span>
                    <span>{String(timeLeft.hours).padStart(2, "0")}<span className="text-[8.5px] font-sans font-semibold text-[#8a8a86] ml-0.5">h</span></span>
                    <span className="text-[#8a8a86]/50 font-sans mx-1">:</span>
                    <span>{String(timeLeft.minutes).padStart(2, "0")}<span className="text-[8.5px] font-sans font-semibold text-[#8a8a86] ml-0.5">m</span></span>
                    <span className="text-[#8a8a86]/50 font-sans mx-1">:</span>
                    <span>{String(timeLeft.seconds).padStart(2, "0")}<span className="text-[8.5px] font-sans font-semibold text-[#8a8a86] ml-0.5">s</span></span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inline Statistics Bar - Collapse when scrolled */}
        <div className={`px-6 md:px-10 flex-shrink-0 border-b border-[#edece9]/40 bg-[#f7f7f5]/30 transition-all duration-300 ease-in-out ${
          isScrolled ? "h-0 opacity-0 overflow-hidden py-0 border-none pointer-events-none" : "py-3"
        }`}>
          <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#5a5a57] select-none font-medium">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#37352f]">{totalCount}</span>
              <span className="text-[#8a8a86]">Total Lowongan</span>
            </div>
            <span className="text-[#edece9] hidden xs:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#37352f]">{databaseStats.pelamar.toLocaleString('id-ID')}</span>
              <span className="text-[#8a8a86]">Total Pendaftar</span>
            </div>
            <span className="text-[#edece9] hidden xs:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#37352f]">{databaseStats.kuota.toLocaleString('id-ID')}</span>
              <span className="text-[#8a8a86]">Total Kuota</span>
            </div>
            <span className="text-[#edece9] hidden xs:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#c52447]">{s1Count}</span>
              <span className="text-[#c52447]/70">Khusus Jenjang S1</span>
            </div>
          </div>
        </div>

        {/* Database Filters & View Toggle Panel */}
        <div className="px-6 md:px-10 py-3.5 flex-shrink-0 border-b border-[#edece9]">
          <div className="max-w-6xl mx-auto flex flex-col gap-3">

            {/* View Tabs Selector, Sorting, and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center bg-[#edece9]/40 p-0.5 rounded-lg border border-[#edece9]/30 w-fit flex-shrink-0">
                <button
                  onClick={() => setViewTab("gallery")}
                  className={`flex items-center gap-1.5 px-3 py-1.25 rounded-md text-[12px] transition-all cursor-pointer ${
                    viewTab === "gallery"
                      ? "bg-white text-[#37352f] font-bold shadow-xs"
                      : "text-[#5a5a57] hover:text-[#37352f]"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Gallery
                </button>
                <button
                  onClick={() => setViewTab("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.25 rounded-md text-[12px] transition-all cursor-pointer ${
                    viewTab === "table"
                      ? "bg-white text-[#37352f] font-bold shadow-xs"
                      : "text-[#5a5a57] hover:text-[#37352f]"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Table
                </button>
                <button
                  onClick={() => setViewTab("analytics")}
                  className={`flex items-center gap-1.5 px-3 py-1.25 rounded-md text-[12px] transition-all cursor-pointer ${
                    viewTab === "analytics"
                      ? "bg-white text-[#37352f] font-bold shadow-xs"
                      : "text-[#5a5a57] hover:text-[#37352f]"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Analisis
                </button>
                <button
                  onClick={() => setViewTab("kelayakan")}
                  className={`flex items-center gap-1.5 px-3 py-1.25 rounded-md text-[12px] transition-all cursor-pointer ${
                    viewTab === "kelayakan"
                      ? "bg-white text-[#37352f] font-bold shadow-xs"
                      : "text-[#5a5a57] hover:text-[#37352f]"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  Kelayakan
                </button>
              </div>

              {/* Search, Sort & Filters in One Line */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search Bar - Always Visible */}
                <div className="relative flex-grow sm:w-60 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
                  <input
                    type="text"
                    placeholder="Cari lowongan magang..."
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleApplyFilters(); }}
                    className="w-full text-[12.5px] border border-[#edece9] bg-[#f7f7f5]/40 focus:bg-white rounded-md pl-8 pr-3 py-1.5 outline-none focus:border-[#dfdfde] transition-all"
                  />
                </div>

                {/* Mobile Filter Button - only visible on mobile (under md) to open bottom sheet */}
                <button
                  onClick={() => setFilterDrawerOpen(true)}
                  className="md:hidden flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#f1f1ef]/60 hover:bg-[#edece9]/80 text-[#5a5a57] rounded-md text-[12.5px] font-semibold border border-[#edece9] transition-all cursor-pointer flex-shrink-0"
                  title="Buka Panel Filter Lengkap"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {(draftCompany || draftMajor || draftCity || draftEdu || draftSector || selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector) && (
                    <span className="w-1.5 h-1.5 bg-[#1d7bb8] rounded-full"></span>
                  )}
                </button>

                {/* Reset button - Always visible if filters are active */}
                {(draftSearch || draftCompany || draftMajor || draftCity || draftEdu || draftSector || search || selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector) && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[12px] text-[#1d7bb8] hover:bg-[#e8f4fa] px-2.5 py-1.5 rounded transition-colors flex items-center gap-1 font-semibold cursor-pointer flex-shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters Row - Hidden on mobile, shown on desktop (md and larger) */}
            <div className="hidden md:flex flex-wrap items-center gap-2 w-full pt-2 border-t border-[#edece9]/40">
              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[11.5px] text-[#9b9a97]">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-[12px] bg-[#f1f1ef]/60 hover:bg-[#edece9]/80 text-[#5a5a57] font-medium border-none rounded-md px-2 py-1 outline-none cursor-pointer transition-all notion-select"
                >
                  <option value="perusahaan">Nama Perusahaan</option>
                  <option value="judul">Judul Lowongan</option>
                  <option value="peluang-desc">Peluang Lolos (Tertinggi)</option>
                  <option value="peluang-asc">Peluang Lolos (Terendah)</option>
                  <option value="pelamar-desc">Pelamar (Terbanyak)</option>
                  <option value="pelamar-asc">Pelamar (Tersedikit)</option>
                  <option value="kuota-desc">Kuota (Terbesar)</option>
                  <option value="kuota-asc">Kuota (Terkecil)</option>
                </select>
              </div>

              <div className="h-4 w-[1px] bg-[#edece9] mr-2"></div>

              {/* Company dropdown */}
              <select
                value={draftCompany}
                onChange={(e) => setDraftCompany(e.target.value)}
                className="text-[12px] bg-[#f1f1ef]/60 hover:bg-[#edece9]/80 text-[#5a5a57] font-medium border-none rounded-md px-2.5 py-1.5 outline-none cursor-pointer transition-all flex-grow max-w-[155px] notion-select"
              >
                <option value="">Semua Perusahaan</option>
                {filterOptions.companies.map((c) => (
                  <option key={c} value={c}>{c} ({filterOptions.companyCounts[c] || 0})</option>
                ))}
              </select>

              {/* Major dropdown */}
              <select
                value={draftMajor}
                onChange={(e) => setDraftMajor(e.target.value)}
                className="text-[12px] bg-[#f1f1ef]/60 hover:bg-[#edece9]/80 text-[#5a5a57] font-medium border-none rounded-md px-2.5 py-1.5 outline-none cursor-pointer transition-all flex-grow max-w-[155px] notion-select"
              >
                <option value="">Seluruh Jurusan (No Filter)</option>
                {filterOptions.majors.map((m) => (
                  <option key={m} value={m}>{m} ({filterOptions.majorCounts[m] || 0})</option>
                ))}
              </select>

              {/* City dropdown */}
              <select
                value={draftCity}
                onChange={(e) => setDraftCity(e.target.value)}
                className="text-[12px] bg-[#f1f1ef]/60 hover:bg-[#edece9]/80 text-[#5a5a57] font-medium border-none rounded-md px-2.5 py-1.5 outline-none cursor-pointer transition-all flex-grow max-w-[145px] notion-select"
              >
                <option value="">Semua Lokasi</option>
                {filterOptions.cities.map((ct) => (
                  <option key={ct} value={ct}>{ct} ({filterOptions.cityCounts[ct] || 0})</option>
                ))}
              </select>

              {/* Education dropdown */}
              <select
                value={draftEdu}
                onChange={(e) => setDraftEdu(e.target.value)}
                className="text-[12px] bg-[#f1f1ef]/60 hover:bg-[#edece9]/80 text-[#5a5a57] font-medium border-none rounded-md px-2.5 py-1.5 outline-none cursor-pointer transition-all flex-grow max-w-[125px] notion-select"
              >
                <option value="">Semua Jenjang</option>
                {filterOptions.educations.map((ed) => (
                  <option key={ed} value={ed}>{ed} ({filterOptions.educationCounts[ed] || 0})</option>
                ))}
              </select>

              {/* Sektor Kerja dropdown */}
              <select
                value={draftSector}
                onChange={(e) => setDraftSector(e.target.value)}
                className="text-[12px] bg-[#f1f1ef]/60 hover:bg-[#edece9]/80 text-[#5a5a57] font-medium border-none rounded-md px-2.5 py-1.5 outline-none cursor-pointer transition-all flex-grow max-w-[130px] notion-select"
              >
                <option value="">Semua Sektor</option>
                {filterOptions.sectors.map((s) => (
                  <option key={s} value={s}>{s} ({filterOptions.sectorCounts[s] || 0})</option>
                ))}
              </select>

              {/* Cari Button */}
              <button
                onClick={handleApplyFilters}
                className="bg-[#1d7bb8] text-white hover:bg-[#155a8a] px-4 py-1.25 rounded-md text-[12px] font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <Search className="w-3.5 h-3.5" />
                Cari
              </button>
            </div>

            {/* Mobile Sorting */}
            <div className="flex items-center justify-end text-[11.5px] text-[#9b9a97] md:hidden pt-1 border-t border-[#edece9]/40">
              <div className="flex items-center gap-1">
                <span>Urut:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-[#5a5a57] font-semibold outline-none cursor-pointer"
                >
                  <option value="perusahaan">Instansi</option>
                  <option value="judul">Judul</option>
                  <option value="peluang-desc">Peluang ↑</option>
                  <option value="peluang-asc">Peluang ↓</option>
                  <option value="pelamar-desc">Pelamar ↑</option>
                  <option value="pelamar-asc">Pelamar ↓</option>
                  <option value="kuota-desc">Kuota ↑</option>
                  <option value="kuota-asc">Kuota ↓</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Dynamic Database Content Area */}
        <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 md:px-10 py-5 md:py-6">
          <div className="max-w-6xl mx-auto">

            {/* Results Count Banner */}
            {viewTab !== "analytics" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11.5px] text-[#9b9a97] mb-4 select-none bg-[#f7f7f5]/30 border border-[#edece9]/60 px-3 py-2 rounded-md gap-2">
                <span className="leading-relaxed">
                  Menampilkan <span className="font-bold text-[#37352f]">{filteredListings.length}</span> dari <span className="font-semibold text-[#8a8a86]">{listings.length}</span> posisi lowongan magang
                  {(selectedCompany || search || selectedMajor || selectedCity || selectedEdu || selectedSector || showSavedOnly || selectedRegionMap) ? (
                    <span className="text-[#1d7bb8] ml-1 font-semibold">
                      (Filter aktif: {[
                        selectedCompany ? `Instansi: ${selectedCompany}` : "",
                        search ? `Kata Kunci: "${search}"` : "",
                        selectedMajor ? `Jurusan: ${selectedMajor}` : "",
                        selectedCity ? `Kota: ${selectedCity}` : "",
                        selectedEdu ? `Jenjang: ${selectedEdu}` : "",
                        selectedSector ? `Sektor: ${selectedSector}` : "",
                        selectedRegionMap ? `Wilayah: ${selectedRegionMap}` : "",
                        showSavedOnly ? "Favorit" : ""
                      ].filter(Boolean).join(", ")})
                    </span>
                  ) : null}
                </span>
                {(selectedCompany || search || selectedMajor || selectedCity || selectedEdu || selectedSector || showSavedOnly || selectedRegionMap) && (
                  <button 
                    onClick={handleResetFilters}
                    className="text-[#c52447] hover:underline font-bold cursor-pointer self-start sm:self-auto text-left"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            )}

            {/* Gallery View */}
            {viewTab === "gallery" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                {filteredListings.slice(0, visibleLimit).map((job) => {
                  const tagColor = getNotionColor(job["Perusahaan"]);
                  const stats = getDeterministicStats(job["Judul Lowongan"], job["Perusahaan"], job["Link Detail"], job["Kuota"], job["Pelamar"]);
                  
                  // Extract first two majors for inline tags
                  const majorTags = job["Jurusan"]
                    ? job["Jurusan"]
                      .split(",")
                      .map((j) => j.trim())
                      .filter((j) => j && !j.toLowerCase().includes("tidak tertera") && !j.toLowerCase().includes("semua jurusan"))
                      .slice(0, 2)
                    : [];

                  return (
                    <div
                      key={job["Link Detail"]}
                      onClick={() => setSelectedJob(job)}
                      className="group border border-[#edece9] rounded-lg p-4 flex flex-col justify-between cursor-pointer hover:border-[#dfdfde] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all bg-white"
                    >
                      {/* Top Part */}
                      <div className="flex flex-col gap-2 flex-grow">

                        {/* Title */}
                        <h3 className="font-bold text-[13.5px] text-[#37352f] leading-snug group-hover:text-[#1d7bb8] transition-colors truncate" title={job["Judul Lowongan"]}>
                          {job["Judul Lowongan"]}
                        </h3>

                        {/* Company Name (underneath title) */}
                        <div className="text-[11px] text-[#8a8a86] font-semibold leading-normal -mt-0.5">
                          {job["Perusahaan"]}
                        </div>

                        {/* Majors & Education list (Forced single line) */}
                        <div className="flex flex-nowrap overflow-hidden gap-1.5 mt-1 w-full">
                          <span className="text-[10px] bg-[#edece9]/50 text-[#5a5a57] border border-[#edece9]/80 px-1.5 py-0.5 rounded-sm font-semibold flex-shrink-0 select-none">
                            {job["Pendidikan"]}
                          </span>
                          {majorTags.map((tag, idx) => (
                            <span key={idx} className="text-[10px] bg-[#f7f7f5] text-[#5a5a57] border border-[#edece9]/80 px-1.5 py-0.5 rounded-sm truncate max-w-[105px] flex-shrink-0" title={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5a5a57] mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#9b9a97] flex-shrink-0" />
                          <span className="truncate">{job["Kota"]}</span>
                        </div>
                      </div>

                      {/* Bottom Part (Static Mini Panel & Footer) */}
                      <div className="mt-3.5 flex flex-col gap-3.5">
                        {/* Quota & Applicants Mini Panel */}
                        {(() => {
                          const comp = getCompetitionLevel(stats.passRate);
                          return (
                            <div className="grid grid-cols-4 bg-[#f7f7f5]/60 rounded py-2 px-1 text-center text-[10px] border border-[#edece9]/50 divide-x divide-[#edece9]/50">
                              <div className="flex flex-col justify-center px-0.5">
                                <span className="text-[#9b9a97] text-[7.5px] font-bold uppercase tracking-wider">Kuota</span>
                                <span className="text-[#37352f] font-bold text-[10.5px] mt-0.5 leading-tight">{stats.kuota}</span>
                              </div>
                              <div className="flex flex-col justify-center px-0.5">
                                <span className="text-[#9b9a97] text-[7.5px] font-bold uppercase tracking-wider">Pelamar</span>
                                <span className="text-[#5a5a57] font-semibold text-[10.5px] mt-0.5 leading-tight">{stats.pelamar}</span>
                              </div>
                              <div className="flex flex-col justify-center px-0.5">
                                <span className="text-[#9b9a97] text-[7.5px] font-bold uppercase tracking-wider">Peluang</span>
                                <span className="text-[#c52447] font-bold text-[10.5px] mt-0.5 leading-tight">{stats.passRate}%</span>
                              </div>
                              <div className="flex flex-col justify-center px-0.5">
                                <span className="text-[#9b9a97] text-[7.5px] font-bold uppercase tracking-wider">Saingan</span>
                                <span className={`font-bold text-[10.5px] mt-0.5 leading-tight ${comp.text}`}>{comp.label.replace("Persaingan ", "")}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Footer border / info */}
                        <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-[#edece9]/50 text-[#9b9a97]">
                          <span className="group-hover:text-[#1d7bb8] transition-colors flex items-center gap-1 font-medium">
                            Detail Loker
                            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                          </span>
                          <button
                            onClick={(e) => toggleSaveJob(job["Link Detail"], e)}
                            className="p-1 rounded hover:bg-[#edece9] text-[#9b9a97] hover:text-[#b78103] transition-colors cursor-pointer flex items-center justify-center"
                            title={savedJobs.includes(job["Link Detail"]) ? "Hapus dari Tersimpan" : "Simpan Lowongan"}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${savedJobs.includes(job["Link Detail"]) ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredListings.length === 0 && <EmptyState showSavedOnly={showSavedOnly} onReset={handleResetFilters} />}
              </div>
            )}

            {/* Table View */}
            {viewTab === "table" && (
              <div className="border border-[#edece9] rounded-lg overflow-hidden bg-white shadow-sm animate-fade-in">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-[12.5px] border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#f7f7f5]/80 border-b border-[#edece9] text-[#8a8a86] text-[10.5px] font-bold uppercase tracking-wider select-none">
                        <th className="px-4 py-3 w-12 text-center">No.</th>
                        <th className="px-2 py-3 w-10 text-center"></th>
                        <th className="px-4 py-3">Perusahaan</th>
                        <th className="px-4 py-3">Judul Lowongan</th>
                        <th className="px-4 py-3">Lokasi</th>
                        <th className="px-4 py-3 text-center w-24">Jenjang</th>
                        <th className="px-4 py-3 w-28">Kuota</th>
                        <th className="px-4 py-3 w-32">Peluang Lolos</th>
                        <th className="px-4 py-3">Jurusan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListings.slice(0, visibleLimit).map((job, idx) => {
                        const stats = getDeterministicStats(job["Judul Lowongan"], job["Perusahaan"], job["Link Detail"], job["Kuota"], job["Pelamar"]);
                        return (
                          <tr
                            key={idx}
                            onClick={() => setSelectedJob(job)}
                            className="border-b border-[#edece9]/50 hover:bg-[#f7f7f5]/60 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3.5 text-center text-[#8a8a86] font-semibold">{idx + 1}</td>
                            <td className="px-2 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => toggleSaveJob(job["Link Detail"], e)}
                                className="p-1.5 rounded-md hover:bg-[#edece9]/60 text-[#9b9a97] hover:text-[#b78103] transition-colors cursor-pointer"
                                title={savedJobs.includes(job["Link Detail"]) ? "Hapus dari Tersimpan" : "Simpan Lowongan"}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${savedJobs.includes(job["Link Detail"]) ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                              </button>
                            </td>
                            <td className="px-4 py-3.5 font-medium text-[#5a5a57] max-w-[160px] truncate" title={job["Perusahaan"]}>
                              {job["Perusahaan"]}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-[#1d7bb8] hover:text-[#155a8a] max-w-[260px] truncate transition-colors" title={job["Judul Lowongan"]}>
                              {job["Judul Lowongan"]}
                            </td>
                            <td className="px-4 py-3.5 text-[#5a5a57] max-w-[130px] truncate" title={job["Kota"]}>
                              {job["Kota"]}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#f3ebf7] text-[#6b21a8] inline-block select-none">
                                {job["Pendidikan"]}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col leading-normal">
                                <span className="font-semibold text-[#37352f]">{stats.kuota} Kuota</span>
                                <span className="text-[#9b9a97] text-[11px]">{stats.pelamar} Pelamar</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col leading-normal">
                                <span className="font-bold text-[#c52447]">{stats.passRate}%</span>
                                {(() => {
                                  const comp = getCompetitionLevel(stats.passRate);
                                  const label = comp.label.replace("Persaingan ", "");
                                  return (
                                    <span className={`text-[10px] font-bold mt-0.5 leading-tight ${comp.text}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 max-w-[220px] truncate text-[#5a5a57]" title={job["Jurusan"]}>
                              {job["Jurusan"]}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredListings.length === 0 && <EmptyState showSavedOnly={showSavedOnly} onReset={handleResetFilters} />}
              </div>
            )}

            {viewTab === "analytics" && (
              <div className="flex flex-col gap-6 animate-fade-in pb-10 select-none">
                
                {/* Executive Insights Summary Panel */}
                <div className="bg-[#f7f7f5]/55 border border-[#edece9] rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 select-none relative overflow-hidden group/insight">
                  <div className="flex gap-4 items-start md:items-center">
                    <div className="bg-[#edece9]/60 p-2.5 rounded-lg border border-[#edece9] flex-shrink-0 group-hover/insight:scale-105 transition-transform">
                      <TrendingUp className="w-6 h-6 text-[#b78103]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-bold text-[14.5px] text-[#37352f]">Resume Insight Analisis Magang</h4>
                      <p className="text-[12px] text-[#5a5a57] leading-relaxed max-w-3xl">
                        Berdasarkan data terkini, <strong>{analyticsData.totalJobs} posisi lowongan</strong> magang Pertamina didominasi oleh penempatan di <strong>Jakarta Pusat ({analyticsData.topCities[0]?.name || "-"})</strong> dengan prasyarat rumpun <strong>Teknik / STEM</strong> sebagai prodi paling dicari. Anak perusahaan paling akomodatif dengan rata-rata peluang lolos tertinggi dipimpin oleh <strong>{analyticsData.avgPassRateByCompany[0]?.name || "-"} ({analyticsData.avgPassRateByCompany[0]?.avgRate || "-"}%)</strong>.
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-[#8a8a86] font-medium border border-[#edece9]/80 bg-[#edece9]/20 px-3 py-1.5 rounded-md flex-shrink-0 flex items-center gap-1.5">
                    <span>Data Real-time Scraping</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#43873e] animate-pulse"></span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#f7f7f5]/50 border border-[#edece9] rounded-lg p-4 flex flex-col gap-1 shadow-3xs hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                    <span className="text-[11px] font-bold text-[#8a8a86] uppercase tracking-wider">Total Posisi Loker</span>
                    <span className="text-2xl font-extrabold text-[#37352f] tracking-tight">{analyticsData.totalJobs}</span>
                    <span className="text-[10px] text-[#8a8a86] mt-0.5">Aktif di database</span>
                  </div>
                  
                  <div className="bg-[#f7f7f5]/50 border border-[#edece9] rounded-lg p-4 flex flex-col gap-1 shadow-3xs hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                    <span className="text-[11px] font-bold text-[#8a8a86] uppercase tracking-wider">Total Kuota Penerimaan</span>
                    <span className="text-2xl font-extrabold text-[#c26100] tracking-tight">{analyticsData.totalQuota}</span>
                    <span className="text-[10px] text-[#8a8a86] mt-0.5">Orang mahasiswa magang</span>
                  </div>

                  <div className="bg-[#f7f7f5]/50 border border-[#edece9] rounded-lg p-4 flex flex-col gap-1 shadow-3xs hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                    <span className="text-[11px] font-bold text-[#8a8a86] uppercase tracking-wider">Total Pendaftar Aktif</span>
                    <span className="text-2xl font-extrabold text-[#37352f] tracking-tight">{analyticsData.totalApplicants.toLocaleString()}</span>
                    <span className="text-[10px] text-[#8a8a86] mt-0.5">Pelamar terdaftar</span>
                  </div>

                  <div className="bg-[#f7f7f5]/50 border border-[#edece9] rounded-lg p-4 flex flex-col gap-1 shadow-3xs hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                    <span className="text-[11px] font-bold text-[#8a8a86] uppercase tracking-wider">Rata-Rata Keketatan</span>
                    <span className="text-2xl font-extrabold text-[#c52447] tracking-tight">{analyticsData.avgPassRate}%</span>
                    <span className="text-[10px] text-[#8a8a86] mt-0.5">Peluang kelulusan rata-rata</span>
                  </div>
                </div>

                {/* SVG Indonesia Map Card */}
                <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-[14px] text-[#37352f]">Peta Interaktif Sebaran Loker Magang</h3>
                    <p className="text-[11px] text-[#8a8a86]">Sentuh atau arahkan kursor ke pulau/wilayah untuk rincian kota penempatan magang</p>
                  </div>

                  <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mt-2">
                    {/* SVG Map Container */}
                    <div className="w-full lg:w-2/3 flex justify-center relative select-none">
                      {(() => {
                        // Region stats for coloring
                        const getRegionCount = (regName) => {
                          const r = analyticsData.regionalDistribution.find(x => x.name === regName);
                          return r ? r.count : 0;
                        };
                        const getRegionColor = (regName) => {
                          const count = getRegionCount(regName);
                          if (count === 0) return "#f4f4f5";
                          if (count <= 5) return "#dbeafe";
                          if (count <= 25) return "#93c5fd";
                          return "#1d7bb8";
                        };

                        const handleRegionClick = (regName) => {
                          if (selectedRegionMap === regName) {
                            setSelectedRegionMap(null);
                          } else {
                            setSelectedRegionMap(regName);
                          }
                        };

                        const isHovered = (regName) => hoveredRegionMap === regName;
                        const isSelected = (regName) => selectedRegionMap === regName;

                        return (
                          <svg className="w-full h-auto max-h-[200px] overflow-visible" viewBox="0 29 793 288">

/* Sumatera Group */
<g
  onMouseEnter={() => setHoveredRegionMap("Sumatera")}
  onMouseLeave={() => setHoveredRegionMap(null)}
  onClick={() => handleRegionClick("Sumatera")}
  className="cursor-pointer group/region transition-all duration-300"
>
  <path
    id="id-ac"
    aria-label="Aceh"
    d="m 36.70571,92.057885 -0.17,0.1 -0.71,-1.09 -1.25,-1.34 -0.98,-0.46 -0.59,-0.1 -0.24,-0.15 0.11,-0.15 0.99,-0.2 2.06,0.13 0.69,1.08 0.34,0.98 -0.01,0.86 -0.24,0.34 z m -27.5499995,-61.11 2.5899995,1.42 0.08,0.66 0.28,0.46 1.01,1 1.79,1.4 0.85,0.35 3.94,0.98 4.04,0.27 1.91,-0.35 2.23,-0.88 0.36,0 0.9,0.48 1.52,-0.36 1.12,0.12 1.41,0.53 0.38,0.33 0.32,0.86 0.62,0.21 0.98,-0.2 3.93,-1.52 0.47,0.02 0.88,0.89 1.09,1.51 2.15,2.26 1.56,1.32 1.21,0.28 0.89,1.77 0.15,1.52 0.41,0.97 0.44,0.59 -0.09,0.93 0.82,-0.1 0.97,0.36 0.64,0.31 2.06,1.58 0.14,1.33 -0.36,0.86 0,0 -0.4,0.14 -0.8,-0.15 -0.77,0.21 -0.06,0.32 -0.27,0.12 -0.56,0.12 -0.38,-0.09 -0.09,0.21 0.3,0.53 -0.03,0.38 -0.41,0.24 0.15,0.47 -0.47,0.68 0.03,0.97 -0.21,0.29 -0.24,1.33 -1.21,0.65 0.06,0.38 -0.15,0.27 -0.56,-0.38 -0.18,0.03 -0.09,0.32 0.41,0.74 -0.12,0.35 -1.48,1.18 -0.44,0.62 0.33,0.82 0.47,0.5 0,0.32 0.27,0.18 -0.03,0.74 0.74,0.35 0.21,0.88 0.56,0.41 -0.33,0.53 0.27,0.56 0.03,0.44 0.65,0.44 0.27,-0.12 0.38,0.71 -0.24,0.79 -2.37,0.65 0.09,0.18 0.59,0.12 0.5,0.5 0.06,0.74 0.62,0.65 -0.09,0.97 -0.62,-0.06 -0.18,0.12 0.21,0.26 -0.03,0.53 0.27,0.88 0,1.06 0.92,0.24 0.59,1.06 0.95,0.12 -0.03,0.26 0.24,0.29 -0.33,0.5 -0.06,0.38 0.15,0.65 0.5,0.5 0.03,0.26 -0.62,0.21 -0.24,1.41 0.18,1 0.41,0.56 -0.06,0.71 0.83,0.35 0.53,1.62 -0.61,2.79 0,0 -3.51,-1.98 -0.4,0 -0.93,0.46 -2.1,-0.53 -1.65,-2.3 -0.1,-4 -0.32,-2.17 -0.58,-1.78 -0.2,-0.21 -0.8,-0.01 -1.57,-0.62 -0.47,-0.22 -0.66,-0.63 -1.24,-1.73 -0.46,-1.96 -0.47,-0.77 -1.53,-0.52 -1.58,-2.52 -1.23,-2.32 -1.4,-0.78 -0.47,-0.52 -0.3,-1.13 -1.6,-1.12 -2.64,-0.15 -1.33,0.22 -0.68,-0.14 -0.52,-0.3 -1.68,-1.64 -1.86,-2.77 -1.7,-1.81 -0.76,-0.24 -1.31,-1.01 -0.98,-0.44 -1.17,-1.04 -1.96,-2.36 -2.8399995,-2.64 -2.3,-1.88 -1.87,-2.83 -2.41,-4.69 0.34,-0.67 -0.06,-0.3 -1.17000004,-1.87 0.4,-2.12 -0.56,-1.28 0.17,-1.57 0.86000004,0.01 2.17,-1.4 0.4,-0.07 2.87,0.44 2.43,0.76 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-bb"
    aria-label="Bangka Belitung"
    d="m 202.09571,179.05789 -0.64,0.18 -0.57,-0.17 -1.69,-0.97 0.32,-0.77 1.15,-0.51 1.7,0.73 0.13,0.29 -0.4,1.22 z m 16.28,-8.41 4.36,1.21 3.09,2.51 0.52,1.76 -1.52,2.63 -0.13,1.93 -1.62,0.74 -0.46,1.13 -1.6,0.37 -0.18,-0.29 -0.1,-1.15 -1.72,-1.95 -0.37,0.14 -0.46,0.47 0.34,0.42 -0.07,0.76 -0.39,0.26 -2.95,0.95 -0.56,-0.24 -0.57,-3.51 0.56,-1.65 0.06,-2.3 0.36,-0.43 -0.03,-0.95 0.27,-1.94 0.28,-0.37 0.74,-0.11 1.05,0.07 1.1,-0.46 z m -30.13,-13.12 0.82,1.33 0.49,1.4 -0.01,1.81 0.37,1.93 0.92,2.81 0.51,1.08 0.78,0.99 0.73,0.69 0.5,0.21 3.98,0.73 2.86,1.12 -0.68,0.39 -1.05,1.2 -1.27,3.27 -0.12,0.83 0.13,0.44 0.78,0.46 0.31,-0.07 1.19,0.55 0,1.23 -0.41,0.43 -3.43,0.07 -1.3,-2.08 -2.82,-1.27 -2.34,-0.67 -0.91,-0.45 -1.67,-0.17 -0.41,-0.3 -0.93,-1.55 -0.31,-1.34 0,-0.59 0.65,-1.5 -0.08,-0.89 -0.61,-0.52 -0.74,-0.21 -0.59,-0.74 -0.36,-3.52 -0.15,-0.33 -0.78,-0.56 -4.62,-0.52 -1.11,0.33 -1.27,0.11 -3.55,-0.88 -0.26,-0.85 0.35,-1.31 0.61,-0.45 1.88,-0.68 1.71,-1.18 0.23,-0.36 0.05,-0.46 -0.24,-0.47 -0.9,-0.55 0.16,-0.91 0.83,-0.85 1.07,-0.68 2.1,-0.66 0.49,0.12 0.74,1.75 0.15,1.67 0.92,0.74 1.24,0.29 0.49,-0.04 -1.74,-4.21 0.61,-0.32 2.47,-0.67 0.41,0.09 2.01,1.36 0.29,0.42 -0.27,0.83 0.14,0.57 0.96,1.56 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-be"
    aria-label="Bengkulu"
    d="m 118.54571,174.60789 0.21,0.59 0.85,0.54 0.14,0.71 0.88,0.53 0.13,0.28 0.44,0.15 0.3,1.19 0.4,0.64 0.62,0.14 0.47,0.44 1.15,-0.4 0.97,0.22 0.63,0.58 0.29,0.74 -0.11,1.22 0.23,0.15 -0.2,0.5 1.67,1.52 0.63,0.1 0.25,0.25 0.79,-0.56 0.86,-0.03 0.9,-0.56 0.25,0.11 0.03,0.34 0.29,0.47 0.27,-0.12 0.56,0.26 0.56,-0.25 -0.16,0.11 0.07,0.56 0.21,0.2 0.82,-0.32 0.79,0.09 0.21,0.45 -0.18,0.35 0.04,0.83 -0.15,0.93 -0.03,0.14 -0.33,0.09 -0.32,0.72 -0.72,0.74 -0.17,-0.05 -0.36,-0.64 -0.53,-0.56 -0.53,-0.3 -0.16,0.04 -0.07,1.45 -0.49,0.31 -0.63,0.76 -0.12,1.14 -1.33,0.47 -0.23,0.36 -0.47,0.18 0.67,0.2 0.4,0.4 0.17,0.4 0.89,0.51 0.85,1.08 0.68,0.39 0.76,0.2 0.61,-0.29 0.4,0.16 0.26,0.51 0.21,0.12 1.26,0.06 0.94,-0.14 0.29,0.24 0.4,0.05 0.5,1.37 0.46,0.67 0.01,1.63 1.91,0.31 0.49,0.56 0.73,0.44 0.73,0.01 0.57,0.21 0.4,-0.09 0.34,0.61 0.55,0.3 0.98,-0.36 0.56,0.18 0.31,0.65 0.01,0.57 -0.57,0.54 -0.26,0.52 1.09,1.04 -0.71,0.62 0.78,0.04 0.64,0.5 0.3,0.42 0.18,0.88 -0.39,0.49 0.36,-0.09 0.62,0.29 0.4,0.02 0.36,0.6 -0.08,0.33 0,0 -0.08,0.05 0,0 -0.11,0.11 -0.81,-0.05 -0.13,0.51 -0.51,0.4 -0.43,0.08 -0.57,0.53 -0.32,0.06 -0.18,0.53 0,0 -0.8,-0.1 -0.53,-0.57 -0.47,-0.23 -0.85,-0.2 -0.3,0.2 -0.31,-0.13 -0.07,-0.24 0.22,-0.16 -0.26,-0.39 -0.51,-0.38 -0.32,0.02 -0.28,0.25 -0.4,-0.31 -0.05,-0.18 0.24,-0.34 -1.59,-1.74 -3.14,-2.08 -2.64,-0.97 0.06,-0.25 -0.6,-0.82 -0.99,-0.72 -0.14,-0.34 -3.57,-2.69 -0.77,-0.73 -4.55,-3.28 -0.18,-0.22 0.03,-1.06 0.42,-0.11 0.04,-0.27 -0.87,-1.73 -0.26,-1.61 -2.22,-1.8 -2.02,-1.22 -1.24,-0.49 0.06,-0.32 -5.58,-4.03 -1.47,-1.88 0.09,-0.24 -0.22,-0.51 -0.37,-0.26 -0.19,-0.73 -0.33,-0.22 -1.2,-1.78 -1.2,-2.9 -3.21,-1.8 -1.13,-1.59 -0.85,-0.8 0,0 1.61,-1.11 0.42,-0.44 1.09,-0.44 0.74,-0.56 0.8,-0.97 0,0 0.01,-0.02 0,0 4.71,2.96 -0.33,1.97 0.17,0.12 0.28,-0.48 0.44,-0.08 0.29,0.2 0.56,-0.16 0.12,-0.29 0.37,0.04 0.44,0.69 1.46,1.57 0.4,0.16 0.2,0.36 0.33,0.08 0.48,0.48 0.69,0.2 1.34,-0.16 0.84,0.52 0.47,0.12 0,0 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-ja"
    aria-label="Jambi"
    d="m 160.60571,155.64789 -1.28,-0.52 -0.54,0.11 -0.32,0.16 -0.16,0.27 0.1,0.75 -0.32,0.43 -1.02,0.27 -0.97,-0.11 -0.92,0.43 -1.35,0.32 -1.08,-0.27 -0.75,0 -0.5,0.18 -1.01,-0.52 -0.45,-0.08 -0.72,0.36 -0.29,0.52 -1.66,0.08 -2.18,0.81 -1.09,0.96 0,0.81 -0.2,0.76 0.08,0.32 -0.2,0.4 0,1.33 0.56,0.48 -0.69,0.48 -1.09,0.28 -0.08,0.41 0.2,1.56 -0.2,0.21 0.12,0.76 -0.16,0.04 -0.2,-0.36 -0.53,-0.12 -0.36,-0.65 -0.81,-0.44 -0.16,-0.44 -0.65,-0.56 -0.08,-0.77 -0.32,-0.36 -0.49,-0.08 -0.28,0.24 -0.16,0.44 -0.33,0.12 -0.2,0.29 -0.24,0.6 0.69,0.68 0.16,0.73 -1.54,0.6 -1.13,-0.36 -0.08,-0.24 -0.2,-0.04 -0.29,0.52 -1.9,-0.32 -0.72,-0.28 -0.57,0.84 0.61,1 -0.49,0.37 -1.05,1.77 -0.45,0.36 -0.28,0.04 -0.28,-0.16 -0.93,0.76 -0.77,0.32 -0.2,0.2 0,0.32 -0.61,0.65 -0.48,-0.2 -0.41,0.08 -0.6,0.44 -0.09,-0.16 -0.76,0 -0.69,-0.16 -0.57,-0.56 -0.52,-0.29 -0.2,0.2 -0.29,0 -0.85,-0.52 -0.56,0.24 -0.08,0.73 -0.41,0.44 -0.81,0.12 -0.2,0.2 -0.61,0.16 -0.4,0.73 0,0 -0.57,-0.17 0,0 -0.47,-0.12 -0.84,-0.52 -1.34,0.16 -0.69,-0.2 -0.48,-0.48 -0.33,-0.08 -0.2,-0.36 -0.4,-0.16 -1.46,-1.57 -0.44,-0.69 -0.37,-0.04 -0.12,0.29 -0.56,0.16 -0.29,-0.2 -0.44,0.08 -0.28,0.48 -0.17,-0.12 0.33,-1.97 -4.71,-2.96 0,0 0.23,-0.51 0,0 -0.18,-1.65 -0.56,-1.67 -0.39,-0.74 -0.71,-0.32 -0.35,-0.41 -0.15,-0.5 -0.47,-0.5 -0.15,-0.41 -0.21,-3.65 0.18,-0.03 0.5,0.36 0.18,-0.36 0.15,-0.03 0.68,0.71 0.56,-0.35 1.06,0.03 0.54,-0.27 0.56,0.03 0.62,-0.18 0.38,0.36 1.01,-0.27 1.18,-1.79 2.01,-1.23 0.62,-1.12 0,-0.23 -0.41,-0.35 0,-0.21 0.41,-0.47 -0.41,-1.62 0.62,-0.61 0.62,0.03 0.33,-0.24 0.62,-0.15 0.82,-1.02 0.3,-0.86 -0.12,-0.08 -0.35,0.26 -0.53,-0.44 0.11,-0.76 -0.14,-0.12 -0.03,-1 0,0 -0.03,-0.02 0,0 0.6,0.1 0.04,-0.31 0.8,-0.18 0.18,-0.62 0.59,-0.29 0.24,0.21 0.11,-0.35 0.47,-0.27 0.4,0.06 0.45,0.33 0.41,-0.16 0.93,0.45 0.37,-0.33 0.39,0.04 0.41,0.35 0,0.31 0.2,0.14 0.39,-0.04 0.86,-0.49 0.57,-0.04 0.3,0.76 1,0.51 -0.04,0.64 1.22,0.12 0.47,0.76 0.77,0.02 0.8,0.33 0.67,-0.09 0.61,0.42 0.29,-0.05 0.51,-0.61 0.69,-0.08 0.53,-0.86 0.47,-0.44 0.1,-0.36 2.1,-1.5 0.85,-0.97 0.86,-1.35 1.18,0.08 0.85,-0.22 3.61,0.63 0.39,0.31 0.85,-0.47 1.18,-0.11 0,0 0.42,0.43 0.79,0.36 0.89,1.1 0.9,0.73 1,0.42 0.63,0.52 1.1,0.26 0.53,0.37 0.84,-0.37 -0.03,0.11 1.22,-0.26 2.65,0.75 1.91,0.74 2.21,-0.75 0.4,0.07 0.75,1.74 -0.31,1.44 0.25,0.82 0.71,1.17 0.12,1.06 -0.3,1.95 0.44,1.86 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-kr"
    aria-label="Kepulauan Riau"
    d="m 160.44571,132.93789 0.12,0.27 0.76,0.22 0.12,0.44 0.59,0.93 0.42,0.32 -0.07,0.24 -1.03,0.83 -0.39,0.81 -0.15,1.08 -0.12,0.1 -0.42,-0.1 -0.66,-0.88 -0.2,0 -0.49,0.2 -0.15,1.27 -0.49,0.2 -0.22,-0.29 -0.12,-1 -0.37,-1.22 -0.64,-0.29 -0.54,-0.61 0.22,-0.86 0.25,-0.32 -0.02,-0.34 0.62,-0.07 0.12,-0.15 0.07,-0.78 0.22,0.76 -0.44,0.42 0.42,0.64 0.17,-0.15 -0.02,-0.71 0.12,-0.05 0.25,0.27 0.62,0.05 0.49,-0.32 0,-0.59 0.17,-0.2 0.62,-0.2 0.17,0.08 z m 5.26,-2.37 0.15,0.1 0.37,-0.1 -0.02,-0.9 0.25,-0.2 1.18,1.59 0.94,0.76 0.76,0.07 0.07,0.44 -0.3,0.05 -1.16,-0.49 -0.29,0.27 0.44,0.51 -0.12,0.24 -0.91,-0.46 -0.39,0.12 -0.91,-0.66 0.05,-0.22 -0.15,-0.12 -0.37,0.05 -0.3,-0.54 -0.81,-0.44 -0.89,0.15 -0.89,0.61 -0.54,-0.1 -0.66,0.51 -0.37,-0.15 -0.15,-0.44 -0.71,0.15 -0.49,-0.24 -0.05,-0.22 0.02,-0.64 0.69,-0.51 0.1,-0.22 0.59,-0.22 -0.17,-2.27 0.81,-0.37 1.03,0.51 0.64,0.56 0.54,0.81 0.25,0.02 0.25,0.49 0.62,0.49 0.02,0.42 0.2,0.29 0.68,0.3 z m -6.92,-6.01 0.17,0.22 0.07,-0.44 0.25,0.12 0.27,-0.07 1.92,2.05 -0.44,0.15 -0.15,-0.1 -0.39,0.37 -0.49,-0.29 -1.28,-1.42 -0.91,-1.56 0.22,0.05 0.76,0.92 z m 2.41,-1.54 1.75,2.15 0.76,0.78 0.57,0.32 0.1,0.27 -0.17,0.29 -0.66,-0.32 -0.62,-0.61 -0.94,-0.61 -0.89,-1.22 -0.74,-0.61 -0.02,-0.51 0.62,0.15 0.05,-0.2 0.19,0.12 z m -2.01,-1.59 0.57,0.39 -0.05,0.1 -0.44,-0.07 -0.07,0.15 0.25,0.07 0.1,0.27 -0.25,0.07 -0.62,-0.42 0.07,0.27 -0.2,0.07 -0.25,0.39 -0.3,-0.07 -0.47,-0.83 -0.22,0.07 -0.07,-0.64 0.07,-0.17 0.47,0.42 0.17,-0.05 0.07,-0.44 -0.44,-0.22 -0.22,-0.32 0.32,0.05 1.51,0.91 z m -2.39,-7.91 -0.2,0.39 0.02,0.44 0.7,0.53 -0.33,0.06 -0.47,0.28 0.93,0.18 0.07,-0.32 0.39,0.29 -0.2,0.29 -0.64,-0.15 0,0.93 -0.12,0.1 -0.57,-0.46 -1.3,-2.2 0.02,-0.17 0.49,-0.12 0.29,-0.03 0.64,-0.2 0.28,0.16 z m -6.01,0.42 -0.1,0.17 -0.47,-0.64 -1.06,-0.9 -0.22,-0.37 -0.07,-0.56 0.98,0.39 0.66,0.61 0.12,0.42 0.42,0.51 -0.1,0.29 -0.16,0.08 z m -1.5,-0.25 -0.22,0.49 -0.17,-0.42 -0.37,-0.05 -0.84,-0.56 -0.47,-0.78 0,-0.42 0.27,-0.02 0.32,-0.42 1.13,1.27 0.35,0.91 z m -6.18,-1.89 0.11,0.64 1.14,1.32 -0.2,0.35 -0.98,-0.75 0.41,0.72 -0.17,0.79 0.31,0.37 -0.39,0.97 -0.17,0.17 -0.35,0.04 -0.24,-0.37 -0.15,0.13 -0.57,-0.18 -0.31,-0.64 -0.61,-0.7 -0.18,-1.8 0.33,-0.48 0.04,-0.73 0.54,0.13 0.22,0.31 -0.11,-0.55 0.13,-0.44 -0.11,-0.13 0.55,-0.42 0.5,0.07 0.17,0.27 0.09,0.91 z m 11.06,-1.01 0.32,0.1 0.15,-0.44 0.42,-0.05 0.32,0.39 -0.15,0.51 -0.3,0.07 0.1,0.51 0.42,0.15 0.37,-0.07 0.79,0.34 0,0.2 -0.32,0.37 -0.96,0.65 -0.35,0.03 -0.37,-1.2 -0.66,-0.32 -0.25,0.1 -0.02,-0.95 -0.2,-0.17 -0.34,0.32 -0.27,-0.24 0.17,-0.66 0.49,-0.1 0.59,0.27 0.05,0.19 z m -5.47,-0.3 -0.2,0 -0.71,-0.78 0,-0.32 0.42,-0.34 0.49,0.49 0,0.95 z m 1.18,-1.93 -0.05,0.27 0.32,0.37 0.25,0.22 0.27,0.27 1.23,0.66 0.05,0.49 -0.3,-0.07 -0.12,0.17 -0.12,0.2 0.1,0.39 -0.15,0.15 -0.22,0 -0.49,-0.61 -0.74,-0.24 -0.66,-0.51 0,-0.56 0.2,-0.22 -0.64,-0.61 0.12,-0.29 0.34,0.17 0.37,-0.24 0,-0.49 0.17,0.1 0.07,0.38 z m -8.03,-1.12 0.06,0.17 -0.13,0.07 -0.35,-0.11 -0.06,0.75 0.26,0.6 0.35,0.06 0.5,1.12 -0.87,-0.04 -0.09,-0.22 -0.59,-0.07 -0.72,-0.53 -0.02,-0.77 0.18,-0.13 0.13,-0.48 0.7,-0.2 0.33,-0.57 0.32,0.35 z m 12.78,-0.03 0.05,0.49 -0.22,0.22 0,1.2 -0.74,0.05 -0.17,0.44 0.2,0.44 -0.84,-0.22 -0.25,0.22 -0.49,-0.15 -0.15,-0.24 -0.76,-0.08 -0.71,-0.46 -0.32,-1.03 0.05,-0.27 0.4,-0.06 -0.08,0.55 0.37,-0.02 -0.07,-0.71 -0.17,-0.07 -0.02,-0.27 1.21,0.12 0.17,-0.81 0.37,-0.07 0.57,0.71 0.34,0.1 0.17,-0.24 -0.25,-0.17 0,-0.34 0.57,-0.24 0.44,0.37 0.33,0.54 z m 7.46,-0.54 0.15,0.66 0.74,0.44 0.47,1.2 -0.25,1.22 0.07,0.39 0.2,0.2 0,0.42 -0.27,0.07 0,0.24 0.25,0.12 0.62,-0.07 -0.12,0.51 -0.76,1.03 -0.57,-0.24 -0.96,0.02 -0.57,-0.2 -0.76,-0.66 -0.25,0.1 -0.69,-0.17 0.02,-0.17 0.69,-0.17 -0.47,-0.42 0.1,-0.27 -0.12,-0.17 -0.44,-0.37 0.22,-0.34 0.57,0.05 -0.2,-0.44 0.42,-0.51 -0.44,-0.42 -0.79,0.42 0.02,0.56 -0.17,0.15 -0.3,0 0.05,-0.37 -0.47,-0.17 -0.17,0.37 -0.22,0.12 -1.18,-0.07 -0.37,-0.32 -0.27,-0.61 -0.12,-0.44 0.52,-0.76 1.5,-0.24 -0.27,-0.76 0.39,-0.17 0.71,0.15 0.1,-0.2 0.39,-0.15 1.13,0.46 0.62,0.02 0.59,-0.37 0.2,-0.51 0.42,-0.12 0.15,0.1 -0.11,0.86 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-la"
    aria-label="Lampung"
    d="m 148.27571,209.52789 0.65,-0.05 0.05,0.51 0.43,0.03 0.38,0.48 0,0.54 -0.43,0.4 0,0.21 0.35,0.03 0.75,0.7 0.3,-0.35 0.16,-0.89 0.51,0.38 1.4,-0.16 0.24,-0.21 0.19,0.05 0.08,0.24 0.91,0.27 1,-0.54 0.13,-0.38 0.38,-0.08 0.46,0.27 0.4,0 0.3,-0.19 0.4,0.38 0.35,-0.11 0.73,-0.94 0.03,-0.35 -0.11,-0.35 -0.67,-0.62 -0.05,-0.83 -0.54,-0.32 0.27,-0.78 0.65,-0.64 -0.3,-2.71 0.27,-0.83 0.27,-0.08 0.08,-0.38 0.8,-0.56 0.51,-0.59 0.62,0.05 0.62,-0.51 1.21,-0.48 0.67,-0.56 0.4,0.51 0.22,0.05 2.21,0.11 1.48,-0.24 0.08,-0.35 1.13,-0.56 0.62,-0.24 0.62,0.03 0.38,-0.51 0.62,-0.43 0.32,-0.96 0.3,-0.32 0.38,-0.05 -0.3,-0.35 0.43,-0.43 0.27,-1.07 0.22,0.13 0.16,-0.08 0.11,-0.51 0.54,-0.27 0.67,0.24 0.7,-0.64 0.22,-0.48 -0.27,-0.62 0.4,-0.32 0.11,-0.56 0.35,-0.46 0.22,0.13 0.3,1.07 0.32,-0.24 0.54,-0.11 0.32,0.08 0.11,0.72 0.78,-0.05 0.19,0.27 0.59,0 -0.13,0.8 0.13,0.16 0.4,-0.16 0.35,0.27 -0.05,0.46 0.24,0.19 0.32,-0.19 0.11,0.08 0.11,0.32 -0.38,0 0.46,0.38 0,0.24 0.3,0.32 -0.4,0.54 -0.05,0.29 0.24,0.05 0,-0.27 0.24,0.13 0.46,-0.05 0.08,0.05 -0.3,0.29 0,0.24 0.65,0 0.03,0.24 0.27,0.11 -0.11,0.46 0.19,0.13 0.75,0.08 0.3,-0.13 0.05,-0.27 0.22,-0.05 0.51,0.27 0.29,0.55 0,0 -0.19,2.7 1.46,2.41 0.05,0.33 0,1.25 -0.34,0.83 0.02,0.35 0.49,0.48 -0.6,1.22 -0.36,1.87 0.18,0.86 0.49,0.62 0.11,0.38 -0.04,0.22 -0.49,0.26 -0.27,1.24 0.15,3.61 -0.15,0.53 -0.49,0.33 -0.13,0.53 0.09,2.17 -0.17,1.61 0.21,0.73 -0.58,2.13 0.07,1.18 -0.36,1.05 -0.79,1.12 -0.27,0.11 -0.16,-0.97 -1.66,-0.22 -0.35,-0.27 -0.2,-0.51 0.02,-0.51 0.18,-0.34 -0.09,-0.23 -0.58,-0.55 -0.53,0 -0.2,-0.24 -1.38,-0.77 -0.83,-0.78 -0.27,-0.71 -1.16,-1.73 -0.33,-0.07 -0.35,0.15 -0.16,0.31 0,1.77 -0.13,0.27 -0.73,-0.25 -0.6,0.41 0.39,0.49 0.01,0.32 0.32,-0.01 -0.48,0.34 0.2,0.22 0.01,0.35 0.43,0.31 -0.09,0.12 -0.63,0.01 -0.37,0.4 0.26,0.46 0.75,-0.08 -0.51,0.53 -0.57,0.1 -1.68,-0.92 -1.68,-0.7 -3.02,-1.91 -0.74,-0.58 -0.79,-0.96 -0.56,0.02 -1.04,-0.31 -0.86,0.4 -0.46,0.4 0.41,0.26 0.13,0.58 1.01,1.21 0.37,0.25 0.29,0.53 -0.02,0.35 -0.16,0.11 1.18,1.77 -0.11,0.29 0.44,1.17 -0.09,0.2 -2.48,0.13 -0.37,-0.21 -0.08,-0.23 0.31,-0.16 -0.18,-0.73 -2.12,-1.93 -0.41,-0.72 -0.84,-0.62 -1.18,-0.55 0.33,-0.46 -0.94,-1.15 -2.96,-2.09 -1.48,-1.71 -0.12,-1.03 -0.32,-0.3 -1.31,-0.29 -0.04,-0.42 0.53,-0.55 -0.16,-0.49 -0.4,-0.47 -0.24,-0.23 -0.36,0.02 -0.47,-0.62 -1,-0.75 -0.31,0 -0.02,0.2 -0.18,0.04 -0.18,-0.11 0.07,-0.71 -0.78,-0.66 -0.71,0.04 -0.64,-0.55 -0.53,-0.13 0,0 0.18,-0.53 0.32,-0.05 0.57,-0.54 0.43,-0.08 0.51,-0.4 0.13,-0.51 0.81,0.05 0.11,-0.11 0,0 0.12,-0.06 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-ri"
    aria-label="Riau"
    d="m 137.97571,118.32789 -0.59,-0.17 -0.31,-0.8 0.47,-1.73 0.52,-0.54 0.51,-0.12 0.81,0.67 0.38,0.56 0.13,1.39 -0.4,0.36 -1.52,0.38 z m -9.7,-8.36 0.39,0.06 1.17,-0.4 0.79,0.06 2.84,1.65 1.82,1.37 0.21,0.32 0.18,0.77 -0.25,1.05 -0.55,0.3 -1.23,-1.23 -1.06,-0.49 -3.49,-0.1 -1.69,0.45 -0.53,-0.03 -1.1,-0.55 -1.28,-1.23 0.53,-0.8 0.86,-0.12 0.19,-0.16 0,-0.74 -0.52,-1.13 0.05,-0.99 0.29,-0.42 0.61,-0.11 0.57,0.26 1.04,1.34 -0.17,0.47 0.33,0.4 z m 7.14,-0.75 2.22,2.51 0.06,0.52 -0.35,0.39 -0.62,0.15 -0.49,-0.1 -2.44,-1.71 -3.16,-1.62 -0.59,-0.09 -0.6,0.19 -0.6,-0.53 0.95,-1.65 0.51,-0.2 0.71,0 1.46,0.43 1.54,0.72 1.4,0.99 z m -11.06,1.94 -0.42,0 -1.53,-1.44 -0.36,-0.35 -0.43,-0.81 -0.65,-3.48 0.04,-1.92 0.11,-0.22 0.83,-0.18 0.52,0.13 2.96,2.65 0.28,0.46 0.02,0.33 -0.56,1.71 0.06,1.07 0.35,1.12 -0.06,0.28 -1.16,0.65 z m 1.69,-8.98 0.17,2.88 -0.24,0.35 -0.52,-0.24 -2.64,-2.52 -0.81,-0.26 -1.98,-0.16 -0.82,-0.36 -0.96,-0.93 -0.88,-1.490005 0.27,-0.22 0.81,-0.04 1.85,0.75 2.93,0.400005 1.78,0.47 0.75,0.43 0.29,0.94 z m -15.46,-4.500005 -0.79,-0.03 -1.1,-0.31 -0.38,-0.21 -0.39,-0.5 -0.93,-2.49 0.08,-1.32 0.19,-0.69 0.55,-0.52 3.47,-0.99 0.65,0.18 0.34,0.31 1.26,1.7 0.05,0.89 -0.76,0.97 0.01,1.35 -0.24,0.47 -1.28,0.99 -0.73,0.2 z m -16.92,-7.07 0.82,-0.13 0.95,0.59 0.75,0.15 0.51,-0.39 -1.14,-0.71 -0.32,-0.63 -0.08,-0.78 0.2,-0.39 0.95,-0.55 2.4,-0.27 2.46,0.31 -0.12,0.51 0.35,0.77 3.45,2.31 0.74,0.79 0.26,0.81 0.02,1.34 0.72,2.11 0.68,1.09 2.34,1.09 0.75,0.06 1.72,-0.42 1.21,0.33 4.51,3.780005 2.02,1.07 1.09,3.06 -0.19,1.73 0.4,1.37 0.43,0.63 3.29,3.1 0.69,0.5 1.38,0.63 0.52,0.07 2.4,-0.22 2.61,0.16 0.69,0.26 0.48,0.37 2.56,3.08 0.18,0.53 -0.15,0.67 -8.84,4.63 -0.71,-0.37 -0.73,-0.82 -1,0.01 1.9,1.34 0.82,0.24 1.24,-1.12 4.24,-0.78 4.47,-2.52 0.27,-0.2 0.72,-1.14 2.26,-0.84 0.56,0.06 1.16,0.56 5,3.76 0.26,0.56 0.98,4.33 -0.63,0.23 -2.97,0.18 -0.28,0.39 -0.11,0.91 -2.66,1.83 0.17,0.28 0.32,-0.05 0.68,-0.57 0.68,-0.16 0.58,0.05 0.05,0.16 -0.37,0.47 1.63,0.21 0.05,0.21 1.63,0.52 0.89,1.31 -0.63,-0.1 -0.89,0.16 -1.68,0.73 -0.21,0.21 0.16,0.26 -0.3,0.66 -2.63,1.75 -0.38,2.14 0.1,0.42 1,0.98 0,0 -1.18,0.12 -0.84,0.47 -0.39,-0.31 -3.61,-0.62 -0.84,0.21 -1.18,-0.08 -0.86,1.35 -0.84,0.98 -2.1,1.5 -0.1,0.35 -0.47,0.45 -0.53,0.86 -0.69,0.08 -0.51,0.6 -0.29,0.06 -0.61,-0.43 -0.67,0.1 -0.81,-0.33 -0.77,-0.02 -0.47,-0.76 -1.22,-0.12 0.04,-0.64 -1,-0.51 -0.29,-0.76 -0.57,0.04 -0.86,0.49 -0.39,0.04 -0.2,-0.14 0,-0.31 -0.41,-0.35 -0.39,-0.04 -0.37,0.33 -0.92,-0.45 -0.41,0.16 -0.45,-0.33 -0.39,-0.06 -0.47,0.27 -0.12,0.35 -0.24,-0.21 -0.59,0.29 -0.18,0.62 -0.81,0.18 -0.04,0.31 -0.6,-0.1 0,0 -0.21,-0.13 0,0 -0.89,0 -0.5,-0.32 -1.27,-0.35 0.03,-0.29 -0.35,-0.18 -0.65,-0.88 -1.12,-0.68 -0.44,-0.03 -0.24,-0.35 -1.45,-0.88 -0.09,-0.56 -0.53,-0.12 -0.38,-0.29 0.18,-0.32 -0.09,-0.09 -1.71,-0.61 -0.44,-0.56 -0.65,-0.26 -0.12,-0.41 -1.12,-0.47 -0.35,-0.41 -0.24,0.06 -0.3,-0.15 -0.71,-1.53 0.18,-0.38 0.03,-0.68 -0.8,-0.59 -0.43,-0.07 -0.86,0.26 -0.09,0.15 0.15,0.09 -0.27,0.5 -0.56,-0.44 -0.47,-0.03 -0.21,-0.32 -0.06,-0.62 -0.53,-0.29 -0.33,-0.5 0,0 -0.12,-0.35 0.12,-0.44 0,0 -0.53,-0.91 -0.03,-0.24 0.18,-0.18 -0.27,-0.88 0.03,-0.35 0.47,-0.38 0.21,-0.03 0.33,0.47 0.59,-1.03 0.09,-0.85 -0.38,-0.94 0,-0.48 0.27,-0.85 -0.38,-1 -0.18,-0.24 -0.35,-0.09 -0.65,0.23 -1.09,0.94 -0.24,0.38 -1.09,-0.03 -2.84,-0.79 -0.77,-1.73 -0.38,-0.26 -0.38,-0.15 -0.92,0.47 -0.27,0 -0.15,-0.44 0,-1.15 -1.27,-2.64 0.09,-0.94 0.83,-1.29 -0.47,-0.73 -1.06,-0.43 0,0 -0.87,-1.02 0.28,-0.2 -0.12,-0.23 0.12,-0.9 -0.43,0.04 -0.43,-0.47 0,-0.23 0.75,-0.04 0.24,-0.27 0.16,-0.63 -0.35,-1.02 -0.39,-0.16 0.04,-0.43 0.55,-0.31 0.63,-0.08 -0.08,-0.31 -0.59,-0.43 -0.28,-0.51 -0.2,-1.59 -0.51,-0.94 -0.24,0.04 -0.24,-0.24 -0.04,-0.39 0.39,-0.27 3,-0.16 0,-0.35 0.47,-0.12 0.59,0.12 0.28,-0.16 0.04,-0.39 0.79,0 0.83,-0.71 0.12,-0.47 -0.24,-0.23 0.08,-0.39 0.43,-0.710005 0.08,-0.47 -0.16,-0.31 0.12,-0.39 -0.08,-0.31 -0.59,-0.12 0.04,-0.43 0.27,-0.28 -0.24,-0.78 -1.89,-0.35 -0.28,-0.31 0,-0.39 0.47,-1.25 0.24,-2.98 0.51,-1.72 -0.16,-0.94 -0.71,-1.57 -0.16,-1.33 0.04,-0.67 0.35,-1.25 0.82,2.5 0.57,1.2 1.34,1.39 1.53,1.19 0.92,0.49 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-sb"
    aria-label="Sumatera Barat"
    d="m 90.89571,179.85789 -0.03,0.6 0.27,0.53 -0.07,0.2 -1,0.13 -0.47,0.23 1.37,2.66 0.03,0.23 -0.4,0.27 -0.3,-0.17 -0.3,-0.66 -0.2,0.03 -0.43,-0.33 0.2,-0.17 -0.2,-0.33 -0.77,-0.27 0.17,-0.7 -0.2,-0.46 0.07,-0.6 -0.6,-0.8 -0.6,0.07 -0.67,-0.8 -0.67,-1.23 -0.03,-0.23 0.3,-0.6 -0.47,-1.92 0.07,-0.3 1.03,-0.37 1.37,1.73 0.9,0.53 1.2,1.53 0.5,0.37 -0.07,0.83 z m -5.5,-4.42 -0.03,0.4 -1,0 -0.07,0.17 -0.53,-0.46 -0.17,0.5 -0.23,0.13 -0.43,-0.37 0.13,-0.33 -0.37,-0.4 0.3,-0.96 0,-0.93 -0.37,-0.8 0.03,-0.56 -0.47,-0.3 0.27,-0.33 -0.1,-0.8 0.23,-0.33 0.5,0.1 0.73,1.03 1.03,0.63 0.3,0.43 0.7,0.3 0.47,1.06 0.37,0.4 -0.17,0.76 -0.63,0.23 -0.49,0.43 z m -7.48,-11.39 0.67,1.36 0.5,0.53 0.07,0.37 0.6,0.33 0.43,0.7 0.33,0.73 0,0.23 -0.17,0.13 -0.2,-0.07 0.03,-0.36 -0.2,-0.3 -0.23,0.2 -0.37,0 -0.23,-0.5 -0.8,0 -0.97,-0.83 -0.5,-0.2 -0.87,0.1 -0.27,-0.83 -0.27,-0.13 -0.73,-1.23 0.03,-0.23 0.23,-0.17 0.4,0.23 0.07,-0.13 -0.3,-0.4 -0.13,-0.9 0.17,-0.36 0.53,-0.43 0.6,0 1.33,1.13 0.25,1.03 z m -13.5,-20.57 0.33,0.99 -0.2,0.07 -0.2,-0.5 -0.13,0.1 0.4,1.29 1,0.8 0.1,0.76 0.63,0.76 0.03,0.4 0.43,0.7 -0.13,0.3 0.57,0.66 0.03,0.63 1.03,0.99 0.13,0.33 0.1,0.7 -0.27,-0.23 -0.33,0.03 0.4,0.53 0.73,0.27 0.1,0.27 -0.1,0.43 0.4,0.99 0.67,-0.23 0.47,0.66 0.1,1.46 -0.33,0.5 -0.6,-1.16 -0.13,0.03 0.2,0.99 0.27,0.56 -0.43,0.4 -0.37,-0.3 -0.77,-0.03 -0.43,0.13 -0.07,0.3 -0.57,0.1 -4.1,-2.22 -0.2,-0.56 -0.6,-0.53 0.2,-0.1 0,-0.23 -0.63,-1.23 -2.67,-3.94 -0.23,-0.66 -0.4,-0.23 -0.17,-0.3 -0.1,-0.43 0.37,-0.4 0.8,-2.15 -0.03,-1.06 0.63,-0.66 0.4,-0.1 0.43,0.2 1.13,-0.1 0.8,-0.3 0.67,-0.5 0.23,0.03 0.41,0.79 z m 16.52,-31.94 0.39,0.35 0.67,-0.12 0.32,0.71 1.3,0.47 0.28,0.35 2.13,0.71 -0.2,-0.15 0,0 1.06,0.43 0.47,0.73 -0.83,1.29 -0.09,0.94 1.27,2.64 0,1.15 0.15,0.44 0.27,0 0.92,-0.47 0.38,0.15 0.38,0.26 0.77,1.73 2.84,0.79 1.09,0.03 0.24,-0.38 1.09,-0.94 0.65,-0.23 0.35,0.09 0.18,0.24 0.38,1 -0.27,0.85 0,0.48 0.38,0.94 -0.09,0.85 -0.59,1.03 -0.33,-0.47 -0.21,0.03 -0.47,0.38 -0.03,0.35 0.27,0.88 -0.18,0.18 0.03,0.24 0.53,0.91 0,0 -0.12,0.29 0.12,0.5 0,0 0.33,0.5 0.53,0.29 0.06,0.62 0.21,0.32 0.47,0.03 0.56,0.44 0.27,-0.5 -0.15,-0.09 0.09,-0.15 0.86,-0.26 0.38,0.06 0.8,0.59 -0.03,0.68 -0.18,0.38 0.71,1.53 0.3,0.15 0.24,-0.06 0.35,0.41 1.12,0.47 0.12,0.41 0.65,0.26 0.44,0.56 1.71,0.61 0.09,0.09 -0.18,0.32 0.38,0.29 0.53,0.12 0.09,0.56 1.45,0.88 0.24,0.35 0.44,0.03 1.12,0.68 0.65,0.88 0.35,0.18 -0.03,0.29 1.27,0.35 0.5,0.32 0.89,0 0,0 0.24,0.15 0,0 0.03,1 0.15,0.12 -0.12,0.76 0.53,0.44 0.35,-0.26 0.12,0.09 -0.3,0.85 -0.83,1.03 -0.62,0.15 -0.33,0.24 -0.62,-0.03 -0.62,0.62 0.06,0.56 0.35,0.82 0,0.23 -0.41,0.47 0,0.21 0.41,0.35 0,0.23 -0.62,1.11 -2.01,1.23 -1.18,1.79 -1,0.26 -0.38,-0.35 -0.62,0.18 -0.56,-0.03 -0.53,0.26 -1.06,-0.03 -0.56,0.35 -0.68,-0.71 -0.15,0.03 -0.18,0.35 -0.5,-0.35 -0.18,0.03 0.21,3.64 0.15,0.41 0.47,0.5 0.15,0.5 0.35,0.41 0.71,0.32 0.38,0.73 0.56,1.68 0.18,1.65 0,0 -0.24,0.53 0,0 -0.8,0.97 -0.74,0.56 -1.09,0.44 -0.41,0.44 -1.61,1.11 0,0 -0.28,-0.54 -2,-2.21 -0.4,-1.59 -0.84,-1.17 0.04,-0.46 0.74,-0.67 0.3,-0.59 0.01,-1.18 -0.45,-1.67 -1.99,-2.86 -1.44,-1.76 -0.9,-2.38 -0.76,-0.78 0.36,-0.56 0.05,-0.6 -0.43,-0.98 -0.4,-0.27 -0.75,-0.1 -0.8,-0.75 -0.4,0.29 -0.38,-0.11 0.13,-0.62 0.44,0.07 -0.29,-0.67 -0.38,-0.11 -0.55,-0.84 -0.02,-0.29 0.33,-0.02 -0.33,-0.73 0.3,-0.35 0,-0.32 -0.55,-1.55 -0.26,-1.39 -0.28,-0.54 -0.44,-0.62 -2.83,-2.81 -0.72,-1.41 -0.66,-0.87 -2.3,-1.89 0,-0.23 -0.49,-0.71 -1.13,-0.68 -0.38,-0.84 0,-0.53 -0.69,-1.17 -0.22,-0.14 0.22,-0.66 -0.14,-0.36 0.19,-0.32 -0.58,-0.87 -0.9,-0.61 -0.58,-0.62 -1.35,-0.73 -2.28,-0.95 -0.69,-0.15 -0.42,-0.93 -0.36,-0.35 -0.8,-0.1 -1.11,0.41 -1.18,-0.42 0.93,-1.39 0.75,-0.35 0.79,-0.08 0.63,-0.78 0.87,-1.61 0.47,-0.12 1.22,-0.78 1.06,0.43 1.46,-0.51 0.51,0.67 0.08,0.39 0.63,0.47 0.83,-0.43 0.28,-0.04 0.51,0.12 0.12,0.2 0.63,0.04 0.71,-0.12 0.51,-0.31 0.67,-0.82 0,-0.67 -0.67,-0.51 -0.08,-1.17 -0.63,-0.24 -0.63,0 -0.28,-0.78 0,-0.31 0.28,-0.31 -0.08,-2.08 0.59,-0.35 0.28,0.02 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-ss"
    aria-label="Sumatera Selatan"
    d="m 148.22571,209.55789 0.08,-0.33 -0.36,-0.6 -0.4,-0.02 -0.62,-0.29 -0.36,0.09 0.39,-0.49 -0.18,-0.88 -0.3,-0.42 -0.64,-0.5 -0.78,-0.04 0.71,-0.62 -1.09,-1.04 0.26,-0.52 0.57,-0.54 -0.01,-0.57 -0.31,-0.65 -0.56,-0.18 -0.98,0.36 -0.55,-0.3 -0.34,-0.61 -0.4,0.09 -0.57,-0.21 -0.73,-0.01 -0.73,-0.44 -0.49,-0.56 -1.91,-0.31 -0.01,-1.63 -0.46,-0.67 -0.5,-1.37 -0.4,-0.05 -0.29,-0.24 -0.94,0.14 -1.26,-0.06 -0.21,-0.12 -0.26,-0.51 -0.4,-0.16 -0.61,0.29 -0.76,-0.2 -0.68,-0.39 -0.85,-1.08 -0.89,-0.51 -0.17,-0.4 -0.4,-0.4 -0.67,-0.2 0.47,-0.18 0.23,-0.36 1.33,-0.47 0.12,-1.14 0.63,-0.76 0.49,-0.31 0.07,-1.45 0.16,-0.04 0.53,0.3 0.53,0.56 0.36,0.64 0.17,0.05 0.72,-0.74 0.32,-0.72 0.33,-0.09 0.03,-0.14 0.15,-0.93 -0.04,-0.83 0.18,-0.35 -0.21,-0.45 -0.79,-0.09 -0.82,0.32 -0.21,-0.2 -0.07,-0.56 0.16,-0.11 -0.56,0.25 -0.56,-0.26 -0.27,0.12 -0.29,-0.47 -0.03,-0.34 -0.25,-0.11 -0.9,0.56 -0.86,0.03 -0.79,0.56 -0.25,-0.25 -0.63,-0.1 -1.67,-1.52 0.2,-0.5 -0.23,-0.15 0.11,-1.22 -0.29,-0.74 -0.63,-0.58 -0.97,-0.22 -1.15,0.4 -0.47,-0.44 -0.62,-0.14 -0.4,-0.64 -0.3,-1.19 -0.44,-0.15 -0.13,-0.28 -0.88,-0.53 -0.14,-0.71 -0.85,-0.54 -0.21,-0.59 0,0 0.52,0.15 0,0 0.4,-0.73 0.61,-0.16 0.2,-0.2 0.81,-0.12 0.41,-0.44 0.08,-0.73 0.56,-0.24 0.85,0.52 0.29,0 0.2,-0.2 0.52,0.29 0.57,0.56 0.69,0.16 0.76,0 0.09,0.16 0.6,-0.44 0.41,-0.08 0.48,0.2 0.61,-0.65 0,-0.32 0.2,-0.2 0.77,-0.32 0.93,-0.76 0.28,0.16 0.28,-0.04 0.45,-0.36 1.05,-1.77 0.49,-0.37 -0.61,-1 0.57,-0.84 0.72,0.28 1.9,0.32 0.29,-0.52 0.2,0.04 0.08,0.24 1.13,0.36 1.54,-0.6 -0.16,-0.73 -0.69,-0.68 0.24,-0.6 0.2,-0.29 0.33,-0.12 0.16,-0.44 0.28,-0.24 0.49,0.08 0.32,0.36 0.08,0.77 0.65,0.56 0.16,0.44 0.81,0.44 0.36,0.65 0.53,0.12 0.2,0.36 0.16,-0.04 -0.12,-0.76 0.2,-0.21 -0.2,-1.56 0.08,-0.41 1.09,-0.28 0.69,-0.48 -0.56,-0.48 0,-1.33 0.2,-0.4 -0.08,-0.32 0.2,-0.76 0,-0.81 1.09,-0.96 2.18,-0.81 1.66,-0.08 0.29,-0.52 0.72,-0.36 0.45,0.08 1.01,0.52 0.5,-0.18 0.75,0 1.08,0.27 1.35,-0.32 0.92,-0.43 0.97,0.11 1.02,-0.27 0.32,-0.43 -0.1,-0.75 0.16,-0.27 0.32,-0.16 0.54,-0.11 1.28,0.52 0,0 0.64,0.99 0.16,0.9 -0.16,0.52 -0.48,0.38 -0.33,0.73 0,0.72 0.23,0.42 0.23,-0.09 0.49,-1.19 0.41,0.07 1.27,1.08 2.07,1.27 1.37,0.06 0.74,0.67 0.21,0.47 0.31,1.57 -0.05,0.47 -0.26,0.37 -0.43,0.1 -0.36,0.63 -0.32,-0.06 -0.59,0.48 -1.12,1.79 0.88,0.15 0.27,-0.15 1.03,-1.47 1.05,-0.23 0.44,0.8 1.13,0.06 0.49,0.38 1.53,0.39 1.48,-0.83 2.41,0.84 3.06,0.34 1.63,-0.02 0.28,0.6 -0.46,1.73 0.27,1.43 0.16,0.38 0.73,0.64 0.69,0.2 0.81,-0.03 0.34,0.16 0.21,0.62 -0.19,2 0.63,1.29 0.71,0.62 1.02,0.09 0.74,-0.2 0.3,0.06 0.8,0.34 0.44,0.4 0.15,0.97 -0.13,1.25 0.78,1.57 0,0.4 -0.31,0.42 -1.7,0.88 -1.11,1.16 -1.18,2.51 -0.34,1.12 -0.15,1.13 0.24,0.9 0.45,0.47 1.3,0.73 0.41,0.97 -0.21,0.85 -0.9,1.4 -0.61,1.28 -0.22,1.65 -0.28,0.36 0,0 -0.3,-0.55 -0.51,-0.27 -0.21,0.05 -0.06,0.27 -0.29,0.14 -0.76,-0.08 -0.18,-0.14 0.1,-0.45 -0.26,-0.11 -0.03,-0.24 -0.65,0 0,-0.24 0.3,-0.3 -0.08,-0.05 -0.46,0.05 -0.24,-0.13 0,0.27 -0.24,-0.06 0.05,-0.29 0.4,-0.54 -0.29,-0.32 0,-0.24 -0.46,-0.38 0.38,0 -0.11,-0.32 -0.11,-0.08 -0.32,0.19 -0.24,-0.19 0.05,-0.45 -0.35,-0.27 -0.19,0.16 -0.35,-0.16 0.14,-0.81 -0.6,0 -0.18,-0.26 -0.78,0.05 -0.11,-0.72 -0.32,-0.08 -0.54,0.1 -0.33,0.24 -0.29,-1.07 -0.22,-0.13 -0.35,0.45 -0.11,0.57 -0.4,0.32 0.27,0.61 -0.21,0.49 -0.7,0.64 -0.68,-0.24 -0.54,0.27 -0.1,0.51 -0.16,0.08 -0.22,-0.14 -0.27,1.07 -0.43,0.43 0.3,0.35 -0.38,0.05 -0.3,0.33 -0.32,0.96 -0.62,0.43 -0.37,0.51 -0.62,-0.03 -0.62,0.24 -1.13,0.57 -0.08,0.34 -1.48,0.25 -2.21,-0.11 -0.22,-0.05 -0.4,-0.51 -0.67,0.56 -1.21,0.48 -0.62,0.51 -0.62,-0.05 -0.51,0.59 -0.8,0.56 -0.08,0.38 -0.27,0.08 -0.27,0.83 0.3,2.7 -0.65,0.65 -0.27,0.77 0.54,0.33 0.06,0.83 0.67,0.61 0.11,0.35 -0.03,0.35 -0.73,0.94 -0.35,0.11 -0.4,-0.38 -0.3,0.19 -0.4,0 -0.46,-0.27 -0.37,0.08 -0.14,0.38 -1,0.53 -0.91,-0.26 -0.08,-0.25 -0.19,-0.05 -0.24,0.22 -1.4,0.16 -0.51,-0.38 -0.16,0.89 -0.3,0.35 -0.75,-0.7 -0.35,-0.03 0,-0.21 0.43,-0.41 0,-0.53 -0.38,-0.49 -0.43,-0.02 -0.05,-0.51 -0.65,0.05 0,0 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-su"
    aria-label="Sumatera Utara"
    d="m 55.59571,131.30789 0.42,0.04 0.71,0.82 0.52,0.91 0.04,0.51 -0.33,0.36 0.19,0.23 -0.15,0.8 0.11,0.46 -0.21,0.32 -0.25,0.09 0.36,0.76 -0.06,0.21 -0.21,0.11 -0.38,0.06 0.23,-0.63 -0.1,-0.13 -0.29,0.25 -0.33,-0.15 -0.23,0.08 -0.19,0.42 0.21,0.3 -0.1,0.25 -0.29,-0.4 -0.61,-0.42 -1.4,-0.48 0.59,-0.25 0.04,0.23 0.34,-0.02 0.21,-0.84 0.33,-0.23 -0.06,-1.16 0.21,-0.84 0.42,-0.36 0.44,-0.19 0.17,-0.42 -0.52,-0.72 0.17,0.03 z m -0.54,-4.25 0.1,0.23 0.32,-0.23 0,0.49 1.11,1.29 0.11,0.57 -0.13,0.36 0.27,0.53 -0.04,0.32 0.98,0.72 0.42,0.55 -0.08,0.91 -0.38,0.02 -0.06,0.23 0.27,0.61 -0.11,0.19 -0.5,-1.18 -0.29,-0.23 -0.99,-1.58 -0.25,-0.11 0,-0.4 -1.11,-1.37 0,-0.15 -0.32,-0.95 -0.96,-0.47 0.99,-0.46 0.65,0.11 z m 3.91,-3 1.02,0.1 0.51,-0.13 0.29,0.32 1.26,-0.25 1.04,0.99 -0.13,0.43 0.09,0.13 -0.41,0.08 -0.2,-0.21 -0.62,-0.1 -0.53,0.42 -0.38,0.05 -0.42,-0.18 -0.87,0.13 -0.9,-0.34 -0.89,-0.01 -0.32,-0.21 -0.11,-0.67 0.79,-0.54 0.66,-0.11 0.12,0.1 z m -18.92,-21.46 0.33,0.76 2.46,3.35 1.77,0.62 2.11,1.87 0.46,1.18 -0.7,1.61 -0.16,4.02 -0.28,0.5 -1.03,1.1 -1.93,-0.49 -0.34,-0.41 0.16,-0.31 -1.33,-3.39 -2.06,-2.14 -0.95,-0.05 -0.47,-0.21 -0.33,-0.97 -0.81,-1.55 -1.64,-2.7 -2.35,-2.29 0.75,-0.31 1.14,0.06 0.49,-0.13 1.39,-1.24 1.11,-0.23 1.49,0.54 0.72,0.81 z m 16.86,-4.050005 0.68,0.12 0.3,-0.51 0.43,0.25 0.39,0.69 -0.69,0.12 -1.27,-0.09 -0.71,-0.26 -0.19,-0.49 0.48,-0.63 0.59,0.25 0,0.55 z m -35.75,-11.74 -1.73,-0.16 -0.31,-0.19 -0.3,-1 -4.1,-2.69 -3.14,-1.12 -1.02,-0.19 -2.0199995,-1.93 -0.18,-0.6 0.09,-0.29 1.6199995,-2.03 1.61,0.31 1.96,2.43 0.57,0.26 1.24,0.18 1.95,2.1 2.31,1.59 1.46,0.6 0.48,0.71 0.01,0.46 0.43,1.11 -0.93,0.45 z m 29.74,3.28 0.61,-2.79 -0.53,-1.62 -0.83,-0.35 0.06,-0.71 -0.41,-0.56 -0.18,-1 0.24,-1.41 0.62,-0.21 -0.03,-0.26 -0.5,-0.5 -0.15,-0.65 0.06,-0.38 0.33,-0.5 -0.24,-0.29 0.03,-0.26 -0.95,-0.12 -0.59,-1.06 -0.92,-0.24 0,-1.06 -0.27,-0.88 0.03,-0.53 -0.21,-0.26 0.18,-0.12 0.62,0.06 0.09,-0.97 -0.62,-0.65 -0.06,-0.74 -0.5,-0.5 -0.59,-0.12 -0.09,-0.18 2.37,-0.65 0.24,-0.79 -0.38,-0.71 -0.27,0.12 -0.65,-0.44 -0.03,-0.44 -0.27,-0.56 0.33,-0.53 -0.56,-0.41 -0.21,-0.88 -0.74,-0.35 0.03,-0.74 -0.27,-0.18 0,-0.32 -0.47,-0.5 -0.33,-0.82 0.44,-0.62 1.48,-1.18 0.12,-0.35 -0.41,-0.74 0.09,-0.32 0.18,-0.03 0.56,0.38 0.15,-0.27 -0.06,-0.38 1.21,-0.65 0.24,-1.33 0.21,-0.29 -0.03,-0.97 0.47,-0.68 -0.15,-0.47 0.41,-0.24 0.03,-0.38 -0.3,-0.53 0.09,-0.21 0.38,0.09 0.56,-0.12 0.27,-0.12 0.06,-0.32 0.77,-0.21 0.8,0.15 0.4,-0.14 0,0 0.1,2.71 0.77,1.04 1.19,-0.04 1.49,0.64 1.11,0.66 0.82,1.3 1.74,0.44 0.35,0.59 -0.1,0.53 0.23,0.83 2.14,1.41 2.23,0.73 1.77,0.98 3.96,2.5 1.18,1.06 1.21,0.47 0.92,0.65 0.72,1.28 0.36,0.35 0.52,0.31 1.36,0.41 1.86,1.05 2.36,2.36 1.38,1.1 0.13,0.33 0.1,2.19 -0.14,0.6 -0.58,0.79 0.04,0.44 1.14,1.28 -0.27,0.26 0.51,-0.15 -0.31,-0.75 0.24,-0.46 -0.53,-0.4 -0.38,0.04 -0.03,-0.14 0.94,-0.63 0.4,0.07 0.71,0.77 -0.07,1.39 0.73,1.7 0.13,-0.02 -0.4,-1.63 0,-0.73 0.3,-0.53 0.59,-0.35 0.62,0.02 0.72,0.9 0.65,1.27 0.54,0.52 0.22,0.56 -0.4,1.27 0.12,2 0.71,1.57 0.16,0.94 -0.51,1.72 -0.24,2.98 -0.47,1.25 0,0.39 0.28,0.31 1.89,0.35 0.24,0.78 -0.32,0.27 -0.04,0.43 0.59,0.12 0.08,0.31 -0.12,0.39 0.16,0.31 -0.08,0.47 -0.43,0.710005 -0.08,0.39 0.24,0.24 -0.12,0.47 -0.83,0.71 -0.79,0 -0.04,0.39 -0.28,0.16 -0.59,-0.12 -0.47,0.12 0,0.35 -3,0.16 -0.39,0.27 0.04,0.39 0.24,0.24 0.24,-0.04 0.51,0.94 0.2,1.59 0.28,0.51 0.59,0.43 0.08,0.31 -0.63,0.08 -0.55,0.31 -0.04,0.43 0.39,0.16 0.35,1.02 -0.16,0.63 -0.24,0.27 -0.75,0.04 0,0.23 0.43,0.47 0.43,-0.04 -0.12,0.43 0.12,0.71 -0.28,0.2 0.51,0.74 0.55,0.43 -2.13,-0.71 -0.28,-0.35 -1.3,-0.47 -0.32,-0.71 -0.67,0.12 -0.39,-0.35 -0.28,-0.04 -0.59,0.35 0.08,2.08 -0.28,0.31 0,0.31 0.28,0.78 0.63,0 0.63,0.24 0.08,1.17 0.67,0.51 0,0.67 -0.67,0.82 -0.51,0.31 -0.71,0.12 -0.63,-0.04 -0.12,-0.2 -0.51,-0.12 -0.28,0.04 -0.83,0.43 -0.63,-0.47 -0.08,-0.39 -0.51,-0.67 -1.46,0.51 -1.06,-0.43 -1.22,0.78 -0.47,0.12 -0.87,1.61 -0.63,0.78 -0.79,0.08 -0.75,0.35 -0.93,1.39 -0.2,-0.06 -0.26,-0.21 0.32,-0.15 0,-0.87 -0.79,-0.48 0.42,-1.16 -0.58,-2.95 -1.17,-3.28 -1.23,-2.78 -2.17,-6.42 -1.33,-3.04 -0.83,-1.06 0.01,-0.33 0.19,0.01 0.45,0.48 0.19,0.08 0.19,-0.16 0.85,-1.330005 0.02,-0.83 -0.92,-1.36 -0.76,-0.62 -0.26,0.04 -0.23,0.27 0.5,0.15 0.21,0.68 -0.41,0.03 -0.74,-0.47 -2.04,-2.76 -0.56,-0.51 -1.45,-0.92 -3.43,-1.71 -1.55,-1.11 z"
    fill={getRegionColor("Sumatera")}
    stroke={isHovered("Sumatera") || isSelected("Sumatera") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Sumatera") || isSelected("Sumatera") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
</g>

/* Jawa & Bali (Luar Jabodetabek) Group */
<g
  onMouseEnter={() => setHoveredRegionMap("Jawa & Bali (Luar Jabodetabek)")}
  onMouseLeave={() => setHoveredRegionMap(null)}
  onClick={() => handleRegionClick("Jawa & Bali (Luar Jabodetabek)")}
  className="cursor-pointer group/region transition-all duration-300"
>
  <path
    id="id-ba"
    aria-label="Bali"
    d="m 352.56571,278.99789 -0.52,-0.07 -1.06,-0.59 -0.83,-0.67 0.13,-0.37 0.63,-0.57 0.28,-0.08 0.99,0 0.28,0.16 0.62,1.15 -0.01,0.28 -0.51,0.76 z m -19.22,-12.44 0.39,0.18 0.33,0.57 0.33,0.1 0.67,-0.37 3.28,0.94 1.91,0.33 1.74,-0.17 0.67,-0.23 1.67,-1.47 0.92,-0.42 0.34,0.08 4.56,1.7 1.87,1.17 1.27,1.64 1.3,0.7 0.14,0.36 -0.07,0.34 -0.3,0.41 -1.34,1.14 -1.95,0.99 -0.97,0.33 -0.94,0.08 -1.2,0.57 -1,0.94 0.04,0.75 -1.34,0.79 0.53,0.67 0.12,-0.38 0.22,0.71 -0.36,0.51 -1.07,0.3 -0.96,-0.12 -0.19,-0.34 0.8,-0.64 0.61,-0.26 -0.24,-0.45 0.28,-0.63 -0.35,-0.5 -1.4,-1.47 -2.57,-2.24 -0.72,-0.41 -1.6,-0.62 -1.42,-0.27 -2.13,0.12 -2.43,-3.08 -0.27,-1.87 0.13,-0.43 0.7,-0.05 z"
    fill={getRegionColor("Jawa & Bali (Luar Jabodetabek)")}
    stroke={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-bt"
    aria-label="Banten"
    d="m 199.16571,231.92789 -0.6,0.25 -0.04,1.12 0.61,0.33 -0.02,0.67 0.39,0.08 0.16,0.73 0.44,0.76 0,0 -0.04,0.15 0,0 -0.18,0.61 -2.91,0.02 -0.3,-0.36 -1.02,-0.27 -0.1,0.06 0.3,0.16 0.01,0.25 -0.54,0.04 -0.21,-0.65 -0.33,-0.1 -0.67,0.64 0.44,1.4 -0.25,0.33 -0.62,0.09 -0.11,0.96 0.56,1.24 -0.09,1.73 0.11,0.34 0.16,0 0.44,0.48 0.21,-0.03 0.55,0.66 -0.37,0.25 -0.03,0.27 -0.94,0.44 -0.08,0.71 -0.65,0.69 0.1,0.44 -0.18,0.18 0.16,0.76 0,0 -0.49,0.19 -1.01,0.05 -0.09,-0.28 -0.66,-0.03 -0.06,-0.23 -0.37,-0.1 0.03,-0.43 -0.91,-0.43 -0.55,-0.02 -0.54,-0.39 -0.46,-0.1 -0.7,-0.81 -0.54,-0.23 -1.44,-0.12 -2.94,0.61 -1.5,-0.19 -2.12,0.33 -0.4,0.29 -0.7,-0.19 -0.34,0.12 -0.61,-0.55 -0.31,-0.05 -0.15,0.31 -0.19,0.01 0.07,-0.26 -0.57,-0.38 -1.15,-0.24 -0.32,0.07 -0.2,0.43 -0.33,0.28 -0.41,-0.1 -0.15,-1 -0.21,-0.28 -0.16,0 -0.07,-0.26 0.98,0.07 0.33,-0.45 0.8,-0.58 -0.12,-0.43 0.83,-0.4 0.57,1.27 -0.18,0.05 -0.07,0.23 0.5,0.33 0.32,0.53 0.05,0.44 0.31,0.25 0.21,-0.04 0.52,-0.63 0.14,-0.99 1.05,-0.86 0.07,-0.4 0.36,-0.14 0.32,-0.42 0.22,-0.71 -0.09,-0.8 0.54,-0.94 0.4,-0.31 0.13,0.48 -0.18,0.24 0.41,0.32 0.34,0.06 1.02,-0.21 0.7,-0.96 0.17,-0.58 0.08,-3.08 0.61,-2.25 0.39,-0.24 -0.03,-0.61 0.75,-0.47 0.27,-0.4 0.78,-0.64 0.18,-0.87 -0.27,0.05 0.87,-0.84 0.74,-0.11 0.56,0.65 -0.02,1.29 1.02,0.55 0.26,0.03 0.76,-0.35 0.26,-0.29 0.12,-0.49 0.23,-0.17 0.87,0.29 0.12,0.2 0.29,0.09 0.4,-0.41 0.27,0.26 0.32,0.03 -0.09,0.15 0.23,0.52 0.49,0.26 0.38,-0.07 0.73,0.23 0.73,-0.53 0.49,0.31 0.93,-0.17 0.21,-0.16 0.43,0.25 0.49,-0.15 0.47,0.46 -0.09,0.12 z"
    fill={getRegionColor("Jawa & Bali (Luar Jabodetabek)")}
    stroke={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-jb"
    aria-label="Jawa Barat"
    d="m 205.66571,229.26789 0.77,0.8 0.42,0.08 2.2,-0.5 0.91,0.26 0.88,0.94 1.22,2.06 1.61,0.62 1.06,0.13 0.86,0.94 0.42,-0.34 0.22,0.14 0.49,-0.03 1.31,-0.79 0.62,0.02 0.12,0.42 0.61,-0.33 0.15,0.27 -0.28,-0.01 0.08,0.5 1.08,0.38 1.42,0.81 1.61,0.49 1,-0.62 0.42,-0.47 -0.07,-0.38 -0.35,-0.34 0.37,0.06 0.27,0.28 1.34,-0.03 0.63,0.45 0.08,-0.49 0.14,-0.07 0.29,0.4 0.16,0.54 -0.12,0.17 0.28,0.83 1.34,1.5 1.36,0.81 0.15,1.2 -0.09,0.57 0.37,1.85 0.65,1.15 0.59,0.15 0.28,-0.34 0.48,0.26 0.08,0.57 1.17,0.28 0.93,-0.46 0.05,-0.37 -0.31,-0.11 0.23,-0.27 0.47,-0.03 0,0 -0.07,1.47 -0.56,0.85 -0.25,0.11 -0.43,0.58 0.16,0.5 -0.05,0.65 0.65,0.37 -0.04,0.36 -0.27,0.23 0.1,0.31 -0.17,0.37 0.05,0.37 -0.28,0.26 -0.66,0.05 -0.48,0.58 -0.58,0.06 -0.34,-0.31 -0.34,0.01 -0.98,0.48 -0.02,0.57 0.28,0.27 0,0.51 -0.47,0.81 0.09,0.82 0.18,-0.02 0.21,0.24 1.17,-0.09 0.51,0.48 0.11,0.48 0.55,0.59 -0.13,0.46 0.1,0.44 0.3,0.37 0.34,0.94 -0.08,0.52 -0.29,0.44 0.69,0.73 0.49,0.25 0,0 -0.68,0.43 -0.52,-0.3 -0.74,-0.06 -0.47,0.31 -0.04,0.14 0.33,0.35 -0.14,0.13 -0.36,-0.22 -0.13,-0.51 -1.05,-0.04 -0.92,0.21 -0.4,0.39 -0.08,1.12 -0.45,0.32 -0.62,0.24 -1.69,0 -4.47,-0.77 -1.54,-0.52 -1.46,-0.18 -1.04,0.07 -0.18,-0.1 -0.1,-0.47 -0.45,-0.28 -0.49,-0.21 -1.5,-0.16 -0.33,-0.73 -1.22,-0.87 -2.18,-0.79 -0.36,-0.31 -1.31,-0.25 -2.57,-0.19 -2.01,-0.53 -9.47,-0.66 -0.87,-0.25 -0.49,-0.47 -0.86,-0.28 -0.55,0.19 -0.02,-0.35 -0.47,-1.06 0.01,-0.8 0.57,-0.91 0.88,-0.19 -0.24,-0.52 0.1,-0.37 0.49,-0.42 0.45,-0.17 0.63,-0.85 -0.07,-0.91 -0.51,-0.51 -1.23,-0.15 -0.47,0.17 -0.31,0.32 0,0 -0.16,-0.76 0.18,-0.18 -0.1,-0.44 0.65,-0.69 0.08,-0.71 0.94,-0.44 0.03,-0.27 0.37,-0.25 -0.55,-0.66 -0.21,0.03 -0.44,-0.48 -0.16,0 -0.11,-0.34 0.09,-1.73 -0.56,-1.24 0.11,-0.96 0.62,-0.09 0.25,-0.33 -0.44,-1.4 0.67,-0.64 0.33,0.1 0.21,0.65 0.54,-0.04 -0.01,-0.25 -0.3,-0.16 0.1,-0.06 1.02,0.27 0.3,0.36 2.91,-0.02 0.18,-0.61 0,0 0.04,-0.15 0,0 0.52,-0.05 -0.24,0.68 0.12,0.15 0.9,-0.25 0.85,0.49 0.18,-0.05 0.21,-0.95 -0.21,-0.37 -0.05,-0.56 0.63,-0.17 0.41,-0.86 0.06,-1.99 0,0 0.37,-0.06 0.18,-0.25 -0.25,-0.41 0.42,-0.28 -0.16,-0.22 -0.17,0.09 -0.05,-0.34 0.31,-0.26 0.11,-0.66 -0.17,-0.23 -0.29,0.07 0,-0.09 0.6,-0.41 z"
    fill={getRegionColor("Jawa & Bali (Luar Jabodetabek)")}
    stroke={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-ji"
    aria-label="Jawa Timur"
    d="m 313.03571,272.78789 0.65,0.13 0.86,-0.05 0.48,0.3 -0.17,0.37 -1.01,0.24 -0.98,0.05 -0.45,-0.19 0.03,-0.52 0.35,-0.14 0.08,-0.27 0.16,0.08 z m 42.62,-23.22 0.54,0.18 -0.07,0.26 0.23,0.2 0.52,0.06 0.1,0.21 0.26,0 0.17,-0.14 0,-0.37 0.41,-0.18 -0.01,-0.23 0.27,-0.13 -0.27,1.55 -0.3,0.23 -0.79,0.06 -1.3,-0.64 -0.17,-0.33 0.28,-0.44 -0.16,-0.45 0.14,-0.24 0.15,0.4 z m -23.8,1.19 -0.28,0.06 -0.7,-0.19 -0.79,-0.55 -0.32,-0.62 0.23,-0.57 0.85,-0.26 0.49,0.34 0.74,1.51 -0.22,0.28 z m 21.69,-3.62 0.57,0.33 0.16,0.37 -0.55,-0.2 -0.58,0.14 -0.48,-0.18 -0.06,-0.34 -0.28,-0.03 -0.11,-0.27 0.26,-0.33 1.07,0.51 z m -28.43,-1.48 1.76,0.91 0.32,0.77 -0.57,-0.02 -0.36,0.32 -0.53,0.19 -1.23,0.08 -0.34,0.28 -0.45,-0.21 -0.21,0.13 0.6,0.28 0.42,0.47 1.44,0.08 0.23,0.66 -1.6,-0.19 -0.64,-0.47 0.09,-0.32 -0.43,-0.19 -0.57,0.45 -0.13,0.28 -0.04,0.17 0.25,0.11 0.11,0.32 -0.11,0.23 -3.59,-0.43 -0.6,0.38 -0.21,-0.09 -0.58,0.11 -0.42,0.47 -0.42,1.21 -0.68,0.45 -0.21,-0.17 0.13,-0.09 -0.08,-0.17 -0.76,-0.15 -3.13,-0.11 -0.3,0.17 -1.27,0.04 -0.3,-0.49 -0.34,0.06 -0.02,-0.23 0.21,-0.26 -0.34,-0.3 -0.38,0.45 0.17,0.38 0.38,0.34 -0.93,0.09 -3.55,-0.87 -0.49,-0.28 -1.49,-0.09 -0.4,0.25 -0.66,0.02 -0.45,-0.36 0.23,-0.94 -0.28,0 -0.26,-0.68 0.21,-0.47 0.6,0.15 1.23,-1.02 0.6,-0.89 -0.04,-0.34 1.06,-0.38 1.59,-0.02 0.68,-0.15 1.64,0.21 5.59,-0.06 1.19,0.17 3.46,-0.25 1.15,0.06 2.57,-0.38 1.48,0.33 z m 22.26,-0.93 2.21,0.16 0.96,0.33 1.49,0.84 0.24,0.44 -0.44,0.6 -0.43,-0.26 -0.45,0.03 -0.43,-0.43 -1.02,0.16 -0.33,-0.38 -0.41,0.06 -0.1,0.14 -0.5,-0.06 0.07,0.23 0.71,0.33 0.38,0.55 -1.16,0.13 -0.27,-0.38 -0.18,0.01 -0.23,0.13 0.03,0.38 -0.26,0.08 -0.67,-0.64 0.47,-0.54 -0.31,0.1 -0.84,-0.08 -0.14,-0.31 0.18,-0.62 0.5,-0.09 0.24,-0.33 0.01,-0.18 -0.43,-0.23 0.09,-0.1 0.33,-0.16 0.69,0.09 z m -61.39,-1.01 0.5,0.05 0.83,0.41 0.63,0.02 0.93,-0.23 0.7,-0.4 0.44,0.05 1.15,1.9 0.39,0.29 0.91,0.12 0.89,-0.05 1.03,-0.43 0.47,0.12 1.3,-0.25 1.25,0.17 0.25,-0.14 0.53,0.15 0.59,0.45 0.66,0.13 0.37,-0.46 -0.23,-0.29 0.28,-0.18 -0.05,-0.34 0.4,0.34 0.12,-0.07 0.02,0.31 0.28,0.39 0.29,-0.01 0.21,0.28 -0.13,0.27 -0.22,-0.09 -0.02,0.27 0.32,1.01 0.61,0.45 0.09,0.55 -0.38,0.44 -0.15,0.79 0.78,0.71 0.04,0.38 -0.29,0.18 0,0.29 0.27,0.18 0.63,0.04 0.17,-0.39 0.81,-0.09 0.36,0.27 0.39,0.71 0.7,0.56 -0.02,0.5 -0.22,0.26 0.2,0.1 -0.16,1.17 0.06,1.27 -0.37,0.06 0.34,0.6 0.47,0.15 0.14,0.22 -0.14,0.86 0.2,0.05 0.25,0.49 0.79,0.28 0.24,-0.18 0.37,0.41 0.48,0.23 0.4,-0.17 0.45,0.11 0.74,0.84 1.43,0.73 0.71,-0.14 0.67,0.11 0.59,0.7 0.39,-0.22 0.26,0.07 0.51,-0.2 0.38,-0.39 0.59,-0.06 1.65,-0.66 0.83,0.23 0.5,-0.06 1.55,0.44 0.75,-0.42 0.66,0.47 0.23,-0.02 0.5,-0.15 0.43,-0.52 0.58,-0.27 1.26,0.31 1.07,-1.09 0.86,-0.43 0.56,0.39 0.59,1.23 0.16,0.07 1.6,0.12 0.65,-0.31 0.85,0.8 1.55,0.26 0.99,0.6 0.45,0.63 0,0.92 -0.78,0.69 0.2,1.3 -0.01,1.12 -0.42,0.79 -0.09,0.77 -0.31,0.66 0.1,0.74 -0.37,0.79 -0.42,2.22 -0.05,0.58 0.42,0.84 -0.22,0.66 0.23,0.21 0.17,-0.09 0.18,-0.86 -0.09,-0.55 0.12,-0.07 0.2,0.22 -0.02,0.5 0.2,0.52 -0.12,0.57 0.37,0.95 0.48,0.58 0.48,-0.38 0.62,0.6 0.98,0.16 0.59,0.9 -0.25,0.78 -0.34,0.27 -0.7,0.16 -1.63,-0.55 -1.07,0.03 -0.48,-0.12 -0.06,-0.23 0.45,-0.22 0.12,-0.33 -0.16,-0.57 -0.61,-0.62 -1.22,-0.55 -0.54,0.05 -0.15,0.18 0.04,0.47 -0.16,0.1 -1.94,-0.51 -1.06,0.3 -0.26,-0.18 0,-0.46 -0.29,-0.12 -0.27,0.16 -0.03,0.21 -0.61,0.05 -0.23,-0.25 0.37,-0.1 0.02,-0.26 -0.28,-0.33 -0.29,0 -0.32,0.34 -0.58,-0.33 -0.84,-0.14 0.02,-0.41 -0.3,0.34 -0.16,-0.03 0.02,-0.85 -0.2,-0.11 -0.66,0.23 -0.16,0.27 -0.23,0.09 -0.22,-0.11 -0.14,0.13 -0.09,-0.06 0.17,-0.43 -0.13,-0.25 -0.37,0.28 -0.2,-0.17 -0.17,0.12 -0.79,-0.92 -0.43,-0.16 -0.4,0.06 0.06,-0.12 -0.17,-0.12 -0.27,0.15 -0.52,-0.07 -0.78,-0.37 -0.02,-0.41 -0.37,-0.16 -0.6,0.06 -0.6,0.36 -0.65,-1.07 -0.29,-0.25 -0.8,-0.53 -0.93,-0.23 -0.87,-0.06 -2.68,0.45 -1.02,0.6 -0.34,0.61 -0.52,0.42 -3.65,0.5 0.08,0.5 -0.39,0.13 -1.21,-0.63 -1.07,-0.33 -2.01,-0.17 -0.46,-0.28 -0.46,0 -0.83,-0.61 -0.76,-0.22 -0.59,0.31 -0.61,-0.09 -0.57,-0.31 -2.53,-0.09 -0.46,-0.09 -0.28,-0.31 -0.47,-0.2 -0.63,-0.1 -0.1,0.12 0.11,0.22 -0.78,0 -0.71,-0.59 -0.22,-0.02 -0.12,0.25 -0.65,-0.17 -0.05,-0.16 -0.41,0.1 0.09,1.06 -0.31,0.18 -0.33,-0.04 0.11,-0.33 -0.22,-0.39 -0.34,0.01 -0.08,0.16 0.2,0.35 -0.38,0.01 -0.1,0.21 0.39,0.33 0.07,0.24 -0.5,0.13 -0.31,-0.02 -0.16,-0.28 -0.75,-0.08 0.14,-0.2 -0.07,-0.33 -0.22,0 -0.04,0.13 -0.33,-0.09 -0.15,0.18 -0.28,-0.07 -0.02,-0.37 -0.31,-0.07 -0.24,0.46 -1.29,-0.31 -0.17,-0.78 -0.33,-0.2 -0.66,0.37 -2.5,-0.53 -0.52,0.35 -1.24,0.11 -0.83,-0.58 -0.04,-0.34 -0.28,-0.02 -0.08,0.45 -1,0.11 -1.96,-0.65 0,0 -0.12,-0.82 0.25,-0.91 0.7,-0.92 1.26,0.33 0.84,-0.61 0.55,0.31 0.44,-0.7 -0.07,-1.06 0.28,-0.19 -0.04,-0.3 0.18,-0.18 0.64,-0.16 0.07,0.28 0.42,-0.06 0.27,0.33 0.3,-0.09 0.62,-0.68 0.18,-0.7 0.31,-0.24 -0.58,-1.31 0.1,-0.56 -0.96,0.04 -0.83,-0.68 0.1,-0.38 -0.07,-0.77 0.18,-0.62 -0.64,-0.42 -0.19,-0.8 0.03,-0.64 -0.27,-0.33 -0.3,-1.02 0.46,-0.97 -0.06,-0.49 0.15,-0.42 -0.18,-0.12 0.19,-0.71 0.09,-0.13 0.33,0.1 0.4,-0.13 0.09,-0.18 0.21,0.03 0.46,0.56 1.16,0.42 0.74,0.5 1.14,0.27 0.25,0.3 0.4,0.13 0.09,-0.27 -0.3,-0.15 0.16,-0.55 -0.46,0 0.36,-0.89 0.21,-0.21 0.15,0.1 0.22,-0.18 0.1,0.09 0.95,-0.5 0.68,-0.7 0.65,-1.28 -0.06,-0.5 0.21,-0.33 -0.21,-0.9 0.19,-0.45 -0.98,-0.67 0.3,-0.52 0.4,-0.16 0.24,-1.35 0.67,-0.09 0.15,-0.21 -0.04,-0.61 0.16,-0.18 0.18,0.15 0.2,-0.34 0,0 0.39,0.27 0.38,0.03 z m 16.67,-17.98 0.39,0.1 -0.01,0.3 0.27,0.53 -0.18,0.82 -0.76,0.39 -0.63,-0.05 -0.17,-0.14 -0.36,0.17 -0.47,0 -0.29,-0.52 0.27,-0.89 0.32,-0.05 0.07,-0.37 0.35,-0.22 0.29,-0.12 0.39,0.09 0.22,-0.34 0.3,0.3 z"
    fill={getRegionColor("Jawa & Bali (Luar Jabodetabek)")}
    stroke={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-jt"
    aria-label="Jawa Tengah"
    d="m 285.20571,243.41789 -0.2,0.34 -0.18,-0.15 -0.16,0.18 0.04,0.61 -0.15,0.21 -0.66,0.09 -0.24,1.35 -0.4,0.16 -0.3,0.52 0.98,0.67 -0.19,0.44 0.21,0.91 -0.21,0.32 0.06,0.51 -0.65,1.27 -0.69,0.71 -0.95,0.5 -0.1,-0.09 -0.22,0.18 -0.15,-0.1 -0.21,0.2 -0.35,0.89 0.46,0 -0.17,0.55 0.3,0.15 -0.09,0.27 -0.4,-0.13 -0.25,-0.3 -1.14,-0.27 -0.74,-0.5 -1.16,-0.42 -0.46,-0.56 -0.21,-0.03 -0.09,0.18 -0.4,0.13 -0.32,-0.1 -0.09,0.13 -0.19,0.71 0.17,0.12 -0.15,0.42 0.06,0.49 -0.46,0.96 0.3,1.03 0.27,0.32 -0.03,0.64 0.19,0.8 0.64,0.42 -0.18,0.62 0.07,0.78 -0.1,0.37 0.83,0.69 0.96,-0.05 -0.1,0.57 0.58,1.3 -0.31,0.24 -0.18,0.7 -0.62,0.69 -0.3,0.08 -0.27,-0.32 -0.41,0.06 -0.08,-0.29 -0.63,0.17 -0.18,0.18 0.04,0.29 -0.28,0.2 0.08,1.05 -0.45,0.7 -0.55,-0.31 -0.84,0.61 -1.27,-0.33 -0.69,0.92 -0.25,0.91 0.12,0.82 0,0 -1.19,-0.29 0,0 0.04,-0.5 -0.12,-0.05 -0.18,0.18 -0.08,-0.11 0.24,-0.61 -0.22,-0.01 -0.32,0.38 -0.23,-0.18 0.05,-0.75 -0.57,-1.61 0.23,-0.55 -0.02,-1.1 0.29,-0.84 0.05,-0.89 -0.29,-0.17 -0.24,0.27 -0.37,-0.46 -0.32,-0.13 -0.17,0.22 -0.41,0.05 -0.19,-0.33 -0.24,0.23 -0.14,-0.14 -1.1,0.23 -0.21,-0.34 -0.23,-0.09 -0.36,0.23 -0.43,-0.4 -0.32,-0.06 -0.81,-3.89 -2.39,1.88 -0.57,0.77 -0.26,-0.14 0.03,-0.59 -0.2,-0.17 -0.29,0.12 -1.26,-0.13 -0.61,0.16 -0.18,0.43 0.32,0.28 -0.12,0.88 -0.34,0.51 -0.26,0.1 -0.2,0.42 -0.4,0.24 -0.31,1.28 -0.58,-0.03 0,0 -1.69,-0.62 -3.62,-0.99 -3.34,-0.53 -0.46,-0.18 -1.19,0.26 -0.46,-0.34 0.17,-0.5 -1.87,-0.42 -3.08,-0.23 -0.77,0.12 -0.59,0.35 -0.16,0.3 -0.09,0.38 0.19,0.24 0.28,-0.09 0.12,0.16 -0.19,0.24 -3.71,-0.8 -0.5,0.09 -0.17,-0.3 0.18,-0.27 -0.25,-0.08 0.3,-0.31 0.46,-0.07 0.18,-0.24 0.4,0 0,-0.15 -0.22,-0.09 -0.83,0.3 0,0 -0.49,-0.25 -0.69,-0.73 0.29,-0.44 0.08,-0.52 -0.34,-0.94 -0.3,-0.37 -0.1,-0.44 0.13,-0.46 -0.55,-0.59 -0.11,-0.48 -0.51,-0.48 -1.17,0.09 -0.21,-0.24 -0.18,0.02 -0.09,-0.82 0.47,-0.81 0,-0.51 -0.28,-0.27 0.02,-0.57 0.98,-0.48 0.34,-0.01 0.34,0.31 0.58,-0.06 0.48,-0.58 0.66,-0.05 0.28,-0.26 -0.05,-0.37 0.17,-0.37 -0.1,-0.31 0.27,-0.23 0.04,-0.36 -0.65,-0.37 0.05,-0.65 -0.16,-0.5 0.43,-0.58 0.25,-0.11 0.56,-0.85 0.07,-1.47 0,0 0.1,0.24 -0.1,0.26 0.29,0.05 0.25,0.45 1.63,0.47 0.24,-0.4 0.35,-0.02 0.69,-0.47 0.3,0.07 0.34,-0.39 0.14,0.89 0.66,0.62 0.87,0 0.46,0.28 1.22,0.18 0.76,-0.01 0.62,-0.2 0.42,0.08 0.99,-0.26 1.03,-0.57 0.69,-0.65 0.96,1.02 1.48,0.17 3.75,1.21 0.88,-0.09 0.64,0.17 0.76,-0.06 2.33,-0.77 0.39,-0.27 0.09,-0.25 0.76,0.24 0.5,0.82 0.87,0.32 0.33,0.27 1.01,0.31 1.13,-0.25 0.12,0.23 0.61,-0.23 -0.01,-0.43 0.47,-0.68 0.23,-0.74 0.59,-0.48 0.38,-0.77 -0.55,-0.04 -0.15,-0.23 0.4,0.07 -0.25,-0.46 0.36,-0.08 0.26,0.16 0.41,-0.3 0.63,-0.84 -0.07,-0.82 0.24,-0.08 0.09,-0.78 -0.11,-0.17 0.55,-0.62 -0.29,-0.32 0.28,-0.11 0.7,-0.85 1.07,-0.37 0.49,0 0.35,-0.28 1.24,-0.13 0.86,0.21 0.47,-0.16 1.09,0.35 1.03,3.09 0.65,0.86 1.03,0.23 0.7,0.37 2.31,0.23 1.4,-0.61 0.18,-0.49 0.49,-0.27 0.29,0.21 0.38,-0.09 0.7,0.29 z"
    fill={getRegionColor("Jawa & Bali (Luar Jabodetabek)")}
    stroke={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-yo"
    aria-label="Yogyakarta"
    d="m 270.32571,268.50789 -2.04,-0.09 -5.85,-2.13 -0.41,-0.33 -0.25,-0.48 -1.97,-0.62 -2.48,-1.28 -1.29,-0.48 0,0 0.58,0.03 0.31,-1.28 0.4,-0.24 0.2,-0.42 0.26,-0.1 0.34,-0.51 0.12,-0.88 -0.32,-0.28 0.18,-0.43 0.61,-0.16 1.26,0.13 0.29,-0.12 0.2,0.17 -0.03,0.59 0.26,0.14 0.57,-0.77 2.39,-1.88 0.81,3.89 0.32,0.06 0.43,0.4 0.36,-0.23 0.23,0.09 0.21,0.34 1.1,-0.23 0.14,0.14 0.24,-0.23 0.19,0.33 0.41,-0.05 0.17,-0.22 0.32,0.13 0.37,0.46 0.24,-0.27 0.29,0.17 -0.05,0.89 -0.29,0.84 0.02,1.1 -0.23,0.55 0.57,1.61 -0.05,0.75 0.23,0.18 0.32,-0.38 0.22,0.01 -0.24,0.61 0.08,0.11 0.18,-0.18 0.12,0.05 z"
    fill={getRegionColor("Jawa & Bali (Luar Jabodetabek)")}
    stroke={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Jawa & Bali (Luar Jabodetabek)") || isSelected("Jawa & Bali (Luar Jabodetabek)") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
</g>


/* Kalimantan & Sulawesi Group */
<g
  onMouseEnter={() => setHoveredRegionMap("Kalimantan & Sulawesi")}
  onMouseLeave={() => setHoveredRegionMap(null)}
  onClick={() => handleRegionClick("Kalimantan & Sulawesi")}
  className="cursor-pointer group/region transition-all duration-300"
>
  <path
    id="id-kb"
    aria-label="Kalimantan Barat"
    d="m 236.00571,155.77789 -0.39,-0.07 -0.58,-1.45 0.15,-0.3 1.59,-0.47 0.62,0.14 0.55,0.61 0.02,0.26 -0.32,0.63 -1.64,0.65 z m 11.81,-11.54 0.54,0.06 0.42,-0.33 0.63,0.04 0.46,0.47 0.4,0.12 0.34,-0.14 0.33,-0.4 0.47,0.24 0.31,0.53 0.19,0.86 -0.07,0.53 0.23,0.25 0,0.25 -5.01,2.89 -1.31,-0.43 -0.44,-0.45 0.56,-0.61 0.18,-0.51 0.42,-2.2 -0.04,-0.43 0.75,-1.05 0.64,0.31 z m 1.94,-52.760005 -0.5,1.38 -0.38,0.22 -0.3,0.75 -0.6,0.07 -0.05,0.48 0.17,0.65 0.45,0.32 0.4,0.62 1.2,0.3 0.15,0.35 -0.42,2.14 0.3,0.65 1.82,1.810005 0.35,0.15 0.83,1.29 1.27,0.05 0.5,0.2 0.25,0.3 0.17,1.39 1.49,0.74 0.35,0.87 0.43,0.35 0.6,-0.07 0.73,0.15 0.45,0.67 0.15,0.52 0.48,0.4 0.42,0.72 0.32,0.97 0.98,0 0.97,0.25 0.9,1.37 0.35,0.27 1.2,0.42 0.73,0.07 0.55,-0.12 0.4,-0.67 0.45,0.45 0.45,-0.02 0.38,-0.32 0.77,-0.25 0.95,-0.55 0.72,-0.12 0.63,-0.55 0.27,-0.6 3.85,-0.5 1.95,-0.57 0.32,0.3 1.75,0.57 0.5,0.32 0.5,-0.02 0.7,-0.3 0.77,0.12 0.7,1.17 0.23,-0.02 0.1,-0.52 0.52,-0.07 1.13,-0.82 0.27,-0.02 1,0.52 0.58,-0.17 1.7,0.35 0.32,-0.77 1.35,-1.39 3.22,-0.22 -0.03,-0.65 0.25,-0.6 0.15,-1.49 0.85,-0.84 0.05,-0.65 -0.42,-0.65 0.5,-0.55 0.42,0 1.27,-0.79 1.57,-0.35 0.55,-0.27 0.08,-0.3 1.02,-0.370005 2.9,0.370005 1.65,-0.12 0.55,0.4 0.35,0.02 0.57,-0.3 0.35,-0.470005 0.2,-0.05 0.82,0.220005 0.92,-0.07001 0.63,0.12001 0.52,0.3 0.13,0.4 -0.17,0.05 -0.5,0.99 -0.5,0.17 -0.3,0.3 -0.15,0.45 0.75,0.07 1.35,-0.45 0.37,0.05 0.38,0.67 0.75,0.22 1.6,-0.15 0.77,0.2 0.72,0.5 0.17,0.35 0.6,0.37 0.3,0.37 0.4,0.02 0.33,-0.3 0.57,-0.22 0.82,-0.05 0.67,0.3 0.75,1.34 0.32,0.1 0.3,0 0.35,-0.22 0.38,-0.45 1.9,-0.77 0.28,-0.84 -0.13,-0.2 0.07,-0.17 1.92,-0.79 0.4,-0.45 3.05,-0.32 0.97,0.65 0.2,0.28 0,0 -0.03,0.01 0,0 -0.82,0.42 -0.12,1.72 0.21,0.18 -0.33,0.42 0,0.69 -0.21,0.69 -0.3,0.3 -0.52,-0.09 -0.55,0.36 -0.3,-0.15 -0.7,0.06 -0.52,0.42 -0.09,0.66 -0.3,0.24 -0.67,0.15 -0.09,0.36 0.33,0.3 0.12,0.42 -0.18,0.51 -0.52,0.51 -0.09,0.27 0.27,0.69 0.58,0.48 0,0.3 -0.52,0.63 0.06,0.81 -0.18,0.36 -0.67,0.27 -0.18,0.54 0.12,0.24 0,0 -0.51,0.29 -0.23,0.71 -0.36,0.24 -0.19,0.44 -0.37,0.16 -0.19,0.42 -0.4,0 -0.68,0.42 -0.27,1.09 -1.31,0.76 -0.16,0.31 -0.96,0.82 -0.05,0.23 -0.53,0.41 -0.92,0.56 -1.38,-0.26 -0.74,0.2 -0.63,0.38 -0.03,0.19 1.03,1.01 1.55,0.82 -0.15,1.34 0.19,0.35 0.36,0.25 -0.26,0.38 -0.18,0.76 0.37,0.05 0.07,0.22 -0.36,0.79 -0.44,0.26 0.34,0.2 -0.08,0.33 -0.36,0.07 -0.27,0.56999 -0.56,0.52001 -0.85,0.18 -0.42,0.6 -0.53,0.37 -0.19,0.6 -0.29,0.21999 0.78,0.71001 0.19,0.78 -0.66,0.8 -0.16,0.49 -0.12,0.08 -0.15,-0.14 -0.29,-0.5 -0.49,-0.01 -0.14,-0.35 -0.38,0.12 -0.27,0.52 -0.37,0 -0.33,0.23 -1.33,-0.14 -0.33,0.31 -1.44,0.42 -0.67,0.63 -0.7,0.12 -0.58,-0.18 -0.58,0.15 -0.08,0.86 -0.74,0.03 -0.25,0.42 -0.89,0.03 -0.6,0.35 0,0.2 -0.92,0.08 -0.1,0.19 -0.85,-0.16 -0.08,0.46 -0.23,0.23 -0.37,-0.26 -0.01,-0.61 -0.37,-0.14 -0.49,0.44 -0.85,0.31 -0.41,-0.18 -0.36,0.44 -0.41,-0.48 -0.64,-1.21 -0.34,-0.29 -0.55,-0.03 -0.82,1.14 0.23,0.72 -0.1,0.07 -0.38,0 -0.77,-0.31 -1.08,-0.11 -0.19,0.18 0.31,1.12 -0.07,0.31 -1.21,0.34 -0.37,-0.15 -0.49,-0.53 -0.14,0.86 0.29,0.76 -0.67,-0.15 -0.15,0.07 -0.16,0.57 -0.46,0.26 -1.01,-0.07 -0.77,0.27 -0.22,0.3 -0.93,0.56 -0.59,0.04 -0.3,0.37 0.18,0.69 -0.47,0.48 -0.48,0.15 -0.27,0.54 0.31,0.64 -0.26,0.48 0.33,0.29 -0.12,0.3 -1.19,0.2 -0.31,0.26 -1.11,0.01 -0.22,0.18001 -0.12,0.53999 -0.3,0 -0.36,0.75 -0.63,0.33001 -0.16,0.6 -0.42,0.47999 -0.21,0.04 0.04,0.29 -1.11,-0.22 -0.12,0.53 -0.38,-0.14 0.14,0.79 -0.08,0.65 -0.31,-0.13999 -0.04,-0.49001 -0.27,-0.16 -0.82,0.49001 0.26,0.38999 0.07,0.45 -0.81,0.22 -0.37,-0.42 -0.48,0.15 -0.3,0.30001 -0.49,-0.39 -0.44,0.54 -0.88,0.22 -0.29,0.42 -0.55,0.37999 0.04,0.78 0.44,0.11001 0.18,0.44 0.26,0.19 0.42,-0.1 0.18,-0.14 0.11,-0.45 0.42,-0.18 0.29,0.16 0.22,0.52 0.12,1.2 -0.15,0.38 -0.37,0.34 -0.11,0.44 -0.03,0.64 0.33,0.41 -0.04,0.37 -0.34,0.41999 0.15,0.42 0.34,0.23 0.52,-0.14 0.89,0.12 0.04,0.15 -0.15,0.40001 0.07,0.41999 -0.7,0.59 0.68,1.29 -0.04,0.23 -0.19,0.23 0.03,0.29 -0.62,0.72 0.69,1.13 0.52,1.82 0.08,1.31 0.53,2.06 -0.33,0.82 0.45,0.27 0.34,-0.01 0.15,0.45 -0.52,0.91 -0.9,0.45 -1.45,0.37 -0.15,0.57 -0.62,0.52 -1.18,0.2 -0.78,0.48 -1.21,0.41 -0.38,0.29 -0.34,0.94 0,0 -1.33,0.83 -0.34,-0.14 0.08,-0.3 -0.19,-0.69 0.08,-0.84 -0.37,-0.87 -0.47,-0.57 -0.64,-0.07 -1.08,0.33 -1.31,0.63 -1.95,1.6 -0.2,-0.27 -0.47,-0.1 -0.17,-0.94 -0.34,-0.57 0.54,-1.07 0.1,-0.6 -0.34,-0.47 -0.41,-0.19 -0.18,-1.66 -1.26,-0.37 0.67,-0.8 0.25,-1.26 -1.04,-3.8 -0.73,-0.87 0.04,-1.11 0.49,-1.46 0.01,-0.68 -0.7,-1.8 -0.69,-0.5 -1.67,-0.71 -0.78,-0.75 0.19,-0.92 1.34,-0.79 0.69,-1.2 0.65,-3.33 0.01,-1.52 -0.22,-0.74 -0.21,-0.38 -0.66,-0.52 -0.8,-0.18 -0.87,-1.1 0.52,-1.4 -1.92,-0.63 -1.17,-1.61 -0.67,-0.41 -0.73,0.49 -1.13,-0.75 -0.41,-0.76 -0.3,-0.27 -1.98,-0.55 -0.29,-0.27 -0.48,0.12 0.2,0.84 -0.26,0.41 -0.26,0.08 -1.72,-0.57 -0.56,-0.57 -0.46,-0.89 0.2,-2.6 0.46,0.12 0.36,0.37 1.15,0.34 0.79,0.04 1.05,0.63 0.02,-0.51 -0.97,-0.73 -0.87,-0.03 -0.23,-0.46 0.27,-0.46 0.04,-0.66 -1.42,0.03 -0.4,0.13 -1.68,-0.6 -0.72,-0.81 -0.43,-1.93 -0.99,-2.58 0.34,-0.59 0.64,-0.13 -0.17,-0.81 1.13,-1.79 0.38,-1.61 -0.2,-1.18 -0.84,-1.89 -1.1,-1.16 -0.82,-0.24 -1.23,-0.05 -0.28,-0.26 0.03,-0.63 0.45,-0.94 0,-0.52 -0.71,-0.84 0.47,-2.12 -0.27,-0.92 -0.73,-0.79 0.25,-0.87 -0.75,-0.89 0.15,-0.43 0.69,-0.55 0.52,-0.05 0.67,-0.69 0.39,-1.14 -0.43,-1.42 -0.49,-0.42 -0.47,-1.36 0.13,-0.2 0.73,0.17 0,-0.76 0.6,-1.12 0.73,-0.73 0.23,-0.79 -0.2,-1.26 0.13,-0.89 0.37,-0.69 0.74,-0.69 2.22,-1.34 0.54,-0.59 0,-0.45 0.5,-1.09 0.7,-0.96 0.06,-1.05 -0.26,-0.61 0.07,-0.26 0.47,-0.17 1.38,-0.03 0.31,-0.44 0.47,-0.2 1.69,-0.03 1.21,-1.4 z m -13.97,-13.37 -0.17,0.06 -0.97,-0.74 0.92,-0.77 0.31,-1.05 0.48,-0.17 0.27,0.08 0.18,0.35 -0.18,1.49 -0.84,0.75 z m -53.61,0.22 -0.38,0.02 -0.26,-0.27 -0.33,-2.69 0.12,-0.88 0.18,-0.04 2.55,1.42 -0.61,1.34 -0.87,0.88 -0.4,0.22 z m 44.48,-14.45 -2.29,0.48 -1.46,-0.81 0.6,-0.84 1.25,-0.91 -0.63,-0.37 -1.79,-0.59 -0.98,-1.85 -0.23,-1.12 0.59,-0.71 0.74,-0.21 1.96,-2.05 1.21,0.28 0.11,0.84 0.22,0.49 2.2,2.17 0.16,1.79 -0.22,0.78 -1.44,2.63 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-ki"
    aria-label="Kalimantan Timur"
    d="m 393.76571,84.717885 1.44,1.57 0.74,1.23 -0.02,0.43 -0.61,0.92 -2.71,2.45 -1,-0.42 -0.3,0.01 0.47,0.44 0.21,0.71 -0.09,2.17 0.15,0.6 0.8,0.91 2.3,1.59 1.45,1.46 4.93,2.900005 0.53,1.35 1.32,0.61 0.59,-0.09 0.6,0.18 3.1,2.66 0.35,0.92 0.76,0.89 1.17,0.47 0.27,-0.03 1.25,0.41 0.18,0.16 0.07,0.95 -0.56,0.8 -0.73,0.69 -2.42,1.67 -2.04,-0.77 -2.97,0.28 -2.79,-0.25 -3.08,-0.58 -1.63,-0.74 -0.7,-0.72 -0.67,-1.8 -0.67,-0.57 -0.81,-0.4 -0.24,0.09 -0.03,0.44 2.4,4.1 0.09,0.74 -0.23,0.37 -0.38,0.07 -0.34,-0.1 -0.75,-0.7 -0.58,-0.1 -1.59,0.51 -1.2,1.17 -0.36,0.77 -0.01,0.91 -1.71,3.53 -0.91,0.66 -0.81,1.73 -0.71,2.1 -0.24,1.23 0.44,1.23 0.47,0.42 0.15,0.69 -0.19,0.43 -0.63,0.67 -0.79,2.47 0.01,0.47 0.6,1.28 -0.45,3.12 2.57,-1.67 0.45,-0.14 0.21,0.09 0.07,0.27 -1.06,3.59 0.82,1.77 0.03,0.44 -0.14,0.22 -2.79,1.24 -2.14,-0.12 -0.7,-0.83 -0.42,0.26 -0.14,0.8 -1.95,2.35 -2.05,3.34 -0.38,0.33 -1.4,0.62 -1.84,0.33 -1.32,-2.97 0.31,-1.12 -0.08,-0.2 -0.24,0.06 -0.48,1.29 0.01,0.54 0.7,0.7 0.59,1.31 -0.55,2 -2.25,0.78 -1.5,1.05 -0.13,0.16 0.09,0.76 0.49,0.79 -0.11,0.48 -0.33,0.4 -2.37,0.94 -1.66,0.81 -1.43,0.9 0.12,0.31 0.53,0.27 0.7,-0.15 0.59,-0.47 0.82,-0.18 0.72,0.08 0.35,0.21 0.26,2.24 -0.04,2.27 -0.39,0.49 -1.09,0.38 -0.25,0.28 1.32,0.28 0.81,0 0.41,-0.4 0.34,0.74 -0.05,0.34 1.42,0.38 -0.11,1.39 -0.7,2.47 0,0 -1.33,-0.61 -1.1,-0.29 -2.7,-0.03 -1.28,-0.42 -2.73,-0.15 -0.39,-0.07 -0.53,-0.49 -0.54,0.49 -0.78,0.29 -0.1,0.31 -0.39,0.36 -0.54,0.17 -0.28,-0.53 0.03,-1.02 -0.71,-1.73 0.18,-1.52 0.36,-0.56 -0.15,-0.25 -0.6,-0.25 -0.5,0.14 -0.35,-0.28 -0.18,0.04 0.21,-0.6 -0.28,-0.32 0,-0.42 0.32,-0.71 0.07,-0.71 -0.14,-1.87 -0.36,-0.74 -0.49,-0.56 -0.11,-0.5 0.14,-0.31 -0.71,-0.57 -0.14,-0.32 0.14,-0.7 -0.28,-0.39 -0.61,-0.11 -0.6,0.25 -0.18,-0.35 0.07,-0.35 0.64,-0.57 0.43,-0.67 0.82,-0.7 0.32,0.07 -0.15,0.77 0.25,0.07 1.07,-1.27 0.25,-0.99 0,0 -0.01,0.01 0,0 0.23,-1.3 0.45,-0.53 0.91,-0.66 0.03,-0.26 -0.76,-0.66 -0.32,0.07 -0.34,0.33 -0.23,-0.14 -0.19,-0.69 -0.34,-0.14 -0.4,-0.44 -0.42,0.05 -0.21,-0.95 -0.23,-0.29 -1.32,-0.84 -0.6,-0.98 -0.79,-0.69 -1.68,-0.3 -0.41,-1.01 0.03,-1.19 -0.28,-1.9 -0.5,-0.43 -0.39,-1.03 -0.72,-0.74 -0.23,-0.06 0.21,-1.09 -0.37,-0.1 -0.19,-1.46 0.42,-0.08 0.04,-0.48 -0.29,-0.45 0.55,-0.95 0,-0.67 0.44,-0.26 0.42,-0.58 -0.36,-1.12 -2.42,1.17 -0.29,0.66 -0.47,0.01 -0.47,0.23 -0.76,0.66 -0.9,-0.24 -1.02,0.19 0,-0.53 -0.21,-0.47 0.08,-0.64 -0.45,-0.85 -0.1,-1.44 -0.24,-0.31 -0.37,0.02 -0.32,-0.35 -0.59,0.11 -0.29,-0.5 0.37,-0.88 -0.08,-0.42 0.43,-0.48 0.02,-0.35 0.39,-0.07 0.19,-0.2 0.53,-1.13 0.67,-0.43 0.27,0.06 0.11,0.21 0.31,-0.16 0.73,-0.05 0.17,0.02 0.34,0.48 0.15,-0.32 1.19,-0.83 0.2,-0.39 0.05,-0.71 -0.65,-0.57 -0.32,-0.65 -0.73,-0.86 -0.56,-1.16 -0.29,-1.61 -0.39,-0.7 -0.45,-0.37 -0.51,-0.14 -0.8,0.75 -0.04,0.23 0.3,0.48 -0.47,-0.12 -0.2,-0.42 -0.53,-0.33 -0.39,0.24 -0.5,-0.07 -0.82,0.6 -0.32,-0.14 -0.55,0.1 -0.49,0.65 -0.89,0.64 -0.79,0.03 0,0.63 -0.21,0.39 -1,0.03 -0.67,0.45 0.06,0.67 -0.21,0.06 -0.7,-0.12 -0.51,-0.43 -0.73,-0.18 -1.55,0.18 -0.42,-0.18 -0.1,-0.42 -0.63,-0.33 0,-0.21 0.33,-0.33 -0.33,-0.97 -0.73,-0.45 -0.3,0.12 -0.36,-0.09 -1.28,0.66 -0.54,-0.09 -0.7,0.24 -0.24,-0.06 -0.25,0.18 -0.42,-0.33 -0.49,0 0,0 -0.12,-0.24 0.18,-0.54 0.67,-0.27 0.18,-0.36 -0.06,-0.82 0.52,-0.63 0,-0.3 -0.58,-0.48 -0.27,-0.7 0.09,-0.27 0.52,-0.51 0.18,-0.51 -0.12,-0.43 -0.34,-0.3 0.09,-0.36 0.67,-0.15 0.3,-0.24 0.1,-0.66 0.51,-0.43 0.7,-0.06 0.3,0.15 0.55,-0.36 0.51,0.09 0.31,-0.3 0.21,-0.69 0,-0.69 0.33,-0.43 -0.21,-0.18 0.12,-1.72 0.82,-0.42 0,0 0.37,-0.15 0,0 0.24,-0.45 0.7,-0.09 1.58,-0.67 0.57,-0.54 2.58,1.51 0.4,-0.12 0.21,-0.43 0,0 0.79,0.42 0.25,0.46 0.62,0.51 1.59,0.46 0.78,0.87 0.2,1.02 0.21,0.26 0.82,-0.46 0.72,0.1 0.52,0.21 0.31,0.4 0.15,0.62 0.41,0.46 0.46,0.2 0.67,0.05 0.88,-0.97 1.34,0 0.56,0.26 0.77,0.1 0.83,-0.92 1.03,0.2 0.77,-0.92 0.51,-0.25 0.26,-1.59 0.41,-0.41 1.96,0.06 2.31,-0.87 2.32,-0.05 1.03,-0.87 0.56,-1.18 0.88,-0.770005 1.59,-2.14 1.29,-2.46 -0.31,-1.17 0.1,-0.67 0.47,-0.56 1.08,-0.56 0.25,-0.67 0.67,-0.41 0.16,-0.82 0.05,-2.2 0.2,-0.71 0.83,-1.38 0.36,-0.26 0.31,-1.33 0.25,-0.31 0.52,-0.05 0.56,0.57 0.78,0.3 0.3,0.31 0,0.41 0.62,0.31 0.72,-0.06 1.03,-0.3 1.75,-1.13 2.26,-0.77 2.01,-1.17 1.29,-0.05 1.44,0.3 1.59,-0.41 0.88,0 0.51,1.13 0.62,0.46 1.29,0.61 0.51,0.11 1.08,-0.26 0.46,0.31 1.14,1.38 1.38,0.51 0.37,0.05 1.28,-0.77 1.29,-0.15"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-ks"
    aria-label="Kalimantan Selatan"
    d="m 366.41571,189.53789 -0.17,0.2 -1.1,-1.78 0.65,-1.65 0.86,-1.09 0.23,-0.06 0.2,0.45 0,0.59 -0.67,3.34 z m -4.71,6.95 -0.56,0.16 -0.53,-0.05 -0.07,-0.21 0.06,-0.77 0.39,-1.28 -0.06,-1.79 -0.9,-1.25 -0.25,-0.81 0.02,-0.66 1.9,-5.56 2.45,-1.75 0.23,0.06 0.06,0.35 -0.36,2.29 0.27,2.65 0.82,3.98 -0.24,2.43 -2.51,1.88 -0.72,0.33 z m -6.34,-46.88 -0.25,0.99 -1.06,1.27 -0.25,-0.07 0.14,-0.78 -0.32,-0.07 -0.82,0.71 -0.43,0.67 -0.64,0.56 -0.07,0.35 0.18,0.35 0.6,-0.25 0.6,0.11 0.28,0.39 -0.14,0.71 0.14,0.32 0.71,0.56 -0.14,0.32 0.11,0.49 0.5,0.56 0.35,0.74 0.14,1.87 -0.07,0.71 -0.32,0.71 0,0.42 0.28,0.32 -0.21,0.6 0.18,-0.04 0.35,0.28 0.5,-0.14 0.6,0.25 0.14,0.25 -0.35,0.56 -0.18,1.52 0.71,1.73 -0.04,1.02 0.28,0.53 0.53,-0.18 0.39,-0.35 0.11,-0.32 0.78,-0.28 0.53,-0.49 0.53,0.49 0.39,0.07 2.73,0.14 1.28,0.42 2.7,0.04 1.1,0.28 1.33,0.62 0,0 -0.39,1.87 -0.52,0.66 -0.4,0.02 -0.16,-0.16 -0.12,-0.61 -0.76,-0.4 -1.98,0.4 -0.05,1.62 1.01,0.91 0.2,3.11 -0.33,0.85 -1.39,1.8 -0.51,0.26 -0.23,-0.05 -0.24,-0.35 -0.21,-1.2 -0.95,-1.65 -0.2,-0.19 -0.13,0.14 -0.38,1.72 0.19,0.89 0.98,1.4 0.57,0.5 0.1,0.98 -0.77,0.39 -1.25,1.71 -1.52,2.87 -0.38,2.45 -0.24,0.47 -0.38,0.22 -1.98,0.29 -1.15,1.1 -0.65,0.42 -3.24,1.38 -4.53,1.63 -6.2,2.59 -3.79,2.28 -1.24,0.16 -0.36,-0.39 -0.13,-0.57 -0.01,-7.32 -0.11,-0.84 -0.35,-0.7 -1.02,-1.34 -0.71,-0.66 -0.73,0.08 -1.54,-0.88 0,0 0,-0.91 0.78,-2.37 1.46,-2.29 0.39,-2.26 1.53,-3 0.99,-0.28 0.35,-0.28 0.18,-0.21 -0.14,-0.25 0.21,-0.39 0.36,0.11 0.85,-0.32 0.46,-0.6 0.32,-1.8 0.7,-0.55 0.5,-0.78 -0.04,-0.64 0.21,-0.32 0.57,0.04 5.9,-4.27 0.39,0.28 0.32,-0.04 0.21,-1.31 0.39,-0.81 -0.71,-1.55 0,-0.39 0.96,-0.74 0.25,-0.81 -0.67,-0.92 -0.11,-0.78 0.71,-2.22 0.89,-3.88 0.14,-0.18 1.85,-0.14 1.81,-0.67 0.39,-0.32 0.5,0.11 0.99,-0.78 0,0 0.39,-0.3 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-kt"
    aria-label="Kalimantan Tengah"
    d="m 268.61571,178.54789 0.35,-0.93 0.38,-0.29 1.2,-0.41 0.78,-0.47 1.18,-0.21 0.62,-0.52 0.15,-0.57 1.45,-0.37 0.91,-0.45 0.52,-0.91 -0.16,-0.45 -0.34,0.02 -0.45,-0.28 0.33,-0.81 -0.53,-2.07 -0.09,-1.3 -0.52,-1.83 -0.68,-1.13 0.61,-0.72 -0.02,-0.29 0.19,-0.23 0.04,-0.23 -0.69,-1.29 0.7,-0.59 -0.07,-0.42 0.16,-0.39 -0.05,-0.15 -0.89,-0.13 -0.52,0.14 -0.34,-0.23 -0.15,-0.42 0.34,-0.43 0.04,-0.36 -0.32,-0.41 0.02,-0.64 0.11,-0.44 0.37,-0.34 0.15,-0.38 -0.12,-1.2 -0.22,-0.52 -0.29,-0.16 -0.42,0.18 -0.11,0.45 -0.18,0.13 -0.42,0.1 -0.26,-0.19 -0.18,-0.44 -0.44,-0.11 -0.04,-0.77 0.55,-0.38 0.28,-0.43 0.88,-0.21 0.44,-0.55 0.49,0.4 0.3,-0.3 0.48,-0.15 0.37,0.42 0.81,-0.22 -0.07,-0.45 -0.26,-0.39 0.82,-0.49 0.28,0.16 0.04,0.49 0.31,0.14 0.09,-0.66 -0.14,-0.79 0.38,0.14 0.13,-0.53 1.11,0.22 -0.05,-0.29 0.21,-0.04 0.42,-0.48 0.17,-0.59 0.63,-0.33 0.36,-0.75 0.3,0 0.12,-0.54 0.22,-0.18 1.11,-0.01 0.31,-0.26 1.2,-0.21 0.12,-0.3 -0.33,-0.28 0.26,-0.48 -0.32,-0.64 0.28,-0.54 0.48,-0.15 0.46,-0.48 -0.17,-0.69 0.3,-0.37 0.59,-0.04 0.93,-0.56 0.22,-0.29 0.76,-0.28 1.02,0.07 0.46,-0.26 0.16,-0.57 0.15,-0.07 0.68,0.15 -0.29,-0.76 0.14,-0.86 0.49,0.53 0.37,0.15 1.2,-0.34 0.07,-0.31 -0.31,-1.11 0.19,-0.18 1.08,0.11 0.77,0.31 0.38,0 0.1,-0.07 -0.24,-0.72 0.83,-1.14 0.54,0.03 0.35,0.28 0.64,1.21 0.41,0.48 0.36,-0.44 0.41,0.18 0.85,-0.31 0.49,-0.44 0.37,0.14 0.01,0.61 0.37,0.26 0.24,-0.23 0.08,-0.47 0.85,0.17 0.09,-0.19 0.92,-0.08 0,-0.21 0.6,-0.35 0.89,-0.03 0.25,-0.42 0.74,-0.03 0.08,-0.85 0.58,-0.15 0.57,0.17 0.7,-0.12 0.67,-0.63 1.44,-0.42 0.33,-0.31 1.33,0.14 0.33,-0.24 0.37,0 0.27,-0.51 0.39,-0.12 0.13,0.35 0.5,0.01 0.28,0.51 0.15,0.13 0.13,-0.08 0.16,-0.49 0.66,-0.8 -0.19,-0.78 -0.78,-0.71 0.28,-0.21 0.2,-0.6 0.53,-0.37 0.42,-0.6 0.86,-0.18 0.56,-0.51 0.27,-0.57 0.36,-0.07 0.08,-0.33 -0.34,-0.2 0.44,-0.26 0.35,-0.79 -0.07,-0.22 -0.37,-0.05 0.18,-0.77 0.26,-0.38 -0.35,-0.24 -0.2,-0.35 0.16,-1.35 -1.55,-0.81 -1.03,-1.01 0.03,-0.19 0.63,-0.38 0.74,-0.2 1.38,0.25 0.92,-0.55 0.53,-0.41 0.06,-0.23 0.96,-0.82 0.16,-0.31 1.32,-0.76 0.27,-1.09 0.68,-0.42 0.4,0 0.19,-0.42 0.37,-0.17 0.19,-0.43 0.36,-0.25 0.23,-0.71 0.51,-0.29 0,0 0.49,0 0.42,0.33 0.25,-0.18 0.24,0.06 0.7,-0.24 0.54,0.09 1.28,-0.66 0.36,0.09 0.3,-0.12 0.73,0.45 0.33,0.97 -0.33,0.33 0,0.21 0.63,0.33 0.1,0.42 0.42,0.18 1.55,-0.18 0.73,0.18 0.51,0.43 0.7,0.12 0.21,-0.06 -0.06,-0.67 0.67,-0.45 1,-0.03 0.21,-0.39 0,-0.63 0.79,-0.03 0.89,-0.64 0.49,-0.65 0.55,-0.1 0.32,0.14 0.82,-0.6 0.5,0.07 0.39,-0.24 0.53,0.33 0.2,0.42 0.47,0.12 -0.3,-0.48 0.04,-0.23 0.8,-0.75 0.51,0.14 0.45,0.37 0.39,0.7 0.29,1.61 0.56,1.16 0.73,0.86 0.32,0.65 0.65,0.57 -0.05,0.71 -0.2,0.39 -1.19,0.83 -0.15,0.32 -0.34,-0.48 -0.17,-0.02 -0.73,0.05 -0.31,0.16 -0.11,-0.21 -0.27,-0.06 -0.67,0.43 -0.53,1.13 -0.19,0.2 -0.39,0.07 -0.02,0.35 -0.43,0.48 0.08,0.42 -0.37,0.88 0.29,0.5 0.59,-0.11 0.32,0.35 0.37,-0.02 0.24,0.31 0.1,1.44 0.45,0.85 -0.08,0.64 0.21,0.47 0,0.53 1.02,-0.19 0.9,0.24 0.76,-0.66 0.47,-0.23 0.47,-0.01 0.29,-0.66 2.42,-1.17 0.36,1.12 -0.42,0.58 -0.44,0.26 0,0.67 -0.55,0.95 0.29,0.45 -0.04,0.48 -0.42,0.08 0.19,1.46 0.37,0.1 -0.21,1.09 0.23,0.06 0.72,0.74 0.39,1.03 0.5,0.43 0.28,1.9 -0.03,1.19 0.41,1.01 1.68,0.3 0.79,0.69 0.6,0.98 1.32,0.84 0.23,0.29 0.21,0.95 0.42,-0.05 0.4,0.44 0.34,0.14 0.19,0.69 0.23,0.14 0.34,-0.33 0.32,-0.07 0.76,0.66 -0.03,0.26 -0.91,0.66 -0.45,0.53 -0.23,1.3 0,0 -0.35,0.31 0,0 -0.99,0.78 -0.5,-0.11 -0.39,0.32 -1.81,0.67 -1.85,0.14 -0.14,0.18 -0.89,3.88 -0.71,2.22 0.11,0.78 0.67,0.92 -0.25,0.81 -0.96,0.74 0,0.39 0.71,1.55 -0.39,0.81 -0.21,1.31 -0.32,0.03 -0.39,-0.28 -5.89,4.27 -0.57,-0.03 -0.22,0.32 0.04,0.63 -0.5,0.78 -0.7,0.55 -0.32,1.8 -0.46,0.6 -0.85,0.31 -0.36,-0.1 -0.21,0.39 0.14,0.24 -0.18,0.22 -0.35,0.28 -1,0.28 -1.52,3 -0.39,2.26 -1.46,2.3 -0.78,2.36 0,0.91 0,0 -2.42,-1.15 -1.86,-0.5 -1.22,0.09 -3.59,1.72 -1.85,0.28 -0.8,-0.03 -1.07,-0.65 0.49,-1.56 0.07,-1.58 -0.26,-0.91 -0.36,-0.53 -2.26,0.14 -0.45,0.49 -0.17,0.6 -1.27,0.29 -2.09,-1.33 -3.12,-3.26 -0.52,-0.07 -1.47,1.6 -0.11,0.57 0.44,0.57 -0.3,1 -3.31,2.03 -1.18,0.83 -0.7,0.72 -1.75,0.54 -0.32,-0.03 -1.98,-1.57 -1.93,-0.67 -1.04,-0.02 -1.45,0.56 -3.69,3.52 -0.61,0.34 -0.41,0.06 -1.45,-0.6 0.65,-2.28 -0.47,-3.66 0,-0.82 0.28,-1.08 -0.03,-0.72 -1.36,-2.43 -0.4,-1.6 -0.48,-0.07 0.07,0.8 -0.57,0.84 0.43,0.35 -0.1,0.45 -0.94,0.17 -0.3,0.33 -1.24,0.77 -0.17,-0.47 -0.91,-0.8 -0.74,-0.57 -0.43,-0.07 -1.48,0 -3.05,1.75 -1.22,0.53 -0.97,0.3 -1.48,0.2 -2.18,-1.54 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-ku"
    aria-label="Kalimantan Utara"
    d="m 388.44571,70.617885 -0.56,0.43 -1.29,-1.02 -0.47,-1.24 0.03,-0.41 0.16,-0.22 1.46,-0.12 0.82,0.25 0.15,0.32 -0.3,2.01 z m -4.73,-4.79 2.2,1.3 -0.01,0.2 -0.54,0.47 -1.69,-0.74 -1.93,-0.1 -0.64,-0.31 -0.4,-0.54 0.08,-0.43 0.91,-0.38 2.02,0.53 z m 5.69,-7.4 -0.78,0.29 -1.19,-0.87 -0.18,-0.89 0.07,-0.22 0.78,-0.85 0.49,0.05 1.25,1.01 0.1,0.47 -0.54,1.01 z m 2.78,-3.31 0.43,0.19 0.42,2.01 -0.56,0.44 -0.51,0.08 -0.61,-0.31 -3.52,-2.82 0.06,-0.26 0.9,-0.74 0.51,-0.03 1,0.35 0.19,0.38 0.58,0.42 1.11,0.29 z m -37.96,1.44 0.04,-0.93 0.33,-0.67 0.37,0.03 0.79,-0.91 0.4,0.06 0.14,0.33 0.41,-0.11 0.13,-0.57 0.72,-0.6 -0.14,-0.42 0.12,-1.04 0.53,-0.19 0.33,0.57 1.51,0.3 0.27,0.2 0.11,0.49 0.65,0.5 0.2,-0.13 0.39,-0.76 0.85,-0.33 0.13,-0.64 0.15,-0.11 1.41,0.21 0.3,0.18 1.52,-0.35 1.17,0.97 0.2,0.64 0.59,-0.14 0.23,-0.54 0.37,0.16 0.47,-0.08 -0.05,-0.62 0.54,-0.67 0.41,0.45 0.38,0.12 0.25,0.61 0.77,-0.24 0.53,0.16 0.31,-0.1 0.28,-0.16 0.26,-0.5 0.41,0.25 0.38,0.48 0.26,-0.11 0.49,0.28 0.69,-0.2 0.53,-0.41 0.73,0.18 0.29,0.23 0.65,0.06 0.28,0.3 0.34,-0.39 1.11,0.15 0.65,-0.17 0.59,0.11 0.64,-0.16 0.09,-0.19 0.53,-0.21 3.02,2.15 0.4,0.86 0.24,0.15 1.21,0.34 0.89,-0.26 0.24,0.17 0,0 -0.81,0.5 -0.91,0.28 -1.56,-0.45 -0.17,0.19 0,0.56 0.39,0.32 0.96,0.23 2.64,2.22 -1.75,0.26 1.66,0.95 1.56,0.17 1.27,1.34 0.04,0.26 -0.25,0.64 1.06,0.32 -0.08,0.25 -1.2,1.12 -1.07,0.21 -3.17,0.23 -2.67,-0.38 -1.8,0.3 -0.48,0.29 -0.44,0.65 0.03,0.41 0.56,0.87 1.48,0.93 1.26,-0.15 0.8,0.21 0.02,0.84 -0.28,0.52 1.76,0.92 -0.17,0.28 -1.26,0.17 -0.86,0.34 -0.29,0.46 -0.97,0.17 -0.17,0.34 0.54,0.32 2.01,0.35 2.71,1.18 1.22,2.08 -0.28,1.61 -0.01,1.26 1.02,0.18 0.8,0.49 0.21,0.33 0.14,1.34 0.23,0.72 2.78,2.74 0,0 -0.69,0.59 -1.29,0.15 -1.29,0.77 -0.36,-0.05 -1.39,-0.51 -1.13,-1.38 -0.46,-0.31 -1.08,0.26 -0.51,-0.1 -1.29,-0.61 -0.62,-0.46 -0.51,-1.13 -0.87,0 -1.6,0.41 -1.44,-0.31 -1.29,0.05 -2.01,1.18 -2.26,0.77 -1.75,1.13 -1.03,0.31 -0.72,0.05 -0.62,-0.31 0,-0.41 -0.29,-0.31 -0.77,-0.31 -0.57,-0.56 -0.51,0.05 -0.26,0.31 -0.31,1.33 -0.36,0.26 -0.82,1.38 -0.21,0.72 -0.05,2.2 -0.15,0.82 -0.67,0.41 -0.26,0.66 -1.08,0.56 -0.46,0.56 -0.1,0.67 0.31,1.18 -1.29,2.45 -1.6,2.15 -0.87,0.770005 -0.57,1.18 -1.03,0.87 -2.32,0.05 -2.31,0.87 -1.96,-0.05 -0.41,0.41 -0.26,1.58 -0.51,0.26 -0.77,0.92 -1.03,-0.2 -0.82,0.92 -0.77,-0.1 -0.57,-0.26 -1.34,0 -0.87,0.97 -0.67,-0.05 -0.46,-0.2 -0.41,-0.46 -0.15,-0.61 -0.31,-0.41 -0.51,-0.2 -0.72,-0.1 -0.82,0.46 -0.21,-0.26 -0.21,-1.02 -0.77,-0.87 -1.59,-0.46 -0.62,-0.51 -0.26,-0.46 -0.79,-0.42 0,0 0.49,-0.81 -0.18,-0.3 0.12,-0.75 0.8,-0.470005 0.52,-0.92 0.38,-0.31 0.13,-0.99 -0.11,-1.19 -0.13,-0.13 0.49,-0.66 -0.07,-0.27 0.56,-0.16 0.54,0.25 0.45,-0.64 0.67,-0.11 0.36,-0.34 -0.4,-0.81 0.05,-0.23 0.69,-0.52 -0.02,-0.22 -0.51,-0.25 -0.76,0.34 -0.2,-0.45 0.16,-0.96 -0.35,-0.19 -0.16,-0.29 -0.02,-0.82 0.34,-1.31 1.84,-0.2 0.78,-0.49 0.04,-0.23 -0.33,-0.43 0.31,-0.63 0.67,0.11 0.43,-0.23 0.51,-0.59 0.67,0 0.2,-0.59 0.45,-0.41 0.58,-0.18 0.78,0.02 0.6,-0.5 0.07,-0.31 -0.47,-0.34 -0.11,-0.34 -0.67,-0.79 -0.99,0.31 -0.31,-0.47 0.31,-0.38 0.09,-0.41 0,-0.49 -0.23,-0.14 0,-0.38 0.6,-0.52 0,-0.43 0.18,-0.34 -0.18,-0.27 -0.51,-0.13 -0.04,-0.18 0.96,-0.77 0.25,-1.06 1.59,-1.06 0.34,-0.83 0.61,0.65 0.04,0.41 1.23,-0.09 0.81,-0.77 1.03,-0.14 0.18,-0.34 0,-0.84 0.13,-0.25 0.81,-0.67 0,-0.2 -0.71,-0.52 -0.05,-0.18 0.42,-2.81 0.63,-1.26 0.34,0.02 0.4,0.63 0.4,-0.58 -0.58,-1.01 -0.13,-1.1 -0.38,-0.47 -0.16,-0.86 0.05,-1.55 0.14,-0.71 0.52,-1.04 0.04,-0.56 -0.05,-0.18 -0.78,-0.56 -0.13,-0.31 0.85,-0.23 0.45,-0.41 0.67,-2.08 0,0 0.01,-0.19 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-sa"
    aria-label="Sulawesi Utara"
    d="m 517.80571,102.64789 -0.89,1.24 -0.77,2.53 -1.01,1.83 -1.54,2.12 -1.32,0.57 -1.52,1.14 -1.2,1.17 -1.52,2.55 -0.41,1.12 -1.93,2.33 -2.09,1.07 -1.29,0.31 -1.01,0.01 -4.19,0.65 -2.95,0.7 -2.24,0.26 -1.02,-0.31 -2.22,0.02 0,0 0.27,-0.98 0.82,-1.43 -0.08,-1.01 0.16,-1.08 -0.31,-0.85 -0.54,-0.58 -2.02,-0.35 -1.21,-0.89 -0.62,-0.54 -0.27,-0.85 0.04,-0.46 -0.7,-0.7 -0.86,-0.23 -0.54,-0.39 -0.2,-0.81 0,0 2.33,-0.11 2.29,0.48 3,1 0.31,0.04 0.59,-0.34 3.84,0.91 1.58,-0.06 1.24,-0.73 5.33,-2.36 0.42,-0.53 0.83,-2.15 0.99,-0.4 2.68,0.17 0.23,-0.13 0.42,-0.58 -0.01,-0.61 -0.54,-0.32 -0.63,0.03 -0.26,-0.45 -0.03,-0.36 0.46,-0.78 1.13,-0.82 0.98,0.36 0.71,-0.05 2.02,-1.14 0.21,-0.54 -0.54,-1.05 0.05,-0.290005 2.62,-2.05 1.07,-0.09 1.71,0.49 0.68,0.55 -0.17,0.54 0.09,0.48 1.44,1.220005 -0.32,0.85 -0.6,0.35 -0.65,0.06 -0.32,0.25 z m 4.74,-20.790005 -0.21,0.07 -0.47,-0.2 -0.38,-1.48 0.45,-1.18 0.53,-0.24 0.55,0.33 0.12,0.26 -0.08,0.34 -0.75,0.85 0.03,0.45 0.38,0.56 -0.17,0.24 z m 3.02,-16.98 -0.22,0.56 1.01,1.29 0.17,-0.11 0.42,0.26 0.12,1.26 -0.64,0.96 -0.2,-0.14 -0.17,0.08 -0.09,0.62 -0.16,-0.11 0.02,-0.31 -0.33,-0.56 -0.5,0.02 -0.22,-0.29 -0.41,-0.12 -0.06,-0.29 -0.28,0.05 -0.3,-0.7 -0.03,-0.47 0.47,-1.04 -0.08,-0.16 -0.27,0 -0.11,-0.39 0.33,-0.12 -0.08,-0.14 -0.34,0.08 -1.17,-0.73 -0.22,-0.36 0.09,-0.92 0.73,-0.26 1.03,0.19 1.49,1.85 z m 19.42,-3.15 -0.29,0.05 -0.21,-0.3 -1.27,-2.8 -0.13,-1.03 0.27,-0.02 0.41,0.3 1.39,1.87 0.06,0.46 -0.23,1.47 z m 0.85,-3.22 -1.08,-0.15 -0.16,-1.28 0.72,-0.61 0.98,-1.85 0,-0.41 -0.21,-0.19 -1,-0.24 -0.17,-0.16 -0.29,-0.96 -0.04,-0.58 0.54,-2.47 0.35,-0.63 1.27,0.23 0.78,0.7 0.96,3.62 -0.78,1.17 -1.28,3.23 -0.59,0.58 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-sg"
    aria-label="Sulawesi Tenggara"
    d="m 446.92571,174.57789 1.63,0.42 0.58,0.26 0.45,0.54 0.39,0.14 0.7,-0.57 0.72,-0.21 0.4,0.08 0.59,1.35 -0.31,0.58 0,0.33 0.17,0.3 1.09,0.55 1.2,0.16 0.44,-0.24 1.11,-1.14 1.51,-0.58 0,0 2.65,1.08 1.98,0.56 0.64,-0.33 0.74,0.14 1.04,-0.05 0.44,0.23 0.51,0.68 1.08,0.21 0.16,0.33 -0.11,0.88 0.43,0.18 0.44,0.61 0.55,-0.1 0.42,1.04 0.53,-0.03 0.17,0.15 -0.11,0.21 0.13,0.43 0,0 -0.88,1.22 0.19,0.77 1.32,0.4 0.35,0.36 0.51,0.2 0.71,1.16 -0.15,0.41 -0.36,0.15 -1.82,-1.82 -0.61,-0.36 -0.75,-0.01 0.72,1.29 -0.42,1.26 -1.18,0.47 -0.03,0.39 0.83,1.32 1.66,1.2 2.21,1.22 -0.05,0.23 0.56,0.71 0.1,0.5 0.46,0.3 1.57,-0.14 0.61,0.1 0.1,0.4 -0.5,0.36 -0.16,0.97 0.66,0.34 0.11,0.36 -0.33,0.43 0.57,1.3 0.17,0.13 2.45,-0.18 -0.11,-0.42 -0.84,-0.61 -0.19,-0.42 0.21,-0.11 0.63,0.04 0.69,0.49 0.68,1.57 0.17,1.07 -0.13,2.76 -1.2,0.96 -0.79,-0.49 -1.68,-1.47 -0.3,0.05 -0.16,0.15 0.21,0.41 1.16,1.01 0.36,0.55 0.08,0.43 -0.28,0.34 -0.36,0.15 -0.3,-0.41 -0.56,0.26 -0.66,-1.32 -0.76,-0.5 -1.32,0.76 -0.76,0.25 -0.82,-0.1 -2.74,0.76 -0.75,-0.14 -1.33,0.74 -0.93,0.17 -0.62,1.16 -0.35,1.41 0.33,1.08 0.86,0.79 0.02,0.32 -1.25,1.3 -1.68,0.04 -1.53,-0.7 -2.06,-0.22 -0.56,0.27 -0.41,-0.1 -0.2,-0.41 -0.46,-0.3 -1.57,-0.61 -0.51,-0.5 -0.2,-0.51 -0.56,-0.56 -0.2,-0.45 0.25,-1.82 0.17,-0.14 0.58,-2.14 -0.09,-1.42 0.41,-1.16 0.51,-0.25 0.66,-1.42 -0.06,-1.41 -0.25,-0.56 -1.32,-0.51 -2.39,-0.35 -0.45,-0.35 -1.12,-1.62 -0.46,-0.2 -0.2,-0.36 0,-0.5 -0.51,-0.1 -0.61,0.1 -1.02,-1.36 -3.13,-2.72 -0.62,-0.79 -0.43,-0.2 -0.23,-0.68 -0.03,-0.82 0.36,-0.92 1.61,-2.19 0.7,-0.35 0.61,-1.54 -0.05,-2.32 0.15,-0.55 0.35,-0.45 0.02,-1.18 -0.19,-0.08 0.13,-0.38 -0.27,0.15 -0.24,-0.18 -0.12,-0.79 -0.13,0 -0.14,0.44 -0.57,-0.13 0.13,0.29 0.21,0.05 -0.04,0.23 -0.31,-0.03 -0.09,-0.71 -0.29,-0.21 -0.02,-0.21 0.47,0.15 0.47,-0.74 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-sn"
    aria-label="Sulawesi Selatan"
    d="m 444.96571,252.57789 1.11,-0.05 1.17,0.37 -0.33,0.47 -0.77,0.12 -3.17,-0.52 -0.43,-0.28 -0.01,-0.24 0.41,-0.27 0.97,0.31 1.05,0.09 z m -4.27,-4.15 1.12,0.55 0.46,-0.28 0.15,0.47 -0.25,0.81 -1.67,0.22 -0.61,-0.43 -0.22,-0.64 0.15,-1.19 0.42,0.11 0.45,0.38 z m -3.12,-10.68 -0.42,0.95 -0.34,-1.8 0.2,-1.27 -0.46,-2.48 -0.08,-4.31 0.39,-2.09 0.19,-0.34 0.23,-0.03 0.14,0.3 -0.02,0.65 0.46,0.83 0.7,2.68 -0.45,3.92 -0.54,2.99 z m -11.04,-76.1 0.4,0.54 0.34,-0.33 0.59,-0.13 0.92,-0.92 0.33,0.17 1.47,-0.13 0.13,0.58 0.84,0.38 1.8,0 1.34,0.58 0.8,-2.46 0,-0.42 0.29,-0.12 1.27,1.45 0.17,0.46 1.47,2.04 1.13,1.08 1.3,0.67 0.76,0.33 0.84,0 0.08,-0.33 0.46,-0.13 1.01,0.15 0.23,0.21 0.77,0.1 4.7,2 1.72,0.29 0.96,0.58 0.86,-0.07 0.68,0.12 1.27,0.98 0.62,0.21 0.83,0.06 0.67,1 0.45,-0.06 0.64,0.5 1.26,2.55 -0.62,0.17 -0.27,0.27 -0.77,1.49 -0.41,0.23 -0.25,0.76 0,0 -1.52,0.58 -1.1,1.14 -0.44,0.24 -1.2,-0.15 -1.09,-0.55 -0.17,-0.31 0,-0.33 0.31,-0.57 -0.6,-1.35 -0.39,-0.08 -0.72,0.2 -0.7,0.57 -0.39,-0.14 -0.45,-0.53 -0.58,-0.27 -1.64,-0.42 0,0 0.42,-0.46 -0.77,-1.11 -3.68,-0.97 -0.69,-0.05 -1.64,0.61 -1.83,1.09 -3.43,2.49 -2.96,1.84 1.14,3 1.33,0.97 0.58,0.24 0.52,0.88 -0.15,0.85 -0.08,3.5 0.57,1.33 0.32,2.23 -0.13,0.54 -1.16,1.86 -0.34,1.01 -0.18,3.35 0.77,1.06 -0.51,3.74 0.67,1.83 0.46,3.2 -0.54,1.82 -0.9,0.9 -0.52,0.32 -0.01,2.37 -0.73,2.79 2.04,3.47 1.37,4.59 -0.13,0.2 -0.83,-0.28 -1.01,-1.6 -0.36,-0.17 -1.87,0.52 -1.33,0.68 -0.83,0.24 -2.91,-0.58 -1.3,1.09 -0.25,0.75 -0.92,0.61 -1.93,-0.05 -0.31,-0.22 -0.24,-0.53 0.05,-0.28 -0.33,-0.38 -2.76,-0.96 -1.9,-2.82 -0.05,-1.1 0.46,-2.67 0.38,-0.8 1.2,-1.56 0.87,-2.18 0.08,-0.77 -0.38,-0.95 -0.19,-1.4 1.79,-2.95 0.49,-4.11 0.05,-2.35 -0.49,-3.72 -1.06,-1.71 -1.53,-2.99 0.55,-1.42 0.62,-0.86 -0.46,-1.39 0,0 -0.34,-1.87 -0.5,-1.17 -0.08,-0.92 -0.71,-0.67 0,-0.42 0.38,-0.29 0.38,-0.04 0.21,0.29 0.88,-0.25 0.25,-0.21 0.21,-0.58 0.67,-0.25 1.05,0.04 0.04,-0.38 -0.59,-0.67 -0.5,-1.17 0.29,-0.7 -0.1,-0.62 -0.26,-0.33 0.2,-0.88 0,-1.02 0.32,-0.75 0.75,0.29 1.05,-0.42 0.5,0 0.71,-0.79 0.21,-0.73 1.25,-0.92 0.23,-0.59 -0.1,-0.79 -0.2,-0.36 -0.56,-0.33 -0.92,-0.16 -0.16,-0.2 -0.26,-0.52 0,-0.85 -0.3,-0.33 -1.52,-0.73 0.04,-1.3 1.78,-1.28 0.46,-0.43 0.13,-0.36 0.72,-0.1 0.13,-0.33 -0.27,-0.89 1.02,-0.48 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-sr"
    aria-label="Sulawesi Barat"
    d="m 421.30571,141.43789 0.11,0.9 -0.22,0.56 0.01,0.95 0.25,0.89 0.16,1.39 0.09,0.25 0.38,-0.08 0.03,0.51 -0.55,1.21 0.05,0.55 -0.19,0.38 -1.55,0.19 -0.19,0.37 0.55,-0.19 0.11,0.24 -0.57,0.33 -0.65,0.08 0.01,0.26 0.49,0.63 0.32,0.21 0.35,-0.06 0.38,0.56 0.64,-0.07 0.57,-0.46 0.36,0 0.76,0.44 0.57,0.55 -0.08,0.27 -0.55,0.56 0.29,0.85 1.04,0.98 -0.08,0.63 0.39,0.13 0.44,0.76 -0.33,0.4 -0.11,0.54 0.4,0.27 0.62,-0.09 0.55,0.24 0.31,-0.12 0.05,2.76 0.14,0.34 -0.36,0.21 0.24,0.89 0,0 -1.02,0.46 0.26,0.9 -0.13,0.33 -0.72,0.09 -0.13,0.36 -0.47,0.43 -1.77,1.28 -0.04,1.3 1.52,0.73 0.29,0.32 0,0.85 0.27,0.53 0.16,0.19 0.92,0.17 0.56,0.33 0.2,0.36 0.1,0.78 -0.23,0.59 -1.25,0.92 -0.21,0.73 -0.72,0.79 -0.5,0 -1.05,0.42 -0.75,-0.29 -0.33,0.75 0,1.02 -0.2,0.88 0.27,0.33 0.1,0.62 -0.3,0.7 0.5,1.17 0.59,0.66 -0.05,0.38 -1.05,-0.04 -0.67,0.25 -0.21,0.58 -0.25,0.21 -0.88,0.25 -0.21,-0.29 -0.38,0.04 -0.37,0.29 0,0.42 0.71,0.67 0.08,0.92 0.51,1.17 0.34,1.87 0,0 -2.39,-0.92 -1.01,-0.14 -1.26,1.1 -0.5,0.09 -0.98,-0.15 -1.43,0.29 -1.53,0.68 -0.46,0.59 -0.19,-0.09 -1.4,-3.2 -0.13,-0.77 -0.04,-4.6 0.26,-0.25 0.67,-2.89 -0.09,-0.38 -0.3,-0.29 -0.95,-0.17 -0.71,0.33 -0.19,-1.53 0.38,-1.65 0.36,-0.7 0.37,-0.23 0.7,0.56 0.71,0 1.74,-1.15 2.39,-2.36 0,-1 -0.36,-1.06 0.04,-0.81 0.24,-1.24 1.18,-3.31 0.45,-0.61 0.46,-0.25 0.73,-0.24 0.58,0.27 0.32,-0.64 0.27,-1.64 -0.14,-0.3 -0.51,-0.28 -0.12,-0.24 -0.47,-1.72 0.02,-0.51 0.43,-1.07 -0.46,-2.2 -0.1,-1.27 0.03,-0.25 0.66,-0.49 -0.2,-0.95 -0.23,-0.32 0.04,-0.29 0.74,-1.49 1.75,-1.51 0.44,-1.99 0.53,-1.37 0.28,-0.54 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-st"
    aria-label="Sulawesi Tengah"
    d="m 491.70571,219.54789 -1.17,-0.09 -0.65,-1.23 -0.08,-0.8 1.31,0.15 0.49,0.4 0.17,0.36 -0.07,1.21 z m -27.91,1.73 -1,0.06 -1.68,-2.02 -0.98,-1.56 0.07,-0.81 0.85,-2.25 0.85,-0.57 1.03,0.21 0.2,0.17 1.36,2.6 -0.11,3.33 -0.17,0.61 -0.42,0.23 z m 12.09,-14.43 0.6,3.99 0.21,0.38 -0.08,1.01 -2.23,1.93 -0.8,1.74 0.07,0.47 0.47,0.37 0.44,1.02 -0.24,1.32 -0.71,1.21 -0.94,0.26 -1.63,-0.58 -2.47,-0.2 -0.47,-0.18 -0.19,-0.93 0.84,-3.01 0.26,-0.61 0.87,-0.52 0.15,-0.34 -0.13,-1.46 -1.01,-2.32 0.74,-1.61 0.38,-0.21 1.03,-0.05 1.14,-0.32 1.43,-1.12 1.63,-0.79 0.64,0.55 z m 8.55,1.04 0.04,2.14 -0.2,0.85 -0.61,-0.66 0.15,-1.02 -0.73,-1.1 -0.4,0.21 0.16,2.07 -0.36,0.25 -0.61,-0.25 -0.15,-0.25 0.05,-0.41 0.36,-0.51 -0.05,-0.35 -0.14,-0.15 -0.42,0.22 -0.54,1.34 -0.43,1.92 -0.18,2.77 0.73,0.62 0.37,-0.08 2.93,2.31 0.03,0.37 -1.24,1.59 -1.61,0.7 -0.34,-0.09 -0.57,-0.45 -1.67,0.76 -0.45,0.43 -0.23,0.69 0.68,0.05 0.23,0.33 -0.21,0.58 -1.27,2.01 -0.44,0.27 -2.56,-0.12 -0.9,-1.51 -0.61,-1.57 2.87,-4.36 0.8,-2.15 1.25,-5.5 -0.16,-2.8 0.35,-1.3 0.87,-1.75 2.04,-1.44 0.46,-0.13 0.36,0.13 -0.3,0.52 0.24,0.76 1.01,0.56 1,1.4 0.4,2.1 z m -2.3,-11.67 0.36,0.06 1.48,-0.35 0.72,0.69 0.35,0.72 -0.09,0.72 -1.57,2.06 -0.25,0.13 -1.36,-0.08 -0.88,-0.89 -0.88,-1.2 -0.18,-0.47 -0.02,-0.73 0.94,-1.04 0.66,-0.14 0.72,0.52 z m 2.16,-48.96 0.48,0.99 -0.7,1.14 0.85,1.58 0.44,-0.07 0.41,-0.99 0.48,-0.37 0.18,-0.48 0.59,-0.66 0.81,-0.37 2.51,1.18 -0.44,2.76 -0.67,0.4 -0.59,0.85 -0.52,0.04 -1.18,-0.55 -0.26,-0.59 -0.67,-0.66 -0.52,0.22 -0.26,0.48 -0.18,0.59 -0.11,1.69 -0.18,0.29 -0.33,0 -0.48,0.33 -0.52,-0.26 -0.44,0 -0.33,-0.15 -0.07,-0.4 0.18,-0.26 0.37,-0.04 0.81,-0.92 -0.3,-1.07 -0.26,-2.17 -0.19,-0.33 -0.41,0.26 -1.18,1.32 -0.26,1.07 -0.74,0.92 -0.04,0.29 -1.18,1.07 -0.41,0.18 -0.55,-0.11 -0.7,-1.62 -0.55,-0.22 -0.18,-0.33 0,-0.85 0.48,-1.84 1,-1.21 0.26,-0.51 0.33,-0.4 0.44,-0.04 0.74,0.44 0.37,-0.26 1.96,-0.59 0.63,0.7 0.44,-0.88 0.3,0 0.34,0.41 z m -33.95,-41.37 0.42,0.06 2.03,-0.31 0.94,-0.82 0.3,0 0.32,0.22 0,0.42 -0.2,0.29 -0.59,0.02 -0.24,0.15 0.21,0.11 0.17,0.7 0.59,0.84 0.92,0.96 0.57,0.26 0.66,0.17 5.74,-0.78 0.19,0.11 0.58,1.19 0.32,0.13 0.35,-0.08 0.87,-0.72 0.48,0.02 1.83,0.74 0,0 -2.26,0.85 -0.26,-0.03 -0.52,0.6 -0.38,0 -0.13,0.65 -0.3,0.27 -0.42,-0.17 -0.49,-0.52 -0.48,-0.8 -0.85,0.14 -0.79,0.61 -1.11,0.29 -2.07,0.96 -1.45,0 -0.48,0.42 -1.33,-0.05 -0.89,-0.51 -0.35,0.41 -0.02,0.96 -0.52,0.1 -0.97,-0.38 -1.06,0.38 -0.35,0.34 -0.06,1.06 -0.32,0.17 0.26,0.43 0.58,0.32 0.49,0.78 1.07,0.34 0.69,0.03 0.17,1.46 -0.29,0.5 0,0 -1.37,-0.41 -1.73,0.44 -0.62,0.82 -2,-0.24 -1.53,0.35 -0.59,-0.19 -0.42,-0.45 -1.92,-0.58 -0.81,-0.52 -3.39,-0.19 -1.14,0.65 -1.68,0.58 -1.7,1.71 -2.12,3.1 0.35,0.33 -0.54,0.83 -0.2,2.11 -0.59,0.63 -0.49,-0.07 0.07,1.34 -0.46,1 -0.05,1.36 0.37,0.56 0.05,0.85 0.61,1.46 -0.27,0.85 -0.13,2.21 0.29,0.72 1.21,1.8 2.38,2.64 0.19,0.46 0.48,0.28 0.36,-0.03 0.76,-0.52 0.33,-0.07 0.58,0.43 0.23,0.56 1.1,0.11 1.44,2.34 -0.45,1.51 0.07,0.59 0.28,0.46 0.52,0.22 1.03,2.16 0.51,0.06 0.82,-0.43 0.25,-0.56 0.51,-0.22 0.68,0.01 0,0.72 0.2,0.34 0.51,0.18 1.18,-0.16 2.43,0.3 0.43,-0.29 0.95,-1.24 1.08,-2.17 2.22,-2.78 0.39,-0.12 0.29,-0.47 0.86,-0.67 0.66,-1.19 0.62,-0.35 1.15,-0.29 0.21,-0.93 0.5,-0.15 0.34,-0.02 0.33,0.29 -0.33,1.48 0.25,0.37 0.25,0 1.13,0.65 2.18,0.25 0.91,0.39 1.32,-0.88 0.75,-0.14 0.69,0.28 0.49,0.02 0.51,-0.51 0.39,-1.97 1.5,-0.58 0.97,0.43 2.68,-1 3.73,0.53 1.7,-0.01 2.61,-0.26 0.7,-0.36 -0.07,-0.26 -1.44,-0.51 -1.99,-0.2 -0.47,-0.3 0.03,-0.27 1.48,-0.63 1.52,-0.21 1.82,0.03 0.5,-0.15 0.35,-0.65 0.23,-0.01 2.66,0.11 1.54,0.59 1.69,0.91 0.75,1.92 -0.14,1.24 -0.79,0.92 -0.34,1.94 -0.5,0.68 -0.32,0.21 -1.15,-0.18 -0.39,-0.2 -1.26,-1.46 -0.33,-0.9 -1.46,-0.34 -4.31,0.63 -0.4,0.54 -0.11,0.72 -0.49,0.92 -1.3,1.42 -1,1.73 -1.18,0.94 -2.07,2.22 -1.12,1.42 -3.72,2.08 -2.62,0.34 -1.01,0.66 -2,0.39 -0.66,0.5 -0.97,2.39 -0.85,0.86 -0.48,0.26 -1.08,0.19 -1.11,-0.06 -0.33,-0.6 -1.27,-1.3 -1.95,-0.84 -0.51,0.26 -0.17,1 0.87,2.52 0.38,-0.3 1.08,-0.06 0.91,1 1.53,2.23 0.85,0.34 0.91,-0.16 0.78,0.23 2.11,2.17 2.27,3.87 0.78,2.54 2.03,1.65 3.05,2.14 0.02,0.68 -0.72,1.11 -0.02,0.37 1.91,1.71 0.25,0.15 0.55,-0.25 0.93,0.68 -1.09,1.29 -0.98,-0.27 -0.33,0.32 0,0 -0.12,-0.43 0.11,-0.2 -0.17,-0.15 -0.53,0.02 -0.42,-1.04 -0.55,0.1 -0.43,-0.61 -0.43,-0.18 0.11,-0.88 -0.16,-0.32 -1.08,-0.21 -0.51,-0.69 -0.43,-0.22 -1.05,0.05 -0.74,-0.14 -0.65,0.33 -1.98,-0.55 -2.65,-1.08 0,0 0.25,-0.76 0.41,-0.23 0.77,-1.49 0.27,-0.27 0.62,-0.17 -1.26,-2.55 -0.64,-0.5 -0.45,0.06 -0.67,-1 -0.83,-0.06 -0.62,-0.21 -1.27,-0.98 -0.68,-0.12 -0.86,0.07 -0.96,-0.58 -1.72,-0.29 -4.7,-2 -0.77,-0.1 -0.23,-0.21 -1.01,-0.15 -0.46,0.13 -0.08,0.33 -0.84,0 -0.76,-0.33 -1.3,-0.67 -1.13,-1.08 -1.47,-2.04 -0.17,-0.46 -1.27,-1.45 -0.29,0.12 0,0.42 -0.8,2.46 -1.34,-0.58 -1.8,0 -0.84,-0.38 -0.13,-0.58 -1.47,0.13 -0.33,-0.17 -0.92,0.92 -0.59,0.13 -0.34,0.33 -0.4,-0.54 0,0 -0.24,-0.89 0.36,-0.21 -0.15,-0.34 -0.05,-2.75 -0.31,0.11 -0.56,-0.24 -0.62,0.09 -0.4,-0.27 0.11,-0.54 0.33,-0.4 -0.44,-0.77 -0.39,-0.12 0.08,-0.63 -1.04,-0.98 -0.28,-0.85 0.55,-0.56 0.08,-0.27 -0.57,-0.55 -0.76,-0.44 -0.36,0 -0.57,0.46 -0.63,0.08 -0.38,-0.57 -0.35,0.06 -0.32,-0.21 -0.49,-0.63 0,-0.26 0.65,-0.08 0.57,-0.33 -0.11,-0.25 -0.55,0.2 0.19,-0.38 1.55,-0.19 0.19,-0.38 -0.05,-0.55 0.55,-1.21 -0.03,-0.5 -0.38,0.08 -0.09,-0.25 -0.15,-1.39 -0.26,-0.9 0,-0.94 0.22,-0.56 -0.11,-0.9 0,0 1.92,-1.56 0.15,-0.99 0.61,-0.58 0.31,-0.02 0.9,1.93 0.21,0.97 0.57,0.9 0.21,0.03 0.29,-0.53 0.07,-0.52 -0.3,-1.82 -0.82,-1.07 -0.84,-2.81 0.14,-2.57 0.16,0 0.15,-0.75 0.64,-1.65 -0.33,-1.19 -1.36,0.42 -0.32,-0.15 -0.71,-0.49 -0.98,-1.82 1.1,0.19 -0.08,-0.58 0.86,0.44 0.51,0.41 -0.05,0.41 0.51,0.34 0.2,0.53 0.71,0.17 0.68,-0.78 0.39,-1 -0.04,-1.63 -0.33,-0.61 -1.34,-1.38 -0.12,-0.37 0.42,-0.27 0.82,0.29 0.91,0.03 0.07,-0.26 -0.29,-0.97 -0.59,-0.71 -0.03,-0.23 0.52,-0.81 0.04,-0.65 0.44,-0.68 0.65,-0.42 0.95,-0.11 0.55,-0.4 0.14,-0.78 -0.36,-1.65 0.02,-0.51 0.19,-0.35 0.74,-0.62 0.75,0 1.75,-0.97 0.28,-0.5 0.04,-1.51 0.23,-0.72 0.62,-0.45 0.6,-0.01 0.32,0.21 0.08,0.5 -0.22,1.14 0.13,0.4 1.39,0.93 2.68,0.49 0.47,-1.17 0.13,-0.77 0.63,-1.02 0.7,-0.73 1.12,-0.39 0.82,-0.87 0.5,-2.27 -0.18,-1.4 0.2,-0.77 2.11,-0.32 2.48,0.31 0.84,0.34 1.74,1.1 z"
    fill={getRegionColor("Kalimantan & Sulawesi")}
    stroke={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Kalimantan & Sulawesi") || isSelected("Kalimantan & Sulawesi") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
</g>

/* Indonesia Timur & Lainnya Group */
<g
  onMouseEnter={() => setHoveredRegionMap("Indonesia Timur & Lainnya")}
  onMouseLeave={() => setHoveredRegionMap(null)}
  onClick={() => handleRegionClick("Indonesia Timur & Lainnya")}
  className="cursor-pointer group/region transition-all duration-300"
>
  <path
    id="id-ma"
    aria-label="Maluku"
    d="m 584.81571,269.62789 -1.56,-0.07 -1.47,-0.72 -0.16,-0.33 1.05,-0.38 1.36,0.07 1.03,0.51 0.06,0.52 -0.31,0.4 z m -20.27,-2.88 1.84,0.65 1.74,0.15 0.87,-0.15 0.44,0.27 0.03,0.25 -1.58,1.67 -0.19,0.05 -3.38,-1.12 -0.48,-0.3 -0.68,-1.31 1.39,-0.16 z m 51.21,4.36 -0.67,0.05 -0.01,-0.23 1.59,-1.72 1.23,-0.67 0.59,-0.99 0.9,-0.99 0.33,-0.09 2.52,0.81 -0.63,0.62 -3.16,1.22 -1.08,0.77 -0.15,0.44 -1.15,0.74 -0.31,0.04 z m -17.94,-5.06 -1.26,-0.3 -1.91,-2.34 -0.14,-0.39 0.15,-0.73 0.1,-0.38 0.28,-0.31 1.63,-0.22 2.05,0.55 0.39,0.32 0.34,1.44 -1.63,2.36 z m -52.72,-6.75 0.81,0.01 0.43,1.34 -1.41,0.06 -1.68,0.51 -0.9,0.64 -0.97,1.19 -1.47,0.78 -2.43,-0.28 -2.73,-0.54 -1,0.02 -2.3,0.48 -2.23,1.79 -0.3,0.06 -0.18,-0.25 0.7,-2.67 2.76,-3.36 3.69,1.09 2.65,-0.46 1.24,-1.07 1.29,-0.6 2.3,-0.58 0.21,0.15 0.08,0.67 1.44,1.02 z m 11.67,-0.35 -0.26,0.13 -0.34,-0.07 -0.24,-0.41 0.37,-2 0.36,-0.23 1.69,0.55 0.06,0.26 -0.13,0.7 -1.51,1.07 z m 63.64,-2.43 -1.34,-0.42 -0.23,-0.53 0.31,-0.48 0.52,-0.19 2.33,-0.24 0.21,0.14 -0.74,0.9 -1.06,0.82 z m 11.54,-5.24 -0.73,0.31 -0.38,-0.07 -0.61,0.5 0.67,3.27 0,0.71 -0.85,2.56 -1,1.3 -2.96,2.18 -0.99,1.6 -0.06,1.26 -0.2,0.34 -0.46,0.24 -2.88,-0.28 -0.48,-0.24 -0.42,-2.3 1.82,-3.14 -0.23,-0.51 1.05,-2.85 1.2,-1 0.47,-0.18 0.91,-0.86 1.23,-1.49 1.36,-2.4 0.76,-0.41 1.3,-0.14 0.98,0.49 0.5,1.11 z m 3.24,-1.76 0.9,1.34 0.15,0.64 -0.27,0.52 -0.18,0.05 -0.84,-0.58 -0.41,-0.89 -0.99,-0.18 -1.17,0.26 -0.51,-0.1 -0.14,-0.22 0.1,-0.48 0.29,-0.2 3.07,-0.16 z m -56.61,1.75 -0.49,0.17 -1.51,-0.94 -0.23,-0.41 0.06,-0.21 0.32,-0.36 1.22,-0.74 1.39,0.76 0.08,0.2 -0.4,0.99 -0.44,0.54 z m 108.06,-14.83 -0.3,0.33 -0.63,1.45 -0.1,0.66 -0.63,1.22 -0.26,-0.23 -0.46,0.07 -0.07,0.4 0.17,0.46 0.3,0.17 0,0.4 -0.33,0 -0.33,0.2 -0.13,0.69 -0.66,1.02 -0.53,0.5 -0.3,0 -0.56,-0.43 0.07,-0.46 0.5,-0.46 0.33,-0.79 0.07,-0.83 0.4,-0.59 -0.3,0.03 -0.23,-0.3 -0.33,-0.89 0.1,-0.5 0.66,-0.46 0.73,-0.26 -0.03,-0.73 0.17,-0.23 0.69,-0.33 0.3,-0.53 0.99,-0.79 0.53,0.03 0.3,0.3 -0.13,0.88 z m -36.79,-7.18 -0.61,0.25 -0.82,-0.26 -0.44,-0.44 0.05,-1.24 -0.23,-2.15 -0.48,-1.37 0.11,-0.32 1.12,-0.32 1.81,3.45 0,1.13 -0.51,1.27 z m 33.85,-4.39 0.1,1.02 0.4,1.09 -0.63,0.13 0,0.3 1.32,0.66 -0.03,0.33 -0.17,0.26 -0.4,0.1 -0.76,-0.33 -0.03,0.5 0.4,0.26 0.07,0.23 -0.07,0.43 -0.26,0.13 -0.36,-0.07 -0.63,-0.5 -0.17,0.13 0,0.3 0.93,0.66 0.2,0.36 0.56,0.33 0.36,0.59 -0.36,2.31 -0.3,0.92 -0.66,1.12 -1.26,0.66 -0.5,-0.1 -0.23,0.2 0.36,0.99 0.53,0.33 -0.07,0.5 -1.09,0.99 -0.89,-0.26 -0.33,0.17 -0.23,0.56 0.1,0.33 0.5,-0.17 -0.03,0.5 -0.63,1.02 -0.69,0.46 -1.32,1.52 -0.03,0.66 -0.5,0.63 -2.05,0.89 -0.3,0.33 -0.46,-0.05 -0.36,-0.89 -0.33,-0.3 -0.69,0 -0.76,-1.32 0,-0.36 0.23,-0.2 0.36,-1.52 0.23,-3.11 0.3,-0.76 -0.03,-0.43 0.3,-0.99 -0.13,-1.75 -0.43,-1.52 0.66,-0.07 -0.43,-1.19 0.23,-0.56 0,-0.5 0.43,-0.36 0.17,0.17 0,0.33 0.26,0.03 0.5,-0.3 0.5,0 0.1,0.66 0.2,0.17 0.33,-0.1 0.46,-0.46 0.53,-1.32 0,-0.2 -0.5,-0.3 0.03,-0.3 0.17,-0.3 0.53,-0.4 0.07,-0.33 0.4,-0.33 0.26,-0.63 -0.07,-0.23 -0.3,-0.13 -0.5,0.3 -0.73,-0.59 -0.83,-0.1 -0.5,-0.53 0.07,-0.33 0.63,-0.69 0.99,0.63 0.36,0.03 1.29,-0.99 0.63,-1.65 0.76,-0.5 0.07,-0.63 -0.2,-0.86 0.17,-0.46 0.89,-1.22 0.63,-0.17 0.36,0.2 0.96,1.65 0.5,0.43 0.03,0.33 0.43,0.66 0.03,1.12 0.83,1.06 -0.07,0.5 -0.41,0.19 z m -30.73,3.18 -1.83,2.38 -0.17,-0.05 -0.01,-0.31 1.61,-5 0.34,-0.6 0.59,-0.56 2.22,-5.58 0.41,-0.17 0.57,0.08 0.33,0.7 -1.35,4.39 -0.53,0.65 -0.85,0.5 -1.17,1.6 -0.28,1.01 0.12,0.96 z m -76.67,-38.78 -2.08,0.41 -0.13,-0.13 0.26,-0.58 -0.01,-0.98 0.53,-0.39 1.21,0.12 0.92,0.91 -0.02,0.2 -0.68,0.44 z m 1.74,-1.65 0.82,0.29 0.36,-0.65 0.26,0.03 0.29,0.78 0,1.19 -1.44,0.22 -0.22,-0.09 -1.2,-1.68 -0.03,-0.31 0.22,-0.21 0.26,-0.02 0.68,0.45 z m -4.99,1.8 -0.64,1.16 -1,0.84 -2.11,0.61 -0.38,-0.04 1.81,-1.71 0.22,-0.45 -0.28,-0.12 -3.66,2.28 -0.75,-0.05 -0.42,-0.53 -0.03,-0.84 0.9,-0.99 1.08,-0.69 2.71,-0.52 0.77,-0.95 0.71,-0.29 0.55,0.13 0.57,0.33 0.15,0.24 -0.2,1.59 z m -12.15,-4.48 -1.94,-0.56 -0.69,-0.68 0.75,-0.6 0.78,0.1 0.94,0.88 0.46,0.66 -0.3,0.2 z m 2.43,-1.91 -1.74,-0.01 -0.6,-0.5 1.21,-1.1 0.83,-0.13 0.58,0.46 -0.04,1.13 -0.24,0.15 z m -13.48,-1.88 1.87,1.18 0.21,0.97 -1.03,-0.05 -0.22,0.36 0.2,0.74 0.75,0.68 0.53,-0.2 0.31,-0.33 2,0.66 -0.41,4.13 -0.34,0.63 -0.54,0.16 -0.66,-0.18 -0.72,0.18 -1.55,0.64 -2.58,1.38 -3,0.93 -3.2,-1.14 -2.18,-1.01 -2.42,-1.63 -3.43,-3.25 -0.47,-1.3 -0.14,-2.87 0.27,-0.56 1.23,-0.84 0.41,0.09 0.43,0.6 0.57,0.47 0.61,0.03 0.55,-0.75 0.68,-0.38 2.29,-0.6 5.55,-0.22 1.55,0.26 2.88,1.22 z m 48.47,-4.08 3.87,1.54 1.22,0.06 4.28,-0.38 0.66,0.17 3.68,2.61 0.71,1.81 0,1.37 0.27,0.91 0.45,0.52 1.21,-0.04 0.83,0.2 0.64,0.64 0.82,2.39 -0.07,0.62 -0.6,0.85 -0.25,2.54 0.15,0.81 -3.7,-1.45 -1.01,-1.06 -2.76,-1.61 -4.57,-1.54 -2.47,-1.26 -0.56,-0.74 -0.03,-0.85 -0.79,-0.63 -0.4,-0.13 -4.09,-0.31 -2.35,-0.33 -0.29,0.32 0.12,0.54 0.73,0.86 0.19,0.56 -0.25,0.57 -0.47,0.12 -3.66,-0.91 -1.05,-0.08 -1.63,-0.62 -0.75,-0.46 -2.88,0.12 -0.32,-0.26 0.16,-0.39 0.69,-0.62 0.04,-0.67 -0.69,-0.49 -0.88,-0.13 -1.92,1.21 -1.47,1.37 -0.25,0.47 -1.02,0.86 -2,0.44 -0.47,-0.02 -0.65,-0.27 -0.49,-0.42 -1.76,-2.61 -1.47,-0.99 -0.62,-2.36 -0.69,0.02 -0.78,0.79 -0.62,1.51 -0.33,2.23 -0.46,0.64 -0.43,0.11 -0.93,1.67 -0.33,1.39 -0.16,-0.25 -0.25,-1.04 0.52,-1.15 0.12,-1.25 -0.87,-1.35 -0.45,-1.37 2.21,-1.72 3.26,-3.96 3.97,0.1 2.83,-0.13 4.95,0.18 2.13,-0.48 0.88,-0.71 0.36,0.03 0.32,0.19 0.13,0.35 -0.03,1.35 0.53,0.61 0.55,0.32 1.38,-0.29 2.31,-1.47 0.33,-0.27 0.18,-0.7 0.48,-0.21 2.13,-0.15 1.78,0.54 2.45,1.02 0.45,0.6 z"
    fill={getRegionColor("Indonesia Timur & Lainnya")}
    stroke={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-mu"
    aria-label="Maluku Utara"
    d="m 533.85571,169.61789 -0.51,0.08 -0.53,-0.3 -0.47,-0.59 -0.35,-0.72 -0.25,-1.65 -0.89,-1.29 -0.62,-2.48 0.44,-1.09 0.25,-0.4 0.36,-0.23 0.59,0.08 0.79,0.69 0.02,0.43 -0.53,1.47 -0.03,0.61 2.04,4.47 -0.31,0.92 z m -10.97,-11.5 3.77,0.32 1.31,-0.17 0.54,-0.32 3.94,-0.12 6.23,0.53 -0.25,0.38 -1.41,0.6 -4.7,0.53 -8.89,0.55 -2.06,-0.97 -0.13,-0.22 -0.01,-0.83 0.63,-0.73 0.59,-0.09 0.18,0.38 0.26,0.16 z m -8.31,-1.81 0.97,0.34 1.85,-0.5 2.98,0.71 0.48,0.98 0.03,1.67 -0.38,-0.13 -2.39,-0.08 -1.8,0.27 -0.45,0.23 -0.14,0.58 -0.38,0.12 -2.51,-0.82 -1.18,0.27 -1.64,0.97 -2.04,0.57 -0.87,0.18 -2.05,0.06 -1.33,-2.3 -0.02,-1.07 0.7,-2.15 0.48,-0.55 2.34,-0.46 1.81,-0.01 5.54,1.12 z m 50.59,-4.71 3.99,2.32 0.53,0.45 0.29,0.51 0.03,0.43 -0.36,0.76 -0.84,0.46 -0.53,0.06 -6.1,-0.48 -1.14,0.66 -1.66,0.25 -1.94,-0.89 -0.65,-0.53 -0.27,-0.44 0.28,-1.04 -0.07,-0.5 0.22,-1.05 0.37,-0.73 0.3,-0.34 0.32,0.25 2.91,-1.8 1.61,0.31 2.71,1.34 z m -4.58,-2.91 -2.06,0.19 -0.67,-0.45 0,-0.18 0.86,-0.79 0.7,-0.24 1.8,0.72 -0.63,0.75 z m -5.13,-7.96 -0.7,0.24 -2.02,-0.46 -0.13,-0.19 0.02,-0.49 0.58,-1.84 0.24,-0.24 0.42,-0.1 0.45,0.1 0.65,1.22 0.49,1.76 z m 4.38,-8.13 1.94,2.51 -0.31,0.95 -0.7,0.67 -0.38,0.81 0.06,0.48 0.73,1.14 0.54,0.31 0.63,-0.38 1.23,-0.18 1.1,0.49 0.77,1.02 -0.06,0.51 -1.34,1.1 -1.06,0.29 -1.36,-0.58 -1.21,-1.47 -2.12,0.9 -0.44,-0.15 -0.34,-0.6 -0.61,-2.67 -1.72,-1.82 -0.23,-1.01 0.53,-1.97 0.87,-0.22 0.72,0.64 1.19,-0.26 0.88,-0.71 0.69,0.2 z m -6.72,3.57 -1.15,-0.07 -0.16,-0.44 -0.02,-3.52 0.65,-0.47 1.6,-0.17 0.4,0.46 0.38,1.67 -0.46,2 -1.24,0.54 z m 11.9,-40.140005 0.47,0.17 0.33,-0.09 0.42,0.12 0.96,0.87 0.27,0.5 0.43,3.340005 -0.82,2.98 -1.41,2.47 -1.27,1.05 -3.16,2.16 -0.39,0.59 0.05,1.02 0.42,0.71 1.68,1.19 0.69,0.29 0.86,-0.13 1.26,-0.95 0.2,-2.27 0.79,-1.33 1.11,-0.85 0.88,-0.11 0.78,0.14 0.57,-0.29 0.49,-1.03 -0.15,-0.47 -0.33,-0.27 -0.43,-0.05 -0.21,-0.82 1,-1.59 3.22,-2.23 1.17,-0.49 1.84,-0.51 1.36,-0.200005 1.02,0.03 0.39,0.07999 0.26,0.24 -0.47,7.82 -0.58,0.67 -3.78,2.21 -2.54,0.74 -1.49,1.48 -0.01,0.44 0.42,0.85 1.08,0.93 0.87,0.5 4.13,1.49 0.75,-0.03 0.75,0.16 0.32,2.48 -0.17,0.88 0.66,0.48 1.87,0.5 0.78,0.64 0.53,1.02 -0.89,-0.66 -0.67,-0.25 -4.69,-1.1 -1.57,-1.32 -1.61,-0.01 -1.38,0.2 -1.14,-0.3 -0.59,-0.34 -0.34,-0.49 -1.5,-0.26 -2.01,-0.18 -0.63,0.38 -0.26,0.33 -0.47,2.33 0.48,0.38 0.3,2.37 -0.69,1.13 0.04,1.35 2.61,6.84 0.99,1.85 0.76,1.01 1.31,2.23 3.26,3.24 -2.07,-0.11 -0.51,-0.17 -0.38,-0.36 0.13,-0.35 -1.73,-1.32 -1.49,-0.61 -0.54,-0.44 -1.36,-3 -1.44,-2.4 -2.42,-1.36 -0.95,-1.46 0.64,-4.83 -0.22,-2.24 -0.55,-2.46 -0.65,-0.36 -0.83,-0.88 -0.76,-2.32 -0.07,-0.95 0.39,-1.96 0.73,-0.76 0.54,-1.08 -0.08,-0.52 -1.85,-0.55 -0.2,-0.3 0.26,-0.98 -0.47,-1.64 -1.4,0.26 -0.13,-0.39 0.11,-2.59 2.16,-3.91 0.13,-1 -0.15,-0.38 0.75,-3.76 2.14,-3.19 3.77,-4.02 0.66,-0.56 1.85,-0.01 -0.24,1.12 -1.61,2.44 -0.42,0.5 -0.47,0.15 -0.69,0.55 -0.09,1.56 0.33,0.38 z m 10.85,-4.18 -1.92,0.09 -1.91,0.47 -0.54,-1.42 -0.32,-2.51 0.1,-1.04 1.03,-1.92 0.95,-1.18 1.5,-1.46 2.22,-1.05 0.25,0.05 1.88,2.57 0.15,0.79 -1.28,3.75 -0.89,1.6 -0.98,1.12 -0.24,0.14 z"
    fill={getRegionColor("Indonesia Timur & Lainnya")}
    stroke={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-nb"
    aria-label="Nusa Tenggara Barat"
    d="m 416.33571,271.95789 0.12,0.32 0.67,-0.3 -0.04,0.16 0.29,0.34 -0.27,0.41 -0.33,-0.23 -0.14,0.32 -0.19,0.07 -0.15,-0.16 -0.15,-0.95 0.19,-0.11 0,0.13 z m -44.16,-0.61 0.05,0.4 -0.18,0.3 -0.07,0.7 -0.57,0.51 -0.42,1.71 -1.6,2.38 -0.22,0.58 -0.77,0.98 -0.1,0.58 0.65,0.02 0.5,0.35 0.37,0.08 -0.47,0.63 -0.62,0.2 -0.1,-0.18 -0.23,0.03 -0.45,0.3 -0.62,-0.02 0.47,-1.48 -0.85,0.18 -0.4,0.38 0.1,0.53 -0.1,1.03 -0.4,-0.03 -0.17,-0.35 -1.17,-0.4 -0.37,0.13 -1.12,-0.18 -0.27,0.23 -0.4,-0.1 -0.15,-0.75 -0.3,-0.05 -0.87,0.18 -0.25,0.23 -0.4,-0.08 -0.27,-0.23 -0.22,0.05 -0.13,0.38 -0.3,0.08 -0.6,-0.43 -0.55,-0.65 -0.38,0.08 -0.45,-0.2 -0.62,0 -0.35,-0.4 -0.2,-0.63 0.4,-0.75 0.35,-0.08 0.07,0.38 0.77,0.43 0.3,0 0.57,-0.58 0.42,-0.05 0.45,0.25 0.27,-0.2 0,-0.18 0.32,0.02 0.25,-0.25 0.15,-1.61 -0.05,-1.58 -0.55,-0.54 -0.17,-0.78 0.45,-0.65 0.82,-0.48 0.1,-0.5 0.3,0.1 0.05,-0.15 0.97,-0.43 0.5,-0.78 0.9,-0.7 1.65,-0.6 1.12,0.1 0.8,0.25 0.45,0.3 2.4,0.55 1.4,1.13 0.11,0.31 z m 15.05,-3.68 1.15,-0.07 0.44,0.25 0.09,0.21 -1.26,0.92 -0.84,1.84 -0.7,0.95 -1,-0.63 0.61,-1.24 -0.19,-0.38 -0.24,-0.01 0.1,-0.57 -0.09,-0.66 0.58,-0.47 0.74,-0.32 0.61,0.18 z m 25.53,1.79 -0.69,0 -0.49,-0.4 -0.04,-0.9 0.32,-0.55 0.51,-0.37 0.79,0.08 0.39,0.4 0.15,0.53 -0.26,0.7 -0.41,0.46 -0.27,0.05 z m -19.25,-2.66 1.12,-0.13 0.4,0.2 0.45,-0.08 1.3,0.5 0.05,0.85 0.32,1.03 0.52,0.55 0.22,0.05 0.38,0.95 1.2,0.63 0.32,0.02 0.38,-0.35 0.67,-0.2 0.3,-0.65 1.07,-0.88 0.7,0 0.28,0.28 0.87,0.03 1.55,0.48 0.52,0.85 0.08,0.53 -0.13,1.56 -0.4,0.6 0.08,0.43 0.62,-0.2 0.22,-0.4 0.13,-0.8 -0.27,-0.4 0.05,-0.43 0.45,-0.85 0.33,-0.4 1.02,-0.73 0.42,0 0.17,0.23 1.02,-0.08 1.6,0.4 -0.17,0.68 0.08,0.45 0.95,1.43 0.05,0.95 -0.54,0.25 0.06,0.37 -0.16,0.21 0.39,0.62 -0.03,0.79 0.28,0.18 0.41,0 0.4,-0.28 0.54,-0.1 -0.36,-0.56 0.39,0.05 0.25,-0.15 0.08,-0.35 0.32,-0.2 0.33,0.5 -0.13,0.68 -0.33,0.45 0.15,1.13 -0.65,0.53 -0.35,-0.1 -0.33,0.13 -0.9,-0.3 -1.2,0.23 -0.52,-0.65 -0.6,-0.4 -0.47,0.2 -0.15,0.35 -0.25,0.05 -0.8,-0.25 -0.62,0.05 -0.17,-0.18 -0.38,0.2 -0.2,0.38 -0.53,0.25 0.1,0.13 0.52,0.23 2.75,-0.02 0.8,0.45 0.17,0.45 -0.4,0.33 -1.37,0.18 -0.47,-0.13 -0.77,-0.5 -0.85,-0.2 -1.22,0.23 -2.22,1.03 -1.07,0.25 -1.25,-0.48 -0.33,-0.73 0.11,-0.64 0.65,-0.8 0.08,-0.35 -0.15,-0.28 0.25,-0.43 -0.17,-0.48 -0.28,-0.4 -0.15,0 -0.1,0.18 0.07,0.55 0.15,0.1 -0.13,0.28 -0.3,0.2 -0.42,-0.13 -0.38,0.58 -0.65,0.3 -0.13,0.53 -0.47,0.11 -1.37,1.38 -0.92,0.38 -0.82,-0.6 -0.3,0 -0.27,0.23 -0.73,0.05 -0.32,0.6 -0.5,0.25 -0.35,0 -1.07,0.63 -0.62,-0.23 -0.18,-0.2 0,-0.3 -0.65,0.2 -0.15,0.28 -0.52,0.03 -0.3,-0.25 -0.3,0 -0.47,0.13 -2.4,1.36 -2.37,0.8 -1.3,0.08 -1.65,-0.55 -1,0.05 -0.97,1.01 -1.67,0.4 -1,-0.35 -0.32,-0.4 -0.65,-0.13 -0.37,0.25 -1.92,-0.73 -0.79,-0.48 -0.3,-0.5 0.23,-0.3 0.05,-0.38 -0.13,-0.23 0.17,-0.85 0.33,-0.05 0.22,-0.23 -0.08,-0.4 0.77,-0.15 -0.15,-0.55 -0.65,-0.98 0.27,-0.23 -0.42,-1 0.67,-1.41 0.47,-0.13 0.1,-0.2 -0.22,-0.83 0.47,0.33 1.58,-0.25 2.32,-1.58 0.67,-0.88 0.5,-0.15 0.3,0 0.97,0.6 0.23,-0.05 2.95,1.2 0.2,-0.48 0.45,-0.4 0.62,-0.23 0.45,0.15 1.17,-0.13 0.25,0.28 0.4,0.02 0.47,0.48 0.62,-0.05 0.32,0.95 -0.15,0.25 -0.62,0.18 -0.08,0.18 0.18,0.25 0.47,0.23 0.9,-0.08 -0.32,-1.3 0.4,-0.13 0.37,0.95 0.55,0.02 0.05,0.45 -0.8,0.08 0.32,0.38 -0.1,0.6 0.32,1.21 0.3,0.45 1.5,-0.3 1.3,0.55 0.35,0 1.47,-1.21 1.37,-0.3 0.67,0.08 0.37,0.35 1.57,-0.63 -0.2,-0.75 -0.38,-0.1 -0.13,-0.35 -0.57,-0.15 -0.15,0.25 -0.35,-0.58 -0.62,-0.38 -0.3,-0.5 -0.37,0.1 -0.5,-0.73 -1.67,0.2 -2.92,-1.86 -0.8,-1.03 -0.92,-0.83 -0.17,-0.35 0.32,-1 1.15,-0.83 0.7,0.05 1.7,-0.8 0.55,0.38 z"
    fill={getRegionColor("Indonesia Timur & Lainnya")}
    stroke={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-nt"
    aria-label="Nusa Tenggara Timur"
    d="m 487.54571,308.45789 0.71,-0.08 0.12,0.16 -1.19,1.4 -0.37,0.13 0.13,0.18 1,0.14 0.21,0.82 -0.48,0.59 -0.94,-0.03 -0.59,0.29 -0.29,0.36 -0.77,0.29 -0.18,0.34 0.07,0.36 -0.37,0.86 -0.26,-0.09 -0.37,0.24 -0.48,-0.33 -0.39,-0.05 -0.5,0.28 -0.35,0.49 -1.76,0.09 -0.57,0.41 0.34,0.34 -0.29,0.53 -0.38,0.01 -0.12,-0.3 -0.46,0.04 -0.08,-0.16 -0.6,0.15 -0.12,0.37 -0.5,-0.3 -0.09,-0.49 0.14,-0.8 -0.46,-0.88 0.13,-0.37 0.85,-0.37 0.65,-0.04 0.63,-0.33 0.73,0.11 0.37,-0.22 0.78,-0.09 1.41,-1.37 0.51,0.04 0.48,-0.32 0.22,-0.65 0.44,0.03 -0.07,-0.4 0.83,-0.88 1.73,-0.78 0.2,-0.83 0.61,0.63 -0.33,0.24 0.07,0.24 z m -24.85,-1.04 0.71,0.12 0.16,0.18 -0.19,1.32 -0.3,0.35 -0.58,0.18 -0.57,0.6 -0.74,0.46 -0.61,0.1 -0.51,-0.25 -0.99,0.09 -1.1,-0.67 2.61,-1.46 0.22,-0.83 0.41,-0.25 0.67,-0.22 0.81,0.28 z m 26.17,-4.8 0.53,-0.11 0.09,0.45 -0.78,0.26 -0.12,0.38 -0.4,0.22 -0.17,-0.01 -0.01,-0.33 -0.44,-0.04 0.01,0.41 0.28,0.14 0.14,0.34 -0.09,0.29 0.13,0.34 -0.43,-0.06 0.11,0.28 0.2,0.07 -0.11,0.42 -0.4,-0.01 -0.14,-0.47 -0.19,-0.05 -0.38,0.07 -0.25,0.48 -0.15,0.02 -0.25,-0.44 0.07,-0.53 -0.15,-0.26 0.43,-0.58 0.52,-0.27 0.52,-0.87 0.15,-0.58 0.99,-0.39 0.22,0.33 0.07,0.5 z m -59.68,-13.46 0.37,0.25 0.47,0.87 0.42,0.37 0.49,0.15 1.01,-0.22 0.27,0.12 0.39,0.6 0.12,0.47 0.07,1.21 0.39,0.5 0.69,0.05 0.37,0.45 0.2,0 0.71,-0.4 1.72,-0.42 0.47,0.55 0.07,0.42 1.7,0.87 0.3,0.87 1.18,2.21 1.01,0.35 1.06,0.62 0.49,0.7 0.34,1.07 -0.22,0.8 -0.69,0.6 -0.47,0.07 -0.62,0.94 -0.86,0.57 -0.62,0.02 -0.42,0.35 -1.03,-0.2 -0.49,0.12 -0.91,0.47 -0.07,0.35 -0.25,0.27 -0.32,0.02 -0.79,-0.45 -0.57,-0.55 -1.45,0.05 -0.71,-0.12 -0.42,0.1 -1.11,-0.5 -0.74,-0.72 -0.37,-0.12 -0.74,-0.9 -0.44,-0.1 -0.15,-0.15 0.17,-0.35 -0.25,-0.62 -1.04,-1.19 -0.67,-0.2 -0.07,-0.32 -0.47,0 -0.05,-0.47 -1.28,-0.2 -0.27,0.07 -0.3,-0.45 -1.22,-0.81 -0.25,-0.3 -0.25,-0.75 -0.32,0 -0.31,0.23 -0.22,-0.37 -0.49,-0.2 -1.21,-0.17 -0.84,-0.3 -0.94,0.4 -0.27,0.5 -1.01,-0.52 -0.37,0.1 -0.22,-0.35 -1.55,-0.12 -0.57,0.1 -0.12,-0.15 -2,-0.67 -0.42,-0.3 -1.01,-1.37 -0.67,-0.5 -0.32,-0.55 0.64,-1.09 0.57,-0.55 0.67,-0.4 1.45,-0.35 1.13,-0.67 0.29,0.07 0.25,0.27 1.01,-0.5 0.49,-0.07 0.76,0.32 1.06,0 0.91,-0.3 1.26,0.32 0.79,-0.52 1.03,-0.02 0.74,0.52 1,0.22 0.34,-0.07 0.59,0.25 0.59,-0.55 1.18,-0.72 0.57,-0.84 0.2,-0.05 0.54,1.02 0.9,0.96 z m 85.11,-7.52 0.2,0.08 -0.3,0.63 -0.01,0.52 0.23,0.36 0.51,0.25 0.45,-0.01 0.67,-0.52 0.61,-0.17 0.32,-0.34 0.28,-0.63 0.41,0.45 0.26,0.05 0.61,0.51 0.02,0.85 -0.26,0.89 0.15,0.75 -0.69,0.08 -0.64,0.38 -0.03,0.14 -0.72,-0.56 -1.04,0.02 -0.28,0.57 -0.05,0.39 0.26,1.08 0.97,0.67 0.04,0.58 0.48,0.56 0.16,1.19 0,0 -0.91,0.65 -0.77,0.86 -0.17,1.64 -0.53,0.56 -1.11,0.46 -0.51,0.45 -1.46,1.86 -0.61,1.02 -0.67,0.25 -0.8,0.79 -1.89,1.1 -0.65,1.39 -1.42,1.07 -0.57,0.26 -0.48,0.01 -3.42,-0.29 -0.48,0.09 -0.46,0.19 -0.51,0.51 -0.16,0.44 -0.78,0.47 -0.28,0.37 -1.01,0.13 -1.19,0.54 -0.25,0.31 -1.29,0.4 -0.77,0 -0.9,0.22 -0.54,-0.26 -0.3,0.01 -0.71,0.35 -0.27,-0.35 -0.97,-0.38 -1.36,0.51 0.04,-0.53 0.23,-0.19 0.38,-0.82 -0.13,-0.69 0.58,-0.22 0.07,-0.66 1.49,-0.63 0.61,-0.04 0.55,-0.38 1,-0.38 0.49,-0.86 -0.2,-0.28 -1.01,-0.35 -0.3,0.12 -0.59,-0.1 -0.42,0.18 -0.23,0.35 -0.3,-0.09 -0.12,-0.19 -0.01,-1.81 0.36,-0.47 0.28,-0.1 0.33,0.09 0.4,-0.48 0.11,-1.07 -0.45,-0.66 0.49,-0.2 0.19,-0.35 0.04,-0.64 -0.23,-1.16 1.2,-1.24 0.77,-0.31 0.15,-0.6 0.3,-0.26 0.19,0.02 0.48,-0.39 0.62,-0.2 0.33,-0.6 0.54,-0.18 0.09,-0.34 0.39,-0.28 0.19,-0.43 0.33,-0.27 0.87,-0.06 0,0 0.88,1.19 0.46,-0.02 0.26,0.32 0.41,-0.11 0.2,-0.48 0.7,-0.42 0.21,0.04 0.83,0.81 0.25,0.61 -0.14,0.86 1.21,-0.28 0.23,-0.5 -0.22,-0.45 0.55,-0.68 -0.12,-0.25 0.11,-0.3 0.17,0.02 0.31,-0.4 0.49,-0.07 0.14,-0.43 0.3,-0.15 -0.12,-0.56 0.2,-0.43 0.04,-0.59 0.19,-0.24 -0.03,-0.31 0,0 0.45,0.12 0.85,-0.09 0.88,-0.31 1.51,-1.21 0.08,-0.56 0.79,-0.09 0.96,-0.7 1.07,-0.24 0.52,-0.45 0.87,-0.3 z m -88.95,-2.35 -0.42,-0.02 -0.01,-0.27 0.26,-0.27 0.25,0.14 -0.08,0.42 z m -2.21,-0.28 -0.05,0.15 -0.6,-0.24 0.44,-0.22 0.21,0.31 z m -1.1,-2.63 -0.24,0.15 -0.15,-0.13 -0.31,0.05 -0.15,0.28 0.27,0.28 -0.2,0.01 -0.41,-0.41 1.06,-0.68 0.15,0.07 -0.02,0.38 z m 0.7,-0.78 0.29,0.01 -0.01,0.61 0.19,0.69 0.1,-0.21 0.47,-0.04 0.02,-0.24 -0.33,-0.35 0.4,0.15 0.17,-0.46 0.37,0.12 0.35,-0.19 0.51,-0.01 0.23,0.18 -0.12,0.58 -0.7,0.13 -0.12,0.38 -0.22,0.17 -0.19,0 -0.04,-0.23 -0.2,0.01 -0.23,0.37 -0.08,0.37 0.48,0.18 0.15,0.3 -0.05,0.28 -0.6,0.67 -0.27,-0.01 -0.04,-0.34 -0.26,-0.26 -0.74,0.31 -0.21,-0.67 0.27,-0.86 0.24,-0.12 0.41,0.11 -0.15,-0.5 -0.23,0.21 -0.15,-0.08 0.18,-0.11 0.04,-0.36 -0.43,-0.8 0.32,-0.13 0.18,0.14 z m 47.22,-3.16 0.58,0.33 0.11,-0.2 0.11,0.18 -0.14,0.53 -0.43,0.36 -0.57,-0.16 -0.36,-0.44 0.05,-0.52 0.65,-0.08 z m -50.22,0.41 -0.01,0.47 0.18,0.11 1.15,0.21 0.38,-0.19 -0.04,0.65 0.15,0.26 -0.14,0.02 -0.22,-0.3 -0.09,0.19 0.17,0.26 0,0.69 0.22,0.1 -0.91,0.13 0,-0.48 -0.37,-0.08 -0.05,0.29 -0.34,0.33 -0.37,0.03 0.18,0.35 0.25,-0.03 0.2,-0.23 0.05,0.13 -0.16,0.25 -0.04,0.15 -0.13,0.21 -0.39,-0.06 -0.33,0.46 0.38,0.45 -0.14,0.37 0.41,0.23 -0.52,0.25 -0.61,-0.48 -0.52,0.22 0.09,-0.5 0.39,-0.33 0.09,-0.61 -0.04,-0.21 -0.36,-0.28 -0.2,0.09 0.24,-0.5 -0.25,-0.25 0.28,-0.48 0.2,0.05 0.38,-0.2 0,-0.39 0.19,-0.04 -0.02,-0.23 -0.32,-0.13 0.42,-0.3 -0.03,-0.2 -0.2,-0.1 -0.05,-0.47 0.5,0.12 0.06,-0.44 0.29,0.44 z m 63.8,-0.41 0.08,0.32 -0.33,0.28 -1.33,0.5 -0.46,-0.02 -0.36,-0.21 -0.72,0.61 -0.78,1.45 -0.46,0.27 -0.41,-0.04 -0.28,-0.47 0.25,-1.02 1.08,-0.58 0.06,-0.5 0.43,-0.44 0.39,-0.03 0.39,0.23 0.32,-0.23 1.37,0 0.39,-0.21 0.37,0.09 z m -24.91,-2.28 0.2,0.03 0.22,0.49 -0.1,0.34 -0.26,0.15 -0.77,-0.25 -0.17,0.13 -0.08,-0.1 0.19,-0.14 0.22,-0.6 0.31,-0.14 0.24,0.09 z m 25.8,-1.04 0.13,0.09 0.21,-0.26 0.22,-0.04 0.36,0.31 0.62,0.05 0.59,0.32 -0.29,0.47 -0.23,0.08 0.06,1.02 -0.28,0.6 -0.96,0.12 -1.05,-0.18 -1.87,0.44 -0.41,-0.16 -0.77,0.15 -0.05,-0.72 0.61,-1.06 1.2,-0.69 0.68,-0.59 0.66,0.09 0.43,-0.26 0.14,0.04 0,0.18 z m 18.17,1.97 -0.84,1.05 -0.15,1.07 -1.34,1.24 -1.03,0.15 -0.23,-0.16 0.2,-0.81 -0.55,-1.3 -0.8,-0.04 -0.68,0.5 -0.01,0.17 -0.56,-0.16 -0.01,-0.21 0.48,-0.54 0.33,-0.98 1.63,-0.93 0.51,0.3 0.04,0.67 0.17,0.15 0.39,-0.11 0.64,-0.67 0.19,-0.46 0.66,-0.38 0.72,-1.22 0.42,-0.35 0.64,-0.01 0.23,0.19 0.09,0.39 -0.44,0.82 0.08,0.98 -0.19,0.35 -0.59,0.3 z m -7.27,-2.47 1,0.12 0.44,0.63 -1.47,0.55 -0.63,-0.16 -0.72,0.28 -0.38,0.48 -0.07,0.47 -0.59,0.6 -0.07,0.32 -0.4,0.48 -0.36,-0.04 0.03,-0.25 -0.15,-0.08 -0.43,0.01 -0.54,0.58 -0.47,0.24 -0.15,0.38 0.38,0.48 0.11,0.5 -0.53,0.62 -0.58,-0.04 -0.28,-0.7 -0.21,-0.09 -0.72,0.32 -0.47,0.73 -0.39,0.11 -0.78,-0.31 -0.2,-0.4 -0.52,-0.28 -0.41,0.35 -0.88,-0.13 -0.19,0.24 -0.35,-0.3 0.03,-0.42 0.38,-0.01 1.28,-1.07 0.43,-0.85 0.82,-0.27 0.21,-0.23 0.78,-0.13 0.59,-0.42 -0.74,-0.75 -0.42,-0.07 -0.98,0.17 0.6,-0.73 0.45,-0.2 0.28,0.24 0.64,0.08 0.48,-0.48 0.58,-0.11 0.63,0.09 0.12,0.09 -0.24,0.25 -0.12,0.47 -0.75,0.86 -0.04,0.27 0.94,0.32 0.71,-0.56 -0.01,-0.32 -0.31,-0.15 -0.01,-0.43 0.5,0 -0.07,0.35 0.08,0.16 0.58,-0.5 -0.17,-0.7 -0.38,-0.13 0,-0.32 0.7,-0.09 0.23,0.12 -0.04,0.4 0.71,0.15 0.13,-0.15 -0.12,-0.46 1.52,-0.93 0.98,0.75 z m 11.71,-1.52 1.44,0.1 -0.18,0.33 -0.02,0.69 0.25,0.16 0.83,-0.5 1.68,-0.32 1.33,0.26 1.46,0.03 0.77,-0.36 0.84,0.18 0.64,-0.15 0.93,0.05 0.7,1.39 -0.08,1.14 0.12,0.51 -0.38,0.33 -0.92,0.25 -3,0.12 -1.57,0.61 -1.08,0.07 -1.36,-0.16 -1.07,0.69 -0.88,0.2 -0.26,-0.31 -0.56,-0.13 -1.21,0.71 -0.16,-0.03 -0.07,-0.31 -0.88,0.1 -0.39,-0.38 0.03,-0.35 0.1,-0.31 0.95,-1.14 0.05,-0.38 0.41,-0.13 0.79,-0.64 0.64,-0.08 0.54,-0.33 -0.16,-0.13 -0.66,0.12 -1.59,0.79 0.08,-0.48 -0.17,-0.38 0.96,-1.29 0.35,-0.37 0.76,-0.17 z m -27.53,-0.26 0.78,0.51 0.03,0.44 -0.2,0.56 0.28,0.33 0.05,0.6 0.68,0.69 0.02,0.41 -0.71,0.68 -0.29,0.05 -0.67,-0.38 -0.21,0.07 -0.58,0.85 0.23,0.57 -0.12,0.6 -0.46,0.07 -0.52,-0.36 -0.62,-0.17 -0.16,0.15 0.11,0.87 0.88,0.93 0.05,0.6 -0.21,0.37 -0.88,0.34 -0.84,-0.01 -0.11,0.41 -0.21,-0.16 -0.83,0 -0.84,0.52 -0.27,-0.08 -0.24,0.2 -0.48,0.07 -0.58,0.74 -1.97,0.65 -0.76,0.08 -0.53,-0.2 -1.08,0.26 -0.71,-0.23 -0.69,0.12 -0.35,-0.32 -1.05,0.04 -0.44,0.13 -0.3,0.43 -0.22,0.04 -0.5,0.5 -1.89,0.67 -0.96,0.02 -0.22,0.3 -1.19,0.48 -0.87,-0.07 -0.52,-0.41 -0.52,-0.07 -0.19,0.14 0.06,0.45 -0.15,0.35 -0.25,0.07 -0.31,-0.14 0.32,-1.03 -0.6,-0.24 -0.49,-0.4 -0.74,0.15 -2.52,-0.32 -0.24,0.04 -0.17,0.6 0.06,0.85 -0.43,0.42 -0.57,0.17 -0.71,-0.39 -1.36,0.14 -0.29,-0.15 -1.58,0.6 -0.92,0.61 -0.43,-0.02 -1.47,-0.49 -0.92,-0.75 -0.28,-0.8 -0.24,-0.09 -0.81,0.18 -0.34,0.75 -0.46,0.12 -0.95,-0.39 -0.81,-0.06 -0.89,-0.9 -2.6,0.02 -0.78,0.14 -0.24,-0.13 -1.23,0.63 -0.3,-0.18 -0.29,0.16 -1.15,-0.3 -0.81,-0.84 -0.33,-0.05 -2.23,0.61 -0.87,0.12 -0.42,-0.09 -0.36,0.38 0,0.32 -0.21,0.07 -0.42,-0.13 0.13,-0.27 -0.16,-0.09 0.01,-0.46 -0.8,-0.07 -0.15,-0.31 -0.52,-0.44 -0.06,-0.37 0.01,-0.25 0.09,-0.35 -0.1,-0.23 0.23,-0.46 0.01,-1.12 -0.22,-0.1 0.09,-0.33 0.48,-0.52 -0.05,-0.15 0.5,-0.17 0.32,-0.37 0.08,-0.55 -0.34,-0.44 -0.07,-0.39 0.42,-0.04 0.04,0.58 0.3,0.06 0.11,0.17 0.48,-0.32 0.24,0.01 0.4,-0.42 0.5,0.47 0.24,-0.36 -0.25,-0.14 0.02,-0.24 0.35,-0.56 0.51,0.04 0.24,-0.17 0.21,0.01 0.14,0.43 0.22,0.18 -0.18,0.36 0.38,0.04 0.21,-0.39 0.01,-1 0.63,0.29 0.25,-0.43 0.15,0 0.33,-0.74 0.24,0.04 0.49,-0.15 0.24,-0.25 0.49,-0.04 0.71,-0.03 0.78,0.2 0.71,-0.25 0.07,-0.47 0.19,-0.17 0.46,0.38 -0.01,0.33 0.4,0.24 0.85,-0.33 0.51,0.29 0.72,0.01 0.17,-0.22 -0.24,-0.27 0.11,-0.2 0.75,0.35 0.73,0.89 0.49,-0.04 0.43,0.38 1.17,-0.15 0.9,0.29 1.15,-0.01 0.53,-0.18 0.5,0.07 -0.03,0.35 0.13,0.13 0.5,-0.03 0,0.36 0.21,0.39 0.71,-0.1 0.65,0.28 0.63,0.04 0.38,0.26 0.43,-0.08 0.75,0.46 0.78,0.1 0.49,0.21 0.75,1.21 1.22,0.56 0.85,-0.45 0.25,0.31 0.33,0.13 0.21,0.53 0.51,-0.6 0.61,-0.2 -0.25,-0.22 -0.01,-0.35 0.17,-0.06 0.65,0.42 -0.22,-0.43 0.1,-0.82 0.21,-0.22 0.44,0.11 -0.03,0.36 0.4,-0.11 0.24,0.32 0.86,-0.31 0.89,0.09 0.28,0.19 0.51,-0.2 0.29,-0.31 0.28,0.22 0.89,0.04 0.28,-0.17 0.54,-0.74 -0.06,0.5 0.51,-0.44 0.49,-0.12 0.23,0.06 -0.27,0.81 0.09,0.67 0.92,-0.11 0.29,0.36 0.31,-0.25 0.96,0.45 1.21,1.21 1.15,0.28 0.6,-0.38 0.53,-0.1 1.5,-0.16 0.42,0.1 0.76,-1.05 -0.04,-0.39 -0.61,-0.54 0.22,-0.34 1.12,-0.32 0.3,-0.47 0.32,-0.09 0.14,-0.55 0.27,0.07 0.29,-0.27 0.53,0.15 1.2,-0.54 0.55,0.1 0.76,-1.11 1.11,-0.12 0.36,-0.23 0.36,-1.12 0.43,-0.26 -0.61,-0.34 -0.63,-0.01 -0.94,0.31 -0.41,0.68 -0.98,-0.19 -0.03,-0.13 0.47,-0.4 0.42,-0.74 0,-0.77 0.82,-0.21 0.62,-0.53 1.08,0.67 z"
    fill={getRegionColor("Indonesia Timur & Lainnya")}
    stroke={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-pa"
    aria-label="Papua"
    d="m 755.55571,272.15789 -2.51,-0.14 -2.81,-0.49 -0.36,-0.18 -0.21,-0.57 0.08,-0.21 2.73,-2.39 1.71,-0.48 0.23,0.05 0.27,0.88 1.28,2.71 0.02,0.34 -0.43,0.48 z m -4.89,-2.73 -2.6,2.13 -1.27,0.57 -1.38,0.28 -0.47,-0.05 -0.39,-0.32 -0.65,-0.18 -5.96,-0.4 -2.85,0.69 -0.51,0.35 -0.5,0.06 -0.24,-0.42 0.06,-0.52 1.62,-4.23 3.07,-5.93 1.96,-2.96 0.53,-0.57 2.98,-2.1 2.44,-0.96 4.78,-0.89 2.12,0.11 0.79,0.22 0.37,0.33 1.08,1.81 0.59,0.62 1.32,0.25 0.62,0.98 -0.96,2.7 -1.18,1.89 -0.54,2.73 -0.57,0.73 -1.15,1.06 -1.99,0.44 -1.12,1.58 z m 0.44,-26.51 0.61,0.5 1.3,0.24 0.82,1.21 -0.99,0.62 -0.75,-0.28 -1.16,-1.53 -0.13,-0.51 0.3,-0.25 z m -40.39,-86.82 2.86,0.57 5.96,0.44 1.59,0.67 0.09,0.16 -0.43,0.46 -3.22,0.55 -2.54,0.83 -5.61,-0.5 -4.02,-0.96 -0.89,-0.65 -1.03,-0.45 -2.55,-0.77 -1.02,-0.2 -1.13,0.08 -2.09,-0.34 -1.08,-1.28 0.93,-0.28 1.17,0.38 11.08,0.79 1.93,0.5 z m 44.47,4.67 1.2,0.01 1.96,0.66 6.25,2.86 6.46,3.36 1.79,0.26 2.55,-0.31 1.28,-0.61 0.99,0.06 0.17,0.54 0.69,0.85 1.91,0.88 0.92,-0.17 0.1,-0.27 1.66,0.03 2.67,0.39 1.57,0.56 0.34,0.26 0.12,0.41 -0.25,0.63 -0.47,0.49 -0.11,0.35 0.46,0.38 1.67,-0.47 2.48,-0.1 0.61,0.05 0.06,0.12 0,64.11 -0.68,0.07 -0.67,1.97 0.4,0.51 -0.07,0.34 -0.92,1.75 -0.53,0.53 -0.07,0.81 0.21,1.87 0.55,1.2 0.81,0.83 0.55,0.05 0.43,-0.23 0.02,38.79 -1.09,-0.68 -1.17,-0.32 -0.6,-0.42 -1.46,-1.85 -2.57,-2.39 -1.82,-2.97 -4.75,-4.06 -3.07,-2.25 -1.15,-1.31 -0.18,-0.29 0.12,-0.68 1.38,-1.15 1.25,-2.29 0.24,-0.93 -1.63,0.71 -0.28,1.17 0.05,1.05 -1.29,0.74 -0.86,0.31 -3.52,-0.01 -1.59,0.19 -1.58,0.91 -1.92,0.46 -0.9,0.05 -0.7,-0.08 -0.87,-0.55 -1,-1.4 -2.32,0.88 -1.91,1.4 -0.6,1.29 -0.5,0.06 -1.07,-2.05 -0.2,-0.87 1.17,-1.61 0.12,-2.16 0.2,-0.22 1.2,-0.57 0.24,-0.82 -0.04,-1.04 0.89,-2.23 0.66,-0.7 0.02,-0.51 -0.44,-0.44 -1.08,-0.4 -1.25,-0.87 -0.63,-1.45 -0.61,-0.75 -1.71,-1.13 -1.61,-0.82 -0.15,-0.4 0.21,-0.14 4.5,0.17 1.04,0.63 0.96,0.22 2.17,-0.22 0.81,-1.32 -0.81,0.36 -0.25,0.34 -2.06,0.19 -3.37,-1.03 -1.71,-0.78 -2.89,-2.55 -0.31,-0.4 -0.02,-0.55 0.61,-0.49 0.8,-0.02 0.95,0.33 0.73,0.02 1.1,-0.71 1.8,-0.22 1.28,0.44 1.12,1.12 1.02,0.64 0.51,0.14 0.86,-0.19 -1,-0.23 -0.7,-0.37 -1.24,-1.12 -0.53,-0.3 -0.85,-0.33 -0.95,-0.12 -3.47,-1.82 -0.26,-1.09 0.66,-0.19 -0.49,-0.66 -3.38,-3.24 -0.76,-1.01 -0.51,-1.14 -0.32,-1.1 0.05,-0.85 -0.48,-1.44 -1.2,-2.22 0.02,-2.02 -1.48,-0.41 -0.76,-0.66 0.41,-0.6 2.77,-1.35 -0.18,-0.15 -0.47,-0.01 -1.61,0.25 -0.99,0.57 -1.35,0.38 -0.25,-0.15 -0.32,-1.8 0.36,-3.26 -0.14,-0.5 -0.5,0.88 -1.52,-0.57 -2.95,-1.94 -0.49,-0.59 -1.51,-0.98 -0.94,-0.25 -0.58,-0.36 -0.08,-0.2 0.4,-0.36 -1.3,-0.01 -1.89,-0.85 -1.81,-1.31 -0.62,-0.74 -1,0.44 -3.58,-1.01 -3.13,-0.41 -0.41,-0.42 -2.9,-1.34 -4.7,-2.5 -1.76,0.02 -3.86,-1.56 -0.47,-0.42 -0.62,-0.92 -0.76,-0.31 -2.2,-0.11 -1.33,0.16 -5.17,-1.12 -1.66,0.14 -1.68,0.38 -0.96,-0.34 -3.7,-2.11 -1.63,-0.69 0,0 1.64,-2.37 1.06,-0.81 0.65,-1.38 1.06,-1.63 2.29,-2.84 -0.9,-0.41 -0.49,0 -1.22,-0.57 -2.86,-0.89 -3.02,-1.22 -6.45,-1.87 -1.96,-0.97 -1.39,-0.41 1.14,-2.52 0.98,-1.22 1.63,-0.97 0.24,-0.81 0,-1.14 1.55,-0.81 2.48,-2.27 0,0 0.61,2.49 0.47,0.36 0.71,-0.15 0.67,-0.48 0.09,-0.5 0.31,-0.37 0.45,0.04 0.12,0.65 -0.18,1.21 -0.49,0.45 -0.17,1.43 1.11,2.15 2.05,1.51 2.13,0.55 3.73,0.43 2.22,-0.42 0.95,-0.47 0.67,-0.64 0.26,-0.6 -0.03,-0.4 0.64,-0.78 0.49,-0.34 1.37,-0.4 0.92,-0.73 -0.03,-0.26 -0.42,-0.32 0.4,-0.51 2.48,-1.07 0.51,-0.79 0.32,-2.73 1.23,-1.46 0.4,-0.05 2.31,-1.08 1.25,-1.01 0.43,-0.75 1.09,-2.85 0.05,-0.66 -0.19,-0.79 0.39,-0.49 0.91,-0.63 1.27,-0.1 0.87,0.05 0.06,0.29 0.18,0.12 0.96,0.24 1.14,0.1 1.49,-0.13 1.46,-0.83 2.65,-1.17 1.31,-0.41 0.8,0.11 1.3,-0.22 0.78,-0.52 0.04,-0.29 -0.64,-1.8 -0.63,-0.29 -0.91,-1.04 0.19,-1.23 1.22,-0.64 1.25,-0.31 1.4,-0.61 2.5,-1.32 0.44,-0.53 1.55,-0.75 4.17,-1.47 0.52,-0.02 0.96,0.28 0.81,0.92 1.43,1.1 6.1,2.16 4.19,1 1.53,0.96 0.76,1.02 0.96,0.82 0.38,0.07 z m -68.19,-14.13 -0.97,-0.01 -1.13,-1.66 0.19,-1 0.5,-0.67 0.81,-0.05 0.73,0.35 1.08,1.11 -0.08,1.04 -0.49,0.69 -0.64,0.2 z m 9.63,-8.01 1.79,0.04 1.52,0.24 1.62,1.07 0.97,-0.75 0.54,-0.07 0.66,0.38 3.03,2.55 2.23,3.23 1.25,-0.22 1.72,0.77 0.36,0.36 -0.81,0.72 -1.29,0.72 -1.85,0.4 -1.04,-0.02 -0.87,-0.65 -0.48,-0.15 -1,0.05 -0.75,0.27 -0.59,-0.12 -0.88,-0.87 -0.78,-3.16 0.03,-0.92 -0.57,-1.23 -0.5,-0.05 -1.81,0.86 -1.79,-1.52 -0.66,-0.15 0.08,0.54 -0.42,-0.16 -1,-0.95 -0.62,-1.33 0.26,-0.49 1.65,0.61 z"
    fill={getRegionColor("Indonesia Timur & Lainnya")}
    stroke={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
  <path
    id="id-pb"
    aria-label="Papua Barat"
    d="m 663.63571,200.14789 0.76,0.9 -5,-2.24 -0.16,-1.15 0.51,0.19 1.24,0.95 2.65,1.35 z m -58.47,-37.6 -1.23,0.04 -3.61,-1.07 -3.03,-1.57 -0.33,-0.42 0.58,-0.54 3.53,-1.26 1.42,-0.72 5.41,-1.05 0.08,0.52 1.33,1.97 0.06,2.57 -0.94,0.62 -3.27,0.91 z m -4.51,-14.67 -1.71,0.55 -1.58,-0.54 0.06,-0.33 0.37,-0.34 1.8,-0.5 1.55,0.52 -0.49,0.64 z m 16.75,-5.48 0.59,0.77 1.09,-0.15 0.66,-0.26 0.69,1.04 -0.05,1.91 -0.58,2.67 -0.72,1.64 -0.21,0.26 -0.4,0.12 -1.5,-0.28 -2.04,-1.69 -0.35,-1 -0.75,-1.06 0.35,-0.54 -0.27,-0.73 -0.38,-0.64 -0.56,-0.21 -0.07,-0.22 0.07,-0.25 0.36,-0.2 3.39,-1.11 0.68,-0.07 z m 0.31,-1.73 -0.45,0.77 -1.64,0.7 -2.22,0.47 -1.46,0.15 -1.84,-0.1 -0.59,0.1 -0.55,0.28 -0.24,-0.08 0.88,-1.01 0.66,-0.52 4.17,-0.12 1.33,-0.3 0.63,-0.7 0.79,0 0.53,0.36 z m -5.38,-4.29 -2.44,-0.27 -0.16,-0.97 0.42,-0.31 2.32,-0.69 0.8,0.28 0.57,0.45 0.02,0.26 -0.45,0.75 -1.08,0.5 z m 51.35,3.65 3.04,0.05 0.08,-0.56 3.91,0.1 2.24,1.81 -1.41,2.26 1.69,3.19 1.35,1.19 1.31,2.39 -0.79,0.87 -0.24,2.51 -2.3,2.07 0.59,3.54 0.39,0.86 -0.21,2.02 0.46,4.6 1.09,1.87 0.53,0.18 1.15,1.14 2.47,6.13 0.55,0.02 0.54,-0.46 -0.9,-3.57 -0.05,-1.18 0.25,-0.58 0.94,-0.96 0.53,0.11 1.23,0.78 0.26,0.91 0.1,4.32 0,0 -2.48,2.27 -1.55,0.81 0,1.14 -0.24,0.81 -1.63,0.97 -0.98,1.22 -1.14,2.52 1.39,0.41 1.96,0.97 6.45,1.87 3.02,1.22 2.86,0.89 1.22,0.57 0.49,0 0.9,0.41 -2.29,2.84 -1.06,1.63 -0.65,1.38 -1.06,0.81 -1.64,2.37 0,0 -1.16,-0.49 -2.68,-2.25 -0.08,-0.22 0.73,-2.82 0.43,-0.22 2.5,0.31 1.04,0.45 0.32,-0.03 0.65,-0.48 -0.03,-0.17 -1.16,-0.2 -3.94,-0.25 -0.96,0.74 -0.34,0.9 -1.31,0.28 -0.94,-1.35 -0.6,-0.59 -1.16,-0.28 -0.45,1.63 -0.64,0.33 -1.57,-0.88 -0.51,-0.44 -0.35,-0.72 0.06,-0.53 0.41,-0.3 0.05,-0.28 -0.29,-0.62 -0.59,-0.59 -0.25,-0.11 -1.74,0.91 -1.75,-0.94 -1.6,-2.78 -0.56,0.28 -0.07,0.16 0.14,0.98 -0.44,0.1 -1.23,-0.78 -1.1,-2.17 -0.14,-0.56 0.08,-0.22 0.91,-0.58 0.11,-0.24 0.05,-1.06 -0.25,-1.28 0.44,-1.45 1.21,-1.03 1.34,-0.86 0.03,-1.29 -0.58,-0.79 -1.69,1.53 -1.25,1.48 -0.32,2.64 0.04,2.08 -0.65,0.13 -1.06,0.72 0.39,0.37 0.41,0.91 -0.07,0.58 -1.68,1.3 -1.54,1.53 -0.07,0.3 0.2,0.9 0.6,0.52 0.17,0.64 -2.39,2.51 -1.3,1.06 -0.65,0.06 -2.62,-0.3 -0.34,0.19 -0.65,0.76 -1.36,-0.34 -1.12,-1.51 -0.55,-1.27 0.2,-0.16 -0.16,-0.61 -1.16,-2.99 0.56,-1.47 1.83,-0.66 0.53,-0.41 0.12,-0.27 -0.77,-1.44 -0.27,-0.08 -0.29,0.15 -0.47,-0.38 -0.37,-1.4 0.35,-0.85 -0.05,-0.29 -0.39,-0.5 -0.52,-0.13 -0.6,0.24 -0.02,0.9 -0.15,0.15 -0.23,0.06 -0.79,-0.37 -1.16,-1.56 -0.08,-0.85 -0.62,-1.18 -1.58,-1.24 -2.59,-1.61 -0.74,-0.21 -1.44,0 -1.9,0.49 -2.14,-3.1 0.18,-0.21 2.96,-1.4 1.2,-0.25 1.91,0.06 3.34,0.31 1.06,0.29 1.2,0.75 0.41,0.53 0.98,0.45 2.07,-1.49 3.05,-4.02 1.51,-0.87 0.9,-0.28 1.52,-0.21 1.1,0.53 1.32,1.27 2.08,0.76 0.71,-0.04 0.99,-0.43 0.76,0.09 0.51,0.73 -0.1,0.91 0.11,1.36 0.25,-0.34 0.32,-2.52 -0.1,-0.61 0.24,-0.05 0.36,0.17 1.08,2.21 0.22,0.13 0.07,-2.02 -0.29,-0.8 -0.39,-0.24 1.02,-0.97 1.28,-0.61 0.71,-1.04 0.05,-1.62 -0.2,-0.42 -0.4,1.05 -1.47,0.49 -0.31,-0.03 -0.56,-0.72 0.12,-0.21 2.03,-0.79 0.58,-0.48 -0.2,-1.15 -1.01,0.17 -3.98,2.12 -1.78,0.15 -1.81,-0.12 -0.66,-0.35 -1.78,-0.31 -1.67,0.22 -4.11,1.28 -1.09,-0.07 -1.44,-0.62 -0.6,0.17 -1.61,0.87 -0.88,-0.43 -0.19,-0.22 -0.21,-0.79 -0.41,-0.53 -0.3,-0.07 -2.05,0.52 -1.09,0.68 -0.96,0.22 -0.67,-0.08 -2.47,-2.01 -0.84,-0.32 -1.14,-0.82 -1.2,-2.03 -0.7,-1.58 -0.07,-1.12 0.76,-0.83 -0.25,-0.93 -1.28,-1.13 -2.76,-1.04 -0.33,-0.38 0.02,-0.27 -1.98,-0.92 -5.48,-1.83 0.17,0.4 0.82,0.54 0.04,0.38 -0.78,0.65 -1.38,0.5 -0.52,-0.85 -1.15,-0.45 -1.07,0.06 -1.48,-0.9 0.83,-1.17 0.41,-1.03 0.42,-0.54 2.06,-0.42 1.21,-2.1 0.64,-3.07 -0.53,-1.64 4.46,-1.52 0.37,0.05 0.06,0.21 0.68,0.22 3.41,-0.63 1.7,-0.55 0.78,-1.22 3.25,-2.69 1.23,-0.77 1.6,-0.65 2.84,-0.68 4.83,0.39 1.84,0.94 5.11,1.98 1.01,0.09 3.48,3.04 0.96,0.29 2.54,0.31 z m -46.66,-12.62 2.85,0.81 1.68,0.16 2.77,1.58 0.23,0.6 0.15,1.22 -0.44,0.95 -0.71,1.01 -1.49,-0.83 -1.1,-0.1 -1.23,0.47 -0.99,0.05 -0.53,-0.32 -1.24,-1.61 -1.46,-0.58 -1.4,-2.07 -0.37,-0.29 -1.29,0.15 0.22,0.83 1.75,1.85 1.69,0.78 1.01,0.16 0.59,0.36 0.44,0.74 -0.47,0.76 -1.17,0.55 -1.54,0.21 -0.57,-0.2 -0.3,-0.4 -0.5,-1.96 -1.58,0.35 -0.8,0.73 -0.53,-1.92 -1.45,0.36 -1.19,-0.14 -2.01,-0.68 -0.42,-0.28 0.35,-0.22 0.42,0.21 2.11,0.18 0.75,-0.41 -0.48,-0.82 -1.07,0.03 0.11,0.62 -0.85,-0.19 -0.35,-0.64 0.13,-0.56 1.32,-0.32 1.46,0 3.65,-0.59 0.75,-0.29 0.36,0.26 0.84,-0.07 -0.29,-0.27 0.56,-0.34 0.71,-0.07 0.92,0.19 z m -22.88,3.34 -0.32,0.15 -0.86,-1.04 -3.37,-3.33 -0.03,-0.2 0.25,-0.03 0.58,0.38 3.54,2.85 0.39,0.68 0.04,0.31 -0.22,0.23 z"
    fill={getRegionColor("Indonesia Timur & Lainnya")}
    stroke={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "#1d7bb8" : "#ffffff"}
    strokeWidth={isHovered("Indonesia Timur & Lainnya") || isSelected("Indonesia Timur & Lainnya") ? "1.5" : "0.5"}
    className="transition-all duration-300"
  />
</g>

                            {/* Jabodetabek Group (Placed on top of Java/Sumatera to override z-index and expand hit target) */}
                            <g
                              onMouseEnter={() => setHoveredRegionMap("Jabodetabek")}
                              onMouseLeave={() => setHoveredRegionMap(null)}
                              onClick={() => handleRegionClick("Jabodetabek")}
                              className="cursor-pointer group/region transition-all duration-300"
                            >
                              {/* Jakarta Path */}
                              <path
                                id="id-jk"
                                aria-label="Jakarta Raya"
                                d="m 173.98571,239.51789 -0.26,0.49 0.16,0.73 -0.3,0.61 -0.64,0.23 -0.42,0.57 -0.21,-0.28 0.38,-0.45 0.03,-0.4 -0.33,-0.26 0.02,-0.42 -0.28,0.04 -0.54,0.49 -0.05,0.31 -0.26,-0.16 0.28,-0.59 0.99,-0.75 0.52,0.12 0,-0.26 0.49,0.02 0.26,-0.16 0.16,0.12 z m 25.57,-7.41 1.8,0.34 0.73,-0.41 1.4,-0.09 0,0 -0.06,1.98 -0.41,0.86 -0.64,0.17 0.06,0.56 0.21,0.37 -0.21,0.95 -0.18,0.06 -0.85,-0.49 -0.9,0.25 -0.11,-0.16 0.24,-0.68 -0.53,0.06 0,0 0,0 0,0 -0.44,-0.76 -0.16,-0.73 -0.39,-0.08 0.02,-0.66 -0.61,-0.33 0.03,-1.12 0.6,-0.26 0,0 0.4,0.17 z"
                                fill={getRegionColor("Jabodetabek")}
                                stroke={isHovered("Jabodetabek") || isSelected("Jabodetabek") ? "#1d7bb8" : "#ffffff"}
                                strokeWidth={isHovered("Jabodetabek") || isSelected("Jabodetabek") ? "1.5" : "0.5"}
                                className="transition-all duration-300"
                              />
                              {/* Pulse effect */}
                              <circle
                                cx="186"
                                cy="237"
                                r="8"
                                fill="#1d7bb8"
                                className="opacity-40 pointer-events-none animate-ping"
                              />
                              {/* Center dot */}
                              <circle
                                cx="186"
                                cy="237"
                                r="4"
                                fill="#1d7bb8"
                                stroke="#ffffff"
                                strokeWidth="0.8"
                                className="group-hover/region:scale-125 transition-transform"
                              />
                              {/* Large invisible circle to expand hover target size */}
                              <circle
                                cx="186"
                                cy="237"
                                r="20"
                                fill="transparent"
                                className="cursor-pointer"
                              />
                            </g>
                          </svg>
                        );
                      })()}
                    </div>

                    {/* Interactive Legend & Details Panel */}
                    <div className="w-full lg:w-1/3 border-t lg:border-t-0 lg:border-l border-[#edece9] pt-4 lg:pt-0 lg:pl-6 flex flex-col gap-4 self-stretch select-none">
                      {(() => {
                        const activeReg = hoveredRegionMap || selectedRegionMap || "Jabodetabek";
                        const activeCount = analyticsData.regionalDistribution.find(x => x.name === activeReg)?.count || 0;
                        const activeCities = analyticsData.regionCitiesSorted[activeReg] || [];
                        const pct = analyticsData.regionalDistribution.find(x => x.name === activeReg)?.percentage || 0;

                        return (
                          <div className="flex flex-col justify-between h-full gap-4">
                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center justify-between border-b border-[#edece9] pb-2">
                                <span className="font-bold text-[13px] text-[#37352f]">{activeReg}</span>
                                <span className="text-[11px] font-extrabold text-[#1d7bb8] bg-[#e8f4fa] px-2 py-0.5 rounded-full">
                                  {activeCount} Loker ({pct}%)
                                </span>
                              </div>

                              <div className="flex flex-col gap-1.5 h-[115px] overflow-y-auto pr-1">
                                {activeCities.length > 0 ? (
                                  activeCities.slice(0, 6).map((ct, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[11.5px] text-[#5a5a57]">
                                      <span className="font-medium truncate max-w-[120px]">{ct.name}</span>
                                      <span className="font-semibold text-[#8a8a86]">{ct.count} posisi</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-[#8a8a86] italic">Tidak ada penempatan aktif</span>
                                )}
                                {activeCities.length > 6 && (
                                  <span className="text-[9.5px] text-[#8a8a86] italic text-right">+ {activeCities.length - 6} kota lainnya</span>
                                )}
                              </div>
                            </div>

                            {/* CTA button to view matching jobs */}
                            {activeCount > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedRegionMap(activeReg);
                                  setViewTab("gallery");
                                }}
                                className="w-full bg-[#1d7bb8] hover:bg-[#155a8a] text-white font-bold py-1.5 px-3 rounded text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                              >
                                <span>Lihat {activeCount} Lowongan</span>
                              </button>
                            )}

                            {/* Choropleth Kerapatan Legend */}
                            <div className="flex flex-col gap-1 border-t border-[#edece9]/60 pt-2.5">
                              <span className="text-[9.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Kerapatan Posisi</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="flex-1 h-2 rounded bg-gradient-to-r from-[#f4f4f5] via-[#93c5fd] to-[#1d7bb8]"></div>
                              </div>
                              <div className="flex justify-between text-[9px] text-[#8a8a86] font-medium mt-0.5">
                                <span>Sikit (0-5)</span>
                                <span>Ramai (6-25)</span>
                                <span>Sangat Ramai (&gt;25)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* 2-Column Dashboard Layout (Flat Symmetrical Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Row 1: Leaderboard Anak Perusahaan vs Kebutuhan Rumpun Jurusan Terbanyak */}
                  {/* Card 1: Leaderboard Anak Perusahaan */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Leaderboard Anak Perusahaan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Anak perusahaan/subsidiari Pertamina dengan jumlah loker magang terbanyak</p>
                    </div>
                    
                    <div className="mt-4 flex flex-col items-center justify-center flex-grow">
                      {(() => {
                        const maxVal = Math.max(...analyticsData.companyLeaderboard.map(d => d.vacancies), 1);
                        const width = 340;
                        const height = 210;
                        const paddingLeft = 120;
                        const paddingRight = 15;
                        const paddingTop = 10;
                        const paddingBottom = 20;
                        
                        const chartW = width - paddingLeft - paddingRight;
                        const chartH = height - paddingTop - paddingBottom;
                        
                        const getShortCompanyName = (name) => {
                          const n = name.toLowerCase();
                          if (n.includes("persero")) return "Pertamina Holding";
                          if (n.includes("patra niaga")) return "Patra Niaga";
                          if (n.includes("geothermal")) return "PGE (Geothermal)";
                          if (n.includes("hulu energi") || n.includes("phe")) return "PHE (Hulu)";
                          if (n.includes("shipping") || n.includes("pis")) return "PIS (Shipping)";
                          if (n.includes("permata graha") || n.includes("pgn mas")) return "PGN Mas";
                          if (n.includes("gas") || n.includes("pgn")) return "PGN (Gas)";
                          if (n.includes("kilang") || n.includes("kpi")) return "KPI (Kilang)";
                          if (n.includes("lubricants")) return "Pertamina Lubricants";
                          if (n.includes("retail")) return "Pertamina Retail";
                          if (n.includes("training") || n.includes("ptc")) return "PTC (Training)";
                          if (n.includes("patra jasa")) return "Patra Jasa";
                          if (n.includes("elnusa")) return "Elnusa";
                          if (n.includes("tugu")) return "Tugu Insurance";
                          return name.replace("PT Pertamina ", "").replace("Tbk", "").trim();
                        };
                        
                        return (
                          <div className="w-full relative flex flex-col items-center select-none">
                            <svg className="w-full h-52 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                              {/* Grid lines */}
                              <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={paddingTop + chartH} stroke="#edece9" strokeWidth="1" />
                              <line x1={paddingLeft + chartW / 2} y1={paddingTop} x2={paddingLeft + chartW / 2} y2={paddingTop + chartH} stroke="#edece9" strokeWidth="0.8" strokeDasharray="3 3" />
                              <line x1={paddingLeft + chartW} y1={paddingTop} x2={paddingLeft + chartW} y2={paddingTop + chartH} stroke="#edece9" strokeWidth="0.8" strokeDasharray="3 3" />
                              
                              {/* X Axis labels */}
                              <text x={paddingLeft} y={paddingTop + chartH + 12} textAnchor="middle" className="text-[7.5px] fill-[#8a8a86] font-medium">0</text>
                              <text x={paddingLeft + chartW / 2} y={paddingTop + chartH + 12} textAnchor="middle" className="text-[7.5px] fill-[#8a8a86] font-medium">{Math.round(maxVal / 2)}</text>
                              <text x={paddingLeft + chartW} y={paddingTop + chartH + 12} textAnchor="middle" className="text-[7.5px] fill-[#8a8a86] font-medium">{Math.round(maxVal)}</text>
                              
                              {analyticsData.companyLeaderboard.map((item, idx) => {
                                const barH = 12;
                                const spacing = (chartH - (barH * analyticsData.companyLeaderboard.length)) / (analyticsData.companyLeaderboard.length + 1);
                                const y = paddingTop + spacing + idx * (barH + spacing);
                                const barW = (item.vacancies / maxVal) * chartW;
                                
                                const displayName = getShortCompanyName(item.name);
                                
                                return (
                                  <g 
                                    key={idx}
                                    onMouseEnter={() => setHoveredCompanyBar(idx)}
                                    onMouseLeave={() => setHoveredCompanyBar(null)}
                                    onClick={() => handleCompanyChartClick(item.name)}
                                    className="cursor-pointer"
                                  >
                                    {/* Hover catcher row */}
                                    <rect 
                                      x="0" 
                                      y={y - spacing/2} 
                                      width={width} 
                                      height={barH + spacing} 
                                      fill="transparent" 
                                    />
                                    
                                    {/* Company Label */}
                                    <text 
                                      x={paddingLeft - 6} 
                                      y={y + barH / 2 + 3} 
                                      textAnchor="end" 
                                      className={`text-[8px] font-semibold transition-colors ${hoveredCompanyBar === idx ? 'fill-[#1d7bb8]' : 'fill-[#5a5a57]'}`}
                                    >
                                      {displayName}
                                    </text>
                                    
                                    {/* Bar Background Track */}
                                    <rect 
                                      x={paddingLeft} 
                                      y={y} 
                                      width={chartW} 
                                      height={barH} 
                                      rx="3" 
                                      fill="#edece9" 
                                      className="opacity-25" 
                                    />
                                    
                                    {/* Active Gradient Bar */}
                                    <rect 
                                      x={paddingLeft} 
                                      y={y} 
                                      width={barW} 
                                      height={barH} 
                                      rx="3" 
                                      fill="url(#goldGradCol)" 
                                      className={`transition-all duration-300 ${hoveredCompanyBar === idx ? 'brightness-110' : ''}`}
                                    />
                                  </g>
                                );
                              })}
                              
                              <defs>
                                <linearGradient id="goldGradCol" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#b78103" />
                                  <stop offset="100%" stopColor="#fbbf24" />
                                </linearGradient>
                              </defs>
                            </svg>
                            
                            {/* Dynamic Tooltip inside card */}
                            <div className="h-6 mt-1 flex items-center justify-center text-center">
                              {hoveredCompanyBar !== null ? (
                                <div className="text-[10px] font-bold text-[#b78103] animate-fade-in bg-[#fdfaf2] border border-[#fde68a]/50 rounded-full px-3 py-0.5 shadow-3xs">
                                  {analyticsData.companyLeaderboard[hoveredCompanyBar].name}: <span className="underline">{analyticsData.companyLeaderboard[hoveredCompanyBar].vacancies} Loker</span> • {analyticsData.companyLeaderboard[hoveredCompanyBar].applicants.toLocaleString()} Pelamar
                                </div>
                              ) : (
                                <span className="text-[9px] text-[#8a8a86] italic">Arahkan kursor ke bar anak perusahaan</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Card 2: Kebutuhan Rumpun Jurusan Terbanyak */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Kebutuhan Rumpun Jurusan Terbanyak</h3>
                      <p className="text-[11px] text-[#8a8a86]">Kategori program studi yang paling sering dicari pada prasyarat pendaftaran</p>
                    </div>

                    <div className="mt-4 flex flex-col items-center justify-center flex-grow">
                      {(() => {
                        const maxVal = Math.max(...analyticsData.sortedMajors.map(d => d.count), 1);
                        const width = 320;
                        const height = 145;
                        const paddingLeft = 30;
                        const paddingRight = 10;
                        const paddingTop = 15;
                        const paddingBottom = 35;
                        
                        const chartW = width - paddingLeft - paddingRight;
                        const chartH = height - paddingTop - paddingBottom;
                        
                        const shortLabels = {
                          "Teknik / STEM": "STEM",
                          "Manajemen / Bisnis": "Bisnis",
                          "Ekonomi & Akuntansi": "Keuangan",
                          "Teknologi Informasi & Komputer": "IT",
                          "Psikologi / Human Resources": "HR",
                          "Hukum & Legal": "Hukum",
                          "Statistika / Matematika": "Sains",
                          "Semua Jurusan": "Semua"
                        };
                        
                        return (
                          <div className="w-full relative flex flex-col items-center select-none">
                            <svg className="w-full h-48 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                              {/* Grid lines */}
                              <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#edece9" strokeWidth="0.8" strokeDasharray="3 3" />
                              <line x1={paddingLeft} y1={paddingTop + chartH / 2} x2={width - paddingRight} y2={paddingTop + chartH / 2} stroke="#edece9" strokeWidth="0.8" strokeDasharray="3 3" />
                              <line x1={paddingLeft} y1={paddingTop + chartH} x2={width - paddingRight} y2={paddingTop + chartH} stroke="#edece9" strokeWidth="1" />
                              
                              {/* Y Axis labels */}
                              <text x={paddingLeft - 8} y={paddingTop + 3} textAnchor="end" className="text-[7.5px] fill-[#8a8a86] font-medium">{Math.round(maxVal)}</text>
                              <text x={paddingLeft - 8} y={paddingTop + chartH / 2 + 3} textAnchor="end" className="text-[7.5px] fill-[#8a8a86] font-medium">{Math.round(maxVal / 2)}</text>
                              <text x={paddingLeft - 8} y={paddingTop + chartH + 3} textAnchor="end" className="text-[7.5px] fill-[#8a8a86] font-medium">0</text>
                              
                              {/* Columns */}
                              {analyticsData.sortedMajors.map((item, idx) => {
                                const barW = 18;
                                const spacing = (chartW - (barW * analyticsData.sortedMajors.length)) / (analyticsData.sortedMajors.length + 1);
                                const x = paddingLeft + spacing + idx * (barW + spacing);
                                const barH = (item.count / maxVal) * chartH;
                                const y = paddingTop + chartH - barH;
                                const label = shortLabels[item.name] || item.name;
                                
                                return (
                                  <g 
                                    key={idx}
                                    onMouseEnter={() => setHoveredMajorBar(idx)}
                                    onMouseLeave={() => setHoveredMajorBar(null)}
                                    onClick={() => handleMajorChartClick(item.name)}
                                    className="cursor-pointer"
                                  >
                                    {/* Hover catcher */}
                                    <rect 
                                      x={x - spacing/2} 
                                      y={paddingTop} 
                                      width={barW + spacing} 
                                      height={chartH} 
                                      fill="transparent" 
                                    />
                                    
                                    {/* Bar Background Track */}
                                    <rect 
                                      x={x} 
                                      y={paddingTop} 
                                      width={barW} 
                                      height={chartH} 
                                      rx="3" 
                                      fill="#edece9" 
                                      className="opacity-20" 
                                    />
                                    
                                    {/* Column Bar */}
                                    <rect 
                                      x={x} 
                                      y={y} 
                                      width={barW} 
                                      height={barH} 
                                      rx="3" 
                                      fill="url(#blueGradColChart)" 
                                      className={`transition-all duration-300 ${hoveredMajorBar === idx ? 'brightness-90 filter drop-shadow-sm' : ''}`}
                                    />
                                    
                                    {/* X Axis label */}
                                    <text 
                                      x={x + barW / 2} 
                                      y={paddingTop + chartH + 8} 
                                      transform={`rotate(-25, ${x + barW / 2}, ${paddingTop + chartH + 8})`}
                                      textAnchor="end" 
                                      className={`text-[8px] font-bold transition-colors ${hoveredMajorBar === idx ? 'fill-[#1d7bb8]' : 'fill-[#5a5a57]'}`}
                                    >
                                      {label}
                                    </text>
                                  </g>
                                );
                              })}
                              
                              <defs>
                                <linearGradient id="blueGradColChart" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#1d7bb8" />
                                  <stop offset="100%" stopColor="#60a5fa" />
                                </linearGradient>
                              </defs>
                            </svg>
                            
                            {/* Tooltip inside card */}
                            <div className="h-6 mt-1 flex items-center justify-center text-center">
                              {hoveredMajorBar !== null ? (
                                <div className="text-[10px] font-bold text-[#1d7bb8] animate-fade-in bg-[#e8f4fa] border border-[#93c5fd]/50 rounded-full px-3 py-0.5 shadow-3xs">
                                  {analyticsData.sortedMajors[hoveredMajorBar].name}: <span className="underline">{analyticsData.sortedMajors[hoveredMajorBar].count} Loker</span> ({analyticsData.sortedMajors[hoveredMajorBar].percentage}%)
                                </div>
                              ) : (
                                <span className="text-[9px] text-[#8a8a86] italic">Arahkan kursor ke kolom rumpun jurusan</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Row 2: Top 5 Posisi Paling Kompetitif vs To                  {/* Card 3: Top 5 Posisi Paling Kompetitif */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Top 5 Posisi Paling Kompetitif</h3>
                      <p className="text-[11px] text-[#8a8a86]">Lowongan dengan rasio jumlah pelamar per kuota kursi tertinggi (Klik untuk detail)</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.competitiveJobs.map((job, idx) => {
                        const maxRatio = analyticsData.competitiveJobs[0]?.ratio || 1;
                        const pct = (job.ratio / maxRatio) * 100;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedJob(job)}
                            className="flex flex-col gap-1.5 cursor-pointer group/item hover:opacity-95 transition-all"
                            title={`Klik untuk detail: ${job["Judul Lowongan"]}`}
                          >
                            <div className="flex justify-between items-start gap-3 text-[12px]">
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#1d7bb8] truncate group-hover/item:underline">{job["Judul Lowongan"]}</span>
                                <span className="text-[10px] text-[#8a8a86] truncate">{job["Perusahaan"]}</span>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="font-extrabold text-[#c52447]">1 : {job.ratio}</span>
                              </div>
                            </div>
                            <div className="w-full bg-[#edece9]/50 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#c52447] h-full rounded-full transition-all duration-500 group-hover/item:brightness-110" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 4: Top 5 Peluang Lolos Tertinggi */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Top 5 Peluang Lolos Tertinggi</h3>
                      <p className="text-[11px] text-[#8a8a86]">Lowongan dengan rasio persaingan terendah (Paling ramah pelamar - Klik untuk detail)</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.userFriendlyJobs.map((job, idx) => {
                        const pct = job.passRate;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedJob(job)}
                            className="flex flex-col gap-1.5 cursor-pointer group/item hover:opacity-95 transition-all"
                            title={`Klik untuk detail: ${job["Judul Lowongan"]}`}
                          >
                            <div className="flex justify-between items-start gap-3 text-[12px]">
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#16a34a] truncate group-hover/item:underline">{job["Judul Lowongan"]}</span>
                                <span className="text-[10px] text-[#8a8a86] truncate">{job["Perusahaan"]}</span>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="font-extrabold text-[#16a34a]">{job.passRate}% Lolos</span>
                              </div>
                            </div>
                            <div className="w-full bg-[#edece9]/50 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#16a34a] h-full rounded-full transition-all duration-500 group-hover/item:brightness-110" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 3: Klasifikasi Tingkat Persaingan vs Avg Peluang Lolos Anak Perusahaan */}
                  {/* Card 5: Klasifikasi Tingkat Persaingan */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Klasifikasi Tingkat Persaingan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Distribusi tingkat keketatan persaingan masuk lowongan magang</p>
                    </div>

                    <div className="flex flex-col gap-4 mt-4 flex-grow justify-center">
                      {/* Stacked Distribution Bar */}
                      <div className="w-full bg-[#edece9]/40 h-4.5 rounded-full overflow-hidden flex border border-[#edece9] shadow-3xs">
                        {analyticsData.heatClassification.map((item, idx) => {
                          if (item.percentage <= 0) return null;
                          return (
                            <div 
                              key={idx}
                              style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: item.color 
                              }}
                              className="h-full first:rounded-l-full last:rounded-r-full hover:brightness-95 transition-all cursor-help opacity-90 hover:opacity-100"
                              title={`${item.label}: ${item.count} Posisi (${item.percentage}%)`}
                            />
                          );
                        })}
                      </div>

                      {/* Legend Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {analyticsData.heatClassification.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="flex flex-col p-2.5 rounded border border-[#edece9]/50 hover:scale-[1.02] transition-transform duration-200 cursor-default" 
                            style={{ backgroundColor: item.bg }}
                          >
                            <span className="text-[11px] font-bold" style={{ color: item.color }}>{item.label}</span>
                            <span className="text-[10px] text-[#8a8a86] font-medium mt-0.5">{item.count} Posisi ({item.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card 6: Avg Peluang Lolos Anak Perusahaan */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Avg Peluang Lolos Anak Perusahaan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Anak perusahaan Pertamina dengan peluang kelulusan magang rata-rata tertinggi</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.avgPassRateByCompany.map((item, idx) => {
                        const maxRate = analyticsData.avgPassRateByCompany[0]?.avgRate || 100;
                        const pct = (item.avgRate / maxRate) * 100;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => handleCompanyChartClick(item.name)}
                            className="flex flex-col gap-1.5 cursor-pointer group/bar hover:opacity-90 transition-all"
                            title={`Klik untuk filter: ${item.name}`}
                          >
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-semibold text-[#37352f] group-hover/bar:text-[#1d7bb8] transition-colors truncate max-w-[220px]">{idx + 1}. {item.name}</span>
                              <span className="text-[#16a34a] font-extrabold text-[11px] bg-[#dcfce7] border border-[#bbf7d0] px-2 py-0.2 rounded flex-shrink-0">
                                {item.avgRate}% Lolos
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/50 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#16a34a] h-full rounded-full transition-all duration-500 group-hover/bar:brightness-110" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 4: Distribusi Lokasi / Kota vs Sebaran Wilayah / Region */}
                  {/* Card 7: Distribusi Lokasi / Kota */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Distribusi Lokasi / Kota</h3>
                      <p className="text-[11px] text-[#8a8a86]">6 Kota teratas dengan sebaran penempatan magang terbanyak</p>
                    </div>

                    <div className="mt-4 flex flex-col items-center justify-center flex-grow">
                      {(() => {
                        const maxVal = Math.max(...analyticsData.topCities.map(d => d.count), 1);
                        const width = 300;
                        const height = 145;
                        const paddingLeft = 35;
                        const paddingRight = 15;
                        const paddingTop = 15;
                        const paddingBottom = 35;
                        
                        const chartW = width - paddingLeft - paddingRight;
                        const chartH = height - paddingTop - paddingBottom;
                        
                        const getShortCityName = (name) => {
                          const n = name.toLowerCase();
                          if (n.includes("jakarta pusat")) return "Jakpus";
                          if (n.includes("jakarta selatan")) return "Jaksel";
                          if (n.includes("jakarta barat")) return "Jakbar";
                          if (n.includes("jakarta utara")) return "Jakut";
                          if (n.includes("jakarta timur")) return "Jaktim";
                          if (n.includes("surabaya")) return "Sby";
                          return name;
                        };
                        
                        return (
                          <div className="w-full relative flex flex-col items-center select-none">
                            <svg className="w-full h-36 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                              {/* Horizontal Grid lines */}
                              <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#edece9" strokeWidth="0.8" strokeDasharray="3 3" />
                              <line x1={paddingLeft} y1={paddingTop + chartH / 2} x2={width - paddingRight} y2={paddingTop + chartH / 2} stroke="#edece9" strokeWidth="0.8" strokeDasharray="3 3" />
                              <line x1={paddingLeft} y1={paddingTop + chartH} x2={width - paddingRight} y2={paddingTop + chartH} stroke="#edece9" strokeWidth="1" />
                              
                              {/* Y Axis Labels */}
                              <text x={paddingLeft - 8} y={paddingTop + 3} textAnchor="end" className="text-[8.5px] fill-[#8a8a86] font-medium">{Math.round(maxVal)}</text>
                              <text x={paddingLeft - 8} y={paddingTop + chartH / 2 + 3} textAnchor="end" className="text-[8.5px] fill-[#8a8a86] font-medium">{Math.round(maxVal / 2)}</text>
                              <text x={paddingLeft - 8} y={paddingTop + chartH + 3} textAnchor="end" className="text-[8.5px] fill-[#8a8a86] font-medium">0</text>
                              
                              {/* Columns */}
                              {analyticsData.topCities.map((item, idx) => {
                                const barW = 22;
                                const spacing = (chartW - (barW * analyticsData.topCities.length)) / (analyticsData.topCities.length + 1);
                                const x = paddingLeft + spacing + idx * (barW + spacing);
                                const barH = (item.count / maxVal) * chartH;
                                const y = paddingTop + chartH - barH;
                                const label = getShortCityName(item.name);
                                
                                return (
                                  <g 
                                    key={idx}
                                    onMouseEnter={() => setHoveredCityBar(idx)}
                                    onMouseLeave={() => setHoveredCityBar(null)}
                                    onClick={() => handleCityChartClick(item.name)}
                                    className="cursor-pointer"
                                  >
                                    {/* Transparent click/hover catcher rectangle */}
                                    <rect 
                                      x={x - spacing/2} 
                                      y={paddingTop} 
                                      width={barW + spacing} 
                                      height={chartH} 
                                      fill="transparent" 
                                    />
                                    
                                    {/* Bar Background track */}
                                    <rect 
                                      x={x} 
                                      y={paddingTop} 
                                      width={barW} 
                                      height={chartH} 
                                      rx="3" 
                                      fill="#edece9" 
                                      className="opacity-20" 
                                    />
                                    
                                    {/* Main Gradient Bar */}
                                    <rect 
                                      x={x} 
                                      y={y} 
                                      width={barW} 
                                      height={barH} 
                                      rx="3" 
                                      fill="url(#orangeGradColChart)" 
                                      className={`transition-all duration-300 ${hoveredCityBar === idx ? 'brightness-95 filter drop-shadow-sm' : ''}`}
                                    />
                                    
                                    {/* X Axis Label */}
                                    <text 
                                      x={x + barW / 2} 
                                      y={paddingTop + chartH + 8} 
                                      transform={`rotate(-25, ${x + barW / 2}, ${paddingTop + chartH + 8})`}
                                      textAnchor="end" 
                                      className={`text-[8px] font-bold transition-colors ${hoveredCityBar === idx ? 'fill-[#c26100]' : 'fill-[#5a5a57]'}`}
                                    >
                                      {label}
                                    </text>
                                  </g>
                                );
                              })}
                              
                              {/* Gradients */}
                              <defs>
                                <linearGradient id="orangeGradColChart" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#c26100" />
                                  <stop offset="100%" stopColor="#fb923c" />
                                </linearGradient>
                              </defs>
                            </svg>
                            
                            {/* Dynamic Tooltip inside card */}
                            <div className="h-6 mt-1 flex items-center justify-center text-center">
                              {hoveredCityBar !== null ? (
                                <div className="text-[10px] font-bold text-[#c26100] animate-fade-in bg-[#fdf6f0] border border-[#fbd38d]/50 rounded-full px-3 py-0.5 shadow-3xs">
                                  {analyticsData.topCities[hoveredCityBar].name}: <span className="underline">{analyticsData.topCities[hoveredCityBar].count} Loker</span> ({analyticsData.topCities[hoveredCityBar].percentage}%)
                                </div>
                              ) : (
                                <span className="text-[9px] text-[#8a8a86] italic">Arahkan kursor ke kolom kota</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Card 8: Sebaran Wilayah / Region */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Sebaran Wilayah / Region</h3>
                      <p className="text-[11px] text-[#8a8a86]">Pembagian penempatan magang berdasarkan kluster wilayah Indonesia</p>
                    </div>

                    <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-6 flex-grow">
                      {(() => {
                        const regions = analyticsData.regionalDistribution;
                        const total = regions.reduce((sum, r) => sum + r.count, 0);
                        
                        const r = 50;
                        const circ = 2 * Math.PI * r; // ~314.16
                        
                        // Premium colors matching regional themes
                        const colors = [
                          "#c26100", // Orange (Jabodetabek)
                          "#1d7bb8", // Blue (Jawa & Bali)
                          "#0d9488", // Teal (Sumatera)
                          "#9041a8", // Purple (Kalimantan & Sulawesi)
                          "#c52447"  // Red (Indonesia Timur)
                        ];
                        
                        let accumulatedPercent = 0;
                        
                        const slices = regions.map((item, idx) => {
                          const percentage = total > 0 ? (item.count / total) * 100 : 0;
                          const dashLength = (percentage / 100) * circ;
                          const dashOffset = -((accumulatedPercent / 100) * circ);
                          accumulatedPercent += percentage;
                          
                          return {
                            ...item,
                            percentage,
                            dashLength,
                            dashOffset,
                            color: colors[idx % colors.length]
                          };
                        });
                        
                        const activeSliceIdx = hoveredRegionSlice !== null ? hoveredRegionSlice : 0;
                        const activeSlice = slices[activeSliceIdx];
                        
                        return (
                          <>
                            {/* SVG Donut */}
                            <div className="w-1/2 flex justify-center relative select-none">
                              <svg className="w-40 h-40 transform -rotate-90 overflow-visible" viewBox="0 0 120 120">
                                {/* Base track circle */}
                                <circle 
                                  cx="60" 
                                  cy="60" 
                                  r={r} 
                                  fill="transparent" 
                                  stroke="#edece9" 
                                  strokeWidth="10" 
                                  className="opacity-40"
                                />
                                
                                {slices.map((slice, idx) => {
                                  if (slice.percentage <= 0) return null;
                                  return (
                                    <circle 
                                      key={idx}
                                      cx="60" 
                                      cy="60" 
                                      r={r} 
                                      fill="transparent" 
                                      stroke={slice.color} 
                                      strokeWidth={hoveredRegionSlice === idx ? "13" : "10"}
                                      strokeDasharray={`${slice.dashLength} ${circ}`} 
                                      strokeDashoffset={slice.dashOffset}
                                      strokeLinecap="butt"
                                      className="transition-all duration-300 cursor-pointer"
                                      onMouseEnter={() => setHoveredRegionSlice(idx)}
                                      onMouseLeave={() => setHoveredRegionSlice(null)}
                                    />
                                  );
                                })}
                              </svg>
                              
                              {/* Central textual info */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none px-4">
                                {activeSlice ? (
                                  <>
                                    <span className="text-[9px] font-bold text-[#8a8a86] uppercase tracking-wider truncate max-w-[85px]" title={activeSlice.name}>{activeSlice.name.split(" ")[0]}</span>
                                    <span className="text-[13px] font-extrabold text-[#37352f] leading-none mt-1">{activeSlice.count} Loker</span>
                                    <span className="text-[9px] font-semibold text-[#8a8a86] mt-0.5">{activeSlice.percentage.toFixed(0)}%</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-[#8a8a86] font-bold">Wilayah</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Legend Panel */}
                            <div className="w-1/2 flex flex-col gap-1.5 select-none">
                              {slices.map((slice, idx) => (
                                <div 
                                  key={idx}
                                  onMouseEnter={() => setHoveredRegionSlice(idx)}
                                  onMouseLeave={() => setHoveredRegionSlice(null)}
                                  className={`flex items-center justify-between p-1.5 rounded-md cursor-default transition-colors border ${
                                    hoveredRegionSlice === idx 
                                      ? "bg-[#f7f7f5]/80 border-[#edece9]" 
                                      : "border-transparent hover:bg-[#f7f7f5]/40"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                                    <span className={`text-[11.5px] truncate font-medium ${hoveredRegionSlice === idx ? "text-[#1d7bb8]" : "text-[#37352f]"}`}>
                                      {slice.name}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-[#8a8a86] font-semibold flex-shrink-0 ml-2">
                                    {slice.count}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Row 5: Sebaran Berdasarkan Sektor Kerja vs Analisis Industri Terpopuler */}
                  {/* Card 9: Sebaran Berdasarkan Sektor Kerja */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Sebaran Berdasarkan Sektor Kerja</h3>
                      <p className="text-[11px] text-[#8a8a86]">Pembagian lowongan magang berdasarkan sektor sub-holding Pertamina</p>
                    </div>

                    <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-6 flex-grow">
                      {(() => {
                        const sectors = analyticsData.sectorBreakdown;
                        const total = sectors.reduce((sum, s) => sum + s.count, 0);
                        
                        // Circle parameters
                        const r = 50;
                        const circ = 2 * Math.PI * r; // ~314.16
                        
                        // Premium colors for the 6 sectors
                        const colors = [
                          "#0d9488", // Teal
                          "#1d7bb8", // Blue
                          "#9041a8", // Purple
                          "#c26100", // Orange
                          "#c52447", // Red
                          "#5a5a57"  // Gray
                        ];
                        
                        let accumulatedPercent = 0;
                        
                        const slices = sectors.map((s, idx) => {
                          const percentage = total > 0 ? (s.count / total) * 100 : 0;
                          const dashLength = (percentage / 100) * circ;
                          const dashOffset = -((accumulatedPercent / 100) * circ);
                          accumulatedPercent += percentage;
                          
                          return {
                            ...s,
                            percentage,
                            dashLength,
                            dashOffset,
                            color: colors[idx % colors.length]
                          };
                        });
                        
                        // Selected slice to display in center (defaults to hovered, otherwise largest)
                        const activeSliceIdx = hoveredSectorSlice !== null ? hoveredSectorSlice : 0;
                        const activeSlice = slices[activeSliceIdx];
                        
                        return (
                          <>
                            {/* SVG Donut */}
                            <div className="w-1/2 flex justify-center relative select-none">
                              <svg className="w-40 h-40 transform -rotate-90 overflow-visible" viewBox="0 0 120 120">
                                {/* Base track circle */}
                                <circle 
                                  cx="60" 
                                  cy="60" 
                                  r={r} 
                                  fill="transparent" 
                                  stroke="#edece9" 
                                  strokeWidth="10" 
                                  className="opacity-40"
                                />
                                
                                {slices.map((slice, idx) => {
                                  if (slice.percentage <= 0) return null;
                                  return (
                                    <circle 
                                      key={idx}
                                      cx="60" 
                                      cy="60" 
                                      r={r} 
                                      fill="transparent" 
                                      stroke={slice.color} 
                                      strokeWidth={hoveredSectorSlice === idx ? "13" : "10"}
                                      strokeDasharray={`${slice.dashLength} ${circ}`} 
                                      strokeDashoffset={slice.dashOffset}
                                      strokeLinecap="butt"
                                      className="transition-all duration-300 cursor-pointer"
                                      onMouseEnter={() => setHoveredSectorSlice(idx)}
                                      onMouseLeave={() => setHoveredSectorSlice(null)}
                                      onClick={() => handleSectorChartClick(slice.name)}
                                      title={`Klik untuk filter: ${slice.name}`}
                                    />
                                  );
                                })}
                              </svg>
                              
                              {/* Central textual info (Absolute center of donut chart) */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none px-4">
                                {activeSlice ? (
                                  <>
                                    <span className="text-[9px] font-bold text-[#8a8a86] uppercase tracking-wider truncate max-w-[85px]" title={activeSlice.name}>{activeSlice.name.split(" ")[0]}</span>
                                    <span className="text-[13px] font-extrabold text-[#37352f] leading-none mt-1">{activeSlice.count} Loker</span>
                                    <span className="text-[9px] font-semibold text-[#8a8a86] mt-0.5">{activeSlice.percentage.toFixed(0)}%</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-[#8a8a86] font-bold">Sektor</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Legend Panel */}
                            <div className="w-1/2 flex flex-col gap-1.5 select-none">
                              {slices.map((slice, idx) => (
                                <div 
                                  key={idx}
                                  onClick={() => handleSectorChartClick(slice.name)}
                                  onMouseEnter={() => setHoveredSectorSlice(idx)}
                                  onMouseLeave={() => setHoveredSectorSlice(null)}
                                  className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors border ${
                                    hoveredSectorSlice === idx 
                                      ? "bg-[#f7f7f5]/80 border-[#edece9]" 
                                      : "border-transparent hover:bg-[#f7f7f5]/40"
                                  }`}
                                  title={`Klik untuk filter: ${slice.name}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                                    <span className={`text-[11.5px] truncate font-medium ${hoveredSectorSlice === idx ? "text-[#1d7bb8]" : "text-[#37352f]"}`}>
                                      {slice.name}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-[#8a8a86] font-semibold flex-shrink-0 ml-2">
                                    {slice.count}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Card 10: Analisis Industri Terpopuler */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Analisis Industri Terpopuler</h3>
                      <p className="text-[11px] text-[#8a8a86]">Pembagian lowongan berdasarkan sub-kategori bidang industri</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.industryBreakdown.map((item, idx) => {
                        const maxCount = analyticsData.industryBreakdown[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <div key={idx} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-semibold text-[#37352f] truncate max-w-[240px]">{item.name}</span>
                              <span className="text-[#8a8a86] font-semibold text-[11px]">
                                {item.count} Loker <span className="font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/30 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#8a8a86] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 6: Sebaran Kualifikasi Jenjang Pendidikan vs Kategori Fungsi & Peran Pekerjaan */}
                  {/* Card 11: Sebaran Kualifikasi Jenjang Pendidikan */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Sebaran Kualifikasi Jenjang Pendidikan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Persentase prasyarat tingkat pendidikan minimal bagi calon pelamar</p>
                    </div>

                    <div className="mt-4 flex flex-col items-center justify-center flex-grow">
                      {(() => {
                        const maxVal = Math.max(...analyticsData.eduBreakdown.map(d => d.count), 1);
                        const width = 300;
                        const height = 140;
                        const paddingLeft = 35;
                        const paddingRight = 15;
                        const paddingTop = 15;
                        const paddingBottom = 25;
                        
                        const chartW = width - paddingLeft - paddingRight;
                        const chartH = height - paddingTop - paddingBottom;
                        
                        return (
                          <div className="w-full relative flex flex-col items-center select-none">
                            <svg className="w-full h-36 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                              {/* Horizontal Grid lines */}
                              <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#edece9" strokeWidth="0.8" strokeDasharray="3 3" />
                              <line x1={paddingLeft} y1={paddingTop + chartH / 2} x2={width - paddingRight} y2={paddingTop + chartH / 2} stroke="#edece9" strokeWidth="0.8" strokeDasharray="3 3" />
                              <line x1={paddingLeft} y1={paddingTop + chartH} x2={width - paddingRight} y2={paddingTop + chartH} stroke="#edece9" strokeWidth="1" />
                              
                              {/* Y Axis Labels */}
                              <text x={paddingLeft - 8} y={paddingTop + 3} textAnchor="end" className="text-[8.5px] fill-[#8a8a86] font-medium">{Math.round(maxVal)}</text>
                              <text x={paddingLeft - 8} y={paddingTop + chartH / 2 + 3} textAnchor="end" className="text-[8.5px] fill-[#8a8a86] font-medium">{Math.round(maxVal / 2)}</text>
                              <text x={paddingLeft - 8} y={paddingTop + chartH + 3} textAnchor="end" className="text-[8.5px] fill-[#8a8a86] font-medium">0</text>
                              
                              {/* Columns */}
                              {analyticsData.eduBreakdown.map((item, idx) => {
                                const barW = 32;
                                const spacing = (chartW - (barW * analyticsData.eduBreakdown.length)) / (analyticsData.eduBreakdown.length + 1);
                                const x = paddingLeft + spacing + idx * (barW + spacing);
                                const barH = (item.count / maxVal) * chartH;
                                const y = paddingTop + chartH - barH;
                                
                                return (
                                  <g 
                                    key={idx}
                                    onMouseEnter={() => setHoveredEduBar(idx)}
                                    onMouseLeave={() => setHoveredEduBar(null)}
                                    className="cursor-help"
                                  >
                                    {/* Transparent click/hover catcher rectangle */}
                                    <rect 
                                      x={x - spacing/2} 
                                      y={paddingTop} 
                                      width={barW + spacing} 
                                      height={chartH} 
                                      fill="transparent" 
                                    />
                                    
                                    {/* Bar Background track */}
                                    <rect 
                                      x={x} 
                                      y={paddingTop} 
                                      width={barW} 
                                      height={chartH} 
                                      rx="4" 
                                      fill="#edece9" 
                                      className="opacity-20" 
                                    />
                                    
                                    {/* Main Gradient Bar */}
                                    <rect 
                                      x={x} 
                                      y={y} 
                                      width={barW} 
                                      height={barH} 
                                      rx="4" 
                                      fill="url(#purpleGradCol)" 
                                      className={`transition-all duration-300 ${hoveredEduBar === idx ? 'brightness-90 filter drop-shadow-sm' : ''}`}
                                    />
                                    
                                    {/* X Axis Label */}
                                    <text 
                                      x={x + barW / 2} 
                                      y={paddingTop + chartH + 15} 
                                      textAnchor="middle" 
                                      className={`text-[9.5px] font-bold transition-colors ${hoveredEduBar === idx ? 'fill-[#6b21a8]' : 'fill-[#5a5a57]'}`}
                                    >
                                      {item.name}
                                    </text>
                                  </g>
                                );
                              })}
                              
                              {/* Gradients */}
                              <defs>
                                <linearGradient id="purpleGradCol" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#9041a8" />
                                  <stop offset="100%" stopColor="#c084fc" />
                                </linearGradient>
                              </defs>
                            </svg>
                            
                            {/* Dynamic Tooltip inside card */}
                            <div className="h-6 mt-1 flex items-center justify-center text-center">
                              {hoveredEduBar !== null ? (
                                <div className="text-[10px] font-bold text-[#6b21a8] animate-fade-in bg-[#f3ebf7] border border-[#d8b4fe]/50 rounded-full px-3 py-0.5 shadow-3xs">
                                  {analyticsData.eduBreakdown[hoveredEduBar].name}: <span className="underline">{analyticsData.eduBreakdown[hoveredEduBar].count}</span> Loker ({analyticsData.eduBreakdown[hoveredEduBar].percentage}%)
                                </div>
                              ) : (
                                <span className="text-[9px] text-[#8a8a86] italic">Arahkan kursor ke kolom jenjang</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Card 12: Kategori Fungsi & Peran Pekerjaan */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Kategori Fungsi & Peran Pekerjaan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Klasifikasi penempatan posisi magang berdasarkan divisi bidang peran</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.rolesBreakdown.map((item, idx) => {
                        const maxCount = analyticsData.rolesBreakdown[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <div key={idx} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-semibold text-[#37352f]">{item.name}</span>
                              <span className="text-[#8a8a86] font-semibold text-[11px]">
                                {item.count} Loker <span className="font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/50 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#2563eb] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 7-8: Sektor, Korelasi & Keahlian Analisis (Standard 2-Column Grid Items) */}
                    
                    {/* Card 13: Rata-Rata Kuota per Lowongan (Sektor) */}
                    <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-[14px] text-[#37352f]">Rata-Rata Kuota per Lowongan (Sektor)</h3>
                        <p className="text-[11px] text-[#8a8a86]">Rata-rata alokasi kursi magang per lowongan berdasarkan sektor kerja</p>
                      </div>

                      <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                        {analyticsData.avgQuotaPerSector.map((item, idx) => {
                          const maxQuota = analyticsData.avgQuotaPerSector[0]?.avgQuota || 1;
                          const pct = (item.avgQuota / maxQuota) * 100;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => handleSectorChartClick(item.name)}
                              className="flex flex-col gap-1.5 cursor-pointer group/bar hover:opacity-90 transition-all"
                              title={`Klik untuk filter: ${item.name}`}
                            >
                              <div className="flex justify-between items-center text-[12px]">
                                <span className="font-semibold text-[#37352f] group-hover/bar:text-[#1d7bb8] transition-colors">{item.name}</span>
                                <span className="text-[#8a8a86] font-semibold text-[11px]">
                                  {item.avgQuota} Orang / Loker
                                </span>
                              </div>
                              <div className="w-full bg-[#edece9]/50 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-[#1d7bb8] h-full rounded-full transition-all duration-500 group-hover/bar:brightness-110" 
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card 14: Indeks Kompetisi Sektoral */}
                    <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-[14px] text-[#37352f]">Indeks Kompetisi Sektoral</h3>
                        <p className="text-[11px] text-[#8a8a86]">Rasio keketatan jumlah pelamar dibanding kuota per sektor kerja (1 : X Pelamar)</p>
                      </div>

                      <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                        {analyticsData.sectoralCompetitionIndex.map((item, idx) => {
                          const maxRatio = analyticsData.sectoralCompetitionIndex[0]?.ratio || 1;
                          const pct = (item.ratio / maxRatio) * 100;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => handleSectorChartClick(item.name)}
                              className="flex flex-col gap-1.5 cursor-pointer group/bar hover:opacity-90 transition-all"
                              title={`Klik untuk filter: ${item.name}`}
                            >
                              <div className="flex justify-between items-center text-[12px]">
                                <span className="font-semibold text-[#37352f] group-hover/bar:text-[#1d7bb8] transition-colors">{item.name}</span>
                                <span className="text-[#c52447] font-bold text-[11px]">
                                  1 : {item.ratio} <span className="text-[#8a8a86] font-normal">({item.passRate}% lolos)</span>
                                </span>
                              </div>
                              <div className="w-full bg-[#edece9]/50 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-[#c52447] h-full rounded-full transition-all duration-500 group-hover/bar:brightness-110" 
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card 15: Korelasi Kuota vs Minat Pelamar */}
                    <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full relative group">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-[14px] text-[#37352f]">Korelasi Kuota vs Minat Pelamar</h3>
                        <p className="text-[11px] text-[#8a8a86]">Rata-rata pendaftar berdasarkan rentang kuota (Arahkan kursor ke titik)</p>
                      </div>

                      <div className="mt-4 flex flex-col items-center justify-center flex-grow">
                        {(() => {
                          const maxVal = Math.max(...analyticsData.quotaCorrelation.map(d => d.avgApplicants), 1);
                          const points = analyticsData.quotaCorrelation.map((d, i) => {
                            const x = 40 + i * 80;
                            const y = 120 - (d.avgApplicants / maxVal) * 85;
                            return { x, y, ...d };
                          });
                          
                          // Construct SVG path string
                          const pathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y}`;
                          const areaD = `M ${points[0].x} 130 L ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} L ${points[3].x} 130 Z`;

                          return (
                            <div className="w-full relative flex flex-col items-center">
                              <svg className="w-full h-40 overflow-visible" viewBox="0 0 300 150">
                                {/* Horizontal Grid lines */}
                                <line x1="30" y1="35" x2="280" y2="35" stroke="#edece9" strokeWidth="0.8" strokeDasharray="4 4" />
                                <line x1="30" y1="80" x2="280" y2="80" stroke="#edece9" strokeWidth="0.8" strokeDasharray="4 4" />
                                <line x1="30" y1="125" x2="280" y2="125" stroke="#edece9" strokeWidth="1" />
                                
                                {/* Y Grid labels */}
                                <text x="25" y="38" textAnchor="end" className="text-[8px] fill-[#8a8a86] font-medium">{Math.round(maxVal)}</text>
                                <text x="25" y="83" textAnchor="end" className="text-[8px] fill-[#8a8a86] font-medium">{Math.round(maxVal / 2)}</text>
                                <text x="25" y="128" textAnchor="end" className="text-[8px] fill-[#8a8a86] font-medium">0</text>

                                {/* Shaded Area */}
                                <path d={areaD} fill="url(#blueGradCol)" className="opacity-15 transition-opacity" />
                                
                                {/* Connecting Line */}
                                <path d={pathD} fill="none" stroke="#1d7bb8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Interactive Dots */}
                                {points.map((pt, idx) => (
                                  <g 
                                    key={idx}
                                    onMouseEnter={() => setHoveredCorrelationPoint(idx)}
                                    onMouseLeave={() => setHoveredCorrelationPoint(null)}
                                    className="cursor-pointer"
                                  >
                                    {/* Pulsing ring on hover */}
                                    {hoveredCorrelationPoint === idx && (
                                      <circle cx={pt.x} cy={pt.y} r="8" fill="#1d7bb8" className="opacity-30 animate-pulse" />
                                    )}
                                    <circle cx={pt.x} cy={pt.y} r="4" fill="#1d7bb8" stroke="white" strokeWidth="1.5" className="transition-all duration-200" />
                                  </g>
                                ))}

                                {/* X Grid labels */}
                                {points.map((pt, idx) => (
                                  <text key={idx} x={pt.x} y="142" textAnchor="middle" className="text-[8px] fill-[#5a5a57] font-semibold">
                                    {pt.name.replace("Kuota ", "")}
                                  </text>
                                ))}

                                {/* Gradients */}
                                <defs>
                                  <linearGradient id="blueGradCol" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#1d7bb8" />
                                    <stop offset="100%" stopColor="#1d7bb8" stopOpacity="0" />
                                  </linearGradient>
                                </defs>
                              </svg>

                              {/* Dynamic Tooltip inside the card */}
                              <div className="h-6 mt-1 flex items-center justify-center text-center">
                                {hoveredCorrelationPoint !== null ? (
                                  <div className="text-[9.5px] font-bold text-[#1d7bb8] animate-fade-in bg-[#1d7bb8]/5 border border-[#1d7bb8]/25 rounded px-1.5 py-0.2">
                                    {points[hoveredCorrelationPoint].name}: <span className="underline">{points[hoveredCorrelationPoint].avgApplicants}</span> pelamar
                                  </div>
                                ) : (
                                  <span className="text-[8.5px] text-[#8a8a86] italic">Arahkan kursor ke titik</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Card 16: Keahlian Teknis Terpopuler */}
                    <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-[14px] text-[#37352f]">Keahlian Teknis Terpopuler</h3>
                        <p className="text-[11px] text-[#8a8a86]">Klik tag keahlian terpopuler untuk memfilter lowongan</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-4 flex-grow content-center justify-center">
                        {analyticsData.topSkills.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSkillChartClick(item.name)}
                            className="bg-[#f7f7f5]/80 hover:bg-[#1d7bb8]/10 hover:text-[#1d7bb8] border border-[#edece9] rounded-md px-2 py-1 text-[10px] font-bold text-[#37352f] cursor-pointer transition-all hover:scale-105 shadow-3xs flex items-center gap-1 group/tag"
                            title={`Klik untuk mencari posisi: ${item.name}`}
                          >
                            <span className="group-hover/tag:underline">{item.name}</span>
                            <span className="text-[8.5px] text-[#8a8a86] bg-[#edece9]/55 group-hover/tag:bg-[#1d7bb8]/20 group-hover/tag:text-[#1d7bb8] rounded px-1 py-0.2">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
              </div>
            )}

            {/* Kelayakan View */}
            {viewTab === "kelayakan" && (
              <div className="flex flex-col lg:flex-row gap-6 animate-fade-in select-none">
                {/* Kolom Kiri: Input Profil & Progress Ring */}
                <div className="w-full lg:w-5/12 flex flex-col gap-5">
                  <div className="bg-white border border-[#edece9] rounded-xl p-5 shadow-3xs">
                    <h3 className="font-bold text-[15px] text-[#37352f] mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#1d7bb8]" />
                      Profil Pelamar
                    </h3>
                    
                    <div className="flex flex-col gap-4">
                      {/* Dropdown Jurusan */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-[#8a8a86] uppercase tracking-wider">Jurusan Anda</label>
                        <select
                          value={calcMajorDraft}
                          onChange={(e) => setCalcMajorDraft(e.target.value)}
                          className="w-full text-[13px] border border-[#edece9] rounded-lg px-3 py-2 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                        >
                          {filterOptions.majors.map((m) => (
                            <option key={m} value={m}>{m} ({filterOptions.majorCounts[m] || 0})</option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown Jenjang */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-[#8a8a86] uppercase tracking-wider">Jenjang Pendidikan</label>
                        <select
                          value={calcEduDraft}
                          onChange={(e) => setCalcEduDraft(e.target.value)}
                          className="w-full text-[13px] border border-[#edece9] rounded-lg px-3 py-2 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                        >
                          <option value="">Semua Jenjang (Pendidikan)</option>
                          {filterOptions.educations.map((ed) => (
                            <option key={ed} value={ed}>{ed} ({filterOptions.educationCounts[ed] || 0})</option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown Lokasi */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-[#8a8a86] uppercase tracking-wider">Preferensi Lokasi</label>
                        <select
                          value={calcCityDraft}
                          onChange={(e) => setCalcCityDraft(e.target.value)}
                          className="w-full text-[13px] border border-[#edece9] rounded-lg px-3 py-2 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                        >
                          <option value="">Semua Lokasi (Kota)</option>
                          {filterOptions.cities.map((ct) => (
                            <option key={ct} value={ct}>{ct} ({filterOptions.cityCounts[ct] || 0})</option>
                          ))}
                        </select>
                      </div>

                      {/* Button Search */}
                      <button
                        onClick={() => {
                          setCalcMajor(calcMajorDraft);
                          setCalcCity(calcCityDraft);
                          setCalcEdu(calcEduDraft);
                        }}
                        className="w-full bg-[#1d7bb8] text-white hover:bg-[#155a8a] py-2 rounded-lg text-[12.5px] font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer mt-2 active:scale-[0.98]"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Cari Lowongan Sesuai Profil
                      </button>
                    </div>
                  </div>

                  {/* Ringkasan Ring Progress */}
                  <div className="bg-white border border-[#edece9] rounded-xl p-5 shadow-3xs flex flex-col items-center text-center gap-4">
                    <h4 className="font-semibold text-[13.5px] text-[#5a5a57]">Statistik Kelayakan Loker</h4>
                    
                    {/* SVG Circular Progress Meter */}
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background Ring */}
                        <circle cx="50" cy="50" r="40" stroke="#edece9" strokeWidth="8" fill="transparent" />
                        {/* Foreground Ring with Gradient */}
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          stroke="url(#calcGrad)" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - calcResults.percentage / 100)}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                        <defs>
                          <linearGradient id="calcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1d7bb8" />
                            <stop offset="100%" stopColor="#00e5ff" />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Percent Center Label */}
                      <div className="absolute flex flex-col items-center">
                        <span className="text-[24px] font-extrabold text-[#37352f] leading-none">{calcResults.percentage}%</span>
                        <span className="text-[9px] text-[#8a8a86] font-bold uppercase mt-1">Kesesuaian</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-[12px] text-[#37352f] leading-relaxed">
                        Anda memenuhi syarat kelayakan untuk <strong>{calcResults.eligibleJobs.length}</strong> posisi dari total {listings.length} lowongan aktif magang.
                      </p>
                      
                      {calcResults.eligibleJobs.length > 0 && (
                        <div className="mt-2 p-3 bg-[#e8f4fa] text-[#1d7bb8] rounded-lg text-[11px] font-semibold text-left flex flex-col gap-1 border border-[#1d7bb8]/10 w-full">
                          <div>Fokus Terbanyak: <span className="underline">{calcResults.topCompany}</span></div>
                          <div>Rata-Rata Peluang Lolos: <span className="underline">{calcResults.avgPeluang}%</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan: Rekomendasi Lowongan */}
                <div className="w-full lg:w-7/12 flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[#edece9]">
                    <h3 className="font-bold text-[14.5px] text-[#37352f]">Rekomendasi Lowongan Teratas</h3>
                    <span className="text-[11px] text-[#8a8a86] font-semibold">
                      Diurutkan berdasarkan Peluang Lolos Tertinggi
                    </span>
                  </div>

                  <div className="flex flex-col gap-3.5 max-h-[680px] overflow-y-auto pr-1">
                    {calcResults.eligibleJobs.length > 0 ? (
                      calcResults.eligibleJobs.slice(0, 8).map((job) => {
                        const pass = parseFloat(job.stats.passRate);
                        const isHighChance = pass > 15;
                        const isLowChance = pass < 3;
                        
                        return (
                          <div 
                            key={job["Link Detail"]}
                            className="bg-white border border-[#edece9] rounded-xl p-4 hover:border-[#dfdfde] hover:shadow-2xs transition-all duration-300 flex flex-col justify-between gap-3 relative group"
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex flex-col gap-1">
                                <h4 className="font-bold text-[13px] text-[#37352f] group-hover:text-[#1d7bb8] transition-colors leading-tight">
                                  {job["Judul Lowongan"]}
                                </h4>
                                <span className="text-[11px] font-semibold text-[#8a8a86]">{job["Perusahaan"]}</span>
                              </div>

                              <span className={`text-[10px] font-extrabold px-2.5 py-0.75 rounded-full whitespace-nowrap flex-shrink-0 ${
                                isHighChance 
                                  ? "bg-[#e2f5ec] text-[#15803d]" 
                                  : isLowChance 
                                    ? "bg-[#fde8e8] text-[#9b1c1c]" 
                                    : "bg-[#fef9c3] text-[#854d0e]"
                              }`}>
                                Peluang: {job.stats.passRate}%
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 text-[10.5px] text-[#5a5a57] select-none">
                              <span className="bg-[#edece9]/50 border border-[#edece9] rounded px-1.5 py-0.5 font-medium flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#8a8a86]" />
                                {job["Kota"]}
                              </span>
                              <span className="bg-[#edece9]/50 border border-[#edece9] rounded px-1.5 py-0.5 font-medium flex items-center gap-1">
                                <GraduationCap className="w-3 h-3 text-[#8a8a86]" />
                                {job["Pendidikan"]}
                              </span>
                              <span className="bg-[#edece9]/50 border border-[#edece9] rounded px-1.5 py-0.5 font-medium">
                                Kuota: {job.stats.kuota}
                              </span>
                              <span className="bg-[#edece9]/50 border border-[#edece9] rounded px-1.5 py-0.5 font-medium">
                                Pelamar: {job.stats.pelamar}
                              </span>
                            </div>

                            <div className="flex justify-between items-center border-t border-[#edece9]/60 pt-2 mt-1 select-none">
                              <span className="text-[10px] text-[#8a8a86] italic truncate max-w-[220px]" title={job["Jurusan"]}>
                                Kualifikasi: {job["Jurusan"]}
                              </span>
                              <button
                                onClick={() => setSelectedJob(job)}
                                className="bg-[#f1f1ef] hover:bg-[#edece9] text-[#37352f] text-[11px] font-bold px-3 py-1.25 rounded-md transition-all cursor-pointer flex items-center gap-1"
                              >
                                Lihat Detail
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-[#f7f7f5] rounded-xl p-10 border border-dashed border-[#edece9] text-center flex flex-col items-center justify-center gap-2">
                        <HelpCircle className="w-8 h-8 text-[#8a8a86]" />
                        <span className="font-bold text-[13px] text-[#37352f]">Tidak Ada Lowongan yang Cocok</span>
                        <span className="text-[11.5px] text-[#8a8a86] max-w-xs">
                          Coba ganti jurusan, perluas lokasi, atau turunkan kualifikasi jenjang pendidikan untuk mendapatkan rekomendasi lowongan.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* End of Main Content Wrapper */}
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
            className="bg-white border border-[#edece9] rounded-2xl w-full max-w-[660px] shadow-2xl relative flex flex-col overflow-hidden max-h-[90vh] md:max-h-[85vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Elegant Notion Peek Top Bar */}
            <div className="h-12 px-4 border-b border-[#edece9]/80 flex items-center justify-between bg-[#f7f7f5] flex-shrink-0 select-none">
              {/* Previous / Next Navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevJob}
                  disabled={currentIdx <= 0}
                  className="p-2 rounded hover:bg-[#edece9] text-[#5a5a57] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  title="Lowongan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextJob}
                  disabled={currentIdx >= filteredListings.length - 1}
                  className="p-2 rounded hover:bg-[#edece9] text-[#5a5a57] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
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
                  className="p-2 rounded hover:bg-[#edece9] text-[#5a5a57] hover:text-[#b78103] transition-colors cursor-pointer flex items-center gap-1 select-none"
                  title={savedJobs.includes(selectedJob["Link Detail"]) ? "Hapus dari Tersimpan" : "Simpan Lowongan"}
                >
                  <Bookmark className={`w-4 h-4 ${savedJobs.includes(selectedJob["Link Detail"]) ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                  <span className="text-[11.5px] font-medium hidden sm:inline">
                    {savedJobs.includes(selectedJob["Link Detail"]) ? "Tersimpan" : "Simpan"}
                  </span>
                </button>
                <button
                  onClick={handleShareJob}
                  className="p-2 rounded hover:bg-[#edece9] text-[#5a5a57] hover:text-[#1d7bb8] transition-colors cursor-pointer flex items-center gap-1.5 select-none"
                  title="Salin Tautan Lowongan"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-[11.5px] font-semibold hidden sm:inline">Salin Link</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="p-2 rounded hover:bg-[#edece9] text-[#5a5a57] hover:text-[#25D366] transition-colors cursor-pointer flex items-center gap-1.5 select-none"
                  title="Bagikan ke WhatsApp"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.8.001-2.605-1.01-5.056-2.85-6.897-1.84-1.841-4.29-2.853-6.897-2.853-5.407 0-9.81 4.403-9.814 9.81-.001 1.488.387 2.94 1.132 4.215l-.993 3.63 3.738-.981zm11.368-6.41c-.301-.15-1.778-.879-2.052-.978-.275-.1-.475-.15-.675.15-.2.3-.778.979-.95 1.178-.173.199-.347.224-.648.075-.3-.15-1.266-.467-2.41-1.485-.89-.791-1.49-1.77-1.665-2.07-.175-.3-.019-.462.13-.61.135-.133.301-.35.451-.524.15-.174.2-.299.3-.499.1-.2.05-.375-.025-.524-.075-.15-.675-1.625-.925-2.225-.244-.599-.49-.519-.675-.529-.174-.008-.374-.01-.574-.01-.2 0-.526.075-.801.374-.275.3-1.05 1.028-1.05 2.508s1.075 2.903 1.225 3.102c.15.2 2.11 3.224 5.112 4.521.714.308 1.272.493 1.707.63.717.228 1.37.196 1.885.119.574-.086 1.778-.726 2.027-1.427.25-.7.25-1.3.175-1.427-.075-.125-.275-.199-.575-.349z" />
                  </svg>
                  <span className="text-[11.5px] font-semibold hidden sm:inline">WhatsApp</span>
                </button>
                <span className="w-px h-4 bg-[#edece9] mx-0.5"></span>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-2 rounded hover:bg-[#edece9] text-[#5a5a57] transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto px-5 md:px-8 pt-5 pb-6 flex flex-col gap-5">

              {/* Job Title & Corporate Identity */}
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] md:text-[20px] font-extrabold text-[#37352f] leading-snug tracking-tight">
                  {selectedJob["Judul Lowongan"]}
                </h2>
                <div className="text-[12.5px] text-[#8a8a86] font-medium mt-0.5">
                  {selectedJob["Perusahaan"]}
                </div>
              </div>

              {/* 2-Column Responsive Dashboard Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-[#edece9]/80 py-4.5 select-none">
                {/* Column 1: Core Metadata (Left) */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Spesifikasi Loker</span>
                  
                  {/* Penempatan */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#9b9a97] flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#9b9a97]" />
                      Penempatan
                    </span>
                    <span className="text-[13px] text-[#37352f] font-semibold pl-4.5">{selectedJob["Kota"]}</span>
                  </div>

                  {/* Jenjang Studi */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#9b9a97] flex items-center gap-1 font-medium">
                      <GraduationCap className="w-3.5 h-3.5 text-[#9b9a97]" />
                      Jenjang Studi
                    </span>
                    <div className="pl-4.5 mt-0.5">
                      <span className="text-[#9041a8] bg-[#f6edf9] px-2 py-0.5 rounded font-bold text-[11.5px] w-fit">
                        {selectedJob["Pendidikan"]}
                      </span>
                    </div>
                  </div>

                  {/* Sektor Kerja */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#9b9a97] flex items-center gap-1 font-medium">
                      <Building className="w-3.5 h-3.5 text-[#9b9a97]" />
                      Sektor Kerja
                    </span>
                    <span className="text-[13px] text-[#37352f] font-semibold pl-4.5 truncate">
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
                </div>

                {/* Column 2: Statistical Insights Card (Right) */}
                <div className="flex flex-col gap-3 bg-[#f7f7f5]/55 p-3.5 rounded-xl border border-[#edece9]/80 shadow-3xs">
                  <span className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Statistik & Peluang</span>
                  
                  {/* Kuota & Pendaftar Row */}
                  <div className="grid grid-cols-2 gap-2 border-b border-[#edece9]/50 pb-2.5">
                    <div className="flex flex-col">
                      <span className="text-[10.5px] text-[#9b9a97] flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#9b9a97]" />
                        Kuota
                      </span>
                      <span className="text-[13px] text-[#37352f] font-bold mt-0.5">{selectedJobStats?.kuota} Orang</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10.5px] text-[#9b9a97] flex items-center gap-1 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-[#9b9a97]" />
                        Pelamar
                      </span>
                      <span className="text-[13px] text-[#37352f] font-bold mt-0.5">{selectedJobStats?.pelamar} Pelamar</span>
                    </div>
                  </div>

                  {/* Peluang Lolos & Persaingan */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#9b9a97] font-medium flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#9b9a97]" />
                        Peluang Lolos
                      </span>
                      <span className="text-[#c52447] bg-[#fdf2f2] px-2 py-0.5 rounded font-extrabold text-[12px]">
                        {selectedJobStats?.passRate}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#9b9a97] font-medium flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#9b9a97] rotate-90" />
                        Tingkat Persaingan
                      </span>
                      {(() => {
                        const comp = getCompetitionLevel(selectedJobStats?.passRate);
                        return (
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${comp.bg} ${comp.text}`}>
                            {comp.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Kualifikasi Jurusan */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider flex items-center gap-1 px-1">
                  <Tags className="w-3.5 h-3.5 text-[#8a8a86]" />
                  Kualifikasi Jurusan
                </h4>
                <div className="flex flex-wrap gap-1.5 p-1">
                  {selectedJob["Jurusan"]
                    .split(",")
                    .map((j) => j.trim())
                    .filter(Boolean)
                    .map((item, idx) => {
                      const tagColors = getNotionColor(item);
                      return (
                        <span
                          key={idx}
                          className={`text-[11.5px] px-2 py-0.75 rounded-md font-semibold border border-[#edece9]/70 ${tagColors.bg} ${tagColors.text}`}
                        >
                          {item}
                        </span>
                      );
                    })}
                </div>
              </div>

              {/* Job Description & Requirements from Database */}
              {selectedJob["Deskripsi Pekerjaan"] && selectedJob["Deskripsi Pekerjaan"] !== "Tidak tertera" && (
                <div className="flex flex-col gap-2.5 p-4 bg-white rounded-xl border border-[#edece9] text-[13px] text-[#37352f] leading-relaxed shadow-sm">
                  <h4 className="font-extrabold text-[#37352f] text-[11px] uppercase tracking-wider border-b border-[#edece9] pb-1.5 mb-0.5 select-none">
                    Deskripsi Pekerjaan
                  </h4>
                  <div className="flex flex-col gap-1 pl-0.5">
                    {renderDeskripsiPekerjaan(selectedJob["Deskripsi Pekerjaan"])}
                  </div>
                </div>
              )}

              {selectedJob["Persyaratan"] && selectedJob["Persyaratan"] !== "Tidak tertera" && (
                <div className="flex flex-col gap-2.5 p-4 bg-white rounded-xl border border-[#edece9] text-[13px] text-[#37352f] leading-relaxed shadow-sm">
                  <h4 className="font-extrabold text-[#37352f] text-[11px] uppercase tracking-wider border-b border-[#edece9] pb-1.5 mb-0.5 select-none">
                    Persyaratan & Keahlian
                  </h4>
                  <div className="flex flex-col gap-1 pl-0.5">
                    {renderPersyaratan(selectedJob["Persyaratan"])}
                  </div>
                </div>
              )}

              {/* Informational Section */}
              <div className="flex flex-col gap-2.5 p-3.5 bg-[#f7f7f5]/40 rounded-xl border border-[#edece9] text-[12px] text-[#5a5a57] leading-relaxed">
                <p>
                  Program magang ini bersumber langsung dari portal resmi rekrutmen <strong>{selectedJob["Perusahaan"]}</strong>. Harap verifikasi kualifikasi Anda sebelum mendaftar. Seluruh proses pendaftaran bersifat gratis.
                </p>
                <div className="border-t border-[#edece9]/70 pt-2.5 mt-0.5 text-[11px] text-[#8a8a86] flex flex-col gap-1 select-none">
                  <span className="font-bold text-[#5a5a57]">Disclamer & Kredit:</span>
                  <span>• KarirEnergi adalah situs non-resmi (Non-Official). Semua konten database bersumber dari Pertamina.</span>
                  <span>• Seluruh karya KarirEnergi bersifat gratis dan <strong>tidak boleh diperjualbelikan</strong>.</span>
                  <span>• Ikuti pembuat di Threads: <a href="https://www.threads.net/@mocitaz" target="_blank" rel="noopener noreferrer" className="text-[#1d7bb8] hover:underline font-bold">@mocitaz</a></span>
                </div>
              </div>

            </div>

            {/* Modal Footer (Action Bar) */}
            <div className="p-4 bg-[#f7f7f5] border-t border-[#edece9]/80 flex-shrink-0">
              <a
                href={selectedJob["Link Detail"]}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#37352f] text-white hover:bg-[#4d4b47] font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-[13px] transition-all shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                Daftar Melalui Portal Resmi
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Confirmation Modal */}
      {pendingBookmark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-sm w-full border border-[#edece9] shadow-lg p-5 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center gap-2.5 text-[#b78103]">
              <span className="w-8 h-8 rounded-full bg-[#fdf2e9] flex items-center justify-center">
                <Bookmark className="w-4 h-4 fill-[#b78103]" />
              </span>
              <h3 className="font-bold text-[15px] text-[#37352f]">Simpan Lowongan</h3>
            </div>
            
            <p className="text-[12.5px] text-[#5a5a57] leading-relaxed">
              Lowongan ini akan disimpan ke dalam <strong>Local Storage</strong> browser Anda. Ini berarti data tersimpan secara lokal di perangkat Anda dan akan hilang jika Anda menghapus riwayat atau cache browser. Apakah Anda yakin ingin menyimpan?
            </p>
            
            <label className="flex items-center gap-2 text-[11.5px] text-[#5a5a57] select-none cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#b78103] rounded border-[#edece9]"
              />
              <span>Jangan tanyakan lagi</span>
            </label>
            
            <div className="flex items-center justify-end gap-2.5 mt-1">
              <button
                onClick={() => setPendingBookmark(null)}
                className="px-3.5 py-2 text-[12px] font-semibold text-[#5a5a57] bg-white border border-[#edece9] hover:bg-[#f7f7f5] rounded-md transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmBookmark}
                className="px-3.5 py-2 text-[12px] font-semibold text-white bg-[#b78103] hover:bg-[#9d6c00] rounded-md transition-colors cursor-pointer"
              >
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Thumb-Friendly Mobile Filter Floating Action Button (FAB) */}
      {!sidebarOpen && viewTab !== "analytics" && (
        <button
          onClick={() => setFilterDrawerOpen(true)}
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#37352f] text-white rounded-full px-5 py-3 shadow-xl flex items-center gap-2 text-[12.5px] font-bold z-40 hover:bg-[#4d4b47] active:scale-95 transition-all select-none border border-[#4d4b47] animate-fade-in"
          title="Filter & Cari Lowongan"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#edece9]" />
          <span>Filter & Cari Loker</span>
          {(selectedCompany || selectedMajor || selectedCity || selectedEdu || selectedSector || search) && (
            <span className="w-2.5 h-2.5 bg-[#43873e] rounded-full animate-pulse flex-shrink-0"></span>
          )}
        </button>
      )}

      {/* Mobile Filter Bottom Sheet */}
      {filterDrawerOpen && (
        <>
          {/* Backdrop blur overlay */}
          <div
            className="md:hidden fixed inset-0 bg-black/35 backdrop-blur-xs z-50 transition-opacity duration-300"
            onClick={() => setFilterDrawerOpen(false)}
          />

          {/* Bottom Sheet Modal Container */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-2xl z-55 flex flex-col shadow-2xl animate-slide-up border-t border-[#edece9] overflow-hidden">
            {/* Grab handle/Drag line at top */}
            <div className="w-12 h-1.5 bg-[#edece9] rounded-full mx-auto my-3 flex-shrink-0" />

            {/* Header */}
            <div className="px-5 pb-3 border-b border-[#edece9]/60 flex items-center justify-between flex-shrink-0">
              <h2 className="text-[14px] font-bold text-[#37352f]">Filter Lowongan</h2>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="p-1 text-[#5a5a57] hover:bg-[#edece9] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable Filters Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {/* Search */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Cari Kata Kunci</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
                  <input
                    type="text"
                    placeholder="Judul, jurusan, atau lokasi..."
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleApplyFilters(); }}
                    className="w-full text-[13px] border border-[#edece9] rounded-lg pl-9 pr-3 py-2 bg-[#f7f7f5]/50 outline-none focus:bg-white focus:border-[#c4c4c2] transition-all"
                  />
                </div>
              </div>

              {/* Company select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Perusahaan</label>
                <select
                  value={draftCompany}
                  onChange={(e) => setDraftCompany(e.target.value)}
                  className="w-full text-[13px] border border-[#edece9] rounded-lg px-3 py-2 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                >
                  <option value="">Semua Perusahaan</option>
                  {filterOptions.companies.map((c) => (
                    <option key={c} value={c}>{c} ({filterOptions.companyCounts[c] || 0})</option>
                  ))}
                </select>
              </div>

              {/* Major select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Jurusan</label>
                <select
                  value={draftMajor}
                  onChange={(e) => setDraftMajor(e.target.value)}
                  className="w-full text-[13px] border border-[#edece9] rounded-lg px-3 py-2 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                >
                  <option value="">Seluruh Jurusan (No Filter)</option>
                  {filterOptions.majors.map((m) => (
                    <option key={m} value={m}>{m} ({filterOptions.majorCounts[m] || 0})</option>
                  ))}
                </select>
              </div>

              {/* City select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Lokasi / Kota</label>
                <select
                  value={draftCity}
                  onChange={(e) => setDraftCity(e.target.value)}
                  className="w-full text-[13px] border border-[#edece9] rounded-lg px-3 py-2 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                >
                  <option value="">Semua Lokasi</option>
                  {filterOptions.cities.map((ct) => (
                    <option key={ct} value={ct}>{ct} ({filterOptions.cityCounts[ct] || 0})</option>
                  ))}
                </select>
              </div>

              {/* Education select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Pendidikan</label>
                <select
                  value={draftEdu}
                  onChange={(e) => setDraftEdu(e.target.value)}
                  className="w-full text-[13px] border border-[#edece9] rounded-lg px-3 py-2 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                >
                  <option value="">Semua Jenjang</option>
                  {filterOptions.educations.map((ed) => (
                    <option key={ed} value={ed}>{ed} ({filterOptions.educationCounts[ed] || 0})</option>
                  ))}
                </select>
              </div>

              {/* Sektor select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8a8a86] uppercase tracking-wider">Sektor Kerja</label>
                <select
                  value={draftSector}
                  onChange={(e) => setDraftSector(e.target.value)}
                  className="w-full text-[13px] border border-[#edece9] rounded-lg px-3 py-2 bg-white outline-none cursor-pointer focus:border-[#c4c4c2] transition-all notion-select"
                >
                  <option value="">Semua Sektor</option>
                  {filterOptions.sectors.map((s) => (
                    <option key={s} value={s}>{s} ({filterOptions.sectorCounts[s] || 0})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom sticky action bar */}
            <div className="px-5 py-4 border-t border-[#edece9] bg-[#fbfbfa] flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-2.5 rounded-lg border border-[#edece9] text-[#5a5a57] hover:bg-[#edece9]/50 text-[13px] font-bold transition-all cursor-pointer text-center"
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex-[2] py-2.5 rounded-lg bg-[#1d7bb8] text-white hover:bg-[#155a8a] text-[13px] font-bold transition-all cursor-pointer text-center shadow-sm flex items-center justify-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                Terapkan Filter
              </button>
            </div>
          </div>
        </>
      )}


      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#121212] text-white px-4 py-2.5 rounded-xl text-[12.5px] font-bold shadow-lg z-[9999] flex items-center gap-2 border border-white/10 animate-fade-in select-none">
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}

function EmptyState({ showSavedOnly, onReset }) {
  return (
    <div className="col-span-full py-16 px-4 flex flex-col items-center justify-center text-center bg-[#fbfbfa]/30 border border-dashed border-[#edece9] rounded-xl select-none animate-fade-in html.dark:bg-[#202020]/20 html.dark:border-[#2e2e2e] gap-3.5 max-w-xl mx-auto my-4">
      <HelpCircle className="w-12 h-12 text-[#9b9a97] stroke-[1.25]" />
      <div className="flex flex-col gap-1">
        <h3 className="text-[14.5px] font-bold text-[#37352f]">
          {showSavedOnly ? "Belum ada lowongan tersimpan" : "Tidak ada lowongan ditemukan"}
        </h3>
        <p className="text-[12px] text-[#8a8a86] max-w-sm">
          {showSavedOnly 
            ? "Klik ikon simpan pada kartu atau baris tabel lowongan untuk memantau lowongan magang favorit Anda."
            : "Coba sesuaikan kata kunci pencarian atau kurangi beberapa filter untuk melihat lowongan kembali."}
        </p>
      </div>
      {!showSavedOnly && onReset && (
        <button
          onClick={onReset}
          className="mt-1 px-4 py-1.5 text-[11.5px] font-bold text-[#1d7bb8] border border-[#1d7bb8]/25 rounded hover:bg-[#1d7bb8]/5 hover:border-[#1d7bb8]/50 transition-all cursor-pointer shadow-3xs"
        >
          Reset Semua Filter
        </button>
      )}
    </div>
  );
}
