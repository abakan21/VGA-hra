
Název projektu 

Stellar Drift 

Žánr 

3D arcade kosmická střílečka (score attack) 

Platforma 

Webový prohlížeč (desktop) 

Technologie 

WebGL 2 + Three.js + TypeScript 

Velikost týmu 

2 členové 

Předmět 

VGA — Vizuální grafické aplikace 

 

1. Cílová skupina 

Primární cílová skupina 

Věk: 15–35 let 

Platforma: desktop, webový prohlížeč (Chrome, Firefox, Edge) 

Zájmy: arcade střílečky, retro estetika, casual gaming 

Délka sezení: 5–15 minut (score attack model) 

Zkušenost: nezáleží — hra se učí intuitivně během prvních 30 sekund 

Sekundární cílová skupina 

Fanoušci synthwave estetiky — hra cílí na neonovou paletu (pink, cyan, purple), bloom efekty a 80s feeling 

Hodnotitelé kurzu VGA — projekt slouží zároveň jako demo principů probraných ve výuce 

Odůvodnění volby 

Arcade space shooter má nízký nástupní práh (ovládání WASD + myš zná každý PC hráč) a zároveň vysoký stropní potenciál na grafické efekty, které ve WebGL vyniknou. Cílová skupina je dostatečně široká pro viabilní hru, ale dostatečně úzká na to, abychom měli jasný vizuální směr. 

2. Mechanismus hry 

Gameplay loop 

Hráč pilotuje stíhačku v otevřeném sektoru vesmíru (cca 2000 × 2000 × 1000 jednotek). Každých 30 sekund se spawnne nová vlna nepřátel a asteroidů, které letí směrem k hráči. Hráč se musí pohybovat, uhýbat a střílet. Za zničené entity získává body. Hra končí, když hráči klesne HP na nulu. Cílem je maximalizovat skóre. 

Herní prostředí 

Otevřený vesmír — 3D sektor s měkkými hranicemi (vizuální warning při přiblížení k okraji) 

Asteroidy — statické/driftující překážky, lze zničit pro body 

Nepřátelské lodě — spawnovány ve vlnách, různé typy chování 

Hvězda — vzdálené slunce, slouží jako hlavní světlo a orientační bod 

Power-upy — náhodně dropnou ze zničených nepřátel/asteroidů 

Progrese a obtížnost 

Vlny — hra začíná vlnou 1, nová vlna každých 30 s 

Počet nepřátel — +1 každé 2 vlny 

Rychlost nepřátel — +5 % každé 3 vlny 

HP nepřátel — +10 % každou vlnu 

Boss — každá 5. vlna obsahuje jednoho elitního nepřítele 

Skóre — asteroid 10 b, drone 30 b, chaser 50 b, boss 200 b 

Ovládání 

Klávesa 

Akce 

W / S 

Pohyb vpřed / vzad 

A / D 

Pohyb do stran (strafe) 

Space / Ctrl 

Pohyb nahoru / dolů 

Myš 

Natáčení lodi (pitch, yaw) 

LMB 

Primární zbraň (laser) 

RMB 

Sekundární zbraň (raketa, 3 s cooldown) 

Shift 

Boost (spotřebovává energii) 

Esc 

Pauza / menu 

 

Win / Lose podmínky 

Win: neexistuje — hra je nekonečná (score attack) 

Lose: HP hráče klesne na 0 → Game Over obrazovka s výsledným skóre a tlačítky Play Again / Main Menu 

3. Funkce projektu 

Funkce jsou rozděleny do tří priorit podle metody MoSCoW. Začneme implementovat MUST HAVE, teprve po jejich dokončení přejdeme na vyšší úrovně. Tím zajistíme, že budeme mít funkční projekt i v případě časového skluzu. 

 

MUST 

Hlavní menu (Start, Quit) 

MUST 

3D herní scéna se skyboxem a osvětlením 

MUST 

Plynulý 6DOF pohyb hráče (WASD + myš) 

MUST 

Primární zbraň — laserové projektily 

MUST 

Procedurálně rozmístěné asteroidy 

MUST 

Systém kolizí a damage modelu 

MUST 

HUD s HP, energií a skóre 

MUST 

Game Over obrazovka s výsledným skóre 

MUST 

Spawn medkitu a bonusu 

SHOULD 

Nepřátelé typu Chaser (útočí zblízka) a Drone (krouží) 

SHOULD 

Sekundární zbraň — raketa se samonaváděním 

SHOULD 

Vlnový systém s rostoucí obtížností 

SHOULD 

Particle efekty (exploze, trysky, laserové stopy) 

SHOULD 

Post-processing: bloom, vignette, FXAA 

SHOULD 

