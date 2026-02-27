import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  LayoutDashboard, 
  Settings2, 
  Activity, 
  Smartphone, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  ExternalLink,
  Building2,
  Search,
  Filter
} from 'lucide-react';

// --- Types ---
type PartnerMaster = {
  Partner_ID: string;
  Partner_Name: string;
  Bank_Code: string;
  Category: string;
  Status: string;
};

type CardUIConfig = {
  Config_ID: string;
  Partner_ID: string;
  Card_Title: string;
  Card_Subtitle: string;
  Logo_URL: string;
  Badge_Text: string;
  Bg_Color: string;
  Text_Color: string;
  Benefit_1: string;
  Benefit_2: string;
  Benefit_3: string;
  CTA_Label_Card: string;
};

type ProductDetailConfig = {
  Config_ID: string;
  Hero_Banner_URL: string;
  TnC_Content: string;
  Step_1_Desc: string;
  Step_2_Desc: string;
  CTA_Action_Type: string;
  Final_Target_URL: string;
};

type DisplayRules = {
  Rule_ID: string;
  Config_ID: string;
  User_Segment: string;
  Min_Age: string;
  Location: string;
  Priority: string;
};

type ParsedData = {
  partnerMaster: PartnerMaster[];
  cardUIConfig: CardUIConfig[];
  productDetailConfig: ProductDetailConfig[];
  displayRules: DisplayRules[];
};

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRu49yPLpD0mYpHNBG8LOG3q-HuHyqoBT4T8Xyy2kKpX48z58eS4ZMIwOFYZW8rgBjO5-8Xg4yjkyUb/pub?output=csv';

