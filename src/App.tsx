/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';
import { ApiResponse, StudentData, SemesterResult } from './types';

export default function App() {
  const [roll, setRoll] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudentData | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!roll) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/proxy/results?roll=${roll}&curriculumId=diploma_in_engineering`);
      const data: ApiResponse = await response.json();

      if (data.success && data.data.length > 0) {
        setResult(data.data[0]);
      } else {
        setError('No result found for this roll number.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setRoll('');
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#1f2937] font-sans p-4 md:p-8 flex flex-col items-center">
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
            <p className="text-gray-500 text-sm mt-1">Diploma in Engineering Results</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Board Roll (e.g. 240363)"
                value={roll}
                maxLength={6}
                onChange={(e) => setRoll(e.target.value.replace(/\D/g, ''))}
                className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl px-5 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg font-medium"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <button
              type="submit"
              disabled={loading || roll.length !== 6}
              className="w-full h-14 bg-[#1e40af] hover:bg-[#1d4ed8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Check Result'}
            </button>
          </form>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-center mt-4 text-sm font-medium"
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Result Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border border-gray-100 mb-20"
          >
            {/* Close Button */}
            <button 
              onClick={clearResults}
              className="absolute top-6 right-6 p-2 h-11 w-11 rounded-full bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-center transition-all shadow-sm z-10"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>

            <div className="p-6 pt-10">
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <h2 className="text-2xl font-bold text-[#4B5563] mb-3 tracking-tight flex items-center justify-center gap-2">
                  <span className="text-[#6B7280] font-normal">#</span>
                  {result.roll}
                </h2>
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
              {result.currentFailedSubjects.length > 0 ? (
                <div className="bg-[#fff1f2] border border-[#ffe4e6] rounded-xl py-4 px-6 text-center mb-6">
                  <p className="text-[#be123c] font-bold text-lg tracking-tight">
                    {result.currentFailedSubjects.length} {result.currentFailedSubjects.length === 1 ? 'subject' : 'subjects'} yet to pass
                  </p>
                </div>
              ) : (
                <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl py-4 px-6 text-center mb-6">
                  <p className="text-[#15803d] font-bold text-lg tracking-tight">Passed Successfully!</p>
                </div>
              )}

              {/* Semester Results List */}
              <div className="space-y-4">
                {result.semesterResults.map((sem, idx) => (
                  <SemesterCard key={idx} semester={sem} />
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

function SemesterCard({ semester }: { semester: SemesterResult }) {
  // Logic: If republished GPA is same as original, show original date
  const displayResult = (() => {
    if (semester.results.length <= 1) return semester.results[0];
    const latest = semester.results[0];
    const original = semester.results.find(r => !r.republished);
    if (original) {
      if (semester.status === 'passed' && latest.gpa === original.gpa) return original;
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
    <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm overflow-hidden">
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
                className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 relative"
              >
                {/* Side Indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${sub.passed ? 'bg-[#4ade80]' : 'bg-[#f87171]'}`} />
                
                <div className="flex items-center gap-3 pl-2">
                  <span className="text-[#64748b] font-medium text-base w-12">{sub.subCode}</span>
                  <div className={`px-3 py-1.5 rounded-xl ${
                    sub.passed ? 'bg-[#f0fdf4] text-[#166534]' : 'bg-[#fff1f2] text-[#991b1b]'
                  }`}>
                    <span className="font-bold text-[15px]">{sub.subName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sub.originSemester !== semester.semester && (
                    <span className="bg-[#f1f5f9] text-[#64748b] px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
                      {getOrdinal(sub.originSemester)}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border shadow-sm ${
                    sub.type === 'T' 
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                      : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100'
                  }`}>
                    {sub.type === 'T' ? 'Theory' : 'Practical'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl py-6 flex flex-col items-center justify-center">
             <div className="flex items-center gap-3">
               <span className="text-gray-500 font-medium text-[18px] tracking-wide">GPA</span>
               <span className="text-[#22c55e] text-[40px] font-bold tracking-tight leading-none">{displayResult.gpa?.toFixed(2)}</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