Minimapa v HUDu 

SHOULD 

Boss fight každých 5 vln  

NICE 

Power-upy (health, triple shot, štít) 

NICE 

Audio — SFX a ambient hudba 

NICE 

Lokální high-score tabulka 

 

4. Algoritmy a jejich fungování 

Tato sekce popisuje, jak klíčové části hry budou technicky fungovat. 

4.1 Hlavní herní smyčka (game loop) 

Použijeme pattern Fixed timestep update + variable render. Tento přístup odděluje herní logiku od snímkové frekvence — hra běží stejně rychle na monitoru s 60 Hz i 144 Hz. 

Update běží vždy pevných 60× za sekundu (fyzika, AI, kolize) 

Render běží tak rychle, jak dovolí prohlížeč, s interpolací pro plynulost 

Accumulator pattern — shromažďuje čas mezi framy a spustí správný počet update kroků 

 

 

 

4.2 Detekce kolizí 

Kolize jsou řešené metodou sphere-sphere (každá entita má obalovou kouli). Dva objekty kolidují, pokud je jejich vzdálenost menší než součet jejich poloměrů. 

Optimalizace: porovnáváme čtverce vzdáleností místo počítání odmocniny (√ je drahá operace) 

Broad phase: pro ~100 entit stačí naivní O(n²). Kdyby byl výkonový problém, přidáme spatial hashing nebo octree. 

4.3 Procedurální generování asteroidů 

Asteroidy jsou rozmístěny pomocí Poisson-disk samplingu, který zaručí, že nejsou příliš blízko sebe. Generátor zkouší náhodné body v sektoru a akceptuje jen ty, které mají minimální vzdálenost od všech již umístěných. 

Variabilita: 3–5 předpřipravených meshů, náhodná rotace, náhodné měřítko 1.0–3.0 

Úhlová rychlost: každý asteroid pomalu rotuje kolem náhodné osy 

Rendering: InstancedMesh — stovky asteroidů v jediném draw callu (obrovská úspora výkonu) 

4.4 AI nepřátel 

Implementujeme dva typy AI, každý s jiným chováním: 

Chaser — letí přímo k hráči; když je v dostřelu, střílí. Rychlost interpolovaná pomocí lerp, aby nebyly trhavé změny směru. 

Drone — udržuje optimální vzdálenost od hráče (orbit radius). Když je daleko, přibližuje se; když je blízko, oddaluje; když je v rozsahu, krouží kolmo ke směru k hráči. 

4.5 Samonaváděcí raketa 

Raketa používá zjednodušenou proportional navigation: v každém frame se její směr otáčí o omezený úhel směrem k cíli (slerp mezi aktuálním a žádoucím směrem). Cíl se vybírá v okamžiku výstřelu jako nejbližší nepřítel v 60° kuželu před lodí hráče. 

4.6 Particle systém 

Pro efektivitu používáme object pool pattern — předalokujeme 500 částic na začátku hry a recyklujeme je (namísto neustálého vytváření a zahazování objektů, což by přetěžovalo garbage collector). 

Emit: při explozi se odemkne z poolu N volných částic, nastaví se jim pozice, náhodná rychlost a životnost 

Update: každý frame se aktualizuje pozice, aplikuje damping, sníží se životnost; po vypršení se částice vrátí do poolu 

Render: všechny aktivní částice jako geometrie typu Points v jediném draw callu, custom fragment shader pro fade-out 

4.7 Custom shadery 

Hologramový štít — kombinace Fresnel efektu (okraje svítí více) a animované sinusoidy (vlna putuje po povrchu) 

Triplanar mapování asteroidů — protože asteroidy nemají UV souřadnice (generované tvary), textura se aplikuje ze tří směrů (XY, YZ, XZ) a míchá se podle normály 

Rim light na lodi — zvýraznění kontur proti tmavému pozadí vesmíru 

4.8 Post-processing pipeline 

Po vyrenderování scény projde obraz řetězcem efektů: Scene → Bloom → Film grain → Vignette → Screen. 

Bloom — světlé pixely (threshold 0.8) rozsvítí okolí; klíčový efekt pro synthwave feeling 

Film grain — jemný šum přidává retro charakter 

Vignette — ztmavení rohů, zaměření pozornosti na střed obrazu 

4.9 HUD 

HUD je implementovaný jako 2D Canvas overlay nad WebGL canvasem (není součástí 3D scény). Umožňuje rychlé kreslení bez 3D transformací. Minimapa zobrazuje pozice nepřátel jako barevné tečky v kruhovém radarovém zobrazení, kde je hráč vždy ve středu. 

Entity systém a datové modely 

Code review pull requestů 

Testování a bug fixing 

 
