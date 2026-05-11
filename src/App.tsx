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
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';
import { ApiResponse, StudentData, SemesterResult } from './types';
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
  const [roll, setRoll] = useState('');
  const [curriculumId, setCurriculumId] = useState('diploma_in_engineering');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudentData | null>(null);
  const [history, setHistory] = useState<{roll: string, curriculumId: string}[]>([]);

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
  }, []);

  const addToHistory = (r: string, c: string) => {
    setHistory(prev => {
      const newHistory = [{roll: r, curriculumId: c}, ...prev.filter(item => item.roll !== r)].slice(0, 5);
      localStorage.setItem('bteb_search_history_v2', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('bteb_search_history_v2');
  };

  const handleSearch = async (e?: React.FormEvent, searchRoll?: string, searchCurriculum?: string) => {
    if (e) e.preventDefault();
    const finalRoll = searchRoll || roll;
    const finalCurriculum = searchCurriculum || curriculumId;
    if (finalRoll.length !== 6) return;

    if (searchRoll) setRoll(searchRoll);
    if (searchCurriculum) setCurriculumId(searchCurriculum);
    setLoading(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    try {
      const response = await fetch(`/api/proxy/results?roll=${finalRoll}&curriculumId=${finalCurriculum}`, {
        signal: controller.signal
      });
      
      if (!response.ok) {
        let msg = `Server error (${response.status})`;
        if (response.status === 404) msg = "Result not found (404)";
        if (response.status === 503 || response.status === 502) msg = "BTEB server overloaded (503). Try again later.";
        if (response.status === 429) msg = "Too many requests (429). Please wait.";
        
        try {
          const errorData = await response.json();
          msg = errorData.message ? `${errorData.message} (${response.status})` : msg;
        } catch (e) {
          // ignore if not json
        }
        throw new Error(msg);
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const studentData = data.data[0];
        setResult(studentData);
        addToHistory(finalRoll, finalCurriculum);
        
        // Fetch extra info in the background
        fetchStudentInfo(finalRoll);
      } else {
        setError(data.message || 'No result found for this roll number.');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.name === 'AbortError') {
        setError('Server is taking too long to respond. Please try again later.');
      } else if (!navigator.onLine) {
        setError('No internet connection. Please check your network.');
      } else {
        setError(err.message || 'Failed to fetch results. The server might be down, please try again.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const fetchStudentInfo = async (rollToFetch: string) => {
    try {
      const response = await fetch(`/api/proxy/student-info?roll=${rollToFetch}`);
      if (response.ok) {
        const extraData = await response.json();
        if (extraData.success && extraData.data) {
          setResult(prev => {
            if (!prev || prev.roll.toString() !== rollToFetch) return prev;
            return {
              ...prev,
              studentName: extraData.data['Student Name'],
              technology: extraData.data['Technology']
            };
          });
        }
      }
    } catch (error) {
      console.error('Background info fetch failed:', error);
    }
  };

  const clearResults = () => {
    setResult(null);
    setRoll('');
  };

  const exportAsImage = async () => {
    if (!resultRef.current || exporting) return;
    
    setExporting(true);
    try {
      // Add a small delay to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const filter = (node: HTMLElement) => {
        const isCloseBtn = node.classList?.contains('close-btn');
        const isExportBtn = node.classList?.contains('export-btns');
        return !isCloseBtn && !isExportBtn;
      };

      const dataUrl = await htmlToImage.toPng(resultRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#f3f4f6',
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

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#1f2937] font-sans p-2 md:p-8 flex flex-col items-center">
      {/* Header / Search Area */}
      {!result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 mt-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#1e40af] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
              <GraduationCap className="text-white w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">BTEB Results</h1>
            <p className="text-gray-500 text-sm mt-1">Board Exam Results Portal</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-5">
            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
              <label className="block text-[11px] font-bold text-gray-400 ml-1 tracking-wider uppercase">Curriculum / Exam</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`w-full h-14 bg-white border ${dropdownOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-200'} rounded-2xl px-5 pl-12 flex items-center justify-between transition-all duration-200 text-[15px] font-bold text-gray-700 shadow-sm`}
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
              <label className="block text-[11px] font-bold text-gray-400 ml-1 tracking-wider uppercase">Board Roll</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Board Roll (e.g. 240363)"
                  value={roll}
                  maxLength={6}
                  onChange={(e) => setRoll(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl px-5 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg font-medium"
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

          {/* Search History */}
          {history.length > 0 && (
            <div className="mt-8">
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
                    key={i}
                    onClick={() => handleSearch(undefined, h.roll, h.curriculumId)}
                    className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 font-bold text-sm hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all flex items-center gap-1.5"
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
              className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium leading-relaxed">
                {error}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Result Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            data-roll={result.roll}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border border-gray-100 mb-20"
          >
            {/* Action Buttons */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-10 export-btns">
              <button 
                onClick={exportAsImage}
                disabled={exporting}
                className="p-2 h-11 w-11 rounded-full bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-center transition-all shadow-sm"
                title="Export as Photo"
              >
                {exporting ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <Download className="w-5 h-5 text-blue-500" />}
              </button>
              <button 
                onClick={clearResults}
                className="p-2 h-11 w-11 rounded-full bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-center transition-all shadow-sm close-btn"
                title="Search Again"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-4 pt-10">
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <h2 className="text-2xl font-bold text-[#4B5563] mb-3 tracking-tight flex items-center justify-center gap-2">
                  <span className="text-[#6B7280] font-normal">#</span>
                  {result.roll}
                </h2>

                {(result.studentName || result.technology) && (
                  <div className="mb-4 space-y-1">
                    {result.studentName && (
                      <h3 className="text-xl font-bold text-blue-600">
                        {result.studentName}
                      </h3>
                    )}
                    {result.technology && (
                      <p className="text-gray-500 font-bold text-xs bg-gray-100 px-3 py-1 rounded-full inline-block">
                        {result.technology}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5 text-[#6b7280] text-[14px]">
                  <div className="flex items-center justify-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="capitalize">{result.curriculumId.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Regulation {result.regulation}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{result.institute.name}, {result.institute.district}</span>
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              {(() => {
                const eighthSem = result.semesterResults.find(s => s.semester === 8);
                const latestResult = eighthSem?.results[0];
                const hasCGPA = latestResult?.cgpa !== undefined;
                const isPassed = eighthSem?.status === 'passed';
                const isCertified = result.currentFailedSubjects.length === 0 && isPassed;

                if (result.regulation === 22 && isPassed && hasCGPA) {
                  return (
                    <div className="bg-[#1e40af] rounded-2xl p-5 mb-6 text-white text-center shadow-lg shadow-blue-100 flex flex-col items-center gap-1">
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
                <div className="bg-[#fff1f2] border border-[#ffe4e6] rounded-xl py-4 px-4 text-center mb-6">
                  <p className="text-[#be123c] font-bold text-lg tracking-tight">
                    {result.currentFailedSubjects.length} {result.currentFailedSubjects.length === 1 ? 'subject' : 'subjects'} yet to pass
                  </p>
                </div>
              ) : (
                <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl py-4 px-4 text-center mb-6">
                  <p className="text-[#15803d] font-bold text-lg tracking-tight">Passed Successfully!</p>
                </div>
              )}

              {/* Semester Results List */}
              <div className="space-y-4">
                {result.semesterResults.map((sem) => (
                  <SemesterCard key={sem.semester} semester={sem} regulation={result.regulation} />
                ))}
              </div>
            </div>
          </motion.div>
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
    <div className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-[#2563eb]" />
          <h3 className="font-bold text-lg text-[#111827]">{getOrdinal(semester.semester)} Semester</h3>
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
      <div className="flex items-center justify-between text-gray-400 mb-4 px-0.5">
        <div className="flex items-center gap-2 text-[14px] font-medium text-[#2563eb]/80">
          <Calendar className="w-4 h-4 text-[#6b7280]" />
          {formattedDate}
        </div>
        <div className="bg-[#f3f4f6] text-[#6b7280] px-2 py-0.5 rounded-lg text-[12px] font-medium grow-0">
          {timeAgo}
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-1">
        {displayResult.failedSubjects && displayResult.failedSubjects.length > 0 ? (
          <div className="border border-gray-100 rounded-xl overflow-hidden mt-2 bg-white">
            {displayResult.failedSubjects.map((sub, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between py-1 px-2.5 border-b border-gray-50 last:border-0 relative"
              >
                {/* Side Indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${sub.passed ? 'bg-[#4ade80]' : 'bg-[#f87171]'}`} />
                
                <div className="flex items-center gap-3 pl-3">
                  <div className={sub.passed ? 'text-[#166534]' : 'text-[#991b1b]'}>
                    <span className={`font-bold text-base ${sub.passed ? 'line-through opacity-60' : ''}`}>{sub.subName}</span>
                    <span className="ml-1.5 text-[11px] opacity-70 font-medium whitespace-nowrap">({sub.subCode})</span>
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
