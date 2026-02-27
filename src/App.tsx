/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Search, 
  Bell, 
  Settings, 
  LayoutDashboard, 
  PieChart, 
  Share2, 
  RefreshCcw, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  BrainCircuit, 
  Coffee, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Sparkles,
  CheckCircle2,
  Upload,
  Database as DatabaseIcon,
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  Cell,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Papa from 'papaparse';
import { motion, useInView } from 'framer-motion';

import { MOCK_MENTIONS, Mention } from './constants';
import kanaLogo from './logo/Logo.png';

import ReviewCarousel from './ReviewCarousel';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Page = 'home' | 'data-management' | 'reviews';

type SentimentType = 'positive' | 'neutral' | 'negative';

interface SentimentAnalysis {
  mentionId: string;
  sentiment: SentimentType;
  score: number;
  entity: string;
}

interface TopicItem {
  entity: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

interface DashboardInsights {
  summary: string;
  recommendations: string[];
  trendAnalysis: string;
}

const formatPct = (value: number) => `${value.toFixed(1)}%`;

const getDashboardInsights = async (
  allMentions: Mention[],
  allAnalyses: SentimentAnalysis[],
  topTopics: TopicItem[]
): Promise<DashboardInsights> => {
  const totalReviews = allMentions.length;

  if (!totalReviews) {
    return {
      summary: 'Belum ada data untuk diringkas. Upload CSV agar AI Executive Summary ter-generate otomatis.',
      recommendations: [],
      trendAnalysis: 'Analisis topik dan sentimen akan muncul setelah data tersedia.'
    };
  }

  const sentimentCounts = allAnalyses.reduce((acc, analysis) => {
    acc[analysis.sentiment] += 1;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 } as Record<SentimentType, number>);

  const positivePct = (sentimentCounts.positive / totalReviews) * 100;
  const neutralPct = (sentimentCounts.neutral / totalReviews) * 100;
  const negativePct = (sentimentCounts.negative / totalReviews) * 100;
  const netSentiment = ((sentimentCounts.positive - sentimentCounts.negative) / totalReviews) * 100;

  const sortedByNegative = [...topTopics].sort((a, b) => (b.negative || 0) - (a.negative || 0));
  const sortedByPositive = [...topTopics].sort((a, b) => (b.positive || 0) - (a.positive || 0));
  const mainRiskTopic = sortedByNegative[0];
  const strongestTopic = sortedByPositive[0];
  const topicList = topTopics.map((topic) => topic.entity).join(', ');

  const summary = `Dari ${totalReviews} ulasan, sentimen didominasi positif (${formatPct(positivePct)}), dengan sentimen bersih ${formatPct(netSentiment)}. Lima topik utama yang paling sering dibahas: ${topicList || 'belum tersedia'}. Isu negatif terbesar saat ini berada pada topik ${mainRiskTopic?.entity || 'General'} (${mainRiskTopic?.negative || 0} ulasan negatif), sementara kekuatan utama brand ada di topik ${strongestTopic?.entity || 'General'} (${strongestTopic?.positive || 0} ulasan positif).`;

  const recommendations = [
    mainRiskTopic
      ? `Prioritaskan perbaikan pada topik ${mainRiskTopic.entity} untuk menurunkan porsi sentimen negatif.`
      : 'Prioritaskan area dengan sentimen negatif tertinggi.',
    strongestTopic
      ? `Pertahankan keunggulan pada topik ${strongestTopic.entity} sebagai nilai jual utama.`
      : 'Pertahankan kualitas pada topik dengan sentimen positif terbesar.',
    'Monitor perubahan sentimen setelah upload data terbaru untuk melihat dampak perbaikan secara berkala.'
  ];

  const trendAnalysis = `Ringkasan sentimen: Positif ${formatPct(positivePct)}, Netral ${formatPct(neutralPct)}, Negatif ${formatPct(negativePct)}. KPI menunjukkan total ${totalReviews} ulasan dengan fokus analisis pada 5 topik teratas.`;

  return {
    summary,
    recommendations,
    trendAnalysis
  };
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [analyses, setAnalyses] = useState<SentimentAnalysis[]>([]);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('about');
  const [summary, setSummary] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [sentimentFilter, setSentimentFilter] = useState<string | null>(null);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const reviewsPerPage = 15;

  const fetchData = async (filter: string | null = sentimentFilter) => {
    setLoading(true);
    try {
      const sentimentQuery = filter ? `?sentiment=${filter}` : '';
      const [dataRes, topicsRes, trendsRes] = await Promise.all([
        fetch(`/api/data${sentimentQuery}`),
        fetch('/api/topics'),
        fetch('/api/trends')
      ]);
      
      const data = await dataRes.json();
      const topicsData = await topicsRes.json();
      const trendsData = await trendsRes.json();
      
      setTopics(topicsData);
      setTrends(trendsData);
      setSummary(data.summary);
      
      if (data.reviews && data.reviews.length > 0) {
        const dbMentions: Mention[] = data.reviews.map((r: any) => ({
          id: r.id.toString(),
          source: r.platform,
          content: r.content,
          date: r.date,
          author: r.author || 'User',
          reach: r.reach || 0
        }));
        
        const dbAnalyses: SentimentAnalysis[] = data.reviews.map((r: any) => ({
          sentiment: r.sentiment,
          score: r.score,
          entity: r.entity,
          mentionId: r.id.toString()
        }));

        setMentions(dbMentions);
        setAnalyses(dbAnalyses);
        
        const insightResults = await getDashboardInsights(dbMentions, dbAnalyses, topicsData);
        setInsights(insightResults);
      } else {
        // Database is empty or filtered to empty
        setMentions([]);
        setAnalyses([]);
        setInsights(null);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSentimentFilter = (sentiment: string | null) => {
    const newFilter = sentiment === sentimentFilter ? null : sentiment;
    setSentimentFilter(newFilter);
    setCurrentPageNum(1);
    fetchData(newFilter);
    
    // Switch to reviews page
    setCurrentPage('reviews');
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearData = async () => {
    // Temporarily removing confirm to test if it's blocked in the iframe
    setLoading(true);
    try {
      console.log("Starting clear data process...");
      const response = await fetch('/api/data', { method: 'DELETE' });
      if (!response.ok) throw new Error("Failed to clear data on server");
      
      console.log("Data cleared on server, updating local state...");
      // Reset all local states immediately
      setMentions([]);
      setAnalyses([]);
      setInsights(null);
      setTopics([]);
      setTrends([]);
      setSummary({
        total_positive: 0,
        total_negative: 0,
        total_neutral: 0,
        last_updated: null
      });
      
      await fetchData(); 
      console.log("Clear data process complete.");
    } catch (err: any) {
      console.error("Clear data error:", err);
      alert("Failed to clear data: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Track active section on scroll
  useEffect(() => {
    if (currentPage !== 'home') return;
    
    const sections = ['about', 'reviews', 'ai-summary', 'methodology', 'topics', 'dashboard'];
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [currentPage]);

  const stats = useMemo(() => {
    const totalMentions = mentions.length;
    const totalReach = mentions.reduce((acc, m) => acc + m.reach, 0);
    
    const sentimentCounts = analyses.reduce((acc, a) => {
      acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 } as Record<string, number>);

    const avgScore = analyses.length > 0 
      ? analyses.reduce((acc, a) => acc + a.score, 0) / analyses.length 
      : 0;

    return {
      totalMentions,
      totalReach,
      sentimentCounts,
      avgScore: (avgScore * 100).toFixed(1)
    };
  }, [mentions, analyses]);

  const chartData = useMemo(() => {
    const months = [
      { key: '2025-07', label: 'Jul 2025' },
      { key: '2025-08', label: 'Aug 2025' },
      { key: '2025-09', label: 'Sep 2025' },
      { key: '2025-10', label: 'Oct 2025' },
      { key: '2025-11', label: 'Nov 2025' },
      { key: '2025-12', label: 'Dec 2025' }
    ];

    return months.map(m => {
      const trend = trends.find(t => t.month === m.key);
      if (trend) {
        return {
          date: m.label,
          positive: trend.positive,
          neutral: trend.neutral,
          negative: trend.negative,
          count: trend.count,
          reach: trend.count * 100
        };
      }
      
      // Fallback to mock calculation from mentions if trends API is empty
      const grouped = mentions.filter(men => men.date.startsWith(m.key)).reduce((acc, men) => {
        acc.count += 1;
        acc.reach += men.reach;
        const analysis = analyses.find(a => (a as any).mentionId === men.id);
        if (analysis) acc[analysis.sentiment] += 1;
        return acc;
      }, { count: 0, reach: 0, positive: 0, negative: 0, neutral: 0 });

      return {
        date: m.label,
        ...grouped
      };
    });
  }, [mentions, analyses, trends]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#E4E3E0]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Coffee className="w-12 h-12 text-[#141414] animate-bounce" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#141414]/10 rounded-full blur-sm" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest opacity-50">Initializing Kana Insights AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="kana-bg-pattern" />
      <div className="kana-bg-overlay" />
      
      {/* Fixed Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#7A2E0E] text-[#F1EEE8] z-50 flex items-center px-4 md:px-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-10 md:h-12 flex items-center cursor-pointer" onClick={() => setCurrentPage('home')}>
            <img 
              src={kanaLogo}
              alt="Kana Coffee Logo" 
              className="h-full w-auto object-contain brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
            />
          </div>
          <div className="h-8 w-px bg-white/20 mx-1 hidden sm:block" />
          <h1 className="font-serif italic text-lg md:text-xl tracking-tight truncate hidden sm:block">Kana Insights AI</h1>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-10 ml-12">
            {currentPage === 'home' ? (
              <>
                <NavLink href="#about" active={activeSection === 'about'}>About</NavLink>
                <NavLink href="#reviews" active={activeSection === 'reviews'}>Reviews</NavLink>
                <NavLink href="#ai-summary" active={activeSection === 'ai-summary'}>AI Summary</NavLink>
                <NavLink href="#methodology" active={activeSection === 'methodology'}>Methodology</NavLink>
                <NavLink href="#topics" active={activeSection === 'topics'}>Topics</NavLink>
                <NavLink href="#dashboard" active={activeSection === 'dashboard'}>Dashboard</NavLink>
              </>
            ) : (
              <button 
                onClick={() => setCurrentPage('home')}
                className="text-[12px] font-bold uppercase tracking-[0.25em] text-white/60 hover:text-white transition-all"
              >
                Back to Dashboard
              </button>
            )}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setCurrentPage(currentPage === 'home' ? 'data-management' : 'home')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all",
              currentPage === 'data-management' ? "bg-[#F1EEE8] text-[#7A2E0E]" : "bg-white/10 text-[#F1EEE8] hover:bg-white/20"
            )}
          >
            <DatabaseIcon size={14} />
            <span className="hidden sm:inline">{currentPage === 'home' ? 'Data Management' : 'Dashboard'}</span>
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#B86934] rounded-full border-2 border-[#7A2E0E]" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16">
        {currentPage === 'home' ? (
          <>
            {/* 1. About Kana Coffee - White/Transparent */}
            <section id="about" className="py-32 md:py-40 px-6">
              <div className="max-w-[1100px] mx-auto text-center space-y-12">
                <h2 className="font-serif italic text-6xl text-[#7A2E0E] tracking-tight">About Kana Coffee</h2>
                <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] items-center gap-8 md:gap-12 mt-10">
                  <div className="max-w-[340px] md:max-w-[360px] mx-auto md:mx-0">
                    <div className="bg-white/70 p-3 md:p-4 rounded-3xl border border-[#7A2E0E]/10 shadow-[0_20px_50px_rgba(122,46,14,0.08)]">
                      <img
                        src="/about-kana-coffee.png"
                        alt="Suasana coffeeshop Kana Coffee"
                        className="w-full h-auto object-cover rounded-2xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 text-lg md:text-xl leading-relaxed text-[#141414]/70 font-sans font-light text-left">
                    <p>
                      Kana Coffee adalah brand kopi yang mengusung filosofi kebersamaan dalam setiap sajian. Berlandaskan semangat “A Cup of Coffee, A Bond of Togetherness,” Kana percaya bahwa secangkir kopi bukan sekadar minuman, melainkan medium untuk membangun koneksi dan menghadirkan momen yang lebih bermakna.
                    </p>
                    <p>
                      Dengan komitmen pada kualitas biji kopi pilihan dan proses peracikan yang presisi, Kana menghadirkan cita rasa yang konsisten dan berkarakter. Setiap detail, mulai dari pemilihan bahan hingga penyajian, dirancang untuk memberikan pengalaman yang hangat dan profesional.
                    </p>
                    <p>
                      Lebih dari sekadar tempat menikmati kopi, Kana adalah ruang untuk bertumbuh, berbagi ide, dan mempererat hubungan. Melalui dedikasi terhadap kualitas dan pelayanan, Kana terus menghadirkan pengalaman kopi yang autentik dan berkelas.
                    </p>
                  </div>
                </div>

                <div className="pt-16 border-t border-[#141414]/5">
                  <h3 className="font-serif italic text-3xl mb-8 text-[#141414]">Research Context</h3>
                  <p className="text-lg text-[#141414]/60 max-w-2xl mx-auto leading-relaxed italic">
                    Kana Coffee dipilih sebagai objek studi dalam sistem Kana Insights AI untuk menganalisis sentimen publik dan memetakan reputasi online berdasarkan data media sosial (Instagram, TikTok, dan Google Review).
                  </p>
                </div>
              </div>
            </section>

            {/* 2. What Customers Say - Soft Sand */}
            <section id="reviews" className="py-32 md:py-40 bg-[#F1EEE8]/60">
              <div className="max-w-[1200px] mx-auto px-6 text-center">
                <h2 className="font-serif italic text-6xl text-[#7A2E0E] mb-6 tracking-tight">What Customers Say</h2>
                <p className="text-xs uppercase tracking-[0.3em] opacity-40 font-mono mb-20">Selected customer reviews from Instagram, TikTok, and Google Review.</p>
                
                <ReviewCarousel />
              </div>
            </section>

            {/* 3. AI Executive Summary - White/Transparent */}
            <section id="ai-summary" className="py-32 md:py-40 px-6">
              <div className="max-w-[950px] mx-auto">
                <h2 className="font-serif italic text-6xl text-[#7A2E0E] mb-20 text-center tracking-tight">AI Executive Summary</h2>
                
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="bg-white p-12 rounded-3xl shadow-[0_20px_50px_rgba(122,46,14,0.05)] border border-[#7A2E0E]/5 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#7A2E0E]/5 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-[#7A2E0E]/10" />
                  
                  <div className="flex flex-col md:flex-row items-start gap-10 relative z-10">
                    <div className="p-5 bg-[#7A2E0E] rounded-3xl text-white shadow-2xl shadow-[#7A2E0E]/30">
                      <Sparkles size={40} />
                    </div>
                    <div className="flex-1 space-y-8">
                      <div className="space-y-4">
                        <span className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-[#7A2E0E]/5 text-[#7A2E0E] text-[11px] font-bold uppercase tracking-[0.15em] rounded-full border border-[#7A2E0E]/10">
                          <BrainCircuit size={14} />
                          Dihasilkan oleh Kana Insights AI
                        </span>
                        <p className="text-3xl leading-[1.4] text-[#141414]/90 font-medium font-serif italic">
                          “{insights?.summary || 'Sedang menganalisis KPI, ringkasan sentimen, dan 5 topik utama dari data upload terbaru...'}”
                        </p>
                      </div>
                      
                      <div className="pt-8 border-t border-[#141414]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <p className="text-base text-[#141414]/50 italic max-w-lg leading-relaxed">
                          {insights?.trendAnalysis || "Analisis tren akan dibuat otomatis setelah upload CSV terbaru."}
                        </p>
                        <div className="flex items-center gap-2.5 text-[11px] font-mono text-[#141414]/30 uppercase tracking-[0.1em] font-medium">
                          <RefreshCcw size={14} />
                          Diperbarui: {summary?.last_updated ? format(parseISO(summary.last_updated), 'dd MMM yyyy, HH:mm') : format(new Date(), 'dd MMM yyyy, HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* New Section: Sentiment Analysis Method - Soft Sand */}
            <section id="methodology" className="py-32 md:py-40 px-6 bg-[#F1EEE8]/60">
              <div className="max-w-[900px] mx-auto">
                <div className="text-center space-y-16">
                  <h2 className="font-serif italic text-6xl text-[#7A2E0E] tracking-tight">Sentiment Analysis Method</h2>
                  <div className="space-y-12 text-xl leading-relaxed text-[#141414]/70 font-sans font-light">
                    <p className="font-medium text-[#141414]/90">
                      This system applies Natural Language Processing (NLP) techniques to analyze public sentiment toward Kana Coffee based on social media data.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
                      <MethodItem text="Text preprocessing (cleaning, normalization, stopword removal)" />
                      <MethodItem text="Tokenization and feature extraction" />
                      <MethodItem text="Sentiment classification (positive, negative, neutral)" />
                      <MethodItem text="Entity extraction (service, price, quality, delivery, etc.)" />
                      <MethodItem text="Aggregation into Net Sentiment Score" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Top 5 Key Topics Analysis - White/Transparent */}
            <section id="topics" className="py-32 md:py-40 px-6">
              <div className="max-w-[1100px] mx-auto space-y-20">
                <div className="text-center space-y-4">
                  <h2 className="font-serif italic text-6xl text-[#7A2E0E] tracking-tight">Top 5 Key Topics Analysis</h2>
                  <p className="text-xs uppercase tracking-[0.3em] opacity-40 font-mono text-[#7A2E0E]">Aspect-Based Sentiment Distribution Across Customer Reviews</p>
                </div>

                <div className="space-y-6">
                  {topics.length > 0 ? (
                    topics.map((topic, idx) => (
                      <TopicCard key={idx} topic={topic} />
                    ))
                  ) : (
                    <div className="text-center py-20 bg-[#141414]/5 rounded-3xl border border-dashed border-[#141414]/10">
                      <p className="font-mono text-sm opacity-40 uppercase tracking-widest">No topic data available yet. Upload data to see analysis.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 4. KPI & Sentiment Overview - Soft Sand */}
            <section id="dashboard" className="py-32 md:py-40 px-6 bg-[#F1EEE8]/60">
              <div className="max-w-[1200px] mx-auto space-y-24">
                <div className="text-center">
                  <h2 className="font-serif italic text-6xl text-[#7A2E0E] mb-6 tracking-tight">KPI & Sentiment Overview</h2>
                  <p className="text-xs uppercase tracking-[0.3em] opacity-40 font-mono text-[#7A2E0E]">Real-time Performance Metrics</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  <KPICard 
                    label="Net Sentiment Score" 
                    value={stats.avgScore} 
                    subValue="Brand Health Index"
                    icon={<TrendingUp size={28} />}
                    percentage={parseFloat(stats.avgScore)}
                  />
                  <KPICard 
                    label="Positive Sentiment" 
                    value={((stats.sentimentCounts.positive / stats.totalMentions) * 100).toFixed(1) + '%'} 
                    subValue={`${stats.sentimentCounts.positive} Positive Reviews`}
                    icon={<ArrowUpRight size={28} className="text-[#6E7C3A]" />}
                    percentage={(stats.sentimentCounts.positive / stats.totalMentions) * 100}
                    color="#6E7C3A"
                    onClick={() => handleSentimentFilter('positive')}
                    active={sentimentFilter === 'positive'}
                  />
                  <KPICard 
                    label="Negative Sentiment" 
                    value={((stats.sentimentCounts.negative / stats.totalMentions) * 100).toFixed(1) + '%'} 
                    subValue={`${stats.sentimentCounts.negative} Negative Reviews`}
                    icon={<ArrowDownRight size={28} className="text-[#B0412E]" />}
                    percentage={(stats.sentimentCounts.negative / stats.totalMentions) * 100}
                    color="#B0412E"
                    onClick={() => handleSentimentFilter('negative')}
                    active={sentimentFilter === 'negative'}
                  />
                  <KPICard 
                    label="Neutral Sentiment" 
                    value={((stats.sentimentCounts.neutral / stats.totalMentions) * 100).toFixed(1) + '%'} 
                    subValue={`${stats.sentimentCounts.neutral} Neutral Reviews`}
                    icon={<Minus size={28} className="text-[#B8A486]" />}
                    percentage={(stats.sentimentCounts.neutral / stats.totalMentions) * 100}
                    color="#B8A486"
                    onClick={() => handleSentimentFilter('neutral')}
                    active={sentimentFilter === 'neutral'}
                  />
                  <KPICard 
                    label="Total Reviews Analyzed" 
                    value={stats.totalMentions} 
                    subValue="Across all platforms"
                    icon={<MessageSquare size={28} />}
                    onClick={() => handleSentimentFilter(null)}
                    active={sentimentFilter === null && mentions.length > 0}
                  />
                  <KPICard 
                    label="Time Range" 
                    value="6 Months" 
                    subValue="Jul 2025 - Dec 2025"
                    icon={<Info size={28} />}
                  />
                </div>

                {/* Detailed Review Table Section */}
                <div id="review-table" className="pt-12">
                  <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(122,46,14,0.04)] border border-[#7A2E0E]/5 overflow-hidden">
                    <div className="p-10 border-b border-[#7A2E0E]/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <h3 className="font-serif italic text-3xl text-[#7A2E0E]">Detailed Review Data</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 font-mono mt-2 font-bold text-[#7A2E0E]">
                          {sentimentFilter ? `Showing ${sentimentFilter} reviews` : 'Showing all reviews'} • {mentions.length} total
                        </p>
                      </div>
                      {sentimentFilter && (
                        <button 
                          onClick={() => handleSentimentFilter(null)}
                          className="text-[11px] font-bold uppercase tracking-widest text-[#7A2E0E] hover:underline"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#F1EEE8]/50 border-b border-[#7A2E0E]/5">
                            <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Platform</th>
                            <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Date</th>
                            <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Review Content</th>
                            <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Sentiment</th>
                            <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Entity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#7A2E0E]/5">
                          {mentions.slice((currentPageNum - 1) * reviewsPerPage, currentPageNum * reviewsPerPage).map((m, idx) => {
                            const analysis = analyses.find(a => (a as any).mentionId === m.id);
                            return (
                              <tr key={m.id} className="hover:bg-[#F1EEE8]/40 transition-colors">
                                <td className="py-6 px-8 text-sm font-medium text-[#7A2E0E]/80">{m.source}</td>
                                <td className="py-6 px-8 text-sm font-mono text-[#7A2E0E]/40">{m.date}</td>
                                <td className="py-6 px-8 text-sm leading-relaxed text-[#141414]/70 max-w-md truncate">{m.content}</td>
                                <td className="py-6 px-8">
                                  <SentimentBadge sentiment={analysis?.sentiment || 'neutral'} />
                                </td>
                                <td className="py-6 px-8 text-xs font-bold uppercase tracking-widest text-[#7A2E0E]/60">{analysis?.entity || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {mentions.length > reviewsPerPage && (
                      <div className="p-8 border-t border-[#141414]/5 flex items-center justify-between">
                        <p className="text-xs font-mono opacity-40">
                          Page {currentPageNum} of {Math.ceil(mentions.length / reviewsPerPage)}
                        </p>
                        <div className="flex gap-2">
                          <button 
                            disabled={currentPageNum === 1}
                            onClick={() => setCurrentPageNum(p => p - 1)}
                            className="p-2 rounded-full hover:bg-[#141414]/5 disabled:opacity-20 transition-colors"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button 
                            disabled={currentPageNum === Math.ceil(mentions.length / reviewsPerPage)}
                            onClick={() => setCurrentPageNum(p => p + 1)}
                            className="p-2 rounded-full hover:bg-[#141414]/5 disabled:opacity-20 transition-colors"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white p-12 rounded-3xl shadow-[0_20px_60px_rgba(122,46,14,0.04)] border border-[#7A2E0E]/5"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8">
                    <div>
                      <h3 className="font-serif italic text-4xl text-[#7A2E0E] tracking-tight">Sentiment Trend Chart</h3>
                      <p className="text-[11px] uppercase tracking-[0.2em] opacity-40 font-mono mt-2 font-bold text-[#7A2E0E]">Historical Sentiment Evolution</p>
                    </div>
                    <div className="flex flex-wrap gap-8">
                      <LegendItem color="#6E7C3A" label="Positive" />
                      <LegendItem color="#B8A486" label="Neutral" />
                      <LegendItem color="#B0412E" label="Negative" />
                      <LegendItem color="#7A2E0E" label="Reach" isLine />
                    </div>
                  </div>
                  <div className="h-[500px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7A2E0E" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#7A2E0E" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E8DCCB" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fontFamily: 'Inter', fontWeight: 500, fill: '#7A2E0E', opacity: 0.5 }} 
                          dy={15}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fontFamily: 'Inter', fontWeight: 500, fill: '#7A2E0E', opacity: 0.5 }} 
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #E8DCCB', 
                            borderRadius: '16px',
                            color: '#7A2E0E',
                            fontSize: '13px',
                            fontFamily: 'Inter',
                            fontWeight: 500,
                            boxShadow: '0 20px 40px -10px rgba(122,46,14,0.15)',
                            padding: '16px'
                          }}
                          itemStyle={{ padding: '2px 0' }}
                          cursor={{ stroke: '#7A2E0E', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="reach" 
                          stroke="#7A2E0E" 
                          fillOpacity={1} 
                          fill="url(#colorReach)" 
                          strokeWidth={4}
                          animationDuration={2500}
                        />
                        <Bar dataKey="positive" fill="#6E7C3A" radius={[6, 6, 0, 0]} barSize={16} />
                        <Bar dataKey="neutral" fill="#B8A486" radius={[6, 6, 0, 0]} barSize={16} />
                        <Bar dataKey="negative" fill="#B0412E" radius={[6, 6, 0, 0]} barSize={16} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            </section>
          </>
        ) : currentPage === 'data-management' ? (
          <DataManagementPage onDataUpdate={fetchData} summary={summary} onClearData={clearData} />
        ) : (
          <ReviewsDetailPage 
            mentions={mentions} 
            analyses={analyses} 
            sentimentFilter={sentimentFilter}
            onFilterChange={handleSentimentFilter}
            currentPageNum={currentPageNum}
            setCurrentPageNum={setCurrentPageNum}
            reviewsPerPage={reviewsPerPage}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#7A2E0E] text-[#F1EEE8] py-20 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-8">
            <img src={kanaLogo} alt="Logo" className="h-12 w-auto brightness-0 invert" />
            <div className="h-10 w-px bg-white/10" />
            <span className="font-serif italic text-3xl tracking-tight">Kana Insights AI</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3">
            <p className="text-xs opacity-40 font-mono uppercase tracking-[0.3em] font-bold">A Cup of Coffee, A Bond of Togetherness</p>
            <p className="text-[11px] opacity-20 font-mono">© 2026 Kana Coffee Media Intelligence. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DataManagementPage({ onDataUpdate, summary, onClearData }: { onDataUpdate: () => void, summary: any, onClearData: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingMessage, setUploadingMessage] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, platform: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadingMessage('Uploading and analyzing file...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      
      try {
        const response = await fetch(`/api/upload-csv?platform=${encodeURIComponent(platform)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          body: csvText,
        });

        const rawResult = await response.text();
        const result = rawResult.trim()
          ? (() => {
              try {
                return JSON.parse(rawResult);
              } catch {
                return null;
              }
            })()
          : null;

        if (!response.ok) {
          const errorMessage =
            (result && typeof result === 'object' && 'error' in result && typeof (result as any).error === 'string'
              ? (result as any).error
              : null) ||
            (rawResult.trim() ? rawResult : null) ||
            `Server responded with status ${response.status}`;
          throw new Error(errorMessage);
        }

        setSuccess(
          (result && typeof result === 'object' && 'message' in result && typeof (result as any).message === 'string'
            ? (result as any).message
            : null) ||
            'Upload successful!'
        );
        onDataUpdate(); // Refresh the main dashboard data

      } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || "An error occurred during processing");
      } finally {
        setUploading(false);
        setUploadingMessage(null);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
      setUploading(false);
      setUploadingMessage(null);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-[1000px] mx-auto py-24 px-6 space-y-16">
      <div className="text-center space-y-4">
        <h2 className="font-serif italic text-5xl text-[#141414]">Data Management</h2>
        <p className="text-sm uppercase tracking-widest opacity-40 font-mono">Upload and manage your research data</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#141414]/5">
          <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold font-mono mb-2">Total Reviews</p>
          <p className="text-4xl font-serif italic text-[#141414]">
            {(summary?.total_positive || 0) + (summary?.total_negative || 0) + (summary?.total_neutral || 0)}
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#141414]/5">
          <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold font-mono mb-2">Last Updated</p>
          <p className="text-lg font-mono text-[#141414]/60">
            {summary?.last_updated ? format(parseISO(summary.last_updated), 'dd MMM yyyy, HH:mm') : 'Never'}
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#141414]/5 flex items-center justify-center">
          <button 
            onClick={() => {
              console.log("Clear data button clicked");
              onClearData();
            }}
            className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold uppercase tracking-widest text-[11px] transition-colors"
          >
            <Trash2 size={16} />
            Clear All Data
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <UploadCard 
          platform="Instagram" 
          icon={<Coffee size={24} />} 
          onUpload={(e) => handleFileUpload(e, 'Instagram')} 
          disabled={uploading}
        />
        <UploadCard 
          platform="TikTok" 
          icon={<Share2 size={24} />} 
          onUpload={(e) => handleFileUpload(e, 'TikTok')} 
          disabled={uploading}
        />
        <UploadCard 
          platform="Google Review" 
          icon={<Search size={24} />} 
          onUpload={(e) => handleFileUpload(e, 'Google Review')} 
          disabled={uploading}
        />
      </div>

      {uploading && uploadingMessage && (
        <div className="flex items-center justify-center gap-4 p-8 bg-[#A5532D]/5 rounded-2xl border border-[#A5532D]/10">
          <RefreshCcw className="animate-spin text-[#A5532D]" />
          <p className="font-mono text-sm text-[#A5532D] uppercase tracking-widest font-bold">{uploadingMessage}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-6 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
          <CheckCircle2 size={20} />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="bg-white p-10 rounded-3xl border border-[#7A2E0E]/5 space-y-6">
        <h3 className="font-serif italic text-2xl text-[#7A2E0E]">CSV Format Guide</h3>
        <p className="text-sm text-[#141414]/60 leading-relaxed">
          Untuk memastikan analisis akurat, pastikan file CSV kamu memiliki kolom berikut. Sistem akan otomatis mencari kolom dengan nama:
        </p>
        <ul className="text-xs space-y-2 font-mono text-[#7A2E0E]/70 list-disc pl-5">
          <li><strong>Konten:</strong> <code className="bg-[#7A2E0E]/5 px-1 rounded">content</code>, <code className="bg-[#7A2E0E]/5 px-1 rounded">text</code>, <code className="bg-[#7A2E0E]/5 px-1 rounded">Review</code>, atau <code className="bg-[#7A2E0E]/5 px-1 rounded">comment</code></li>
          <li><strong>Tanggal:</strong> <code className="bg-[#7A2E0E]/5 px-1 rounded">date</code>, <code className="bg-[#7A2E0E]/5 px-1 rounded">timestamp</code>, atau <code className="bg-[#7A2E0E]/5 px-1 rounded">publish_date</code> (Format: YYYY-MM-DD)</li>
        </ul>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#7A2E0E]/10">
                <th className="py-3 px-4 opacity-40 text-[#7A2E0E]">content</th>
                <th className="py-3 px-4 opacity-40 text-[#7A2E0E]">date</th>
                <th className="py-3 px-4 opacity-40 text-[#7A2E0E]">author</th>
                <th className="py-3 px-4 opacity-40 text-[#7A2E0E]">reach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7A2E0E]/5">
              <tr>
                <td className="py-3 px-4 text-[#141414]/70">"Kopi susunya enak banget, creamy dan pas manisnya!"</td>
                <td className="py-3 px-4 text-[#7A2E0E]/40">2025-09-15</td>
                <td className="py-3 px-4 text-[#141414]/70">@pecintakopi</td>
                <td className="py-3 px-4 text-[#141414]/70">150</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-[#141414]/70">"Tempatnya cozy buat nugas, tapi wifinya agak lemot tadi."</td>
                <td className="py-3 px-4 text-[#7A2E0E]/40">2025-10-02</td>
                <td className="py-3 px-4 text-[#141414]/70">@mahasiswasemesterakhir</td>
                <td className="py-3 px-4 text-[#141414]/70">45</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-[#141414]/70">"Pelayanan ramah dan cepat, mantap Kana Coffee!"</td>
                <td className="py-3 px-4 text-[#7A2E0E]/40">2025-11-20</td>
                <td className="py-3 px-4 text-[#141414]/70">@google_user</td>
                <td className="py-3 px-4 text-[#141414]/70">12</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function UploadCard({ platform, icon, onUpload, disabled }: { platform: string, icon: React.ReactNode, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled: boolean }) {
  return (
    <div className="bg-white p-10 rounded-3xl border border-[#7A2E0E]/5 hover:shadow-xl transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#7A2E0E]/5 blur-3xl rounded-full -mr-16 -mt-16" />
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        <div className="p-5 bg-[#7A2E0E]/5 text-[#7A2E0E] rounded-2xl group-hover:bg-[#7A2E0E] group-hover:text-white transition-all duration-500">
          {icon}
        </div>
        <div>
          <h4 className="font-serif italic text-xl mb-1">{platform}</h4>
          <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold font-mono">Upload CSV</p>
        </div>
        <label className={cn(
          "w-full py-3 px-4 bg-[#7A2E0E] text-white text-[11px] font-bold uppercase tracking-widest rounded-full cursor-pointer hover:bg-[#B86934] transition-all text-center",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}>
          <input type="file" accept=".csv" className="hidden" onChange={onUpload} disabled={disabled} />
          {disabled ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCcw className="animate-spin" size={14} />
              Uploading...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Upload size={14} />
              Select File
            </span>
          )}
        </label>
      </div>
    </div>
  );
}

function TopicCard({ topic }: { topic: any }) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const posPct = (topic.positive / topic.total) * 100;
  const neuPct = (topic.neutral / topic.total) * 100;
  const negPct = (topic.negative / topic.total) * 100;
  
  const netScore = ((topic.positive - topic.negative) / topic.total * 100).toFixed(1);

  return (
    <motion.div 
      ref={ref}
      whileHover={{ y: -2 }}
      className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col md:flex-row items-center gap-10"
    >
      <div className="md:w-1/4 space-y-2 text-center md:text-left">
        <h4 className="font-serif italic text-2xl text-[#141414] capitalize">{topic.entity}</h4>
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-30">Total Mentions: {topic.total}</p>
      </div>
      
      <div className="flex-1 w-full space-y-4">
        <div className="h-3 w-full bg-[#7A2E0E]/5 rounded-full overflow-hidden flex">
          <motion.div 
            initial={{ width: 0 }}
            animate={isInView ? { width: `${posPct}%` } : {}}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-[#6E7C3A]"
          />
          <motion.div 
            initial={{ width: 0 }}
            animate={isInView ? { width: `${neuPct}%` } : {}}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="h-full bg-[#B8A486]"
          />
          <motion.div 
            initial={{ width: 0 }}
            animate={isInView ? { width: `${negPct}%` } : {}}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            className="h-full bg-[#B0412E]"
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider">
          <div className="flex gap-4 opacity-60">
            <span className="text-[#6E7C3A]">Pos {posPct.toFixed(0)}%</span>
            <span className="text-[#B8A486]">Neu {neuPct.toFixed(0)}%</span>
            <span className="text-[#B0412E]">Neg {negPct.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-30">Net Sentiment:</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[9px]",
              parseFloat(netScore) > 0 ? "bg-[#6E7C3A]/10 text-[#6E7C3A]" : "bg-[#B0412E]/10 text-[#B0412E]"
            )}>
              {netScore}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ReviewsDetailPage({ 
  mentions, 
  analyses, 
  sentimentFilter, 
  onFilterChange,
  currentPageNum,
  setCurrentPageNum,
  reviewsPerPage
}: { 
  mentions: Mention[], 
  analyses: SentimentAnalysis[], 
  sentimentFilter: string | null,
  onFilterChange: (s: string | null) => void,
  currentPageNum: number,
  setCurrentPageNum: (n: number | ((p: number) => number)) => void,
  reviewsPerPage: number
}) {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-20 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="font-serif italic text-5xl text-[#7A2E0E]">Detailed Reviews</h2>
          <p className="text-xs uppercase tracking-[0.3em] opacity-40 font-mono text-[#7A2E0E]">
            {sentimentFilter ? `Filtering by ${sentimentFilter} sentiment` : 'Viewing all customer feedback'}
          </p>
        </div>
        <div className="flex gap-4">
          <FilterButton active={sentimentFilter === 'positive'} onClick={() => onFilterChange('positive')} label="Positive" color="#6E7C3A" />
          <FilterButton active={sentimentFilter === 'neutral'} onClick={() => onFilterChange('neutral')} label="Neutral" color="#B8A486" />
          <FilterButton active={sentimentFilter === 'negative'} onClick={() => onFilterChange('negative')} label="Negative" color="#B0412E" />
          <FilterButton active={sentimentFilter === null} onClick={() => onFilterChange(null)} label="All" color="#7A2E0E" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(122,46,14,0.04)] border border-[#7A2E0E]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1EEE8]/50 border-b border-[#7A2E0E]/5">
                <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Platform</th>
                <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Date</th>
                <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Review Content</th>
                <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Sentiment</th>
                <th className="py-6 px-8 text-[10px] uppercase tracking-widest opacity-40 font-mono font-bold text-[#7A2E0E]">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7A2E0E]/5">
              {mentions.slice((currentPageNum - 1) * reviewsPerPage, currentPageNum * reviewsPerPage).map((m) => {
                const analysis = analyses.find(a => (a as any).mentionId === m.id);
                return (
                  <tr key={m.id} className="hover:bg-[#F1EEE8]/40 transition-colors">
                    <td className="py-6 px-8 text-sm font-medium text-[#7A2E0E]/80">{m.source}</td>
                    <td className="py-6 px-8 text-sm font-mono text-[#7A2E0E]/40">{m.date}</td>
                    <td className="py-6 px-8 text-sm leading-relaxed text-[#141414]/70">{m.content}</td>
                    <td className="py-6 px-8">
                      <SentimentBadge sentiment={analysis?.sentiment || 'neutral'} />
                    </td>
                    <td className="py-6 px-8 text-xs font-bold uppercase tracking-widest text-[#7A2E0E]/60">{analysis?.entity || '-'}</td>
                  </tr>
                );
              })}
              {mentions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center font-mono text-sm opacity-30 uppercase tracking-widest">
                    No reviews found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {mentions.length > reviewsPerPage && (
          <div className="p-8 border-t border-[#7A2E0E]/5 flex items-center justify-between">
            <p className="text-xs font-mono opacity-40 text-[#7A2E0E]">
              Page {currentPageNum} of {Math.ceil(mentions.length / reviewsPerPage)}
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum(p => p - 1)}
                className="p-2 rounded-full hover:bg-[#7A2E0E]/5 disabled:opacity-20 transition-colors text-[#7A2E0E]"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                disabled={currentPageNum === Math.ceil(mentions.length / reviewsPerPage)}
                onClick={() => setCurrentPageNum(p => p + 1)}
                className="p-2 rounded-full hover:bg-[#7A2E0E]/5 disabled:opacity-20 transition-colors text-[#7A2E0E]"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label, color }: { active: boolean, onClick: () => void, label: string, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
        active 
          ? "text-white shadow-lg" 
          : "bg-white text-[#7A2E0E]/40 border-[#7A2E0E]/10 hover:border-[#7A2E0E]/30"
      )}
      style={active ? { backgroundColor: color, borderColor: color } : {}}
    >
      {label}
    </button>
  );
}

function NavLink({ href, children, active }: { href: string, children: React.ReactNode, active: boolean }) {
  return (
    <a 
      href={href} 
      className={cn(
        "text-[12px] font-bold uppercase tracking-[0.25em] transition-all relative py-2 group",
        active ? "text-white" : "text-white/40 hover:text-white"
      )}
    >
      <span className={cn(
        "transition-all duration-300",
        active ? "opacity-100" : "opacity-100"
      )}>
        {children}
      </span>
      <span className={cn(
        "absolute bottom-0 left-0 h-[3px] bg-white transition-all duration-500 ease-out",
        active ? "w-full" : "w-0 group-hover:w-1/2"
      )} />
    </a>
  );
}

function MethodItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="mt-1 p-0.5 bg-[#7A2E0E]/10 text-[#7A2E0E] rounded-full group-hover:bg-[#7A2E0E] group-hover:text-white transition-colors">
        <CheckCircle2 size={16} />
      </div>
      <p className="text-sm text-[#141414]/70 group-hover:text-[#141414] transition-colors">{text}</p>
    </div>
  );
}

function LegendItem({ color, label, isLine }: { color: string, label: string, isLine?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "rounded-full",
        isLine ? "w-4 h-1" : "w-2.5 h-2.5"
      )} style={{ backgroundColor: color }} />
      <span className="text-[10px] font-mono text-[#141414]/60 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function KPICard({ label, value, subValue, icon, percentage, color = "#7A2E0E", onClick, active }: { label: string, value: string | number, subValue: string, icon: React.ReactNode, percentage?: number, color?: string, onClick?: () => void, active?: boolean }) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  // Count up logic for numeric values
  const [displayValue, setDisplayValue] = useState<string | number>(typeof value === 'number' ? 0 : '0');
  
  useEffect(() => {
    if (isInView) {
      const numericValue = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
      if (isNaN(numericValue)) {
        setDisplayValue(value);
        return;
      }

      let start = 0;
      const end = numericValue;
      const duration = 2000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (easeOutExpo)
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = start + (end - start) * easeProgress;
        
        const isPercentage = value.toString().includes('%');
        const formatted = isPercentage 
          ? current.toFixed(1) + '%' 
          : current % 1 === 0 ? Math.floor(current).toString() : current.toFixed(1);
          
        setDisplayValue(formatted);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isInView, value]);
  
  return (
    <motion.div 
      ref={ref}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={cn(
        "bg-white p-12 rounded-3xl shadow-[0_10px_40px_rgba(122,46,14,0.03)] border transition-all duration-500 group relative overflow-hidden",
        onClick ? "cursor-pointer" : "",
        active ? "border-[#7A2E0E] shadow-[0_20px_60px_rgba(122,46,14,0.1)]" : "border-[#7A2E0E]/5 hover:shadow-[0_20px_60px_rgba(122,46,14,0.08)]"
      )}
    >
      <div className="flex items-center justify-between mb-10">
        <div className="p-5 bg-[#7A2E0E]/5 text-[#7A2E0E] rounded-2xl group-hover:bg-[#7A2E0E] group-hover:text-white transition-all duration-700 ease-out shadow-sm group-hover:shadow-lg group-hover:shadow-[#7A2E0E]/20">
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] opacity-30 font-bold font-mono">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-serif italic text-[#141414] tracking-tight">
            {displayValue}
          </p>
        </div>
        <p className="text-[12px] text-[#141414]/40 font-mono font-medium tracking-tight">{subValue}</p>
      </div>
      
      {percentage !== undefined && (
        <div className="mt-10 space-y-3">
          <div className="h-2 w-full bg-[#141414]/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={isInView ? { width: `${percentage}%` } : {}}
              transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full relative"
              style={{ 
                background: `linear-gradient(90deg, ${color}ee, ${color})` 
              }}
            >
              <div className="absolute inset-0 bg-white/10" />
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-all",
        active ? "bg-[#F27D26] text-white" : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, trend, trendType, icon }: { label: string, value: string | number, trend: string, trendType: 'up' | 'down' | 'neutral', icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded border border-[#141414]/10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-[#E4E3E0]/50 rounded">
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono",
          trendType === 'up' ? "bg-emerald-100 text-emerald-700" : 
          trendType === 'down' ? "bg-red-100 text-red-700" : 
          "bg-gray-100 text-gray-700"
        )}>
          {trendType === 'up' ? <ArrowUpRight size={10} /> : 
           trendType === 'down' ? <ArrowDownRight size={10} /> : 
           <Minus size={10} />}
          {trend}
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-1">{label}</p>
      <p className="text-2xl font-serif italic">{value}</p>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'neutral' | 'negative' }) {
  const styles = {
    positive: "bg-[#6E7C3A]/10 text-[#6E7C3A] border-[#6E7C3A]/20",
    neutral: "bg-[#B8A486]/10 text-[#B8A486] border-[#B8A486]/20",
    negative: "bg-[#B0412E]/10 text-[#B0412E] border-[#B0412E]/20"
  };

  return (
    <span className={cn(
      "text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border",
      styles[sentiment]
    )}>
      {sentiment}
    </span>
  );
}
