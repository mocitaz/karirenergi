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
  Timer
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

// Clean and swap title parts: "INTERNSHIP 2026 - PT Company - Position" -> "Position - PT Company"
export function formatTitle(rawTitle) {
  if (!rawTitle) return "";
  const parts = rawTitle.split(/\s*[-–]\s*/);
  if (parts.length < 2) {
    return rawTitle.replace(/^INTERNSHIP\s*\d*\s*[-–]?\s*/i, "").trim();
  }

  const firstPart = parts[0].trim();
  const isInternshipPrefix = /^INTERNSHIP\s*\d*$/i.test(firstPart);

  if (isInternshipPrefix) {
    if (parts.length === 2) {
      return parts[1].trim();
    } else if (parts.length >= 3) {
      const company = parts[1].trim();
      const position = parts.slice(2).join(" - ").trim();
      return `${position} - ${company}`;
    }
  }

  return rawTitle;
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

      if (job["Jurusan"] && job["Jurusan"] !== "Semua Jurusan / Tidak tertera") {
        const parts = job["Jurusan"].split(/,|\bserta\b|dan|;/gi);
        const seenMajors = new Set();
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
            seenMajors.add(capitalized);
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

  // Memoized calculations for the Analytics Dashboard
  const analyticsData = useMemo(() => {
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
      const s = j.Sektor || "Tidak tertera";
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
      industryBreakdown
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
        <div className={`p-4 border-t border-[#edece9]/50 text-[10px] text-[#9b9a97] text-center flex-shrink-0 bg-[#f7f7f5]/20 ${sidebarOpen ? "block" : "hidden"
          }`}>
          &copy; 2026 KarirEnergi
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
                <div className="text-[10.5px] text-[#9b9a97] mt-0.5">
                  Terakhir Diupdate: 3 Juli 2026, 08:55 WIB
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

            {/* Mobile Result Count & Sorting */}
            <div className="flex items-center justify-between text-[11.5px] text-[#9b9a97] md:hidden pt-1 border-t border-[#edece9]/40">
              <span>
                Menampilkan <span className="font-semibold text-[#37352f]">{filteredListings.length}</span> lowongan
              </span>
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
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Dynamic Database Content Area */}
        <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 md:px-10 py-5 md:py-6">
          <div className="max-w-6xl mx-auto">

            {/* Gallery View */}
            {viewTab === "gallery" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                {filteredListings.slice(0, visibleLimit).map((job) => {
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
                      className="group border border-[#edece9] rounded-lg p-4 flex flex-col justify-between cursor-pointer hover:border-[#dfdfde] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all bg-white"
                    >
                      {/* Top Part */}
                      <div className="flex flex-col gap-2 flex-grow">
                        {/* Title */}
                        <h3 className="font-bold text-[13.5px] text-[#37352f] leading-snug group-hover:text-[#1d7bb8] transition-colors line-clamp-2 mt-0.5">
                          {job["Judul Lowongan"]}
                        </h3>

                        {/* Company Name (underneath title) */}
                        <div className="text-[11px] text-[#8a8a86] font-semibold leading-normal -mt-0.5">
                          {job["Perusahaan"]}
                        </div>

                        {/* Majors & Education list */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-[10px] bg-[#edece9]/50 text-[#5a5a57] border border-[#edece9]/80 px-1.5 py-0.5 rounded-sm font-semibold flex-shrink-0 select-none">
                            {job["Pendidikan"]}
                          </span>
                          {majorTags.map((tag, idx) => (
                            <span key={idx} className="text-[10px] bg-[#f7f7f5] text-[#5a5a57] border border-[#edece9]/80 px-1.5 py-0.5 rounded-sm truncate max-w-[105px]">
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
                        <th className="p-3 border-r border-[#edece9] text-center w-24">Pendidikan</th>
                        <th className="p-3 border-r border-[#edece9]">Kuota & Pelamar</th>
                        <th className="p-3 border-r border-[#edece9]">Peluang Lolos</th>
                        <th className="p-3">Jurusan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListings.slice(0, visibleLimit).map((job, idx) => {
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
                                <Bookmark className={`w-3.5 h-3.5 ${savedJobs.includes(job["Link Detail"]) ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                              </button>
                            </td>
                            <td className="p-3 border-r border-[#edece9] font-medium max-w-[180px] truncate">{job["Perusahaan"]}</td>
                            <td className="p-3 border-r border-[#edece9] font-semibold text-[#1d7bb8] max-w-[240px] truncate">{job["Judul Lowongan"]}</td>
                            <td className="p-3 border-r border-[#edece9] max-w-[140px] truncate">{job["Kota"]}</td>
                            <td className="p-3 border-r border-[#edece9] font-bold text-[#9041a8] text-center">{job["Pendidikan"]}</td>
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

            {/* Analytics Dashboard View */}
            {viewTab === "analytics" && (
              <div className="flex flex-col gap-6 animate-fade-in pb-10 select-none">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#f7f7f5]/60 border border-[#edece9] rounded-lg p-4 flex flex-col gap-1 shadow-3xs">
                    <span className="text-[11px] font-bold text-[#8a8a86] uppercase tracking-wider">Total Posisi Loker</span>
                    <span className="text-2xl font-extrabold text-[#37352f] tracking-tight">{analyticsData.totalJobs}</span>
                    <span className="text-[10px] text-[#8a8a86] mt-0.5">Aktif di database</span>
                  </div>
                  
                  <div className="bg-[#f7f7f5]/60 border border-[#edece9] rounded-lg p-4 flex flex-col gap-1 shadow-3xs">
                    <span className="text-[11px] font-bold text-[#8a8a86] uppercase tracking-wider">Total Kuota Penerimaan</span>
                    <span className="text-2xl font-extrabold text-[#c26100] tracking-tight">{analyticsData.totalQuota}</span>
                    <span className="text-[10px] text-[#8a8a86] mt-0.5">Orang mahasiswa magang</span>
                  </div>

                  <div className="bg-[#f7f7f5]/60 border border-[#edece9] rounded-lg p-4 flex flex-col gap-1 shadow-3xs">
                    <span className="text-[11px] font-bold text-[#8a8a86] uppercase tracking-wider">Total Pendaftar Aktif</span>
                    <span className="text-2xl font-extrabold text-[#37352f] tracking-tight">{analyticsData.totalApplicants.toLocaleString()}</span>
                    <span className="text-[10px] text-[#8a8a86] mt-0.5">Pelamar terdaftar</span>
                  </div>

                  <div className="bg-[#f7f7f5]/60 border border-[#edece9] rounded-lg p-4 flex flex-col gap-1 shadow-3xs">
                    <span className="text-[11px] font-bold text-[#8a8a86] uppercase tracking-wider">Rata-Rata Keketatan</span>
                    <span className="text-2xl font-extrabold text-[#c52447] tracking-tight">{analyticsData.avgPassRate}%</span>
                    <span className="text-[10px] text-[#8a8a86] mt-0.5">Peluang kelulusan rata-rata</span>
                  </div>
                </div>

                {/* 2-Column Dashboard Layout (Flat Symmetrical Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Row 1: Leaderboard Anak Perusahaan vs Kebutuhan Rumpun Jurusan Terbanyak */}
                  {/* Card 1: Leaderboard Anak Perusahaan */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Leaderboard Anak Perusahaan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Anak perusahaan/subsidiari Pertamina dengan jumlah loker magang terbanyak</p>
                    </div>
                    
                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.companyLeaderboard.map((item, idx) => {
                        const maxVacancies = analyticsData.companyLeaderboard[0]?.vacancies || 1;
                        const pct = (item.vacancies / maxVacancies) * 100;
                        return (
                          <div key={idx} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-bold text-[#37352f] truncate max-w-[240px]">{idx + 1}. {item.name}</span>
                              <span className="text-[#5a5a57] font-semibold text-[11px] flex-shrink-0">
                                {item.vacancies} Posisi <span className="text-[#8a8a86] font-normal">• {item.applicants.toLocaleString()} pelamar</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/50 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-[#b78103] to-[#c26100] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Kebutuhan Rumpun Jurusan Terbanyak */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Kebutuhan Rumpun Jurusan Terbanyak</h3>
                      <p className="text-[11px] text-[#8a8a86]">Kategori program studi yang paling sering dicari pada prasyarat pendaftaran</p>
                    </div>

                    <div className="flex flex-col gap-3 mt-4 flex-grow justify-center">
                      {analyticsData.sortedMajors.map((item, idx) => {
                        const maxCount = analyticsData.sortedMajors[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-semibold text-[#37352f]">{item.name}</span>
                              <span className="text-[#8a8a86] font-semibold text-[11px]">
                                {item.count} Loker <span className="font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/30 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#b78103] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 2: Top 5 Posisi Paling Kompetitif vs Top 5 Peluang Lolos Tertinggi */}
                  {/* Card 3: Top 5 Posisi Paling Kompetitif */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Top 5 Posisi Paling Kompetitif</h3>
                      <p className="text-[11px] text-[#8a8a86]">Lowongan dengan rasio jumlah pelamar per kuota kursi tertinggi (Klik untuk buka detail)</p>
                    </div>

                    <div className="flex flex-col divide-y divide-[#edece9]/60 mt-4 flex-grow justify-center">
                      {analyticsData.competitiveJobs.map((job, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedJob(job)}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 cursor-pointer group hover:bg-[#f7f7f5]/30 rounded-md transition-colors px-1"
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[12.5px] font-bold text-[#1d7bb8] group-hover:underline truncate">{job["Judul Lowongan"]}</span>
                            <span className="text-[10px] text-[#8a8a86]">{job["Perusahaan"]}</span>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0 text-right">
                            <span className="text-[11.5px] font-extrabold text-[#c52447]">1 : {job.ratio}</span>
                            <span className="text-[9.5px] text-[#8a8a86] font-medium">({job["Kuota"]} kuota / {job["Pelamar"]} pelamar)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 4: Top 5 Peluang Lolos Tertinggi */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Top 5 Peluang Lolos Tertinggi</h3>
                      <p className="text-[11px] text-[#8a8a86]">Lowongan dengan rasio persaingan terendah (Paling ramah pelamar - Klik untuk detail)</p>
                    </div>

                    <div className="flex flex-col divide-y divide-[#edece9]/60 mt-4 flex-grow justify-center">
                      {analyticsData.userFriendlyJobs.map((job, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedJob(job)}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 cursor-pointer group hover:bg-[#f7f7f5]/30 rounded-md transition-colors px-1"
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[12.5px] font-bold text-[#16a34a] group-hover:underline truncate">{job["Judul Lowongan"]}</span>
                            <span className="text-[10px] text-[#8a8a86]">{job["Perusahaan"]}</span>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0 text-right">
                            <span className="text-[11.5px] font-extrabold text-[#16a34a]">{job.passRate}% Lolos</span>
                            <span className="text-[9.5px] text-[#8a8a86] font-medium">(Rasio 1:{job.ratio})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Klasifikasi Tingkat Persaingan vs Avg Peluang Lolos Anak Perusahaan */}
                  {/* Card 5: Klasifikasi Tingkat Persaingan */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Klasifikasi Tingkat Persaingan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Distribusi tingkat keketatan persaingan masuk lowongan magang</p>
                    </div>

                    <div className="flex flex-col gap-4 mt-4 flex-grow justify-center">
                      {analyticsData.heatClassification.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-[#edece9]/50" style={{ backgroundColor: item.bg }}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] font-bold" style={{ color: item.color }}>{item.label}</span>
                            <span className="text-[10.5px] text-[#5a5a57]">{item.count} Posisi Loker ({item.percentage}%)</span>
                          </div>
                          
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[11px] border-2 flex-shrink-0" style={{ borderColor: item.color, color: item.color, backgroundColor: 'white' }}>
                            {item.percentage}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 6: Avg Peluang Lolos Anak Perusahaan */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Avg Peluang Lolos Anak Perusahaan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Anak perusahaan Pertamina dengan peluang kelulusan magang rata-rata tertinggi</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.avgPassRateByCompany.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2.5">
                          <span className="text-[12px] font-bold text-[#37352f] truncate max-w-[240px]">{idx + 1}. {item.name}</span>
                          <span className="text-[11.5px] font-extrabold text-[#16a34a] bg-[#dcfce7] border border-[#bbf7d0] px-2 py-0.5 rounded flex-shrink-0">
                            {item.avgRate}% Lolos
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: Distribusi Lokasi / Kota vs Sebaran Wilayah / Region */}
                  {/* Card 7: Distribusi Lokasi / Kota */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Distribusi Lokasi / Kota</h3>
                      <p className="text-[11px] text-[#8a8a86]">6 Kota teratas dengan sebaran penempatan magang terbanyak</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 flex-grow justify-center">
                      {analyticsData.topCities.map((item, idx) => (
                        <div key={idx} className="bg-[#f7f7f5]/50 border border-[#edece9]/80 rounded-lg p-3 flex justify-between items-center">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[12px] font-bold text-[#37352f] truncate">{item.name}</span>
                            <span className="text-[10px] text-[#8a8a86]">{item.count} Lowongan</span>
                          </div>
                          <span className="text-[12px] font-extrabold text-[#c26100] ml-2 flex-shrink-0">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 8: Sebaran Wilayah / Region */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Sebaran Sebaran Wilayah / Region</h3>
                      <p className="text-[11px] text-[#8a8a86]">Pembagian penempatan magang berdasarkan kluster wilayah Indonesia</p>
                    </div>

                    <div className="flex flex-col gap-3 mt-4 flex-grow justify-center">
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
                                className="bg-[#c26100] h-full rounded-full" 
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
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Sebaran Berdasarkan Sektor Kerja</h3>
                      <p className="text-[11px] text-[#8a8a86]">Pembagian lowongan magang berdasarkan sektor industri terkait</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.sectorBreakdown.map((item, idx) => {
                        const maxCount = analyticsData.sectorBreakdown[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-semibold text-[#37352f]">{item.name}</span>
                              <span className="text-[#8a8a86] font-semibold text-[11px]">
                                {item.count} Loker <span className="font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/30 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#8a8a86] h-full rounded-full" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 10: Analisis Industri Terpopuler */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Analisis Industri Terpopuler</h3>
                      <p className="text-[11px] text-[#8a8a86]">Pembagian lowongan berdasarkan sub-kategori bidang industri</p>
                    </div>

                    <div className="flex flex-col gap-3.5 mt-4 flex-grow justify-center">
                      {analyticsData.industryBreakdown.map((item, idx) => {
                        const maxCount = analyticsData.industryBreakdown[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-semibold text-[#37352f] truncate max-w-[240px]">{item.name}</span>
                              <span className="text-[#8a8a86] font-semibold text-[11px]">
                                {item.count} Loker <span className="font-normal">({item.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#edece9]/30 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#c26100] h-full rounded-full" 
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
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-[14px] text-[#37352f]">Sebaran Kualifikasi Jenjang Pendidikan</h3>
                      <p className="text-[11px] text-[#8a8a86]">Persentase prasyarat tingkat pendidikan minimal bagi calon pelamar</p>
                    </div>

                    <div className="flex flex-col gap-3 mt-4 flex-grow justify-center">
                      {analyticsData.eduBreakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4">
                          <span className="text-[12px] font-bold text-[#37352f] w-14">{item.name}</span>
                          <div className="flex-1 bg-[#edece9]/50 h-3.5 rounded overflow-hidden flex">
                            <div 
                              className="bg-[#9041a8] h-full transition-all duration-500 rounded-r" 
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-[11.5px] text-[#5a5a57] font-semibold w-16 text-right flex-shrink-0">
                            {item.count} Loker <span className="text-[10px] text-[#8a8a86] font-normal">({item.percentage}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 12: Kategori Fungsi & Peran Pekerjaan */}
                  <div className="border border-[#edece9] rounded-lg p-5 bg-white flex flex-col justify-between shadow-3xs h-full">
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
                                  className="bg-[#2563eb] h-full rounded-full" 
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                </div>
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
                  className="p-2 rounded hover:bg-[#edece9] text-[#5a5a57] hover:text-[#b78103] transition-colors cursor-pointer flex items-center gap-1"
                  title={savedJobs.includes(selectedJob["Link Detail"]) ? "Hapus dari Tersimpan" : "Simpan Lowongan"}
                >
                  <Bookmark className={`w-4 h-4 ${savedJobs.includes(selectedJob["Link Detail"]) ? "fill-[#b78103] text-[#b78103]" : ""}`} />
                  <span className="text-[11.5px] font-medium hidden sm:inline">
                    {savedJobs.includes(selectedJob["Link Detail"]) ? "Tersimpan" : "Simpan"}
                  </span>
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
                    .split(/,|\bserta\b|dan|;/gi)
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

              {/* Informational Section */}
              <div className="flex flex-col gap-1.5 p-3.5 bg-[#f7f7f5]/30 rounded-xl border border-[#edece9]/40 text-[12.5px] text-[#5a5a57] leading-relaxed">
                <p>
                  Program magang ini diposkan langsung oleh pihak <strong>{selectedJob["Perusahaan"]}</strong>. Harap verifikasi kesesuaian kualifikasi program studi Anda dan kumpulkan berkas yang diperlukan sebelum mendaftar. Seluruh proses pendaftaran bersifat gratis.
                </p>
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