export default function App() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // App State
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [userSegment, setUserSegment] = useState<string>('All');
  
  // Mobile Preview State
  const [mobileScreen, setMobileScreen] = useState<'listing' | 'detail' | 'steps'>('listing');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error('Failed to fetch CSV data');
        const csvText = await response.text();

        // Vertical CSV Splitting Logic
        // The CSV contains multiple tables stacked vertically.
        // We parse the entire text as a 2D array, then iterate through rows.
        // When we detect a header row (e.g., starts with 'Partner_ID' and contains 'Partner_Name'),
        // we switch our 'currentTable' context and start pushing subsequent rows into the respective array.
        const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: false });
        const rows = parsed.data;

        const partnerMaster: any[] = [];
        const cardUIConfig: any[] = [];
        const productDetailConfig: any[] = [];
        const displayRules: any[] = [];

        let currentTable: string | null = null;
        let currentHeaders: string[] = [];

        for (const row of rows) {
          // Skip empty rows and reset current table context
          if (row.length === 0 || row.every(cell => !cell || !cell.trim())) {
            currentTable = null;
            continue;
          }

          const firstCell = row[0]?.trim();

          // Detect Table Headers
          if (firstCell === 'Partner_ID' && row.includes('Partner_Name')) {
            currentTable = 'Partner_Master';
            currentHeaders = row.map(h => h.trim());
            continue;
          } else if (firstCell === 'Config_ID' && row.includes('Card_Title')) {
            currentTable = 'Card_UI_Config';
            currentHeaders = row.map(h => h.trim());
            continue;
          } else if (firstCell === 'Config_ID' && row.includes('Hero_Banner_URL')) {
            currentTable = 'Product_Detail_Config';
            currentHeaders = row.map(h => h.trim());
            continue;
          } else if (firstCell === 'Rule_ID' && row.includes('User_Segment')) {
            currentTable = 'Display_Rules';
            currentHeaders = row.map(h => h.trim());
            continue;
          }

          // Parse Data Rows
          if (currentTable) {
            const obj: any = {};
            currentHeaders.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] ? row[index].trim() : '';
              }
            });

            switch (currentTable) {
              case 'Partner_Master':
                partnerMaster.push(obj);
                break;
              case 'Card_UI_Config':
                cardUIConfig.push(obj);
                break;
              case 'Product_Detail_Config':
                productDetailConfig.push(obj);
                break;
              case 'Display_Rules':
                displayRules.push(obj);
                break;
            }
          }
        }

        setData({
          partnerMaster,
          cardUIConfig,
          productDetailConfig,
          displayRules
        });
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Derived Data for Dashboard ---
  const dashboardRows = useMemo(() => {
    if (!data) return [];
    return data.cardUIConfig.map(config => {
      const partner = data.partnerMaster.find(p => p.Partner_ID === config.Partner_ID);
      const rule = data.displayRules.find(r => r.Config_ID === config.Config_ID);
      return {
        ...config,
        Partner_Name: partner?.Partner_Name || 'Unknown',
        Status: partner?.Status || 'INACTIVE',
        Priority: rule?.Priority || '0',
        User_Segment: rule?.User_Segment || 'All'
      };
    });
  }, [data]);

  // --- Derived Data for Mobile Preview ---
  const mobileCards = useMemo(() => {
    if (!data) return [];
    
    // 1. Filter by Active Status in Partner Master
    const activePartners = new Set(
      data.partnerMaster.filter(p => p.Status.toUpperCase() === 'ACTIVE').map(p => p.Partner_ID)
    );

    let cards = data.cardUIConfig.filter(c => activePartners.has(c.Partner_ID));

    // 2. Filter by User Segment (Rule Matching)
    cards = cards.filter(c => {
      const rules = data.displayRules.filter(r => r.Config_ID === c.Config_ID);
      if (rules.length === 0) return true; // Show if no rules
      return rules.some(r => r.User_Segment === 'All' || r.User_Segment === userSegment);
    });

    // 3. Sort by Priority (High to Low)
    cards.sort((a, b) => {
      const ruleA = data.displayRules.find(r => r.Config_ID === a.Config_ID);
      const ruleB = data.displayRules.find(r => r.Config_ID === b.Config_ID);
      const prioA = parseInt(ruleA?.Priority || '0', 10);
      const prioB = parseInt(ruleB?.Priority || '0', 10);
      return prioB - prioA;
    });

    // If a specific config is selected for preview from the dashboard, put it at the top or filter to it
    // For this MVP, we'll just highlight it or ensure it's visible.

    return cards;
  }, [data, userSegment]);

  const handlePreviewClick = (configId: string) => {
    setSelectedConfigId(configId);
    setMobileScreen('listing');
    setActiveCardId(null);
  };

  const handleCardClick = (configId: string) => {
    setActiveCardId(configId);
    setMobileScreen('detail');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-red-600">
        Error loading configuration: {error}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* --- Left Sidebar --- */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            Z
          </div>
          <span className="text-xl font-bold text-slate-800">CSTool</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-md font-medium">
            <LayoutDashboard size={20} />
            OAO Hub
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md font-medium">
            <Settings2 size={20} />
            OAO Decision
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md font-medium">
            <Activity size={20} />
            Activity Log
          </a>
        </nav>
        <div className="p-4 border-t border-slate-200 text-sm text-slate-500">
          ZaloPay Internal Tool
        </div>
      </aside>

      {/* --- Main Area (Admin Dashboard) --- */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Affiliate Finance Cards</h1>
            <p className="text-slate-500 text-sm mt-1">Manage OAO Hub configurations and display rules.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setUserSegment('All')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${userSegment === 'All' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All Users
              </button>
              <button 
                onClick={() => setUserSegment('New User')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${userSegment === 'New User' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                New User
              </button>
              <button 
                onClick={() => setUserSegment('Existing User')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${userSegment === 'Existing User' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Existing User
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search configurations..." 
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Filter size={16} />
                Filter
              </button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 font-medium">Config ID</th>
                  <th className="px-6 py-4 font-medium">Partner Name</th>
                  <th className="px-6 py-4 font-medium">Card Title</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dashboardRows.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-50 transition-colors ${selectedConfigId === row.Config_ID ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {row.Config_ID}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-2">
                      <Building2 size={16} className="text-slate-400" />
                      {row.Partner_Name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.Card_Title}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
                        {row.Priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.Status.toUpperCase() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {row.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-3">
                      <button className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button 
                        onClick={() => handlePreviewClick(row.Config_ID)}
                        className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 inline-flex"
                      >
                        <Smartphone size={16} />
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
                {dashboardRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No configurations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- Preview Area (Mobile Phone Frame) --- */}
      <aside className="w-[400px] bg-slate-800 border-l border-slate-700 flex flex-col items-center justify-center p-8 relative shadow-2xl z-10">
        <div className="absolute top-4 left-4 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Live Preview
        </div>
        
        {/* Phone Frame */}
        <div className="w-[320px] h-[650px] bg-white rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-slate-900 relative flex flex-col">
          {/* Notch */}
          <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-3xl w-40 mx-auto z-50"></div>
          
          {/* Status Bar */}
          <div className="h-12 bg-white w-full flex justify-between items-end px-6 pb-2 text-[10px] font-medium text-slate-800 z-40">
            <span>9:41</span>
            <div className="flex gap-1.5 items-center">
              <div className="w-3 h-2.5 bg-slate-800 rounded-sm"></div>
              <div className="w-3 h-2.5 bg-slate-800 rounded-sm"></div>
              <div className="w-4 h-2.5 border border-slate-800 rounded-sm relative">
                <div className="absolute inset-0.5 bg-slate-800 rounded-sm"></div>
              </div>
            </div>
          </div>

          {/* Mobile Content Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50 relative pb-6 scrollbar-hide">
            
            {/* SCREEN 1: LISTING PAGE */}
            {mobileScreen === 'listing' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="px-5 py-4 bg-white sticky top-0 z-30 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Mở thẻ & Vay</h2>
                  <p className="text-xs text-slate-500">Ưu đãi dành riêng cho bạn</p>
                </div>
                
                <div className="p-4 space-y-4">
                  {mobileCards.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      Không có thẻ nào phù hợp với phân khúc này.
                    </div>
                  ) : (
                    mobileCards.map((card) => (
                      <div 
                        key={card.Config_ID}
                        onClick={() => handleCardClick(card.Config_ID)}
                        className={`relative rounded-2xl p-5 cursor-pointer transition-transform active:scale-95 shadow-sm border border-black/5 ${selectedConfigId === card.Config_ID ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        style={{ backgroundColor: card.Bg_Color || '#ffffff', color: card.Text_Color || '#1e293b' }}
                      >
                        {/* Badge */}
                        {card.Badge_Text && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-lg rounded-tr-xl shadow-sm">
                            {card.Badge_Text}
                          </div>
                        )}
                        
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            {card.Logo_URL ? (
                              <img src={card.Logo_URL} alt="logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                              <Building2 size={20} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm leading-tight">{card.Card_Title}</h3>
                            <p className="text-xs opacity-80 mt-0.5">{card.Card_Subtitle}</p>
                          </div>
                        </div>

                        <ul className="space-y-1.5 mb-4">
                          {[card.Benefit_1, card.Benefit_2, card.Benefit_3].filter(Boolean).map((benefit, i) => (
                            <li key={i} className="text-xs flex items-start gap-1.5 opacity-90">
                              <CheckCircle2 size={14} className="shrink-0 mt-0.5 opacity-70" />
                              <span className="leading-tight">{benefit}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="flex justify-end">
                          <button className="bg-white/20 hover:bg-white/30 text-current text-xs font-bold py-1.5 px-4 rounded-full backdrop-blur-sm transition-colors">
                            {card.CTA_Label_Card || 'Xem chi tiết'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 2: PRODUCT DETAIL */}
            {mobileScreen === 'detail' && activeCardId && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300 bg-white min-h-full flex flex-col">
                {(() => {
                  const card = data.cardUIConfig.find(c => c.Config_ID === activeCardId);
                  const detail = data.productDetailConfig.find(d => d.Config_ID === activeCardId);
                  
                  if (!card || !detail) return <div className="p-4 text-center text-sm">Config not found</div>;

                  return (
                    <>
                      {/* Header */}
                      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-slate-100">
                        <button onClick={() => setMobileScreen('listing')} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                          <ArrowLeft size={20} className="text-slate-700" />
                        </button>
                        <h2 className="font-bold text-slate-900 text-sm truncate">{card.Card_Title}</h2>
                      </div>

                      {/* Hero Banner */}
                      <div className="w-full h-40 bg-slate-100 relative">
                        {detail.Hero_Banner_URL ? (
                          <img src={detail.Hero_Banner_URL} alt="Hero" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-200" style={{ backgroundColor: card.Bg_Color }}>
                            <span className="text-sm font-medium" style={{ color: card.Text_Color }}>Hero Banner Placeholder</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex-1">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {card.Logo_URL ? (
                              <img src={card.Logo_URL} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 size={24} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h1 className="font-bold text-lg text-slate-900 leading-tight">{card.Card_Title}</h1>
                            <p className="text-sm text-slate-500">{card.Card_Subtitle}</p>
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3">Đặc quyền nổi bật</h3>
                          <ul className="space-y-2">
                            {[card.Benefit_1, card.Benefit_2, card.Benefit_3].filter(Boolean).map((benefit, i) => (
                              <li key={i} className="text-sm flex items-start gap-2 text-blue-800">
                                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-blue-500" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 mb-2">Điều khoản & Điều kiện</h3>
                          <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {detail.TnC_Content || 'Chưa có thông tin điều khoản.'}
                          </div>
                        </div>
                      </div>

                      {/* Sticky Bottom CTA */}
                      <div className="sticky bottom-0 p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <button 
                          onClick={() => setMobileScreen('steps')}
                          className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-transform active:scale-95 flex items-center justify-center gap-2"
                          style={{ backgroundColor: card.Bg_Color || '#2563eb' }}
                        >
                          {card.CTA_Label_Card || 'Đăng ký ngay'}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* SCREEN 3: DETAILED STEPS */}
            {mobileScreen === 'steps' && activeCardId && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300 bg-white min-h-full flex flex-col">
                {(() => {
                  const card = data.cardUIConfig.find(c => c.Config_ID === activeCardId);
                  const detail = data.productDetailConfig.find(d => d.Config_ID === activeCardId);
                  
                  if (!card || !detail) return null;

                  return (
                    <>
                      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-slate-100">
                        <button onClick={() => setMobileScreen('detail')} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                          <ArrowLeft size={20} className="text-slate-700" />
                        </button>
                        <h2 className="font-bold text-slate-900 text-sm">Hướng dẫn mở thẻ</h2>
                      </div>

                      <div className="p-6 flex-1">
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Smartphone size={28} className="text-blue-600" />
                          </div>
                          <h3 className="font-bold text-lg text-slate-900">Chỉ 2 bước đơn giản</h3>
                          <p className="text-sm text-slate-500 mt-1">Hoàn thành hồ sơ trong 5 phút</p>
                        </div>

                        <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                          <div className="relative pl-6">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white"></div>
                            <h4 className="font-bold text-sm text-slate-900 mb-1">Bước 1</h4>
                            <p className="text-sm text-slate-600">{detail.Step_1_Desc || 'Điền thông tin cá nhân cơ bản.'}</p>
                          </div>
                          
                          <div className="relative pl-6">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white"></div>
                            <h4 className="font-bold text-sm text-slate-900 mb-1">Bước 2</h4>
                            <p className="text-sm text-slate-600">{detail.Step_2_Desc || 'Xác thực khuôn mặt và hoàn tất.'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 mt-auto">
                        <button 
                          onClick={() => {
                            alert(`Action: ${detail.CTA_Action_Type}\nTarget URL: ${detail.Final_Target_URL}`);
                          }}
                          className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                        >
                          Tiếp tục sang đối tác
                          <ExternalLink size={16} />
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-3 px-4">
                          Bằng việc tiếp tục, bạn đồng ý chuyển sang trang web của đối tác để hoàn tất thủ tục.
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

          </div>
          
          {/* Home Indicator */}
          <div className="h-6 bg-white w-full flex items-center justify-center absolute bottom-0 z-40">
            <div className="w-1/3 h-1 bg-slate-900 rounded-full"></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
