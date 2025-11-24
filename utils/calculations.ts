
import { Bet, BetStatus, BankrollState, AdvancedStats } from '../types';

/**
 * Calculates the potential profit for a given wager and American odds.
 * Does not include the returned stake.
 */
export const calculatePotentialProfit = (wager: number, odds: number): number => {
  if (odds === 0) return 0;
  
  let profit = 0;
  if (odds > 0) {
    profit = wager * (odds / 100);
  } else {
    profit = wager * (100 / Math.abs(odds));
  }
  
  // Return rounded to 2 decimals
  return Math.round(profit * 100) / 100;
};

export const calculateBankrollStats = (startingBalance: number, bets: Bet[]): BankrollState => {
  let currentBalance = startingBalance;
  let totalWagered = 0;
  let totalWon = 0; // Net profit
  let totalLost = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;

  // Variables for Flat ROI (Unit ROI)
  let flatUnitsWon = 0;
  let flatBetsSettled = 0;

  bets.forEach((bet) => {
    // Only count settled bets towards W-L record
    if (bet.status !== BetStatus.PENDING) {
      if (bet.status === BetStatus.WON) {
        currentBalance += bet.potentialProfit;
        totalWon += bet.potentialProfit;
        totalWagered += bet.wager;
        wins++;

        // Flat ROI Logic: Assume 1 unit bet
        const unitProfit = bet.odds > 0 ? bet.odds / 100 : 100 / Math.abs(bet.odds);
        flatUnitsWon += unitProfit;
        flatBetsSettled++;

      } else if (bet.status === BetStatus.LOST) {
        currentBalance -= bet.wager;
        totalLost += bet.wager;
        totalWagered += bet.wager;
        losses++;

        // Flat ROI Logic: Lost 1 unit
        flatUnitsWon -= 1;
        flatBetsSettled++;

      } else if (bet.status === BetStatus.PUSH) {
        // Money back, no change in balance, but tracked
        totalWagered += bet.wager;
        pushes++;
        // Pushes are void for Flat ROI (0 units won, 0 units risked)
      }
    } else {
        // Pending bets: Deduct wager from available balance
        currentBalance -= bet.wager;
    }
  });

  const totalSettledBets = wins + losses + pushes;
  const netProfit = totalWon - totalLost;
  
  const settledWagered = bets
    .filter(b => b.status !== BetStatus.PENDING)
    .reduce((acc, b) => acc + b.wager, 0);

  const roi = settledWagered > 0 ? (netProfit / settledWagered) * 100 : 0;
  const flatROI = flatBetsSettled > 0 ? (flatUnitsWon / flatBetsSettled) * 100 : 0;

  return {
    startingBalance,
    currentBalance,
    totalWagered,
    totalWon,
    totalLost,
    totalBets: bets.length,
    wins,
    losses,
    pushes,
    roi,
    flatROI,
  };
};

