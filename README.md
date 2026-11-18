# Cello: Ashes of the Fallen

Ett 3D-äventyr i världen The Shattered Realm, flytande öar i en evig storm, byggt med [Three.js](https://threejs.org) och spelbart direkt i webbläsaren.

**Version:** prototyp 0.21.3 · The Crown of Othrys (spelets final: Mount Othrys, den sista fängelsehålan, Kronos och slutet; 0.21.1: spelet står på egna ben, utan lån från andra spel)

Spelet är på engelska. Kommentarerna i koden och den här filen är på svenska.

## Spela

Spelet behöver ingen installation, bara en enkel webbserver (webbläsare tillåter inte moduler från `file://`).

```bash
npm start            # startar en server på http://localhost:8080
```

Alternativt: aktivera **GitHub Pages** för repot (Settings → Pages → Deploy from branch → `main` / root), så går spelet att spela på `https://<användarnamn>.github.io/<repo>/`.

En fristående version (en enda HTML-fil med all kod) byggs med:

```bash
npm install          # en gång, hämtar esbuild
npm run build:artifact   # → build/play.html
```

### Bygga om modellerna

Modellerna i `models/pack.bin` byggs av Elias skulpturer. Behövs bara när en modell eller dess målning ändras:

```bash
pip install trimesh fast-simplification rtree playwright
python3 tools/models/dump_fbx.py Boss1.fbx:boss1 ...   # FBX → tools/models/src/*.ply (en gång per ny FBX)
python3 tools/models/build_models.py                    # → models/pack.bin
python3 tools/hero/paint.py                             # → models/cello-hero.bin (Cello på startmenyn)
```

## Vad är nytt i 0.21.3: lugnare menyljud

- **Inget ljud när musen glider över knappar.** På startskärmen (New Game, Load Game …), i pausmenyn, på pausknappen och i väskan låter det nu bara när man klickar.
- **Ett mjukare klickljud.** De skarpa klippen för val, markör och tillbaka är utbytta mot en varm, dämpad klang (två sinustoner i kvint med mjuk början och lugn utklingning). Klicket på föremål i väskan är dämpat.
- Alla val låter, även de som inte hade något eget ljud (t.ex. Options och How to Play), eftersom ljudet förut kom från hovern.
- Ett nytt test (`t123`) för musen över knapparna och för klicken.

## Vad är nytt i 0.21.2: buggfixar

- **The Hollow Cave är inhägnad.** Grottans väggar var stora stenblock med glipor emellan, och genom dem kunde Cello gå ut i bergets mörka inre. Nu går en osynlig vägg i ett band precis utanför alla gångar och salar.
- **Grumble svävar inte längre.** Han letade bara efter marken 40 centimeter under sig, så när han sprang över en kant blev han hängande i luften. Nu letar han flera meter ner, går inte upp på staket, lådor eller väggar, går runt hinder när han kommer springande, och dyker upp bakom Cello om han fastnar.
- **Djuren** (getter, kor, höns, hästen och kamelerna) står på det som faktiskt finns under dem och går inte igenom staket och lådor.
- **Alla staket stoppar Cello.** Förut hade bara två av staketen kollision; resten gick att gå rakt igenom (trädgården hemma, åkern på ranchen, Willowmere och renfållan i Rimeholt). Öppningarna i staketen finns kvar.
- Ett nytt test (`t122`) går ut i alla riktningar från tio platser i grottan, kontrollerar staketet hemma och kallar på Grumble från olika höjder.

## Vad är nytt i 0.21.1: på egna ben

Spelet ska stå på egna ben, så alla hänvisningar till andra spel och konsoler är borta:

- Grafikläget med låg upplösning heter **Retro mode** (*Low resolution and big, chunky pixels*), i pausmenyn och på startskärmen.
- **Föremålen har egna namn:** *Healing Draught*, *Iron Key* och *Heart Ember*. Texten när Cello hittar något börjar med *Cello found...*
- Hela historiken är omskriven, så att inte heller äldre versioner hänvisar till andra spel.
- **Flöjtens sånger har egna namn och egna melodier:** *Waking Chant*, *Grumble's Call*, *Sunturn Hymn* och *Lament of Rain*. Tonerna är nya, och den låga tonen visas som ◆.
- **Musikfilerna har nya namn:** *Fields at Dawn*, *Whispers of the Hollow Woods* och *The Hollow Mask Watches*.
- Kommentarerna i koden, README och beskrivningen i `package.json` jämför inte längre med andra spel.

## Vad är nytt i 0.21: The Crown of Othrys (finalen)

Spelet har nu ett slut. Efter Frostgiant's Maw går Kronos österut, och isbron på The Frostmarchs östra sida leder dit.

- **Mount Othrys** (`src/regions/othrys.js`, x 32000): titanernas berg, kal sten under ett evigt åskväder. Seren följer med.
  - *Rheas härd*: ett läger vid bergets fot med en eld att vila och spara vid. Där väntar **Rhea**, titaninnan som en gång var Kronos drottning och gömde sitt yngsta barn för honom. Hon berättar vem Kronos är och hur han kan besegras.
  - *De fallna titanerna*: fyra brutna kolosser längs vägen (Typhon, Oceanus, Atlas och Kronos själv) med inskrifter.
  - *Sidouppdraget The Caged Hearts*: fem burar med hjärtan som titanerna tog från folket i byarna (Ida, Tomas bagaren, gamle Wilhelm, Saga och Eli). Varje hjärta säger något när buren öppnas, och flyger till Rheas härd. Alla fem ger en hjärtbehållare.
  - Berget med en krona av svarta spetsar och lila ådror, och porten mellan två kolosser i dess västra fot.
- **The Crown of Othrys** (`src/othrys.js`, `src/othryskit.js`): den sista fängelsehålan, där varje relik behövs.
  - *The Titans' Stair*: ett ras av titansten (hammarens markslag krossar det) döljer den lilla nyckeln, och en vägg av lila stormkristall (treuddens anfall) döljer kartan. Bakom den låsta dörren: en klyfta på elva meter som bara går att ta sig över genom att springa längs väggen med sandalerna.
  - *The Hall of Chains*: titanernas fängelse. Väster: rimfrost och en tryckplatta (masken). Öster: ljus genom ett hål i taket och en slöja av Kronos mörker som brinner upp när Cello står i ljuset och riktar prismat mot den. Där ligger Titan Key. En stormkristall till döljer 60 skärvor.
  - *The Throne of Othrys*: toppen av berget, under öppen himmel.
- **Kronos**, kungen av titanerna: en jätte av sten, storm, hav och is med en skära och en krona av is. Tre titanhjärtan skyddar honom, och varje hjärta krossas med en relik:
  - *stormhjärtat* (gult) svävar lågt runt hans fötter: hammarens markslag;
  - *havshjärtat* (grönt) far runt salen: treuddens anfall;
  - *frosthjärtat* (vitt) står bakom rimfrost: kasta skuggan dit, byt plats och hugg.
  - Han slår med skäran runt sig (hoppa eller rulla), kallar ner blixtar där Cello står och skickar vågor av havsvatten över golvet (hoppa över dem). När alla tre hjärtana är krossade faller han på knä, och kristallen i bröstet kommer inom räckhåll. Tre gånger.
- **Det femte valet och slutet** (`src/othrysstory.js`, `src/ending.js`): Kronos krona ligger vid Cellos fötter, full av hjärtan. *Krossa kronan* eller *ta kronan*. Sedan berättas vad som hände, sida för sida, och det beror på alla valen: Maren (prologen), Typhon, Ketos, Loke och kronan. Det finns tre slut (*Dawn*, *Ashes* och *Crowned*). Sedan rullar eftertexterna, och Cello vaknar i sin säng hemma, som i början. Efteråt är Ida, Marens mor, hemma i Aetheria, åskan över berget har tystnat, och folk har nya saker att säga.

### Polering i 0.21

- **Fler sidouppdrag i byarna** (`src/sidequests.js`): *Button the Bear* (Mira i Willowmere har tappat sin nalle på The Stormvale) och *Pell's Lost Crate* (Pells låda med lyktolja föll av kärran vid den fallna kolossen).
- **Mer liv** (`src/barks.js`): när Cello går förbi någon säger de något kort i en pratbubbla, med mummel. Vad de säger beror på hur långt in i berättelsen han har kommit. Flockar av fåglar cirklar över de fridfulla öarna, och vita måsar över havet.
- **Kartan**: översikten över riket visar nu också The Galecrown, havet, The Frostmarch och Mount Othrys.
- **Buggjakt**: ett nytt test går igenom alla ingångar i alla områden och kontrollerar att Cello står på marken, inte faller och inte sitter fast.

## Vad var nytt i 0.20: Homecoming

- **Öppningen.** Ett nytt spel börjar med en berättelse över svart bakgrund, sida för sida: gudarna som lämnade världen, reliker som fortfarande har kraft, titanerna som kom ur stormen, och Cello, pojken på ön vid skogsbrynet söder om Hollowbrook. Enter visar nästa sida, Esc hoppar över allt. Sedan ligger Cello och sover i sin säng tills en explosion skakar huset. Skärmen blixtrar, damm faller från taket, han far upp, ett skrik hörs från byn ("HELP! Somebody... please, help us!") och fönstren lyser orange av elden. Efter det styr spelaren själv och går ut genom dörren.
- **Maren i famnen.** I prologen svävade Maren i luften bredvid Cello. Nu ligger hon tvärs över hans underarmar: benen över den ena armen, ryggen mot den andra och huvudet mot hans axel. Hennes höft räknas ut så att hon hamnar i hans famn oavsett figurens mått.
- **Kistorna.** Locket vreds förut nästan två radianer runt sin nedre bakkant och for bakåt genom väggen bakom kistan, på alla kistor. Nu vrids det runt gångjärnet på ovansidan och stannar en bit före lodrätt (ungefär 75 grader), så ingen del hamnar bakom kistans rygg. Öppningen har också blivit bättre: locket skallrar till, slår upp med en liten överstegring och studsar mot gångjärnet, och ett gyllene sken stiger ur kistan. Samma kod (`src/chestlid.js`) används av alla kistor: i världen, fästningen, pyramiden och alla nya fängelsehålor.
- **Cellos hus är värt att komma hem till:**
  - *Grytan över härden*: en gång om dagen kokar Cello svampsoppa. Fulla hjärtan, och resten hälls i en flaska (en Healing Draught).
  - *Slipstenen* vid dörren: slipar svärdet till fullt, gratis. En bruten klinga går inte att laga.
  - *Oljetunnan*: en gång om dagen fyller han lyktan och en tom oljeflaska med kådolja.
  - *Relikhyllan* på högra väggen: varje relik Cello hittar (hammaren, sandalerna, prismat, treudden, masken) står där sedan.
  - *Korgen vid dörren*: efter varje avklarad fängelsehåla lämnar någon en gåva med ett brev, skärvor och en dryck. Kommer Cello hem till ön när en gåva väntar säger spelet till.
  - Sängen finns kvar som förut: vila, spara och sova till morgonen.
- **Sköldarmen (0.20.1).** När Cello höll upp skölden pekade underarmen rakt fram ur magen. Nu lyfts överarmen framåt och ut med armbågen åt sidan, och underarmen går tvärs över bröstet i bröstets höjd, som hos en riktig sköldbärare. Näven sitter framför bröstet och skölden framför den.
- **Vänster överarm (0.20.2).** När skölden lyftes drogs bitar av bröst, remmar och bälte ut i långa bruna trådar mot näven. Det var rester av skulpturens överarm, som var hopsydd med bålen. Nu klipps överarmen bort ur skulpturen (`cutLeftUpperArm` i `src/heroRig.js`) och byggs som fasta delar, precis som underarmen: hud, en axelkula med läderskiva och en rem. Hörn på bålen som hade fått armens vikt följer nu bålen.

## Vad var nytt i 0.19: Hearth Lullaby (pausmenyn)

- **Pausmenyn** (`src/pause.js`): öppnas med <kbd>Esc</kbd>, <kbd>P</kbd> eller den runda knappen uppe till höger (och när musen släpps med Esc). Spelet står helt stilla medan den är öppen.
  - *Resume*, *Save Game* (sparar i den fil man spelar), *Options* (musik- och ljudvolym, retroläge, konturer, skuggor; ändringarna sparas direkt), *Controls* (alla tangenter) och *Quit to Title* (med frågan *Save and Quit* / *Quit without Saving*).
  - Den visar var Cello är och hur länge man har spelat. Samma klick- och reglageljud som startmenyn.
- **Pausmenyns egen låt** (`src/pausetheme.js`): *Hearth Lullaby*, en vaggvisa i 3/4-takt i d-moll, 76 slag i minuten, sexton takter som går runt. En speldosa spelar melodin, en harpa plockar ackorden (Dm, B♭, F, C, Dm, Gm, B♭, A …) och en mjuk stråkmatta ligger under, med efterklang. Allt spelas med kod. Spelets egen musik tystnar så länge menyn är öppen.
- <kbd>P</kbd> öppnar nu pausmenyn; retroläget slås på och av i *Options*.

## Vad är nytt i 0.18: Sound & Feel

Nästan alla ljud är nu riktiga inspelningar ur ljudpaketet Elias skickade (*400 Sounds Pack*), plus klippet *dad-potato-hello* (freesound). `tools/audio/build_sfx.py` trimmar, normaliserar och gör om dem till MP3 i `sounds/sfx.json` (119 klipp, ungefär 0,8 MB), som bakas in i den fristående versionen. `src/audio.js` spelar inspelningen när det finns en, och kodens eget ljud annars (eller båda, i lager).

- **Menyer**: klick, hovring, tillbaka och nej på startskärmen; av/på-knappar låter som strömbrytare; reglagen för musik och ljud klickar i en ton som stiger med värdet. Väskan öppnas och stängs som en bok, föremålen poppar i stigande toner, kartan prasslar.
- **Mummel**: när någon pratar spelas korta korn (60–110 ms) ur vokalerna i röstklippen (man_0–man_10), varannan baklänges, i figurens tonläge och med lite melodi. (Klippen är en man som räknar, så de spelas aldrig hela: då hördes siffrorna, 0.18.1.) Varje figur har sina egna stavelser; barn är ljusa, jättar och gudar djupa och mörka (med ett murrande lager), andar och Loke har eko. Hollis, Gull, Bjarke, Hamid och Fenwick säger "hello" när man börjar prata med dem.
- **Cello**: han rapar efter en dryck (och om han står still länge), och hostar när han fryser.
- **Strid**: svischar, hugg, klang mot sköldar, smällar och puffar när asklingar försvinner.
- **Världen**: fotsteg efter underlaget (gräs, snö, trä, grus, sten), dörrar, lås och nycklar, kistor, krukor, vatten, tändstickor, sten som skrapar, is och glas.
- **Jinglar**: föremål, hjärtan, sparande, vila vid elden, uppdrag (nya och klara), sånger och när Cello faller.

Röstklippen ur *LEGO Star Wars: The Skywalker Saga* används inte: de är inspelningar ur ett köpt spel, och får inte läggas in i ett spel som delas. Mumlet görs i stället av röstklippen i ljudpaketet.

## 0.17.1: Cellos sköld

Skölden satt ihopsmält med vänster arm och bröstet i skulpturen, så den töjdes ut och såg trasig ut när armen rörde sig. Nu klipps skölden och vänster underarm bort ur skulpturen (`tools/models/hero.py`), och byggs i spelet som fasta delar på underarmen (`src/heroRig.js`): en rund sköld av plankor med järnkant, buckla och nitar, och en underarm med läderkrage och näve. När Cello håller upp skölden vrids den så att framsidan pekar rakt fram, framför näven.

## Vad är nytt i 0.17: Steel & Shadow

En stor uppdatering av striderna och av hur världen ser ut.

**Striderna** (`src/foes.js`, `src/enemies.js`)
- **Mer liv**: alla fiender tål mer. Varje område och fängelsehåla har en nivå (0–5) efter hur långt in i spelet den ligger: Hollowbrook och The Stormvale är nivå 0 (6 i liv, mot 4 förut), The Tempest Bastion nivå 1, öknen och pyramiden nivå 2, The Galecrown och tornet nivå 3, havet och templet nivå 4 och norr nivå 5 (12 i liv, och mer för de tunga sorterna).
- **Nya sorters asklingar**, som dyker upp gradvis:
  - *Ashling Brute* (från nivå 1): större och tyngre, med en järnklubba med spikar. Slår ett helt hjärta (ett och ett halvt längre fram) och knuffas knappt bakåt.
  - *Venomfang* (från nivå 2): grön, med gifttänder och en skorpionsvans. Slaget förgiftar Cello: hjärtana blir gröna och han tappar ett halvt hjärta varannan sekund i sex sekunder (han dör inte av giftet). En Healing Draught eller en vila vid elden botar.
  - *Ramhorn* (från nivå 3): krökta horn. Skrapar med foten och rusar rakt mot Cello på avstånd. Träffar den kastas Cello långt bakåt; skölden stoppar den och gör den yr, och rusar den in i en vägg blir den också yr.
  - *Tide Reaver* (från nivå 4): ett hullingförsett spjut som når längre och slår ett helt hjärta.
  - *Rimeling* (nivå 5): av is. Slaget kyler Cello, som blir långsam en stund och fryser lite mer.
- Fladdermössen tål två hugg från havet och framåt. Frostgiant's Maw har fått fler vakter.
- **Livmätare**: varje fiende har en liten mätare över huvudet (syns när den är arg, skadad eller när Cello låser på den). De nya sorterna har sitt namn över mätaren. **Bossar** har en stor mätare nere på skärmen med namnet, och en gul rand som visar hur mycket liv som just gick förlorat.

**Grafiken** (`src/post.js`, `src/shadows.js`, `src/motes.js`)
- **Konturer**: ett efterbehandlingspass ritar mörka tuschlinjer där djupet hoppar (runt figurer, hus, träd, stenar) och där ytor möts (kanter och hörn). Linjerna tonar bort på avstånd och i dimman, så att det inte blir plottrigt långt bort.
- **Skuggor i vrår**: hörn, springor och fötter mot marken blir lite mörkare (en enkel AO på djupet), och en svag vinjett i kanterna.
- **Riktiga skuggor**: solen och månen kastar skuggor från figurer, hus, pelare, träd, staket och stenar. Skuggkameran följer Cello (ungefär 70 × 70 meter) och flyttas i hela texlar så att kanterna inte darrar. Inomhus ligger den strax ovanför Cello, så att taket inte skuggar hela rummet. Med skuggor på kommer lite mer av ljuset från solen och mindre från himlen, så att de syns.
- **Liv i luften**: pollen som glittrar i solen, eldflugor på natten, glöd som stiger i öknen och damm i fängelsehålorna.
- **Inställningar**: *Outlines* och *Shadows* går att stänga av under Options (för långsamma datorer).

## Vad var nytt i 0.16: Frostgiant's Maw

Norr om The Galecrown går en ny bro (den öppnas när templet under havet är klart). Där ligger **The Frostmarch**, ett land av snö, och längst i norr en glaciär med huvudet av en frusen jätte.

- **Kyla** (`src/main.js`): ute i The Frostmarch fryser Cello sakta, fort i snöstorm (snön ligger tät och dimman tjock). En tänd lykta eller en eld håller kylan borta; helt nedkyld tappar han ett halvt hjärta i taget. Lampolja och oljeflaskor betyder mycket här. En blå frostkant syns runt skärmen när det blir kallt.
- **Snö och snöstorm** (`src/weather.js`): två nya väder i norr, med flingor som yr och en tät, vit dimma.
- **Is** (`src/player.js`): på *blank is* (den frusna sjön) halkar Cello och har dåligt fäste. På *glidis* glider han rakt fram, i en av fyra riktningar, tills han slår i något, och kan inte styra under tiden. Glidisen har rutor om två meter, och Cello dras mjukt mot mitten av sin ruta.
- **Nytt område: The Frostmarch** (`src/regions/frost.js`): renskötarbyn **Rimeholt** med långhus och en långeld, renar i en fålla, en frusen sjö, snötallar, och **Lokis röse** (en kista på en klippa bakom rimfrost). Seren följer med, och på isen åker hon skridsko.
- **Rimeholts folk**: den gamla **Sigrun** (om jättarna och Loke), renskötaren **Ylva** och fiskaren **Hakon**.
- **Sidouppdrag**: *The Lost Herd* (locka hem tre vilsna renar åt Ylva; hon ger Herder's Cloak, kylan kryper in hälften så fort) och *Thin Ice* (tina fiskaren Bjarke ur isen på sjön med den tända lyktan; Hakon ger två oljeflaskor).
- **Ny fängelsehåla: Frostgiant's Maw** (`src/maw.js`), fyra delar inne i jättens gap och strupe:
  - *The Frozen Jaw*: Glidsalen, 11 × 11 rutor glidis med isblock att stanna mot. Kartan ligger i en nisch, nyckeln på avsatsen i norr.
  - *The Turning Halls*: ett nav med en spak. Spaken vrider golvet och byter vilka två av fyra isportar som är öppna (norr och söder, eller öster och väster). Väster: Kylsalen, en till glidsal med nyckel nummer två. Öster: Rimsalen, där tryckplattan ligger bakom rimfrost.
  - *Hati's Den*: miniboss **Hati**, isvargen som jagar månen. Den är för snabb för svärdet: blockera språnget med skölden, eller rulla undan så att den glider vilse på isen. I andra fasen kastar den sig två gånger i rad. Efter Hati: Loki's Mask, rimfrostgallret och klyftan.
  - *The Throne of Thrym*: bossen **Thrym**, frostjättarnas kung, död och besatt av Kronos. Kronen är långt utom räckhåll. Men jätten slår mot det som rör sig: kasta skuggan, så krossar han den och klubban fastnar i isen. Då böjer han sig ner, och kristallen i kronan går att hugga.
- **Ny relik: Loki's Mask** (`src/shadow.js`): masken kastar Cellos skugga rakt fram (nio meter). Skuggan flyger igenom rimfrostgaller som Cello inte kommer igenom, landar och står kvar. Den är lika tung som Cello och håller ner tryckplattor. Tryck igen: Cello byter plats med den (över klyftor, genom galler, upp på klippor).
- **Det fjärde valet**: efter Thrym står Cellos skugga upp med Lokes mask och erbjuder ett avtal. *Lita på Loke* (skuggan flyger mycket längre, men Loke följer med) eller *vägra* (bandet bryts, och jättens sista andetag gör att kylan i norr aldrig mer biter).
- **Slutet**: mörkret i Thryms krona samlas över glaciären och tar form. Kronos har en kropp nu, byggd av det titanerna lämnade efter sig, och han går österut mot Mount Othrys.

Nytt i koden: `src/regions/frost.js`, `src/maw.js`, `src/frostkit.js` (glidis, isblock, rimfrost, navet med spaken, Hati och Thrym), `src/shadow.js` (Lokis skugga) och `src/froststory.js` (berättelsen i 0.16).

## Vad var nytt i 0.15: The Drowned Temple

Söder om The Galecrown har fiskarna lagat bron. Nedanför ligger **The Shattered Sea**, ett innanhav i en skål av klippa, och mitt i havet sticker en bruten treudd upp ur vattnet.

- **Simning** (`src/player.js`): Cello flyter på ytan i djupt vatten. Shift dyker, Space (hållen) simmar uppåt och Shift (hållen) nedåt. Mot en kant klättrar han upp av sig själv (eller med Space). Under ytan räcker luften en stund (bubblorna i mitten nertill); sedan gör det ont. Bubbelkällor på botten ger luft. Med tung vikt sjunker han och går på botten. Kameran under ytan blir blå och dimmig. Innan lektionen kan Cello inte simma.
- **Nytt område: The Shattered Sea** (`src/regions/sea.js`): fiskebyn Brinehollow på stranden, en pir, en fyr på en klippö, koraller, tång, fiskstim, jättemusslor och ett skeppsvrak på botten. Seren följer med och går bredvid Cello på land (hon simmar inte).
- **Simlektionen**: Nerissa på piren lär Cello simma (simma till den röda bojen och tillbaka). Sedan ror hon ut honom till ruinerna mitt i havet.
- **Nytt tempel: The Drowned Temple** (`src/temple.js`), fyra delar:
  - *The Sunken Gate*: Cello simmar in under vattnet. I Hall of Tides vrids ett tidvattenhjul (bara med fast mark under fötterna): högt vatten når de höga avsatserna, lågt vatten låter sigillen öppnas.
  - *The Drowned Galleries*: en lång tunnel helt under vatten (andas vid bubbelkällorna, se upp för sjöborrarna) och en cistern där tung vikt på en tryckplatta öppnar ett galler en kort stund.
  - *Karkinos' Grotto*: miniboss **Karkinos**, jättekrabban. Skalet tar inga hugg: lura den att rusa in i en korallpelare, eller vänd den på rygg med hammaren.
  - *The Throne of Tides*: bossen **Ketos**, Poseidons havsodjur, förvridet av Kronos. Töm tronsalen med treudden vid ett tidvattenaltare, så strandar Ketos, och hugg förbannelsen på dess huvud.
- **Ny relik: Poseidon's Corrupted Trident**: en stöt framåt (under vattnet skjuter Cello fram som en fisk), som slår sönder spröd korall och skadar det den träffar. Vid ett tidvattenaltare (E) stiger eller sjunker vattnet.
- **Det tredje valet**: efter Ketos kan Cello dra ut förbannelsen och befria Ketos (längre andetag), eller ta den svarta pärlan ur dess hjärta (treudden slår hårdare).
- **Slutet**: treudden var spiken i Kronos kista. Han vaknar och flyger norrut, mot frostjättarnas land.
- **Sidouppdrag**: tre svarta pärlor i jättemusslorna (Corwin ger Dykarens amulett, mycket längre andetag) och den slocknade fyren (tänd den med lyktan åt Gull).
- **Pengar**: kistorna ger mindre. De flesta ger 10–20 skärvor, ingen över 50 och bara tre ger 50. Belöningar från folk är också mindre.
- **Oljeflaskor**: hos Pell, Mags och Hamid går det att köpa en flaska lampolja att bära med sig (högst tre). Använd den från en knapp, eller låt Cello hälla i den själv när lyktan slocknar.

Nytt i koden: `src/water.js` (vattenytan, vågorna och ljusnätet på botten), `src/regions/sea.js`, `src/temple.js`, `src/templekit.js` (vattennivåer, hjul, altaren, sigill, bubbelkällor, korall, sjöborrar, Karkinos och Ketos) och `src/seastory.js` (berättelsen i 0.15).

## Vad är nytt i 0.14: The Windbound Spire

Titanerna vaknar. Efter nekropolen faller en titan ur stormen över Willowmere, och titankungen **Kronos** talar för första gången. Seren kommer till undsättning, och sedan följer hon med västerut.

- **Mjukare grafik**: texturerna jämnas ut (`soften` i `src/textures.js`) och filtreras mjukt i stället för pixligt, så att världen ser mindre ut som klossar. Retroläget (pixlar) är nu av som standard (går att slå på i inställningarna).
- **Ny region: The Galecrown** (`src/regions/galecrown.js`), över Stormbron väster om Stormreach (bron är stängd av vinden tills titanen har anfallit Willowmere). Seren har sitt läger där. Vägen till tornet går över en stenbro där vindbyarna blåser i takt (gå när det är lugnt, eller gör dig tung).
- **Nytt tempel: The Windbound Spire** (`src/spire.js`), fyra delar:
  - *The Gale Gate*: en trappa där vinden blåser nedför (gör dig tung med hammaren), och arkivet med kartan och en nyckel.
  - *The Hall of Winds*: ett schakt 44 m högt. Ventiler öppnar uppvindar som lyfter Cello mellan balkongerna, och med sandalerna springer man längs väggarna med bronsfjädrar.
  - *The Weaver's Loom*: miniboss **The Brass Weaver**, en spindelgolem av mässing som hänger i taket och faller som en sten. Fast i golvet är kärnan öppen. Hammarslaget gör den yr.
  - *The Crown of Storms*: under öppen himmel, bossen **Typhon**, stormtitanen. Näven slår mot plattformen: hugg runstenen på handleden tre gånger, så sjunker han ihop. Rid uppvinden till den övre ringen och hugg hjärtat. Andedräkten blåser Cello mot kanten (göm dig bakom pelarna), och blixtar slår ner där han står.
- **Ny relik: Hermes Wing Sandals** (knappen för föremål): snabbt läge, högre hopp och väggspring (spring och hoppa mot en vägg snett, hoppa igen för att ta fart från väggen). Sandalerna och hammarens tyngd tar ut varandra.
- **Moraliskt val**: när Typhon har fallit ber han om nåd. *Skona* honom och han berättar var Kronos sover (och vinden blir snällare: väggspringet räcker längre), eller *förgör* honom (100 skärvor och Kronos vrede).
- **Sidouppdrag**: Tobs drake (blåste bort till The Galecrown), Fenns brev till Seren, och de tysta klockorna i klocktemplet (tre klockkläppar gömda i regionen, och en skattkista med ett hjärta).
- Nya röster för Kronos och Typhon, och nya ljud (klockor, sandalerna, väggspring, tyfonen).

Nytt i koden: `src/regions/galecrown.js`, `src/spire.js`, `src/spirekit.js` (vindtemplets delar, uppvindar, ventiler, The Brass Weaver och Typhon), `src/chronicle.js` (berättelsen i 0.14: anfallet, Seren, valet och sidouppdragen) och modellen `weaver()` i `tools/models/people.py`.

## Vad är nytt i 0.13: ett nytt utseende

Elias skickade sina egna 3D-modeller (FBX från Blender), och nu används de i spelet. Modellerna saknade färger, texturer och skelett, så de förenklas, målas i delar och får ett skelett med mjuka leder (se `tools/models`).

| Del | Vad som händer |
| --- | --- |
| **Cello** | Hjälteskulpturen (huvudkaraktär.fbx) är nu Cello i spelet, med pannband, bröstpansar, skölden på armen och skulpturens svärd i handen. Han springer, hugger, blockerar och rullar som förut. Benen är nybyggda (skulpturen slutar vid låren), och ögonen är målade i ögonhålorna. Svärdet kortas när det går sönder |
| **Byborna** | Bybo-modellen bär nu Hollis, Odo, Fenwick, Hamid och Tarek, var och en i sina egna färger (luva, skägg, tröja) |
| **Seren** | En ny person: en vandrande svärdsflicka (Love_interest.fbx) som håller vakt med Doran vid Willowmeres västra port. Hon har egna frågor, ett dumt svar som gör henne sur och ett tips om nästa relik |
| **Hrungnir** | Bossen i fästningen är nu dvärgen (Boss1.fbx) med sin stenhammare. Glasögonen lyser när han vaknar, och stenhjärtat sitter som en runsten i bältesspännet |
| **Apophis** | Bossen i pyramiden är nu hydran (ormar.fbx): fem huvuden som reser sig ur hålen, vajar och hugger. Mittenhuvudet bär ädelstenen och slår ner när ljuset bränner det |
| **Ljus och färger** | En lugn dag är nu varm och disig: gyllene himmel, mjukt solljus och dimma i guld. Stormar, regn och natt behåller sina mörka färger |
| **Mark och gräs** | Gräsmarken har olivgröna och mossiga fläckar, torra strån och jord. Gräset är högre och tätare, i små klungor, och vajar i vinden (mer i regn och åska) |

Hajmannen (WaterbBoss.fbx) och spindelgolemen (Boss4.fbx) är förberedda i `tools/models/src` och sparas till kommande dungeons.

Nytt i koden: `src/skinned.js` (läser modellpaketet och bygger figurer med skelett), `src/heroRig.js` (Cello som skulptur), `src/peopleRig.js` (byborna, Seren, dvärgen och hydran), `models/pack.bin` och verktygen i `tools/models` (`dump_fbx.py`, `meshkit.py`, `hero.py`, `people.py`, `build_models.py`).

## Vad var nytt i 0.12: The Sunken Necropolis

Fas 9 i planen. Under sanden söder om pyramiden ligger en begravd gravstad. Den öppnar sig när pyramiden är klar: sanden framför mastabans dörr har sjunkit undan. Arkitekturen följer reliken, och rummen växlar mellan trånga gravgångar och väldiga, höga salar.

| Del | Vad som händer |
| --- | --- |
| **Anubis' Broken Scales** | Den tredje reliken. Med en knapptryckning växlar Cello mellan **de levandes och de dödas värld**. I de dödas värld blir bilden blek och grön, andebroar och andeplattformar syns och bär, och andar går att prata med. Det som bara finns bland de levande (falska väggar, bronsplattformar) bleknar och går att gå igenom. Vålnader finns bara i de dödas värld |
| **The Narrow Crypts** | Trånga gravgångar med benfyllda nischer där mumier slumrar (de är långsamma men tåliga). Hall of Jackals med en falsk vägg, ett översvämmat benhus där en sluss tömmer vattnet, och **Wepwawet, Schakalväktaren** i balsameringshuset: han tar sats och rusar, och kör han in i en vägg eller en sarkofag sitter han fast en stund. Efter honom ligger vågskålarna |
| **The Hall of Weighing** | En sal som är över tjugo meter hög, med vatten i tre nivåer. Två slussar höjer och sänker vattnet, och en flytande kista bär Cello upp mot gallerierna. Andebroar binder ihop gallerierna högt uppe, och vid botten av salen leder en låst dörr vidare |
| **The Paths of the Duat** | De dödas väg: en lång gång där marken växlar mellan andestenar och bronsplattformar, så att Cello hela tiden måste byta värld. Fjäderns kammare är en fälla med mumier och vålnader, och i den ligger **Ankh Key**, nyckeln till tronsalen |
| **Ammit, Devourer of hearts** | Bossen i The Hall of Two Truths. Hon är pansrad i de levandes värld: Cello lockar henne att rusa in i en pelare, och medan hon är bedövad syns hjärtat **bara i de dödas värld**. Tre hugg per gång. I andra fasen stiger vattnet och hon dyker och bryter upp under Cello, i den tredje kallar hon på vålnader. Efter striden visar sig Anubis själv |

Den som drunknar (Cello kan inte simma) börjar om vid kanten. Andar finns även utanför dungeonen: en i byn och en vid karavanen i öknen.

Nytt i koden: `src/realm.js` (de dödas värld), `src/necrokit.js` (vatten, slussar, flytande kistor, andebroar, Schakalväktaren och Ammit) och `src/necropolis.js` (dungeonens fyra delar). `enemies.js` har fått mumier och vålnader.

## Vad var nytt i 0.11: en levande värld

Fas 8 i planen. Världen reagerar nu på Cello, och den lever även när han står still.

| Del | Vad som händer |
| --- | --- |
| **Dag och natt** | Ett dygn tar 20 minuter. Ljuset, dimman och himlen följer klockan: solnedgång i skymningen, stjärnor och en blek måne i glipor mellan molnen på natten. Klockan och vädret syns uppe till vänster. Vid en eld kan Cello vila en stund, vänta in natten eller sova till morgonen. På natten blir musiken i byarna lugnare och fälten kusligare |
| **Väder** | Lugnt, regn, åska och dimma, och sanddis i öknen. Vädret byter med några timmars mellanrum och glider över mjukt. Regn syns och hörs, dimma döljer långt bort. **I åskväder söker blixten metall:** en ring på marken varnar, och den som står kvar tar två hjärtans skada. Sköldbärande asklingar förlorar skölden. Håller Cello Mjölnirs skärva med tung vikt **dricker hammaren blixten**, och nästa markslag blir dubbelt så stort |
| **Dialogträd med humör** | Folk har frågor som går att ställa i valfri ordning. En fråga som redan är ställd blir grå (det sparas). Ett av svaren är dumt: då blir personen arg (barn blir ledsna), samtalet tar slut, och efter det fnyser hen bara och vänder ryggen till, med en ikon över huvudet, tills en ny dag har börjat. Huvuduppdragen påverkas aldrig: det som måste sägas sägs ändå, med en sur kommentar först |
| **Folk går hem** | Vid halv nio på kvällen går Hollis och Tilly in i bondgården, och Mira, Tob och Fenwick in i sina hus i Willowmere. Det går att knacka på. Odo somnar på bänken på bron, Ilo vid elden i Aetheria. På morgonen kommer alla ut igen |
| **Flöjten** | Odo på Long Bridge ger Cello **Pilgrim's Flute** och lär honom den första sången. Spelaren spelar själv med ↑ ← → ↓ och mellanslag. Fyra sånger går att lära sig: **Waking Chant** (Odo) öppnar stenarna med en sjungande fågel, **Grumble's Call** (Tilly) kallar på Grumble, **Sunturn Hymn** (Nefret) gör natt till dag och dag till natt, **Lament of Rain** (Ysolde) kallar på åskan eller skickar bort den. Tre sångstenar finns: på bron, vid den fallna gudastatyn och i pelarsalen i öknen |
| **Smartare asklingar** | Ett hugg mitt i en uppsving slår klubban ur handen. Asklingen springer efter den, men står Cello vid klubban (eller krossar den) kastar den sten i stället. Den sista i en flock flyr när kamraterna faller och ylar på förstärkning. Varannan askling sover på dagen (ett smyganfall gör dubbel skada), och några kommer bara upp ur askan på natten. I mörker ser de kortare, men en tänd lykta syns långt. Regn gör dem långsamma, dimma gör dem närsynta |

Nytt i koden: `src/clock.js` (dygnet), `src/weather.js` (vädret, regnet och blixtnedslagen), `src/talk.js` (dialogträd med humör) och `src/songs.js` (flöjten, sångerna och sångstenarna). `enemies.js` har fått avväpning, stenkast, flykt med förstärkning, sömn och nattliga asklingar.

## Vad var nytt i 0.10: pyramiden blev djupare

Pyramiden har fått samma behandling som fästningen i 0.8: den gamla delen är första våningen, och fyra nya delar laddas när Cello går genom trappor och dörrar (en kort övertoning, ingen dimma). Solögonen i Spegelgalleriet ger inte längre Solnyckeln: de öppnar en dörr i västra väggen och en trappa ner. Solnyckeln ligger nu högst upp.

| Del | Vad som händer |
| --- | --- |
| **The Sunken Galleries** | *Den kluvna solens sal:* en ny **solkristall** delar strålen i två, åt vänster och höger. Fyra speglar ska leda båda halvorna till två ögon samtidigt. *De glidande speglarna:* speglar på stenblock som skjuts med tung vikt (strålen går över blocket, men stenblock stoppar den). *Sandfloden:* sand som rinner i stötar mot ett schakt. Med tung vikt står Cello emot, men den lösa sanden sväljer honom, och sandridåer rasar från taket i takt. *Balsamerarnas valv:* fällrum i tre vågor med skuggor och fyra eldfat som lyfter en bur |
| **The Hall of the Sun Barque** | *Solbåtens sal:* fällrum i tre vågor runt solbåten. *Timmarnas sal:* en spegel som vrider sig själv som en solvisare. Står Cello tungt på bromsplattan stannar den, så att strålen hinner bränna bort tre skuggslöjor framför solögonen (slöjorna läker om ljuset försvinner för tidigt). *Solväktaren:* en ny miniboss i guld. Skölden tar både svärd och hammare, men reflekterat solljus från prisman bländar den |
| **The Inner Ascent** | En lång ramp där **stenkulor** rullar ner. Bara nischerna i väggarna skyddar. Sedan **timglaset**: vänd det, så stiger sanden i en grop och sjunker i två andra. En väg leder ner till en skattkammare, en annan över sanden till dörren upp |
| **The Apex of Ra** | Ljuset från toppen, två solkristaller, en kristall på ett block som ska skjutas på plats, två speglar och **fyra solögon som måste lysa på en gång**. Sedan Solnyckeln och en ljusränna rakt ner till Apophis dörr |

Små nycklar: K1 (de glidande speglarna) → dörren till sandfloden · K2 (sandfloden) → valvets norra dörr · K3 (timglasets skattkammare) → dörren upp till toppen.

Nytt i koden: `src/sunkit.js` (solljus, solkristaller, spegel- och kristallblock, solvisaren, sandfall, stenkulor, timglas och sandgropar, Solväktaren) och `src/pyramidwings.js` (pyramidens fyra nya delar). Blockpusslen är kontrollerade med en lösare. Verktygslådan `dkit.js` har fått material per tema, sandströmmar och lös sand. Den räknar inte längre en platta som kan rasa som säker plats att återuppstå på. Galler från en bossstrid går upp igen om Cello dör.

## Vad är nytt i 0.9: startmenyn

När spelet startar möter Cello spelaren i stormen: modellen som Elias skickade av hur Cello ska se ut när spelet är klart, målad och upplyst av eld bakifrån, med blixtar, glöd som stiger och aska som faller. Bredvid står logotypen i guld.

- **Tryck på valfri tangent** (eller tryck på skärmen) så öppnas menyn: *Continue*, *New Game*, *Load Game*, *Options*, *How to Play* och *Credits*.
- **Två sparfiler.** Fil 1 och fil 2 visar plats, hjärtan, skärvor, speltid, reliker och när filen sparades senast.
  - *Continue* fortsätter filen som spelades senast.
  - *New Game* frågar vilken fil resan ska sparas i, och varnar innan en gammal resa skrivs över.
  - En fil kan startas, kopieras till den andra platsen eller raderas, alltid med en fråga först.
  - En sparning från 0.8 eller tidigare flyttas automatiskt till fil 1.
- **Options:** musikens och ljudeffekternas volym (0–10) och retroläget. Inställningarna sparas.
- **Ljud:** menyn har egna ljud (markören, välj, tillbaka, nej, radera) och en stor åskknall när resan börjar. Musiken är *Hymn of the Wandering Hero*.
- Menyn går att styra med tangentbord (piltangenter eller WASD, Enter, Esc), mus, pekskärm och handkontroll.
- På mobil står logotypen överst, Cello i mitten och menyn längst ner.

Hjältemodellen ligger i `models/cello-hero.bin` (89 000 trianglar, 0,9 MB). Den görs av `tools/hero/paint.py` från STL-filen `tools/hero/cello-hero.stl`: modellen förenklas, och varje del får en färg (hud, hår, pannband, tunika, läder, svärd och sköld) plus mörkare skrymslen och ljusare kanter.

## Vad är nytt i 0.8: fästningen blev djupare

Elias klarade båda fängelsehålorna på 5–10 minuter. Målet är 30–60 minuter per fängelsehåla, så **The Tempest Bastion** har fått fyra nya delar. Den gamla fästningen är nu bara första våningen. Delarna laddas när Cello går genom trappor, dörrar och hissar, med en kort övertoning men ingen dimma (dimman finns bara mellan områdena ute i världen).

| Del | Var | Vad som händer |
| --- | --- | --- |
| **The Lightning Cisterns** | Trappan väster om källaren | **Växlar:** kopparpilar som styr blixten från en platta (vrids med E, plattan slås med hammaren) till dörrar, en bur med en nyckel, eller en trasig ränna. **Järnblock:** tre block på ett rutnät, två tryckplattor, minst 17 skjut med tung vikt (en spak ställer tillbaka blocken). **Lyktvalvet:** fyra eldfat i mörkret lyfter en bur. **Två spolar** i två olika salar måste laddas inom tio sekunder för att öppna trappan ner |
| **The Deep Forge** | Under cisternerna | **Fällsalen:** tre vågor fiender bakom galler. **Den spruckna smedjan:** bälgar blåser västerut i stötar över ett schakt. Med tung vikt står Cello emot vinden, men de spruckna plattorna rasar under honom. Smala järnbalkar håller. **Dynamon:** tre blixtar i rätt ordning (söder, väster, öster) får det stora hjulet att snurra, och då vaknar hissen i tornet |
| **The Thunder Spire** | Dörren österut från vindbryggan | Hissen (som bara går när dynamon snurrar), **stormgången** runt tornet där tre plattor måste slås inom 16 sekunder i stötvisa vindar, och **klocksalen** med fler växlar, en nyckel och dörren upp |
| **The Storm Crown** | Högst upp | **The Twin Wardens**: två Järnväktare samtidigt. Sedan **Stormnyckeln** och en stormvirvel som släpper ner Cello framför Hrungnirs dörr |

Nycklarna: K3 (cisternernas bur) → dörren norrut i cisternerna · K4 (lyktvalvet) → dynamosalen · K5 (klocksalen) → kronan. Stormnyckeln ligger inte längre i källaren utan högst upp i kronan.

Kartan (K) visar våningen Cello står på, med blixtens kopparbanor, växlar, plattor, spolar, dörrar och kistor.

Nya filer: `src/dkit.js` (en verktygslåda för fängelsehålor: salar, dörrar, kistor, burar, blixtnätet, kondensatorer, tryckplattor, järnblock, spruckna golv, stormvind, fällrum och hissar) och `src/bastionwings.js` (fästningens fyra nya delar). Pyramiden byggs om med samma verktygslåda i nästa version.

## Vad är nytt i 0.7: öknen och pyramiden

### Den gyllene porten och The Ember Wastes

Kopparplattan framför **den gyllene porten** på fältets östra udde väcks med hammarens markslag, precis som stormstenen. Porten slår upp och en bro leder ut i **The Ember Wastes**: ett ökenland lika stort som fältet, med dyner, halvt begravda ruiner (ett fallet kungahuvud, en sfinx, en pelarsal och ett begravt tempel med en kista), obelisker längs vägen och längst i öster en stor trappa upp till pyramiden som svävar över avgrunden.

- **Oasen Sunwell** är öknens fristad: en damm med palmer, tält, en eld att vila vid och två kameler.
  - **Nefret**, den sista prästinnan av Ra, vet hur pyramiden fungerar och ger tips längs vägen.
  - **Hamid** säljer lampolja, röda drycker och ett nytt böjt ökensvärd.
  - Barnet **Sabi** springer runt dammen.
- **Valet vid karavanen.** Handelsmannen **Tarek** ligger fast under en vagn som asklingar har vält, med en full börs bredvid sig.
  - *Lyft vagnen:* han haltar till oasen och ger Cello sin **slipsten** (svärdet slits hälften så fort).
  - *Ta börsen:* Cello får 60 skärvor, men Tarek försvinner och hans kusin Hamid tar 50 % mer betalt av tjuven.

### The Sun-Scorched Pyramid

Den andra fängelsehålan har sju salar, karta, två små nycklar och en Solnyckel. Allt bygger på solljus:

- **Solstrålar** faller in genom fönster och ner genom schakt i taket.
- **Speglar** vrids ett åttondels varv i taget (E) och kastar strålen vidare.
- **Solögon** vaknar när ljuset träffar dem. Vissa lyser bara så länge strålen ligger kvar.
- **Skuggslöjor** brinner upp i solljus.
- **Skuggvarelser** som svärdet går rakt igenom blir fasta när ljuset bränner dem.

| Sal | Vad som händer |
| --- | --- |
| **Förkammaren** | Kartkistan, och en spegel som vänds så att ljuset väcker ögat över dörren till solgården |
| **Solgården** | Två speglar leder ljuset till ett öga som lyfter guldburen runt den första nyckeln |
| **Skuggkryptan** | Ett fällrum med den andra nyckeln, och en skuggslöja framför en alkov med en guldskärva (värd 100) |
| **Ras sal** | Ett ljusschakt mitt i salen och en slöja framför dörren i väster |
| **Skarabégropen** | Minibossen **Khepri**, en jätteskarabé. Svärdet studsar på skalet: vänd den på rygg med markslaget och hugg buken. Sedan stiger **Ra's Shattered Prism** upp ur sanden |
| **Spegelgalleriet** | Två solögon måste se solen samtidigt: ett får fönstrets ljus via två speglar, det andra ljuset Cello själv kastar från schaktet via en tredje spegel |
| **Apophis helgedom** | Bossen **Apophis**, kaosormen av skugga, som reser sig ur fyra hål i golvet |

**Ra's Shattered Prism** läggs på en föremålsknapp. Med prisman uppe fångar Cello en stråle (i ett fönsters ljus eller under ett schakt) och kastar den dit han tittar. Med lock-on (Q) siktar han rakt på ett solöga, en spegel, en slöja eller en fiende.

Apophis tar bara skada av solljus som studsar tillbaka: ställ dig i ljuset mitt i helgedomen, höj prisman och lås fast på ormen. Då faller huvudet ner och ädelstenen i pannan går att hugga.

### Titanernas hemlighet

Lyra vet inte längre allt från början. Hon har läst de gamla stenarna och känner till gudarnas reliker, men inte vad titanerna vill.

Det berättar **Apophis**, den tredje titanen Cello möter, när han faller:
- att titanerna var gudarnas äldsta fiender, fängslade djupt under jorden;
- att de bröt sig loss och brände Olympus;
- att de blir starkare för varje människa som dör;
- att det enda de vill är en tyst, tom värld för sig själva.

Ljuset bär sedan Cello hem till Lyra i Aetheria.

### Grumble, bocken man rider på

Den som hittar hästen Brindle på fältet och berättar det för Hollis på Thistledown Ranch får **Grumble**, gårdens jättelika bock, och **hornet** som kallar på honom.
- Grumble springer dubbelt så fort som Cello och hoppar längre. Han är tänkt som resesättet innan Hermes sandaler finns.
- Lägg hornet på en föremålsknapp och blås i det utomhus, så kommer Grumble springande.
- **E** kliver upp och ner.
- Han väntar utanför grottor, hus och fängelsehålor. Blir Cello träffad ramlar han av.

### Smygandet i prologen

Väljer Cello att bära Maren till Aetheria ger sig titanen inte av längre. Den går fram och tillbaka längs muren i norr och spanar över torget. Ett rött ljus på marken visar vart den tittar, och husen, muren och klippan skymmer den. Ser den Cello en stund vrålar den, och han får börja om där Maren låg.

### Övrigt

- **The Stormvale** har fått ett långsammare och kusligare spår: *Fields of the Forgotten Crown*. Ett nattligt fält i moll i stället för den glada galoppen.
- I öknen hörs *Whispers of the Hollow Woods*, och vid oasen *The Quiet Hour Before Quest*. I pyramiden *The Hollow Mask Watches*, vid Khepri *March of the Hollow Crown*, vid Apophis *The Warlord's Approach* och efter segern *Dawn Over the Kingdom*.
- Kartan har en egen vy för pyramiden, och översikten över riket visar öknen och pyramiden.
- Nya röster för Nefret, Hamid, Sabi, Tarek, Wren och Apophis.

## Vad var nytt i 0.6: en större värld

Världen är nu uppdelad i områden som laddas vid gränserna. När Cello går in i dimman vid en bro tonar skärmen till svart och nästa område tar vid. Fästningen syns inte längre från byn; resan dit är lång.

| Område | Vad som finns där |
| --- | --- |
| **Cellos hem** | Huset (går att gå in i, med säng och en kista), trädgården, getterna och övningsdockan |
| **Hollowbrook och Aetheria** | Den brinnande byn och lägret, som förut. Stenvägen norr om Aetheria leder nu vidare ut i världen |
| **Thistledown Ranch** | Bondgården: Hollis, Nell och Tilly, ladan, stallet, betesmark med getter och kor, åkern, dammen, en eld att vila vid |
| **Galewind Pass** | En ravin med vaktporten (Garrick), en klyfta med en kista, och **The Long Bridge**: 180 meter över stormen, med pilgrimen Odo vid rastplatsen |
| **The Stormvale** | Det stora fältet (450 meter tvärs över): vägar, korsvägen med Mags läger, ruiner, ett tempel, en stencirkel, en fallen jättestaty med kartritaren Wren, sjöar, skogsdungar, stormstenen och den gyllene porten |
| **Willowmere** | Den andra byn, vid en sjö: Pells butik, värdshuset Willow & Wick (vila och spara), spåkvinnan Ysolde, väktaren Doran, fiskaren Fenwick, barnen Mira och Tob, väderkvarnen och en anslagstavla |
| **Stormreach** | Ett kargt höglandet där stormen föds, med döda träd, svarta spiror och spejaren Fenns läger vid grottan |
| **The Hollow Cave** | En kolsvart grotta. Två eldfat måste tändas med lyktan för att stendörren ska sjunka |
| **The Tempest Bastion** | Fästningen, som förut, men nu längst bort i norr |

Det tar ungefär fyra minuter att springa raka vägen från Aetheria till fästningen, och mer om man stannar, slåss och letar kistor.

### Föremål, butik och pengar

- **Föremålsmenyn (Tab):** välj vilket föremål som ligger på **F**, **G** och **V**. Menyn visar också svärdet, skölden, det Cello har fått och vad spåkvinnan sa.
- **Skärvor** är pengarna: gröna (1), blå (5), röda (20) och lila (50). De finns i gräset (svärdet klipper det), i krukor, hos fiender och i kistor.
- **Svärdet slits** när det träffar, och mest mot sköldar. Det går av till slut och skär då kortare och svagare. Pell säljer ett nytt, och Vane i Aetheria smider ett åt den som har skärvor.
- **Lyktan** (Pell, 40 skärvor) lyser upp mörker och tänder gamla eldfat. Den drar olja; Pell och Mags säljer mer.
- **Röda drycker** läker fyra hjärtan. Cello kan bära tre.
- **Pells butik** i Willowmere: lykta, lampolja, röd dryck och nytt svärd. Mags vid korsvägen säljer olja och drycker lite dyrare.

### Folk och uppdrag

- **Ysolde**, spåkvinnan i Willowmere, vet alltid vad nästa steg är, och hennes ord sparas i föremålsmenyn.
- **Brindle:** Hollis häst sprang iväg när stormen kom. Den som hittar henne på fältet och berättar det för Hollis får en belöning.
- En **gömd kista** under ett vakttorn på fältet syns bara när eldfatet där brinner.
- Vila och spara vid lägereldar (Aetheria, ranchen, korsvägen, Stormreach), på värdshuset och i Cellos egen säng. Dör Cello börjar han om där han kom in i området.

### Musiken

| Plats eller händelse | Spår |
| --- | --- |
| Titelskärmen | Hymn of the Wandering Hero |
| Cellos hem och den brinnande byn | Fields at Dawn |
| Vägen in i byn efter vrålet, och när Cello bär Maren | Whispers of the Hollow Woods |
| Byn efteråt | Fields of the Forgotten Crown, och Village at First Light när Hrungnir är besegrad |
| Aetheria | The Hearth and the Meadow |
| Lyras berättelse och Galewind Pass | The Quiet Hour Before Quest |
| The Long Bridge, och när stenar och dörrar vaknar | Ballad of the Wandering Hero |
| Thistledown Ranch | The Green Road Calls |
| The Stormvale | Fields of the Forgotten Crown (från 0.7) |
| Willowmere och butiken | Morning in Willowmere |
| Stormreach och fästningens förgård | March of the Hollow Crown |
| The Hollow Cave | Whispers of the Hollow Woods |
| Inne i fästningen | The Hollow Mask Watches |
| Järnväktaren | March of the Hollow Crown |
| Titanen i prologen och Hrungnir | The Warlord's Approach |
| Segern och vägen hem | Dawn Over the Kingdom |

Spåren ligger i `music/` (128 kbit/s MP3). När spelet publiceras som artifact skickas de med som separata filer.

## Vad var nytt i 0.5

- **Musik:** soundtracket *Hearth of the Hollow* (Treblo) ersatte den genererade musiken. Spåren tonar in i varandra och platsspår fortsätter där de slutade. `N` slår av och på musiken.
- **Nya modeller:** Cello, folket och asklingarna är formade låg-polyfigurer med knän, armbågar, ansikten och kläder.
- **Krukor** som går sönder, en **kamera** som backar vid stora fiender, och en lite tuffare **Hrungnir**.

## Kontroller

| Tangent | Gör |
| --- | --- |
| W A S D | Spring (C växlar till att gå) |
| Mus | Kamera (första klicket låser musen, Esc släpper) |
| Space | Hoppa |
| Shift | Rulla, sidohopp och bakåtvolt vid lock-on |
| Vänsterklick | Svärd, tre slag i rad |
| Högerklick / R | Sköld |
| Q / mittenklick | Lås fast på fiende |
| E | Prata, öppna kistor, läsa, gå in genom dörrar |
| F · G · V | Föremålen på snabbknapparna (från början markslag på F och tung vikt på G) |
| Tab / B | Föremålsmenyn: välj föremål och lägg dem på F, G eller V |
| K | Karta över området och en översikt över riket (pausar spelet) |
| M · N · P · H · I | Ljud · musik · pausmenyn · dölj hjälpen · felsökningsinfo |
| ↑ ← → ↓ · Space | Med flöjten framme: spela toner (Esc slutar spela) |

Handkontroll: A hopp, X svärd, B rulla, RT sköld, LT lås, Y prata, RB/LB/höger på styrkorset föremålsknapparna, Start föremålsmenyn, Back karta.
På mobil styr vänster halva av skärmen Cello och höger halva kameran; knapparna sitter nere till höger.

## Vad finns i 0.4

- **Vägen hem.** Spelet börjar på lägret i skogen söder om byn. Cello går hem över två broar, hör ett vrål, och vid byns port visar kameran att allt brinner.
- **Större öar.** Byn, Aetheria och de andra öarna är ungefär dubbelt så stora, med fler brända hus, eldar och rökpelare.
- **Stenvägen norrut.** Efter samtalet om titanerna väcker Lyra stenporten i norr, och en väg av flytande stenar reser sig mot fästningen.
- **The Tempest Bastion** – den första fästningen (dungeon), med nio rum, karta, små nycklar och en Stormnyckel:
  - **Förhallen** med kartkistan och en kopparplatta som leder till vindbryggan.
  - **Vaktsalen**, ett fällrum där gallret slår igen tills alla fiender är besegrade.
  - **Smideshallen** med minibossen **Järnväktaren** (en jättelik askling med sköld och yxa) och Mjölnirs skärva.
  - **Kondensatorrummet**: två plattor måste få blixt nästan samtidigt för att buren kring en kista ska lyftas. Här finns också smedens verkstad och ett brev.
  - **Vindbryggan**: en smal bro där stormen blåser Cello ner, om han inte bär hammaren tungt.
  - **Den spräckta salen**: golvet brister under tung vikt, och i **källaren** låg Stormnyckeln (sedan 0.8 leder källaren vidare ner, och nyckeln ligger i kronan). En lucka leder upp igen.
  - **Hrungnirs krets**: bossen **Hrungnir**, jätten med hjärta av sten. Bara blixten från de fyra stormpelarna får honom på knä.
- **Mjölnirs skärva:** markslaget (F) skickar blixt genom kopparrännor, krossar sköldar och skadar bossar; tung vikt (G) gör Cello tung och långsam men orubblig i stormen.
- **Fiender:** asklingar, sköldvakter (skölden tar emot svärdet men krossas av hammaren) och stormfladdrare.
- **Föremålsfanfar** när Cello hittar något, en **hjärtbehållare** efter bossen, och en virvel som bär honom hem.
- **Stormstenen i öster:** slå på kopparplattan med hammaren, så reser sig en stenväg mot udden, där nästa område skymtar.
- **Brevet till Kael:** valet i prologen avgör vad Kael säger, och om Cello får smedens handskar (snabbare markslag).
- **Karta (K)** över fästningen, eller över öarna när Cello är utomhus.
- Sparning sker automatiskt vid viktiga händelser; dör Cello i fästningen börjar han om vid ingången.

## Kodens delar

| Fil | Innehåll |
| --- | --- |
| `src/main.js` | Startar allt, spelslingan, avståndsgallring av saker långt bort |
| `src/areas.js` | Områdena: var och en har sin egen grupp, sitt kollisionsträd, ingångar och utgångar |
| `src/build.js` | Byggverktygen alla områden använder: öar, vägar, broar, hus, ladan, träd, staket, eldar, dimma vid gränserna |
| `src/world.js` | Cellos hem, byn och Aetheria, fästningens och pyramidens områden, och kopplingen mellan områdena |
| `src/regions/` | `ranch.js`, `pass.js`, `field.js`, `willowmere.js`, `stormreach.js` (med grottan), `desert.js` (The Ember Wastes), `galecrown.js` (The Galecrown, 0.14), `sea.js` (The Shattered Sea, 0.15), `frost.js` (The Frostmarch, 0.16) och `interiors.js` (butiken och Cellos hus) |
| `src/folk.js` | Folket ute i världen, butikerna, kistorna, eldfaten, djuren och övningsdockan |
| `src/inventory.js` | Föremålsmenyn, snabbknapparna, skärvorna, lyktan och dryckerna |
| `src/bastion.js` | The Tempest Bastion: rum, dörrar, kistor, kretsar, pussel, fällor och bossarna |
| `src/title.js` | Startmenyn: scenen med hjälten, menyerna, de två sparfilerna och inställningarna |
| `src/heroModel.js` | Läser hjältemodellen (`models/cello-hero.bin`) |
| `src/clock.js` | Dygnet (0.11): klockan, dagsljus, skymning och spolning (vila, Sunturn Hymn) |
| `src/weather.js` | Vädret (0.11): lugnt, regn, åska, dimma och sanddis, regnet, och blixten som slår ner i metall |
| `src/talk.js` | Dialogträd (0.11): frågor i valfri ordning, det dumma svaret, humör och ikoner över huvudet |
| `src/songs.js` | Flöjten (0.11): spelläget, sångerna, lektionerna och sångstenarna |
| `src/water.js` | Vatten (0.15): vattenytan med vågor och glitter, och ljusnätet på botten |
| `src/temple.js` | The Drowned Temple (0.15): templets fyra delar och tillståndet (nycklar, dörrar, kistor, vattennivåer) |
| `src/templekit.js` | Templets byggdelar (0.15): bassänger, tidvattenhjul och altaren, sigill, bubbelkällor, spröd korall, sjöborrar, Karkinos och Ketos |
| `src/seastory.js` | Berättelsen i 0.15: Seren vid havet, simlektionen, pärlorna, fyren, templet, det tredje valet och slutet |
| `src/pause.js` | Pausmenyn (0.19): Resume, Save Game, Options, Controls, Quit to Title |
| `src/pausetheme.js` | Pausmenyns låt (0.19): *Hearth Lullaby*, spelad med kod |
| `src/opening.js` | Öppningens berättelse (0.20): texten sida för sida och explosionens ljusblixt |
| `src/home.js` | Cellos hus (0.20): grytan, slipstenen, oljetunnan, relikhyllan och gåvokorgen |
| `src/regions/othrys.js` | Mount Othrys (0.21): lägret, kolosserna, hjärtburarna, berget och porten |
| `src/othrys.js` | The Crown of Othrys (0.21): de tre delarna av den sista fängelsehålan |
| `src/othryskit.js` | Byggdelar för finalen (0.21): raset, stormkristallen, ljuset och slöjan, Kronos och titanhjärtana |
| `src/othrysstory.js` | Sista kapitlet (0.21): Rhea, hjärtburarna, striden, det femte valet och slutet |
| `src/ending.js` | Eftertexterna (0.21) |
| `src/sidequests.js` | Fler sidouppdrag (0.21): Miras nalle och Pells låda |
| `src/barks.js` | Pratbubblor och fåglar (0.21) |
| `src/chestlid.js` | Kistlocket (0.20): öppningen för alla kistor, runt gångjärnet och med ett sken |
| `tools/audio/build_sfx.py` | Gör om ljudpaketet till `sounds/sfx.json` (0.18): vilka klipp, trimning, normalisering och MP3 |
| `src/foes.js` | Fiendernas nivåer (0.17), de nya sorterna (Brute, Venomfang, Ramhorn, Tide Reaver, Rimeling), livmätarna och bossens mätare |
| `src/post.js` | Efterbehandlingen (0.17): konturer, skuggor i vrår och vinjett |
| `src/shadows.js` | Skuggorna från solen och månen (0.17) |
| `src/motes.js` | Pollen, eldflugor, glöd och damm i luften (0.17) |
| `src/maw.js` | Frostgiant's Maw (0.16): fängelsehålans fyra delar och tillståndet (nycklar, dörrar, kistor, navets läge) |
| `src/frostkit.js` | Byggdelarna i jättens gap (0.16): glidis, isblock, rimfrostgaller, navet med spaken, Hati och Thrym |
| `src/shadow.js` | Loki's Mask (0.16): skuggan som flyger, landar, håller ner plattor och byter plats med Cello |
| `src/froststory.js` | Berättelsen i 0.16: Seren i norr, Rimeholt, renarna, fiskaren, Lokes röst, Thrym, det fjärde valet och slutet |
| `src/spire.js` | The Windbound Spire (0.14): templets fyra delar och tillståndet (nycklar, dörrar, kistor) |
| `src/spirekit.js` | Vindtemplets byggdelar (0.14): uppvindar, ventiler, väggar att springa på, The Brass Weaver och Typhon |
| `src/chronicle.js` | Berättelsen i 0.14: titanen över Willowmere, Kronos, Seren i The Galecrown, valet efter Typhon och sidouppdragen |
| `src/skinned.js` | Modellpaketet (0.13): läser models/pack.bin och bygger figurer med skelett, färger per region |
| `src/heroRig.js` | Cello som Elias skulptur (0.13): skelettet, benen, svärdet och ögonen |
| `src/peopleRig.js` | Byborna, Seren, dvärgen (Hrungnir) och hydran (Apophis) som skulpturer (0.13) |
| `src/realm.js` | De dödas värld (0.12): växlingen med vågskålarna, andesaker, falska väggar och andar |
| `src/necrokit.js` | Byggdelar för nekropolen (0.12): vattennivåer, slussar, flytande kistor, Schakalväktaren och Ammit |
| `src/necropolis.js` | The Sunken Necropolis (0.12): gravgångarna, vägningssalen, Duat och tronsalen |
| `src/pyramidwings.js` | Pyramidens fyra nya delar (0.10): djupet, solbåten, uppstigningen och toppen |
| `src/sunkit.js` | Pyramidens verktygslåda: solljus, kristaller, spegelblock, solvisaren, sandfall, stenkulor, timglaset och Solväktaren |
| `src/bastionwings.js` | Fästningens fyra nya delar (0.8): cisternerna, smedjan, tornet och kronan |
| `src/dkit.js` | Verktygslådan för fängelsehålor: salar, dörrar, blixtnätet, kondensatorer, järnblock, spruckna golv, stormvind, fällrum och hissar |
| `src/bosses.js` | Järnväktaren och Hrungnir |
| `src/pyramid.js` | The Sun-Scorched Pyramid: salar, dörrar, kistor, burar, speglar, solögon, slöjor, fällor och bossarna |
| `src/beams.js` | Solstrålarna: fönster, schakt, speglar, solögon, slöjor och prisman |
| `src/sunbosses.js` | Khepri och Apophis |
| `src/goat.js` | Grumble, bocken man rider på |
| `src/enemies.js` | Asklingar, sköldvakter och stormfladdrare |
| `src/player.js` | Cello: rörelse, svärd, sköld, hammaren, tung vikt, prisman och ridning |
| `src/story.js` | Berättelsen, samtal, val, föremål och sparning |
| `src/collide.js` | Kollisioner mot världen plus rörliga lådor (dörrar, stenar, golv) |
| `src/lights.js` | En pool med åtta punktljus som flyttas till eldarna närmast Cello |
| `src/items.js` | Föremålens modeller och texter |
| `src/map.js` | Kartan |
| `src/geom.js` | Gemensamma geometrihjälpare och sammanslagning av statiska föremål |
| `src/audio.js` | Alla ljudeffekter, skapade med Web Audio |
| `src/music.js` | Musiken: vilket spår som spelas, övertoningar och sänkning under samtal |
| `src/pots.js` | Krukor som går sönder och ibland ger hjärtan |
| `src/hud.js`, `src/dialog.js`, `src/input.js`, `src/cameraRig.js`, `src/combat.js`, `src/effects.js`, `src/npcs.js`, `src/sky.js`, `src/textures.js`, `src/titan.js` | Gränssnitt, textrutor, styrning, kamera, strid, effekter, folk, himmel, texturer och titanen |

Three.js r186 ligger i `lib/three` så att spelet fungerar utan internet.
