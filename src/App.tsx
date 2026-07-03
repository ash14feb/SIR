/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent } from 'react';
import { Search, Loader2, Users, AlertCircle, ExternalLink, Globe, LayoutGrid } from 'lucide-react';

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
  const [selectedAc, setSelectedAc] = useState('A117');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [lastSearch, setLastSearch] = useState('abdul bas');
  const [activeTab, setActiveTab] = useState<'grid' | 'iframe'>('grid');

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/search?name=${encodeURIComponent(searchName)}&ac=${encodeURIComponent(selectedAc)}`);
      const result: SearchResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch results');
      }
      
      setData(result);
      setLastSearch(searchName);
    } catch (err: any) {
      setError(err.message || 'An error occurred during search.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const iframeUrl = `https://ceo.karnataka.gov.in/search/en?district=MYSORE&ac=${encodeURIComponent(selectedAc)}&search=${encodeURIComponent(lastSearch || 'abdul bas')}`;
  const selectedAcLabel = constituencies.find(c => c.value === selectedAc)?.label || 'Chamundeshwari (A117)';

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Header Section */}
      <header className="flex-none px-8 pt-8 pb-4 bg-white border-b border-slate-200">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">SIR Record Lookup</h1>
            <p className="text-sm text-slate-500 mt-1">Electoral Search & Information Repository</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative">
              <select
                value={selectedAc}
                onChange={(e) => setSelectedAc(e.target.value)}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 cursor-pointer"
              >
                {constituencies.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter name to search (e.g. abdul bas)"
                className="w-96 px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchName.trim()}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[140px]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search Records'}
            </button>
          </form>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-4">
            <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded text-xs font-medium text-blue-700">District: MYSORE</div>
            <div className="px-3 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-600">
              AC: {selectedAcLabel.toUpperCase()}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid Database View
            </button>
            <button
              onClick={() => setActiveTab('iframe')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'iframe'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Official Live Portal
            </button>
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
                  ) : data?.results && data.results.length > 0 ? (
                    <>
                      {data.results.map((row, rowIdx) => (
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
                  ) : data?.results && data.results.length === 0 ? (
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
