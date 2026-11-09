var Z=Object.defineProperty;var Y=(l,e,t)=>e in l?Z(l,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):l[e]=t;var c=(l,e,t)=>Y(l,typeof e!="symbol"?e+"":e,t);import{S as k,E as M,p as b,j as X,U as m,k as $,l as L,a as P,i as ee,m as E,n as te,o as ie,T as se,t as ne,r as ae,u as re,v as A,g as oe,w as G,x as H}from"./index-CAsaZBIi.js";import{P as C}from"./phaser-B61OQUcB.js";import{p as le}from"./PassiveSkillCalculator-avMcAEQh.js";const de=180;function xt(l,e=de){let t=0,s=0;if(l.left&&(t-=1),l.right&&(t+=1),l.up&&(s-=1),l.down&&(s+=1),t===0&&s===0)return{vx:0,vy:0};if(t!==0&&s!==0){const r=Math.SQRT1_2;return{vx:Math.round(t*e*r),vy:Math.round(s*e*r)}}return{vx:t*e,vy:s*e}}var w=(l=>(l.Town="town",l.Building="building",l.HuntingGround="hunting-ground",l.Dungeon="dungeon",l.Arena="arena",l))(w||{});const q={MathBuilding:"math-building",Library:"general-knowledge-library",ScienceLab:"science-laboratory",TechWorkshop:"technology-workshop"},y={MathHuntingGround:"math-hunting-ground",LibraryHuntingGround:"library-hunting-ground",ScienceHuntingGround:"science-hunting-ground",TechHuntingGround:"tech-hunting-ground",GeneralHuntingGround:"beginners-hunting-ground",VerdantGlade:"verdant-glade",RunestoneGrove:"runestone-grove",ForgeDistrict:"forge-district",SiegeWorks:"siege-works",TradeBazaar:"trade-bazaar",CivicDistrict:"civic-district",ManaFoundry:"mana-foundry",LogicSpire:"logic-spire",AshenWastes:"ashen-wastes",RuinedArchive:"ruined-archive"},ce={id:q.MathBuilding,name:"Mathematics Building",description:"Practice arithmetic, logic, and basic algebra against Math Slimes and Number Goblins.",subject:k.Mathematics,huntingZoneIds:[y.MathHuntingGround],interactionPosition:{x:160,y:255}},ue={id:q.Library,name:"General Knowledge Library",description:"Test your trivia and world knowledge against Book Mimics and Quiz Spirits.",subject:k.GeneralKnowledge,huntingZoneIds:[y.LibraryHuntingGround],interactionPosition:{x:400,y:255}},he={id:q.ScienceLab,name:"Science Laboratory",description:"Face Chemical Blobs and Atom Bugs with questions on biology and basic chemistry.",subject:k.Science,huntingZoneIds:[y.ScienceHuntingGround],interactionPosition:{x:160,y:555}},me={id:q.TechWorkshop,name:"Technology Workshop",description:"Debug Binary Slimes and Circuit Beetles with programming and tech questions.",subject:k.Programming,huntingZoneIds:[y.TechHuntingGround],interactionPosition:{x:400,y:555}},kt={[q.MathBuilding]:ce,[q.Library]:ue,[q.ScienceLab]:he,[q.TechWorkshop]:me};var h=(l=>(l.Weak="weak",l.Normal="normal",l.Strong="strong",l.Elite="elite",l.Boss="boss",l))(h||{}),pe=(l=>(l.Safe="safe",l.Caution="caution",l.Danger="danger",l.Extreme="extreme",l))(pe||{});const ge={id:y.MathHuntingGround,name:"Arithmetic Fields",subject:k.Mathematics,educationalTier:M.Elementary,recommendedMinLevel:1,recommendedMaxLevel:10,averageMonsterLevel:5,monsterSpawnConfigs:[{monsterId:"math-slime",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"number-goblin",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"fraction-bat",category:h.Normal,spawnWeight:15,maxCount:2}]},ye={id:y.LibraryHuntingGround,name:"Knowledge Grove",subject:k.GeneralKnowledge,educationalTier:M.Elementary,recommendedMinLevel:1,recommendedMaxLevel:10,averageMonsterLevel:5,monsterSpawnConfigs:[{monsterId:"book-mimic",category:h.Weak,spawnWeight:40,maxCount:5},{monsterId:"quiz-spirit",category:h.Normal,spawnWeight:40,maxCount:3},{monsterId:"knowledge-wisp",category:h.Strong,spawnWeight:20,maxCount:2}]},ve={id:y.ScienceHuntingGround,name:"Experiment Marsh",subject:k.Science,educationalTier:M.Elementary,recommendedMinLevel:1,recommendedMaxLevel:10,averageMonsterLevel:5,monsterSpawnConfigs:[{monsterId:"chemical-blob",category:h.Weak,spawnWeight:45,maxCount:5},{monsterId:"atom-bug",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"experiment-golem",category:h.Strong,spawnWeight:20,maxCount:2}]},be={id:y.TechHuntingGround,name:"Circuit Wilds",subject:k.Programming,educationalTier:M.Elementary,recommendedMinLevel:1,recommendedMaxLevel:10,averageMonsterLevel:5,monsterSpawnConfigs:[{monsterId:"binary-slime",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"circuit-beetle",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"glitch-sprite",category:h.Strong,spawnWeight:15,maxCount:2}]},xe={id:y.GeneralHuntingGround,name:"Beginners Hunting Ground",subject:k.Mathematics,educationalTier:M.Elementary,recommendedMinLevel:1,recommendedMaxLevel:10,averageMonsterLevel:3,monsterSpawnConfigs:[{monsterId:"math-slime",category:h.Weak,spawnWeight:30,maxCount:4},{monsterId:"book-mimic",category:h.Weak,spawnWeight:30,maxCount:4},{monsterId:"chemical-blob",category:h.Weak,spawnWeight:25,maxCount:3},{monsterId:"binary-slime",category:h.Weak,spawnWeight:15,maxCount:3}]},ke={id:y.VerdantGlade,name:"Verdant Glade",subject:k.Science,educationalTier:M.JuniorHigh,recommendedMinLevel:10,recommendedMaxLevel:20,averageMonsterLevel:13,monsterSpawnConfigs:[{monsterId:"sporeling",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"thornback-beast",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"ancient-treant",category:h.Strong,spawnWeight:15,maxCount:2}]},fe={id:y.RunestoneGrove,name:"Runestone Grove",subject:k.Mathematics,educationalTier:M.JuniorHigh,recommendedMinLevel:10,recommendedMaxLevel:20,averageMonsterLevel:13,monsterSpawnConfigs:[{monsterId:"rune-keeper",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"glyph-hound",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"stone-warden",category:h.Strong,spawnWeight:15,maxCount:2}]},we={id:y.ForgeDistrict,name:"Forge District",subject:k.Science,educationalTier:M.JuniorHigh,recommendedMinLevel:20,recommendedMaxLevel:30,averageMonsterLevel:23,monsterSpawnConfigs:[{monsterId:"cinder-imp",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"magma-hound",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"iron-golem",category:h.Strong,spawnWeight:15,maxCount:2}]},Se={id:y.SiegeWorks,name:"Siege Works",subject:k.Mathematics,educationalTier:M.JuniorHigh,recommendedMinLevel:20,recommendedMaxLevel:30,averageMonsterLevel:23,monsterSpawnConfigs:[{monsterId:"pivot-sentry",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"angle-knight",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"bastion-warden",category:h.Strong,spawnWeight:15,maxCount:2}]},Ie={id:y.TradeBazaar,name:"Trade Bazaar",subject:k.Mathematics,educationalTier:M.JuniorHigh,recommendedMinLevel:30,recommendedMaxLevel:40,averageMonsterLevel:33,monsterSpawnConfigs:[{monsterId:"coin-courier",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"ledger-golem",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"vault-sentinel",category:h.Strong,spawnWeight:15,maxCount:2}]},Me={id:y.CivicDistrict,name:"Civic District",subject:k.Science,educationalTier:M.JuniorHigh,recommendedMinLevel:30,recommendedMaxLevel:40,averageMonsterLevel:33,monsterSpawnConfigs:[{monsterId:"miasma-wisp",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"clockwork-beetle",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"aether-engine",category:h.Strong,spawnWeight:15,maxCount:2}]},_e={id:y.ManaFoundry,name:"Mana Foundry",subject:k.Science,educationalTier:M.JuniorHigh,recommendedMinLevel:40,recommendedMaxLevel:50,averageMonsterLevel:43,monsterSpawnConfigs:[{monsterId:"arc-spark",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"mana-automaton",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"techno-golem",category:h.Strong,spawnWeight:15,maxCount:2}]},Ce={id:y.LogicSpire,name:"Logic Spire",subject:k.Mathematics,educationalTier:M.JuniorHigh,recommendedMinLevel:40,recommendedMaxLevel:50,averageMonsterLevel:43,monsterSpawnConfigs:[{monsterId:"cipher-drone",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"algorithm-hound",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"qubit-warden",category:h.Strong,spawnWeight:15,maxCount:2}]},Le={id:y.AshenWastes,name:"Ashen Wastes",subject:k.Science,educationalTier:M.SeniorHigh,recommendedMinLevel:50,recommendedMaxLevel:60,averageMonsterLevel:55,monsterSpawnConfigs:[{monsterId:"ash-stalker",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"blight-horror",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"ruin-colossus",category:h.Strong,spawnWeight:15,maxCount:2}]},Ee={id:y.RuinedArchive,name:"Ruined Archive",subject:k.Mathematics,educationalTier:M.SeniorHigh,recommendedMinLevel:50,recommendedMaxLevel:60,averageMonsterLevel:55,monsterSpawnConfigs:[{monsterId:"crumbling-sentry",category:h.Weak,spawnWeight:50,maxCount:5},{monsterId:"fractured-golem",category:h.Normal,spawnWeight:35,maxCount:3},{monsterId:"fallen-warden",category:h.Strong,spawnWeight:15,maxCount:2}]},ft={[y.MathHuntingGround]:ge,[y.LibraryHuntingGround]:ye,[y.ScienceHuntingGround]:ve,[y.TechHuntingGround]:be,[y.GeneralHuntingGround]:xe,[y.VerdantGlade]:ke,[y.RunestoneGrove]:fe,[y.ForgeDistrict]:we,[y.SiegeWorks]:Se,[y.TradeBazaar]:Ie,[y.CivicDistrict]:Me,[y.ManaFoundry]:_e,[y.LogicSpire]:Ce,[y.AshenWastes]:Le,[y.RuinedArchive]:Ee},S={BeginnersVillage:"beginners-village",EmeraldForest:"emerald-forest",IronholdKingdom:"ironhold-kingdom",GoldenCapital:"golden-capital",ArcaneTechnologicalCity:"arcane-technological-city",ForgottenLands:"forgotten-lands",Colosseum:"colosseum"},d={BeginnersVillage:"beginners-village",MathBuilding:"math-building",ScienceLab:"science-lab",Library:"library",TechWorkshop:"tech-workshop",BeginnersHuntingGround:"beginners-hunting-ground",EmeraldForestOutpost:"emerald-forest-outpost",VerdantGlade:"verdant-glade",RunestoneGrove:"runestone-grove",IronholdGate:"ironhold-gate",ForgeDistrict:"forge-district",SiegeWorks:"siege-works",GoldenCapitalPlaza:"golden-capital-plaza",TradeBazaar:"trade-bazaar",CivicDistrict:"civic-district",ArcaneCityPlaza:"arcane-city-plaza",ManaFoundry:"mana-foundry",LogicSpire:"logic-spire",ForgottenCrossroads:"forgotten-crossroads",AshenWastes:"ashen-wastes",RuinedArchive:"ruined-archive",ColosseumGrounds:"colosseum-grounds"},wt={id:d.BeginnersVillage,name:"Beginners Village",zoneType:w.Town,entryRequirements:{recommendedMinLevel:1,recommendedMaxLevel:10},bounds:{width:1200,height:900},landmarks:[{id:"fountain",name:"Village Fountain",position:{x:600,y:400},width:64,height:64,color:4491468},{id:"math-building",name:"Mathematics Building",position:{x:160,y:200},width:120,height:100,color:13395524,targetMapId:d.MathBuilding},{id:"library",name:"General Knowledge Library",position:{x:400,y:200},width:120,height:100,color:4500070,targetMapId:d.Library},{id:"science-lab",name:"Science Laboratory",position:{x:160,y:500},width:120,height:100,color:6702284,targetMapId:d.ScienceLab},{id:"tech-workshop",name:"Technology Workshop",position:{x:400,y:500},width:120,height:100,color:11184708,targetMapId:d.TechWorkshop},{id:"shop",name:"General Merchant",position:{x:850,y:200},width:100,height:80,color:13408580},{id:"career-center",name:"Career Center",position:{x:850,y:500},width:140,height:100,color:9133302}],connections:[{targetMapId:d.BeginnersHuntingGround,exitPosition:{x:1150,y:750},entryPosition:{x:50,y:400},exitWidth:60,exitHeight:100}],collisionRects:[]},St={id:d.BeginnersHuntingGround,name:"Beginners Hunting Ground",zoneType:w.HuntingGround,entryRequirements:{recommendedMinLevel:1,recommendedMaxLevel:10},bounds:{width:1200,height:900},landmarks:[],connections:[{targetMapId:d.BeginnersVillage,exitPosition:{x:10,y:350},entryPosition:{x:1100,y:750},exitWidth:40,exitHeight:100}],collisionRects:[]},qe={width:600,height:400};function W(l,e,t){return{id:l,name:e,zoneType:w.Building,entryRequirements:{recommendedMinLevel:1,recommendedMaxLevel:10},bounds:qe,landmarks:[],connections:[{targetMapId:t,exitPosition:{x:300,y:370},entryPosition:{x:0,y:0},exitWidth:60,exitHeight:30}],collisionRects:[]}}W(d.MathBuilding,"Mathematics Building",d.BeginnersVillage);W(d.ScienceLab,"Science Laboratory",d.BeginnersVillage);W(d.Library,"General Knowledge Library",d.BeginnersVillage);W(d.TechWorkshop,"Technology Workshop",d.BeginnersVillage);const N={width:1200,height:900},O={recommendedMinLevel:10,recommendedMaxLevel:20},Te={id:d.EmeraldForestOutpost,name:"Emerald Forest Outpost",zoneType:w.Town,entryRequirements:{...O},bounds:N,landmarks:[],connections:[{targetMapId:d.VerdantGlade,exitPosition:{x:1160,y:300},entryPosition:{x:80,y:300},exitWidth:60,exitHeight:100},{targetMapId:d.RunestoneGrove,exitPosition:{x:1160,y:700},entryPosition:{x:80,y:700},exitWidth:60,exitHeight:100}],collisionRects:[{x:360,y:220,width:90,height:70},{x:620,y:460,width:120,height:80},{x:420,y:700,width:100,height:70},{x:840,y:160,width:80,height:60}]},$e={id:d.VerdantGlade,name:"Verdant Glade",zoneType:w.HuntingGround,entryRequirements:{...O},bounds:N,landmarks:[],connections:[{targetMapId:d.EmeraldForestOutpost,exitPosition:{x:40,y:300},entryPosition:{x:1100,y:300},exitWidth:40,exitHeight:100}],collisionRects:[{x:420,y:260,width:110,height:80},{x:760,y:380,width:130,height:90},{x:520,y:680,width:100,height:70},{x:940,y:720,width:90,height:70}]},Pe={id:d.RunestoneGrove,name:"Runestone Grove",zoneType:w.HuntingGround,entryRequirements:{...O},bounds:N,landmarks:[],connections:[{targetMapId:d.EmeraldForestOutpost,exitPosition:{x:40,y:700},entryPosition:{x:1100,y:700},exitWidth:40,exitHeight:100}],collisionRects:[{x:380,y:340,width:100,height:80},{x:640,y:200,width:120,height:70},{x:820,y:560,width:110,height:90},{x:480,y:760,width:90,height:60}]},Re=[Te,$e,Pe],D={width:1200,height:900},B={recommendedMinLevel:20,recommendedMaxLevel:30},Ae={id:d.IronholdGate,name:"Ironhold Gate",zoneType:w.Town,entryRequirements:{...B},bounds:D,landmarks:[],connections:[{targetMapId:d.ForgeDistrict,exitPosition:{x:1160,y:300},entryPosition:{x:80,y:300},exitWidth:60,exitHeight:100},{targetMapId:d.SiegeWorks,exitPosition:{x:1160,y:700},entryPosition:{x:80,y:700},exitWidth:60,exitHeight:100}],collisionRects:[{x:340,y:200,width:110,height:80},{x:600,y:440,width:140,height:90},{x:400,y:700,width:110,height:80},{x:820,y:150,width:90,height:70}]},Ge={id:d.ForgeDistrict,name:"Forge District",zoneType:w.HuntingGround,entryRequirements:{...B},bounds:D,landmarks:[],connections:[{targetMapId:d.IronholdGate,exitPosition:{x:40,y:300},entryPosition:{x:1100,y:300},exitWidth:40,exitHeight:100}],collisionRects:[{x:400,y:240,width:130,height:90},{x:750,y:380,width:140,height:100},{x:500,y:690,width:120,height:80},{x:930,y:700,width:100,height:80}]},He={id:d.SiegeWorks,name:"Siege Works",zoneType:w.HuntingGround,entryRequirements:{...B},bounds:D,landmarks:[],connections:[{targetMapId:d.IronholdGate,exitPosition:{x:40,y:700},entryPosition:{x:1100,y:700},exitWidth:40,exitHeight:100}],collisionRects:[{x:360,y:320,width:120,height:90},{x:630,y:180,width:130,height:80},{x:800,y:560,width:120,height:100},{x:470,y:760,width:100,height:70}]},We=[Ae,Ge,He],V={width:1200,height:900},K={recommendedMinLevel:30,recommendedMaxLevel:40},Ne={id:d.GoldenCapitalPlaza,name:"Golden Capital Plaza",zoneType:w.Town,entryRequirements:{...K},bounds:V,landmarks:[],connections:[{targetMapId:d.TradeBazaar,exitPosition:{x:1160,y:300},entryPosition:{x:80,y:300},exitWidth:60,exitHeight:100},{targetMapId:d.CivicDistrict,exitPosition:{x:1160,y:700},entryPosition:{x:80,y:700},exitWidth:60,exitHeight:100}],collisionRects:[{x:430,y:230,width:130,height:90},{x:620,y:450,width:150,height:100},{x:400,y:690,width:120,height:80},{x:850,y:160,width:100,height:80}]},Oe={id:d.TradeBazaar,name:"Trade Bazaar",zoneType:w.HuntingGround,entryRequirements:{...K},bounds:V,landmarks:[],connections:[{targetMapId:d.GoldenCapitalPlaza,exitPosition:{x:40,y:300},entryPosition:{x:1100,y:300},exitWidth:40,exitHeight:100}],collisionRects:[{x:390,y:250,width:130,height:90},{x:740,y:380,width:150,height:100},{x:500,y:700,width:120,height:80},{x:920,y:690,width:110,height:90}]},De={id:d.CivicDistrict,name:"Civic District",zoneType:w.HuntingGround,entryRequirements:{...K},bounds:V,landmarks:[],connections:[{targetMapId:d.GoldenCapitalPlaza,exitPosition:{x:40,y:700},entryPosition:{x:1100,y:700},exitWidth:40,exitHeight:100}],collisionRects:[{x:370,y:320,width:130,height:100},{x:650,y:190,width:140,height:80},{x:810,y:560,width:130,height:100},{x:470,y:770,width:110,height:70}]},Be=[Ne,Oe,De],F={width:1200,height:900},Q={recommendedMinLevel:40,recommendedMaxLevel:50},Ve={id:d.ArcaneCityPlaza,name:"Arcane City Plaza",zoneType:w.Town,entryRequirements:{...Q},bounds:F,landmarks:[],connections:[{targetMapId:d.ManaFoundry,exitPosition:{x:1160,y:300},entryPosition:{x:80,y:300},exitWidth:60,exitHeight:100},{targetMapId:d.LogicSpire,exitPosition:{x:1160,y:700},entryPosition:{x:80,y:700},exitWidth:60,exitHeight:100}],collisionRects:[{x:440,y:220,width:140,height:90},{x:610,y:460,width:150,height:110},{x:410,y:700,width:120,height:80},{x:860,y:170,width:110,height:80}]},Ke={id:d.ManaFoundry,name:"Mana Foundry",zoneType:w.HuntingGround,entryRequirements:{...Q},bounds:F,landmarks:[],connections:[{targetMapId:d.ArcaneCityPlaza,exitPosition:{x:40,y:300},entryPosition:{x:1100,y:300},exitWidth:40,exitHeight:100}],collisionRects:[{x:400,y:240,width:140,height:100},{x:750,y:390,width:150,height:100},{x:510,y:710,width:130,height:80},{x:930,y:680,width:110,height:90}]},Fe={id:d.LogicSpire,name:"Logic Spire",zoneType:w.HuntingGround,entryRequirements:{...Q},bounds:F,landmarks:[],connections:[{targetMapId:d.ArcaneCityPlaza,exitPosition:{x:40,y:700},entryPosition:{x:1100,y:700},exitWidth:40,exitHeight:100}],collisionRects:[{x:380,y:320,width:130,height:100},{x:660,y:180,width:140,height:80},{x:820,y:560,width:130,height:110},{x:460,y:770,width:120,height:70}]},Qe=[Ve,Ke,Fe],z={width:1200,height:900},j={recommendedMinLevel:50,recommendedMaxLevel:60},ze={id:d.ForgottenCrossroads,name:"Forgotten Crossroads",zoneType:w.Town,entryRequirements:{...j},bounds:z,landmarks:[],connections:[{targetMapId:d.AshenWastes,exitPosition:{x:1160,y:300},entryPosition:{x:80,y:300},exitWidth:60,exitHeight:100},{targetMapId:d.RuinedArchive,exitPosition:{x:1160,y:700},entryPosition:{x:80,y:700},exitWidth:60,exitHeight:100}],collisionRects:[{x:430,y:240,width:130,height:90},{x:620,y:440,width:150,height:110},{x:400,y:690,width:120,height:80},{x:870,y:180,width:110,height:80}]},je={id:d.AshenWastes,name:"Ashen Wastes",zoneType:w.HuntingGround,entryRequirements:{...j},bounds:z,landmarks:[],connections:[{targetMapId:d.ForgottenCrossroads,exitPosition:{x:40,y:300},entryPosition:{x:1100,y:300},exitWidth:40,exitHeight:100}],collisionRects:[{x:390,y:250,width:140,height:100},{x:740,y:400,width:150,height:100},{x:500,y:710,width:130,height:80},{x:920,y:680,width:120,height:90}]},Ue={id:d.RuinedArchive,name:"Ruined Archive",zoneType:w.HuntingGround,entryRequirements:{...j},bounds:z,landmarks:[],connections:[{targetMapId:d.ForgottenCrossroads,exitPosition:{x:40,y:700},entryPosition:{x:1100,y:700},exitWidth:40,exitHeight:100}],collisionRects:[{x:380,y:320,width:130,height:100},{x:660,y:190,width:140,height:80},{x:820,y:560,width:130,height:110},{x:460,y:760,width:120,height:70}]},Je=[ze,je,Ue],Ze={width:1200,height:900},Ye={recommendedMinLevel:60,recommendedMaxLevel:70},Xe={id:d.ColosseumGrounds,name:"Colosseum Grounds",zoneType:w.Arena,entryRequirements:{...Ye},bounds:Ze,landmarks:[],connections:[],collisionRects:[{x:300,y:250,width:140,height:100},{x:720,y:250,width:140,height:100},{x:480,y:560,width:240,height:40}]},et=[Xe],tt=[{id:S.BeginnersVillage,name:"Beginners Village",description:"A peaceful starting town with subject academies and a training ground.",order:1,recommendedLevel:{min:1,max:10},unlock:{minLevel:1,requiresDiscovery:!1},travelPoints:[{targetRegionId:S.EmeraldForest,label:"Forest Trail"}],mapIds:[d.BeginnersVillage,d.MathBuilding,d.ScienceLab,d.Library,d.TechWorkshop,d.BeginnersHuntingGround],provisional:!0},{id:S.EmeraldForest,name:"Emerald Forest",description:"A lush woodland of nature and life-science questions.",order:2,recommendedLevel:{min:10,max:20},unlock:{minLevel:10,requiresDiscovery:!0},travelPoints:[{targetRegionId:S.BeginnersVillage,label:"Village Path"},{targetRegionId:S.IronholdKingdom,label:"Mountain Pass"}],mapIds:Re.map(l=>l.id),provisional:!0},{id:S.IronholdKingdom,name:"Ironhold Kingdom",description:"A fortified realm of engineering and physical-science trials.",order:3,recommendedLevel:{min:20,max:30},unlock:{minLevel:20,requiresDiscovery:!0},travelPoints:[{targetRegionId:S.EmeraldForest,label:"Forest Border"},{targetRegionId:S.GoldenCapital,label:"King's Road"}],mapIds:We.map(l=>l.id),provisional:!0},{id:S.GoldenCapital,name:"Golden Capital",description:"The trade heart of the realm — commerce, civic life, and business questions.",order:4,recommendedLevel:{min:30,max:40},unlock:{minLevel:30,requiresDiscovery:!0},travelPoints:[{targetRegionId:S.IronholdKingdom,label:"King's Road"},{targetRegionId:S.ArcaneTechnologicalCity,label:"Arcane Highway"}],mapIds:Be.map(l=>l.id),provisional:!0},{id:S.ArcaneTechnologicalCity,name:"Arcane Technological City",description:"A fusion of magic and machinery — advanced science and programming.",order:5,recommendedLevel:{min:40,max:50},unlock:{minLevel:40,requiresDiscovery:!0},travelPoints:[{targetRegionId:S.GoldenCapital,label:"Arcane Highway"},{targetRegionId:S.ForgottenLands,label:"Rift Gate"}],mapIds:Qe.map(l=>l.id),provisional:!0},{id:S.ForgottenLands,name:"Forgotten Lands",description:"Ruined wilds holding the realm’s hardest challenges.",order:6,recommendedLevel:{min:50,max:60},unlock:{minLevel:50,requiresDiscovery:!0},travelPoints:[{targetRegionId:S.ArcaneTechnologicalCity,label:"Rift Gate"},{targetRegionId:S.Colosseum,label:"Champion's Gate"}],mapIds:Je.map(l=>l.id),provisional:!0},{id:S.Colosseum,name:"Colosseum",description:"The endgame arena where champions are crowned.",order:7,recommendedLevel:{min:60,max:null},unlock:{minLevel:60,requiresDiscovery:!0},travelPoints:[{targetRegionId:S.ForgottenLands,label:"Champion's Gate"}],mapIds:et.map(l=>l.id),provisional:!0}];Object.fromEntries(tt.map(l=>[l.id,l]));class It{constructor(e){c(this,"cursors",null);c(this,"wasdKeys",null);c(this,"inputEnabled",!0);e.input&&e.input.keyboard&&(this.cursors=e.input.keyboard.createCursorKeys(),this.wasdKeys={W:e.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.W),A:e.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.A),S:e.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.S),D:e.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.D)})}setInputEnabled(e){this.inputEnabled=e}isInputEnabled(){return this.inputEnabled}getInputState(){var n,o,a,i,u,x,v,p;if(!this.inputEnabled)return{up:!1,down:!1,left:!1,right:!1};const e=!!((n=this.cursors)!=null&&n.up.isDown||(o=this.wasdKeys)!=null&&o.W.isDown),t=!!((a=this.cursors)!=null&&a.down.isDown||(i=this.wasdKeys)!=null&&i.S.isDown),s=!!((u=this.cursors)!=null&&u.left.isDown||(x=this.wasdKeys)!=null&&x.A.isDown),r=!!((v=this.cursors)!=null&&v.right.isDown||(p=this.wasdKeys)!=null&&p.D.isDown);return{up:e,down:t,left:s,right:r}}}class it{constructor(e={}){c(this,"container",null);c(this,"onOpenInventory");c(this,"onOpenMastery");c(this,"onOpenQuests");c(this,"onOpenSkills");c(this,"unsubscribeGoldListener",null);this.onOpenInventory=e.onOpenInventory,this.onOpenMastery=e.onOpenMastery,this.onOpenQuests=e.onOpenQuests,this.onOpenSkills=e.onOpenSkills}show(){this.destroy();const e=document.createElement("div");e.className="exploration-hud",e.id="exploration-hud",document.body.appendChild(e),this.container=e,this.render(),this.unsubscribeGoldListener=b.currency.onBalanceChange(()=>{this.updateGoldDisplay()})}render(){var a,i,u,x;if(!this.container)return;const e=b.getPlayer(),t=b.currency.getGold(),s=Math.max(0,Math.min(100,Math.round(e.currentHp/e.maxHp*100))),r=e.maxMp>0?Math.max(0,Math.min(100,Math.round(e.currentMp/e.maxMp*100))):0,n=X(e.level),o=n>0?Math.max(0,Math.min(100,Math.round(e.currentExp/n*100))):100;this.container.innerHTML=`
      <div class="exploration-hud__card">
        <div class="exploration-hud__header">
          <span class="exploration-hud__name">⚔️ ${this.escape(e.name)}</span>
          <span class="exploration-hud__level">${$(m.hud.level,{level:e.level})}</span>
        </div>

        <div class="exploration-hud__bar-group">
          <!-- HP Bar -->
          <div class="exploration-hud__bar-wrapper" title="${m.hud.health}">
            <div class="exploration-hud__bar exploration-hud__bar--hp" id="hud-hp-bar" style="width: ${s}%"></div>
            <div class="exploration-hud__bar-label">
              <span>${m.hud.hp}</span>
              <span id="hud-hp-text">${$(m.battle.hp,{current:L(e.currentHp),max:L(e.maxHp)})}</span>
            </div>
          </div>

          <!-- MP Bar -->
          <div class="exploration-hud__bar-wrapper" title="${m.hud.mana}">
            <div class="exploration-hud__bar exploration-hud__bar--mp" id="hud-mp-bar" style="width: ${r}%"></div>
            <div class="exploration-hud__bar-label">
              <span>${m.hud.mp}</span>
              <span id="hud-mp-text">${$(m.battle.hp,{current:L(e.currentMp),max:L(e.maxMp)})}</span>
            </div>
          </div>

          <!-- EXP Bar -->
          <div class="exploration-hud__bar-wrapper" title="${m.hud.experience}">
            <div class="exploration-hud__bar exploration-hud__bar--exp" id="hud-exp-bar" style="width: ${o}%"></div>
            <div class="exploration-hud__bar-label">
              <span>${m.hud.exp}</span>
              <span id="hud-exp-text">${$(m.battle.hp,{current:L(e.currentExp),max:n>0?L(n):m.hud.max})}</span>
            </div>
          </div>
        </div>

        <div class="exploration-hud__footer">
          <div class="exploration-hud__gold" id="hud-gold-text">
            🪙 <span>${$(m.hud.gold,{amount:L(t)})}</span>
          </div>
          <div class="exploration-hud__buttons">
            <button class="exploration-hud__btn" id="hud-inv-btn" type="button">
              🎒 ${m.hud.bag} <span class="exploration-hud__btn-key">I</span>
            </button>
            <button class="exploration-hud__btn" id="hud-skills-btn" type="button">
              ⚡ ${m.hud.skills} <span class="exploration-hud__btn-key">K</span>
            </button>
            <button class="exploration-hud__btn" id="hud-mastery-btn" type="button">
              📖 ${m.hud.mastery} <span class="exploration-hud__btn-key">M</span>
            </button>
            <button class="exploration-hud__btn" id="hud-quest-btn" type="button">
              📜 ${m.hud.quests} <span class="exploration-hud__btn-key">Q</span>
            </button>
          </div>
        </div>
      </div>
    `,(a=this.container.querySelector("#hud-inv-btn"))==null||a.addEventListener("click",v=>{var p;v.stopPropagation(),(p=this.onOpenInventory)==null||p.call(this)}),(i=this.container.querySelector("#hud-skills-btn"))==null||i.addEventListener("click",v=>{var p;v.stopPropagation(),(p=this.onOpenSkills)==null||p.call(this)}),(u=this.container.querySelector("#hud-mastery-btn"))==null||u.addEventListener("click",v=>{var p;v.stopPropagation(),(p=this.onOpenMastery)==null||p.call(this)}),(x=this.container.querySelector("#hud-quest-btn"))==null||x.addEventListener("click",v=>{var p;v.stopPropagation(),(p=this.onOpenQuests)==null||p.call(this)})}refresh(){this.container&&this.render()}updateGoldDisplay(){var t;const e=(t=this.container)==null?void 0:t.querySelector("#hud-gold-text span");e&&(e.textContent=$(m.hud.gold,{amount:L(b.currency.getGold())}))}destroy(){this.unsubscribeGoldListener&&(this.unsubscribeGoldListener(),this.unsubscribeGoldListener=null),this.container&&(this.container.remove(),this.container=null)}escape(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}function st(l,e,t=1){const s=P(l);if(!s||!s.equipmentSlot)return null;const r=s.equipmentSlot,n=e[r],o=n?P(n):void 0,a=s.requiredLevel??1,i=t>=a,u=i,x=(o==null?void 0:o.statModifiers)??{},v=s.statModifiers??{},p=["hp","mp","attack","defense","intelligence","critRate","movementSpeed"],g=[];for(const I of p){const _=x[I]??0,T=v[I]??0,R=T-_;(_!==0||T!==0)&&g.push({stat:I,currentValue:_,candidateValue:T,delta:R})}return{currentEquippedId:n,currentEquippedDef:o,candidateId:l,candidateDef:s,targetSlot:r,canEquip:u,levelMet:i,requiredLevel:a,statDiffs:g}}const nt={[E.Weapon]:"⚔️",[E.Armor]:"🛡️",[E.Helmet]:"🪖",[E.Accessory]:"💍"},at={weapon:"⚔️",armor:"🛡️",helmet:"🪖",accessory:"💍",consumable:"🧪",material:"💎",quest:"📜"};class rt{constructor(e={}){c(this,"container",null);c(this,"manager");c(this,"playerLevel");c(this,"onClose");c(this,"onStateChange");c(this,"selectedSlotIndex",null);c(this,"selectedEquipSlot",null);this.manager=e.manager||ee,this.playerLevel=e.playerLevel??1,this.onClose=e.onClose,this.onStateChange=e.onStateChange}show(){var t;this.destroy();const e=document.createElement("div");e.className="inventory-modal",e.id="inventory-modal",e.innerHTML=`
      <div class="inventory-card">
        <div class="inventory-header">
          <div class="inventory-header__title">🎒 Inventory & Equipment</div>
          <button class="inventory-header__close" id="inventory-close-btn">&times;</button>
        </div>
        <div class="inventory-body">
          <div class="equipment-section">
            <div class="section-title">Equipment</div>
            <div class="equipment-slots" id="equipment-slots-container"></div>
          </div>
          <div class="inventory-grid-section">
            <div class="section-title">Bag</div>
            <div class="inventory-grid" id="inventory-grid-container"></div>
          </div>
        </div>
        <div class="inventory-footer" id="inventory-footer">
          <div class="item-details" id="item-details">
            <div class="item-details__title">Select an item to view details</div>
          </div>
          <div class="item-actions" id="item-actions"></div>
        </div>
      </div>
    `,document.body.appendChild(e),this.container=e,(t=e.querySelector("#inventory-close-btn"))==null||t.addEventListener("click",()=>{var s;this.destroy(),(s=this.onClose)==null||s.call(this)}),this.render()}render(){this.container&&(this.renderEquipment(),this.renderGrid(),this.renderDetails())}renderEquipment(){var r;const e=(r=this.container)==null?void 0:r.querySelector("#equipment-slots-container");if(!e)return;e.innerHTML="";const t=this.manager.getState(),s=[E.Weapon,E.Armor,E.Helmet,E.Accessory];for(const n of s){const o=t.equipped[n],a=o?P(o):void 0,i=document.createElement("div");i.className=`equip-slot ${this.selectedEquipSlot===n?"active":""}`,i.innerHTML=`
        <div class="equip-slot__icon">${a?this.getItemIcon(a):nt[n]}</div>
        <div class="equip-slot__info">
          <div class="equip-slot__label">${n}</div>
          <div class="equip-slot__name ${a?`rarity-${a.rarity}`:""}">
            ${a?this.escape(a.name):'<i style="color:#718096">Empty</i>'}
          </div>
        </div>
      `,i.addEventListener("click",()=>{this.selectedSlotIndex=null,this.selectedEquipSlot=n,this.render()}),e.appendChild(i)}}renderGrid(){var s;const e=(s=this.container)==null?void 0:s.querySelector("#inventory-grid-container");if(!e)return;e.innerHTML="";const t=this.manager.getState();for(let r=0;r<t.capacity;r++){const n=t.slots[r],o=n?P(n.itemId):void 0,a=document.createElement("div");a.className=`inventory-slot ${n?"":"empty"} ${this.selectedSlotIndex===r?"selected":""}`,n&&o&&(a.innerHTML=`
          <div class="inventory-slot__icon">${this.getItemIcon(o)}</div>
          ${n.quantity>1?`<div class="inventory-slot__qty">${n.quantity}</div>`:""}
        `,a.addEventListener("click",()=>{this.selectedEquipSlot=null,this.selectedSlotIndex=r,this.render()})),e.appendChild(a)}}renderDetails(){var r,n;const e=(r=this.container)==null?void 0:r.querySelector("#item-details"),t=(n=this.container)==null?void 0:n.querySelector("#item-actions");if(!e||!t)return;e.innerHTML="",t.innerHTML="";const s=this.manager.getState();if(this.selectedEquipSlot){const o=s.equipped[this.selectedEquipSlot],a=o?P(o):void 0;if(a){this.displayItemInfo(e,a);const i=document.createElement("button");i.className="item-btn item-btn--unequip",i.textContent=m.common.unequip,i.addEventListener("click",()=>{var u;this.selectedEquipSlot&&this.manager.unequipItem(this.selectedEquipSlot)&&((u=this.onStateChange)==null||u.call(this),this.render())}),t.appendChild(i)}else e.innerHTML=`<div class="item-details__desc">Empty ${this.selectedEquipSlot} slot.</div>`;return}if(this.selectedSlotIndex!==null){const o=s.slots[this.selectedSlotIndex],a=o?P(o.itemId):void 0;if(a){if(a.equipmentSlot){const i=st(o.itemId,s.equipped,this.playerLevel);this.displayItemWithComparison(e,a,i)}else this.displayItemInfo(e,a);if(a.equipmentSlot){const i=document.createElement("button");i.className="item-btn item-btn--equip",i.textContent=m.common.equip,a.requiredLevel&&this.playerLevel<a.requiredLevel&&(i.disabled=!0,i.title=`Requires level ${a.requiredLevel}`),i.addEventListener("click",()=>{var u;this.selectedSlotIndex!==null&&this.manager.equipItem(this.selectedSlotIndex,this.playerLevel).success&&((u=this.onStateChange)==null||u.call(this),this.render())}),t.appendChild(i)}}else e.innerHTML='<div class="item-details__title">Select an item to view details</div>';return}e.innerHTML='<div class="item-details__title">Select an item to view details</div>'}displayItemInfo(e,t){const s=t.statModifiers?Object.entries(t.statModifiers).filter(([,r])=>r&&r>0).map(([r,n])=>`+${n} ${r.toUpperCase()}`).join(", "):"";e.innerHTML=`
      <div class="item-details__title rarity-${t.rarity}">${this.escape(t.name)} (${t.rarity})</div>
      <div class="item-details__desc">${this.escape(t.description)}</div>
      ${s?`<div class="item-details__stats">${s}</div>`:""}
      ${t.requiredLevel?`<div class="item-details__desc">Requires Level ${t.requiredLevel}</div>`:""}
    `}displayItemWithComparison(e,t,s){const r=t.statModifiers?Object.entries(t.statModifiers).filter(([,a])=>a&&a>0).map(([a,i])=>`+${i} ${a.toUpperCase()}`).join(", "):"",n=t.requiredLevel&&this.playerLevel<t.requiredLevel?'style="color: #ef4444; font-weight: bold;"':'style="color: #10b981;"';let o="";if(s&&s.statDiffs.length>0){const a=s.statDiffs.map(i=>{const u=i.delta>0?`+${i.delta}`:`${i.delta}`,x=i.delta>0?"#10b981":i.delta<0?"#ef4444":"#9ca3af";return`<div style="display:flex; justify-content:space-between; font-size:11px; margin:2px 0;">
            <span>${i.stat.toUpperCase()}:</span>
            <span>${i.currentValue} → <b>${i.candidateValue}</b> <span style="color:${x};">(${u})</span></span>
          </div>`}).join("");o=`
        <div style="margin-top:6px; padding:6px; background:rgba(0,0,0,0.3); border-radius:4px; border:1px solid #374151;">
          <div style="font-size:11px; color:#9ca3af; margin-bottom:4px; font-weight:bold;">vs Equipped (${s.currentEquippedDef?this.escape(s.currentEquippedDef.name):"None"}):</div>
          ${a}
        </div>
      `}e.innerHTML=`
      <div class="item-details__title rarity-${t.rarity}">${this.escape(t.name)} (${t.rarity})</div>
      <div class="item-details__desc">${this.escape(t.description)}</div>
      ${r?`<div class="item-details__stats">${r}</div>`:""}
      ${t.requiredLevel?`<div class="item-details__desc" ${n}>Requires Level ${t.requiredLevel} (Your Level: ${this.playerLevel})</div>`:""}
      ${o}
    `}getItemIcon(e){return at[e.type]||"📦"}destroy(){this.container&&(this.container.remove(),this.container=null)}escape(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}class ot{constructor(e={}){c(this,"container",null);c(this,"manager");c(this,"onClose");this.manager=e.manager||te,this.onClose=e.onClose}show(){var r;this.destroy();const e=document.createElement("div");e.className="mastery-modal",e.id="mastery-modal";const s=Object.values(k).map(n=>{const o=this.manager.getMastery(n),a=this.manager.getProgress(n),i=o.totalAttempted>0?Math.round(o.totalCorrect/o.totalAttempted*100):0,u=n.replace(/-/g," ");return`
          <div class="mastery-item">
            <div class="mastery-item__header">
              <span class="mastery-item__name">📖 ${this.escape(u)}</span>
              <span class="mastery-item__level">Mastery Lv. ${o.level}</span>
            </div>
            <div class="mastery-item__bar-bg">
              <div class="mastery-item__bar" style="width: ${a.progressRatio*100}%"></div>
            </div>
            <div class="mastery-item__meta">
              <span>EXP: ${o.currentExp} / ${a.isMaxLevel?"MAX":a.requiredExp}</span>
              <span>Accuracy: ${i}% (${o.totalCorrect}/${o.totalAttempted})</span>
            </div>
          </div>
        `}).join("");e.innerHTML=`
      <div class="mastery-card">
        <div class="mastery-header">
          <div class="mastery-header__title">🎓 Subject Knowledge Mastery</div>
          <button class="mastery-header__close" id="mastery-close-btn">&times;</button>
        </div>
        <div class="mastery-body">
          ${s}
        </div>
      </div>
    `,document.body.appendChild(e),this.container=e,(r=e.querySelector("#mastery-close-btn"))==null||r.addEventListener("click",()=>{var n;this.destroy(),(n=this.onClose)==null||n.call(this)})}destroy(){this.container&&(this.container.remove(),this.container=null)}escape(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}class lt{constructor(e={}){c(this,"container",null);c(this,"onResume");c(this,"onQuitToMenu");c(this,"currentView","menu");this.onResume=e.onResume,this.onQuitToMenu=e.onQuitToMenu}show(){this.destroy();const e=document.createElement("div");e.className="pause-modal",e.id="pause-modal",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-labelledby","pause-title"),document.body.appendChild(e),this.container=e,this.render()}render(){if(!this.container)return;let e="",t=m.pause.titlePaused;if(this.currentView==="menu")e=`
        <div class="pause-card__menu-buttons">
          <button class="pause-menu-btn" id="pause-resume-btn" type="button">
            ${m.pause.resume}
          </button>
          <button class="pause-menu-btn" id="pause-settings-btn" type="button">
            ${m.pause.settings}
          </button>
          <button class="pause-menu-btn" id="pause-controls-btn" type="button">
            ${m.pause.controls}
          </button>
          <button class="pause-menu-btn pause-menu-btn--danger" id="pause-quit-btn" type="button">
            ${m.pause.returnToStartMenu}
          </button>
        </div>
      `;else if(this.currentView==="settings"){t=m.pause.settingsTitle;const r=b.getSettings(),n=ie(),o=se.map(a=>`<option value="${a}"${a===n?" selected":""}>${this.escape(ne(a))}</option>`).join("");e=`
        <div class="pause-settings-group">
          <!-- Master Volume -->
          <div class="pause-setting-row">
            <label class="pause-setting-label" for="master-vol-slider">
              <span>${m.pause.masterVolume}</span>
              <span class="pause-setting-val" id="master-vol-val">${Math.round(r.masterVolume*100)}%</span>
            </label>
            <input class="pause-setting-slider" id="master-vol-slider" type="range" min="0" max="100" value="${Math.round(r.masterVolume*100)}" />
          </div>

          <!-- SFX Volume -->
          <div class="pause-setting-row">
            <label class="pause-setting-label" for="sfx-vol-slider">
              <span>${m.pause.sfxVolume}</span>
              <span class="pause-setting-val" id="sfx-vol-val">${Math.round(r.sfxVolume*100)}%</span>
            </label>
            <input class="pause-setting-slider" id="sfx-vol-slider" type="range" min="0" max="100" value="${Math.round(r.sfxVolume*100)}" />
          </div>

          <!-- Music Volume -->
          <div class="pause-setting-row">
            <label class="pause-setting-label" for="music-vol-slider">
              <span>${m.pause.musicVolume}</span>
              <span class="pause-setting-val" id="music-vol-val">${Math.round(r.musicVolume*100)}%</span>
            </label>
            <input class="pause-setting-slider" id="music-vol-slider" type="range" min="0" max="100" value="${Math.round(r.musicVolume*100)}" />
          </div>

          <!-- Show Damage Numbers -->
          <label class="pause-setting-checkbox">
            <input type="checkbox" id="show-damage-toggle" ${r.showDamageNumbers?"checked":""} />
            <span>${m.pause.showDamageNumbers}</span>
          </label>

          <!-- Text Size -->
          <div class="pause-setting-row">
            <label class="pause-setting-label" for="text-scale-select">
              <span>${m.pause.textSize}</span>
            </label>
            <select class="pause-setting-select" id="text-scale-select">
              ${o}
            </select>
          </div>
        </div>
      `}else this.currentView==="controls"?(t=m.pause.controlsTitle,e=`
        <div class="pause-controls-list">
          <div class="pause-controls-row">
            <span>${m.pause.moveCharacter}</span>
            <span><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / <kbd>Arrows</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${m.pause.interact}</span>
            <span><kbd>SPACE</kbd> / <kbd>ENTER</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${m.pause.inventoryKeys}</span>
            <span><kbd>I</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${m.pause.skillKeys}</span>
            <span><kbd>K</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${m.pause.masteryKeys}</span>
            <span><kbd>M</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${m.pause.questKeys}</span>
            <span><kbd>Q</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${m.pause.pauseKeys}</span>
            <span><kbd>ESC</kbd></span>
          </div>
        </div>
      `):this.currentView==="confirmQuit"&&(t=m.pause.confirmExitTitle,e=`
        <div class="pause-confirm-box">
          <span>${m.pause.confirmExitQuestion}</span>
          <span>${m.pause.confirmExitDetail}</span>
          <div class="pause-confirm-actions">
            <button class="pause-menu-btn pause-menu-btn--danger" id="confirm-quit-btn" type="button">
              ${m.pause.confirmSaveAndExit}
            </button>
            <button class="pause-menu-btn" id="cancel-quit-btn" type="button">
              ${m.common.cancel}
            </button>
          </div>
        </div>
      `);const s=this.currentView!=="menu"?`<button class="pause-menu-btn pause-back-btn" id="pause-back-btn" type="button">← ${m.common.back}</button>`:"";this.container.innerHTML=`
      <div class="pause-card">
        <div class="pause-card__header">
          <span class="pause-card__title" id="pause-title">${this.escape(t)}</span>
          ${s}
        </div>
        <div class="pause-card__content">
          ${e}
        </div>
      </div>
    `,this.bindEvents()}bindEvents(){var e,t,s,r,n,o,a;if(this.container)if((e=this.container.querySelector("#pause-back-btn"))==null||e.addEventListener("click",()=>{this.currentView="menu",this.render()}),this.currentView==="menu")(t=this.container.querySelector("#pause-resume-btn"))==null||t.addEventListener("click",()=>{var i;this.destroy(),(i=this.onResume)==null||i.call(this)}),(s=this.container.querySelector("#pause-settings-btn"))==null||s.addEventListener("click",()=>{this.currentView="settings",this.render()}),(r=this.container.querySelector("#pause-controls-btn"))==null||r.addEventListener("click",()=>{this.currentView="controls",this.render()}),(n=this.container.querySelector("#pause-quit-btn"))==null||n.addEventListener("click",()=>{this.currentView="confirmQuit",this.render()});else if(this.currentView==="settings"){const i=this.container.querySelector("#master-vol-slider");i==null||i.addEventListener("input",()=>{var _;const g=Number(i.value)/100;b.updateSettings({masterVolume:g});const I=(_=this.container)==null?void 0:_.querySelector("#master-vol-val");I&&(I.textContent=`${i.value}%`)});const u=this.container.querySelector("#sfx-vol-slider");u==null||u.addEventListener("input",()=>{var _;const g=Number(u.value)/100;b.updateSettings({sfxVolume:g});const I=(_=this.container)==null?void 0:_.querySelector("#sfx-vol-val");I&&(I.textContent=`${u.value}%`)});const x=this.container.querySelector("#music-vol-slider");x==null||x.addEventListener("input",()=>{var _;const g=Number(x.value)/100;b.updateSettings({musicVolume:g});const I=(_=this.container)==null?void 0:_.querySelector("#music-vol-val");I&&(I.textContent=`${x.value}%`)});const v=this.container.querySelector("#show-damage-toggle");v==null||v.addEventListener("change",()=>{b.updateSettings({showDamageNumbers:!!v.checked})});const p=this.container.querySelector("#text-scale-select");p==null||p.addEventListener("change",()=>{const g=Number(p.value);ae(g),re(g)})}else this.currentView==="confirmQuit"&&((o=this.container.querySelector("#confirm-quit-btn"))==null||o.addEventListener("click",async()=>{var i;await b.saveSession(),this.destroy(),(i=this.onQuitToMenu)==null||i.call(this)}),(a=this.container.querySelector("#cancel-quit-btn"))==null||a.addEventListener("click",()=>{this.currentView="menu",this.render()}))}destroy(){this.container&&(this.container.remove(),this.container=null)}escape(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}var f=(l=>(l.Villager="villager",l.QuestGiver="quest-giver",l.Merchant="merchant",l.Scholar="scholar",l.Banker="banker",l.ArenaMaster="arena-master",l.CareerAdvisor="career-advisor",l))(f||{});const J={"elder-aldous":{id:"elder-aldous",name:"Elder Aldous",title:"Village Elder",type:f.QuestGiver,mapId:"beginners-village",position:{x:620,y:500},spriteColor:9684477,dialogue:{default:["Greetings, young traveler. Knowledge is the sharpest weapon in our realm.","Study the ancient subjects, test your wits against the realm monsters, and honor our village."],questAvailable:["Ah, novice! Slimes are multiplying near the math groves.","Could you slay 2 slimes to keep our roads safe?"],questInProgress:["Have you taken care of those slimes yet? Keep your mind sharp in battle!"],questCompleted:["Magnificent work! You have proven both courage and knowledge."]},offeredQuestIds:["quest-slime-hunter"]},"scholar-lyra":{id:"scholar-lyra",name:"Scholar Lyra",title:"Chief Archivist",type:f.Scholar,mapId:"beginners-village",position:{x:300,y:250},spriteColor:12616956,dialogue:{default:["The Mathematics Building holds secrets to numbers, algebra, and logic.","True masters conquer monsters by solving questions with swift accuracy."],questAvailable:["Our students need slime samples to study organic chemical reactions.","Could you bring me 1 Slime Gel?"],questInProgress:["Still searching for that Slime Gel? Slay slimes in the hunting grounds."],questCompleted:["Incredible! This sample will advance our academic research greatly."]},offeredQuestIds:["quest-slime-sample","quest-side-lost-chalk"]},"chronicler-selene":{id:"chronicler-selene",name:"Chronicler Selene",title:"Keeper of the Realm's Memory",type:f.QuestGiver,mapId:"beginners-village",position:{x:300,y:560},spriteColor:3718648,dialogue:{default:["I record every chapter of this realm's story — including the parts not yet written.","Return when you are ready to begin the first page."],questAvailable:["Another chapter waits to be scribed, scholar. Will you take up the quill?"],questInProgress:["The next page is not finished. See the chapter through before we continue."],questCompleted:["Another chapter closed. Your deeds are recorded in full."]},offeredQuestIds:["quest-archivist-1-first-page","quest-archivist-2-lost-formula","quest-archivist-3-final-proof"]},"merchant-barnaby":{id:"merchant-barnaby",name:"Merchant Barnaby",title:"Village Provisioner",type:f.Merchant,mapId:"beginners-village",position:{x:750,y:520},spriteColor:16096779,dialogue:{default:["Welcome, adventurer! Browse my wares or sell your monster spoils.","Potions, weapons, and scholar armor—fair prices guaranteed!"]}},"treasurer-aurelius":{id:"treasurer-aurelius",name:"Treasurer Aurelius",title:"Village Banker & Investor",type:f.Banker,mapId:"beginners-village",position:{x:500,y:520},spriteColor:16436245,dialogue:{default:["Welcome to the Beginners Village Treasury and Municipal Vault!","Keep your hard-earned gold safe from monster perils, earn compound interest, and fund venture expeditions."]}},"gladius-the-bold":{id:"gladius-the-bold",name:"Arena Master Gladius",title:"Colosseum Sparring Arbiter",type:f.ArenaMaster,mapId:"beginners-village",position:{x:420,y:520},spriteColor:15680580,dialogue:{default:["Welcome to the Colosseum Sparring Grounds, challenger!","Test your academic wits in friendly duels against rival scholars under the Reverse Difficulty Rule."]}},"career-advisor-marisol":{id:"career-advisor-marisol",name:"Career Advisor Marisol",title:"Director of the Career Center",type:f.CareerAdvisor,mapId:"beginners-village",position:{x:740,y:580},spriteColor:16020150,dialogue:{default:["Welcome to the Career Center! Every hero here also masters a real-world trade.","Speak with me to discover the professions you can pursue — doctor, engineer, architect, and more.","Meet a profession’s requirements and you may enroll. Your profession level grows on its own, apart from your combat level."],questAvailable:["New to the working world? Let me walk you through your first steps.","Complete the Career Orientation so I know you are ready to choose a path."],questInProgress:["Take your time. Explore the professions, then check back with me."],questCompleted:["Well done! The working world is open to you now. Choose a profession you love."]},offeredQuestIds:["quest-career-orientation"],workplaceId:"career-center"},"academy-instructor-lena":{id:"academy-instructor-lena",name:"Instructor Lena",title:"Academy Faculty",type:f.Scholar,mapId:"beginners-village",position:{x:400,y:320},spriteColor:8246268,dialogue:{default:["The Academy sits beside our Library — classrooms, examinations, and research rooms.","Show me the interest and the grades, and the lecture halls will open to you."]},workplaceId:"academy"},"doctor-quinn":{id:"doctor-quinn",name:"Doctor Quinn",title:"Hospital Physician",type:f.Scholar,mapId:"beginners-village",position:{x:1e3,y:320},spriteColor:8843180,dialogue:{default:["I keep the Hospital running — healing takes steady hands and sharper answers.","If medicine calls to you, I can show you the wards and the work that awaits."]},workplaceId:"hospital"},"engineer-rurik":{id:"engineer-rurik",name:"Engineer Rurik",title:"Engineering Center Foreman",type:f.Scholar,mapId:"beginners-village",position:{x:1050,y:620},spriteColor:3718648,dialogue:{default:["The Engineering Center is where circuits are tamed and machines are made.","If engineering is your calling, I can show you the benches and the work that awaits."]},workplaceId:"engineering-center"},"architect-ines":{id:"architect-ines",name:"Architect Ines",title:"Architecture Studio Designer",type:f.Scholar,mapId:"beginners-village",position:{x:1050,y:180},spriteColor:15772668,dialogue:{default:["Every building begins as a drawing. The Architecture Studio is where that drawing is made.","Visit the studio if design and structures interest you — there is much to learn."]},workplaceId:"architecture-studio"},"forgemaster-durn":{id:"forgemaster-durn",name:"Forgemaster Durn",title:"Master of the Forge District",type:f.QuestGiver,mapId:"ironhold-gate",position:{x:600,y:450},spriteColor:11817737,dialogue:{default:["Welcome to Ironhold, traveler. Steel and science keep these walls standing.","The forges run hot — and so do the beasts that feed on them."],questAvailable:["Magma Hounds are wandering out of the Forge District and scorching our supply lines.","Cull 3 of them and I will see you rewarded."],questInProgress:["The hounds still prowl. Keep your questions sharp and your blade sharper."],questCompleted:["Aye, that will do. The Kingdom owes you a debt, scholar-smith."]},offeredQuestIds:["quest-forge-order"]},"chancellor-edmund":{id:"chancellor-edmund",name:"Chancellor Edmund",title:"Lord Chancellor of the Capital",type:f.QuestGiver,mapId:"golden-capital-plaza",position:{x:620,y:450},spriteColor:16569165,dialogue:{default:["Welcome to the Golden Capital, the beating heart of the realm’s commerce.","Coin flows as freely as questions here — mind both, and you will prosper."],questAvailable:["Rogue Ledger Golems are skewing the capital’s ledgers and shaking trade confidence.","Destroy 4 of them and the treasury shall reward you handsomely."],questInProgress:["The ledgers still run red. Balance the books, scholar — with steel if you must."],questCompleted:["Splendid. The capital’s accounts are honest once more. Take your due."]},offeredQuestIds:["quest-capital-levy"]},"merchant-cordelia":{id:"merchant-cordelia",name:"Merchant Cordelia",title:"Grand Bazaar Proprietor",type:f.Merchant,mapId:"golden-capital-plaza",position:{x:760,y:520},spriteColor:16096779,dialogue:{default:["Welcome to the Grand Bazaar, traveler! The finest wares in all the realm.","Browse my stock, or sell me your hard-won spoils — fair coin, always."]}},"banker-cassius":{id:"banker-cassius",name:"Banker Cassius",title:"Keeper of the Capital Vault",type:f.Banker,mapId:"golden-capital-plaza",position:{x:500,y:520},spriteColor:16436245,dialogue:{default:["The Capital Vault keeps your gold safe from the wilds — and puts it to work.","Deposit for interest, or underwrite a venture. The choice, as ever, is yours."]}},"archivist-mira":{id:"archivist-mira",name:"Archivist Mira",title:"Curator of the Capital Records",type:f.Scholar,mapId:"golden-capital-plaza",position:{x:340,y:250},spriteColor:12616956,dialogue:{default:["The Capital Records preserve ledgers, charts, and the arithmetic of the realm.","Every answer you master here sharpens the mind that governs a city."]}},"engineer-vesper":{id:"engineer-vesper",name:"Engineer Vesper",title:"Chief Magitech Engineer",type:f.QuestGiver,mapId:"arcane-city-plaza",position:{x:620,y:450},spriteColor:2282478,dialogue:{default:["Welcome to the Arcane Technological City, where spellcraft drives the machine.","Here science and sorcery are one discipline — and both are tested in battle."],questAvailable:["A rogue Mana Automaton has broken loose in the Mana Foundry and is destabilizing the grid.","Overload 5 of them and I will recalibrate your reward circuits personally."],questInProgress:["The foundry readings are still unstable. Neutralize those Automatons, scholar."],questCompleted:["Readings nominal. The grid holds — and the City owes you a debt of logic."]},offeredQuestIds:["quest-arcane-calibration"]},"scholar-aeon":{id:"scholar-aeon",name:"Scholar Aeon",title:"Archmage of Computational Lore",type:f.Scholar,mapId:"arcane-city-plaza",position:{x:340,y:250},spriteColor:8490232,dialogue:{default:["Every algorithm is a spell; every equation, an incantation.","The Logic Spire rewards minds that see the pattern beneath the arcane."]}},"artificer-nova":{id:"artificer-nova",name:"Artificer Nova",title:"Plaza Tinkerer",type:f.Villager,mapId:"arcane-city-plaza",position:{x:780,y:500},spriteColor:6809849,dialogue:{default:["Mind the loose conduits, traveler — the plaza hums with raw mana.","Between you and me, the tougher the question, the brighter the sparks."]}},"warden-thalia":{id:"warden-thalia",name:"Warden Thalia",title:"Last Warden of the Forgotten Lands",type:f.QuestGiver,mapId:"forgotten-crossroads",position:{x:620,y:450},spriteColor:9741240,dialogue:{default:["Few reach the Forgotten Lands, and fewer still return from the Ashen Wastes.","The questions here cut deeper than steel — only the truly learned endure."],questAvailable:["A Blight Horror roams the Ashen Wastes, corrupting what little life remains.","Put down 5 of them and I will see you rewarded for your courage."],questInProgress:["The wasteland still festers. Finish the Blight Horrors, scholar."],questCompleted:["The rot recedes. You have earned the respect of the Forgotten Lands."]},offeredQuestIds:["quest-forgotten-vigil"]},"hermit-orin":{id:"hermit-orin",name:"Hermit Orin",title:"Hermit of the Crossroads",type:f.Scholar,mapId:"forgotten-crossroads",position:{x:340,y:250},spriteColor:11051678,dialogue:{default:["I once studied the halls that became the Ruined Archive. Now I only study survival.","Mind the level difference — the deeper ruins do not forgive the unprepared."]}},"grand-arbiter-theron":{id:"grand-arbiter-theron",name:"Grand Arbiter Theron",title:"Master of the Colosseum",type:f.ArenaMaster,mapId:"colosseum-grounds",position:{x:600,y:450},spriteColor:16096779,dialogue:{default:["Only champions reach these sands. Whatever you survived to get here, it ends now.","Speak to me to enter a trial: an endurance gauntlet, a duel against the Grand Champion, a subject gauntlet, or a timed dash for the crowd."]}}};function dt(l){return J[l]}function Mt(l){return Object.values(J).filter(e=>e.mapId===l)}class ct{constructor(e={}){c(this,"container",null);c(this,"onClose");c(this,"activeTab","active");this.onClose=e.onClose}show(){this.destroy();const e=document.createElement("div");e.className="quest-modal",e.id="quest-modal",document.body.appendChild(e),this.container=e,this.render()}render(){var n,o,a;if(!this.container)return;const e=b.quests.getAllQuests(),t=e.filter(i=>i.status===A.InProgress||i.status===A.ReadyToTurnIn),s=e.filter(i=>i.status===A.Completed),r=this.activeTab==="active"?t:s;this.container.innerHTML=`
      <div class="quest-card">
        <div class="quest-card__header">
          <span class="quest-card__title">📜 Quest Journal</span>
        </div>

        <div class="quest-card__tabs">
          <button class="quest-card__tab ${this.activeTab==="active"?"quest-card__tab--active":""}" id="quest-tab-active" type="button">
            Active Quests (${t.length})
          </button>
          <button class="quest-card__tab ${this.activeTab==="completed"?"quest-card__tab--active":""}" id="quest-tab-completed" type="button">
            Completed (${s.length})
          </button>
        </div>

        <div class="quest-card__content">
          ${this.renderQuestList(r)}
        </div>

        <div class="quest-card__footer">
          <button class="quest-card__close-btn" id="quest-close-btn" type="button">
            Close
          </button>
        </div>
      </div>
    `,(n=this.container.querySelector("#quest-tab-active"))==null||n.addEventListener("click",()=>{this.activeTab="active",this.render()}),(o=this.container.querySelector("#quest-tab-completed"))==null||o.addEventListener("click",()=>{this.activeTab="completed",this.render()}),(a=this.container.querySelector("#quest-close-btn"))==null||a.addEventListener("click",()=>{var i;this.destroy(),(i=this.onClose)==null||i.call(this)})}renderQuestList(e){return e.length===0?`<div class="quest-card__empty">${this.activeTab==="active"?"No active quests. Talk to villagers in Beginners Village to find adventures!":"No completed quests yet."}</div>`:e.map(t=>{const s=oe(t.questId),r=(s==null?void 0:s.name)??t.questId,n=(s==null?void 0:s.description)??"",o=s!=null&&s.giverNpcId?dt(s.giverNpcId):void 0,a=o?o.name:(s==null?void 0:s.giverNpcId)??"Unknown";let i="quest-badge--in-progress",u="In Progress";t.status===A.ReadyToTurnIn?(i="quest-badge--ready",u="Ready to Turn In!"):t.status===A.Completed&&(i="quest-badge--completed",u="Completed");const x=t.objectives.map(p=>{const g=p.currentCount>=p.requiredCount;return`
              <div class="quest-objective ${g?"quest-objective--done":""}">
                <span>${g?"✓":"○"} ${this.escape(p.description)}</span>
                <span><strong>${p.currentCount}</strong> / ${p.requiredCount}</span>
              </div>
            `}).join("");let v="";if(s!=null&&s.rewards){const p=s.rewards,g=p.items&&p.items.length>0?p.items.map(I=>`${I.itemId} x${I.quantity}`).join(", "):"";v=`
            <div class="quest-rewards">
              ${p.combatExp>0?`<span class="quest-reward-pill">✨ ${p.combatExp} EXP</span>`:""}
              ${p.gold>0?`<span class="quest-reward-pill">🪙 ${p.gold} G</span>`:""}
              ${g?`<span class="quest-reward-pill">🎁 ${this.escape(g)}</span>`:""}
            </div>
          `}return`
          <div class="quest-entry">
            <div class="quest-entry__header">
              <span class="quest-entry__name">${this.escape(r)}</span>
              <span class="quest-badge ${i}">${u}</span>
            </div>
            <div class="quest-entry__desc">${this.escape(n)}</div>
            <div class="quest-entry__giver">Quest Giver: <strong>${this.escape(a)}</strong></div>
            <div class="quest-objectives">
              ${x}
            </div>
            ${v}
          </div>
        `}).join("")}destroy(){this.container&&(this.container.remove(),this.container=null)}escape(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}class ut{constructor(e={}){c(this,"container",null);c(this,"skillManager");c(this,"onClose");c(this,"onStateChange");c(this,"currentSubject",k.Mathematics);c(this,"selectedSkillId",null);this.skillManager=e.skillManager||b.skills,this.onClose=e.onClose,this.onStateChange=e.onStateChange;const t=G[this.currentSubject];t&&t.rootSkillIds.length>0&&(this.selectedSkillId=t.rootSkillIds[0])}show(){this.destroy();const e=document.createElement("div");e.className="skill-modal",e.id="skill-modal",document.body.appendChild(e),this.container=e,this.render()}render(){if(!this.container)return;const t=Object.values(G).filter(Boolean).map(o=>o?`
          <button class="skill-tab ${o.subject===this.currentSubject?"skill-tab--active":""}" data-subject="${o.subject}">
            ${this.getSubjectIcon(o.subject)} ${this.escape(o.name)}
          </button>
        `:"").join(""),s=this.renderTree(),r=this.renderDetail(),n=this.renderFooter();this.container.innerHTML=`
      <div class="skill-card">
        <div class="skill-header">
          <div class="skill-header__title">⚡ Subject Skill Trees & Mastery</div>
          <button class="skill-header__close" id="skill-close-btn">&times;</button>
        </div>
        <div class="skill-tabs">
          ${t}
        </div>
        <div class="skill-body">
          <div class="skill-tree-section">
            ${s}
          </div>
          <div class="skill-detail-section">
            ${r}
          </div>
        </div>
        <div class="skill-footer">
          ${n}
        </div>
      </div>
    `,this.bindEvents()}renderTree(){const e=G[this.currentSubject];if(!e)return'<div class="skill-tree-empty">No skill tree available for this subject.</div>';const t={};for(const[r,n]of Object.entries(e.nodes))t[n.tier]||(t[n.tier]=[]),t[n.tier].push(r);return Object.keys(t).map(Number).sort((r,n)=>r-n).map(r=>{const o=t[r].map(a=>{const i=H(a);if(!i)return"";const u=this.getSkillNodeState(i),x=this.skillManager.getSkillLevel(a),v=this.selectedSkillId===a;return`
              <div class="skill-node skill-node--${u} ${v?"skill-node--selected":""}" data-skill-id="${i.id}">
                <div class="skill-node__header">
                  <span class="skill-node__name">${this.escape(i.name)}</span>
                  <span class="skill-node__type-tag skill-node__type-tag--${i.type}">${i.type}</span>
                </div>
                <div class="skill-node__level">Rank: ${x} / ${i.maxLevel}</div>
                <div class="skill-node__status skill-node__status--${u}">
                  ${this.formatStatusLabel(u)}
                </div>
              </div>
            `}).join("");return`
          <div class="skill-tree-tier">
            <div class="skill-tree-tier__title">Tier ${r}</div>
            <div class="skill-tree-tier__nodes">
              ${o}
            </div>
          </div>
        `}).join("")}renderDetail(){if(!this.selectedSkillId)return'<div class="skill-detail__desc">Select a skill to view its requirements and details.</div>';const e=H(this.selectedSkillId);if(!e)return'<div class="skill-detail__desc">Skill definition not found.</div>';const t=this.skillManager.getSkillLevel(e.id),s=b.getPlayer(),r=b.mastery,n=b.currency,o=Math.min(e.maxLevel,t+1),a=e.levels[t>0?t:1],i=e.requirements,u=r.getMastery(e.subject),x=u.level>=i.minMasteryLevel,v=(i.minPlayerLevel??1)<=s.level,p=!i.goldCost||n.getGold()>=i.goldCost,g=[];if(i.prerequisiteSkillIds&&i.prerequisiteSkillIds.length>0)for(const T of i.prerequisiteSkillIds){const R=H(T),U=this.skillManager.getSkillLevel(T)>0;g.push(`
          <span class="skill-detail__req-item ${U?"skill-detail__req-item--met":"skill-detail__req-item--unmet"}">
            ${U?"✓":"✗"} Prerequisite: ${(R==null?void 0:R.name)||T}
          </span>
        `)}const I=this.skillManager.canUnlockOrUpgradeSkill(e,s,r,n),_=this.skillManager.getState().equippedActiveSkillIds.includes(e.id);return`
      <div class="skill-detail__content">
        <div class="skill-detail__header">
          <div class="skill-detail__title">
            <span>${this.escape(e.name)}</span>
            <span class="skill-node__type-tag skill-node__type-tag--${e.type}">${e.type}</span>
          </div>
          <div class="skill-node__level">Rank: ${t} / ${e.maxLevel}</div>
        </div>

        <div class="skill-detail__desc">
          ${this.escape((a==null?void 0:a.description)||"No description available.")}
        </div>

        <div class="skill-detail__stats">
          ${e.type==="active"?`<span>MP Cost: <b class="skill-detail__stat-val">${(a==null?void 0:a.mpCost)??0}</b></span>
                 <span>Cooldown: <b class="skill-detail__stat-val">${(a==null?void 0:a.cooldownTurns)??0} turns</b></span>`:`<span>Mode: <b class="skill-detail__stat-val">${e.availability.toUpperCase()}</b></span>
                 <span>Effects: <b class="skill-detail__stat-val">${this.formatEffects((a==null?void 0:a.effects)||[])}</b></span>`}
        </div>

        <div class="skill-detail__reqs">
          <div style="font-weight: 600; margin-bottom: 2px;">Requirements to Unlock/Upgrade:</div>
          <span class="skill-detail__req-item ${x?"skill-detail__req-item--met":"skill-detail__req-item--unmet"}">
            ${x?"✓":"✗"} Subject Mastery: Lv. ${i.minMasteryLevel} (Current: ${u.level})
          </span>
          <span class="skill-detail__req-item ${v?"skill-detail__req-item--met":"skill-detail__req-item--unmet"}">
            ${v?"✓":"✗"} Character Level: Lv. ${i.minPlayerLevel??1} (Current: ${s.level})
          </span>
          ${i.goldCost?`<span class="skill-detail__req-item ${p?"skill-detail__req-item--met":"skill-detail__req-item--unmet"}">
                  ${p?"✓":"✗"} Gold Cost: ${i.goldCost} G (Current: ${n.getGold()} G)
                </span>`:""}
          ${g.join("")}
        </div>
      </div>

      <div class="skill-detail__actions">
        ${t<e.maxLevel?`<button class="skill-action-btn" id="skill-upgrade-btn" ${I.canUnlock?"":"disabled"}>
                ${t===0?"✨ Unlock Skill":`⬆️ Upgrade to Rank ${o}`}
               </button>`:'<button class="skill-action-btn" disabled>⭐ Max Rank Reached</button>'}
        ${e.type==="active"&&t>0?_?'<button class="skill-action-btn skill-action-btn--unequip" id="skill-unequip-btn">❌ Unequip from Hotbar</button>':'<button class="skill-action-btn skill-action-btn--equip" id="skill-equip-btn">⚔️ Equip to Hotbar</button>':""}
      </div>
    `}renderFooter(){const e=le.calculatePassiveBonuses(this.skillManager,"pve"),s=this.skillManager.getState().equippedActiveSkillIds.map((r,n)=>{const o=H(r);return`<span class="skill-footer__hotbar-slot">[${n+1}] ${(o==null?void 0:o.name)||r}</span>`}).join("");return`
      <div class="skill-footer__passives">
        <span>Active Passive Bonuses:</span>
        <span class="skill-footer__passive-item">Def: +${e.flatDefense}</span>
        <span class="skill-footer__passive-item">Crit: +${e.critRatePercent}%</span>
        <span class="skill-footer__passive-item">MP Reduction: -${e.manaCostReductionPercent}%</span>
        <span class="skill-footer__passive-item">EXP: x${e.expMultiplier.toFixed(2)}</span>
      </div>
      <div class="skill-footer__hotbar">
        <span>Combat Hotbar:</span>
        ${s.length>0?s:"<span>(Empty)</span>"}
      </div>
    `}bindEvents(){var e,t,s,r;this.container&&((e=this.container.querySelector("#skill-close-btn"))==null||e.addEventListener("click",()=>{var n;this.destroy(),(n=this.onClose)==null||n.call(this)}),this.container.querySelectorAll(".skill-tab").forEach(n=>{n.addEventListener("click",o=>{const i=o.currentTarget.getAttribute("data-subject");if(i&&i!==this.currentSubject){this.currentSubject=i;const u=G[i];u&&u.rootSkillIds.length>0&&(this.selectedSkillId=u.rootSkillIds[0]),this.render()}})}),this.container.querySelectorAll(".skill-node").forEach(n=>{n.addEventListener("click",o=>{const i=o.currentTarget.getAttribute("data-skill-id");i&&(this.selectedSkillId=i,this.render())})}),(t=this.container.querySelector("#skill-upgrade-btn"))==null||t.addEventListener("click",()=>{var u;if(!this.selectedSkillId)return;const n=b.getPlayer(),o=b.mastery,a=b.currency;this.skillManager.unlockOrUpgradeSkill(this.selectedSkillId,n,o,a).success&&(b.saveSession(),(u=this.onStateChange)==null||u.call(this),this.render())}),(s=this.container.querySelector("#skill-equip-btn"))==null||s.addEventListener("click",()=>{var n;this.selectedSkillId&&this.skillManager.equipActiveSkill(this.selectedSkillId)&&(b.saveSession(),(n=this.onStateChange)==null||n.call(this),this.render())}),(r=this.container.querySelector("#skill-unequip-btn"))==null||r.addEventListener("click",()=>{var n;this.selectedSkillId&&this.skillManager.unequipActiveSkill(this.selectedSkillId)&&(b.saveSession(),(n=this.onStateChange)==null||n.call(this),this.render())}))}getSkillNodeState(e){const t=this.skillManager.getSkillLevel(e.id);if(t>=e.maxLevel)return"maxed";if(t>0)return"unlocked";const s=b.getPlayer(),r=b.mastery,n=b.currency;return this.skillManager.canUnlockOrUpgradeSkill(e,s,r,n).canUnlock?"available":"locked"}formatStatusLabel(e){switch(e){case"maxed":return"★ MASTERED";case"unlocked":return"✓ UNLOCKED";case"available":return"⚡ READY TO UNLOCK";case"locked":return"🔒 LOCKED"}}formatEffects(e){return e.map(t=>`${t.type.replace(/-/g," ")}: +${t.value}`).join(", ")}getSubjectIcon(e){switch(e){case k.Mathematics:return"📐";case k.Science:return"🔬";case k.GeneralKnowledge:return"🌍";case k.Programming:return"💻";case k.Physics:return"⚡";case k.Business:return"📈";default:return"📖"}}destroy(){this.container&&(this.container.remove(),this.container=null)}escape(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}class _t{constructor(e){c(this,"scene");c(this,"inputAdapter");c(this,"playerSprite");c(this,"hud",null);c(this,"activeInventoryPanel",null);c(this,"activeMasteryPanel",null);c(this,"activeQuestJournal",null);c(this,"activeSkillModal",null);c(this,"activePauseModal",null);c(this,"onQuitToMenu");c(this,"keyI");c(this,"keyM");c(this,"keyQ");c(this,"keyK");c(this,"keyEsc");this.scene=e.scene,this.inputAdapter=e.inputAdapter,this.playerSprite=e.playerSprite,this.onQuitToMenu=e.onQuitToMenu,this.initHUD(),this.initKeyboardShortcuts()}initHUD(){this.hud=new it({onOpenInventory:()=>this.toggleInventory(),onOpenSkills:()=>this.toggleSkills(),onOpenMastery:()=>this.toggleMastery(),onOpenQuests:()=>this.toggleQuests()}),this.hud.show()}initKeyboardShortcuts(){!this.scene.input||!this.scene.input.keyboard||(this.keyI=this.scene.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.I),this.keyM=this.scene.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.M),this.keyQ=this.scene.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.Q),this.keyK=this.scene.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.K),this.keyEsc=this.scene.input.keyboard.addKey(C.Input.Keyboard.KeyCodes.ESC),this.keyI.on("down",()=>{this.isTypingInInput()||this.toggleInventory()}),this.keyM.on("down",()=>{this.isTypingInInput()||this.toggleMastery()}),this.keyQ.on("down",()=>{this.isTypingInInput()||this.toggleQuests()}),this.keyK.on("down",()=>{this.isTypingInInput()||this.toggleSkills()}),this.keyEsc.on("down",()=>{this.isTypingInInput()||this.handleEscape()}))}isPanelOpen(){return this.activeInventoryPanel!==null||this.activeMasteryPanel!==null||this.activeQuestJournal!==null||this.activeSkillModal!==null||this.activePauseModal!==null}handleEscape(){if(this.activeInventoryPanel){this.closeInventory();return}if(this.activeSkillModal){this.closeSkills();return}if(this.activeMasteryPanel){this.closeMastery();return}if(this.activeQuestJournal){this.closeQuests();return}this.togglePause()}togglePause(){this.activePauseModal?this.closePause():this.openPause()}openPause(){this.freezePlayerMovement(),this.activePauseModal=new lt({onResume:()=>{this.closePause()},onQuitToMenu:()=>{var e;this.closePause(),(e=this.onQuitToMenu)==null||e.call(this)}}),this.activePauseModal.show()}closePause(){this.activePauseModal&&(this.activePauseModal.destroy(),this.activePauseModal=null),this.unfreezePlayerMovement()}isTypingInInput(){const e=document.activeElement;if(!e)return!1;const t=e.tagName.toLowerCase();return t==="input"||t==="textarea"||e.isContentEditable}toggleInventory(){this.activeInventoryPanel?this.closeInventory():(this.closeAllModals(),this.openInventory())}toggleMastery(){this.activeMasteryPanel?this.closeMastery():(this.closeAllModals(),this.openMastery())}toggleQuests(){this.activeQuestJournal?this.closeQuests():(this.closeAllModals(),this.openQuests())}openQuests(){this.freezePlayerMovement(),this.activeQuestJournal=new ct({onClose:()=>{this.closeQuests()}}),this.activeQuestJournal.show()}closeQuests(){this.activeQuestJournal&&(this.activeQuestJournal.destroy(),this.activeQuestJournal=null),this.unfreezePlayerMovement()}toggleSkills(){this.activeSkillModal?this.closeSkills():(this.closeAllModals(),this.openSkills())}openSkills(){this.freezePlayerMovement(),this.activeSkillModal=new ut({skillManager:b.skills,onClose:()=>{this.closeSkills()},onStateChange:()=>{var e;(e=this.hud)==null||e.refresh()}}),this.activeSkillModal.show()}closeSkills(){this.activeSkillModal&&(this.activeSkillModal.destroy(),this.activeSkillModal=null),this.unfreezePlayerMovement()}closeAllModals(){this.activeInventoryPanel&&this.closeInventory(),this.activeSkillModal&&this.closeSkills(),this.activeMasteryPanel&&this.closeMastery(),this.activeQuestJournal&&this.closeQuests(),this.activePauseModal&&this.closePause()}openInventory(){this.freezePlayerMovement();const e=b.getPlayer();this.activeInventoryPanel=new rt({manager:b.inventory,playerLevel:e.level,onClose:()=>{this.closeInventory()},onStateChange:()=>{var t;b.saveSession(),(t=this.hud)==null||t.refresh()}}),this.activeInventoryPanel.show()}closeInventory(){this.activeInventoryPanel&&(this.activeInventoryPanel.destroy(),this.activeInventoryPanel=null),this.unfreezePlayerMovement()}openMastery(){this.freezePlayerMovement(),this.activeMasteryPanel=new ot({manager:b.mastery,onClose:()=>{this.closeMastery()}}),this.activeMasteryPanel.show()}closeMastery(){this.activeMasteryPanel&&(this.activeMasteryPanel.destroy(),this.activeMasteryPanel=null),this.unfreezePlayerMovement()}freezePlayerMovement(){this.inputAdapter.setInputEnabled(!1),this.playerSprite.setVelocity(0,0)}unfreezePlayerMovement(){this.isPanelOpen()||this.inputAdapter.setInputEnabled(!0)}refreshHUD(){var e;(e=this.hud)==null||e.refresh()}destroy(){var e,t,s,r,n,o;this.keyI&&this.keyI.removeAllListeners(),this.keyM&&this.keyM.removeAllListeners(),this.keyQ&&this.keyQ.removeAllListeners(),this.keyK&&this.keyK.removeAllListeners(),this.keyEsc&&this.keyEsc.removeAllListeners(),(e=this.hud)==null||e.destroy(),this.hud=null,(t=this.activeInventoryPanel)==null||t.destroy(),this.activeInventoryPanel=null,(s=this.activeSkillModal)==null||s.destroy(),this.activeSkillModal=null,(r=this.activeMasteryPanel)==null||r.destroy(),this.activeMasteryPanel=null,(n=this.activeQuestJournal)==null||n.destroy(),this.activeQuestJournal=null,(o=this.activePauseModal)==null||o.destroy(),this.activePauseModal=null,this.inputAdapter.setInputEnabled(!0)}}function ht(l,e,t="down"){return l===0&&e===0?t:Math.abs(l)>Math.abs(e)?l>0?"right":"left":Math.abs(e)>0?e>0?"down":"up":t}function Ct(l,e,t,s=!1,r=!1,n=!1){const o=ht(l,e,t);if(n)return{state:"defeat",direction:o,animationKey:`player-defeat-${o}`};if(r)return{state:"hurt",direction:o,animationKey:`player-hurt-${o}`};if(s)return{state:"attack",direction:o,animationKey:`player-attack-${o}`};const i=l!==0||e!==0?"walk":"idle";return{state:i,direction:o,animationKey:`player-${i}-${o}`}}class mt{static initPlayerAnimations(e){if(this.texturesRegistered&&e.anims.exists("player-walk-down"))return;const{textures:t,anims:s}=e,r=28,n=36;[{dir:"down",eyeOffset:{x:0,y:0}},{dir:"up",eyeOffset:{x:0,y:-4}},{dir:"left",eyeOffset:{x:-4,y:0}},{dir:"right",eyeOffset:{x:4,y:0}}].forEach(({dir:a,eyeOffset:i})=>{const u=`player-frame-${a}-idle`;if(!t.exists(u)){const g=e.make.graphics({x:0,y:0});this.drawCharacterFrame(g,r,n,i,0,0),g.generateTexture(u,r,n),g.destroy()}const x=`player-frame-${a}-walk-1`;if(!t.exists(x)){const g=e.make.graphics({x:0,y:0});this.drawCharacterFrame(g,r,n,i,-2,1),g.generateTexture(x,r,n),g.destroy()}const v=`player-frame-${a}-walk-2`;if(!t.exists(v)){const g=e.make.graphics({x:0,y:0});this.drawCharacterFrame(g,r,n,i,2,-1),g.generateTexture(v,r,n),g.destroy()}const p=`player-frame-${a}-attack`;if(!t.exists(p)){const g=e.make.graphics({x:0,y:0});this.drawCharacterFrame(g,r,n,i,0,0,15680580),g.generateTexture(p,r,n),g.destroy()}s.exists(`player-idle-${a}`)||s.create({key:`player-idle-${a}`,frames:[{key:u}],frameRate:1,repeat:-1}),s.exists(`player-walk-${a}`)||s.create({key:`player-walk-${a}`,frames:[{key:x},{key:u},{key:v},{key:u}],frameRate:8,repeat:-1}),s.exists(`player-attack-${a}`)||s.create({key:`player-attack-${a}`,frames:[{key:p},{key:u}],frameRate:6,repeat:0})}),this.texturesRegistered=!0}static drawCharacterFrame(e,t,s,r,n,o,a=16638023){if(e.fillStyle(3900150,1),e.fillRoundedRect(2,8+o,t-4,s-10,4),e.fillStyle(1981066,1),e.fillRect(2,22+o,t-4,3),e.fillStyle(a,1),e.fillRoundedRect(4,2+o,t-8,12,3),r.y>=0){e.fillStyle(1976635,1);const i=t/2+r.x,u=9+r.y+o;e.fillRect(i-5,u,3,3),e.fillRect(i+2,u,3,3)}e.fillStyle(7877903,1),e.fillRect(4+n,s-4,7,4),e.fillRect(t-11-n,s-4,7,4),e.lineStyle(1.5,1516884,.9),e.strokeRoundedRect(2,8+o,t-4,s-10,4)}}c(mt,"texturesRegistered",!1);class Lt{constructor(e={}){c(this,"lastTriggerTime",0);c(this,"cooldownMs");c(this,"isLocked",!1);this.cooldownMs=e.cooldownMs??350}canTrigger(e=Date.now()){return this.isLocked||e-this.lastTriggerTime<this.cooldownMs?!1:(this.lastTriggerTime=e,!0)}setLocked(e){this.isLocked=e}isCurrentlyLocked(){return this.isLocked}reset(){this.lastTriggerTime=0,this.isLocked=!1}}function Et(l,e,t,s,r){const n=Math.abs(l-t),o=Math.abs(e-s);return Math.max(n,o)<=r}export{wt as B,de as D,_t as E,ft as H,Lt as I,It as P,pe as Z,mt as a,kt as b,xt as c,St as d,Ct as e,Mt as g,Et as i};
