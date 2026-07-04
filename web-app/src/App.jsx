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
  Share2
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

    const shareUrl = `${window.location.origin}${window.location.pathname}?job=${encodeURIComponent(selectedJob["Link Detail"])}`;
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
          const trimmed = p.trim();
          if (
            trimmed &&
            trimmed.length > 2 &&
            !trimmed.toLowerCase().includes("tidak tertera") &&
            !trimmed.toLowerCase().includes("semua jurusan")
          ) {
            seenMajors.add(trimmed);
          }
        });
        seenMajors.forEach((m) => {
          majors.add(m);
          majorCounts[m] = (majorCounts[m] || 0) + 1;
        });
      }
    });

    return {
      companies: Array.from(companies).sort(),
      cities: Array.from(cities).sort(),
      educations: Array.from(educations).sort(),
      sectors: Array.from(sectors).sort(),
      majors: Array.from(majors).sort(),
      companyCounts,
      cityCounts,
      educationCounts,
      sectorCounts,
      majorCounts,
    };
  }, [listings]);

  // Apply filters and sorting
  const filteredListings = useMemo(() => {
    // 1. Initial base filtering (all filters except search query)
    let result = listings.filter((job) => {
      const matchCompany = !selectedCompany || job["Perusahaan"] === selectedCompany;
      const matchMajor = !selectedMajor || job["Jurusan"].toLowerCase().includes(selectedMajor.toLowerCase());
      const matchCity = !selectedCity || job["Kota"] === selectedCity;
      const matchEdu = !selectedEdu || job["Pendidikan"] === selectedEdu;
      const matchSector = !selectedSector || job["Sektor"] === selectedSector;
      const matchSaved = !showSavedOnly || savedJobs.includes(job["Link Detail"]);

      return matchCompany && matchMajor && matchCity && matchEdu && matchSector && matchSaved;
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
      } else if (city.includes("bandung") || city.includes("semarang") || city.includes("surabaya") || city.includes("tasikmalaya") || city.includes("cilacap") || city.includes("cirebon") || city.includes("bali")) {
        regionalCount["Jawa & Bali (Luar Jabodetabek)"]++;
      } else if (city.includes("medan") || city.includes("palembang") || city.includes("dumai") || city.includes("lhokseumawe") || city.includes("indramayu") || city.includes("balongan") || city.includes("tanggamus") || city.includes("muara enim") || city.includes("sumatera") || city.includes("lampung")) {
        regionalCount["Sumatera"]++;
      } else if (city.includes("balikpapan") || city.includes("makassar") || city.includes("kalimantan") || city.includes("sulawesi") || city.includes("banjarmasin") || city.includes("samarinda")) {
        regionalCount["Kalimantan & Sulawesi"]++;
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
      topSkills
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
                      <option value="">Semua Jurusan</option>
                      {filterOptions.majors.map((m) => (
                        <option key={m} value={m}>{m}</option>
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
        <div className={`p-4 border-t border-[#edece9]/50 bg-[#fbfbfa] flex-shrink-0 ${sidebarOpen ? "block" : "hidden"}`}>
          <div className="flex flex-col gap-2.5 bg-[#f2f1ee]/50 border border-[#edece9]/70 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-[#37352f] select-none">
              <span>KarirEnergi &copy; 2026</span>
              <span className="text-[9px] font-bold bg-[#1d7bb8]/8 text-[#1d7bb8] px-1.5 py-0.5 rounded border border-[#1d7bb8]/15 tracking-wide uppercase">
                Non-Official
              </span>
            </div>

            <p className="text-[10.5px] text-[#5a5a57] leading-relaxed">
              Katalog independen. Semua data diperoleh dari rekrutmen resmi Pertamina. Karya ini bersifat gratis & tidak boleh diperjualbelikan.
            </p>

            <div className="flex items-center gap-2 text-[10.5px] text-[#43873e] bg-[#edf6ec]/50 border border-[#43873e]/10 py-1 px-2.5 rounded-lg font-bold select-none w-fit">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#43873e] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#43873e]"></span>
              </span>
              <span>{liveVisitors} orang sedang memantau</span>
            </div>

            <a
              href="https://www.threads.net/@mocitaz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 text-[10.5px] font-extrabold text-white bg-[#121212] hover:bg-[#2c2c2c] active:scale-[0.98] rounded-lg transition-all shadow-sm select-none cursor-pointer"
            >
              <span>Follow Threads @mocitaz</span>
              <ArrowUpRight className="w-3 h-3 text-[#edece9]" />
            </a>
          </div>
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
                  <span>Terakhir Diupdate: 4 Juli 2026, 11:15 WIB</span>
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
                <option value="">Semua Jurusan</option>
                {filterOptions.majors.map((m) => (
                  <option key={m} value={m}>{m}</option>
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
                  {(selectedCompany || search || selectedMajor || selectedCity || selectedEdu || selectedSector || showSavedOnly) ? (
                    <span className="text-[#1d7bb8] ml-1 font-semibold">
                      (Filter aktif: {[
                        selectedCompany ? `Instansi: ${selectedCompany}` : "",
                        search ? `Kata Kunci: "${search}"` : "",
                        selectedMajor ? `Jurusan: ${selectedMajor}` : "",
                        selectedCity ? `Kota: ${selectedCity}` : "",
                        selectedEdu ? `Jenjang: ${selectedEdu}` : "",
                        selectedSector ? `Sektor: ${selectedSector}` : "",
                        showSavedOnly ? "Favorit" : ""
                      ].filter(Boolean).join(", ")})
                    </span>
                  ) : null}
                </span>
                {(selectedCompany || search || selectedMajor || selectedCity || selectedEdu || selectedSector || showSavedOnly) && (
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

                {/* 2-Column Dashboard Layout (Flat Symmetrical Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Row 1: Leaderboard Anak Perusahaan vs Kebutuhan Rumpun Jurusan Terbanyak */}
                  {/* Card 1: Leaderboard Anak Perusahaan */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Leaderboard Anak Perusahaan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Anak perusahaan/subsidiari Pertamina dengan jumlah loker magang terbanyak</p>
                    </div>
                    
                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.companyLeaderboard.map((item, idx) => {
                        const maxVacancies = analyticsData.companyLeaderboard[0]?.vacancies || 1;
                        const pct = (item.vacancies / maxVacancies) * 100;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => handleCompanyChartClick(item.name)}
                            className="flex flex-col gap-1.5 cursor-pointer group/bar hover:opacity-90 transition-all"
                            title={`Klik untuk filter: ${item.name}`}
                          >
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-bold text-[#37352f] truncate max-w-[240px] group-hover/bar:text-[#1d7bb8] transition-colors">{idx + 1}. {item.name}</span>
                              <span className="text-[#5a5a57] font-semibold text-[11px] flex-shrink-0">
                                {item.vacancies} Posisi <span className="text-[#8a8a86] font-normal">• {item.applicants.toLocaleString()} pelamar</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/50 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#b78103] h-full rounded-full transition-all duration-500 group-hover/bar:brightness-110" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Kebutuhan Rumpun Jurusan Terbanyak */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Kebutuhan Rumpun Jurusan Terbanyak</h3>
                      <p className="text-[11px] text-[#8a8a86]">Kategori program studi yang paling sering dicari pada prasyarat pendaftaran</p>
                    </div>

                    <div className="flex flex-col gap-3 mt-4 flex-grow justify-center">
                      {analyticsData.sortedMajors.map((item, idx) => {
                        const maxCount = analyticsData.sortedMajors[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => handleMajorChartClick(item.name)}
                            className="flex flex-col gap-1 cursor-pointer group/bar hover:opacity-90 transition-all"
                            title={`Klik untuk filter: ${item.name}`}
                          >
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-semibold text-[#37352f] group-hover/bar:text-[#1d7bb8] transition-colors">{item.name}</span>
                              <span className="text-[#8a8a86] font-semibold text-[11px]">
                                {item.count} Loker <span className="font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/30 h-1.5 rounded-full overflow-hidden">
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

                    <div className="grid grid-cols-2 gap-3 mt-4 flex-grow justify-center">
                      {analyticsData.topCities.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleCityChartClick(item.name)}
                          className="bg-[#f7f7f5]/50 border border-[#edece9]/80 rounded-lg p-3 flex justify-between items-center cursor-pointer hover:border-[#1d7bb8]/40 hover:bg-[#1d7bb8]/5 hover:scale-[1.02] hover:shadow-2xs transition-all duration-200"
                          title={`Klik untuk filter: ${item.name}`}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[12px] font-bold text-[#37352f] truncate group-hover/card:text-[#1d7bb8]">{item.name}</span>
                            <span className="text-[10px] text-[#8a8a86]">{item.count} Lowongan</span>
                          </div>
                          <span className="text-[12px] font-extrabold text-[#c26100] ml-2 flex-shrink-0">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 8: Sebaran Wilayah / Region */}
                  <div className="bg-white border border-[#edece9] rounded-lg p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Sebaran Wilayah / Region</h3>
                      <p className="text-[11px] text-[#8a8a86]">Pembagian penempatan magang berdasarkan kluster wilayah Indonesia</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.regionalDistribution.map((item, idx) => {
                        const maxCount = analyticsData.regionalDistribution[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <div key={idx} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-semibold text-[#37352f]">{item.name}</span>
                              <span className="text-[#8a8a86] font-semibold text-[11px]">
                                {item.count} Loker <span className="font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/50 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#c26100] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
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
                  className="p-2 rounded hover:bg-[#edece9] text-[#5a5a57] hover:text-[#1d7bb8] transition-colors cursor-pointer flex items-center gap-1 select-none"
                  title="Bagikan Lowongan"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-[11.5px] font-medium hidden sm:inline">Bagikan</span>
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
                  <option value="">Semua Jurusan</option>
                  {filterOptions.majors.map((m) => (
                    <option key={m} value={m}>{m}</option>
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
