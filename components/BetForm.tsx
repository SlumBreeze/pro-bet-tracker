
import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Calculator, DollarSign, Camera, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { GoogleGenAI, Type, SchemaShared } from "@google/genai";
import { Sportsbook, BetStatus } from '../types';
import { calculatePotentialProfit, formatCurrency } from '../utils/calculations';
import { SPORTSBOOKS, SPORTS } from '../constants';

interface BetFormProps {
  onAddBet: (betData: any) => void;
}

export const BetForm: React.FC<BetFormProps> = ({ onAddBet }) => {
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
    });

    // Reset fields except date/sportsbook/sport which might remain constant for session
    setMatchup('');
    setPick('');
    setWager('');
    setCalculatedPayout(0);
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
            description: "The two teams or players competing (e.g., 'Lakers vs Celtics')." 
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
            description: "The specific bet selection (e.g., 'Chiefs -3.5', 'Over 48.5', 'LeBron James Over 25.5 Pts')." 
          },
          odds: { 
            type: Type.NUMBER, 
            description: "The American odds as an integer (e.g., -110, 150)." 
          },
          wager: { 
            type: Type.NUMBER, 
            description: "The wager amount in dollars (numeric only)." 
          }
        },
        required: ["matchup", "pick", "odds", "wager", "sportsbook", "sport"]
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
            text: "Analyze this sports betting slip. Extract the details to populate a bet tracking form. Be precise with the numbers."
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
        if (result.wager) setWager(result.wager);
        if (result.date) setDate(result.date);
        
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
      className={`bg-slate-900 border rounded-xl p-6 shadow-sm relative overflow-hidden transition-all duration-200 ${
        isDragging 
          ? 'border-emerald-500 border-dashed bg-emerald-500/5' 
          : 'border-slate-800'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-200">
           <div className="relative">
             <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
             <Loader2 size={48} className="text-emerald-400 animate-spin relative z-10" />
           </div>
           <h3 className="text-white font-bold text-lg mt-4">Scanning Slip...</h3>
           <p className="text-slate-400 text-sm mt-1">Extracting odds, matchup, and wager details.</p>
        </div>
      )}

      {/* Dragging Overlay */}
      {isDragging && !isAnalyzing && (
        <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-center p-6 border-2 border-emerald-500 border-dashed rounded-xl pointer-events-none">
           <div className="p-4 bg-emerald-500/20 rounded-full mb-3 text-emerald-400 animate-bounce">
             <UploadCloud size={32} />
           </div>
           <h3 className="text-emerald-400 font-bold text-xl">Drop Slip Here</h3>
           <p className="text-emerald-200/70 text-sm">Release to auto-scan your bet</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-emerald-400">
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all text-sm font-medium"
          >
            {isAnalyzing ? <Sparkles size={16} className="animate-pulse" /> : <Camera size={16} />}
            <span>Scan Slip</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-white"
            />
          </div>

          {/* Sport / League */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">League</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-white appearance-none"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sportsbook */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-400 uppercase">Sportsbook</label>
            <select
              value={sportsbook}
              onChange={(e) => setSportsbook(e.target.value as Sportsbook)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-white appearance-none"
            >
              {SPORTSBOOKS.map((sb) => (
                <option key={sb} value={sb}>{sb}</option>
              ))}
            </select>
          </div>

          {/* Matchup */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-400 uppercase">Matchup</label>
            <input
              type="text"
              required
              placeholder="e.g. Chiefs vs Bills"
              value={matchup}
              onChange={(e) => setMatchup(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-white placeholder-slate-600"
            />
          </div>

          {/* Pick */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-400 uppercase">Pick (Side/Total/Prop)</label>
            <input
              type="text"
              required
              placeholder="e.g. Chiefs -3.5 or Kelce Anytime TD"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-white placeholder-slate-600"
            />
          </div>

          {/* Odds */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Odds (American)</label>
            <div className="relative">
              <input
                type="number"
                required
                placeholder="-110"
                value={odds}
                onChange={(e) => setOdds(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-white placeholder-slate-600 pl-10"
              />
              <span className="absolute left-3 top-2.5 text-slate-500">#</span>
            </div>
          </div>

          {/* Wager */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Wager Amount</label>
            <div className="relative">
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={wager}
                onChange={(e) => setWager(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-white placeholder-slate-600 pl-10"
              />
              <DollarSign size={16} className="absolute left-3 top-2.5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Live Calculation */}
        <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-md text-emerald-400">
              <Calculator size={18} />
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold">Potential Payout</p>
              <p className="text-slate-500 text-xs">Based on current odds</p>
            </div>
          </div>
          <div className="text-right">
             <span className="text-xl font-bold text-white tracking-tight">
               {formatCurrency(Number(wager || 0) + calculatedPayout)}
             </span>
             <p className="text-xs text-emerald-400 font-medium">
               +{formatCurrency(calculatedPayout)} Profit
             </p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
        >
          Add Bet to Tracker
        </button>
      </form>
    </div>
  );
};
