import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Calculator, DollarSign, Camera, Loader2, Sparkles, UploadCloud, Settings2, Wand2, Tag } from 'lucide-react';
import { GoogleGenAI, Type, SchemaShared } from "@google/genai";
import { Sportsbook, BetStatus } from '../types';
import { calculatePotentialProfit, formatCurrency } from '../utils/calculations';
import { SPORTSBOOKS, SPORTS } from '../constants';

interface BetFormProps {
  onAddBet: (betData: any) => void;
  currentBalance: number;
}

const COMMON_TAGS = ['Live', 'Parlay', 'Boost', 'Prop'];

export const BetForm: React.FC<BetFormProps> = ({ onAddBet, currentBalance }) => {
  // Initialize with local date string instead of ISO/UTC
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getTodayString());
  const [matchup, setMatchup] = useState('');
  const [sport, setSport] = useState('NFL');
  const [sportsbook, setSportsbook] = useState<Sportsbook>(Sportsbook.DRAFTKINGS);
  const [pick, setPick] = useState('');
  const [odds, setOdds] = useState<number | ''>(-110);
  const [wager, setWager] = useState<number | ''>('');
  const [calculatedPayout, setCalculatedPayout] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  
  // Wager Strategy State
  const [wagerPct, setWagerPct] = useState(15);
  const [showStrategy, setShowStrategy] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wager && odds) {
      const profit = calculatePotentialProfit(Number(wager), Number(odds));
      setCalculatedPayout(profit);
    } else {
      setCalculatedPayout(0);
    }
  }, [wager, odds]);

  const calculateRecommendedWager = () => {
    // Basic calculation: Percentage of current bankroll
    // Ensure we don't suggest 0 or negative
    const base = Math.max(currentBalance, 0);
    const amount = base * (wagerPct / 100);
    return Math.floor(amount * 100) / 100; // Round down to 2 decimals
  };

  const applyRecommendedWager = () => {
    const amount = calculateRecommendedWager();
    setWager(amount);
  };

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wager || !odds || !matchup || !pick) return;

    onAddBet({
      date,
      matchup,
      sport,
      sportsbook,
      pick,
      odds: Number(odds),
      wager: Number(wager),
      potentialProfit: calculatedPayout,
      status: BetStatus.PENDING,
      tags,
    });

    // Reset fields except date/sportsbook/sport which might remain constant for session
    setMatchup('');
    setPick('');
    setWager('');
    setCalculatedPayout(0);
    setTags([]);
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setIsAnalyzing(true);

    try {
      // 1. Convert image to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 3. Define the response schema to match our form fields
      const schema: SchemaShared = {
        type: Type.OBJECT,
        properties: {
          date: { 
            type: Type.STRING, 
            description: "Date of the event in YYYY-MM-DD format. If not explicitly found, use today's date." 
          },
          matchup: { 
            type: Type.STRING, 
            description: "The two teams or players competing (e.g., 'Lakers vs Celtics'). For DFS/Prop slips, list the primary sport or 'Multi-Sport' if mixed." 
          },
          sport: {
            type: Type.STRING,
            enum: SPORTS,
            description: "The league or sport (e.g. NFL, NBA, MLB). Infer based on team names if not explicit."
          },
          sportsbook: { 
            type: Type.STRING, 
            enum: SPORTSBOOKS,
            description: "The name of the sportsbook based on logo or branding." 
          },
          pick: { 
            type: Type.STRING, 
            description: "The specific bet selection. For DFS slips with multiple players, combine them into a single string (e.g., 'J. Allen Over 250, S. Diggs Under 60')." 
          },
          odds: { 
            type: Type.NUMBER, 
            description: "The American odds as an integer (e.g., -110, 150). For DFS, if only Entry and Payout are shown, calculate the implied American odds." 
          },
          wager: { 
            type: Type.NUMBER, 
            description: "The wager or entry amount in dollars. Return 0 if not visible." 
          }
        },
        required: ["matchup", "pick", "odds", "sportsbook", "sport"]
      };

      // 4. Call the model
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          {
            text: `Analyze this sports betting slip. Extract the details to populate a bet tracking form.
            
            Special Instructions for DFS/Prop Slips (PrizePicks, Underdog, etc):
            1. Concatenate all player selections into the 'pick' field (e.g. "J. Allen Over 250 Pass, S. Diggs Over 60 Rec").
            2. If odds are not explicitly shown (common in DFS), calculate implied American odds based on the Entry Amount and Total Payout.
               Formula: ((Payout - Entry) / Entry) * 100.
               - Example: Entry $10 to pay $30 (Profit $20) -> Odds are +200.
               - Example: Entry $10 to pay $18 (Profit $8) -> Odds are -125.
            3. Use the 'Entry' amount as the 'wager'.
            4. Detect the sportsbook from the logo (e.g., Purple logo = PrizePicks, Yellow = Underdog).`
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      // 5. Parse and apply results
      if (response.text) {
        const result = JSON.parse(response.text);
        
        if (result.matchup) setMatchup(result.matchup);
        if (result.pick) setPick(result.pick);
        if (result.odds) setOdds(result.odds);
        if (result.date) setDate(result.date);
        
        // Smart Wager: Use scanned wager OR recommended wager
        if (result.wager && result.wager > 0) {
          setWager(result.wager);
        } else {
          // If slip has no wager (just lines), auto-fill with strategy recommendation
          setWager(calculateRecommendedWager());
        }
        
        if (result.sport && SPORTS.includes(result.sport)) {
           setSport(result.sport);
        }

        // Find matching sportsbook or default to 'Other'
        if (result.sportsbook && SPORTSBOOKS.includes(result.sportsbook)) {
          setSportsbook(result.sportsbook as Sportsbook);
        } else {
          setSportsbook(Sportsbook.OTHER);
        }
      }

    } catch (error) {
      console.error("Scanning failed:", error);
      alert("Failed to analyze the image. Please try again or enter details manually.");
    } finally {
      setIsAnalyzing(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processFile(file);
      } else {
        alert("Please drop an image file.");
      }
    }
  };

  return (
    <div 
      className={`bg-ink-paper/50 backdrop-blur-sm border rounded-xl p-6 shadow-sm relative overflow-hidden transition-all duration-200 ${
        isDragging 
          ? 'border-ink-accent border-dashed bg-ink-accent/5' 
          : 'border-ink-gray'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-ink-paper/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-200">
           <div className="relative">
             <div className="absolute inset-0 bg-ink-accent blur-xl opacity-20 animate-pulse rounded-full"></div>
             <Loader2 size={48} className="text-ink-accent animate-spin relative z-10" />
           </div>
           <h3 className="text-ink-text font-bold text-lg mt-4">Scanning Slip...</h3>
           <p className="text-ink-text/60 text-sm mt-1">Extracting odds, matchup, and recommending wager.</p>
        </div>
      )}

      {/* Dragging Overlay */}
      {isDragging && !isAnalyzing && (
        <div className="absolute inset-0 bg-ink-accent/10 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-center p-6 border-2 border-ink-accent border-dashed rounded-xl pointer-events-none">
           <div className="p-4 bg-ink-accent/20 rounded-full mb-3 text-ink-accent animate-bounce">
             <UploadCloud size={32} />
           </div>
           <h3 className="text-ink-accent font-bold text-xl">Drop Slip Here</h3>
           <p className="text-ink-accent/70 text-sm">Release to auto-scan your bet</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-ink-accent">
          <PlusCircle size={20} />
          <h2 className="font-semibold text-lg tracking-tight">Log New Bet</h2>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <button 
            type="button"
            onClick={handleScanClick}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-accent/10 text-ink-accent border border-ink-accent/20 hover:bg-ink-accent/20 transition-all text-sm font-medium"
          >
            {isAnalyzing ? <Sparkles size={16} className="animate-pulse" /> : <Camera size={16} />}
            <span>Scan Slip</span>
          </button>
        </div>
      </div>
      
      {/* Wager Strategy Toggle */}
      <div className="mb-5 bg-ink-base/50 rounded-lg border border-ink-gray overflow-hidden">
        <button 
          type="button"
          onClick={() => setShowStrategy(!showStrategy)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-ink-text/60 hover:bg-black/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={14} />
            WAGER STRATEGY
          </div>
          <span className="text-ink-accent">{wagerPct}% Daily Bankroll</span>
        </button>
        
        {showStrategy && (
           <div className="px-4 py-4 border-t border-ink-gray bg-white space-y-3 animate-in slide-in-from-top duration-200">
             <div className="flex justify-between text-xs text-ink-text/40 mb-1">
               <span>Conservative (1%)</span>
               <span className="text-ink-text font-bold">{wagerPct}%</span>
               <span>Aggressive (25%)</span>
             </div>
             <input 
               type="range" 
               min="1" 
               max="25" 
               step="0.5"
               value={wagerPct}
               onChange={(e) => setWagerPct(parseFloat(e.target.value))}
               className="w-full accent-ink-accent h-1.5 bg-ink-gray/50 rounded-lg appearance-none cursor-pointer"
             />
             <p className="text-[10px] text-ink-text/60">
               Auto-calculates wager based on {wagerPct}% of your current bankroll ({formatCurrency(currentBalance)}).
               This value will be auto-filled if you scan a slip without a wager amount.
             </p>
           </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-text/60 uppercase">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-ink-gray rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ink-accent/50 focus:border-ink-accent outline-none transition-all text-ink-text"
            />
          </div>

          {/* Sport / League */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-text/60 uppercase">League</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full bg-white border border-ink-gray rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ink-accent/50 focus:border-ink-accent outline-none transition-all text-ink-text appearance-none"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sportsbook */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-ink-text/60 uppercase">Sportsbook</label>
            <select
              value={sportsbook}
              onChange={(e) => setSportsbook(e.target.value as Sportsbook)}
              className="w-full bg-white border border-ink-gray rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ink-accent/50 focus:border-ink-accent outline-none transition-all text-ink-text appearance-none"
            >
              {SPORTSBOOKS.map((sb) => (
                <option key={sb} value={sb}>{sb}</option>
              ))}
            </select>
          </div>

          {/* Matchup */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-ink-text/60 uppercase">Matchup</label>
            <input
              type="text"
              required
              placeholder="e.g. Chiefs vs Bills"
              value={matchup}
              onChange={(e) => setMatchup(e.target.value)}
              className="w-full bg-white border border-ink-gray rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ink-accent/50 focus:border-ink-accent outline-none transition-all text-ink-text placeholder-ink-text/30"
            />
          </div>

          {/* Pick */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-ink-text/60 uppercase">Pick (Side/Total/Prop)</label>
            <input
              type="text"
              required
              placeholder="e.g. Chiefs -3.5 or Kelce Anytime TD"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="w-full bg-white border border-ink-gray rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ink-accent/50 focus:border-ink-accent outline-none transition-all text-ink-text placeholder-ink-text/30"
            />
          </div>

           {/* Tags */}
           <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-ink-text/60 uppercase flex items-center gap-1"><Tag size={12}/> Tags</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        tags.includes(tag) 
                        ? 'bg-ink-accent text-white border-ink-accent shadow-sm' 
                        : 'bg-white text-ink-text/60 border-ink-gray hover:border-ink-accent/50 hover:text-ink-text'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
          </div>

          {/* Odds */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-text/60 uppercase">Odds (American)</label>
            <div className="relative">
              <input
                type="number"
                required
                placeholder="-110"
                value={odds}
                onChange={(e) => setOdds(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full bg-white border border-ink-gray rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ink-accent/50 focus:border-ink-accent outline-none transition-all text-ink-text placeholder-ink-text/30 pl-10"
              />
              <span className="absolute left-3 top-2.5 text-ink-text/40">#</span>
            </div>
          </div>

          {/* Wager */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-text/60 uppercase flex items-center justify-between">
              Wager Amount
              <button 
                 type="button" 
                 onClick={applyRecommendedWager}
                 className="text-[10px] text-ink-accent hover:text-ink-text flex items-center gap-1 bg-ink-accent/10 px-1.5 py-0.5 rounded border border-ink-accent/20"
                 title={`Auto-fill ${wagerPct}% of bankroll`}
              >
                <Wand2 size={10} /> Rec: {formatCurrency(calculateRecommendedWager())}
              </button>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={wager}
                onChange={(e) => setWager(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-white border border-ink-gray rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ink-accent/50 focus:border-ink-accent outline-none transition-all text-ink-text placeholder-ink-text/30 pl-10"
              />
              <DollarSign size={16} className="absolute left-3 top-2.5 text-ink-accent" />
            </div>
          </div>
        </div>

        {/* Live Calculation */}
        <div className="mt-6 p-4 bg-ink-base/50 rounded-lg border border-ink-gray flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border border-ink-gray rounded-md text-ink-accent">
              <Calculator size={18} />
            </div>
            <div>
              <p className="text-ink-text/60 text-xs uppercase font-bold">Potential Payout</p>
              <p className="text-ink-text/40 text-xs">Based on current odds</p>
            </div>
          </div>
          <div className="text-right">
             <span className="text-xl font-bold text-ink-text tracking-tight">
               {formatCurrency(Number(wager || 0) + calculatedPayout)}
             </span>
             <p className="text-xs text-status-win font-medium">
               +{formatCurrency(calculatedPayout)} Profit
             </p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-ink-accent hover:bg-ink-accent/90 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-gray-200"
        >
          Add Bet to Tracker
        </button>
      </form>
    </div>
  );
};