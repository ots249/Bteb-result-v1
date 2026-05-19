/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  GraduationCap, 
  Calendar, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Loader2,
  BookOpen,
  MapPin,
  Clock,
  ChevronDown,
  Check,
  Download,
  Share2,
  Printer,
  Bell,
  User,
  Users,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Layers,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';
import { ApiResponse, StudentData, SemesterResult, GroupApiResponse } from './types';
import * as htmlToImage from 'html-to-image';

const CURRICULUMS = [
  { id: 'diploma_in_engineering', name: 'Diploma In Engineering' },
  { id: 'diploma_in_engineering_army', name: 'Diploma In Engineering (Army)' },
  { id: 'diploma_in_engineering_naval', name: 'Diploma In Engineering (Naval)' },
  { id: 'diploma_in_textile_engineering', name: 'Diploma In Textile Engineering' },
  { id: 'diploma_in_tourism_and_hospitality', name: 'Diploma In Tourism And Hospitality' },
  { id: 'diploma_in_agriculture', name: 'Diploma In Agriculture' },
  { id: 'diploma_in_fisheries', name: 'Diploma In Fisheries' },
  { id: 'diploma_in_forestry', name: 'Diploma In Forestry' },
  { id: 'diploma_in_livestock', name: 'Diploma In Livestock' },
  { id: 'certificate_in_marine_trade', name: 'Certificate In Marine Trade' },
  { id: 'diploma_in_medical_technology', name: 'Diploma In Medical Technology' },
  { id: 'advanced_certificate_course', name: 'Advanced Certificate Course' },
  { id: 'national_skill_standard_basic_certificate_course', name: 'National Skill Standard Basic Certificate Course' },
  { id: 'one_year_certificate_course', name: 'One Year Certificate Course' },
  { id: 'diploma_in_commerce', name: 'Diploma In Commerce' },
  { id: 'certificate_in_medical_ultrasound', name: 'Certificate In Medical Ultrasound' },
  { id: 'hsc_business_management', name: 'HSC (Business Management)' },
  { id: 'hsc_vocational', name: 'HSC (Vocational)' },
];