export const calculateAdvancedStats = (bets: Bet[]): AdvancedStats => {
  const settledBets = bets
    .filter(b => b.status !== BetStatus.PENDING)
    .sort((a, b) => b.createdAt - a.createdAt); // Newest first

  // 1. Last 10 Results
  const last10 = settledBets.slice(0, 10).map(b => b.status);

  // 2. Current Streak
  let streak = 0;
  if (settledBets.length > 0) {
    const firstStatus = settledBets[0].status;
    if (firstStatus === BetStatus.WON || firstStatus === BetStatus.LOST) {
      for (const bet of settledBets) {
        if (bet.status === firstStatus) {
          streak += (firstStatus === BetStatus.WON ? 1 : -1);
        } else if (bet.status !== BetStatus.PUSH) {
          break; 
        }
      }
    }
  }

  // 3. Helper for Aggregation
  const aggByField = (field: 'sport' | 'sportsbook' | 'pick') => {
    const map: Record<string, { profit: number; wins: number; losses: number; pushes: number }> = {};

    settledBets.forEach(bet => {
      let key = '';
      if (field === 'pick') {
         // Attempt to extract team name from pick or matchup logic
         // Fallback to simple logic if needed, but inferSportFromBet does mostly sport
         key = bet.pick.split(' ').slice(0, 2).join(' ').replace(/[-+0-9.]/g, '').trim(); 
         if (key.length < 3) key = bet.pick; 
      } else {
        key = bet[field] || 'Unknown';
      }

      if (!map[key]) map[key] = { profit: 0, wins: 0, losses: 0, pushes: 0 };

      if (bet.status === BetStatus.WON) {
        map[key].profit += bet.potentialProfit;
        map[key].wins++;
      } else if (bet.status === BetStatus.LOST) {
        map[key].profit -= bet.wager;
        map[key].losses++;
      } else {
        map[key].pushes++;
      }
    });
    return map;
  };

  // 4. Sport Analysis
  const sportMap = aggByField('sport');
  const sportsArr = Object.entries(sportMap).map(([name, data]) => ({
    name,
    profit: data.profit,
    record: `${data.wins}-${data.losses}-${data.pushes}`
  })).sort((a, b) => b.profit - a.profit);

  const hottestSport = sportsArr.length > 0 && sportsArr[0].profit > 0 ? sportsArr[0] : null;
  const coldestSport = sportsArr.length > 0 && sportsArr[sportsArr.length - 1].profit < 0 
    ? sportsArr[sportsArr.length - 1] 
    : null;

  // 5. Book Performance
  const bookMap = aggByField('sportsbook');
  const bookPerformance = Object.entries(bookMap).map(([name, data]) => ({
    name,
    profit: data.profit,
    wins: data.wins,
    losses: data.losses,
    winRate: (data.wins + data.losses) > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0
  })).sort((a, b) => b.profit - a.profit);

  // 6. Team Performance (Top 5 hottest teams/picks)
  const teamMap = aggByField('pick');
  const teamPerformance = Object.entries(teamMap)
    .map(([name, data]) => ({
      name,
      profit: data.profit,
      wins: data.wins,
      losses: data.losses
    }))
    .filter(t => t.wins + t.losses > 0) // Only show active items
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5); // Top 5

  return {
    currentStreak: streak,
    last10,
    hottestSport,
    coldestSport,
    bookPerformance,
    teamPerformance
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// --- Sport Inference Data ---

const NFL_TEAMS = [
  "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills", "Carolina Panthers", "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns", "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers", "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins", "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants", "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers", "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders"
];

const NBA_TEAMS = [
  "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", "Chicago Bulls", "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets", "Detroit Pistons", "Golden State Warriors", "Houston Rockets", "Indiana Pacers", "Los Angeles Clippers", "Los Angeles Lakers", "Memphis Grizzlies", "Miami Heat", "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks", "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns", "Portland Trail Blazers", "Sacramento Kings", "San Antonio Spurs", "Toronto Raptors", "Utah Jazz", "Washington Wizards"
];

const MLB_TEAMS = [
  "Arizona Diamondbacks", "Atlanta Braves", "Baltimore Orioles", "Boston Red Sox", "Chicago Cubs", "Chicago White Sox", "Cincinnati Reds", "Cleveland Guardians", "Colorado Rockies", "Detroit Tigers", "Houston Astros", "Kansas City Royals", "Los Angeles Angels", "Los Angeles Dodgers", "Miami Marlins", "Milwaukee Brewers", "Minnesota Twins", "New York Mets", "New York Yankees", "Athletics", "Philadelphia Phillies", "Pittsburgh Pirates", "San Diego Padres", "San Francisco Giants", "Seattle Mariners", "St. Louis Cardinals", "Tampa Bay Rays", "Texas Rangers", "Toronto Blue Jays", "Washington Nationals"
];

const NHL_TEAMS = [
  "Anaheim Ducks", "Boston Bruins", "Buffalo Sabres", "Calgary Flames", "Carolina Hurricanes", "Chicago Blackhawks", "Colorado Avalanche", "Columbus Blue Jackets", "Dallas Stars", "Detroit Red Wings", "Edmonton Oilers", "Florida Panthers", "Los Angeles Kings", "Minnesota Wild", "Montreal Canadiens", "Nashville Predators", "New Jersey Devils", "New York Islanders", "New York Rangers", "Ottawa Senators", "Philadelphia Flyers", "Pittsburgh Penguins", "San Jose Sharks", "Seattle Kraken", "St. Louis Blues", "Tampa Bay Lightning", "Toronto Maple Leafs", "Utah Hockey Club", "Vancouver Canucks", "Vegas Golden Knights", "Washington Capitals", "Winnipeg Jets"
];

// Combined list of FBS and FCS teams
const NCAAF_TEAMS = [
  // FBS
  "Army West Point", "Charlotte", "East Carolina", "Florida Atlantic", "Memphis", "Navy", "North Texas", "Rice", "South Florida", "Temple", "Tulane", "Tulsa", "UAB", "UTSA",
  "Boston College", "California", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami (FL)", "NC State", "North Carolina", "Pittsburgh", "SMU", "Stanford", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest",
  "Arizona", "Arizona State", "Baylor", "BYU", "Cincinnati", "Colorado", "Houston", "Iowa State", "Kansas", "Kansas State", "Oklahoma State", "TCU", "Texas Tech", "UCF", "Utah", "West Virginia",
  "Illinois", "Indiana", "Iowa", "Maryland", "Michigan", "Michigan State", "Minnesota", "Nebraska", "Northwestern", "Ohio State", "Oregon", "Penn State", "Purdue", "Rutgers", "UCLA", "USC", "Washington", "Wisconsin",
  "Delaware", "FIU", "Jacksonville State", "Kennesaw State", "Liberty", "Louisiana Tech", "Middle Tennessee", "Missouri State", "New Mexico State", "Sam Houston", "UTEP", "Western Kentucky",
  "Notre Dame", "UConn",
  "Akron", "Ball State", "Bowling Green", "Buffalo", "Central Michigan", "Eastern Michigan", "Kent State", "Miami (OH)", "Northern Illinois", "Ohio", "Toledo", "UMass", "Western Michigan",
  "Air Force", "Boise State", "Colorado State", "Fresno State", "Hawaii", "Nevada", "New Mexico", "San Diego State", "San Jose State", "UNLV", "Utah State", "Wyoming",
  "Oregon State", "Washington State",
  "Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Mississippi State", "Missouri", "Oklahoma", "Ole Miss", "South Carolina", "Tennessee", "Texas", "Texas A&M", "Vanderbilt",
  "Appalachian State", "Arkansas State", "Coastal Carolina", "Georgia Southern", "Georgia State", "James Madison", "Louisiana", "Marshall", "Old Dominion", "South Alabama", "Southern Miss", "Texas State", "Troy", "UL Monroe",
  // FCS
  "Cal Poly", "Eastern Washington", "Idaho", "Idaho State", "Montana", "Montana State", "Northern Arizona", "Northern Colorado", "Portland State", "Sacramento State", "UC Davis", "Weber State",
  "Charleston Southern", "Eastern Illinois", "Gardner-Webb", "Lindenwood", "Southeast Missouri State", "Tennessee State", "Tennessee Tech", "UT Martin", "Western Illinois",
  "Albany", "Bryant", "Campbell", "Elon", "Hampton", "Maine", "Monmouth", "New Hampshire", "North Carolina A&T", "Rhode Island", "Richmond", "Stony Brook", "Towson", "Villanova", "William & Mary",
  "Merrimack", "Sacred Heart",
  "Brown", "Columbia", "Cornell", "Dartmouth", "Harvard", "Penn", "Princeton", "Yale",
  "Delaware State", "Howard", "Morgan State", "Norfolk State", "North Carolina Central", "South Carolina State",
  "Illinois State", "Indiana State", "Murray State", "North Dakota", "North Dakota State", "Northern Iowa", "South Dakota", "South Dakota State", "Southern Illinois", "Youngstown State",
  "Central Connecticut", "Duquesne", "LIU", "Mercyhurst", "Robert Morris", "Saint Francis (PA)", "Stonehill", "Wagner",
  "Bucknell", "Colgate", "Fordham", "Georgetown", "Holy Cross", "Lafayette", "Lehigh",
  "Butler", "Davidson", "Dayton", "Drake", "Marist", "Morehead State", "Presbyterian", "San Diego", "St. Thomas (MN)", "Stetson", "Valparaiso",
  "Chattanooga", "The Citadel", "ETSU", "Furman", "Mercer", "Samford", "VMI", "Western Carolina", "Wofford",
  "Houston Christian", "Incarnate Word", "Lamar", "McNeese", "Nicholls", "Northwestern State", "Southeastern Louisiana", "Stephen F. Austin", "Texas A&M-Commerce", "UTRGV",
  "Alabama A&M", "Alabama State", "Alcorn State", "Arkansas-Pine Bluff", "Bethune-Cookman", "Florida A&M", "Grambling State", "Jackson State", "Mississippi Valley State", "Prairie View A&M", "Southern", "Texas Southern",
  "Abilene Christian", "Austin Peay", "Central Arkansas", "Eastern Kentucky", "North Alabama", "Southern Utah", "Tarleton State", "Utah Tech", "West Georgia"
];

const NCAAB_TEAMS = [
  "Albany", "Binghamton", "Bryant", "Maine", "New Hampshire", "NJIT", "UMass Lowell", "UMBC", "Vermont",
  "Charlotte", "East Carolina", "Florida Atlantic", "Memphis", "North Texas", "Rice", "South Florida", "Temple", "Tulane", "Tulsa", "UAB", "UTSA", "Wichita State",
  "Davidson", "Dayton", "Duquesne", "Fordham", "George Mason", "George Washington", "La Salle", "Loyola Chicago", "Rhode Island", "Richmond", "Saint Joseph's", "Saint Louis", "St. Bonaventure", "UMass", "VCU",
  "Boston College", "California", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami (FL)", "NC State", "North Carolina", "Notre Dame", "Pittsburgh", "SMU", "Stanford", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest",
  "Austin Peay", "Bellarmine", "Central Arkansas", "Eastern Kentucky", "Florida Gulf Coast", "Jacksonville", "Jacksonville State", "Lipscomb", "North Alabama", "North Florida", "Queens (NC)", "Stetson", "West Georgia",
  "Arizona", "Arizona State", "Baylor", "BYU", "Cincinnati", "Colorado", "Houston", "Iowa State", "Kansas", "Kansas State", "Oklahoma State", "TCU", "Texas Tech", "UCF", "Utah", "West Virginia",
  "Butler", "Creighton", "DePaul", "Georgetown", "Marquette", "Providence", "Seton Hall", "St. John's", "UConn", "Villanova", "Xavier",
  "Eastern Washington", "Idaho", "Idaho State", "Montana", "Montana State", "Northern Arizona", "Northern Colorado", "Portland State", "Sacramento State", "Weber State",
  "Charleston Southern", "Gardner-Webb", "High Point", "Longwood", "Presbyterian", "Radford", "UNC Asheville", "USC Upstate", "Winthrop",
  "Illinois", "Indiana", "Iowa", "Maryland", "Michigan", "Michigan State", "Minnesota", "Nebraska", "Northwestern", "Ohio State", "Oregon", "Penn State", "Purdue", "Rutgers", "UCLA", "USC", "Washington", "Wisconsin",
  "Cal Poly", "Cal State Bakersfield", "Cal State Fullerton", "CSU Northridge", "Hawaii", "Long Beach State", "UC Davis", "UC Irvine", "UC Riverside", "UC San Diego", "UC Santa Barbara",
  "Campbell", "Charleston", "Delaware", "Drexel", "Elon", "Hampton", "Hofstra", "Monmouth", "North Carolina A&T", "Northeastern", "Stony Brook", "Towson", "UNC Wilmington", "William & Mary",
  "FIU", "Jacksonville State", "Kennesaw State", "Liberty", "Louisiana Tech", "Middle Tennessee", "Missouri State", "New Mexico State", "Sam Houston", "UTEP", "Western Kentucky",
  "Cleveland State", "Detroit Mercy", "Green Bay", "IU Indianapolis", "Milwaukee", "Northern Kentucky", "Oakland", "Purdue Fort Wayne", "Robert Morris", "Wright State", "Youngstown State",
  "Chicago State",
  "Brown", "Columbia", "Cornell", "Dartmouth", "Harvard", "Penn", "Princeton", "Yale",
  "Canisius", "Fairfield", "Iona", "Manhattan", "Marist", "Merrimack", "Mount St. Mary's", "Niagara", "Quinnipiac", "Rider", "Sacred Heart", "Saint Peter's", "Siena",
  "Akron", "Ball State", "Bowling Green", "Buffalo", "Central Michigan", "Eastern Michigan", "Kent State", "Miami (OH)", "Northern Illinois", "Ohio", "Toledo", "Western Michigan",
  "Coppin State", "Delaware State", "Howard", "Maryland Eastern Shore", "Morgan State", "Norfolk State", "North Carolina Central", "South Carolina State",
  "Belmont", "Bradley", "Drake", "Evansville", "Illinois State", "Indiana State", "Murray State", "Northern Iowa", "Southern Illinois", "UIC", "Valparaiso",
  "Air Force", "Boise State", "Colorado State", "Fresno State", "Nevada", "New Mexico", "San Diego State", "San Jose State", "UNLV", "Utah State", "Wyoming",
  "Central Connecticut", "Fairleigh Dickinson", "Le Moyne", "LIU", "Mercyhurst", "Saint Francis (PA)", "Stonehill", "Wagner",
  "Eastern Illinois", "Lindenwood", "Little Rock", "Morehead State", "SIU Edwardsville", "Southeast Missouri State", "Southern Indiana", "Tennessee State", "Tennessee Tech", "UT Martin", "Western Illinois",
  "Oregon State", "Washington State",
  "American", "Army West Point", "Boston University", "Bucknell", "Colgate", "Holy Cross", "Lafayette", "Lehigh", "Loyola Maryland", "Navy",
  "Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Mississippi State", "Missouri", "Oklahoma", "Ole Miss", "South Carolina", "Tennessee", "Texas", "Texas A&M", "Vanderbilt",
  "Chattanooga", "The Citadel", "ETSU", "Furman", "Mercer", "Samford", "UNC Greensboro", "VMI", "Western Carolina", "Wofford",
  "Houston Christian", "Incarnate Word", "Lamar", "McNeese", "New Orleans", "Nicholls", "Northwestern State", "Southeastern Louisiana", "Stephen F. Austin", "Texas A&M-Commerce", "Texas A&M-Corpus Christi", "UTRGV",
  "Denver", "Kansas City", "North Dakota", "North Dakota State", "Omaha", "Oral Roberts", "South Dakota", "South Dakota State", "St. Thomas (MN)",
  "Appalachian State", "Arkansas State", "Coastal Carolina", "Georgia Southern", "Georgia State", "James Madison", "Louisiana", "Marshall", "Old Dominion", "South Alabama", "Southern Miss", "Texas State", "Troy", "UL Monroe",
  "Alabama A&M", "Alabama State", "Alcorn State", "Arkansas-Pine Bluff", "Bethune-Cookman", "Florida A&M", "Grambling State", "Jackson State", "Mississippi Valley State", "Prairie View A&M", "Southern", "Texas Southern",
  "Abilene Christian", "California Baptist", "Grand Canyon", "Seattle U", "Southern Utah", "Tarleton State", "Utah Tech", "Utah Valley", "UT Arlington",
  "Gonzaga", "Loyola Marymount", "Pacific", "Pepperdine", "Portland", "Saint Mary's", "San Diego", "San Francisco", "Santa Clara"
];

export const inferSportFromBet = (bet: Partial<Bet>): string => {
  const text = `${bet.matchup || ''} ${bet.pick || ''}`.toUpperCase();

  // 1. Helper to get all matched teams from a specific sport list
  const getMatchedTeams = (teams: string[]): string[] => {
    const matches: string[] = [];
    for (const team of teams) {
      const upperTeam = team.toUpperCase();
      // Check full name
      if (text.includes(upperTeam)) {
        matches.push(team);
        continue;
      }
      
      // Check nickname (last word usually)
      const parts = upperTeam.split(' ');
      const nickname = parts[parts.length - 1];
      
      // Safety checks for ambiguous nicknames
      if (nickname.length <= 3) continue; // Skip short ones like "Sox", "UAB" (handled by full name)
      if (["SOX", "JETS", "GIANTS", "KINGS", "PANTHERS", "RANGERS", "CARDINALS"].includes(nickname)) {
        // These are handled by Pro league logic mostly, or context
        if (text.includes(nickname)) matches.push(team);
      } else {
        if (text.includes(nickname)) matches.push(team);
      }
    }
    return matches;
  };

  // 2. Check Professional Leagues First
  // Note: We use simpler checkList here for Pro as lists are smaller and less overlap between them
  const checkProList = (teams: string[]) => {
    for (const team of teams) {
      const upperTeam = team.toUpperCase();
      if (text.includes(upperTeam)) return true;
      const parts = upperTeam.split(' ');
      const nickname = parts[parts.length - 1];
      
      // Ambiguity specific overrides
      if (nickname === "GIANTS") { if (text.includes("NY") || text.includes("NEW YORK")) return true; }
      else if (nickname === "JETS") { if (text.includes("NY") || text.includes("NEW YORK")) return true; }
      else if (nickname === "RANGERS") { if (text.includes("TEXAS")) return true; }
      else if (nickname === "KINGS") { if (text.includes("SACRAMENTO")) return true; }
      else if (nickname === "CARDINALS") { if (text.includes("ARIZONA")) return true; }
      else if (nickname === "PANTHERS") { if (text.includes("CAROLINA")) return true; }
      else {
        if (text.includes(nickname)) return true;
      }
    }
    return false;
  };

  if (checkProList(NFL_TEAMS)) return 'NFL';
  if (checkProList(NBA_TEAMS)) return 'NBA';
  // Check NHL/MLB with specific logic for their shared nicknames
  const hasMLB = checkProList(MLB_TEAMS);
  const hasNHL = checkProList(NHL_TEAMS);
  
  if (hasMLB && hasNHL) {
    if (text.includes("GIANTS")) return "MLB"; // SF Giants vs NY Giants(NFL) - Wait, no NHL Giants.
    if (text.includes("RANGERS")) return text.includes("TEXAS") ? "MLB" : "NHL";
    if (text.includes("KINGS")) return "NHL"; // LA Kings vs Sac Kings(NBA)
    if (text.includes("PANTHERS")) return "NHL"; // Florida Panthers vs Carolina Panthers(NFL)
  }
  if (hasMLB) return 'MLB';
  if (hasNHL) return 'NHL';


  // 3. College Sport Differentiation Logic
  const matchedNCAAF = getMatchedTeams(NCAAF_TEAMS);
  const matchedNCAAB = getMatchedTeams(NCAAB_TEAMS);
  
  const hasNCAAF = matchedNCAAF.length > 0;
  const hasNCAAB = matchedNCAAB.length > 0;

  if (hasNCAAF || hasNCAAB) {
    // A. Check for Exclusive Teams (e.g. Gonzaga is CBB only)
    // If we found a team that is in CBB list but NOT in CFB list -> It's CBB.
    // Note: Comparing exact strings from our lists.
    const exclusiveCBB = matchedNCAAB.filter(t => !NCAAF_TEAMS.includes(t));
    if (exclusiveCBB.length > 0) return 'NCAAB';

    const exclusiveCFB = matchedNCAAF.filter(t => !NCAAB_TEAMS.includes(t));
    if (exclusiveCFB.length > 0) return 'NCAAF';

    // B. Dual Sport Teams (e.g. Alabama) - Use Context
    
    // B1. Explicit Keywords
    if (text.includes("CFB") || text.includes("BOWL") || text.includes("TOUCHDOWN")) return 'NCAAF';
    if (text.includes("CBB") || text.includes("MARCH MADNESS") || text.includes("TOURNAMENT") || text.includes("HALF")) return 'NCAAB';

    // B2. Point Totals (if available in text)
    // CBB totals usually > 115, CFB usually < 80.
    const totalMatch = text.match(/[OU]\s?(\d{2,3})/);
    if (totalMatch && totalMatch[1]) {
      const val = parseInt(totalMatch[1]);
      if (val > 110) return 'NCAAB';
      if (val < 80) return 'NCAAF';
    }

    // B3. Date Seasonality
    if (bet.date) {
      const month = parseInt(bet.date.split('-')[1]); // 1-12
      // Aug(8), Sep(9), Oct(10) -> CFB
      if ([8, 9, 10].includes(month)) return 'NCAAF';
      // Feb(2), Mar(3), Apr(4) -> CBB
      if ([2, 3, 4].includes(month)) return 'NCAAB';
      // Nov(11), Dec(12), Jan(1) -> Overlap. 
      // Default to NCAAF for weekends? Too complex. 
      // Default to CBB if Jan?
      if (month === 1) return 'NCAAB'; // Late Jan is mostly CBB conference play, CFB is just title game.
    }

    // Default Fallback if ambiguity exists
    return 'NCAAB'; 
  }

  // 4. Other / Generic Keywords
  if (text.includes('UFC') || text.includes('MMA')) return 'UFC';
  if (text.includes('TENNIS') || text.includes('ATP') || text.includes('WTA') || text.includes('DJOKOVIC') || text.includes('ALCARAZ') || text.includes('SINNER')) return 'Tennis';
  if (text.includes('GOLF') || text.includes('PGA') || text.includes('LIV')) return 'Golf';
  if (text.includes('SOCCER') || text.includes('EPL') || text.includes('MLS') || text.includes('PREMIER LEAGUE') || text.includes('CHAMPIONS LEAGUE')) return 'Soccer';
  if (text.includes('F1') || text.includes('FORMULA 1') || text.includes('VERSTAPPEN')) return 'F1';

  return 'Other';
};
