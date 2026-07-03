/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent } from 'react';
import { Search, Loader2, Users, AlertCircle, ExternalLink, Globe, LayoutGrid, Languages } from 'lucide-react';

interface SearchResponse {
  headers: string[];
  results: Record<string, string>[];
  error?: string;
}

const constituencies = [
  { value: 'A112', label: 'Bannur (A112)' },
  { value: 'A113', label: 'T. Narasipur (A113)' },
  { value: 'A114', label: 'Krishnaraja (A114)' },
  { value: 'A115', label: 'Chamaraja (A115)' },
  { value: 'A116', label: 'Narasimharaja (A116)' },
  { value: 'A117', label: 'Chamundeshwari (A117)' },
  { value: 'A118', label: 'Nanjangud (A118)' },
  { value: 'A122', label: 'Heggadadevankote (A122)' },
  { value: 'A123', label: 'Hunsur (A123)' },
  { value: 'A124', label: 'Krishnarajanagara (A124)' },
  { value: 'A125', label: 'Periyapatna (A125)' },
];

export default function App() {
  const [searchName, setSearchName] = useState('');
  const [kannadaSearchName, setKannadaSearchName] = useState('');
  const [selectedAc, setSelectedAc] = useState('A117');
  const [loading, setLoading] = useState(false);
  const [transliterating, setTransliterating] = useState(false);
  const [searchMode, setSearchMode] = useState<'en' | 'ka'>('en');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [lastSearch, setLastSearch] = useState('abdul bas');
  const [lastSearchMode, setLastSearchMode] = useState<'en' | 'ka'>('en');
  const [activeTab, setActiveTab] = useState<'grid' | 'iframe'>('grid');

  // Translation States for Kannada to English Grid view
  const [translatedResults, setTranslatedResults] = useState<Record<string, string>[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(false);

  const handleTransliterate = async () => {
    if (!searchName.trim()) return;
    setTransliterating(true);
    try {
      const response = await fetch(`/api/transliterate?text=${encodeURIComponent(searchName)}`);
      const result = await response.json();
      if (result.result) {
        setKannadaSearchName(result.result);
        setSearchMode('ka'); // Auto switch focus/active search mode to Kannada
      }
    } catch (err: any) {
      console.error('Transliteration failed', err);
    } finally {
      setTransliterating(false);
    }
  };

  const translateGridToEnglish = async () => {
    if (!data?.results || data.results.length === 0) return;
    
    if (translatedResults) {
      setTranslationEnabled(!translationEnabled);
      return;
    }

    setIsTranslating(true);
    try {
      const kannadaRegex = /[\u0C80-\u0CFF]/;
      const uniqueKannadaTexts = new Set<string>();

      data.results.forEach(row => {
        Object.values(row).forEach(val => {
          if (val && typeof val === 'string' && kannadaRegex.test(val)) {
            uniqueKannadaTexts.add(val.trim());
          }
        });
      });

      data.headers.forEach(header => {
        if (header && kannadaRegex.test(header)) {
          uniqueKannadaTexts.add(header.trim());
        }
      });

      const translationMap: Record<string, string> = {};
      const uniqueList = Array.from(uniqueKannadaTexts);
      
      const batchSize = 5;
      for (let i = 0; i < uniqueList.length; i += batchSize) {
        const batch = uniqueList.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (text) => {
            try {
              const res = await fetch(`/api/translate?text=${encodeURIComponent(text)}`);
              const json = await res.json();
              if (json.result) {
                translationMap[text] = json.result;
              } else {
                translationMap[text] = text;
              }
            } catch (err) {
              console.error(`Error translating: ${text}`, err);
              translationMap[text] = text;
            }
          })
        );
      }

      const newResults = data.results.map(row => {
        const newRow: Record<string, string> = {};
        Object.entries(row).forEach(([key, val]) => {
          if (typeof val === 'string') {
            const trimmed = val.trim();
            if (translationMap[trimmed]) {
              newRow[key] = val.replace(trimmed, translationMap[trimmed]);
            } else {
              let newVal = val;
              uniqueList.forEach(kText => {
                if (val.includes(kText) && translationMap[kText]) {
                  newVal = newVal.replace(kText, translationMap[kText]);
                }
              });
              newRow[key] = newVal;
            }
          } else {
            newRow[key] = val !== undefined && val !== null ? String(val) : '';
          }
        });
        return newRow;
      });

      setTranslatedResults(newResults);
      setTranslationEnabled(true);
    } catch (err: any) {
      console.error('Grid translation failed', err);
      setError('Failed to translate Kannada results to English.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const activeQuery = searchMode === 'en' ? searchName : kannadaSearchName;
    if (!activeQuery.trim()) return;

    setLoading(true);
    setError('');
    setTranslatedResults(null);
    setTranslationEnabled(false);
    
    try {
      const response = await fetch(`/api/search?name=${encodeURIComponent(activeQuery)}&ac=${encodeURIComponent(selectedAc)}&lang=${searchMode}`);
      const result: SearchResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch results');
      }
      
      setData(result);
      setLastSearch(activeQuery);
      setLastSearchMode(searchMode);
    } catch (err: any) {
      setError(err.message || 'An error occurred during search.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const iframeDistrict = lastSearchMode === 'ka' ? 'ಮೈಸೂರು' : 'MYSORE';
  const iframeUrl = `https://ceo.karnataka.gov.in/search/${lastSearchMode}?district=${encodeURIComponent(iframeDistrict)}&ac=${encodeURIComponent(selectedAc)}&search=${encodeURIComponent(lastSearch)}`;
  const selectedAcLabel = constituencies.find(c => c.value === selectedAc)?.label || 'Chamundeshwari (A117)';

  const activeResults = translationEnabled && translatedResults ? translatedResults : data?.results;

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Header Section */}
      <header className="flex-none px-8 pt-6 pb-4 bg-white border-b border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <Search className="w-6 h-6 text-blue-600" />
              SIR Record Lookup
            </h1>
            <p className="text-xs text-slate-500 mt-1">Electoral Search & Information Repository (Karnataka CEO)</p>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-500" />
              Grid Database View
            </button>
            <button
              onClick={() => setActiveTab('iframe')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'iframe'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              Official Live Portal
            </button>
          </div>
        </div>

        {/* Enhanced Multi-Language Search Form */}
        <form onSubmit={handleSearch} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Assembly Constituency Selector */}
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assembly Constituency</label>
              <select
                value={selectedAc}
                onChange={(e) => setSelectedAc(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-700 cursor-pointer transition-all"
              >
                {constituencies.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* English Search Input */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>English Name Search</span>
                {searchMode === 'en' && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 rounded-full font-bold">Active</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter english name (e.g. abdul bas)"
                  className={`w-full pl-3 pr-8 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    searchMode === 'en' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-300'
                  }`}
                  value={searchName}
                  onChange={(e) => {
                    setSearchName(e.target.value);
                    setSearchMode('en');
                  }}
                  disabled={loading}
                />
                {searchName && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchName('');
                      setSearchMode('en');
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Transliteration "Convert" Button */}
            <div className="md:col-span-1 flex flex-col justify-center items-center pb-0.5">
              <button
                type="button"
                onClick={handleTransliterate}
                disabled={transliterating || !searchName.trim()}
                title="Transliterate English spelling phonetically to Kannada"
                className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 active:bg-blue-200 disabled:opacity-40 disabled:hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-[10px] font-bold gap-0.5"
              >
                {transliterating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : (
                  <>
                    <span className="text-sm font-bold">➔</span>
                    <span>ಕನ್ನಡ</span>
                  </>
                )}
              </button>
            </div>

            {/* Kannada Search Input */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Kannada Name Search (ಕನ್ನಡ)</span>
                {searchMode === 'ka' && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 rounded-full font-bold">Active</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Kannada name (ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ)"
                  className={`w-full pl-3 pr-8 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    searchMode === 'ka' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-300'
                  }`}
                  value={kannadaSearchName}
                  onChange={(e) => {
                    setKannadaSearchName(e.target.value);
                    setSearchMode('ka');
                  }}
                  disabled={loading}
                />
                {kannadaSearchName && (
                  <button
                    type="button"
                    onClick={() => {
                      setKannadaSearchName('');
                      setSearchMode('ka');
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Action Trigger Row */}
          <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Active Search Language:</span>
              <div className="flex rounded-md bg-slate-200/60 p-0.5 border border-slate-300/40">
                <button
                  type="button"
                  onClick={() => setSearchMode('en')}
                  className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all ${
                    searchMode === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  English (EN)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('ka')}
                  className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all ${
                    searchMode === 'ka' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-800'
                  }`}
                >
                  ಕನ್ನಡ (KA)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (searchMode === 'en' ? !searchName.trim() : !kannadaSearchName.trim())}
              className={`px-6 py-2 rounded-lg text-sm font-semibold text-white shadow-xs flex items-center justify-center gap-2 min-w-[170px] transition-all cursor-pointer ${
                searchMode === 'en' 
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' 
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              } disabled:opacity-50`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  {searchMode === 'en' ? 'Search English' : 'ಕನ್ನಡದಲ್ಲಿ ಹುಡುಕಿ'}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="flex justify-between items-center mt-4 shrink-0">
          <div className="flex gap-4">
            <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded text-xs font-medium text-blue-700">
              District: {lastSearchMode === 'ka' ? 'ಮೈಸೂರು' : 'MYSORE'}
            </div>
            <div className="px-3 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-600">
              AC: {selectedAcLabel.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-8 overflow-hidden flex flex-col">
        {error && activeTab === 'grid' && (
          <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {activeTab === 'grid' ? (
          /* Grid View Content */
          <div className="flex-grow bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            {lastSearchMode === 'ka' && data?.results && data.results.length > 0 && (
              <div className="flex-none flex justify-between items-center px-6 py-3 bg-emerald-50/60 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    Kannada Search Results ({data.results.length} rows)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={translateGridToEnglish}
                  disabled={isTranslating}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    translationEnabled
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                  }`}
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Translating...
                    </>
                  ) : translationEnabled ? (
                    <>
                      <Languages className="w-3.5 h-3.5" />
                      Show original Kannada
                    </>
                  ) : (
                    <>
                      <Languages className="w-3.5 h-3.5 animate-bounce" />
                      Translate to English
                    </>
                  )}
                </button>
              </div>
            )}
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    {data?.headers ? data.headers.map((header, idx) => (
                      <th key={idx} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                        {header}
                      </th>
                    )) : (
                      <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                        Results will appear here
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={data?.headers?.length || 1} className="px-4 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
                        <p className="text-sm text-slate-500 mt-2">Searching records...</p>
                      </td>
                    </tr>
                  ) : activeResults && activeResults.length > 0 ? (
                    <>
                      {activeResults.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50 transition-colors">
                          {data.headers.map((header, colIdx) => (
                            <td key={colIdx} className="px-4 py-4 text-xs font-medium text-slate-700">
                              {header.toLowerCase() === 'gender' ? (
                                 <span className={`px-2 py-1 rounded text-[10px] font-bold ${row[header]?.toUpperCase() === 'MALE' ? 'bg-blue-50 text-blue-600' : row[header]?.toUpperCase() === 'FEMALE' ? 'bg-pink-50 text-pink-600' : 'bg-slate-100 text-slate-600'}`}>
                                   {row[header] || '-'}
                                 </span>
                               ) : header.toLowerCase() === 'epic number' && (!row[header] || row[header].trim() === '') ? (
                                 <span className="font-mono text-slate-400 italic">N/A</span>
                               ) : header.toLowerCase() === 'first name' ? (
                                 <span className="font-bold text-slate-900">{row[header] || '-'}</span>
                               ) : header.toLowerCase() === 'relation type' ? (
                                 <span className="text-slate-500 italic">{row[header] || '-'}</span>
                               ) : (
                                 row[header] || '-'
                               )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="opacity-30 bg-slate-50">
                        <td colSpan={data.headers.length} className="px-4 py-8 text-center text-[10px] uppercase tracking-widest">
                          End of results for current search
                        </td>
                      </tr>
                    </>
                  ) : activeResults && activeResults.length === 0 ? (
                    <tr>
                      <td colSpan={data?.headers?.length || 1} className="px-4 py-12 text-center">
                        <Users className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-medium text-slate-500 mt-2">No records found</p>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={1} className="px-4 py-12 text-center">
                        <p className="text-sm text-slate-400">Enter a name above and click search</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Live iFrame Content */
          <div className="flex-grow flex flex-col gap-4">
            <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg text-xs text-amber-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-600" />
                <span>
                  Showing live official lookup for: <strong className="font-bold">"{lastSearch}"</strong>. If the frame below remains blank due to government security headers, use the link on the right.
                </span>
              </div>
              <a
                href={iframeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 transition-colors"
              >
                Open in New Tab
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex-grow bg-white border border-slate-200 rounded-xl overflow-hidden relative shadow-sm">
              <iframe
                src={iframeUrl}
                title="Karnataka CEO Search"
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="flex-none px-8 py-4 bg-white border-t border-slate-200 flex justify-between items-center">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
          {activeTab === 'grid' && data?.results 
            ? `Showing ${data.results.length} entries found for "${lastSearch}"` 
            : activeTab === 'iframe' 
            ? `Syncing Official Portal with search name "${lastSearch}"`
            : 'Ready to search'}
        </p>
        <div className="flex gap-4">
          <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-50" disabled={!data?.results?.length}>Export CSV</button>
          <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-50" disabled={!data?.results?.length}>Print View</button>
        </div>
      </footer>
    </div>
  );
}