export default function App() {
  const [searchMode, setSearchMode] = useState<'single' | 'group'>('single');
  const [roll, setRoll] = useState('');
  const [rollRanges, setRollRanges] = useState('');
  const [regulation, setRegulation] = useState('2022');
  const [curriculumId, setCurriculumId] = useState('diploma_in_engineering');
  const [groupResults, setGroupResults] = useState<GroupApiResponse['data'] | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalResult, setModalResult] = useState<StudentData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<{ message: string; subtext?: string; icon?: React.ReactNode } | null>(null);
  const [result, setResult] = useState<StudentData | null>(null);
  const [history, setHistory] = useState<{roll: string, curriculumId: string, data: StudentData}[]>([]);
  const [groupHistory, setGroupHistory] = useState<{
    rollRanges: string, 
    curriculumId: string, 
    regulation: string, 
    data: GroupApiResponse['data']
  }[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification('Notifications Enabled!', {
        body: 'You will now receive updates about BTEB results.',
        icon: 'https://i.postimg.cc/pL2KbsYP/bteb-results-249.png'
      });
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  const selectedCurriculum = CURRICULUMS.find(c => c.id === curriculumId) || CURRICULUMS[0];

  useEffect(() => {
    const savedHistory = localStorage.getItem('bteb_search_history_v2');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const savedGroupHistory = localStorage.getItem('bteb_group_history_v1');
    if (savedGroupHistory) {
      setGroupHistory(JSON.parse(savedGroupHistory));
    }

    // Check URL parameters for deep linking
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    const mode = params.get('mode');
    
    if (path === '/group-results' || mode === 'group') {
      const ranges = params.get('rollRanges') || params.get('ranges');
      const curr = params.get('curriculumId');
      const reg = params.get('regulation');
      if (ranges && curr && reg) {
        setSearchMode('group');
        setRollRanges(ranges);
        setCurriculumId(curr);
        setRegulation(reg);
        handleGroupSearch(undefined, ranges, curr, reg);
      }
    } else {
      const urlRoll = params.get('roll');
      const urlCurriculum = params.get('curriculumId');
      if (urlRoll && urlCurriculum) {
        setSearchMode('single');
        setRoll(urlRoll);
        setCurriculumId(urlCurriculum);
        handleSearch(undefined, urlRoll, urlCurriculum);
      }
    }
  }, []);

  // Auto-scroll to results top when result is loaded
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600); // Wait for entrance animation
      return () => clearTimeout(timer);
    }
  }, [result]);

  const addToHistory = (r: string, c: string, data: StudentData) => {
    setHistory(prev => {
      const newHistory = [{roll: r, curriculumId: c, data}, ...prev.filter(item => item.roll !== r)].slice(0, 5);
      localStorage.setItem('bteb_search_history_v2', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const addGroupToHistory = (ranges: string, curr: string, reg: string, data: GroupApiResponse['data']) => {
    setGroupHistory(prev => {
      const newItem = { rollRanges: ranges, curriculumId: curr, regulation: reg, data };
      const filtered = prev.filter(h => !(h.rollRanges === ranges && h.curriculumId === curr && h.regulation === reg));
      const newHistory = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem('bteb_group_history_v1', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('bteb_search_history_v2');
  };

  const clearGroupHistory = () => {
    setGroupHistory([]);
    localStorage.removeItem('bteb_group_history_v1');
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const handleSearch = async (e?: React.FormEvent, searchRoll?: string, searchCurriculum?: string) => {
    if (e) e.preventDefault();
    const finalRoll = searchRoll || roll;
    const finalCurriculum = searchCurriculum || curriculumId;
    if (finalRoll.length !== 6) return;

    if (searchRoll) setRoll(searchRoll);
    if (searchCurriculum) setCurriculumId(searchCurriculum);

    // Check Cache
    const cached = history.find(h => h.roll === finalRoll && h.curriculumId === finalCurriculum);
    if (cached && cached.data) {
      setResult(cached.data);
      // Move to top of history
      addToHistory(finalRoll, finalCurriculum, cached.data);
      
      // Update URL params
      const shareUrl = new URL(window.location.origin);
      shareUrl.searchParams.set('roll', finalRoll);
      shareUrl.searchParams.set('curriculumId', finalCurriculum);
      window.history.pushState({}, '', shareUrl.toString());
      return;
    }

    // Update URL params
    const shareUrl = new URL(window.location.origin);
    shareUrl.searchParams.set('roll', finalRoll);
    shareUrl.searchParams.set('curriculumId', finalCurriculum);
    window.history.pushState({}, '', shareUrl.toString());

    setLoading(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/api/proxy/results?roll=${finalRoll}&curriculumId=${finalCurriculum}`, {
        signal: controller.signal
      });
      
      if (!response.ok) {
        let msg = "Something went wrong";
        let sub = "We couldn't reach the BTEB server at this moment.";
        
        if (response.status === 404) {
          msg = "Result not found";
          sub = "Check if the Board Roll number or Curriculum selection is correct.";
        } else if (response.status === 503 || response.status === 502) {
          msg = "BTEB Server Busy";
          sub = "The board server is currently overloaded. Please try again after 1 or 2 minutes.";
        } else if (response.status === 429) {
          msg = "Too many requests";
          sub = "You've made too many requests. Please wait a moment before trying again.";
        } else if (response.status === 403) {
          msg = "Access Forbidden";
          sub = "BTEB server is limiting requests from our server. Try again in a minute.";
        }
        
        try {
          const errorData = await response.json();
          if (errorData.message) msg = errorData.message;
        } catch (e) {}

        throw { message: msg, subtext: sub };
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const studentData = data.data[0];
        setResult(studentData);
        addToHistory(finalRoll, finalCurriculum, studentData);
        
        // Notify if permission granted
        if (Notification.permission === 'granted') {
          try {
            new Notification('Result Found!', {
              body: `Results for Roll ${finalRoll} have been loaded successfully.`,
              icon: 'https://i.postimg.cc/pL2KbsYP/bteb-results-249.png'
            });
          } catch (e) {
            console.warn('Notification failed:', e);
          }
        }
        
        // Update URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.set('roll', finalRoll);
        url.searchParams.set('curriculumId', finalCurriculum);
        window.history.pushState({}, '', url);

        // Fetch extra info in the background (Only for Diploma in Engineering)
        if (finalCurriculum === 'diploma_in_engineering') {
          fetchStudentInfo(finalRoll);
        }
      } else {
        setError({ 
          message: data.message || 'No result found', 
          subtext: 'Double check the roll number or try a different curriculum.' 
        });
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.name === 'AbortError') {
        setError({ 
          message: 'Request Timeout', 
          subtext: 'The server is taking too long. Check your internet or try again later.' 
        });
      } else if (!navigator.onLine) {
        setError({ 
          message: 'No Connection', 
          subtext: 'It seems you are offline. Check your internet and try again.' 
        });
      } else {
        setError({ 
          message: err.message || 'Error occurred', 
          subtext: err.subtext || 'An unexpected error happened while fetching results.' 
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleIndividualView = async (rollToFetch: number, currId: string) => {
    // Check Cache first
    const cached = history.find(h => h.roll === rollToFetch.toString() && h.curriculumId === currId);
    if (cached && cached.data) {
      setModalResult(cached.data);
      return;
    }

    setModalLoading(true);
    setModalResult(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/proxy/results?roll=${rollToFetch}&curriculumId=${currId}`, {
        signal: controller.signal
      });
      
      if (response.ok) {
        const data: ApiResponse = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const studentData = data.data[0];
          setModalResult(studentData);
          addToHistory(rollToFetch.toString(), currId, studentData);

          // Auto background info fetch if needed
          if (currId === 'diploma_in_engineering') {
             // We can use a simpler version or just fetch and update modalResult
             const infoRes = await fetch(`${API_BASE_URL}/api/proxy/student-info?roll=${rollToFetch}`);
             if (infoRes.ok) {
               const extraData = await infoRes.json();
               if (extraData.success && extraData.data) {
                 const updatedData = {
                   ...studentData,
                   studentName: extraData.data['Student Name'],
                   technology: extraData.data['Technology']
                 };
                 setModalResult(updatedData);
                 addToHistory(rollToFetch.toString(), currId, updatedData);
               }
             }
          }
        }
      }
    } catch (err) {
      console.error('Modal fetch failed:', err);
    } finally {
      clearTimeout(timeoutId);
      setModalLoading(false);
    }
  };

  const handleGroupSearch = async (e: React.FormEvent, searchRanges?: string, searchCurr?: string, searchReg?: string) => {
    if (e) e.preventDefault();
    const finalRanges = searchRanges || rollRanges;
    const finalCurr = searchCurr || curriculumId;
    const finalReg = searchReg || regulation;
    
    if (!finalRanges.trim()) return;

    // Check Cache
    const cached = groupHistory.find(h => 
      h.rollRanges === finalRanges && 
      h.curriculumId === finalCurr && 
      h.regulation === finalReg
    );

    if (cached) {
      setGroupResults(cached.data);
      if (searchRanges) setRollRanges(searchRanges);
      if (searchCurr) setCurriculumId(searchCurr);
      if (searchReg) setRegulation(searchReg);

      // Update URL params
      const shareUrl = new URL(window.location.origin + '/group-results');
      shareUrl.searchParams.set('curriculumId', finalCurr);
      shareUrl.searchParams.set('regulation', finalReg);
      shareUrl.searchParams.set('rollRanges', finalRanges);
      window.history.pushState({}, '', shareUrl.toString());

      return;
    }

    // Update URL params
    const shareUrl = new URL(window.location.origin + '/group-results');
    shareUrl.searchParams.set('curriculumId', finalCurr);
    shareUrl.searchParams.set('regulation', finalReg);
    shareUrl.searchParams.set('rollRanges', finalRanges);
    window.history.pushState({}, '', shareUrl.toString());

    setLoading(true);
    setError(null);
    setGroupResults(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/proxy/group-results?rollRanges=${encodeURIComponent(finalRanges)}&curriculumId=${finalCurr}&regulation=${finalReg}`, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw { message: 'Failed to fetch group results', subtext: 'BTEB server might be busy or ranges are invalid.' };
      }

      const data: GroupApiResponse = await response.json();
      if (data.success && data.data) {
        setGroupResults(data.data);
        addGroupToHistory(finalRanges, finalCurr, finalReg, data.data);
        // Start background name fetching for group students
        fetchGroupNames(data.data.studentResults);
      } else {
        setError({ message: 'No group results found', subtext: 'Check your roll ranges and curriculum selection.' });
      }
    } catch (err: any) {
      console.error('Group fetch error:', err);
      setError({ 
        message: err.message || 'Error occurred', 
        subtext: err.subtext || 'An unexpected error happened while fetching group results.' 
      });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const fetchStudentInfo = async (rollToFetch: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/proxy/student-info?roll=${rollToFetch}`);
      if (response.ok) {
        const extraData = await response.json();
        if (extraData.success && extraData.data) {
          setResult(prev => {
            if (!prev || prev.roll.toString() !== rollToFetch) return prev;
            const updated = {
              ...prev,
              studentName: extraData.data['Student Name'],
              technology: extraData.data['Technology']
            };
            addToHistory(rollToFetch, updated.curriculumId, updated);
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Background info fetch failed:', error);
    }
  };

  const fetchGroupNames = async (students: any[]) => {
    // Fetch names in small batches to avoid overwhelming the server
    const batchSize = 3;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      await Promise.all(batch.map(async (student) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/proxy/student-info?roll=${student.roll}`);
          if (response.ok) {
            const extraData = await response.json();
            if (extraData.success && extraData.data) {
              const name = extraData.data['Student Name'];
              setGroupResults(prev => {
                if (!prev) return null;
                const updated = {
                  ...prev,
                  studentResults: prev.studentResults.map(s => 
                    s.roll === student.roll ? { ...s, studentName: name } : s
                  )
                };
                // Sync with cache
                addGroupToHistory(updated.rollRanges, updated.curriculumId, updated.regulation.toString(), updated);
                return updated;
              });
            }
          }
        } catch (error) {
          console.error(`Background info fetch failed for roll ${student.roll}:`, error);
        }
      }));
    }
  };

  const clearResults = () => {
    setResult(null);
    setGroupResults(null);
    setRoll('');
    setRollRanges('');
    setError(null);
    // Clear URL params and reset path
    window.history.pushState({}, '', window.location.origin);
  };

  const exportAsImage = async () => {
    if (!resultRef.current || exporting) return;
    
    setExporting(true);
    try {
      // Add a small delay to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const filter = (node: HTMLElement) => {
        const isCloseBtn = node.classList?.contains('close-btn');
        const isExportBtn = node.classList?.contains('export-btns');
        return !isCloseBtn && !isExportBtn;
      };

      const dataUrl = await htmlToImage.toPng(resultRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        filter: filter as any,
      });
      
      const link = document.createElement('a');
      link.download = `BTEB_Result_${resultRef.current.getAttribute('data-roll')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const shareAsLink = async () => {
    if (!result) return;
    
    setSharing(true);
    const shareUrl = new URL(window.location.origin);
    shareUrl.searchParams.set('roll', result.roll.toString());
    shareUrl.searchParams.set('curriculumId', curriculumId);
    
    const text = `Result for ${result.studentName || result.roll}: ${shareUrl.toString()}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'BTEB Student Result',
          text: `Check out the result for roll #${result.roll}`,
          url: shareUrl.toString(),
        });
      } else {
        await navigator.clipboard.writeText(shareUrl.toString());
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const shareGroupLink = async () => {
    if (!groupResults) return;
    
    setSharing(true);
    const shareUrl = new URL(window.location.origin + '/group-results');
    shareUrl.searchParams.set('curriculumId', groupResults.curriculumId);
    shareUrl.searchParams.set('regulation', groupResults.regulation.toString());
    shareUrl.searchParams.set('rollRanges', groupResults.rollRanges);
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'BTEB Group Results',
          text: `Check out the group results for ranges: ${groupResults.rollRanges}`,
          url: shareUrl.toString(),
        });
      } else {
        await navigator.clipboard.writeText(shareUrl.toString());
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#1f2937] font-sans p-4 md:p-8 flex flex-col items-center">
      <style>
        {`
          @media print, .export-mode {
            @page {
              size: A4;
              margin: 0.8cm;
            }
            html, body {
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: white !important;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .min-h-screen {
              background: white !important;
              padding: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              display: block !important;
            }
            .print-container {
              width: 100% !important;
              max-width: 1000px !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0.5cm !important;
              display: block !important;
              background: white !important;
            }
            .export-btns, .search-container, .history-container, .toast-container, footer, .close-btn {
              display: none !important;
            }
            /* Grid Layout */
            .print-grid-layout {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 12px !important;
              align-items: stretch !important;
            }
            .semesters-list-container {
              display: contents !important;
            }
            .semester-card {
              break-inside: avoid;
              page-break-inside: avoid;
              border: 1px solid #e5e7eb !important;
              margin-bottom: 0 !important;
              padding: 12px !important;
              font-size: 11px !important;
              height: 100% !important;
              background: white !important;
              border-radius: 1rem !important;
            }
            .semester-card h3 {
              font-size: 13px !important;
              margin-bottom: 4px !important;
            }
            .semester-card .text-[40px] {
              font-size: 24px !important;
            }
            .semester-card .text-[24px] {
              font-size: 16px !important;
            }
            .total-result-card {
              grid-column: span 1 !important;
              margin-bottom: 0 !important;
              padding: 12px !important;
              height: auto !important;
              min-height: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              background-color: #1e40af !important;
              color: white !important;
              border-radius: 1rem !important;
            }
            .total-result-card span.text-4xl {
              font-size: 28px !important;
            }
            .total-result-card span.text-xs {
              font-size: 10px !important;
            }
            .total-result-card .text-blue-100 {
              font-size: 11px !important;
            }
            .bg-[#1e40af] {
              background-color: #1e40af !important;
              color: white !important;
            }
            .p-4.pt-20 {
              padding-top: 0.5rem !important;
            }
            .mb-8 {
              margin-bottom: 1rem !important;
            }
            .print-footer {
              display: block !important;
              margin-top: 1cm;
              border-top: 1px solid #e5e7eb;
              padding-top: 8px;
              font-size: 10px;
              color: #6B7280;
              text-align: center;
            }
            /* Failed subjects alert */
            .failed-subjects-alert {
              grid-column: 1 / -1 !important;
              padding: 10px !important;
              font-size: 12px !important;
              margin-bottom: 12px !important;
            }
          }
        `}
      </style>
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 z-[100]"
          >
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Link copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header / Search Area */}
      {!result && !groupResults && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-sm p-6 md:p-8 mt-4 md:mt-10 search-container"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-blue-500/5 relative overflow-hidden border border-blue-50">
              <img 
                src="https://i.postimg.cc/pL2KbsYP/bteb-results-249.png" 
                alt="BTEB Result Logo" 
                className="w-full h-full object-contain scale-110"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">BTEB Results</h1>
            <p className="text-gray-500 text-sm mt-1">Board Exam Results Portal</p>
            
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {!isOnline && (
                <div className="px-4 py-1.5 bg-amber-50 border border-amber-100 rounded-full flex items-center gap-2 text-amber-700 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Offline Mode</span>
                </div>
              )}
              {showInstallBtn && (
                <button 
                  onClick={handleInstallClick}
                  className="px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full flex items-center gap-2 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Install App</span>
                </button>
              )}
              <button 
                onClick={requestNotificationPermission}
                className="px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full flex items-center gap-2 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Enable Alerts</span>
              </button>
            </div>
          </div>

          {/* Search Mode Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
            <button
              onClick={() => setSearchMode('single')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                searchMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4" />
              Individual
            </button>
            <button
              onClick={() => setSearchMode('group')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                searchMode === 'group' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Group Results
            </button>
          </div>

          {searchMode === 'single' ? (
            <form onSubmit={handleSearch} className="space-y-5">
              <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                <label className="block text-[10px] md:text-[11px] font-bold text-gray-400 ml-1 tracking-wider uppercase">Curriculum / Exam</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`w-full h-14 bg-white border ${dropdownOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-200'} rounded-2xl px-4 md:px-5 pl-12 flex items-center justify-between transition-all duration-200 text-sm md:text-[15px] font-bold text-gray-700 shadow-sm`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-blue-500 w-5 h-5" />
                      <span className="truncate">{selectedCurriculum.name}</span>
                    </div>
                    <ChevronDown className={`text-gray-400 w-4 h-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-100 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden max-h-[350px] overflow-y-auto py-2"
                      >
                        {CURRICULUMS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCurriculumId(c.id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full px-5 py-4 text-left text-sm font-bold flex items-center justify-between transition-colors ${
                              curriculumId === c.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {c.name}
                            {curriculumId === c.id && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] md:text-[11px] font-bold text-gray-400 ml-1 tracking-wider uppercase">Board Roll</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Board Roll (e.g. 240363)"
                    value={roll}
                    maxLength={6}
                    onChange={(e) => setRoll(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl px-5 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-base md:text-lg font-medium"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || roll.length !== 6}
                className="w-full h-14 bg-[#1e40af] hover:bg-[#1d4ed8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Check Result'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleGroupSearch} className="space-y-5">
              <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                <label className="block text-[10px] md:text-[11px] font-bold text-gray-400 ml-1 tracking-wider uppercase">Curriculum / Exam</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`w-full h-14 bg-white border ${dropdownOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-200'} rounded-2xl px-4 md:px-5 pl-12 flex items-center justify-between transition-all duration-200 text-sm md:text-[15px] font-bold text-gray-700 shadow-sm`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-blue-500 w-5 h-5" />
                      <span className="truncate">{selectedCurriculum.name}</span>
                    </div>
                    <ChevronDown className={`text-gray-400 w-4 h-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-100 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden max-h-[350px] overflow-y-auto py-2"
                      >
                        {CURRICULUMS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCurriculumId(c.id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full px-5 py-4 text-left text-sm font-bold flex items-center justify-between transition-colors ${
                              curriculumId === c.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {c.name}
                            {curriculumId === c.id && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {curriculumId === 'diploma_in_engineering' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] md:text-[11px] font-bold text-gray-400 ml-1 tracking-wider uppercase">Regulation</label>
                  <div className="flex gap-2">
                    {['2022', '2016', '2010'].map((reg) => (
                      <button
                        key={reg}
                        type="button"
                        onClick={() => setRegulation(reg)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                          regulation === reg 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] md:text-[11px] font-bold text-gray-400 ml-1 tracking-wider uppercase">Roll Ranges</label>
                <div className="relative">
                  <textarea
                    placeholder="e.g. 240360-240363, 240365"
                    value={rollRanges}
                    onChange={(e) => setRollRanges(e.target.value)}
                    className="w-full h-32 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-base font-medium resize-none"
                  />
                  <Layers className="absolute right-4 bottom-4 text-gray-300 w-5 h-5 pointer-events-none" />
                </div>
                <p className="text-[10px] text-gray-400 ml-1 font-bold">Use hyphens for ranges and commas for multiple values.</p>
              </div>

              <button
                type="submit"
                disabled={loading || !rollRanges.trim()}
                className="w-full h-14 bg-[#1e40af] hover:bg-[#1d4ed8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Get Group Results'}
              </button>

              {groupHistory.length > 0 && (
                <div className="mt-8 history-container">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> RECENT GROUPS
                    </h3>
                    <button 
                      type="button"
                      onClick={clearGroupHistory}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {groupHistory.map((h, i) => (
                      <button
                        key={`group-hist-${h.rollRanges}-${h.curriculumId}-${h.regulation}-${i}`}
                        type="button"
                        onClick={() => handleGroupSearch(undefined, h.rollRanges, h.curriculumId, h.regulation)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-left hover:bg-blue-50 hover:border-blue-100 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700 truncate max-w-[200px]">
                            {h.rollRanges}
                          </span>
                          <div className="flex gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{h.regulation}</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase">{h.data.studentResults.length} STU</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Single Result Search History - Only show in single mode */}
          {searchMode === 'single' && history.length > 0 && (
            <div className="mt-8 history-container">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> RECENT SEARCHES
                </h3>
                <button 
                  onClick={clearHistory}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((h, i) => (
                  <button
                    key={`hist-${h.roll}-${h.curriculumId}-${i}`}
                    onClick={() => handleSearch(undefined, h.roll, h.curriculumId)}
                    className="px-4 py-2.5 md:py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 font-bold text-sm hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all flex items-center gap-1.5"
                  >
                    {h.roll}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4 text-red-700 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex flex-col">
                <p className="text-[17px] font-black leading-tight mb-1">
                  {error.message}
                </p>
                {error.subtext && (
                  <p className="text-sm font-bold text-red-600/70 leading-snug">
                    {error.subtext}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Loading Skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg mt-6"
          >
            <ResultSkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Individual Result Modal */}
      <AnimatePresence>
        {(modalResult || modalLoading) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl relative my-auto"
            >
              <button 
                onClick={() => {
                  setModalResult(null);
                  setModalLoading(false);
                }}
                className="absolute -top-14 right-0 md:-right-14 p-3 text-white hover:bg-white/20 rounded-full transition-colors flex items-center gap-2 font-bold group"
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Close</span>
                <X className="w-8 h-8" />
              </button>

              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto scrollbar-hide">
                {modalLoading ? (
                  <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-bold animate-pulse">Loading Student Profile...</p>
                  </div>
                ) : modalResult && (
                  <div className="p-1">
                    <IndividualResultView 
                      result={modalResult} 
                      onClear={() => setModalResult(null)}
                      onShare={shareAsLink}
                      onPrint={handlePrint}
                      onExport={exportAsImage}
                      isSharing={sharing}
                      isExporting={exporting}
                      isOnline={isOnline}
                      hideCloseBtn={true}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Display */}
      <AnimatePresence>
        {result && (
          <IndividualResultView 
            result={result} 
            onClear={clearResults}
            onShare={shareAsLink}
            onPrint={handlePrint}
            onExport={exportAsImage}
            isSharing={sharing}
            isExporting={exporting}
            isOnline={isOnline}
            containerRef={resultRef}
          />
        )}
        {groupResults && (
          <GroupResultsView 
            key={`group-result-${groupResults.rollRanges}`}
            data={groupResults} 
            onClear={clearResults} 
            onRollClick={(roll) => handleIndividualView(roll, groupResults.curriculumId)}
            onShare={shareGroupLink}
            isSharing={sharing}
          />
        )}
      </AnimatePresence>

      <footer className="w-full py-6 mt-auto bg-white/50 backdrop-blur-sm border-t border-gray-200/50 flex flex-col items-center justify-center gap-1">
        <p className="text-gray-500 font-medium text-sm">
          &copy; {new Date().getFullYear()} Oahid Towsif Shamol
        </p>
        <p className="text-gray-400 text-xs">
          Clean & Fast • Student Results Portal
        </p>
      </footer>
    </div>
  );
}

interface GroupResultsProps {
  data: GroupApiResponse['data'];
  onClear: () => void;
  onRollClick: (roll: number) => void;
  onShare: () => void;
  isSharing: boolean;
}

function IndividualResultView({ 
  result, 
  onClear, 
  onShare, 
  onPrint, 
  onExport, 
  isSharing, 
  isExporting, 
  isOnline, 
  containerRef,
  hideCloseBtn = false 
}: { 
  result: StudentData, 
  onClear: () => void, 
  onShare: () => void, 
  onPrint: () => void, 
  onExport: () => void, 
  isSharing: boolean, 
  isExporting: boolean, 
  isOnline: boolean,
  containerRef?: React.RefObject<HTMLDivElement>,
  hideCloseBtn?: boolean
}) {
  return (
    <motion.div
      key={`result-${result.roll}`}
      ref={containerRef}
      data-roll={result.roll}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border border-gray-100 mb-20 print-container mx-auto ${isExporting ? 'export-mode' : ''}`}
    >
      {/* Action Buttons */}
      {!hideCloseBtn && (
        <div className="absolute top-6 right-6 flex items-center gap-2 z-10 export-btns">
          <button 
            onClick={onPrint}
            className="p-2 h-11 w-11 rounded-full bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-center transition-all shadow-sm"
            title="Print Result"
          >
            <Printer className="w-5 h-5 text-green-600" />
          </button>
          <button 
            onClick={onShare}
            disabled={isSharing}
            className="p-2 h-11 w-11 rounded-full bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-center transition-all shadow-sm"
            title="Share Link"
          >
            {isSharing ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : <Share2 className="w-5 h-5 text-indigo-500" />}
          </button>
          <button 
            onClick={onExport}
            disabled={isExporting}
            className="p-2 h-11 w-11 rounded-full bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-center transition-all shadow-sm"
            title="Export as Photo"
          >
            {isExporting ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <Download className="w-5 h-5 text-blue-500" />}
          </button>
          <button 
            onClick={onClear}
            className="p-2 h-11 w-11 rounded-full bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-center transition-all shadow-sm close-btn"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      )}

      <div className={`p-4 ${hideCloseBtn ? 'pt-8' : 'pt-16 md:pt-20'}`}>
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-[#1f2937] mb-2 tracking-tighter flex items-center justify-center gap-2">
            <span className="text-[#6B7280] font-normal">#</span>
            {result.roll}
          </h2>
          
          {!isOnline && (
            <div className="mb-4 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full flex items-center gap-2 text-amber-700 animate-pulse inline-flex">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Offline Result (Cached)</span>
            </div>
          )}

          {(result.studentName || result.technology) && (
            <div className="mb-4 space-y-1">
              {result.studentName && (
                <h3 className="text-xl font-bold text-blue-600">
                  {result.studentName}
                </h3>
              )}
              {result.technology && (
                <p className="text-gray-500 font-bold text-[10px] md:text-xs bg-gray-100 px-2 md:px-3 py-0.5 md:py-1 rounded-full inline-block">
                  {result.technology}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1 text-[#6b7280] text-[13px] md:text-[14px]">
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="capitalize">{result.curriculumId.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Regulation {result.regulation}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
              <span className="truncate max-w-[250px] md:max-w-none">{result.institute.name}, {result.institute.district}</span>
            </div>
          </div>
        </div>

        <div className="print-grid-layout">
          {/* Status Alert */}
          {(() => {
            const eighthSem = result.semesterResults.find(s => s.semester === 8);
            const latestResult = eighthSem?.results[0];
            const hasCGPA = latestResult?.cgpa !== undefined;
            const isPassed = eighthSem?.status === 'passed';
            const isCertified = result.currentFailedSubjects.length === 0 && isPassed;

            if (result.regulation === 22 && isPassed && hasCGPA) {
              return (
                <div className="bg-[#1e40af] rounded-2xl p-5 mb-6 text-white text-center shadow-lg shadow-blue-100 flex flex-col items-center gap-1 total-result-card">
                  <span className="text-blue-100/80 text-xs font-bold uppercase tracking-widest">Total Result (CGPA)</span>
                  <span className="text-4xl font-black">{latestResult.cgpa.toFixed(2)}</span>
                  {isCertified && (
                    <div className="flex items-center gap-1.5 text-blue-100 text-sm font-medium mt-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Diploma Completed</span>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {result.currentFailedSubjects.length > 0 ? (
            <div className="bg-[#fff1f2] border border-[#ffe4e6] rounded-xl py-4 px-4 text-center mb-6 failed-subjects-alert">
              <p className="text-[#be123c] font-bold text-lg tracking-tight">
                {result.currentFailedSubjects.length} {result.currentFailedSubjects.length === 1 ? 'subject' : 'subjects'} yet to pass
              </p>
            </div>
          ) : (
            <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl py-4 px-4 text-center mb-6 failed-subjects-alert">
              <p className="text-[#15803d] font-bold text-lg tracking-tight">Passed Successfully!</p>
            </div>
          )}

          {/* Semester Results List */}
          <div className="space-y-3 md:space-y-4 semesters-list-container">
            {[...result.semesterResults]
              .sort((a, b) => b.semester - a.semester)
              .map((sem, idx) => (
                <SemesterCard key={`${sem.semester}-${idx}`} semester={sem} regulation={result.regulation} />
              ))}
          </div>
        </div>
        
        {/* Print Only Footer */}
        <div className="hidden print-footer">
          <div className="flex justify-between items-center px-4">
            <span>Printed on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</span>
            <span className="font-bold">BTEB Result Checker</span>
            <span>Visit: {window.location.host}</span>
          </div>
          <p className="mt-1 opacity-60">Note: This is a computer-generated report. For official purposes, please refer to the original marksheets issued by BTEB.</p>
        </div>
      </div>
    </motion.div>
  );
}

const GroupResultsView: React.FC<GroupResultsProps> = ({ data, onClear, onRollClick, onShare, isSharing }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const sortedResults = React.useMemo(() => {
    let items = [...data.studentResults];
    if (sortConfig !== null) {
      items.sort((a, b) => {
        if (sortConfig.key === 'roll') {
          return sortConfig.direction === 'asc' ? Number(a.roll) - Number(b.roll) : Number(b.roll) - Number(a.roll);
        }
        // Semester sorting
        if (sortConfig.key.startsWith('sem-')) {
          const semNum = parseInt(sortConfig.key.split('-')[1]);
          const aRes = a.results.find(r => r.semester === semNum);
          const bRes = b.results.find(r => r.semester === semNum);
          const aVal = Number(aRes?.gpa ?? -1);
          const bVal = Number(bRes?.gpa ?? -1);
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }
    return items;
  }, [data.studentResults, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const allSemesters = Array.from(new Set(data.studentResults.flatMap(s => s.results.map(r => r.semester)))).sort((a: number, b: number) => Number(a) - Number(b));

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-blue-600 w-6 h-6" />
              Group Results Analysis
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wider">
                {data.curriculumId.replace(/_/g, ' ')}
              </span>
              <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-full border border-gray-100 uppercase tracking-wider">
                Regulation {data.regulation}
              </span>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100 uppercase tracking-wider">
                {data.totalResults} Students
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onShare}
              disabled={isSharing}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-indigo-100"
            >
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              Share Link
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-gray-100"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
            <button
              onClick={onClear}
              className="px-4 py-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-gray-100 close-btn"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-16" key="header-sl">SL</th>
                <th 
                  className="px-6 py-4 text-[11px] font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => requestSort('roll')}
                  key="header-roll"
                >
                  <div className="flex items-center gap-1">
                    Roll
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-900 uppercase tracking-wider" key="header-name">Name</th>
                {allSemesters.map(sem => (
                  <th 
                    key={`header-sem-${sem}`} 
                    className="px-6 py-4 text-[11px] font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-center"
                    onClick={() => requestSort(`sem-${sem}`)}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {getOrdinal(Number(sem))}
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedResults.map((student, idx) => {
                const hasFailures = student.results.some(res => (res.failedSubjects?.length || 0) > 0);

                return (
                  <tr key={`${student.roll}-${idx}`} className={`hover:bg-blue-50/30 transition-colors group ${hasFailures ? 'bg-red-50/20' : ''}`}>
                    <td className="px-6 py-4 text-xs font-bold text-gray-400">
                      <div className="flex items-center gap-2">
                        {idx + 1}
                        {hasFailures && <AlertCircle className="w-3 h-3 text-red-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-gray-900">
                      <button 
                        onClick={() => onRollClick(student.roll)}
                        className="hover:text-blue-600 hover:underline transition-all cursor-pointer text-left"
                      >
                        {student.roll}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-500">{student.studentName || '-'}</td>
                    {allSemesters.map(sem => {
                      const res = student.results.find(r => r.semester === sem);
                      if (!res) return <td key={`cell-${student.roll}-sem-${sem}`} className="px-6 py-4 text-center text-gray-300">-</td>;
                      
                      const isFailing = res.failedSubjects && res.failedSubjects.length > 0;
                      
                      return (
                        <td key={`cell-${student.roll}-sem-${sem}`} className="px-6 py-4 text-center">
                          {isFailing ? (
                            <div className="inline-flex px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-500 shadow-sm hover:border-red-200 hover:text-red-600 transition-all cursor-default">
                              {res.failedSubjects.length} {res.failedSubjects.length === 1 ? 'ref' : 'refs'}
                            </div>
                          ) : res.gpa ? (
                            <div className="inline-flex px-3 py-1 bg-[#f0fdf4] text-[#16a34a] text-xs font-black rounded-lg border border-[#bbf7d0]">
                              {res.gpa.toFixed(2)}
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 p-6 md:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-gray-200 rounded-3xl mb-4" />
        <div className="w-40 h-8 bg-gray-100 rounded-lg mb-2" />
        <div className="w-32 h-4 bg-gray-50 rounded-md" />
      </div>

      {/* Info Rows */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded-full" />
          <div className="w-48 h-4 bg-gray-100 rounded-md" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded-full" />
          <div className="w-32 h-4 bg-gray-100 rounded-md" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded-full" />
          <div className="w-64 h-4 bg-gray-100 rounded-md" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border border-gray-100 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <div className="w-20 h-5 bg-gray-200 rounded-md" />
              <div className="w-16 h-5 bg-green-50 rounded-full" />
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-md" />
            <div className="space-y-2 mt-4">
              <div className="w-full h-8 bg-gray-50 rounded-lg" />
              <div className="w-full h-8 bg-gray-50 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SemesterCard({ semester, regulation }: any) {
  // Logic: If republished GPA is same as original, show original date
  const displayResult = (() => {
    if (semester.results.length <= 1) return semester.results[0];
    const latest = semester.results[0];
    const original = semester.results.find(r => !r.republished);
    if (original) {
      if (semester.status === 'passed') {
        const latestPoint = latest.gpa;
        const originalPoint = original.gpa;
        if (latestPoint === originalPoint) return original;
      }
      if (semester.status === 'failed') {
        const latestFails = latest.failedSubjects?.map(s => s.subCode).sort().join(',');
        const originalFails = original.failedSubjects?.map(s => s.subCode).sort().join(',');
        if (latestFails === originalFails) return original;
      }
    }
    return latest;
  })();

  const dateStr = displayResult.date;
  const formattedDate = format(new Date(dateStr), 'd MMMM, yyyy');
  const timeAgo = formatDistanceToNow(new Date(dateStr), { addSuffix: true });

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Count only the subjects that belong to this semester in the heading badge
  const currentSemFailedCount = displayResult.failedSubjects?.filter(s => s.originSemester === semester.semester && !s.passed).length || 0;

  return (
    <div className="border border-gray-100 rounded-2xl p-3 md:p-4 bg-white shadow-sm overflow-hidden semester-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-[#2563eb]" />
          <h3 className="font-bold text-base md:text-lg text-[#111827]">{getOrdinal(semester.semester)} Semester</h3>
        </div>
        
        {semester.status === 'failed' ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#fff1f2] border border-[#fecaca] rounded-full text-[#b91c1c] font-bold text-sm">
            <X className="w-4 h-4 border-2 border-[#b91c1c] rounded-full p-0.25" />
            <span>{currentSemFailedCount} {currentSemFailedCount === 1 ? 'Subject' : 'Subjects'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full text-[#16a34a] font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Passed</span>
          </div>
        )}
      </div>

      {/* Date & Time Ago */}
      <div className="flex items-center justify-between text-gray-400 mb-3 md:mb-4 px-0.5">
        <div className="flex items-center gap-2 text-[12px] md:text-[14px] font-medium text-[#2563eb]/80">
          <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#6b7280]" />
          {formattedDate}
        </div>
        <div className="bg-[#f3f4f6] text-[#6b7280] px-2 py-0.5 rounded-lg text-[10px] md:text-[12px] font-medium grow-0">
          {timeAgo}
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-1">
        {displayResult.failedSubjects && displayResult.failedSubjects.length > 0 ? (
          <div className="border border-gray-100 rounded-xl overflow-hidden mt-2 bg-white">
            {displayResult.failedSubjects.map((sub, i) => (
              <div 
                key={`${sub.subCode}-${i}`} 
                className="flex items-center justify-between py-1 px-2.5 border-b border-gray-50 last:border-0 relative"
              >
                {/* Side Indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${sub.passed ? 'bg-[#4ade80]' : 'bg-[#f87171]'}`} />
                
                <div className="flex items-center gap-3 pl-3">
                  <div className={sub.passed ? 'text-[#166534]' : 'text-[#991b1b]'}>
                    <span className={`font-bold text-sm md:text-base ${sub.passed ? 'line-through opacity-60' : ''}`}>{sub.subName}</span>
                    <span className="ml-1.5 text-[10px] md:text-[11px] opacity-70 font-medium whitespace-nowrap">({sub.subCode})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sub.originSemester !== semester.semester && (
                    <span className="bg-[#f1f5f9] text-[#64748b] px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
                      {getOrdinal(sub.originSemester)}
                    </span>
                  )}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold tracking-tight border shadow-sm ${
                    sub.type === 'T' 
                      ? 'bg-[#eef2ff] text-[#4338ca] border-[#e0e7ff]' 
                      : 'bg-[#fdf4ff] text-[#a21caf] border-[#fae8ff]'
                  }`}>
                    {sub.type === 'T' ? 'Theory' : 'Practical'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl py-6 flex flex-col items-center justify-center transition-all">
             {semester.semester === 8 && displayResult.cgpa !== undefined ? (
               <div className="flex flex-col items-center gap-4">
                 <div className="flex flex-col items-center">
                   <span className="text-[#1e40af]/60 font-bold text-[10px] tracking-widest uppercase mb-1">Final Result (CGPA)</span>
                   <span className="text-[#1e40af] text-[40px] font-black tracking-tight leading-none">{displayResult.cgpa.toFixed(2)}</span>
                 </div>
                 <div className="h-px w-12 bg-gray-200" />
                 <div className="flex items-center gap-3 opacity-80">
                   <span className="text-gray-500 font-medium text-[16px] tracking-wide">Semester GPA</span>
                   <span className="text-[#22c55e] text-[24px] font-bold tracking-tight leading-none">{displayResult.gpa?.toFixed(2)}</span>
                 </div>
               </div>
             ) : (
               <div className="flex items-center gap-3">
                 <span className="text-gray-500 font-medium text-[18px] tracking-wide">GPA</span>
                 <span className="text-[#22c55e] text-[40px] font-bold tracking-tight leading-none">{displayResult.gpa?.toFixed(2)}</span>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
